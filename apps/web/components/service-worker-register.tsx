"use client";

import { useEffect } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

declare global {
  interface Window {
    pilaInstallPrompt?: BeforeInstallPromptEvent;
  }
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    function captureInstallPrompt(event: Event) {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      window.pilaInstallPrompt = promptEvent;
      window.dispatchEvent(new Event("pila:install-available"));
    }

    function clearInstallPrompt() {
      window.pilaInstallPrompt = undefined;
    }

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);

    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return () => {
        window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
        window.removeEventListener("appinstalled", clearInstallPrompt);
      };
    }

    function register() {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // A aplicação continua funcionando normalmente se o navegador bloquear PWAs.
      });
    }

    let listeningForLoad = false;
    if (document.readyState === "complete") {
      register();
    } else {
      listeningForLoad = true;
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      if (listeningForLoad) window.removeEventListener("load", register);
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);

  return null;
}
