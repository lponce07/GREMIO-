import React, { useState } from 'react';
import { User, UserRole, UserStatus, CommissionMember } from '../types';
import {
  AppState,
  updateUserRoleInFirestore,
  updateUserStatusInFirestore,
  linkUserGoogleEmailInFirestore,
  linkCommissionMemberAccountInFirestore,
  updateCommissionMemberInFirestore,
} from '../services/dataService';
import {
  Users,
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  UserPlus,
  Mail,
  Link2,
  ShieldAlert,
  Search,
  Check,
  X,
  Crown,
  Coins,
  CalendarDays,
  Award,
} from 'lucide-react';
import { ROLE_LABELS } from '../components/Header';

interface UsersViewProps {
  appState: AppState;
  userRole: UserRole;
  onChangeUserRole?: (role: UserRole) => void;
  onUpdateUserRoleInState?: (userId: string, newRole: UserRole) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  appState,
  userRole,
}) => {
  const { users, currentUser } = appState;
  const isAdmin = userRole === 'admin';

  const [activeSubTab, setActiveSubTab] = useState<'pendentes' | 'comissao' | 'todos' | 'suspensos'>('comissao');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email linking state
  const [editingEmailForUserId, setEditingEmailForUserId] = useState<string | null>(null);
  const [emailInputValue, setEmailInputValue] = useState('');

  // Selected role for custom approval modal/inline
  const [approvalRoles, setApprovalRoles] = useState<Record<string, UserRole>>({});

  const actor = {
    warName: currentUser.warName,
    name: currentUser.name,
    role: currentUser.role,
  };

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const commissionMembersList: CommissionMember[] = appState.commissionMembers || [];
  const suspendedUsers = users.filter((u) => u.status === 'suspended' || u.status === 'rejected');

  const filteredAllUsers = users.filter((u) => {
    if (activeSubTab === 'pendentes') return u.status === 'pending';
    if (activeSubTab === 'suspensos') return u.status === 'suspended' || u.status === 'rejected';
    return true;
  }).filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.warName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  });

  const handleApproveUser = async (targetUser: User, assignedRole?: UserRole) => {
    if (!isAdmin) return;
    const roleToSet = assignedRole || approvalRoles[targetUser.id] || 'visualizador';
    setSavingUserId(targetUser.id);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateUserStatusInFirestore(targetUser.id, 'approved', roleToSet, actor);
      setSuccessMessage(`Acesso aprovado para ${targetUser.warName || targetUser.name} como ${ROLE_LABELS[roleToSet]?.label || roleToSet}.`);
      setTimeout(() => setSuccessMessage(null), 4500);
    } catch (err: any) {
      console.error('Erro ao aprovar usuário:', err);
      setErrorMessage('Falha ao aprovar usuário: ' + (err.message || 'Erro de permissão'));
    } finally {
      setSavingUserId(null);
    }
  };

  const handleRejectUser = async (targetUser: User) => {
    if (!isAdmin) return;
    setSavingUserId(targetUser.id);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateUserStatusInFirestore(targetUser.id, 'rejected', undefined, actor);
      setSuccessMessage(`Solicitação de ${targetUser.warName || targetUser.name} foi rejeitada.`);
      setTimeout(() => setSuccessMessage(null), 4500);
    } catch (err: any) {
      console.error('Erro ao rejeitar usuário:', err);
      setErrorMessage('Falha ao rejeitar usuário: ' + (err.message || 'Erro de permissão'));
    } finally {
      setSavingUserId(null);
    }
  };

  const handleToggleSuspend = async (targetUser: User) => {
    if (!isAdmin) return;
    const newStatus: UserStatus = targetUser.status === 'suspended' ? 'approved' : 'suspended';
    setSavingUserId(targetUser.id);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateUserStatusInFirestore(targetUser.id, newStatus, undefined, actor);
      setSuccessMessage(
        newStatus === 'suspended'
          ? `Acesso de ${targetUser.warName || targetUser.name} foi suspenso.`
          : `Acesso de ${targetUser.warName || targetUser.name} foi reativado.`
      );
      setTimeout(() => setSuccessMessage(null), 4500);
    } catch (err: any) {
      console.error('Erro ao alternar suspensão:', err);
      setErrorMessage('Falha ao atualizar suspensão: ' + (err.message || 'Erro de permissão'));
    } finally {
      setSavingUserId(null);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    if (!isAdmin) return;
    setSavingUserId(targetUserId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateUserRoleInFirestore(targetUserId, newRole, actor);
      setSuccessMessage(`Função atualizada com sucesso para: ${ROLE_LABELS[newRole]?.label || newRole}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao atualizar papel do usuário:', err);
      setErrorMessage('Falha ao atualizar função: ' + (err.message || 'Permissão negada'));
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleSaveLinkedEmail = async (userId: string) => {
    if (!isAdmin || !emailInputValue.trim()) return;
    setSavingUserId(userId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await linkUserGoogleEmailInFirestore(userId, emailInputValue.trim(), actor);
      setSuccessMessage(`E-mail Google (${emailInputValue.trim()}) associado com sucesso!`);
      setEditingEmailForUserId(null);
      setEmailInputValue('');
      setTimeout(() => setSuccessMessage(null), 4500);
    } catch (err: any) {
      console.error('Erro ao associar e-mail:', err);
      setErrorMessage('Falha ao associar e-mail: ' + (err.message || 'Erro de gravação'));
    } finally {
      setSavingUserId(null);
    }
  };

  const handleSaveCommissionEmail = async (memberId: string) => {
    if (!isAdmin || !emailInputValue.trim()) return;
    setSavingUserId(memberId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await linkCommissionMemberAccountInFirestore(memberId, emailInputValue.trim(), undefined, actor);
      setSuccessMessage(`E-mail Google (${emailInputValue.trim()}) vinculado à Comissão Oficial com sucesso!`);
      setEditingEmailForUserId(null);
      setEmailInputValue('');
      setTimeout(() => setSuccessMessage(null), 4500);
    } catch (err: any) {
      console.error('Erro ao vincular e-mail à comissão:', err);
      setErrorMessage('Falha ao vincular e-mail: ' + (err.message || 'Erro de permissão'));
    } finally {
      setSavingUserId(null);
    }
  };

  const handleCommissionRoleChange = async (memberId: string, newRole: UserRole) => {
    if (!isAdmin) return;
    setSavingUserId(memberId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateCommissionMemberInFirestore(memberId, { role: newRole }, actor);
      setSuccessMessage(`Função da Comissão atualizada com sucesso para: ${ROLE_LABELS[newRole]?.label || newRole}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao atualizar função da comissão:', err);
      setErrorMessage('Falha ao atualizar função: ' + (err.message || 'Permissão negada'));
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#1A2421] text-[#D4AF37] border border-[#D4AF37]/30">
              Segurança & Governança NPOR
            </span>
            <span className="text-xs text-slate-500 font-medium">Controle Baseado em Papéis (RBAC)</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A2421] mt-1 font-institutional flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4B5320]" />
            Gestão Multiusuário e Comissão Oficial
          </h2>
          <p className="text-xs text-slate-500">
            Aprovações de novos logins, atribuição de funções na Comissão do Grêmio e controle de acesso da Turma.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span className="font-semibold">Modo Administrador: Controle irrestrito ativo</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm flex items-center gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-sm flex items-center gap-2.5 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveSubTab('pendentes')}
          className={`p-3 text-left border rounded-sm transition cursor-pointer ${
            activeSubTab === 'pendentes'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Aguardando Aprovação
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {pendingUsers.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Novos logins pendentes</p>
        </button>

        <button
          onClick={() => setActiveSubTab('comissao')}
          className={`p-3 text-left border rounded-sm transition cursor-pointer ${
            activeSubTab === 'comissao'
              ? 'bg-[#4B5320]/10 border-[#4B5320] ring-2 ring-[#4B5320]/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Comissão Oficial
            </span>
            <Crown className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-[#4B5320] mt-1">
            {commissionMembersList.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Diretoria e Tesouraria</p>
        </button>

        <button
          onClick={() => setActiveSubTab('todos')}
          className={`p-3 text-left border rounded-sm transition cursor-pointer ${
            activeSubTab === 'todos'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total de Integrantes
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {users.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Cadastrados no sistema</p>
        </button>

        <button
          onClick={() => setActiveSubTab('suspensos')}
          className={`p-3 text-left border rounded-sm transition cursor-pointer ${
            activeSubTab === 'suspensos'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Suspensos / Rejeitados
            </span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700 mt-1">
            {suspendedUsers.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Acesso desabilitado</p>
        </button>
      </div>

      {/* Subtabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('comissao')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xs transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'comissao'
                ? 'bg-[#4B5320] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Comissão Oficial</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pendentes')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xs transition cursor-pointer flex items-center gap-1.5 relative ${
              activeSubTab === 'pendentes'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Aguardando Aprovação</span>
            {pendingUsers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-red-600 text-white rounded-full font-black animate-pulse">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('todos')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xs transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'todos'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Todos os Integrantes</span>
          </button>

          <button
            onClick={() => setActiveSubTab('suspensos')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xs transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'suspensos'
                ? 'bg-red-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Suspensos</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar nome, e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-300 rounded-xs focus:outline-hidden focus:border-[#4B5320]"
          />
        </div>
      </div>

      {/* TAB 1: PENDING APPROVALS */}
      {activeSubTab === 'pendentes' && (
        <div className="space-y-4">
          {pendingUsers.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">
                Nenhuma solicitação pendente no momento
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Quando um novo aluno ou integrante realizar o primeiro login com a Conta Google, o perfil aparecerá aqui com status pendente para validação.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((pendingUser) => {
                const isSaving = savingUserId === pendingUser.id;
                const chosenRole = approvalRoles[pendingUser.id] || 'visualizador';

                return (
                  <div
                    key={pendingUser.id}
                    className="p-5 bg-white border-2 border-amber-300 rounded-sm shadow-xs space-y-4 relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#4B5320] text-white font-bold flex items-center justify-center text-sm border border-[#D4AF37]/40 overflow-hidden shrink-0">
                          {pendingUser.avatar ? (
                            <img
                              src={pendingUser.avatar}
                              alt={pendingUser.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            pendingUser.name?.substring(0, 2).toUpperCase() || 'AL'
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {pendingUser.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-mono">
                            {pendingUser.email}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 rounded-xs">
                            Aguardando Aprovação do Administrador
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xs border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Data da solicitação:</span>
                        <span className="font-medium text-slate-800">
                          {new Date(pendingUser.createdAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(pendingUser.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Identificador Firebase:</span>
                        <span className="font-mono text-[10px] text-slate-500 truncate max-w-[180px]">
                          {pendingUser.id}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                            Atribuir Função:
                          </label>
                          <select
                            value={chosenRole}
                            onChange={(e) =>
                              setApprovalRoles((prev) => ({
                                ...prev,
                                [pendingUser.id]: e.target.value as UserRole,
                              }))
                            }
                            className="w-full text-xs bg-white border border-slate-300 rounded-xs py-1.5 px-2.5 font-medium text-slate-800 focus:outline-hidden focus:border-[#4B5320]"
                          >
                            <option value="visualizador">Aluno (Visualizador - Somente Leitura)</option>
                            <option value="presidente">Presidente (Comissão)</option>
                            <option value="vice_presidente">Vice-Presidente (Comissão)</option>
                            <option value="tesoureiro_1">1º Tesoureiro (Planilha-Mãe)</option>
                            <option value="tesoureiro_2">2º Tesoureiro (Entradas e Mensalidades)</option>
                            <option value="tesoureiro_3">3º Tesoureiro (Saídas e Comprovantes)</option>
                            <option value="eventos_patrimonio">Diretor de Eventos e Patrimônio</option>
                            <option value="admin">Administrador Geral</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveUser(pendingUser, chosenRole)}
                            disabled={isSaving}
                            className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xs transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>{isSaving ? 'Gravando...' : 'Aprovar Acesso'}</span>
                          </button>

                          <button
                            onClick={() => handleRejectUser(pendingUser)}
                            disabled={isSaving}
                            className="py-2 px-3 bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-700 font-bold text-xs rounded-xs transition flex items-center gap-1 disabled:opacity-60 cursor-pointer"
                          >
                            <UserX className="w-4 h-4" />
                            <span>Rejeitar</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMISSÃO OFICIAL */}
      {activeSubTab === 'comissao' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#1A2421] text-white border-l-4 border-[#D4AF37] space-y-1">
            <h3 className="font-bold text-sm text-[#D4AF37] uppercase tracking-wider font-institutional flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Estrutura Oficial da Diretoria e Comissão do Grêmio NPOR
            </h3>
            <p className="text-xs text-slate-300">
              Integrantes administrativos cadastrados na coleção independente <code className="text-[#D4AF37] font-mono">commissionMembers</code>. O Administrador pode vincular o e-mail Google de cada integrante para reconhecimento automático e concessão de privilégios no login.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commissionMembersList.map((member) => {
              const isEditingEmail = editingEmailForUserId === member.id;
              const isSaving = savingUserId === member.id;
              const hasEmailLinked = Boolean(member.linkedEmail && member.linkedEmail.trim());

              return (
                <div
                  key={member.id}
                  className="bg-white border border-slate-200 shadow-xs p-4 rounded-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-sm bg-[#4B5320] text-[#D4AF37] font-black flex items-center justify-center text-xs border border-[#D4AF37]/50 shadow-xs shrink-0">
                          {member.role === 'admin' ? (
                            <ShieldCheck className="w-5 h-5" />
                          ) : member.role === 'presidente' || member.role === 'vice_presidente' ? (
                            <Crown className="w-5 h-5" />
                          ) : member.role.includes('tesoureiro') ? (
                            <Coins className="w-5 h-5" />
                          ) : (
                            <CalendarDays className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm uppercase font-institutional">
                            {member.name}
                          </h4>
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-xs ${
                              ROLE_LABELS[member.role]?.badgeColor || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {member.position || ROLE_LABELS[member.role]?.label || member.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {member.description || `Comissão Oficial — ${member.position}`}
                    </p>

                    {/* Google Account Association Box */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
                        <span>Conta Google Vinculada:</span>
                        {hasEmailLinked ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-bold text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Vinculado
                          </span>
                        ) : (
                          <span className="text-amber-700 flex items-center gap-1 font-bold text-[10px]">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pendente Vínculo
                          </span>
                        )}
                      </div>

                      {isEditingEmail ? (
                        <div className="space-y-2 pt-1">
                          <input
                            type="email"
                            placeholder="exemplo@gmail.com"
                            value={emailInputValue}
                            onChange={(e) => setEmailInputValue(e.target.value)}
                            className="w-full text-xs p-1.5 border border-slate-300 rounded-xs focus:outline-hidden focus:border-[#4B5320]"
                          />
                          {users.length > 0 && (
                            <div className="text-[10px] text-slate-500">
                              <span>Ou selecione usuário recente:</span>
                              <select
                                onChange={(e) => setEmailInputValue(e.target.value)}
                                className="w-full mt-1 text-[11px] p-1 border border-slate-200 rounded-xs bg-slate-50"
                                defaultValue=""
                              >
                                <option value="" disabled>Selecionar da lista de logins...</option>
                                {users.map((u) => (
                                  <option key={u.id} value={u.email || ''}>
                                    {u.warName || u.name} ({u.email || 'sem e-mail'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveCommissionEmail(member.id)}
                              disabled={isSaving}
                              className="flex-1 py-1.5 px-2 bg-[#4B5320] hover:bg-[#3d441a] text-white font-bold text-xs rounded-xs transition cursor-pointer"
                            >
                              {isSaving ? 'Salvando...' : 'Salvar Vínculo'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingEmailForUserId(null);
                                setEmailInputValue('');
                              }}
                              className="py-1.5 px-2 bg-slate-200 text-slate-700 text-xs rounded-xs hover:bg-slate-300 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-xs border border-slate-200">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px] truncate">
                              {member.linkedEmail || 'Nenhum e-mail vinculado'}
                            </span>
                          </div>

                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingEmailForUserId(member.id);
                                setEmailInputValue(member.linkedEmail || '');
                              }}
                              className="text-[11px] text-[#4B5320] font-bold hover:underline shrink-0 cursor-pointer flex items-center gap-1"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>{hasEmailLinked ? 'Alterar' : 'Vincular'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role switch dropdown for admin */}
                  {isAdmin && member.role !== 'admin' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">Alterar Atribuição:</span>
                      <select
                        value={member.role}
                        disabled={isSaving}
                        onChange={(e) => handleCommissionRoleChange(member.id, e.target.value as UserRole)}
                        className="text-xs bg-white border border-slate-300 rounded-xs py-1 px-1.5 font-medium text-slate-800 focus:outline-hidden"
                      >
                        <option value="presidente">Presidente</option>
                        <option value="vice_presidente">Vice-Presidente</option>
                        <option value="tesoureiro_1">1º Tesoureiro</option>
                        <option value="tesoureiro_2">2º Tesoureiro</option>
                        <option value="tesoureiro_3">3º Tesoureiro</option>
                        <option value="eventos_patrimonio">Eventos/Patrimônio</option>
                        <option value="visualizador">Aluno (Visualizador)</option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3 & 4: ALL USERS / SUSPENDED TABLE */}
      {(activeSubTab === 'todos' || activeSubTab === 'suspensos') && (
        <div className="bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase text-[#1A2421] tracking-wider flex items-center gap-2 font-institutional">
                <UserCheck className="w-4 h-4 text-[#4B5320]" />
                {activeSubTab === 'suspensos' ? 'Usuários com Acesso Suspenso' : 'Todos os Integrantes Registrados'} ({filteredAllUsers.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Sincronização em tempo real das credenciais de acesso via Cloud Firestore.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Nome / Integrante</th>
                  <th className="py-3 px-4">Nome de Guerra / Função</th>
                  <th className="py-3 px-4">Conta Google</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Perfil / Permissão</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Ações Administrativas</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAllUsers.map((u) => {
                  const isCurrentSessionUser = u.id === currentUser?.id || u.email === currentUser?.email;
                  const isSaving = savingUserId === u.id;
                  const isSuspended = u.status === 'suspended' || u.status === 'rejected';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isCurrentSessionUser ? 'bg-amber-50/40' : ''
                      } ${isSuspended ? 'opacity-70 bg-red-50/30' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#4B5320] text-white font-bold flex items-center justify-center text-xs border border-[#D4AF37]/40 overflow-hidden shrink-0">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name?.substring(0, 2).toUpperCase() || 'OF'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.name}</p>
                            {isCurrentSessionUser && (
                              <span className="text-[10px] text-[#4B5320] font-semibold">
                                (Você • Sessão Atual)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{u.warName}</div>
                        <div className="text-[11px] text-slate-400">{u.department || 'Grêmio NPOR'}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {u.email || '—'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-xs ${
                            u.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : u.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-red-100 text-red-800 border-red-300'
                          }`}
                        >
                          {u.status === 'approved'
                            ? 'Aprovado'
                            : u.status === 'pending'
                            ? 'Pendente'
                            : u.status === 'suspended'
                            ? 'Suspenso'
                            : 'Rejeitado'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-xs ${
                            ROLE_LABELS[u.role]?.badgeColor || 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {ROLE_LABELS[u.role]?.label || u.role}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {u.role !== 'admin' && (
                              <>
                                <select
                                  value={u.role}
                                  disabled={isSaving}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                  className="text-xs bg-white border border-slate-300 rounded-xs py-1 px-2 font-medium text-slate-800 focus:outline-hidden"
                                >
                                  <option value="visualizador">Visualizador</option>
                                  <option value="presidente">Presidente</option>
                                  <option value="vice_presidente">Vice-Presidente</option>
                                  <option value="tesoureiro_1">1º Tesoureiro</option>
                                  <option value="tesoureiro_2">2º Tesoureiro</option>
                                  <option value="tesoureiro_3">3º Tesoureiro</option>
                                  <option value="eventos_patrimonio">Eventos/Patrimônio</option>
                                  <option value="admin">Administrador</option>
                                </select>

                                <button
                                  onClick={() => handleToggleSuspend(u)}
                                  disabled={isSaving}
                                  title={isSuspended ? 'Reativar usuário' : 'Suspender acesso'}
                                  className={`px-2 py-1 text-[11px] font-bold rounded-xs transition cursor-pointer ${
                                    isSuspended
                                      ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                      : 'bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700'
                                  }`}
                                >
                                  {isSuspended ? 'Reativar' : 'Suspender'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LGPD & Security Notice */}
      <div className="p-5 bg-white border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
          <Lock className="w-4 h-4 text-[#4B5320]" />
          Diretrizes de Segurança da Informação Militar e LGPD
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-4 bg-slate-50 border border-slate-200">
            <span className="text-amber-800 font-bold block mb-1 uppercase tracking-wider text-[11px]">
              Proteção de Dados Sensíveis
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Dados bancários, chaves PIX e CPFs de terceiros são filtrados para alunos visualizadores, exibindo dados transparentes de prestação de contas com conformidade.
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200">
            <span className="text-[#4B5320] font-bold block mb-1 uppercase tracking-wider text-[11px]">
              Identificação Militar e Nome de Guerra
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Toda ação, conciliação e lançamento contábil registra na trilha de auditoria o nome de guerra e posto do integrante responsável.
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200">
            <span className="text-blue-800 font-bold block mb-1 uppercase tracking-wider text-[11px]">
              Acesso da Turma (Visualizadores)
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Alunos aprovados possuem consulta irrestrita aos balancetes e relatórios, com bloqueio total de exclusão, edição ou sincronização do Google Drive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
