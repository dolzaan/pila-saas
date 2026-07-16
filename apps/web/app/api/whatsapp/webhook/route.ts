import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processTransactionText } from "@/lib/ai";
import { sendWhatsAppMessage } from "@/lib/evolution";

// Tipo simplificado do payload do Evolution API v2 (messages.upsert)
type EvolutionWebhookPayload = {
  event: string;
  instance: string;
  data: {
    messageType?: string;
    key: {
      remoteJid: string; // Ex: 551199999999@s.whatsapp.net
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Processamos apenas eventos de mensagens recebidas (não enviadas por nós)
    if (body.event !== "messages.upsert" || body.data?.key?.fromMe) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payload = body as EvolutionWebhookPayload;
    
    // Verifica se é uma mensagem do tipo texto
    const messageObj = payload.data.message;
    if (!messageObj) return NextResponse.json({ ok: true, ignored: true });

    const textMessage = messageObj.conversation || messageObj.extendedTextMessage?.text;
    if (!textMessage) {
      return NextResponse.json({ ok: true, reason: "Not a text message" });
    }

    // Extrai o número de telefone (remove o sufixo do whatsapp)
    const remoteJid = payload.data.key.remoteJid;
    if (remoteJid.includes("@g.us")) {
      return NextResponse.json({ ok: true, reason: "Group messages ignored" });
    }
    
    const phoneNumber = remoteJid.split("@")[0];
    const text = textMessage.trim();

    console.log(`[Webhook] Mensagem recebida de ${phoneNumber}: "${text}"`);

    // Busca o usuário pelo número de WhatsApp
    const user = await prisma.user.findFirst({
      where: { whatsappNumber: phoneNumber },
    });

    if (!user) {
      // Usuário não encontrado. 
      // Verifica se a mensagem é um código de vínculo (6 dígitos)
      if (/^\d{6}$/.test(text)) {
        const linkCode = await prisma.whatsappLinkCode.findFirst({
          where: { code: text, usedAt: null, expiresAt: { gt: new Date() } },
          include: { user: true },
        });

        if (linkCode) {
          // Código válido! Vincular o número à conta.
          await prisma.user.update({
            where: { id: linkCode.userId },
            data: { 
              whatsappNumber: phoneNumber, 
              whatsappVerifiedAt: new Date() 
            },
          });

          // Marcar código como usado
          await prisma.whatsappLinkCode.update({
            where: { id: linkCode.id },
            data: { usedAt: new Date() },
          });

          await sendWhatsAppMessage(
            remoteJid,
            `✅ *Sucesso!*\n\nSeu número foi vinculado à conta de *${linkCode.user.name || "usuário"}* no Pila.\n\nAgora você já pode enviar suas despesas e receitas por aqui!\n\nExemplo:\n_"Gastei 45 no mercado"_`
          );
          return NextResponse.json({ ok: true, linked: true });
        }
      }

      // Se não é código ou é inválido, informa que não está vinculado
      await sendWhatsAppMessage(
        remoteJid,
        `👋 Olá!\nEu sou o assistente inteligente do *Pila*.\n\nNão encontrei nenhuma conta vinculada a este número.\n\nPara usar, acesse o painel web, vá em *WhatsApp*, gere um código de 6 dígitos e mande aqui para mim!`
      );
      return NextResponse.json({ ok: true, unlinked: true });
    }

    // ==========================================
    // Fluxo de Usuário Vinculado: Processar IA
    // ==========================================

    // Avisa que está digitando / processando (opcional, simulamos com uma resposta rápida ou apenas delay)
    // Evolution API possui rotas para sendPresenceUpdate('composing'), mas vamos direto à resposta por simplicidade.

    // Pega as categorias do usuário para a IA fazer o match
    const userCategories = await prisma.category.findMany({
      where: { OR: [{ userId: user.id }, { userId: null }] },
    });

    const aiResult = await processTransactionText(text, userCategories.map(c => ({ id: c.id, name: c.name, kind: c.kind })));

    if (!aiResult) {
      await sendWhatsAppMessage(
        remoteJid,
        `❌ Desculpe, não consegui entender os valores dessa transação.\n\nTente algo como: _"Gastei 50 no ifood"_ ou _"Recebi 200 de um freela"_`
      );
      return NextResponse.json({ ok: true, failed_ai: true });
    }

    // Salva a transação no banco
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: aiResult.amount,
        kind: aiResult.kind,
        description: aiResult.description,
        categoryId: aiResult.categoryId || null,
        occurredAt: aiResult.date ? new Date(aiResult.date) : new Date(),
        source: "whatsapp",
        rawMessage: text, // Opcional: salva a mensagem original para auditoria/treinamento interno
      },
    });

    // Pega o nome da categoria para confirmar
    let categoryName = "Sem categoria";
    if (aiResult.categoryId) {
      const cat = userCategories.find(c => c.id === aiResult.categoryId);
      if (cat) categoryName = `${cat.icon} ${cat.name}`;
    }

    const isExpense = aiResult.kind === "EXPENSE";

    // ==========================================
    // Verificação de Orçamento (Budget)
    // ==========================================
    let budgetAlert = "";
    if (isExpense && aiResult.categoryId) {
      const budget = await prisma.budget.findUnique({
        where: { userId_categoryId: { userId: user.id, categoryId: aiResult.categoryId } }
      });
      
      if (budget) {
        // Calcular gastos no mês corrente
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        const expenses = await prisma.transaction.aggregate({
          where: {
            userId: user.id,
            categoryId: aiResult.categoryId,
            kind: "EXPENSE",
            occurredAt: { gte: start, lt: end },
          },
          _sum: { amount: true },
        });

        const spent = Number(expenses._sum.amount || 0);
        const limit = Number(budget.monthlyLimit);
        const percentage = Math.round((spent / limit) * 100);

        if (percentage >= 100) {
          budgetAlert = `\n\n🚨 *Alerta Vermelho:* Você estourou seu limite mensal para esta categoria! (${percentage}% consumido)`;
        } else if (percentage >= 80) {
          budgetAlert = `\n\n⚠️ *Atenção:* Você já consumiu ${percentage}% do seu orçamento mensal para esta categoria.`;
        }
      }
    }

    // Prepara a mensagem de resposta
    const amountFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(aiResult.amount);
    
    const replyText = `✅ *Anotado!*\n\n${isExpense ? "📉 Despesa" : "📈 Receita"}: *${amountFormatted}*\n🏷️ ${categoryName}\n📝 ${aiResult.description}\n\n_Já está no seu painel!_${budgetAlert}`;

    await sendWhatsAppMessage(remoteJid, replyText);

    return NextResponse.json({ ok: true, saved: true, transactionId: transaction.id });

  } catch (error) {
    console.error("[Webhook Error]", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
