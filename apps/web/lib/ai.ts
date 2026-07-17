import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type ParsedTransaction = {
  isTransaction: boolean;
  amount?: number;
  kind?: "EXPENSE" | "INCOME";
  description?: string;
  categoryName?: string;
  replyMessage?: string;
};

export async function parseFinancialMessage(text: string): Promise<ParsedTransaction> {
  const prompt = `
Você é um assistente financeiro super inteligente para o WhatsApp, chamado "Pila Bot".
Sua tarefa é ler a mensagem do usuário e extrair os dados da transação financeira, ou responder de forma natural se não for uma transação.

REGRAS:
1. Se a mensagem contiver um gasto ou ganho claro (ex: "Gastei 50 num lanche", "Recebi 1000 de salário"), você DEVE retornar JSON com isTransaction: true e os dados da transação. ALÉM DISSO, improvise um \`replyMessage\` natural e amigável confirmando o registro (ex: "Beleza! Já anotei seus R$ 50 no Lanche. 🍔").
2. Se a mensagem for apenas um "Oi", "Tudo bem?", ou uma pergunta que não envolve registrar dinheiro, você DEVE retornar isTransaction: false e fornecer uma \`replyMessage\` amigável e espirituosa, agindo como um assistente financeiro prestativo.
3. A resposta DEVE ser um JSON puro, sem marcações markdown ou blocos de código (não use \`\`\`json).

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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
  } catch (error) {
    console.error("[Gemini API] Erro ao processar mensagem:", error);
    return {
      isTransaction: false,
      replyMessage: "Desculpe, tive um problema interno ao entender sua mensagem. Tente novamente mais tarde."
    };
  }
}
