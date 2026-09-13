import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { MilitaryInsignia } from './MilitaryInsignia';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Users,
  Coins,
  CalendarDays,
  Eye,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
  onGuestAccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onGuestAccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('O processo de login foi cancelado pelo usuário.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Requisição de login cancelada. Tente novamente.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage('Falha de conexão com a rede. Verifique seu acesso à internet.');
      } else {
        setErrorMessage(err.message || 'Falha ao autenticar com a Conta Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-100 selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Top institutional strip */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xs py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MilitaryInsignia className="w-9 h-9" />
            <div>
              <span className="text-xs font-bold tracking-widest text-[#D4AF37] uppercase font-mono">
                EXÉRCITO BRASILEIRO
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                Núcleo de Preparação de Oficiais da Reserva • NPOR
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-800/40 px-3 py-1 border border-slate-700/60 rounded-xs">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Ambiente Autenticado e Seguro</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Column: Institutional context & roles */}
          <div className="md:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4B5320]/30 border border-[#4B5320]/80 rounded-full text-xs font-semibold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sincronização Cloud Firestore em Tempo Real
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-institutional">
                PORTAL DO GRÊMIO DO NPOR
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Plataforma oficial multiusuário de governança orçamentária, fiscalização contábil, gestão de eventos e prestação de contas da Turma de Oficiais da Reserva.
              </p>
            </div>

            {/* Profiles overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-sm">
                <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  Administrador
                </div>
                <p className="text-[11px] text-slate-400">
                  Acesso total ao sistema, parametrização, gestão de usuários e auditoria contábil.
                </p>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-sm">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <Coins className="w-4 h-4" />
                  Tesouraria
                </div>
                <p className="text-[11px] text-slate-400">
                  Lançamentos financeiros, conciliação de comprovantes, planilhas e classificação contábil.
                </p>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-sm">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <CalendarDays className="w-4 h-4" />
                  Eventos
                </div>
                <p className="text-[11px] text-slate-400">
                  Planejamento de confraternizações, cronogramas de formatura e acompanhamento de metas.
                </p>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-sm">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider mb-1">
                  <Eye className="w-4 h-4" />
                  Visualizador
                </div>
                <p className="text-[11px] text-slate-400">
                  Transparência irrestrita e consulta em modo somente-leitura para todos os oficiais e alunos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
              <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Conexão direta ao Google Drive com reconciliação documental automática.</span>
            </div>
          </div>

          {/* Right Column: Google Login Box */}
          <div className="md:col-span-5">
            <div className="bg-slate-800 border border-slate-700 rounded-sm shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#4B5320]/20 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-2 text-center">
                <div className="flex justify-center mb-1">
                  <MilitaryInsignia className="w-16 h-16 drop-shadow-md" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-wide font-institutional">
                  Acesso Restrito
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para visualizar os dados do Grêmio ou realizar lançamentos, autentique-se com sua conta Google autorizada.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/70 border border-red-700/70 rounded-xs flex items-start gap-2.5 text-xs text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">{errorMessage}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  id="btn-google-login"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm rounded-sm shadow-md transition-all flex items-center justify-center gap-3 border border-slate-200 disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  )}
                  <span>{loading ? 'Autenticando sessão...' : 'Entrar com Conta Google'}</span>
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Ao autenticar, seus privilégios de acesso serão configurados conforme sua atribuição no Grêmio.
                </p>

                {onGuestAccess && (
                  <div className="pt-2 space-y-2">
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-slate-700"></div>
                      <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                        modo público
                      </span>
                      <div className="flex-grow border-t border-slate-700"></div>
                    </div>

                    <button
                      id="btn-guest-access"
                      type="button"
                      onClick={onGuestAccess}
                      className="w-full py-2.5 px-4 bg-slate-850 hover:bg-slate-700/80 text-slate-200 hover:text-white font-medium text-xs rounded-sm transition-all flex items-center justify-center gap-2 border border-slate-650 hover:border-[#D4AF37]/70 cursor-pointer shadow-xs"
                    >
                      <Eye className="w-4 h-4 text-[#D4AF37]" />
                      <span>Acessar como Convidado / Consulta Pública</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Criptografia ponta a ponta via Google Cloud</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Trilha de auditoria em conformidade com a LGPD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-3 px-6 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Portal Oficial do Grêmio NPOR • Segurança e Transparência Militar</span>
          <span className="font-mono text-[11px] text-slate-400">Ambiente de Produção Cloud Firestore</span>
        </div>
      </footer>
    </div>
  );
};
