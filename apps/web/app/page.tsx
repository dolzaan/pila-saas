import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  Camera,
  Check,
  MessageCircle,
  Mic,
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
    "Converse com uma IA financeira pelo WhatsApp. Envie texto, áudio ou foto para registrar gastos, consultar relatórios e organizar seu dinheiro.",
};

const benefits = [
  {
    icon: MessageCircle,
    title: "Converse, não preencha",
    text: "Fale com a IA pelo WhatsApp como você já fala com qualquer pessoa. Ela entende e organiza para você.",
  },
  {
    icon: BarChart3,
    title: "Enxergue para onde vai",
    text: "Tenha saldos, categorias e evolução do mês reunidos em um dashboard simples.",
  },
  {
    icon: Sparkles,
    title: "IA que entende o contexto",
    text: "Texto, áudio, foto de comprovante e perguntas naturais viram registros, categorias e respostas úteis.",
  },
  {
    icon: Target,
    title: "Metas que saem do papel",
    text: "Defina objetivos, acompanhe o progresso e saiba quanto falta para chegar lá.",
  },
  {
    icon: Bell,
    title: "Contas sob controle",
    text: "Cadastre despesas recorrentes e receba lembretes antes de perder o prazo.",
  },
  {
    icon: PieChart,
    title: "Relatórios que fazem sentido",
    text: "Compare períodos e descubra padrões para tomar decisões melhores com o seu dinheiro.",
  },
];

