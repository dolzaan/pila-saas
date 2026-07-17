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
  isReminder?: boolean;
  dueDate?: string; // Formato ISO "YYYY-MM-DD"
  isReport?: boolean;
};

export async function parseFinancialMessage(text: string, userContext?: string, mediaBase64?: string, mediaMimeType?: string): Promise<ParsedTransaction> {
  const prompt = `
Você é um assistente financeiro super inteligente para o WhatsApp, chamado "Pila Bot".
Sua tarefa é ler a mensagem do usuário e extrair os dados da transação financeira, ou responder perguntas financeiras baseando-se no Contexto fornecido.

REGRAS:
1. GASTOS E GANHOS: Se a mensagem contiver um gasto/ganho claro (ex: "Gastei 50 num lanche"), ou uma FOTO/ÁUDIO/PDF de recibo, retorne JSON com isTransaction: true e os dados da transação. Se for mídia, transcreva o áudio ou leia o valor total do arquivo. Improvise um \`replyMessage\` natural confirmando o registro.
2. ALERTA DE ORÇAMENTO (BUDGET): Se identificar que a transação fará o usuário estourar (ou chegar muito perto) do Limite do Orçamento cadastrado no "CONTEXTO FINANCEIRO", inclua uma bronca amigável ou aviso no \`replyMessage\`.
3. CONTAS A PAGAR (LEMBRETES): Se o usuário disser algo como "Me lembra de pagar o aluguel dia 10 (valor X)", retorne \`isReminder: true\`, extraindo o \`amount\`, \`description\`, e calculando a \`dueDate\` no formato "YYYY-MM-DD". A \`replyMessage\` deve confirmar o agendamento amigavelmente.
4. RELATÓRIOS E GRÁFICOS: Se o usuário pedir um gráfico, resumo visual ou relatório ("Quero um gráfico dos meus gastos"), retorne \`isReport: true\`.
5. PERGUNTAS GERAIS: Se a mensagem for uma PERGUNTA sobre finanças (não relatório visual), USE EXCLUSIVAMENTE as informações do "CONTEXTO FINANCEIRO" para responder. Retorne isTransaction: false e coloque a resposta na \`replyMessage\`.
6. OUTROS: Se for "Oi" ou outra coisa, retorne isTransaction: false e forneça uma \`replyMessage\` amigável.
7. A resposta DEVE ser um JSON puro (sem markdown ou \`\`\`json).

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
