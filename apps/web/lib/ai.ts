import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
// Usamos o SDK apenas se a chave estiver configurada
const ai = apiKey && apiKey !== "COLOQUE_SUA_CHAVE_DO_GEMINI_AQUI" 
  ? new GoogleGenAI({ apiKey }) 
  : null;

export type AITransactionResult = {
  amount: number;
  kind: "EXPENSE" | "INCOME";
  description: string;
  categoryId: string | null;
  date: string | null; // Formato YYYY-MM-DD
};

type UserCategory = {
  id: string;
  name: string;
  kind: "EXPENSE" | "INCOME";
};

export async function processTransactionText(
  text: string, 
  userCategories: UserCategory[]
): Promise<AITransactionResult | null> {
  if (!ai) {
    console.warn("[AI] Gemini API Key missing or invalid. Returning fallback data.");
    // Fallback rústico apenas para não quebrar a aplicação caso o usuário ainda não tenha configurado
    const isIncome = text.toLowerCase().includes("recebi") || text.toLowerCase().includes("salário");
    const matches = text.match(/\d+(\.\d{1,2})?/);
    const amount = matches ? parseFloat(matches[0]) : 0;
    
    return {
      amount: amount || 1.0,
      kind: isIncome ? "INCOME" : "EXPENSE",
      description: text.substring(0, 50),
      categoryId: null,
      date: new Date().toISOString().split("T")[0]
    };
  }

  // Prepara o dicionário de categorias para o prompt
  const categoriesList = userCategories.map(c => `- ID: ${c.id} | Nome: "${c.name}" | Tipo: ${c.kind}`).join("\n");

  const systemInstruction = `Você é um assistente financeiro inteligente do aplicativo Pila.
O usuário vai enviar uma mensagem informal sobre um gasto ou uma receita (ex: "gastei 50 no ifood", "recebi meu salario de 5000", "paguei a luz 120,50").

Sua tarefa é extrair os dados dessa mensagem e retornar ESTRITAMENTE em formato JSON, conforme o schema fornecido.

Regras:
1. 'amount' DEVE ser um número (positivo). Se ele usou vírgula (120,50), converta para float (120.50).
2. 'kind' DEVE ser "EXPENSE" (para gastos/compras/pagamentos) ou "INCOME" (para recebimentos/salários).
3. 'description' DEVE ser uma descrição limpa e curta (ex: "iFood", "Luz", "Salário", "Mercado"). Capitalize a primeira letra.
4. 'categoryId': Analise a descrição e tente encontrar a categoria MAIS ADEQUADA da lista de categorias do usuário abaixo. Se achar uma boa correspondência, retorne o 'ID' da categoria. Se nenhuma fizer sentido, retorne null.
5. 'date': Se o usuário mencionar algo como "ontem", "anteontem", subtraia da data de hoje. Se não mencionar data, retorne a data de hoje. O formato DEVE ser YYYY-MM-DD. Hoje é ${new Date().toISOString().split("T")[0]}.

Categorias cadastradas do usuário:
${categoriesList || "Nenhuma categoria cadastrada."}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: text,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "O valor da transação, em float (ex: 120.50)" },
            kind: { type: Type.STRING, enum: ["EXPENSE", "INCOME"], description: "Tipo da transação" },
            description: { type: Type.STRING, description: "Descrição limpa da transação" },
            categoryId: { type: Type.STRING, nullable: true, description: "ID da categoria correspondente (da lista) ou null" },
            date: { type: Type.STRING, nullable: true, description: "Data no formato YYYY-MM-DD" }
          },
          required: ["amount", "kind", "description"]
        }
      }
    });

    const resultText = response.text();
    if (!resultText) return null;

    const data = JSON.parse(resultText) as AITransactionResult;
    return data;
  } catch (error) {
    console.error("[AI] Error processing transaction with Gemini:", error);
    return null;
  }
}
