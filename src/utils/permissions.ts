import { UserRole } from '../types';

/**
 * Funções centralizadas de verificação de permissões do Grêmio NPOR (RBAC).
 * Garantem a separação estrita entre Administrador, Comissão Oficial e Alunos da Turma (Visualizadores).
 */

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function isPresidency(role: UserRole): boolean {
  return role === 'presidente' || role === 'vice_presidente';
}

export function isTreasuryRole(role: UserRole): boolean {
  return [
    'admin',
    'tesoureiro_1',
    'tesoureiro_2',
    'tesoureiro_3',
    'tesouraria',
  ].includes(role);
}

export function isEventsRole(role: UserRole): boolean {
  return [
    'admin',
    'eventos_patrimonio',
    'eventos',
    'diretor_eventos',
    'comissao_formatura',
  ].includes(role);
}

export function isReadOnlyRole(role: UserRole): boolean {
  return [
    'visualizador',
    'aluno',
    'membro_consulta',
    'visitante_publico',
  ].includes(role);
}

// Permissão de Gerenciar Usuários e Perfis (somente Administrador)
export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

// Permissão de Configurar Parâmetros do Sistema (somente Administrador)
export function canConfigureSystem(role: UserRole): boolean {
  return role === 'admin';
}

// Permissão de Personalização da Interface, Cores e Imagens (exclusivo Administrador Geral)
export function canCustomizeInterface(role: UserRole): boolean {
  return role === 'admin';
}

// Permissão de Sincronizar Google Drive (Administrador, Presidência e 1º Tesoureiro)
export function canSyncDrive(role: UserRole): boolean {
  return ['admin', 'presidente', 'vice_presidente', 'tesoureiro_1', 'tesouraria'].includes(role);
}

// Permissão de Criar Lançamento Financeiro
export function canCreateTransaction(role: UserRole, type?: 'receita' | 'despesa'): boolean {
  if (role === 'admin' || role === 'tesoureiro_1' || role === 'tesouraria') return true;
  if (role === 'tesoureiro_2' && (!type || type === 'receita')) return true;
  if (role === 'tesoureiro_3' && (!type || type === 'despesa')) return true;
  if (role === 'eventos_patrimonio' && type === 'despesa') return true;
  return false;
}

// Permissão de Editar Lançamento Financeiro
export function canEditTransaction(role: UserRole): boolean {
  return ['admin', 'tesoureiro_1', 'tesoureiro_2', 'tesoureiro_3', 'tesouraria'].includes(role);
}

// Permissão de Excluir / Cancelar Lançamento Financeiro
export function canDeleteTransaction(role: UserRole): boolean {
  return ['admin', 'tesoureiro_1', 'tesouraria'].includes(role);
}

// Permissão de Anexar e Vincular Comprovantes / Documentos
export function canManageDocuments(role: UserRole): boolean {
  return [
    'admin',
    'tesoureiro_1',
    'tesoureiro_2',
    'tesoureiro_3',
    'eventos_patrimonio',
    'tesouraria',
    'eventos',
  ].includes(role);
}

// Permissão de Executar / Reprocessar OCR
export function canRunOcr(role: UserRole): boolean {
  return ['admin', 'tesoureiro_1', 'tesoureiro_3', 'tesouraria'].includes(role);
}

// Permissão de Gestão de Eventos e Atividades
export function canManageEvents(role: UserRole): boolean {
  return [
    'admin',
    'eventos_patrimonio',
    'eventos',
    'diretor_eventos',
    'comissao_formatura',
    'presidente',
    'vice_presidente',
  ].includes(role);
}

// Permissão de Gestão de Mensalidades e Cobranças
export function canManageMonthlyFees(role: UserRole): boolean {
  return ['admin', 'tesoureiro_1', 'tesoureiro_2', 'tesouraria'].includes(role);
}

// Permissão de Gestão de Rifas
export function canManageRaffles(role: UserRole): boolean {
  return ['admin', 'tesoureiro_1', 'tesoureiro_2', 'tesouraria'].includes(role);
}

// Permissão de Gestão de Categorias e Projetos
export function canManageCategories(role: UserRole): boolean {
  return ['admin', 'tesoureiro_1', 'tesouraria'].includes(role);
}
