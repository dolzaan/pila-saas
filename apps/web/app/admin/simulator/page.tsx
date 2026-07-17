"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Trash2 } from "lucide-react";

type ChatMessage = {
  id: string;
  sender: "user" | "bot";
  text: string;
};

export default function SimulatorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState("5511999999999");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !phone.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Simulando o payload que a Evolution API manda
      const payload = {
        event: "messages.upsert",
        instance: "PilaBot-Sim",
        data: {
          key: {
            remoteJid: `${phone}@s.whatsapp.net`,
            fromMe: false,
            id: "SIM_" + Date.now()
          },
          message: {
            conversation: userMsg.text
          }
        }
      };

      const res = await fetch("/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      const botReply = data.replyMessage || "Sem resposta do webhook (verifique os logs).";
      
      const botMsg: ChatMessage = { id: Date.now().toString() + "_bot", sender: "bot", text: botReply };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { id: Date.now().toString() + "_err", sender: "bot", text: "❌ Erro ao conectar com o Webhook local." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Simulador do WhatsApp</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Teste a inteligência do Pila Bot sem precisar conectar um número real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Testar como (Número):</label>
          <input 
            type="text" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="5511999999999"
          />
        </div>
      </div>

      <div className="bg-[#efeae2] dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-sm">
        {/* Chat Header */}
        <div className="bg-[#00a884] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-[#00a884]" />
            </div>
            <div>
              <h3 className="text-white font-medium">Pila Bot (IA)</h3>
              <p className="text-green-100 text-xs">Simulador Local</p>
            </div>
          </div>
          <button 
            onClick={() => setMessages([])}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            title="Limpar Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/r-3L096iYV-.png')] dark:bg-none">
          {messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 px-4 py-2 rounded-lg text-sm max-w-sm text-center">
                Este é um simulador. As mensagens enviadas aqui batem direto no seu webhook local sem passar pela rede do WhatsApp real. Use o número exato que está cadastrado na sua conta para testar!
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm ${
                  msg.sender === "user" 
                    ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-white rounded-tr-none" 
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-lg rounded-tl-none px-4 py-2 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSend} className="bg-gray-100 dark:bg-gray-800 p-3 flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma mensagem (ex: Gastei 15 no iFood)..."
            className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-[#00a884] text-gray-900 dark:text-white outline-none"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="p-3 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
