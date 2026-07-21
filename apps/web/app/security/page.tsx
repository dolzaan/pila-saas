import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Database, EyeOff, KeyRound, ShieldCheck, UserCheck } from "lucide-react";
import styles from "../landing.module.css";

export const metadata: Metadata = {
  title: "Segurança e privacidade — Pila",
  description: "Conheça os controles usados pelo Pila para proteger acessos, integrações e dados financeiros.",
};

const points = [
  {
    icon: EyeOff,
    title: "Menos dados enviados à IA",
    text: "O Pila mascara identificadores sensíveis, como CPF, telefone, chave Pix e número de cartão, e envia somente o contexto necessário para interpretar cada pedido.",
  },
  {
    icon: Database,
    title: "Fila de mensagens criptografada",
    text: "Quando uma resposta do WhatsApp precisa aguardar uma nova tentativa, número e conteúdo ficam protegidos com AES-256-GCM. Mídias em base64 não são persistidas nessa fila.",
  },
  {
    icon: KeyRound,
    title: "Acessos e integrações protegidos",
    text: "Verificação de e-mail, códigos temporários de uso único, segredos nos webhooks e revogação de sessões ajudam a impedir acessos e conexões indevidas.",
  },
  {
    icon: UserCheck,
    title: "Você controla seus dados",
    text: "O texto bruto das mensagens não é salvo por padrão. Pela área de privacidade, você pode exportar seus dados ou solicitar a exclusão da conta.",
  },
];

export default function SecurityPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/"><Image src="/logo-icon.png" alt="" width={40} height={40} priority /><span>Pila</span></Link>
          <nav className={styles.nav} aria-label="Navegação principal">
            <Link href="/features">Recursos</Link><Link href="/how-it-works">Como funciona</Link><Link href="/security">Segurança</Link><Link href="/#preco">Preço</Link>
          </nav>
          <div className={styles.headerActions}><Link className={styles.loginLink} href="/login">Entrar</Link><Link className={styles.smallCta} href="/register">Começar grátis <ArrowRight size={16} /></Link></div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><ShieldCheck size={15} /> SEGURANÇA E PRIVACIDADE</div>
            <h1>Transparência para cuidar dos seus dados.</h1>
            <p>Dados financeiros exigem responsabilidade. Aqui você encontra os controles que o Pila realmente usa, sem promessas vagas ou termos difíceis.</p>
            <div className={styles.heroActions}><Link className={styles.primaryCta} href="/privacy">Ver Política de Privacidade <ArrowRight size={19} /></Link><Link className={styles.secondaryCta} href="/register">Começar grátis</Link></div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.featuresSection}`}>
        <div className={styles.sectionHeading}><span>PROTEÇÃO EM CADA ETAPA</span><h2>Controles aplicados do acesso ao tratamento das mensagens.</h2></div>
        <div className={styles.featureGrid}>
          {points.map(({ icon: Icon, title, text }) => <article className={styles.featureCard} key={title}><div className={styles.featureIcon}><Icon size={22} /></div><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionHeading}><span>DÚVIDAS SOBRE DADOS</span><h2>Privacidade de forma direta</h2></div>
        <div className={styles.faqList}>
          <details><summary>O Pila salva todas as mensagens?</summary><p>Não. O armazenamento do texto bruto das mensagens fica desativado por padrão.</p></details>
          <details><summary>Posso exportar meus dados?</summary><p>Sim. A área de privacidade oferece a opção de exportação dos dados da conta.</p></details>
          <details><summary>Posso excluir minha conta?</summary><p>Sim. Você pode solicitar a exclusão da conta e dos dados associados pelas configurações.</p></details>
          <details><summary>O que é enviado para a IA?</summary><p>Somente o contexto necessário para interpretar o pedido, com identificadores sensíveis mascarados quando aplicável.</p></details>
        </div>
      </section>

      <section className={styles.finalCta}><div><span>Organização com transparência.</span><h2>Conheça o Pila sem abrir mão do controle.</h2></div><Link className={styles.lightCta} href="/register">Testar grátis <ArrowRight size={19} /></Link></section>
      <footer className={styles.footer}><Link className={styles.brand} href="/"><Image src="/logo-icon.png" alt="" width={34} height={34} /><span>Pila</span></Link><p>Organização financeira simples, todos os dias.</p><div><Link href="/features">Recursos</Link><Link href="/how-it-works">Como funciona</Link><Link href="/privacy">Privacidade</Link><Link href="/terms">Termos</Link></div></footer>
    </main>
  );
}
