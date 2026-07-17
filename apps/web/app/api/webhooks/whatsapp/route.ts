import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSubscriptionStatus } from "@/lib/subscription";
import { parseFinancialMessage } from "@/lib/ai";
import { sendWhatsAppMessage } from "@/app/actions/admin-whatsapp";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Verificar se é um evento de nova mensagem
    if (body.event !== "messages.upsert") {
      return NextResponse.json({ success: true, ignored: true });
    }

    const messageData = body.data?.message;
    const key = body.data?.key;

    if (!messageData || !key || key.fromMe) {
      // Ignorar mensagens enviadas pelo próprio bot ou de status
      return NextResponse.json({ success: true, ignored: true });
    }

    // 2. Extrair informações básicas
    const remoteJid = key.remoteJid; // ex: 5511999999999@s.whatsapp.net
    if (remoteJid.includes("@g.us")) {
      // É um grupo, ignora
      return NextResponse.json({ success: true, ignored: true });
    }

    const phoneNumber = remoteJid.split("@")[0];
    const text = messageData.conversation 
      || messageData.extendedTextMessage?.text 
      || messageData.imageMessage?.caption 
      || messageData.documentMessage?.caption
      || "";
    
    // Extrair Base64 se houver mídia (Requer webhookBase64: true na Evolution API)
    const mediaBase64 = messageData.base64 || body.data?.message?.base64 || body.data?.base64 || "";
    let mediaMimeType = "";
    if (messageData.imageMessage) mediaMimeType = messageData.imageMessage.mimetype || "image/jpeg";
    if (messageData.audioMessage) mediaMimeType = messageData.audioMessage.mimetype || "audio/ogg";
    if (messageData.documentMessage) mediaMimeType = messageData.documentMessage.mimetype || "application/pdf";

    if (!text && !mediaBase64) {
      return NextResponse.json({ success: true, ignored: true });
    }

    // 3. Buscar o usuário pelo telefone
    let user = await prisma.user.findFirst({
      where: { whatsappNumber: phoneNumber },
      include: { subscription: true }
    });

    // 3.1. Se não encontrou, verificar se a mensagem é um PIN de vinculação
    if (!user) {
      const pinMatch = text.match(/^\d{6}$/);
      if (pinMatch) {
        const linkCode = await prisma.whatsappLinkCode.findFirst({
          where: {
            code: pinMatch[0],
            expiresAt: { gt: new Date() },
            usedAt: null
          },
          include: { user: { include: { subscription: true } } }
        });

        if (linkCode) {
          // Vincular número ao usuário
          user = linkCode.user;
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: { whatsappNumber: phoneNumber, whatsappVerifiedAt: new Date() }
            }),
            prisma.whatsappLinkCode.update({
              where: { id: linkCode.id },
              data: { usedAt: new Date() }
            })
          ]);

          const successMsg = "✅ Conta vinculada com sucesso! Você já pode me enviar seus gastos e ganhos.";
          await sendWhatsAppMessage(remoteJid, successMsg);
          return NextResponse.json({ success: true, processed: true, replyMessage: successMsg });
        }
      }

      // Se não enviou PIN ou PIN inválido
      const replyMessage = "Olá! Não encontrei sua conta no Pila SaaS. Por favor, acesse o painel, gere um código de vinculação e envie ele para mim (apenas os 6 números).";
      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, replyMessage });
    }

    // 4. Validar assinatura/paywall
    const subStatus = getUserSubscriptionStatus(user.createdAt, user.subscription);
    
    if (subStatus.status === "EXPIRED" && user.role !== "ADMIN") {
      const replyMessage = "⚠️ Seu período de testes acabou! Acesse o painel para assinar o plano Pro e continuar usando o bot.";
      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, replyMessage });
    }

    // 5. Preparar Contexto Financeiro do Mês
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: user.id, occurredAt: { gte: startOfMonth } },
      include: { category: true },
      orderBy: { occurredAt: "desc" }
    });

    // 5.1 Buscar Orçamentos do Usuário
    const budgets = await prisma.budget.findMany({
      where: { userId: user.id },
      include: { category: true }
    });

    let monthExpenses = 0;
    let monthIncomes = 0;
    
    // Calcular gastos por categoria para bater com o orçamento e para o gráfico
    const expensesByCategory: Record<string, number> = {};
    const expensesByCategoryName: Record<string, number> = {};
    
    const contextLines = recentTransactions.map(t => {
      const val = Number(t.amount);
      if (t.kind === "EXPENSE") {
        monthExpenses += val;
        if (t.categoryId) {
          expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + val;
        }
        if (t.category?.name) {
          expensesByCategoryName[t.category.name] = (expensesByCategoryName[t.category.name] || 0) + val;
        }
      }
      if (t.kind === "INCOME") monthIncomes += val;
      return `- ${t.occurredAt.toLocaleDateString("pt-BR")}: R$ ${val.toFixed(2)} - ${t.description} (${t.category?.name || 'Sem categoria'}) - ${t.kind === "EXPENSE" ? "Gasto" : "Ganho"}`;
    });

    const budgetLines = budgets.map(b => {
      const spent = expensesByCategory[b.categoryId] || 0;
      const limit = Number(b.monthlyLimit);
      return `- Orçamento de ${b.category.name}: Limite R$ ${limit.toFixed(2)} (Gasto atual: R$ ${spent.toFixed(2)} - Resta R$ ${(limit - spent).toFixed(2)})`;
    });

    const userContext = `
Resumo de ${startOfMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}:
Total de Gastos: R$ ${monthExpenses.toFixed(2)}
Total de Ganhos: R$ ${monthIncomes.toFixed(2)}

Situação dos Orçamentos (Budgets) deste mês:
${budgetLines.length > 0 ? budgetLines.join('\n') : "Nenhum orçamento configurado."}

Últimas transações (máx 20):
${contextLines.slice(0, 20).join('\n')}
    `.trim();

    // 6. Processar via IA com Contexto e possível Mídia (Áudio, Imagem, PDF)
    const aiResult = await parseFinancialMessage(text, userContext, mediaBase64, mediaMimeType);

    // 6.1 Tratamento de Lembretes de Contas a Pagar
    if (aiResult.isReminder) {
      if (aiResult.dueDate && aiResult.amount && aiResult.description) {
        await prisma.billReminder.create({
          data: {
            userId: user.id,
            description: aiResult.description,
            amount: aiResult.amount,
            dueDate: new Date(aiResult.dueDate),
          }
        });
      }
      const replyMessage = aiResult.replyMessage || "Lembrete anotado!";
      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, replyMessage });
    }

    // 6.2 Tratamento de Gráficos/Relatórios Visuais
    if (aiResult.isReport) {
      const labels = Object.keys(expensesByCategoryName);
      const data = Object.values(expensesByCategoryName);
      
      let replyMessage = aiResult.replyMessage || "Aqui está o seu relatório visual!";

      if (labels.length > 0) {
        // Gera um gráfico de pizza estiloso no QuickChart
        const chartConfig = {
          type: 'doughnut',
          data: { labels, datasets: [{ data }] },
          options: {
            plugins: {
              datalabels: { color: '#fff', font: { weight: 'bold' } },
              legend: { position: 'right' }
            }
          }
        };
        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=600&h=400`;
        
        const { sendWhatsAppMedia } = await import("@/lib/evolution");
        await sendWhatsAppMedia(remoteJid, chartUrl, "image", replyMessage);
        return NextResponse.json({ success: true, replyMessage, mediaUrl: chartUrl });
      } else {
        replyMessage = "Você ainda não tem gastos registrados neste mês para gerar um gráfico.";
        await sendWhatsAppMessage(remoteJid, replyMessage);
        return NextResponse.json({ success: true, replyMessage });
      }
    }

    // 6.3 Tratamento de Não-Transações em geral
    if (!aiResult.isTransaction) {
      const replyMessage = aiResult.replyMessage || "Não entendi muito bem. Mande um gasto para eu registrar!";
      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, replyMessage });
    }

    // 7. Salvar no Banco de Dados (apenas se for transação)
    // Buscar ou criar a categoria
    let categoryId = null;
    if (aiResult.categoryName) {
      let category = await prisma.category.findFirst({
        where: {
          userId: user.id,
          name: { equals: aiResult.categoryName, mode: "insensitive" }
        }
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            userId: user.id,
            name: aiResult.categoryName,
            kind: aiResult.kind || "EXPENSE",
            icon: aiResult.kind === "INCOME" ? "💵" : "🛍️"
          }
        });
      }
      categoryId = category.id;
    }

    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: aiResult.amount || 0,
        kind: aiResult.kind || "EXPENSE",
        description: aiResult.description || "Registro via WhatsApp",
        categoryId: categoryId,
        source: "whatsapp",
        rawMessage: text
      }
    });

    // 8. Responder sucesso usando a mensagem improvisada pela IA
    const fallbackMessage = `✅ Gasto registrado: R$ ${Number(aiResult.amount).toFixed(2)} em ${aiResult.categoryName}`;
    const replyMessage = aiResult.replyMessage || fallbackMessage;
    await sendWhatsAppMessage(remoteJid, replyMessage);

    return NextResponse.json({ success: true, processed: true, replyMessage });

  } catch (error: any) {
    console.error("[Webhook WhatsApp] Erro:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
