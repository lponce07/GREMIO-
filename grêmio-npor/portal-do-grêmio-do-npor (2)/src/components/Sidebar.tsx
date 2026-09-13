import React from 'react';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  Landmark,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Target,
  FileText,
  ShieldAlert,
  Share2,
  FileSpreadsheet,
  History,
  Users,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  currentView?: string;
  activeTab?: string;
  onNavigate?: (view: string) => void;
  setActiveTab?: (tab: string) => void;
  userRole: UserRole;
  pendingAlertsCount?: number;
  alertsCount?: number;
  unlinkedDocsCount?: number;
  isOpenMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeColor?: string;
  allowedRoles?: UserRole[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  activeTab,
  onNavigate,
  setActiveTab,
  userRole,
  pendingAlertsCount,
  alertsCount,
  unlinkedDocsCount = 0,
  isOpenMobile,
  isMobileOpen,
  onCloseMobile = () => {},
}) => {
  const activeCurrentView = currentView || activeTab || 'dashboard';
  const effectiveAlertsCount = pendingAlertsCount ?? alertsCount ?? 0;
  const isMobileDrawerOpen = isOpenMobile ?? isMobileOpen ?? false;

  const handleNavigation = (viewId: string) => {
    if (onNavigate) onNavigate(viewId);
    if (setActiveTab) setActiveTab(viewId);
    onCloseMobile();
  };

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Painel Geral',
      icon: LayoutDashboard,
    },
    {
      id: 'treasury',
      label: 'Tesouraria',
      icon: Landmark,
      allowedRoles: ['admin', 'tesouraria', 'membro_consulta'],
    },
    {
      id: 'history',
      label: 'História do Grêmio',
      icon: BookOpen,
    },
    {
      id: 'events',
      label: 'Diretores de Eventos',
      icon: CalendarDays,
      allowedRoles: ['admin', 'diretor_eventos', 'tesouraria', 'membro_consulta'],
    },
    {
      id: 'graduation',
      label: 'Festa de Formatura',
      icon: GraduationCap,
      allowedRoles: ['admin', 'comissao_formatura', 'tesouraria', 'diretor_eventos', 'membro_consulta', 'visitante_publico'],
    },
    {
      id: 'plans',
      label: 'Planejamentos Futuros',
      icon: Target,
      allowedRoles: ['admin', 'diretor_eventos', 'tesouraria', 'comissao_formatura', 'membro_consulta'],
    },
    {
      id: 'documents',
      label: 'Central de Documentos',
      icon: FileText,
      badge: unlinkedDocsCount > 0 ? unlinkedDocsCount : undefined,
      badgeColor: 'bg-amber-600 text-white',
      allowedRoles: ['admin', 'tesouraria', 'diretor_eventos', 'comissao_formatura', 'membro_consulta'],
    },
    {
      id: 'alerts',
      label: 'Central de Pendências',
      icon: ShieldAlert,
      badge: effectiveAlertsCount > 0 ? effectiveAlertsCount : undefined,
      badgeColor: 'bg-red-600 text-white',
      allowedRoles: ['admin', 'tesouraria', 'diretor_eventos', 'comissao_formatura', 'membro_consulta'],
    },
    {
      id: 'integrations',
      label: 'Google Drive',
      icon: Share2,
      allowedRoles: ['admin', 'tesouraria'],
    },
    {
      id: 'reports',
      label: 'Relatórios Oficiais',
      icon: FileSpreadsheet,
      allowedRoles: ['admin', 'tesouraria', 'comissao_formatura', 'membro_consulta', 'visitante_publico'],
    },
    {
      id: 'audit',
      label: 'Histórico e Auditoria',
      icon: History,
      allowedRoles: ['admin', 'tesouraria', 'membro_consulta'],
    },
    {
      id: 'users',
      label: 'Usuários & Perfis',
      icon: Users,
      allowedRoles: ['admin'],
    },
  ];

  // Filter items according to user role
  const visibleItems = navItems.filter((item) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(userRole);
  });

  const content = (
    <div className="flex flex-col h-full bg-[#1A2421] text-white border-r-4 border-[#D4AF37]">
      {/* Sidebar Top Section - Geometric Balance */}
      <div className="p-4 flex flex-col items-center border-b border-white/10 bg-black/20">
        <div className="w-14 h-14 bg-[#4B5320] border-2 border-[#D4AF37] flex items-center justify-center mb-2 shadow-lg">
          <span className="text-[#D4AF37] font-bold text-lg tracking-widest font-institutional">NPOR</span>
        </div>
        <h1 className="text-xs font-bold tracking-widest text-center uppercase text-white font-institutional">
          Portal do Grêmio
        </h1>
        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">
          Gestão Institucional
        </p>
      </div>

      <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/5 bg-black/10">
        Navegação Principal
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-2 overflow-y-auto space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeCurrentView === item.id ||
            (item.id === 'plans' && activeCurrentView === 'future_plans') ||
            (item.id === 'alerts' && activeCurrentView === 'audit_alerts') ||
            (item.id === 'audit' && activeCurrentView === 'audit_logs');
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-full flex items-center justify-between px-5 py-2.5 text-xs transition-colors group ${
                isActive
                  ? 'bg-[#4B5320] text-white border-r-4 border-[#D4AF37] font-bold shadow-sm'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#D4AF37]' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 ${
                      item.badgeColor || 'bg-slate-700 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <ChevronRight
                  className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isActive ? 'opacity-100 text-[#D4AF37]' : 'text-slate-500'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-white/10 bg-black/30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#4B5320] border border-[#D4AF37] flex items-center justify-center text-xs font-bold text-[#D4AF37]">
            EB
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-white leading-tight">NPOR • 2026</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Braço Forte, Mão Amiga</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 no-print">
        <div className="sticky top-16 h-[calc(100vh-4rem)]">
          {content}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex no-print">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-4/5 max-w-xs h-full z-10 animate-slideRight">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
