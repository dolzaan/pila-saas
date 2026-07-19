"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import styles from "./landing-ai-chat.module.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGES: Record<"demo" | "account", Message> = {
  demo: {
    role: "assistant",
    content: "Oi! Eu sou a IA do Pila. Posso explicar como organizo suas finanças pelo WhatsApp. O que você quer saber?",
  },
  account: {
    role: "assistant",
    content: "Oi! Posso consultar seus dados do Pila e responder sobre saldo, gastos, ganhos, categorias, orçamentos e transações. O que você quer analisar?",
  },
};

const SUGGESTIONS: Record<"demo" | "account", string[]> = {
  demo: [
    "Como funciona pelo WhatsApp?",
    "A IA entende áudio e foto?",
    "O que posso testar grátis?",
  ],
  account: [
    "Como estão meus gastos este mês?",
    "Qual categoria teve mais gastos?",
    "Compare meus ganhos e gastos",
  ],
};

export function LandingAiChat() {
  const pathname = usePathname();
  const chatMode = pathname.startsWith("/dashboard") ? "account" : "demo";
  const previousMode = useRef(chatMode);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGES[chatMode]]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const activeMessage = useRef<string | null>(null);

  useEffect(() => {
    if (previousMode.current !== chatMode) {
      previousMode.current = chatMode;
      activeRequest.current?.abort();
      setMessages([INITIAL_MESSAGES[chatMode]]);
      setInput("");
      setLoading(false);
      setErrorMessage(null);
      setFailedMessage(null);
    }
  }, [chatMode]);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleEscape);
      returnFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
  }, [messages, loading, errorMessage, open]);

  useEffect(() => {
    return () => activeRequest.current?.abort();
  }, []);

  async function sendMessage(text: string, addUserMessage = true) {
    const message = text.trim();
    if (!message || loading) return;

    const history = messages.slice(-8);
    const controller = new AbortController();
    activeRequest.current = controller;
    activeMessage.current = message;

    if (addUserMessage) {
      setMessages((current) => [...current, { role: "user", content: message }]);
    }

    setInput("");
    setErrorMessage(null);
    setFailedMessage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/landing-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      });
      const data = await response.json() as { reply?: string; error?: string };

      if (!response.ok) throw new Error(data.error || "Não foi possível responder.");

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply || "Posso ajudar com outra dúvida?" },
      ]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setErrorMessage("Resposta cancelada. Você pode tentar novamente.");
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não consegui responder agora. Tente novamente."
        );
      }
      setFailedMessage(message);
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        activeMessage.current = null;
        setLoading(false);
      }
    }
  }

  function cancelResponse() {
    const message = activeMessage.current;
    activeRequest.current?.abort();
    activeRequest.current = null;
    activeMessage.current = null;
    setLoading(false);
    setFailedMessage(message);
    setErrorMessage("Resposta cancelada. Você pode tentar novamente.");
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
        <section
          className={styles.panel}
          role="dialog"
          aria-labelledby="pila-chat-title"
          aria-describedby="pila-chat-description"
        >
          <header className={styles.header}>
            <div className={styles.avatar} aria-hidden="true"><Bot size={21} /></div>
            <div>
              <strong id="pila-chat-title">
                {chatMode === "account" ? "Assistente financeiro" : "IA do Pila"}
              </strong>
              <span><i aria-hidden="true" /> pronto para conversar</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar chat">
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className={styles.intro} id="pila-chat-description">
            <Sparkles size={14} aria-hidden="true" />
            {chatMode === "account"
              ? "Consulta segura aos dados da sua conta"
              : "Demonstração da experiência inteligente do Pila"}
          </div>

          <div
            className={styles.messages}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={loading}
          >
            {messages.map((message, index) => (
              <div
                className={message.role === "user" ? styles.userMessage : styles.assistantMessage}
                key={`${message.role}-${index}`}
              >
                <span className="sr-only">
                  {message.role === "user" ? "Você: " : "Pila: "}
                </span>
                {message.content}
              </div>
            ))}

            {messages.length === 1 && (
              <div className={styles.suggestions} aria-label="Sugestões de perguntas">
                {SUGGESTIONS[chatMode].map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() => void sendMessage(suggestion)}
                    disabled={loading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className={`${styles.assistantMessage} ${styles.typing}`} role="status">
                <LoaderCircle size={16} aria-hidden="true" /> A IA está preparando a resposta...
              </div>
            )}

            {errorMessage && (
              <div className={styles.errorMessage} role="alert">
                <span>{errorMessage}</span>
                {failedMessage && (
                  <button
                    type="button"
                    onClick={() => void sendMessage(failedMessage, false)}
                    disabled={loading}
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    Tentar novamente
                  </button>
                )}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="landing-ai-message">
              Mensagem para a IA do Pila
            </label>
            <input
              ref={inputRef}
              id="landing-ai-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Pergunte sobre o Pila..."
              maxLength={500}
              disabled={loading}
              autoComplete="off"
            />
            {loading ? (
              <button
                type="button"
                className={styles.cancelButton}
                aria-label="Cancelar resposta"
                onClick={cancelResponse}
              >
                <Square size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Enviar mensagem"
                disabled={!input.trim()}
              >
                <Send size={18} aria-hidden="true" />
              </button>
            )}
          </form>
          <small className={styles.disclaimer}>
            {chatMode === "account"
              ? "Consulta em modo somente leitura. Nenhum dado é alterado."
              : "Este chat demonstra a IA e não registra dados financeiros."}
          </small>
        </section>
      ) : (
        <button
          type="button"
          className={styles.launcher}
          onClick={(event) => {
            returnFocusRef.current = event.currentTarget;
            setOpen(true);
          }}
          aria-label="Conversar com a IA do Pila"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={styles.launcherText}>
            <small>{chatMode === "account" ? "SEUS DADOS + IA" : "IA DO PILA"}</small>
            {chatMode === "account" ? "Consulte suas finanças" : "Tire suas dúvidas"}
          </span>
          <span className={styles.launcherIcon}><MessageCircle size={25} aria-hidden="true" /></span>
        </button>
      )}
    </div>
  );
}
