import { GoogleGenAI } from "@google/genai";
import { PILA_PUBLIC_KNOWLEDGE } from "@/lib/pila-knowledge";
import { z } from "zod";
import {
  checkRateLimits,
  getSaoPauloDateKey,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";

const DEFAULT_GEMINI_DAILY_REQUEST_LIMIT = 200;
const GEMINI_DAILY_WINDOW_MS = 26 * 60 * 60 * 1000;

function getGeminiDailyRequestLimit() {
  const configured = Number(process.env.GEMINI_DAILY_REQUEST_LIMIT);
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : DEFAULT_GEMINI_DAILY_REQUEST_LIMIT;
}

// Inicialização preguiçosa para não quebrar a compilação caso a chave esteja ausente no .env
let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });
} catch (e) {}

export type ParsedTransaction = {
  isTransaction: boolean;
  amount?: number;
  kind?: "EXPENSE" | "INCOME";
  description?: string;
  categoryName?: string;
  replyMessage?: string;
  isReminder?: boolean;
  dueDate?: string; // Formato ISO "YYYY-MM-DD"
  isReport?: boolean;
  reminderAction?: "MARK_PAID" | "SNOOZE";
  reminderDescription?: string;
  snoozeUntil?: string;
};

const ParsedTransactionSchema = z.object({
  isTransaction: z.boolean(),
  amount: z.number().positive().max(1_000_000_000).optional(),
  kind: z.enum(["EXPENSE", "INCOME"]).optional(),
  description: z.string().trim().max(255).optional(),
  categoryName: z.string().trim().max(50).optional(),
  replyMessage: z.string().trim().max(1500).optional(),
  isReminder: z.boolean().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isReport: z.boolean().optional(),
  reminderAction: z.enum(["MARK_PAID", "SNOOZE"]).optional(),
  reminderDescription: z.string().trim().max(255).optional(),
  snoozeUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).superRefine((value, context) => {
  if (value.isTransaction && (!value.amount || !value.kind)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Transação sem valor ou tipo" });
  }
  if (value.isReminder && (!value.amount || !value.description || !value.dueDate)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Lembrete incompleto" });
  }
  if (value.reminderAction === "SNOOZE" && !value.snoozeUntil) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Adiamento sem nova data" });
  }
});

