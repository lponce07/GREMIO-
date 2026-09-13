import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User, UserStatus } from '../types';
import { MilitaryInsignia } from './MilitaryInsignia';
import {
  Clock,
  ShieldAlert,
  ShieldX,
  LogOut,
  RefreshCw,
  Mail,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface PendingApprovalScreenProps {
  firebaseUser: FirebaseUser;
  userProfile?: User | null;
  onSignOut: () => Promise<void>;
  onRefreshProfile: () => Promise<void>;
}

export const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  firebaseUser,
  userProfile,
  onSignOut,
  onRefreshProfile,
}) => {
  const [checking, setChecking] = useState(false);
  const status: UserStatus = userProfile?.status || 'pending';

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await onRefreshProfile();
    } finally {
      setChecking(false);
    }
  };

  const isRejected = status === 'rejected';
  const isSuspended = status === 'suspended';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-100 selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 py-3 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
          <button
            id="btn-signout-pending"
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-sm bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/80 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-sm shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

          {/* Icon and Status Badge */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-1">
              <MilitaryInsignia className="w-16 h-16 drop-shadow-md" />
            </div>
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center border shadow-inner">
              {isRejected ? (
                <div className="w-full h-full rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400">
                  <ShieldX className="w-6 h-6" />
                </div>
              ) : isSuspended ? (
                <div className="w-full h-full rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-[#4B5320]/60 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span
                className={`inline-block px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full border ${
                  isRejected
                    ? 'bg-red-900/40 text-red-300 border-red-700'
                    : isSuspended
                    ? 'bg-amber-900/40 text-amber-300 border-amber-700'
                    : 'bg-[#4B5320]/50 text-emerald-300 border-[#D4AF37]/60'
                }`}
              >
                {isRejected
                  ? 'Acesso Rejeitado'
                  : isSuspended
                  ? 'Acesso Suspenso'
                  : 'Aguardando Aprovação'}
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-institutional pt-1">
                {isRejected
                  ? 'Acesso Não Autorizado'
                  : isSuspended
                  ? 'Conta Suspensa Temporariamente'
                  : 'Seu acesso está aguardando aprovação do administrador.'}
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isRejected
                ? 'Sua solicitação de acesso não foi autorizada pela Comissão do Grêmio do NPOR. Caso considere um equívoco, contate a administração.'
                : isSuspended
                ? 'Seu perfil foi colocado em suspensão administrativa. Entre em contato com a presidência ou tesouraria para regularização.'
                : 'Sua conta Google foi autenticada com sucesso no sistema. Um dos administradores do Grêmio irá validar sua identificação e atribuir suas permissões (Comissão ou Turma).'}
            </p>
          </div>

          {/* User Details Identification Block */}
          <div className="bg-slate-900/70 border border-slate-700/80 rounded-sm p-4 space-y-2 text-xs">
            <div className="flex items-center gap-3">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'Usuário'}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-slate-600 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">
                  {userProfile?.name || firebaseUser.displayName || 'Aluno NPOR'}
                </p>
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{firebaseUser.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Identificador:</span>
              <span className="font-mono text-slate-300 truncate max-w-[200px]">
                {firebaseUser.uid}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-1">
            <button
              id="btn-refresh-status"
              onClick={handleRefresh}
              disabled={checking}
              className="w-full py-2.5 px-4 bg-[#4B5320] hover:bg-[#5b6427] text-white font-semibold text-xs uppercase tracking-wider rounded-sm shadow-md transition-all flex items-center justify-center gap-2 border border-[#D4AF37]/50 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Consultando Firestore...' : 'Verificar Aprovação Agora'}</span>
            </button>

            <button
              id="btn-signout-alternative"
              onClick={onSignOut}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-sm transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Entrar com Outra Conta Google</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Sincronização em tempo real ativa no banco do Grêmio NPOR</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/70 py-3 px-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Portal Oficial do Grêmio NPOR • Segurança e Transparência Militar</span>
          <span className="font-mono text-[11px] text-slate-400">ID: gremio-npor</span>
        </div>
      </footer>
    </div>
  );
};
