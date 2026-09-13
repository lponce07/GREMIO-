import React from 'react';
import { MilitaryInsignia } from './MilitaryInsignia';
import { AppState } from '../services/dataService';
import { User, UserRole, GremioConfig, AuditAlert } from '../types';
import { DEFAULT_THEME } from '../utils/themeManager';
import {
  ShieldAlert,
  Search,
  Settings,
  Menu,
  Database,
  Lock,
  Eye,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Palette,
} from 'lucide-react';

import { INITIAL_GREMIO_CONFIG } from '../data/initialDemoData';

interface HeaderProps {
  appState?: AppState;
  config?: GremioConfig;
  currentUser?: User;
  users?: User[];
  alerts?: AuditAlert[];
  userRole?: UserRole;
  activeAlertsCount?: number;
  criticalRedAlerts?: number;
  onChangeUserRole?: (role: UserRole) => void;
  onSelectUser?: (user: User) => void;
  onOpenSearch: () => void;
  onOpenAssistant?: () => void;
  onOpenSetupWizard: () => void;
  onToggleMobileSidebar?: () => void;
  onToggleMobileMenu?: () => void;
  onToggleDemoMode?: (toDemo: boolean) => void;
  activeView?: string;
  onNavigate?: (view: string) => void;
  onLogout?: () => void;
}

