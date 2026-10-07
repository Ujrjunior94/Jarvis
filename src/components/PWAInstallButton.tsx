import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowModal(true);
          }
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
        title="Instalar aplicativo JARVIS no celular ou computador"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-semibold text-white">Instalar JARVIS (PWA)</h3>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              O JARVIS possui manifesto PWA completo e Service Worker ativo para uso como aplicativo nativo no seu celular Android, iOS ou Desktop:
            </p>
            <div className="mt-4 space-y-2.5 text-xs text-slate-300 border-t border-b border-slate-800 py-3">
              {isIOS ? (
                <>
                  <p>1. Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.</p>
                  <p>2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</p>
                </>
              ) : (
                <>
                  <p>1. No Chrome (Android ou Desktop), abra o menu do navegador (três pontos no canto superior) ou abra em nova guia.</p>
                  <p>2. Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</p>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
