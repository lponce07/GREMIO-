import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { AppState } from '../services/dataService';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Lock,
  Eye,
  KeyRound,
  FileLock2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface UsersViewProps {
  appState: AppState;
  userRole: UserRole;
  onChangeUserRole: (role: UserRole) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ appState, userRole, onChangeUserRole }) => {
  const { config, users, currentUser } = appState;
  const isAdmin = userRole === 'admin';

  const roleDescriptions: Record<UserRole, { title: string; desc: string; permissions: string[] }> = {
    admin: {
      title: 'Presidente do Grêmio (Administrador)',
      desc: 'Controle total da aplicação, configurações gerais, permissão de usuários, aprovação de orçamentos e auditoria.',
      permissions: ['Acesso Irrestrito', 'Configurações do Grêmio', 'Aprovar Orçamentos', 'Auditoria Geral'],
    },
    tesouraria: {
      title: 'Diretor Financeiro / Tesouraria',
      desc: 'Lançamento de receitas e despesas, estornos com justificativa, conciliação bancária, upload de comprovantes fiscais.',
      permissions: ['Gerir Caixa & Contas', 'Vincular Notas e PIX', 'Gerar Balancetes', 'Visualizar Alertas'],
    },
    comissao_formatura: {
      title: 'Comissão de Formatura',
      desc: 'Gerenciamento das 18 categorias da formatura, cotações comparadas de fornecedores, controle de contratos e parcelas.',
      permissions: ['Gerir 18 Categorias', 'Comparar Fornecedores', 'Fiscalizar Contratos', 'Acompanhar Cotas'],
    },
    diretor_eventos: {
      title: 'Diretor de Eventos',
      desc: 'Criação e edição de eventos do grêmio, checklists operacionais, designação de tarefas e relatórios pós-evento.',
      permissions: ['Gerir Eventos & Cronogramas', 'Editar Checklists', 'Avaliação Pós-Evento', 'Propor Projetos'],
    },
    aluno: {
      title: 'Aluno do NPOR / Associado',
      desc: 'Visualização transparente das prestações de contas, balancetes publicados, história da turma e eventos programados.',
      permissions: ['Visualizar Balancetes', 'Acompanhar Formatura', 'Ver História da Turma', 'Consultar Calendário'],
    },
    instrutor_fiscal: {
      title: 'Instrutor / Fiscal Militar',
      desc: 'Acesso especial de fiscalização e auditoria da Unidade Militar para verificação da conformidade com as diretrizes do Exército.',
      permissions: ['Fiscalização Integral', 'Auditoria Forense', 'Acesso a Comprovantes', 'Histórico de Logs'],
    },
    membro_consulta: {
      title: 'Membro com Acesso de Consulta',
      desc: 'Visualização de relatórios, atas e balancetes sem permissão de edição.',
      permissions: ['Consulta de Relatórios', 'Leitura de Balancetes', 'Visualização de Atividades'],
    },
    visitante_publico: {
      title: 'Visitante / Portal de Transparência',
      desc: 'Acesso restrito às prestações de contas públicas homologadas pelo conselho fiscal.',
      permissions: ['Balancete Público Homologado', 'Histórico da Turma'],
    },
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#1A2421] text-[#D4AF37] border border-[#D4AF37]/30">
              Segurança & Controle de Acesso
            </span>
            <span className="text-xs text-slate-500 font-medium">Controle Baseado em Papéis (RBAC)</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A2421] mt-1 font-institutional flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4B5320]" />
            Perfis de Acesso & Segurança LGPD
          </h2>
          <p className="text-xs text-slate-500">
            Definição de permissões por função no Grêmio do NPOR e diretrizes de privacidade de dados.
          </p>
        </div>
      </div>

      {/* LGPD & Privacy Notice Box */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20">
            <FileLock2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A2421] font-institutional">Política de Proteção de Dados e Privacidade Militar</h3>
            <p className="text-xs text-slate-500">
              Conformidade com a Lei Geral de Proteção de Dados (LGPD) e diretrizes de sigilo militar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-4 bg-slate-50 border border-slate-200">
            <span className="text-amber-800 font-bold block mb-1 uppercase tracking-wider text-[11px]">Proteção de CPF e Contas</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Dados bancários completos, senhas e CPFs são ocultados em visualizações públicas de balancete, exibindo apenas dados estritamente necessários.
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200">
            <span className="text-[#4B5320] font-bold block mb-1 uppercase tracking-wider text-[11px]">Identificação Militar</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Alunos e responsáveis são referenciados pelo Nome de Guerra e Número de Aluno, mantendo a padronização militar e preservando dados privados.
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200">
            <span className="text-blue-800 font-bold block mb-1 uppercase tracking-wider text-[11px]">Autenticação Segura</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Sessões protegidas com trilha de auditoria para cada ação executada. O sistema nunca solicita nem armazena senhas externas do Google.
            </p>
          </div>
        </div>
      </div>

      {/* Available Roles Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase text-[#1A2421] tracking-widest flex items-center gap-2 font-institutional">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
          Perfis de Acesso Cadastrados no Sistema
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(roleDescriptions) as UserRole[]).map((role) => {
            const info = roleDescriptions[role];
            const isCurrent = userRole === role;

            return (
              <div
                key={role}
                className={`p-6 border transition text-xs space-y-3 flex flex-col justify-between bg-white shadow-sm ${
                  isCurrent
                    ? 'border-[#4B5320] ring-2 ring-[#4B5320]/30 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 border ${
                        isCurrent
                          ? 'bg-[#4B5320] text-white border-[#4B5320]'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isCurrent ? 'Perfil Ativo na Sessão' : role}
                    </span>
                  </div>

                  <h4 className="font-bold text-[#1A2421] text-sm">{info.title}</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{info.desc}</p>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5 tracking-wider">
                      Permissões Atribuídas:
                    </span>
                    <ul className="space-y-1">
                      {info.permissions.map((perm, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-slate-700 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4B5320] shrink-0" />
                          <span>{perm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onChangeUserRole(role)}
                    className={`w-full py-2 font-bold text-xs uppercase tracking-wider transition ${
                      isCurrent
                        ? 'bg-[#4B5320] text-white cursor-default shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {isCurrent ? 'Perfil Selecionado' : 'Simular este Perfil'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