export async function parseFinancialMessage(text: string, userContext?: string, mediaBase64?: string, mediaMimeType?: string): Promise<ParsedTransaction> {
  const prompt = `
Você é um assistente financeiro super inteligente para o WhatsApp, chamado "Pila Bot".
Sua tarefa é ajudar clientes e visitantes a conhecer e usar o Pila, além de extrair dados de transações financeiras e responder perguntas financeiras baseando-se no contexto fornecido.

${PILA_PUBLIC_KNOWLEDGE}

REGRAS:
1. GASTOS E GANHOS: Se a mensagem contiver um gasto/ganho claro (ex: "Gastei 50 num lanche"), ou uma FOTO/ÁUDIO/PDF de recibo, retorne JSON com isTransaction: true e os dados da transação. Se for mídia, transcreva o áudio ou leia o valor total do arquivo. Improvise um \`replyMessage\` natural confirmando o registro.
2. ALERTA DE ORÇAMENTO (BUDGET): Se identificar que a transação fará o usuário estourar (ou chegar muito perto) do Limite do Orçamento cadastrado no "CONTEXTO FINANCEIRO", inclua uma bronca amigável ou aviso no \`replyMessage\`.
3. CONTAS A PAGAR (LEMBRETES): Se o usuário disser algo como "Me lembra de pagar o aluguel dia 10 (valor X)", retorne \`isReminder: true\`, extraindo o \`amount\`, \`description\`, e calculando a \`dueDate\` no formato "YYYY-MM-DD". A \`replyMessage\` deve confirmar o agendamento amigavelmente.
4. AÇÕES EM LEMBRETES: Se disser que pagou uma conta, retorne \`reminderAction: "MARK_PAID"\` e \`reminderDescription\`. Se pedir para lembrar depois, retorne \`reminderAction: "SNOOZE"\`, a descrição se houver e \`snoozeUntil\` em YYYY-MM-DD.
5. RELATÓRIOS E GRÁFICOS: Se o usuário pedir um gráfico, resumo visual ou relatório ("Quero um gráfico dos meus gastos"), retorne \`isReport: true\`.
6. PERGUNTAS FINANCEIRAS: Se a mensagem for uma pergunta sobre os dados financeiros do usuário (não relatório visual), use exclusivamente o "CONTEXTO FINANCEIRO". Não invente valores ou transações.
7. ATENDIMENTO E ONBOARDING: Responda dúvidas sobre o Pila usando exclusivamente as "INFORMAÇÕES OFICIAIS DO PILA". Explique de forma curta e natural, faça no máximo uma pergunta por vez e conduza interessados ao cadastro. Sempre entregue o link oficial completo quando perguntarem pelo site ou cadastro.
8. SEGURANÇA: Nunca peça senha, cartão, código de autenticação ou dado bancário pelo WhatsApp. Nunca afirme que uma conta foi criada se o sistema não confirmou isso.
9. OUTROS: Se for uma saudação, apresente-se brevemente e pergunte se a pessoa quer conhecer o Pila ou registrar uma movimentação.
10. A resposta DEVE ser um JSON puro (sem markdown ou \`\`\`json).

CONTEXTO FINANCEIRO DO USUÁRIO:
${userContext || "Nenhum dado disponível."}

Formato JSON esperado para Transação:
{ "isTransaction": true, "amount": 50.00, "kind": "EXPENSE", "description": "Lanche", "categoryName": "Alimentação", "replyMessage": "Beleza! Já anotei seus R$ 50 no Lanche. 🍔" }

Formato JSON esperado para Lembrete:
{ "isTransaction": false, "isReminder": true, "amount": 1500.00, "description": "Aluguel", "dueDate": "2024-05-10", "replyMessage": "Anotado! Vou te lembrar de pagar o Aluguel no dia 10." }

Formato JSON esperado para Relatório Visual (Gráfico):
{ "isTransaction": false, "isReport": true, "replyMessage": "Aqui está o gráfico dos seus gastos!" }

Formato JSON esperado para Não-Transação/Pergunta:
{ "isTransaction": false, "replyMessage": "Sua resposta amigável aqui." }

Mensagem do usuário: "${text}"
  `;

  try {
    if (!ai || !process.env.GEMINI_API_KEY) {
      console.error("[Gemini API] Chave GEMINI_API_KEY não configurada no .env");
      return {
        isTransaction: false,
        replyMessage: "⚠️ Ops! Parece que o meu cérebro (Chave do Gemini) não foi configurado no arquivo .env do servidor. Adicione a variável GEMINI_API_KEY e reinicie o sistema!"
      };
    }

    const dailyLimit = getGeminiDailyRequestLimit();
    const dailyDecision = await checkRateLimits([
      {
        key: `ai:gemini:daily:${getSaoPauloDateKey()}`,
        limit: dailyLimit,
        windowMs: GEMINI_DAILY_WINDOW_MS,
      },
    ]);
    if (!dailyDecision.allowed) {
      console.warn("[Gemini API] Limite diário de requisições atingido.");
      return {
        isTransaction: false,
        replyMessage:
          "A IA atingiu o limite diário de segurança. Tente novamente amanhã.",
      };
    }

    // Prepara o payload para texto ou multimodal (texto + áudio/imagem/pdf)
    let aiContents: any = prompt;
    if (mediaBase64 && mediaMimeType) {
      const cleanBase64 = mediaBase64.replace(/^data:\w+\/[-+.\w]+;base64,/, "");
      aiContents = [
        prompt,
        { inlineData: { data: cleanBase64, mimeType: mediaMimeType } }
      ];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: aiContents,
      config: {
        temperature: 0.2,
        maxOutputTokens: 2_048,
      }
    });

    const output = response.text?.trim() || "{}";
    
    // Remover eventuais blocos de código se o modelo insistir em usar
    const cleanJson = output.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsedJson: unknown = JSON.parse(cleanJson);
    const parsed = ParsedTransactionSchema.safeParse(parsedJson);
    if (!parsed.success) {
      console.error("[Gemini API] Resposta inválida:", parsed.error.issues);
      return {
        isTransaction: false,
        replyMessage: "Não consegui interpretar essa mensagem com segurança. Pode escrever de outra forma?",
      };
    }
    return parsed.data;
  } catch (error: unknown) {
    if (error instanceof RateLimitUnavailableError) {
      console.error("[Gemini API] Rate limiting indisponível:", error.message);
      return {
        isTransaction: false,
        replyMessage:
          "A IA está temporariamente indisponível. Tente novamente em instantes.",
      };
    }

    console.error("[Gemini API] Erro ao processar mensagem:", error);
    return {
      isTransaction: false,
      replyMessage: "Desculpe, ocorreu um erro interno ao conectar com a IA.",
    };
  }
}
