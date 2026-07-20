"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  Trash2,
  Paperclip,
  X,
  Link2,
  Link2Off,
  LoaderCircle,
  CircleAlert,
} from "lucide-react";

type ChatMessage = {
  id: string;
  sender: "user" | "bot";
  text: string;
  mediaUrl?: string;
};

type SimulatedMessage = {
  conversation?: string;
  imageMessage?: { caption: string; mimetype: string };
  audioMessage?: { mimetype: string };
  documentMessage?: { caption: string; mimetype: string };
  base64?: string;
};

type AccountStatus = "idle" | "checking" | "linked" | "unlinked" | "error";

export default function SimulatorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState("5511999999999");
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File; base64: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const normalizedPhone = phone.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(normalizedPhone)) {
      setAccountStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAccountStatus("checking");
      try {
        const response = await fetch(
          `/api/internal/whatsapp-access?phone=${encodeURIComponent(normalizedPhone)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error(`Falha ao consultar vínculo: ${response.status}`);

        const data = await response.json() as { linked?: boolean };
        setAccountStatus(data.linked ? "linked" : "unlinked");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(error);
        setAccountStatus("error");
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [phone]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment({ file, base64: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || !phone.trim()) return;

    let textMsg = input;
    if (attachment) {
      textMsg = `[Anexo: ${attachment.file.name}] ${input}`;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: "user", text: textMsg.trim() };
    setMessages((prev) => [...prev, userMsg]);

    const currentInput = input;
    const currentAttachment = attachment;

    setInput("");
    setAttachment(null);
    setIsLoading(true);

    try {
      // Montando a mensagem para simular o Evolution API
      const messageObj: SimulatedMessage = { conversation: currentInput };

      if (currentAttachment) {
        const mime = currentAttachment.file.type;
        delete messageObj.conversation;

        if (mime.startsWith("image/")) {
          messageObj.imageMessage = { caption: currentInput, mimetype: mime };
        } else if (mime.startsWith("audio/")) {
          messageObj.audioMessage = { mimetype: mime };
        } else {
          messageObj.documentMessage = { caption: currentInput, mimetype: mime };
        }

        messageObj.base64 = currentAttachment.base64;
      }

      // Simulando o payload que a Evolution API manda
      const payload = {
        event: "messages.upsert",
        instance: "PilaBot-Sim",
        data: {
          key: {
            remoteJid: `${phone.replace(/\D/g, "")}@s.whatsapp.net`,
            fromMe: false,
            id: "SIM_" + Date.now(),
          },
          message: messageObj,
        },
      };

      const res = await fetch("/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.accountStatus === "UNLINKED") setAccountStatus("unlinked");
      if (data.accountStatus === "LINKED") setAccountStatus("linked");
      if (data.accountStatus === "UNKNOWN") setAccountStatus("error");

      const botReply = data.replyMessage || "Sem resposta do webhook (verifique os logs).";

      const botMsg: ChatMessage = {
        id: Date.now().toString() + "_bot",
        sender: "bot",
        text: botReply,
        mediaUrl: data.mediaUrl,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "_err",
        sender: "bot",
        text: "❌ Erro ao conectar com o Webhook local.",
      }]);
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
        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Testar como (Número):</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="5511999999999"
              inputMode="numeric"
            />
          </div>

          {accountStatus === "checking" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> Verificando vínculo...
            </span>
          )}
          {accountStatus === "linked" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Link2 className="w-3.5 h-3.5" /> Número vinculado
            </span>
          )}
          {accountStatus === "unlinked" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Link2Off className="w-3.5 h-3.5" /> Número não vinculado
            </span>
          )}
          {accountStatus === "error" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
              <CircleAlert className="w-3.5 h-3.5" /> Não foi possível verificar
            </span>
          )}
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
                Este é um simulador. Use o número exato cadastrado na conta para testar movimentações. Números sem vínculo podem apenas enviar um PIN ou iniciar o cadastro.
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
                  {msg.mediaUrl && (
                    <img src={msg.mediaUrl} alt="Mídia enviada pelo bot" className="max-w-full h-auto rounded-md mb-2 object-contain" />
                  )}
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
        <form onSubmit={handleSend} className="bg-gray-100 dark:bg-gray-800 p-3 flex flex-col gap-2">
          {accountStatus === "unlinked" && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
              🔒 Comandos financeiros estão bloqueados. Envie o PIN de 6 dígitos ou diga “quero criar minha conta”.
            </div>
          )}
          {accountStatus === "error" && (
            <div className="rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-200">
              Por segurança, movimentações serão bloqueadas enquanto o vínculo não puder ser confirmado.
            </div>
          )}

          {attachment && (
            <div className="flex items-center gap-2 bg-[#d9fdd3] dark:bg-[#005c4b] w-fit px-3 py-1.5 rounded-lg text-sm text-gray-900 dark:text-white">
              <span className="truncate max-w-[200px]">{attachment.file.name}</span>
              <button type="button" onClick={() => setAttachment(null)} className="hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,audio/*,application/pdf"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center justify-center"
              title="Anexar Arquivo (Foto, Áudio ou PDF)"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={accountStatus === "unlinked"
                ? "Envie o PIN ou diga “quero criar minha conta”..."
                : "Digite uma mensagem ou anexe um recibo..."}
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-[#00a884] text-gray-900 dark:text-white outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachment)}
              className="p-3 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
