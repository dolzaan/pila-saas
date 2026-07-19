"use client";

import { useState, useEffect } from "react";
import { getWhatsAppStatus, connectWhatsApp, logoutWhatsApp } from "@/app/actions/admin-whatsapp";
import { RefreshCw, QrCode, PowerOff, Smartphone, Loader2 } from "lucide-react";

export default function WhatsappClient() {
  const [status, setStatus] = useState<string>("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Timer para o QR Code
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0) return;

    let cancelled = false;
    void logoutWhatsApp().then(() => {
      if (cancelled) return;
      setTimeLeft(null);
      setQrCode(null);
      setStatus("close");
    });

    return () => {
      cancelled = true;
    };
  }, [timeLeft]);

  const fetchStatus = async () => {
    setLoading(true);
    const res = await getWhatsAppStatus();
    setStatus(res.state);
    if (res.state === "open") {
      setQrCode(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialStatus = async () => {
      const res = await getWhatsAppStatus();
      if (cancelled) return;

      setStatus(res.state);
      if (res.state === "open") {
        setQrCode(null);
      }
    };

    void loadInitialStatus();

    // Poll status every 5 seconds if not open
    const interval = setInterval(() => {
      getWhatsAppStatus().then(res => {
        if (cancelled) return;
        setStatus(res.state);
        if (res.state === "open") {
          setQrCode(null);
          setTimeLeft(null);
        }
      });
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setQrCode(null);
    setTimeLeft(null);
    const res = await connectWhatsApp();
    if (res.success && res.qrcode) {
      setQrCode(res.qrcode);
      setStatus("qr_ready");
      setTimeLeft(40); // 40 segundos de limite
    } else if (!res.success) {
      alert(res.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;
    setLoading(true);
    const res = await logoutWhatsApp();
    if (res.success) {
      setStatus("close");
      setTimeLeft(null);
      setQrCode(null);
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-green-500" />
          Conexão do Bot
        </h2>
        
        <button 
          onClick={fetchStatus}
          disabled={loading}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700"
          title="Atualizar Status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
        
        {status === "loading" && (
          <div className="flex flex-col items-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Verificando conexão...</p>
          </div>
        )}

        {status === "open" && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <Smartphone className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">WhatsApp Conectado</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Seu bot está pronto para enviar mensagens automáticas.</p>
            <button 
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium transition-colors"
            >
              <PowerOff className="w-4 h-4" />
              Desconectar
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <PowerOff className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Erro de Conexão</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Não foi possível alcançar a Evolution API.</p>
          </div>
        )}

        {(status === "close" || status === "not_created") && !qrCode && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 text-gray-500 rounded-full flex items-center justify-center mb-4">
              <PowerOff className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">WhatsApp Desconectado</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">O bot não pode enviar mensagens no momento.</p>
            <button 
              onClick={handleConnect}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded shadow-sm hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              Gerar QR Code
            </button>
          </div>
        )}

        {(status === "connecting" || status === "qr_ready") && qrCode && (
          <div className="flex flex-col items-center text-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Escaneie o QR Code</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Abra o WhatsApp no seu celular e aponte para a tela.</p>
            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 mb-4">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
            </div>
            {timeLeft !== null ? (
              <p className="text-sm font-medium text-red-500 animate-pulse">Expira em: {timeLeft}s</p>
            ) : (
              <p className="text-xs text-gray-400 animate-pulse">Aguardando conexão...</p>
            )}
          </div>
        )}

        {status === "connecting" && !qrCode && (
          <div className="flex flex-col items-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="mb-4">Conectando...</p>
            <button 
              onClick={handleLogout}
              disabled={loading}
              className="text-sm px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium transition-colors"
            >
              Cancelar / Limpar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
