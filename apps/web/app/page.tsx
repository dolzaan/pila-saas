import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  Check,
  MessageCircle,
  PieChart,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { LandingMotion } from "@/components/landing/landing-motion";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Pila — Sua IA financeira no WhatsApp",
  description:
    "Registre gastos por texto, áudio ou foto, acompanhe seus números e organize sua vida financeira com o Pila.",
};

const benefits = [
  {
    icon: MessageCircle,
    title: "Registre sem preencher planilhas",
    text: "Envie uma mensagem pelo WhatsApp e deixe o Pila organizar a movimentação para você.",
  },
  {
    icon: BrainCircuit,
    title: "IA que entende sua rotina",
    text: "Texto, áudio e foto de comprovante viram registros, categorias e respostas úteis.",
  },
  {
    icon: BarChart3,
    title: "Veja tudo com clareza",
    text: "Acompanhe saldos, categorias, metas e evolução do mês em um painel simples.",
  },
  {
    icon: Bell,
    title: "Não esqueça suas contas",
    text: "Organize despesas recorrentes e receba lembretes antes do vencimento.",
  },
  {
    icon: Target,
    title: "Acompanhe suas metas",
    text: "Defina objetivos e saiba quanto falta para chegar onde você quer.",
  },
  {
    icon: PieChart,
    title: "Tome decisões melhores",
    text: "Use relatórios e comparações para entender seus hábitos financeiros.",
  },
];

const steps = [
  ["01", "Crie sua conta", "Comece em poucos minutos e sem informar cartão."],
  ["02", "Conecte seu WhatsApp", "Registre gastos, receitas e dúvidas em uma conversa natural."],
  ["03", "Acompanhe no painel", "Veja seus dados organizados e planeje seus próximos passos."],
];

