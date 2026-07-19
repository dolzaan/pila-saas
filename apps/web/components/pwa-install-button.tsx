"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import type { BeforeInstallPromptEvent } from "./service-worker-register";

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(() =>
      typeof window === "undefined" ? null : window.pilaInstallPrompt || null,
    );

  useEffect(() => {
    function handleInstallAvailable() {
      setInstallPrompt(window.pilaInstallPrompt || null);
    }

    function handleInstalled() {
      setInstallPrompt(null);
    }

    window.addEventListener("pila:install-available", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("pila:install-available", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!installPrompt) return null;

  async function install() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice;
    window.pilaInstallPrompt = undefined;
    setInstallPrompt(null);
  }

  return (
    <button
      type="button"
      className="mobile-more-link"
      onClick={() => void install()}
    >
      <Download className="h-5 w-5" aria-hidden="true" />
      <span>
        <strong>Instalar o Pila</strong>
        <small>Adicionar à tela inicial</small>
      </span>
    </button>
  );
}
