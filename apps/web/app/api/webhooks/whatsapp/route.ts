import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getUserSubscriptionStatus, hasProAccess } from "@/lib/subscription";
import { parseFinancialMessage } from "@/lib/ai";
import { sendWhatsAppMessage } from "@/app/actions/admin-whatsapp";
import { PILA_APP_URL, PILA_PUBLIC_KNOWLEDGE, PILA_REGISTER_URL } from "@/lib/pila-knowledge";
import { createActivationToken } from "@/lib/account-activation";
import {
  isCancellation,
  isConfirmation,
  ONBOARDING_TTL_MS,
  parseOnboardingEmail,
  parseOnboardingName,
} from "@/lib/whatsapp-onboarding";
import { generateExpenseChart } from "@/lib/report-chart";

const MAX_MEDIA_BASE64_LENGTH = 14_000_000;
const MAX_TEXT_LENGTH = 4_000;

function secretsMatch(provided: string | null, expected: string) {
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer);
}

async function authorizeWebhook(req: Request) {
  const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  const providedSecret = req.headers.get("x-pila-webhook-secret");
  if (expectedSecret && secretsMatch(providedSecret, expectedSecret)) return true;

  // Permite o simulador apenas para uma sessão administrativa autenticada.
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export async function POST(req: Request) {
  try {
    if (!(await authorizeWebhook(req))) {
      const status = process.env.WHATSAPP_WEBHOOK_SECRET ? 401 : 503;
      return NextResponse.json(
        { success: false, error: status === 503 ? "Webhook não configurado" : "Não autorizado" },
        { status },
      );
    }

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_MEDIA_BASE64_LENGTH) {
      return NextResponse.json({ success: false, error: "Payload muito grande" }, { status: 413 });
    }

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

    if (!/^\d{10,15}$/.test(phoneNumber)) {
      return NextResponse.json({ success: false, error: "Número inválido" }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ success: false, error: "Mensagem muito grande" }, { status: 413 });
    }
    
    // Extrair Base64 se houver mídia (Requer webhookBase64: true na Evolution API)
    const mediaBase64 = messageData.base64 || body.data?.message?.base64 || body.data?.base64 || "";
    let mediaMimeType = "";
    if (messageData.imageMessage) mediaMimeType = messageData.imageMessage.mimetype || "image/jpeg";
    if (messageData.audioMessage) mediaMimeType = messageData.audioMessage.mimetype || "audio/ogg";
    if (messageData.documentMessage) mediaMimeType = messageData.documentMessage.mimetype || "application/pdf";

    if (!text && !mediaBase64) {
      return NextResponse.json({ success: true, ignored: true });
    }
    if (mediaBase64.length > MAX_MEDIA_BASE64_LENGTH) {
      return NextResponse.json({ success: false, error: "Mídia muito grande" }, { status: 413 });
    }

    const messageId = typeof key.id === "string" ? key.id.trim() : "";
    if (!messageId || messageId.length > 200) {
      return NextResponse.json({ success: false, error: "ID da mensagem inválido" }, { status: 400 });
    }

    try {
      await prisma.whatsappInboundMessage.create({
        data: { id: messageId, phone: phoneNumber },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ success: true, ignored: true, duplicate: true });
      }
      throw error;
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

      const wantsToRegister = /\b(quero (?:criar|fazer|abrir)|criar (?:uma )?conta|começar|cadastrar|cadastro|assinar|testar)\b/i.test(text);
      const asksForOfficialLink = /\b(link|site|página|pagina|endereço|endereco|url)\b/i.test(text);
      const pinWasInvalid = /^\d{6}$/.test(text.trim());

      let replyMessage: string;
      if (pinWasInvalid) {
        replyMessage = `Esse código não é válido ou já expirou. Gere um novo código no painel: ${PILA_REGISTER_URL}`;
      } else {
        let onboarding = await prisma.whatsappOnboardingSession.findUnique({ where: { phone: phoneNumber } });
        if (onboarding && onboarding.expiresAt <= new Date()) {
          await prisma.whatsappOnboardingSession.delete({ where: { phone: phoneNumber } });
          onboarding = null;
        }

        if (onboarding && isCancellation(text)) {
          await prisma.whatsappOnboardingSession.delete({ where: { phone: phoneNumber } });
          replyMessage = "Tudo bem, cancelei o cadastro. Quando quiser retomar, é só dizer “quero criar minha conta”.";
        } else if (onboarding?.step === "NAME") {
          const parsedName = parseOnboardingName(text);
          if (!parsedName.success) {
            replyMessage = "Não consegui identificar seu nome. Pode me enviar somente seu nome e sobrenome?";
          } else {
            await prisma.whatsappOnboardingSession.update({
              where: { phone: phoneNumber },
              data: { name: parsedName.data, step: "EMAIL" },
            });
            replyMessage = `Prazer, ${parsedName.data}! Agora me envie o e-mail que você usará para entrar no Pila.`;
          }
        } else if (onboarding?.step === "EMAIL") {
          const parsedEmail = parseOnboardingEmail(text);
          if (!parsedEmail.success) {
            replyMessage = "Esse e-mail não parece válido. Pode conferir e enviar novamente?";
          } else {
            const existingEmail = await prisma.user.findUnique({ where: { email: parsedEmail.data } });
            if (existingEmail) {
              await prisma.whatsappOnboardingSession.delete({ where: { phone: phoneNumber } });
              replyMessage = `Esse e-mail já possui uma conta. Entre em ${PILA_APP_URL}/login e vincule este WhatsApp nas configurações.`;
            } else {
              await prisma.whatsappOnboardingSession.update({
                where: { phone: phoneNumber },
                data: { email: parsedEmail.data, step: "CONFIRM" },
              });
              replyMessage = `Confira seus dados:\nNome: ${onboarding.name}\nE-mail: ${parsedEmail.data}\nWhatsApp: +${phoneNumber}\n\nAo confirmar, você aceita os Termos (${PILA_APP_URL}/terms) e a Política de Privacidade (${PILA_APP_URL}/privacy). Posso criar sua conta? Responda “sim” para confirmar ou “cancelar”.`;
            }
          }
        } else if (onboarding?.step === "CONFIRM") {
          if (!isConfirmation(text)) {
            replyMessage = "Para criar a conta, responda “sim”. Se quiser desistir, responda “cancelar”.";
          } else if (!onboarding.name || !onboarding.email) {
            await prisma.whatsappOnboardingSession.delete({ where: { phone: phoneNumber } });
            replyMessage = "O cadastro perdeu algumas informações. Vamos recomeçar: diga “quero criar minha conta”.";
          } else {
            const onboardingName = onboarding.name;
            const onboardingEmail = onboarding.email;
            const activation = createActivationToken();
            await prisma.$transaction(async (tx) => {
              const createdUser = await tx.user.create({
                data: {
                  name: onboardingName,
                  email: onboardingEmail,
                  whatsappNumber: phoneNumber,
                  whatsappVerifiedAt: new Date(),
                },
              });
              await tx.accountActivationToken.create({
                data: {
                  userId: createdUser.id,
                  tokenHash: activation.tokenHash,
                  expiresAt: activation.expiresAt,
                },
              });
              await tx.whatsappOnboardingSession.delete({ where: { phone: phoneNumber } });
            });

            const activationUrl = `${PILA_APP_URL}/activate?token=${activation.token}`;
            replyMessage = `✅ Sua conta foi criada e este WhatsApp já está vinculado!\n\nDefina sua senha neste link seguro, válido por 30 minutos:\n${activationUrl}\n\nSeu teste grátis de 7 dias já começou.`;
          }
        } else if (wantsToRegister) {
          await prisma.whatsappOnboardingSession.upsert({
            where: { phone: phoneNumber },
            create: { phone: phoneNumber, step: "NAME", expiresAt: new Date(Date.now() + ONBOARDING_TTL_MS) },
            update: { step: "NAME", name: null, email: null, expiresAt: new Date(Date.now() + ONBOARDING_TTL_MS) },
          });
          replyMessage = "Vamos criar sua conta por aqui! Primeiro, qual é o seu nome e sobrenome?\n\nVocê pode cancelar a qualquer momento escrevendo “cancelar”.";
        } else {
          // Visitantes também podem conversar com a IA para conhecer o produto.
          const visitorContext = `${PILA_PUBLIC_KNOWLEDGE}\n\nO número ainda não está vinculado a uma conta. Não use nem invente dados financeiros pessoais.`;
          const aiResult = await parseFinancialMessage(text, visitorContext, mediaBase64, mediaMimeType);
          replyMessage = aiResult.replyMessage
            || `Olá! Eu sou o Pila Bot. Posso explicar como o Pila funciona ou ajudar você a começar: ${PILA_REGISTER_URL}`;

          if (asksForOfficialLink && !replyMessage.includes(PILA_APP_URL)) {
            replyMessage += `\n\nSite oficial: ${PILA_APP_URL}`;
          }
        }
      }

      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, replyMessage });
    }

    // Contas criadas pelo WhatsApp podem solicitar um novo link de ativação.
    if (!user.passwordHash && /\b(ativar|ativação|ativacao|senha|novo link|link de acesso)\b/i.test(text)) {
      const activation = createActivationToken();
      await prisma.accountActivationToken.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          tokenHash: activation.tokenHash,
          expiresAt: activation.expiresAt,
        },
        update: {
          tokenHash: activation.tokenHash,
          expiresAt: activation.expiresAt,
          usedAt: null,
        },
      });
      const activationUrl = `${PILA_APP_URL}/activate?token=${activation.token}`;
      const replyMessage = `Defina sua senha neste link seguro, válido por 30 minutos:\n${activationUrl}`;
      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, processed: true, replyMessage });
    }

    // 4. Validar assinatura/paywall
    const subStatus = getUserSubscriptionStatus(user.createdAt, user.subscription);
    
    if (!hasProAccess(subStatus) && user.role !== "ADMIN") {
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

    // 6.0 Marcar lembrete como pago ou adiar pelo WhatsApp.
    if (aiResult.reminderAction) {
      const reminder = await prisma.billReminder.findFirst({
        where: {
          userId: user.id,
          isPaid: false,
          ...(aiResult.reminderDescription
            ? { description: { contains: aiResult.reminderDescription, mode: "insensitive" } }
            : {}),
        },
        orderBy: { dueDate: "desc" },
      });
      if (!reminder) {
        const replyMessage = "Não encontrei uma conta pendente com essa descrição.";
        await sendWhatsAppMessage(remoteJid, replyMessage);
        return NextResponse.json({ success: true, replyMessage });
      }

      if (aiResult.reminderAction === "MARK_PAID") {
        await prisma.billReminder.update({
          where: { id: reminder.id },
          data: { isPaid: true, paidAt: new Date() },
        });
        const replyMessage = `✅ Marquei “${reminder.description}” como paga.`;
        await sendWhatsAppMessage(remoteJid, replyMessage);
        return NextResponse.json({ success: true, replyMessage });
      }

      const snoozedUntil = new Date(`${aiResult.snoozeUntil}T12:00:00`);
      await prisma.billReminder.update({
        where: { id: reminder.id },
        data: { snoozedUntil, lastNotifiedAt: null },
      });
      const replyMessage = `Combinado! Vou lembrar você novamente em ${snoozedUntil.toLocaleDateString("pt-BR")}.`;
      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, replyMessage });
    }

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
        const chartUrl = await generateExpenseChart(labels.map((label, index) => ({ label, value: data[index] })));
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
        rawMessage: text,
        externalMessageId: messageId,
      }
    });

    // 8. Responder sucesso usando a mensagem improvisada pela IA
    const fallbackMessage = `✅ Gasto registrado: R$ ${Number(aiResult.amount).toFixed(2)} em ${aiResult.categoryName}`;
    const replyMessage = aiResult.replyMessage || fallbackMessage;
    await sendWhatsAppMessage(remoteJid, replyMessage);

    return NextResponse.json({ success: true, processed: true, replyMessage });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Webhook WhatsApp] Erro:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
