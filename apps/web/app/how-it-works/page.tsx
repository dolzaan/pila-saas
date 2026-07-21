import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, Check, MessageCircle, Send, Sparkles } from "lucide-react";
import styles from "../landing.module.css";

export const metadata: Metadata = {
  title: "Como funciona — Pila",
  description: "Veja como uma conversa no WhatsApp ou Telegram vira organização financeira no Pila.",
};

const steps = [
  ["01", MessageCircle, "Você envia", "Conte um gasto, uma receita ou uma dúvida por texto, áudio ou foto."],
  ["02", BrainCircuit, "A IA interpreta", "O Pila identifica valores, categorias, datas e o contexto necessário para o registro."],
  ["03", Send, "O Pila organiza", "A movimentação é salva na sua conta e a resposta volta pelo canal usado."],
  ["04", BarChart3, "Você acompanha", "O dashboard atualiza seus saldos, categorias, metas e relatórios."],
] as const;

export default function HowItWorksPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={styles.headerInner}><Link className={styles.brand} href="/"><Image src="/logo-icon.png" alt="" width={40} height={40} priority /><span>Pila</span></Link><nav className={styles.nav}><Link href="/features">Recursos</Link><Link href="/how-it-works">Como funciona</Link><Link href="/security">Segurança</Link><Link href="/#preco">Preço</Link></nav><div className={styles.headerActions}><Link className={styles.loginLink} href="/login">Entrar</Link><Link className={styles.smallCta} href="/register">Começar grátis <ArrowRight size={16} /></Link></div></div></header>
      <section className={styles.hero}><div className={styles.heroGrid}><div className={styles.heroCopy}><div className={styles.eyebrow}><Sparkles size={15} /> COMO O PILA FUNCIONA</div><h1>Da conversa ao controle financeiro.</h1><p>Você fala do seu jeito. O Pila interpreta, organiza e transforma cada mensagem em informação útil para o seu dia a dia.</p><div className={styles.heroActions}><Link className={styles.primaryCta} href="/register">Criar minha conta <ArrowRight size={19} /></Link><Link className={styles.secondaryCta} href="/features">Conhecer recursos</Link></div><div className={styles.heroNotes}><span><Check size={15} /> Texto, áudio e foto</span><span><Check size={15} /> WhatsApp e Telegram</span><span><Check size={15} /> Dashboard atualizado</span></div></div></div></section>
      <section className={styles.section}><div className={styles.sectionHeading}><span>DO ENVIO À DECISÃO</span><h2>Um fluxo simples em quatro etapas.</h2><p>Sem formulários longos e sem precisar adaptar sua rotina a mais um aplicativo.</p></div><div className={styles.featureGrid}>{steps.map(([number, Icon, title, text]) => <article className={styles.featureCard} key={number}><div className={styles.featureIcon}><Icon size={22} /></div><span className={styles.stepNumber}>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className={`${styles.section} ${styles.featuresSection}`}><div className={styles.sectionHeading}><span>EXEMPLO PRÁTICO</span><h2>Uma mensagem já é suficiente.</h2></div><div className={styles.aiPrompt}><MessageCircle size={18} /><div><strong>“Gastei R$ 42,90 no mercado.”</strong><span>O Pila identifica o valor, registra como despesa, sugere a categoria e atualiza seus relatórios.</span></div></div><div className={styles.aiPrompt}><BrainCircuit size={18} /><div><strong>“Como estão meus gastos este mês?”</strong><span>A IA consulta seus dados e responde com um resumo das categorias e valores mais relevantes.</span></div></div></section>
      <section className={styles.finalCta}><div><span>Comece com uma mensagem.</span><h2>Deixe o Pila cuidar da organização.</h2></div><Link className={styles.lightCta} href="/register">Testar grátis <ArrowRight size={19} /></Link></section>
      <footer className={styles.footer}><Link className={styles.brand} href="/"><Image src="/logo-icon.png" alt="" width={34} height={34} /><span>Pila</span></Link><p>Organização financeira simples, todos os dias.</p><div><Link href="/features">Recursos</Link><Link href="/security">Segurança</Link><Link href="/privacy">Privacidade</Link><Link href="/terms">Termos</Link></div></footer>
    </main>
  );
}
