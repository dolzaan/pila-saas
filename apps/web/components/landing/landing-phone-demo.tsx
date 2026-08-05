"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BarChart3, Camera, LoaderCircle, ReceiptText, Send, Wallet } from "lucide-react";
import styles from "./landing-phone-demo.module.css";

type ScenarioId = "expense" | "receipt" | "summary";

type Scenario = {
  id: ScenarioId;
  label: string;
  icon: LucideIcon;
  prompt: string;
  title: string;
  amount: string;
  meta: string;
  note: string;
  progress?: number;
};

const SCENARIOS: Scenario[] = [
  {
    id: "expense",
    label: "Gasto",
    icon: ReceiptText,
    prompt: "Gastei R$ 42,90 no mercado",
    title: "Gasto registrado",
    amount: "R$ 42,90",
    meta: "Alimentação",
    note: "68% do orçamento utilizado",
    progress: 68,
  },
  {
    id: "receipt",
    label: "Comprovante",
    icon: Camera,
    prompt: "📎 comprovante-mercado.jpg",
    title: "Comprovante lido",
    amount: "R$ 86,40",
    meta: "Mercado • hoje",
    note: "3 itens identificados automaticamente",
  },
  {
    id: "summary",
    label: "Resumo",
    icon: BarChart3,
    prompt: "Como estão meus gastos este mês?",
    title: "Resumo de agosto",
    amount: "R$ 1.486,70",
    meta: "Total gasto até agora",
    note: "Alimentação subiu 12% em relação a julho",
  },
];

function getScenario(id: ScenarioId) {
  return SCENARIOS.find((scenario) => scenario.id === id) ?? SCENARIOS[0]!;
}

export function LandingPhoneDemo({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("expense");
  const [runKey, setRunKey] = useState(0);
  const [hasEntered, setHasEntered] = useState(false);
  const [typedLength, setTypedLength] = useState(0);
  const [step, setStep] = useState(0);
  const scenario = getScenario(scenarioId);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (typeof IntersectionObserver === "undefined") {
      const fallbackTimer = setTimeout(() => setHasEntered(true), 0);
      return () => clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setHasEntered(true);
        observer.disconnect();
      },
      { threshold: 0.28 },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasEntered) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    let typingInterval = 0;
    timers.push(window.setTimeout(() => {
      setTypedLength(reducedMotion ? scenario.prompt.length : 0);
      setStep(reducedMotion ? 4 : 0);
      if (reducedMotion) return;

      typingInterval = window.setInterval(() => {
        setTypedLength((current) => {
          if (current >= scenario.prompt.length) {
            window.clearInterval(typingInterval);
            return current;
          }
          return current + 1;
        });
      }, 24);

      const typingDuration = scenario.prompt.length * 24;
      timers.push(window.setTimeout(() => setStep(1), typingDuration + 260));
      timers.push(window.setTimeout(() => setStep(2), typingDuration + 780));
      timers.push(window.setTimeout(() => setStep(3), typingDuration + 1560));
      timers.push(window.setTimeout(() => setStep(4), typingDuration + 2040));
    }, 0));

    return () => {
      window.clearInterval(typingInterval);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [hasEntered, runKey, scenario]);

  function selectScenario(id: ScenarioId) {
    setScenarioId(id);
    setTypedLength(0);
    setStep(0);
    setRunKey((current) => current + 1);
  }

  return (
    <div
      ref={rootRef}
      className={className}
      data-hero-element="phone"
      data-interactive-demo
    >
      <div className={styles.phoneTop}>
        <div className={styles.avatar}><Wallet size={20} /></div>
        <div><strong>Pila</strong><span>online</span></div>
      </div>

      <div className={styles.chat}>
        <div className={styles.scenarioPicker} aria-label="Escolha uma demonstração">
          {SCENARIOS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              className={scenarioId === id ? styles.scenarioActive : undefined}
              aria-pressed={scenarioId === id}
              onClick={() => selectScenario(id)}
              key={id}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <small className={styles.demoLabel}>DEMONSTRAÇÃO COM DADOS FICTÍCIOS</small>

        <div className={styles.conversation} aria-live="polite">
          {step >= 1 && <div className={styles.userMessage}>{scenario.prompt}</div>}

          {step === 2 && (
            <div className={styles.thinking}>
              <LoaderCircle size={14} /> Pila está organizando...
            </div>
          )}

          {step >= 3 && (
            <div className={styles.botMessage}>
              <span className={styles.botLabel}>PILA</span>
              <strong>{scenario.title}</strong>
              <b>{scenario.amount}</b>
              <span>{scenario.meta}</span>
              {scenario.progress !== undefined && (
                <div className={styles.progress} aria-label={`${scenario.progress}% do orçamento utilizado`}>
                  <i style={{ width: `${scenario.progress}%` }} />
                </div>
              )}
              <small>{scenario.note}</small>
              {step >= 4 && (
                <Link className={styles.demoCta} href="/register">
                  Quero testar <ArrowRight size={13} />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.messageInput} aria-hidden="true">
        <span>
          {step === 0 ? scenario.prompt.slice(0, typedLength) : "Mensagem"}
          {step === 0 && <i />}
        </span>
        <Send size={17} />
      </div>
    </div>
  );
}
