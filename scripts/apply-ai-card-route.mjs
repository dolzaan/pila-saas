import { readFileSync, writeFileSync } from "node:fs";

const routePath = "apps/web/app/api/webhooks/whatsapp/route.ts";
let source = readFileSync(routePath, "utf8");

function code(value) {
  return value.replaceAll("§", "`");
}

function replaceOnce(label, search, replacement) {
  if (!source.includes(search)) {
    throw new Error(`Não foi possível aplicar a etapa: ${label}`);
  }
  source = source.replace(search, replacement);
}

replaceOnce(
  "importar helpers de contas",
  'import { rawMessageForStorage } from "@/lib/privacy";\n',
  code(String.raw`import { rawMessageForStorage } from "@/lib/privacy";
import {
  buildAccountClarificationMessage,
  buildCardQueryReply,
  formatFinancialAccountsForAi,
  resolveFinancialAccount,
  type FinancialAccountForAi,
} from "@/lib/financial-account-ai";
`),
);

replaceOnce(
  "buscar cartões e gastos por conta",
  "    let monthExpenses = 0;",
  code(String.raw`    const rawFinancialAccounts = await prisma.financialAccount.findMany({
      where: { userId: user.id, isArchived: false },
      select: {
        id: true,
        name: true,
        type: true,
        creditLimit: true,
        closingDay: true,
        dueDay: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const expensesByAccount = await prisma.transaction.groupBy({
      by: ["financialAccountId"],
      where: {
        userId: user.id,
        kind: "EXPENSE",
        occurredAt: { gte: startOfMonth },
        financialAccountId: { not: null },
      },
      _sum: { amount: true },
    });

    const financialAccounts: FinancialAccountForAi[] = rawFinancialAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      creditLimit: account.creditLimit === null ? null : Number(account.creditLimit),
      closingDay: account.closingDay,
      dueDay: account.dueDay,
    }));
    const expensesThisMonthByAccountId = new Map<string, number>();
    for (const item of expensesByAccount) {
      if (item.financialAccountId) {
        expensesThisMonthByAccountId.set(
          item.financialAccountId,
          Number(item._sum.amount || 0),
        );
      }
    }

    let monthExpenses = 0;`),
);

replaceOnce(
  "formatar contas para a IA",
  "    const userContext = `\n",
  code(String.raw`    const financialAccountLines = formatFinancialAccountsForAi(
      financialAccounts,
      expensesThisMonthByAccountId,
    );

    const userContext = §
`),
);

replaceOnce(
  "adicionar contas ao contexto",
  "Total de Ganhos: R$ ${monthIncomes.toFixed(2)}\n\nSituação dos Orçamentos (Budgets) deste mês:",
  "Total de Ganhos: R$ ${monthIncomes.toFixed(2)}\n\nCONTAS E CARTÕES CADASTRADOS:\n${financialAccountLines}\n\nSituação dos Orçamentos (Budgets) deste mês:",
);

const parseMarker = "    const aiResult = await parseFinancialMessage(text, userContext, mediaBase64, mediaMimeType);\n";
replaceOnce(
  "tratar consultas e ambiguidades de cartão",
  parseMarker,
  parseMarker + code(String.raw`
    // Consultas de cartão são respondidas com dados determinísticos do banco.
    if (aiResult.isCardQuery && aiResult.cardQuery) {
      const resolution = resolveFinancialAccount(
        aiResult.cardName || aiResult.financialAccountName,
        financialAccounts,
        { creditCardsOnly: true },
      );

      if (resolution.status !== "MATCHED") {
        const replyMessage = buildAccountClarificationMessage(resolution.candidates);
        await sendWhatsAppMessage(remoteJid, replyMessage);
        return NextResponse.json({ success: true, replyMessage });
      }

      const replyMessage = buildCardQueryReply(
        aiResult.cardQuery,
        resolution.account,
        expensesThisMonthByAccountId.get(resolution.account.id) || 0,
      );
      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, replyMessage });
    }

    if (aiResult.needsClarification) {
      const replyMessage = aiResult.replyMessage || buildAccountClarificationMessage(
        financialAccounts.filter((account) => account.type === "CREDIT_CARD"),
      );
      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, replyMessage });
    }
`),
);

replaceOnce(
  "resolver conta antes do lançamento",
  "    // 7. Salvar no Banco de Dados (apenas se for transação)",
  code(String.raw`    if ((aiResult.installments || 1) > 1) {
      const replyMessage =
        §Entendi que essa compra foi parcelada em \${aiResult.installments} vezes, mas ainda não registrei para não lançar o valor total na fatura errada. Por enquanto, registre as parcelas pelo painel.§;
      await sendWhatsAppMessage(remoteJid, replyMessage);
      return NextResponse.json({ success: true, replyMessage });
    }

    // Resolve o nome retornado pela IA somente entre contas pertencentes ao usuário.
    // IDs nunca são aceitos do modelo.
    let financialAccountId: string | null = null;
    let resolvedFinancialAccountName: string | null = null;
    const shouldResolveCreditCard = aiResult.paymentMethod === "CREDIT_CARD";
    if (shouldResolveCreditCard || aiResult.financialAccountName) {
      const resolution = resolveFinancialAccount(
        aiResult.financialAccountName,
        financialAccounts,
        { creditCardsOnly: shouldResolveCreditCard },
      );

      if (resolution.status !== "MATCHED") {
        const label = shouldResolveCreditCard ? "cartão" : "conta";
        const replyMessage = buildAccountClarificationMessage(resolution.candidates, label);
        await sendWhatsAppMessage(remoteJid, replyMessage);
        return NextResponse.json({ success: true, replyMessage });
      }

      financialAccountId = resolution.account.id;
      resolvedFinancialAccountName = resolution.account.name;
    }

    // 7. Salvar no Banco de Dados (apenas se for transação)`),
);

replaceOnce(
  "vincular lançamento à conta",
  "        categoryId: categoryId,\n        source: \"whatsapp\",",
  "        categoryId: categoryId,\n        financialAccountId,\n        source: \"whatsapp\",",
);

replaceOnce(
  "melhorar confirmação do lançamento",
  code(String.raw`    const fallbackMessage = §✅ Gasto registrado: R$ \${Number(aiResult.amount).toFixed(2)} em \${aiResult.categoryName}§;
    const replyMessage = aiResult.replyMessage || fallbackMessage;`),
  code(String.raw`    const movementLabel = aiResult.kind === "INCOME" ? "Ganho" : "Gasto";
    const accountSuffix = resolvedFinancialAccountName
      ? § no \${resolvedFinancialAccountName}§
      : "";
    const fallbackMessage = §✅ \${movementLabel} registrado: R$ \${Number(aiResult.amount).toFixed(2)} em \${aiResult.categoryName || "Sem categoria"}\${accountSuffix}§;
    const replyMessage = aiResult.replyMessage || fallbackMessage;`),
);

writeFileSync(routePath, source);
console.log("Integração de cartões aplicada ao webhook do WhatsApp.");