export default function LandingPage() {
  return (
    <main className={styles.page} data-landing-root>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="Pila — início">
            <Image src="/logo-icon.png" alt="" width={40} height={40} priority />
            <span>Pila</span>
          </Link>
          <nav className={styles.nav} aria-label="Navegação principal">
            <Link href="/features">Recursos</Link>
            <Link href="/how-it-works">Como funciona</Link>
            <Link href="/security">Segurança</Link>
            <a href="#preco">Preço</a>
          </nav>
          <div className={styles.headerActions}>
            <Link className={styles.loginLink} href="/login">Entrar</Link>
            <Link className={styles.smallCta} href="/register">
              Começar grátis <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <Sparkles size={15} /> IA FINANCEIRA DIRETO NO WHATSAPP
            </div>
            <h1>Organize seu dinheiro em uma conversa.</h1>
            <p>
              Envie texto, áudio ou foto. O Pila registra suas movimentações, organiza seus dados e mostra com clareza para onde seu dinheiro está indo.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryCta} href="/register">
                Testar grátis por 7 dias <ArrowRight size={19} />
              </Link>
              <Link className={styles.secondaryCta} href="/how-it-works">Ver como funciona</Link>
            </div>
            <div className={styles.heroNotes}>
              <span><Check size={15} /> Sem cartão</span>
              <span><Check size={15} /> Configuração rápida</span>
              <span><Check size={15} /> Cancele quando quiser</span>
            </div>
          </div>

          <div className={styles.heroVisual} aria-label="Exemplo de uso do Pila pelo WhatsApp">
            <div className={`${styles.floatCard} ${styles.balanceCard}`}>
              <span>Saldo do mês</span>
              <strong>R$ 2.847,10</strong>
              <small>+8,4% em relação ao mês passado</small>
            </div>
            <div className={styles.phone}>
              <div className={styles.phoneTop}>
                <div className={styles.avatar}><Wallet size={20} /></div>
                <div><strong>Pila</strong><span>online</span></div>
              </div>
              <div className={styles.chat}>
                <div className={styles.userMessage}>Gastei R$ 42,90 no mercado</div>
                <div className={styles.botMessage}>
                  <span className={styles.botLabel}>PILA</span>
                  Anotado! <strong>R$ 42,90</strong> em Alimentação.
                  <small>Seu orçamento da categoria está em 68%.</small>
                </div>
                <div className={styles.userMessage}>Como estão meus gastos este mês?</div>
                <div className={styles.botMessage}>
                  Você gastou <strong>R$ 1.486,70</strong> até agora. Moradia e alimentação são as maiores categorias.
                </div>
              </div>
              <div className={styles.messageInput}><span>Mensagem</span><ArrowRight size={18} /></div>
            </div>
            <div className={`${styles.floatCard} ${styles.budgetCard}`}>
              <div className={styles.floatTitle}><Target size={17} /> Meta: reserva</div>
              <strong>R$ 6.400</strong><span> de R$ 10.000</span>
              <div className={styles.progress}><i /></div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.proofStrip} aria-label="Benefícios resumidos">
        <span><MessageCircle size={18} /> Registre pelo WhatsApp</span>
        <span><BrainCircuit size={18} /> IA para texto, áudio e imagem</span>
        <span><ShieldCheck size={18} /> Controle sobre seus dados</span>
      </section>

      <section className={styles.section} id="como-funciona">
        <div className={styles.sectionHeading}>
          <span>SIMPLES DESDE O PRIMEIRO DIA</span>
          <h2>Três passos para entender melhor seu dinheiro</h2>
          <p>O Pila cuida da organização para você focar nas decisões.</p>
        </div>
        <div className={styles.steps}>
          {steps.map(([number, title, text]) => (
            <article className={styles.step} key={number}>
              <span className={styles.stepNumber}>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.featuresSection}`} id="recursos">
        <div className={styles.sectionHeading}>
          <span>O ESSENCIAL PARA SUA ROTINA</span>
          <h2>Menos esforço para registrar. Mais clareza para decidir.</h2>
        </div>
        <div className={styles.featureGrid}>
          {benefits.map(({ icon: Icon, title, text }) => (
            <article className={styles.featureCard} key={title}>
              <div className={styles.featureIcon}><Icon size={22} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className={styles.aiPrompt}>
          <Sparkles size={18} />
          <div><strong>Quer conhecer todos os recursos?</strong><span>Veja integrações, relatórios, metas, lembretes e outras possibilidades do Pila.</span></div>
          <Link className={`${styles.secondaryCta} w-fit`} href="/features">Ver todos os recursos <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className={styles.pricingSection} id="preco">
        <div className={styles.sectionHeading}>
          <span>UM PLANO, SEM LETRINHAS</span>
          <h2>Comece grátis. Continue porque fez sentido.</h2>
        </div>
        <div className={styles.priceCard}>
          <div className={styles.priceBadge}>7 DIAS GRÁTIS</div>
          <div className={styles.priceIntro}>
            <p>Pila Pro</p>
            <div className={styles.price}><sup>R$</sup><strong>19,90</strong><span>/mês</span></div>
            <small>Cobrança mensal após o período de teste.</small>
          </div>
          <div className={styles.priceFeatures}>
            {["Registros pelo WhatsApp e Telegram", "Dashboard completo", "Metas e orçamentos", "Lembretes e despesas recorrentes", "Relatórios inteligentes", "Cancele quando quiser"].map((item) => <span key={item}><Check size={17} /> {item}</span>)}
          </div>
          <Link className={styles.primaryCta} href="/register">Começar meu teste grátis <ArrowRight size={19} /></Link>
          <p className={styles.secureNote}><ShieldCheck size={16} /> Pagamento seguro processado pela Stripe</p>
        </div>
      </section>

      <section className={styles.faqSection} id="duvidas">
        <div className={styles.sectionHeading}>
          <span>DÚVIDAS FREQUENTES</span>
          <h2>Antes de começar</h2>
        </div>
        <div className={styles.faqList}>
          <details><summary>Preciso colocar cartão para testar?</summary><p>Não. Você pode usar o Pila Pro por 7 dias sem informar cartão.</p></details>
          <details><summary>Preciso instalar algum aplicativo?</summary><p>Não. Você usa o WhatsApp ou Telegram e acessa o painel pelo navegador.</p></details>
          <details><summary>Posso cancelar a assinatura?</summary><p>Sim. A assinatura pode ser cancelada quando você quiser.</p></details>
          <details><summary>Como meus dados são protegidos?</summary><p>Conheça os controles de privacidade, acesso e tratamento de dados na página de Segurança.</p></details>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div><span>Seu próximo mês pode ser mais claro.</span><h2>Comece a organizar seu dinheiro hoje.</h2></div>
        <Link className={styles.lightCta} href="/register">Testar o Pila grátis <ArrowRight size={19} /></Link>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.brand} href="/"><Image src="/logo-icon.png" alt="" width={34} height={34} /><span>Pila</span></Link>
        <p>Organização financeira simples, todos os dias.</p>
        <div>
          <Link href="/features">Recursos</Link>
          <Link href="/how-it-works">Como funciona</Link>
          <Link href="/security">Segurança</Link>
          <Link href="/privacy">Privacidade</Link>
          <Link href="/terms">Termos</Link>
          <Link href="/login">Entrar</Link>
        </div>
      </footer>

      <LandingMotion />
    </main>
  );
}
