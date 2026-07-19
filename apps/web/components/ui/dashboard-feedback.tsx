"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type FeedbackContextValue = {
  notify: (message: string, type?: ToastType) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function DashboardFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++nextId.current;
      setToasts((current) => [...current, { id, message, type }]);

      const timer = window.setTimeout(() => dismiss(id), 5000);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return (
    <FeedbackContext.Provider value={{ notify }}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon =
            toast.type === "success"
              ? CheckCircle2
              : toast.type === "error"
                ? AlertCircle
                : Info;

          return (
            <div
              key={toast.id}
              className={`app-toast app-toast--${toast.type}`}
              role={toast.type === "error" ? "alert" : "status"}
            >
              <Icon className="app-toast-icon" aria-hidden="true" />
              <span>{toast.message}</span>
              <button
                type="button"
                className="app-toast-close"
                aria-label="Fechar notificação"
                onClick={() => dismiss(toast.id)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useDashboardFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error(
      "useDashboardFeedback deve ser usado dentro de DashboardFeedbackProvider"
    );
  }

  return context;
}