export const ROLE_LABELS: Record<UserRole, { label: string; badgeColor: string }> = {
  admin: { label: 'Administrador Geral', badgeColor: 'bg-red-900/80 text-red-200 border-red-700' },
  presidente: { label: 'Presidente (Comissão)', badgeColor: 'bg-amber-900/80 text-amber-200 border-amber-600' },
  vice_presidente: { label: 'Vice-Presidente (Comissão)', badgeColor: 'bg-amber-950 text-amber-300 border-amber-700' },
  tesoureiro_1: { label: '1º Tesoureiro (Planilha-Mãe)', badgeColor: 'bg-emerald-900/90 text-emerald-200 border-emerald-600' },
  tesoureiro_2: { label: '2º Tesoureiro (Entradas)', badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700' },
  tesoureiro_3: { label: '3º Tesoureiro (Saídas)', badgeColor: 'bg-teal-950 text-teal-200 border-teal-700' },
  eventos_patrimonio: { label: 'Eventos & Patrimônio', badgeColor: 'bg-blue-900/80 text-blue-200 border-blue-700' },
  visualizador: { label: 'Aluno (Visualizador)', badgeColor: 'bg-slate-700 text-slate-200 border-slate-600' },
  // Papéis de compatibilidade
  tesouraria: { label: 'Tesouraria', badgeColor: 'bg-emerald-900/80 text-emerald-200 border-emerald-700' },
  eventos: { label: 'Eventos', badgeColor: 'bg-blue-900/80 text-blue-200 border-blue-700' },
  diretor_eventos: { label: 'Diretor de Eventos', badgeColor: 'bg-blue-900/80 text-blue-200 border-blue-700' },
  comissao_formatura: { label: 'Comissão Formatura', badgeColor: 'bg-amber-900/80 text-amber-200 border-amber-700' },
  aluno: { label: 'Aluno NPOR', badgeColor: 'bg-teal-900/80 text-teal-200 border-teal-700' },
  instrutor_fiscal: { label: 'Instrutor / Fiscal', badgeColor: 'bg-purple-900/80 text-purple-200 border-purple-700' },
  membro_consulta: { label: 'Membro Consulta', badgeColor: 'bg-stone-700 text-stone-200 border-stone-600' },
  visitante_publico: { label: 'Visitante Público', badgeColor: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
};

export const Header: React.FC<HeaderProps> = ({
  appState,
  config: propConfig,
  currentUser: propCurrentUser,
  users: propUsers,
  alerts: propAlerts,
  userRole,
  activeAlertsCount: propActiveAlertsCount,
  criticalRedAlerts: propCriticalRedAlerts,
  onChangeUserRole,
  onSelectUser,
  onOpenSearch,
  onOpenAssistant,
  onOpenSetupWizard,
  onToggleMobileSidebar,
  onToggleMobileMenu,
  onToggleDemoMode,
  onNavigate,
  onLogout,
}) => {
  const config = propConfig || appState?.config || INITIAL_GREMIO_CONFIG;

  const currentUser: User = propCurrentUser || appState?.currentUser || {
    id: 'user_1',
    name: 'Usuário autenticado',
    warName: 'USUÁRIO',
    email: '',
    department: 'Acesso autenticado',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    role: userRole || 'admin',
  };

  const users: User[] = (propUsers || appState?.users || [currentUser]) as User[];
  const alerts = propAlerts || appState?.alerts || [];

  const handleToggleMobile = onToggleMobileSidebar || onToggleMobileMenu || (() => {});
  const handleSelectUser = (u: User) => {
    if (onSelectUser) onSelectUser(u);
    if (onChangeUserRole) onChangeUserRole(u.role);
  };
  const handleNavigation = (view: string) => {
    if (onNavigate) onNavigate(view);
  };

  const activeAlertsCount = typeof propActiveAlertsCount === 'number'
    ? propActiveAlertsCount
    : (alerts || []).filter(
        (a) => a && a.status === 'ativo' && (a.severity === 'vermelho' || a.severity === 'amarelo')
      ).length;

  const redAlertsCount = typeof propCriticalRedAlerts === 'number'
    ? propCriticalRedAlerts
    : (alerts || []).filter((a) => a && a.status === 'ativo' && a.severity === 'vermelho').length;

  const theme = config?.theme || DEFAULT_THEME;
  const isDarkHeader = theme.headerStyle === 'dark';
  const isPrimaryHeader = theme.headerStyle === 'primary';

  return (
    <header
      className={`sticky top-0 z-40 border-b shadow-sm transition-colors ${
        isDarkHeader
          ? 'bg-[#1A2421] border-white/10 text-white'
          : isPrimaryHeader
          ? 'text-white border-black/20'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
      style={{
        backgroundColor: isPrimaryHeader ? theme.primaryColor : undefined,
      }}
    >
      {/* Top Banner when in Demo Mode */}
      {config.isDemoMode && (
        <div className="bg-[#D4AF37]/15 border-b border-[#D4AF37]/30 px-4 py-1.5 text-xs text-[#1A2421] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-[#D4AF37] border border-[#1A2421]" />
            <span className="font-bold tracking-wide uppercase text-[11px]">
              Ambiente de Demonstração (Dados Fictícios)
            </span>
            <span className="hidden md:inline text-slate-600 text-[11px]">
              — Simulação para fiscalização e conferência.
            </span>
          </div>
          {/* Action buttons on demo banner */}
          <div className="flex items-center gap-3">
            {onToggleDemoMode && (
              <>
                <button
                  onClick={() => onToggleDemoMode(false)}
                  className="text-[11px] font-bold uppercase bg-white hover:bg-slate-100 text-[#1A2421] px-2.5 py-0.5 border border-slate-300 transition shadow-xs"
                  title="Limpar todos os dados demonstrativos e iniciar base de dados real do Grêmio"
                >
                  Iniciar Base Real
                </button>
                <button
                  onClick={() => onToggleDemoMode(true)}
                  className="text-[11px] font-bold text-[#4B5320] hover:underline flex items-center gap-1"
                  title="Restaurar dados fictícios de exemplo"
                >
                  <RefreshCw className="w-3 h-3" /> Restaurar Demonstração
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Header bar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Mobile Toggle + Logo + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMobile}
            className={`md:hidden p-2 focus:outline-none ${
              isDarkHeader || isPrimaryHeader
                ? 'text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div
            onClick={() => handleNavigation('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="transition-transform group-hover:scale-105">
              <MilitaryInsignia
                className="w-9 h-9 drop-shadow-sm"
                customSrc={config.logoUrl || theme.customLogoUrl || undefined}
                alt="Emblema Oficial"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`text-base sm:text-lg font-bold tracking-tight font-institutional ${
                    isDarkHeader || isPrimaryHeader ? 'text-white' : 'text-[#1A2421]'
                  }`}
                >
                  {config.gremioName}
                </h1>
                <span
                  className={`hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider border ${
                    isDarkHeader || isPrimaryHeader
                      ? 'bg-white/15 text-[#D4AF37] border-[#D4AF37]/50'
                      : 'bg-[#4B5320]/10 text-[#4B5320] border-[#4B5320]/30'
                  }`}
                >
                  {config.year}
                </span>
              </div>
              <p
                className={`text-[11px] leading-none ${
                  isDarkHeader || isPrimaryHeader ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {config.turmaName} • {config.unitName}
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Date / Session Badge */}
          <div
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
              isDarkHeader || isPrimaryHeader
                ? 'bg-white/10 border-white/20 text-[#D4AF37]'
                : 'bg-slate-100 border-slate-200 text-[#4B5320]'
            }`}
          >
            <span>Sessão: {new Date().toLocaleDateString('pt-BR')}</span>
          </div>

          {/* Universal Search Trigger */}
          <button
            onClick={onOpenSearch}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 border transition ${
              isDarkHeader || isPrimaryHeader
                ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Pesquisa inteligente (Ctrl+K)"
          >
            <Search className={`w-3.5 h-3.5 ${isDarkHeader || isPrimaryHeader ? 'text-[#D4AF37]' : 'text-slate-500'}`} />
            <span className="hidden md:inline">Pesquisar...</span>
            <kbd
              className={`hidden lg:inline px-1.5 py-0.5 text-[10px] border ${
                isDarkHeader || isPrimaryHeader
                  ? 'bg-white/10 text-slate-300 border-white/20'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              ⌘K
            </kbd>
          </button>

          {/* Central de Pendências Badge */}
          <button
            onClick={() => handleNavigation('alerts')}
            className={`relative px-3 py-1.5 text-xs transition flex items-center gap-1.5 border font-semibold ${
              redAlertsCount > 0
                ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                : activeAlertsCount > 0
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                : isDarkHeader || isPrimaryHeader
                ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Central de Pendências e Conferências Fiscais"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">Pendências</span>
            {activeAlertsCount > 0 && (
              <span
                className={`ml-1 text-[10px] font-bold px-1.5 py-0.2 ${
                  redAlertsCount > 0
                    ? 'bg-red-600 text-white'
                    : 'bg-[#D4AF37] text-slate-900'
                }`}
              >
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Personalização da Interface (Exclusivo Administrador Geral) */}
          {userRole === 'admin' && (
            <button
              onClick={() => handleNavigation('customization')}
              className={`px-2.5 py-1.5 transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs border ${
                isDarkHeader || isPrimaryHeader
                  ? 'bg-white/15 hover:bg-white/25 text-[#D4AF37] border-[#D4AF37]/50'
                  : 'bg-[#4B5320] hover:bg-[#3d441a] text-white border-[#D4AF37]'
              }`}
              title="Personalizar interface, cores e imagem do portal (Administrador Geral)"
            >
              <Palette className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden lg:inline">Personalizar Visual</span>
            </button>
          )}

          {/* Setup Wizard button */}
          <button
            onClick={onOpenSetupWizard}
            className={`p-2 border transition ${
              isDarkHeader || isPrimaryHeader
                ? 'text-white/80 hover:text-white hover:bg-white/10 border-white/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
            }`}
            title="Configuração do Grêmio"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User & Role Switcher */}
          <div className="relative group">
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer">
              <div className="w-8 h-8 bg-[#1A2421] border border-[#D4AF37] flex items-center justify-center text-xs font-bold text-[#D4AF37]">
                {currentUser.warName.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-[#1A2421] leading-tight flex items-center gap-1.5">
                  {currentUser.warName}
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-block px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border ${
                      ROLE_LABELS[currentUser.role]?.badgeColor || ''
                    }`}
                  >
                    {ROLE_LABELS[currentUser.role]?.label || currentUser.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Dropdown for instant role simulation / profile switching */}
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 shadow-xl py-2 z-50 hidden group-hover:block transition-all animate-fadeIn">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Alternar Perfil de Acesso
                </p>
                <p className="text-xs text-[#1A2421] font-bold mt-0.5">
                  {currentUser.name}
                </p>
              </div>

              <div className="py-1 max-h-64 overflow-y-auto">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 text-xs transition ${
                        isCurrent ? 'bg-slate-100 font-bold text-[#1A2421]' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>{u.warName}</span>
                          {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-[#4B5320]" />}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {ROLE_LABELS[u.role]?.label}
                        </div>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 border ${
                          ROLE_LABELS[u.role]?.badgeColor
                        }`}
                      >
                        {u.role.substring(0, 5)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {userRole === 'admin' && (
                <div className="p-1 border-t border-slate-100 bg-slate-50">
                  <button
                    onClick={() => handleNavigation('customization')}
                    className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-white text-xs text-[#4B5320] font-bold rounded-xs transition-colors"
                  >
                    <Palette className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Personalizar Interface & Cores</span>
                  </button>
                </div>
              )}

              <div className="pt-2 px-3 border-t border-slate-100 text-[10px] text-slate-500">
                Permissões: <strong className="text-[#1A2421]">{ROLE_LABELS[currentUser.role]?.label}</strong>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              id="btn-header-logout"
              onClick={onLogout}
              title="Encerrar Sessão Segura"
              className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xs transition flex items-center gap-1.5 text-xs font-semibold border border-transparent hover:border-red-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
