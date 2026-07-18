"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import styles from "./landing-ai-chat.module.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Oi! Eu sou a IA do Pila. Posso explicar como organizo suas finanças pelo WhatsApp. O que você quer saber?",
};

const SUGGESTIONS = [
  "Como funciona pelo WhatsApp?",
  "A IA entende áudio e foto?",
  "O que posso testar grátis?",
];

export function LandingAiChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    const history = messages.slice(-8);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/landing-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await response.json() as { reply?: string; error?: string };

      if (!response.ok) throw new Error(data.error || "Não foi possível responder.");
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply || "Posso ajudar com outra dúvida?" },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error
            ? error.message
            : "Não consegui responder agora. Tente novamente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className={styles.chatRoot}>
      {open ? (
        <section className={styles.panel} aria-label="Chat com a IA do Pila">
          <header className={styles.header}>
            <div className={styles.avatar}><Bot size={21} /></div>
            <div>
              <strong>IA do Pila</strong>
              <span><i /> online agora</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar chat">
              <X size={20} />
            </button>
          </header>

          <div className={styles.intro}>
            <Sparkles size={14} />
            Demonstração da experiência inteligente do Pila
          </div>

          <div className={styles.messages} aria-live="polite">
            {messages.map((message, index) => (
              <div
                className={message.role === "user" ? styles.userMessage : styles.assistantMessage}
                key={`${message.role}-${index}`}
              >
                {message.content}
              </div>
            ))}
            {messages.length === 1 && (
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((suggestion) => (
                  <button type="button" key={suggestion} onClick={() => void sendMessage(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {loading && (
              <div className={`${styles.assistantMessage} ${styles.typing}`}>
                <LoaderCircle size={16} /> Pensando...
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="landing-ai-message">Mensagem para a IA do Pila</label>
            <input
              id="landing-ai-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Pergunte sobre o Pila..."
              maxLength={500}
              disabled={loading}
              autoComplete="off"
            />
            <button type="submit" aria-label="Enviar mensagem" disabled={loading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
          <small className={styles.disclaimer}>Este chat demonstra a IA e não registra dados financeiros.</small>
        </section>
      ) : (
        <button
          type="button"
          className={styles.launcher}
          onClick={() => setOpen(true)}
          aria-label="Conversar com a IA do Pila"
        >
          <span className={styles.launcherText}>
            <small>IA DO PILA</small>
            Tire suas dúvidas
          </span>
          <span className={styles.launcherIcon}><MessageCircle size={25} /></span>
        </button>
      )}
    </div>
  );
}
