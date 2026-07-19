"use client";

import { useState, useEffect } from "react";
import { generateWhatsappLinkCode, unlinkWhatsapp } from "@/app/actions/whatsapp";
import { Smartphone, Lock } from "lucide-react";

type Props = {
  initialWhatsappNumber: string | null;
  initialPin: string | null;
  expiresAt: Date | null;
};

export default function WhatsappClient({ 
  initialWhatsappNumber, 
  initialPin, 
  expiresAt
}: Props) {
  const [pin, setPin] = useState<string | null>(initialPin);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (pin && expiresAt) {
      const interval = setInterval(() => {
        const diff = new Date(expiresAt).getTime() - new Date().getTime();
        if (diff <= 0) {
          setPin(null);
          setTimeLeft(0);
          clearInterval(interval);
        } else {
          setTimeLeft(Math.floor(diff / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [pin, expiresAt]);

  async function handleGeneratePin() {
    setIsGenerating(true);
    const result = await generateWhatsappLinkCode();
    if (result.success && result.code) {
      setPin(result.code);
      setTimeLeft(600); // 10 min
    } else {
      alert(result.error);
    }
    setIsGenerating(false);
  }

  async function handleUnlink() {
    if (!confirm("Tem certeza que deseja desvincular seu WhatsApp?")) return;
    const result = await unlinkWhatsapp();
    if (result.error) alert(result.error);
  }

  if (initialWhatsappNumber) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 space-y-6">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-emerald-400 mb-2">WhatsApp Conectado!</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Sua conta está vinculada ao número <strong className="text-white">{initialWhatsappNumber}</strong>. 
            Você já pode enviar mensagens para o bot para registrar transações.
          </p>
        </div>
        
        <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800 text-sm text-left max-w-md w-full">
          <h3 className="font-semibold text-gray-300 mb-2">Exemplos do que você pode mandar:</h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-400">
            <li>&quot;Gastei 45 no ifood&quot;</li>
            <li>&quot;Recebi 5000 de salário&quot;</li>
            <li>&quot;300 reais de gasolina&quot;</li>
          </ul>
        </div>

        <button 
          onClick={handleUnlink}
          className="mt-4 app-button app-button--danger"
        >
          Desvincular Número
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-10">
      <div className="flex-1 space-y-6">
        <h2 className="text-2xl font-semibold text-white">Como vincular?</h2>
        
        <div className="space-y-4 text-gray-400">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">1</div>
            <p>Gere um código de vínculo (PIN) clicando no botão abaixo.</p>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">2</div>
            <p>Salve o número do nosso Bot no seu WhatsApp.</p>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">3</div>
            <p>Envie o PIN gerado para o Bot. Ele irá reconhecer e vincular sua conta automaticamente!</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-900/50 rounded-2xl border border-gray-800 p-8 flex flex-col items-center justify-center text-center">
        {pin ? (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <p className="text-sm text-gray-400">Envie este código no WhatsApp:</p>
            <div className="text-5xl font-mono font-bold text-emerald-400 tracking-[0.2em] px-6 py-4 bg-black/40 rounded-xl border border-gray-800/60 shadow-inner">
              {pin}
            </div>
            <p className="text-xs text-gray-500">
              Expira em: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-gray-800 rounded-full mx-auto flex items-center justify-center">
              <Lock className="w-8 h-8 text-gray-500" />
            </div>
            <button 
              onClick={handleGeneratePin}
              disabled={isGenerating}
              className="app-button app-button--primary"
            >
              {isGenerating ? "Gerando..." : "Gerar PIN de Vínculo"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