const steps = [
  ["01", "Crie sua conta", "Leva menos de dois minutos e você não precisa informar cartão."],
  ["02", "Conecte o WhatsApp", "Vincule seu número e comece a registrar receitas e despesas por mensagem."],
  ["03", "Acompanhe e decida", "Veja tudo no dashboard e use seus dados para planejar o próximo passo."],
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
            <a href="#ia">IA do Pila</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#preco">Preço</a>
            <a href="#duvidas">Dúvidas</a>
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
            <h1>Sua IA financeira. No WhatsApp, do jeito que você já conversa.</h1>
            <p>
              Envie texto, áudio ou foto. A IA do Pila registra movimentações, responde perguntas e transforma sua rotina em relatórios claros — sem planilhas e sem complicação.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryCta} href="/register">
                Testar grátis por 7 dias <ArrowRight size={19} />
              </Link>
              <a className={styles.secondaryCta} href="#como-funciona">Ver como funciona</a>
            </div>
            <div className={styles.heroNotes}>
              <span><Check size={15} /> Sem cartão</span>
              <span><Check size={15} /> IA disponível 24 horas</span>
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
        <span><MessageCircle size={18} /> Converse pelo WhatsApp</span>
        <span><BrainCircuit size={18} /> IA que entende texto, áudio e imagem</span>
        <span><ShieldCheck size={18} /> Seus dados sob seu controle</span>
      </section>

      <section className={styles.aiSection} id="ia">
        <div className={styles.aiSectionHeading}>
          <span>O PILA ENTENDE VOCÊ</span>
          <h2>Uma conversa vira organização financeira.</h2>
          <p>Não adapte sua rotina a mais um aplicativo. A IA interpreta o que você envia e mantém tudo organizado enquanto você segue o seu dia.</p>
        </div>
        <div className={styles.aiCapabilities}>
          <article>
            <div><MessageCircle size={21} /></div>
            <span>01</span>
            <h3>Escreva naturalmente</h3>
            <p>“Gastei 42 no mercado” já é suficiente para a IA registrar e categorizar.</p>
          </article>
          <article>
            <div><Mic size={21} /></div>
            <span>02</span>
            <h3>Mande um áudio</h3>
            <p>Conte seus gastos por voz. A IA entende a mensagem e transforma em informação organizada.</p>
          </article>
          <article>
            <div><Camera size={21} /></div>
            <span>03</span>
            <h3>Fotografe o comprovante</h3>
            <p>Envie a imagem pelo WhatsApp para a IA identificar os dados importantes da compra.</p>
          </article>
          <article>
            <div><BrainCircuit size={21} /></div>
            <span>04</span>
            <h3>Pergunte e receba clareza</h3>
            <p>Peça resumos, gráficos e comparações em uma conversa, usando seus dados reais.</p>
          </article>
        </div>
        <div className={styles.aiPrompt}>
          <Sparkles size={18} />
          <div><strong>Experimente agora</strong><span>Abra o chat no canto da tela e converse com a IA do Pila sem sair da página.</span></div>
        </div>
      </section>

      <section className={styles.section} id="como-funciona">
        <div className={styles.sectionHeading}>
          <span>COMECE SEM COMPLICAÇÃO</span>
          <h2>Três passos para entender melhor seu dinheiro</h2>
          <p>O Pila cuida da parte chata da organização. Você fica com a clareza.</p>
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
          <span>TUDO NO LUGAR CERTO</span>
          <h2>Menos tempo controlando. Mais confiança para decidir.</h2>
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
      </section>

      <section className={styles.claritySection}>
        <div className={styles.clarityCopy}>
          <span>CLAREZA TODOS OS DIAS</span>
          <h2>O panorama que faltava para o seu mês.</h2>
          <p>Veja seus números importantes sem procurar em várias telas. O Pila transforma seus registros em uma visão prática da sua vida financeira.</p>
          <ul>
            <li><Check size={18} /> Receitas e despesas atualizadas</li>
            <li><Check size={18} /> Orçamentos por categoria</li>
            <li><Check size={18} /> Metas e despesas recorrentes</li>
          </ul>
        </div>
        <div className={styles.dashboardMock}>
          <div className={styles.mockTop}><i /><i /><i /><span>Visão geral</span></div>
          <div className={styles.mockStats}>
            <div><small>Receitas</small><strong>R$ 5.800</strong><span className={styles.positive}>+12%</span></div>
            <div><small>Despesas</small><strong>R$ 2.952</strong><span>51% da renda</span></div>
          </div>
          <div className={styles.mockChart}>
            <div><small>Fluxo do mês</small><strong>R$ 2.848 livres</strong></div>
            <div className={styles.bars}>
              {[48, 66, 52, 82, 71, 92, 78].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
          </div>
          <div className={styles.mockCategories}>
            <div><span><i className={styles.dotGreen} /> Moradia</span><strong>R$ 1.200</strong></div>
            <div><span><i className={styles.dotPurple} /> Alimentação</span><strong>R$ 684</strong></div>
            <div><span><i className={styles.dotBlue} /> Transporte</span><strong>R$ 392</strong></div>
          </div>
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
            {[
              "Registro financeiro pelo WhatsApp",
              "Dashboard completo",
              "Metas e orçamentos",
              "Despesas recorrentes e lembretes",
              "Relatórios e categorias inteligentes",
              "Cancele quando quiser",
            ].map((item) => <span key={item}><Check size={17} /> {item}</span>)}
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
          <details><summary>Preciso colocar cartão para testar?</summary><p>Não. Você cria a conta e usa todos os recursos do Pila Pro por 7 dias sem informar cartão.</p></details>
          <details><summary>O que acontece quando o teste termina?</summary><p>Você verá a opção para assinar o Pila Pro. O acesso aos recursos pagos é liberado assim que o pagamento for confirmado.</p></details>
          <details><summary>Preciso instalar algum aplicativo?</summary><p>Não. Você usa o WhatsApp para registrar movimentações e acessa o dashboard do Pila pelo navegador.</p></details>
          <details><summary>Posso cancelar a assinatura?</summary><p>Sim. A assinatura pode ser gerenciada pelo portal seguro da Stripe e você pode cancelar quando quiser.</p></details>
          <details><summary>Meus dados ficam presos no Pila?</summary><p>Não. Nas configurações, você pode exportar seus dados ou solicitar a exclusão da conta.</p></details>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div><span>Seu próximo mês pode ser mais claro.</span><h2>Comece a organizar seu dinheiro hoje.</h2></div>
        <Link className={styles.lightCta} href="/register">Testar o Pila grátis <ArrowRight size={19} /></Link>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.brand} href="/"><Image src="/logo-icon.png" alt="" width={34} height={34} /><span>Pila</span></Link>
        <p>Organização financeira simples, todos os dias.</p>
        <div><Link href="/privacy">Privacidade</Link><Link href="/terms">Termos</Link><Link href="/login">Entrar</Link></div>
      </footer>

      <LandingMotion />
    </main>
  );
}
