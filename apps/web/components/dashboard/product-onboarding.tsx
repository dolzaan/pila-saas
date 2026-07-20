"use client";

import {
  finishOnboarding,
  skipOnboarding,
  updateOnboardingStep,
} from "@/app/actions/onboarding";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const TOTAL_STEPS = 4;

type ProductOnboardingProps = {
  userName?: string | null;
  initialStep: number;
  shouldAutoOpen: boolean;
  isFirstRun: boolean;
  hasTransaction: boolean;
  hasFinancialAccount: boolean;
  whatsappLinked: boolean;
};

function safeStep(step: number) {
  return Math.max(0, Math.min(TOTAL_STEPS - 1, Math.trunc(step || 0)));
}

export function ProductOnboarding({
  userName,
  initialStep,
  shouldAutoOpen,
  isFirstRun,
  hasTransaction,
  hasFinancialAccount,
  whatsappLinked,
}: ProductOnboardingProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestKey = searchParams.get("onboarding") || searchParams.get("guide");
  const requestedStep =
    requestKey === "transaction-created" ? 3 : requestKey === "1" ? 0 : null;

  const [currentStep, setCurrentStep] = useState(() =>
    requestedStep ?? safeStep(initialStep),
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [autoDismissed, setAutoDismissed] = useState(false);
  const [closedRequest, setClosedRequest] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasOpenRequest = Boolean(requestKey && requestKey !== closedRequest);
  const isOpen = !autoDismissed && (manualOpen || shouldAutoOpen || hasOpenRequest);
  const step = requestedStep ?? currentStep;
  const firstName = userName?.split(" ")[0] || "por aí";

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setManualOpen(false);
        setAutoDismissed(true);
        setClosedRequest(requestKey);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, requestKey]);

  function clearRequest() {
    if (requestKey) {
      setClosedRequest(requestKey);
      router.replace(pathname);
    }
  }

  function closeLocally() {
    setManualOpen(false);
    setAutoDismissed(true);
    clearRequest();
  }

  function persistStep(nextStep: number) {
    setError("");
    const normalizedStep = safeStep(nextStep);
    setCurrentStep(normalizedStep);
    clearRequest();
    startTransition(async () => {
      const result = await updateOnboardingStep(normalizedStep);
      if (result.error) setError(result.error);
    });
  }

  function handleNext() {
    persistStep(step + 1);
  }

  function handleBack() {
    persistStep(step - 1);
  }

  function handleFirstTransaction() {
    if (hasTransaction) {
      persistStep(3);
      return;
    }

    startTransition(async () => {
      await updateOnboardingStep(2);
      router.push("/dashboard/transactions?new=1&onboarding=1");
    });
  }

  function handleSkip() {
    setError("");
    if (!isFirstRun) {
      closeLocally();
      return;
    }

    startTransition(async () => {
      const result = await skipOnboarding();
      if (result.error) {
        setError(result.error);
        return;
      }
      closeLocally();
      router.refresh();
    });
  }

  function handleFinish() {
    setError("");
    startTransition(async () => {
      const result = await finishOnboarding();
      if (result.error) {
        setError(result.error);
        return;
      }
      closeLocally();
      router.refresh();
    });
  }

  function reopenGuide() {
    setCurrentStep(0);
    setAutoDismissed(false);
    setManualOpen(true);
    setError("");
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={reopenGuide}
          className="fixed right-14 top-[calc(.7rem+env(safe-area-inset-top))] z-[65] grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-[#111827] text-slate-400 shadow-lg md:hidden"
          aria-label="Abrir guia do Pila"
          title="Guia do Pila"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-md"
            onClick={handleSkip}
            aria-label="Fechar guia"
            tabIndex={-1}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pila-onboarding-title"
            className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#101726] shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                    Primeiros passos
                  </span>
                  <p className="text-xs text-slate-500">
                    Etapa {step + 1} de {TOTAL_STEPS}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSkip}
                disabled={isPending}
                className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-50"
                aria-label="Pular tutorial"
                title="Pular tutorial"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="overflow-y-auto px-5 py-6 sm:px-7 sm:py-8">
              {step === 0 && (
                <div className="text-center">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-400 text-emerald-950 shadow-[0_18px_50px_rgba(52,211,153,.22)]">
                    <PartyPopper className="h-9 w-9" />
                  </div>
                  <span className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
                    Bem-vindo ao Pila
                  </span>
                  <h2
                    id="pila-onboarding-title"
                    className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                  >
                    Vamos deixar seu dinheiro mais claro, {firstName}.
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                    Em poucos minutos você vai entender o painel, registrar sua primeira movimentação e descobrir como organizar tudo sem complicação.
                  </p>
                  <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
                    {[
                      [LayoutDashboard, "Acompanhe", "Veja saldo, receitas e gastos."],
                      [CreditCard, "Registre", "Adicione despesas e receitas."],
                      [MessageCircle, "Automatize", "Use o WhatsApp quando preferir."],
                    ].map(([Icon, title, description]) => {
                      const StepIcon = Icon as typeof LayoutDashboard;
                      return (
                        <div key={String(title)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <StepIcon className="h-5 w-5 text-emerald-300" />
                          <strong className="mt-3 block text-sm text-slate-100">{String(title)}</strong>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{String(description)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <div className="flex items-start gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-400/10 text-indigo-300">
                      <LayoutDashboard className="h-7 w-7" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-300">
                        Seu painel
                      </span>
                      <h2 id="pila-onboarding-title" className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                        Tudo importante aparece primeiro.
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        O Dashboard mostra seu saldo do mês, quanto entrou, quanto saiu e onde você mais gastou. Conforme novas transações forem registradas, os cartões e gráficos são atualizados automaticamente.
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {[
                      [WalletCards, "Contas e cartões", "Separe banco, dinheiro, poupança e cartão de crédito."],
                      [ShieldCheck, "Seus dados, suas regras", "Você escolhe o que cadastrar e pode exportar ou excluir seus dados."],
                    ].map(([Icon, title, description]) => {
                      const StepIcon = Icon as typeof WalletCards;
                      return (
                        <div key={String(title)} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <StepIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                          <div>
                            <strong className="text-sm text-slate-100">{String(title)}</strong>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{String(description)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="flex items-start gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-400/10 text-rose-300">
                      <CreditCard className="h-7 w-7" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-rose-300">
                        Hora de praticar
                      </span>
                      <h2 id="pila-onboarding-title" className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                        Registre sua primeira transação.
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        Pode ser algo simples, como um café, mercado ou salário. Informe o valor, escolha se é despesa ou receita e adicione uma descrição para lembrar depois.
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Exemplo</p>
                    <p className="mt-2 text-lg font-semibold text-white">Despesa · R$ 25,00 · Almoço</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Categoria e conta são opcionais no começo. Você pode organizar melhor depois.
                    </p>
                  </div>

                  {hasTransaction && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                      <CheckCircle2 className="h-5 w-5" />
                      Você já possui uma transação registrada.
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="text-center">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <span className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
                    Tudo pronto
                  </span>
                  <h2 id="pila-onboarding-title" className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                    Você já sabe o essencial.
                  </h2>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
                    Continue no seu ritmo. Os próximos passos são opcionais e ajudam a deixar os relatórios ainda mais completos.
                  </p>

                  <div className="mx-auto mt-7 max-w-lg space-y-3 text-left">
                    {[
                      [hasTransaction, "Primeira transação", "Seu painel já pode começar a mostrar resultados."],
                      [hasFinancialAccount, "Conta ou cartão", "Ajuda a acompanhar saldos, faturas e conciliação."],
                      [whatsappLinked, "WhatsApp vinculado", "Permite registrar movimentações conversando com o Pila."],
                    ].map(([done, title, description]) => (
                      <div key={String(title)} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${done ? "bg-emerald-400 text-emerald-950" : "bg-white/5 text-slate-600"}`}>
                          {done ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                        </span>
                        <div>
                          <strong className="text-sm text-slate-100">{String(title)}</strong>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{String(description)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}
            </div>

            <footer className="border-t border-white/10 bg-black/10 px-5 py-4 sm:px-7">
              <div className="mb-4 flex items-center gap-2" aria-label={`Etapa ${step + 1} de ${TOTAL_STEPS}`}>
                {Array.from({ length: TOTAL_STEPS }, (_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${index <= step ? "bg-emerald-400" : "bg-white/10"}`}
                  />
                ))}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isPending}
                  className="text-sm font-medium text-slate-500 hover:text-slate-300 disabled:opacity-50"
                >
                  {isFirstRun ? "Pular por enquanto" : "Fechar guia"}
                </button>

                <div className="flex gap-2">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={isPending}
                      className="app-button app-button--secondary"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>
                  )}

                  {step === 2 ? (
                    <button
                      type="button"
                      onClick={handleFirstTransaction}
                      disabled={isPending}
                      className="app-button app-button--primary"
                    >
                      {hasTransaction ? "Continuar" : "Criar primeira transação"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : step === 3 ? (
                    <button
                      type="button"
                      onClick={handleFinish}
                      disabled={isPending}
                      className="app-button app-button--primary"
                    >
                      {isPending ? "Finalizando..." : "Começar a usar o Pila"}
                      <Check className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={isPending}
                      className="app-button app-button--primary"
                    >
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
