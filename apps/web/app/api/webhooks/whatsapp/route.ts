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
    const text = messageData.conversation || messageData.extendedTextMessage?.text || "";

    if (!text) {
      return NextResponse.json({ success: true, ignored: true });
    }

    // 3. Buscar o usuário pelo telefone
    const user = await prisma.user.findFirst({
      where: { whatsappNumber: phoneNumber },
      include: { subscription: true }
    });

    if (!user) {
      const replyMessage = "Olá! Não encontrei sua conta no Pila SaaS. Por favor, acesse o painel e vincule seu número de WhatsApp nas configurações.";
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

    // 5. Processar via IA
    const aiResult = await parseFinancialMessage(text);

    if (!aiResult.isTransaction) {
      const replyMessage = aiResult.replyMessage || "Não entendi muito bem. Mande um gasto para eu registrar!";
      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, replyMessage });
    }

    // 6. Salvar no Banco de Dados
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

    // 7. Responder sucesso usando a mensagem improvisada pela IA
    const fallbackMessage = `✅ Gasto registrado: R$ ${Number(aiResult.amount).toFixed(2)} em ${aiResult.categoryName}`;
    const replyMessage = aiResult.replyMessage || fallbackMessage;
    await sendWhatsAppMessage(remoteJid, replyMessage);

    return NextResponse.json({ success: true, processed: true, replyMessage });

  } catch (error: any) {
    console.error("[Webhook WhatsApp] Erro:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
