import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Bell, BrainCircuit, Camera, MessageCircle, Mic, PieChart, Send, Sparkles, Target } from "lucide-react";
import styles from "../landing.module.css";

export const metadata: Metadata = {
  title: "Recursos — Pila",
  description: "Conheça os recursos do Pila para registrar, acompanhar e planejar sua vida financeira.",
};

const resources = [
  [MessageCircle, "WhatsApp", "Registre gastos, receitas e dúvidas no canal que já faz parte da sua rotina."],
  [Send, "Telegram", "Continue usando as funções essenciais em um canal alternativo conectado à mesma conta."],
  [Mic, "Lançamentos por áudio", "Conte o que aconteceu por voz e deixe a IA transformar a mensagem em um registro."],
  [Camera, "Leitura de comprovantes", "Envie uma foto para identificar e organizar as informações importantes da compra."],
  [BrainCircuit, "IA financeira", "Faça perguntas naturais, peça resumos e receba respostas com base nos seus dados."],
  [BarChart3, "Dashboard", "Visualize receitas, despesas, saldos e evolução do mês em um só lugar."],
  [Target, "Metas e orçamentos", "Defina objetivos, limites por categoria e acompanhe seu progresso."],
  [Bell, "Lembretes", "Organize despesas recorrentes e receba avisos antes do vencimento."],
  [PieChart, "Relatórios", "Compare períodos, descubra padrões e entenda melhor seus hábitos financeiros."],
] as const;

export default function FeaturesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={styles.headerInner}><Link className={styles.brand} href="/"><Image src="/logo-icon.png" alt="" width={40} height={40} priority /><span>Pila</span></Link><nav className={styles.nav}><Link href="/features">Recursos</Link><Link href="/how-it-works">Como funciona</Link><Link href="/security">Segurança</Link><Link href="/#preco">Preço</Link></nav><div className={styles.headerActions}><Link className={styles.loginLink} href="/login">Entrar</Link><Link className={styles.smallCta} href="/register">Começar grátis <ArrowRight size={16} /></Link></div></div></header>
      <section className={styles.hero}><div className={styles.heroGrid}><div className={styles.heroCopy}><div className={styles.eyebrow}><Sparkles size={15} /> RECURSOS DO PILA</div><h1>Tudo que você precisa para organizar seu dinheiro.</h1><p>Do lançamento pelo WhatsApp à análise no dashboard, o Pila reúne ferramentas para simplificar sua rotina financeira.</p><div className={styles.heroActions}><Link className={styles.primaryCta} href="/register">Testar grátis por 7 dias <ArrowRight size={19} /></Link><Link className={styles.secondaryCta} href="/how-it-works">Ver como funciona</Link></div></div></div></section>
      <section className={`${styles.section} ${styles.featuresSection}`}><div className={styles.sectionHeading}><span>UMA CONTA, TODA A SUA ROTINA</span><h2>Recursos que trabalham juntos.</h2><p>Registre de onde estiver e acompanhe tudo organizado no mesmo painel.</p></div><div className={styles.featureGrid}>{resources.map(([Icon, title, text]) => <article className={styles.featureCard} key={title}><div className={styles.featureIcon}><Icon size={22} /></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className={styles.finalCta}><div><span>Menos planilhas. Mais clareza.</span><h2>Experimente todos os recursos por 7 dias.</h2></div><Link className={styles.lightCta} href="/register">Começar grátis <ArrowRight size={19} /></Link></section>
      <footer className={styles.footer}><Link className={styles.brand} href="/"><Image src="/logo-icon.png" alt="" width={34} height={34} /><span>Pila</span></Link><p>Organização financeira simples, todos os dias.</p><div><Link href="/how-it-works">Como funciona</Link><Link href="/security">Segurança</Link><Link href="/privacy">Privacidade</Link><Link href="/terms">Termos</Link></div></footer>
    </main>
  );
}
