import { GoogleGenAI } from "@google/genai";

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
};

export async function parseFinancialMessage(text: string, userContext?: string): Promise<ParsedTransaction> {
  const prompt = `
Você é um assistente financeiro super inteligente para o WhatsApp, chamado "Pila Bot".
Sua tarefa é ler a mensagem do usuário e extrair os dados da transação financeira, ou responder perguntas financeiras baseando-se no Contexto fornecido.

REGRAS:
1. Se a mensagem contiver um gasto ou ganho claro (ex: "Gastei 50 num lanche", "Recebi 1000 de salário"), você DEVE retornar JSON com isTransaction: true e os dados da transação. ALÉM DISSO, improvise um \`replyMessage\` natural e amigável confirmando o registro (ex: "Beleza! Já anotei seus R$ 50 no Lanche. 🍔").
2. Se a mensagem for uma PERGUNTA sobre finanças (ex: "Quanto gastei hoje?", "Como estão meus gastos no mês?"), USE EXCLUSIVAMENTE as informações da seção "CONTEXTO FINANCEIRO DO USUÁRIO" abaixo para responder com precisão. Retorne isTransaction: false e coloque a resposta na \`replyMessage\`.
3. Se a mensagem for apenas um "Oi", "Tudo bem?", ou uma pergunta que não envolve finanças, você DEVE retornar isTransaction: false e fornecer uma \`replyMessage\` amigável e espirituosa.
4. A resposta DEVE ser um JSON puro, sem marcações markdown ou blocos de código (não use \`\`\`json).

CONTEXTO FINANCEIRO DO USUÁRIO:
${userContext || "Nenhum dado disponível."}

Formato JSON esperado para Transação:
{
  "isTransaction": true,
  "amount": 50.00,
  "kind": "EXPENSE", // ou "INCOME"
  "description": "Lanche",
  "categoryName": "Alimentação",
  "replyMessage": "Beleza! Já anotei seus R$ 50 no Lanche. 🍔"
}

Formato JSON esperado para Não-Transação:
{
  "isTransaction": false,
  "replyMessage": "Sua resposta amigável aqui."
}

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

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        temperature: 0.7, // Um pouco mais alto para permitir criatividade nas respostas
      }
    });

    const output = response.text?.trim() || "{}";
    
    // Remover eventuais blocos de código se o modelo insistir em usar
    const cleanJson = output.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsed = JSON.parse(cleanJson);
    return parsed as ParsedTransaction;
  } catch (error: any) {
    console.error("[Gemini API] Erro ao processar mensagem:", error);
    return {
      isTransaction: false,
      replyMessage: `Desculpe, erro interno ao conectar com a IA: ${error?.message || error}`
    };
  }
}
