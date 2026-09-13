import React, { useState } from 'react';
import { AppState, formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
import { OFFICIAL_CATEGORIES, getFolderDisplayStatus } from '../services/googleDriveService';
import { UserRole } from '../types';
import { canSyncDrive } from '../utils/permissions';
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  Clock,
  GraduationCap,
  ShieldAlert,
  Calendar,
  FileCheck2,
  PlusCircle,
  Upload,
  FileSpreadsheet,
  FolderSync,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface DashboardViewProps {
  appState: AppState;
  userRole?: UserRole;
  onNavigate: (view: string, targetId?: string) => void;
  onOpenNewTxModal?: () => void;
  onSyncGoogleDrive?: () => Promise<void> | void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  appState,
  userRole = 'admin',
  onNavigate,
  onSyncGoogleDrive,
}) => {
  const { config, transactions, graduationGeneral, alerts, events } = appState;
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Real financial calculations
  const computedTotalRevenues = transactions
    .filter((t) => t && t.type === 'receita' && (t.status === 'recebida' || t.status === 'paga'))
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

  const computedTotalPaidExpenses = transactions
    .filter((t) => t && t.type === 'despesa' && (t.status === 'paga' || t.status === 'recebida'))
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

  const totalRevenues = typeof config.totalRealRevenue === 'number' ? config.totalRealRevenue : computedTotalRevenues;
  const totalPaidExpenses = typeof config.totalRealExpenses === 'number' ? config.totalRealExpenses : computedTotalPaidExpenses;

  const totalPendingExpenses = transactions
    .filter((t) => t && t.type === 'despesa' && t.status === 'pendente')
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

  const currentBalance = typeof config.currentCashBalance === 'number'
    ? config.currentCashBalance
    : (config.initialBalance || 0) + totalRevenues - totalPaidExpenses;

  // Compliance metrics: % of paid expenses with receipts
  const paidExpenses = transactions.filter((t) => t && t.type === 'despesa' && t.status === 'paga');
  const expensesWithReceipt = paidExpenses.filter((t) => t.receiptDocumentId || (t.documentIds && t.documentIds.length > 0));
  const complianceRate =
    paidExpenses.length > 0
      ? Math.round((expensesWithReceipt.length / paidExpenses.length) * 100)
      : 100;

  // Active alerts count
  const redAlerts = alerts.filter((a) => a && a.status === 'ativo' && a.severity === 'vermelho');
  const yellowAlerts = alerts.filter((a) => a && a.status === 'ativo' && a.severity === 'amarelo');
  const blueAlerts = alerts.filter((a) => a && a.status === 'ativo' && a.severity === 'azul');

  // Next upcoming events
  const upcomingEvents = (events || [])
    .filter((e) => e && e.status !== 'concluido' && e.status !== 'cancelado')
    .slice(0, 3);

  // Next due expenses
  const upcomingDueExpenses = transactions
    .filter((t) => t && t.type === 'despesa' && t.status === 'pendente')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 4);

  // Categorias Oficiais do Google Drive mapeadas com estado estrito de sincronização
  const officialCategoriesList = OFFICIAL_CATEGORIES.map((catName) => {
    const statusInfo = appState.driveFoldersStatus?.[catName];
    const statusDisplay = getFolderDisplayStatus(statusInfo);
    return {
      name: catName,
      statusInfo,
      statusDisplay,
    };
  });

  const handleSync = async () => {
    if (onSyncGoogleDrive) {
      try {
        setIsSyncing(true);
        setSyncFeedback(null);
        await onSyncGoogleDrive();
        setSyncFeedback('Sincronização com o Google Drive concluída com sucesso!');
        setTimeout(() => setSyncFeedback(null), 5000);
      } catch (err: any) {
        setSyncFeedback(`Erro: ${err.message || 'Falha ao conectar com o Google Drive'}`);
      } finally {
        setIsSyncing(false);
      }
    } else {
      onNavigate('integrations');
    }
  };

  const graduationProgress =
    graduationGeneral && graduationGeneral.totalBudget > 0
      ? Math.min(100, Math.round((graduationGeneral.totalCollected / graduationGeneral.totalBudget) * 100))
      : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 text-slate-800">
      {/* Top Banner / Welcome */}
      <div className="bg-[#1A2421] text-white p-6 border-l-4 border-[#D4AF37] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#4B5320] text-white border border-[#D4AF37]/50">
              Portal Oficial de Gestão
            </span>
            <span className="text-xs text-slate-400">
              {config.turmaName || 'NPOR'} • {config.year || '2026'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5">
            {config.gremioName || 'Grêmio do NPOR'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {config.unitName} • Presidente: {config.presidentName || 'Não informado'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('treasury')}
            className="flex items-center gap-2 px-4 py-2 bg-[#4B5320] hover:bg-[#3b4119] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-[#D4AF37]" />
            Novo Lançamento
          </button>
          <button
            onClick={() => onNavigate('documents')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider border border-white/20 transition-colors"
          >
            <Upload className="w-4 h-4 text-[#D4AF37]" />
            Anexar Documento
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider border border-white/20 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#D4AF37]" />
            Balancete Oficial
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Líquido */}
        <div className="bg-white p-5 border-l-4 border-[#4B5320] shadow-sm border-t border-r border-b border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Saldo Líquido Real</p>
            <div className="w-7 h-7 bg-[#4B5320]/10 text-[#4B5320] flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#1A2421] font-mono">
              {formatCurrencyPtBr(currentBalance)}
            </p>
            <p className="text-[10px] text-[#4B5320] mt-1.5 font-bold">
              {typeof config.currentCashBalance === 'number'
                ? `Fonte: ${config.financialSummarySource || 'PLANILHA MÃE'}`
                : `Saldo Inicial: ${formatCurrencyPtBr(config.initialBalance || 0)}`}
            </p>
          </div>
        </div>

        {/* Card 2: Receitas Confirmadas */}
        <div className="bg-white p-5 border-l-4 border-[#D4AF37] shadow-sm border-t border-r border-b border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Receitas Reais Confirmadas</p>
            <div className="w-7 h-7 bg-[#D4AF37]/15 text-[#1A2421] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#4B5320]" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#1A2421] font-mono">
              {formatCurrencyPtBr(totalRevenues)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">
              {transactions.filter((t) => t.type === 'receita').length} entrada(s) registrada(s)
            </p>
          </div>
        </div>

        {/* Card 3: Despesas Liquidadas */}
        <div className="bg-white p-5 border-l-4 border-red-500 shadow-sm border-t border-r border-b border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Despesas Liquidadas</p>
            <div className="w-7 h-7 bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#1A2421] font-mono">
              {formatCurrencyPtBr(totalPaidExpenses)}
            </p>
            <p className="text-[10px] text-red-600 mt-1.5 font-bold">
              Contas a pagar: {formatCurrencyPtBr(totalPendingExpenses)}
            </p>
          </div>
        </div>

        {/* Card 4: Conformidade Fiscal */}
        <div className="bg-white p-5 border-l-4 border-blue-500 shadow-sm border-t border-r border-b border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Conformidade Fiscal</p>
            <div className="w-7 h-7 bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#1A2421] font-mono">
              {complianceRate}%
            </p>
            <p className="text-[10px] text-blue-700 mt-1.5 font-bold">
              {expensesWithReceipt.length} de {paidExpenses.length} com comprovante
            </p>
          </div>
        </div>
      </div>

      {/* Row: Formatura & Central de Pendências */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formatura Summary (Col Span 2) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#4B5320] text-white flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="font-bold uppercase text-xs tracking-widest text-[#1A2421]">
                  Festa de Formatura ({graduationGeneral?.venueName || 'Local a definir'})
                </h3>
                <p className="text-[11px] text-slate-500">
                  {graduationGeneral?.eventDate ? `Data: ${formatDatePtBr(graduationGeneral.eventDate)}` : 'Data não informada'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('graduation')}
              className="text-xs font-bold uppercase tracking-wider text-[#4B5320] hover:text-[#1A2421] transition"
            >
              Ver Detalhes →
            </button>
          </div>

          {/* Progress Bar: Collected vs Budget */}
          {graduationGeneral && graduationGeneral.totalBudget > 0 ? (
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-600">
                  Arrecadação Real: <strong className="text-[#1A2421] font-mono">{formatCurrencyPtBr(graduationGeneral.totalCollected || 0)}</strong>
                </span>
                <span className="text-slate-500 font-mono">
                  Meta: {formatCurrencyPtBr(graduationGeneral.totalBudget)} ({graduationProgress}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 overflow-hidden border border-slate-200">
                <div
                  className="bg-[#D4AF37] h-full transition-all duration-500"
                  style={{ width: `${graduationProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-500">
              Ainda não existem metas financeiras cadastradas para a formatura.
            </div>
          )}

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Contratado</span>
              <div className="text-xs sm:text-sm font-bold text-[#1A2421] font-mono mt-0.5">
                {formatCurrencyPtBr(graduationGeneral?.totalContracted || 0)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pago Fornecedores</span>
              <div className="text-xs sm:text-sm font-bold text-[#4B5320] font-mono mt-0.5">
                {formatCurrencyPtBr(graduationGeneral?.totalPaid || 0)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">A Pagar</span>
              <div className="text-xs sm:text-sm font-bold text-rose-600 font-mono mt-0.5">
                {formatCurrencyPtBr(graduationGeneral?.totalPending || 0)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Caixa Específico</span>
              <div className="text-xs sm:text-sm font-bold text-[#1A2421] font-mono mt-0.5">
                {formatCurrencyPtBr(graduationGeneral?.availableBalance || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Central de Pendências Box (Col Span 1) */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="font-bold uppercase text-xs tracking-widest text-[#1A2421] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Auditoria de Dados Reais
              </h3>
              <button
                onClick={() => onNavigate('alerts')}
                className="text-[10px] font-bold uppercase tracking-wider text-red-600 hover:underline"
              >
                Conferir →
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Verificações em tempo real sobre os registros existentes:
            </p>

            {/* Alert items pills */}
            <div className="space-y-2.5">
              <div className="p-3 bg-red-50 border border-red-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-600" />
                  <span className="text-xs text-red-900 font-bold">Críticas (Vermelho):</span>
                </div>
                <span className="text-xs font-bold font-mono text-red-700 bg-red-100 px-2 py-0.5 border border-red-300">
                  {redAlerts.length}
                </span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#D4AF37]" />
                  <span className="text-xs text-amber-900 font-bold">Atenção (Amarelo):</span>
                </div>
                <span className="text-xs font-bold font-mono text-amber-800 bg-amber-100 px-2 py-0.5 border border-amber-300">
                  {yellowAlerts.length}
                </span>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600" />
                  <span className="text-xs text-blue-900 font-bold">Informativas (Azul):</span>
                </div>
                <span className="text-xs font-bold font-mono text-blue-800 bg-blue-100 px-2 py-0.5 border border-blue-300">
                  {blueAlerts.length}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500">
            Regras de auditoria operam estritamente sobre documentos e lançamentos reais.
          </div>
        </div>
      </div>

      {/* Google Drive 10 Real Folders Overview */}
      <section className="bg-white border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold uppercase text-xs tracking-widest text-[#1A2421] flex items-center gap-2">
              <FolderSync className="w-4 h-4 text-[#4B5320]" />
              Estrutura Oficial de Pastas do Google Drive
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pasta Raiz Oficial: <code className="bg-slate-100 px-1 py-0.5 text-[10px] text-slate-700 font-mono">1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU</code>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canSyncDrive(userRole) ? (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4B5320] hover:bg-[#3b4119] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
                title="Executar sincronização real com Google Drive e Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Drive Agora'}
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider border border-slate-200 cursor-not-allowed"
                title="Sincronização com Google Drive restrita à Comissão Oficial"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
                Sincronização Restrita
              </span>
            )}
            <a
              href="https://drive.google.com/drive/folders/1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              Abrir Drive Oficial
            </a>
            <button
              onClick={() => onNavigate('integrations')}
              className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition"
            >
              Painel de Integração
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {officialCategoriesList.map(({ name, statusInfo, statusDisplay }) => (
            <div
              key={name}
              className="p-3 bg-slate-50 border border-slate-200 hover:border-[#4B5320] transition cursor-pointer flex flex-col justify-between"
              onClick={() => onNavigate('integrations')}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 truncate" title={name}>
                    {name}
                  </span>
                  {statusDisplay.isSynced && (
                    <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 border border-slate-200 text-slate-700">
                      {statusDisplay.count}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2.5">
                <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 ${statusDisplay.badgeClass}`}>
                  {statusDisplay.label}
                </span>
                <p className="text-[9px] text-slate-500 mt-1">
                  {!statusDisplay.isSynced
                    ? 'Aguardando sincronização'
                    : statusDisplay.count === 0
                    ? 'Pasta verificada (vazia)'
                    : `${statusDisplay.count} item(ns) verificado(s)`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Row: Contas a Vencer & Próximos Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contas a Vencer */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold uppercase text-xs tracking-widest text-[#1A2421] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4B5320]" />
              Próximos Vencimentos a Pagar
            </h3>
            <button
              onClick={() => onNavigate('treasury')}
              className="text-[10px] font-bold uppercase tracking-wider text-[#4B5320] hover:underline"
            >
              Ver Tesouraria
            </button>
          </div>

          {upcomingDueExpenses.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Nenhum registro encontrado.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingDueExpenses.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-[#4B5320] transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#1A2421]">{tx.code}</span>
                      <span className="text-xs font-medium text-slate-700">{tx.description}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Vence em: <strong className="text-slate-800">{formatDatePtBr(tx.dueDate)}</strong> • Beneficiário: {tx.beneficiaryName || 'Não especificado'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-rose-600">
                      {formatCurrencyPtBr(tx.amount)}
                    </span>
                    <div className="text-[10px] font-bold text-amber-600 uppercase">Pendente</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos Eventos do Grêmio */}
        <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold uppercase text-xs tracking-widest text-[#1A2421] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4B5320]" />
              Eventos e Atividades Cadastradas
            </h3>
            <button
              onClick={() => onNavigate('events')}
              className="text-[10px] font-bold uppercase tracking-wider text-[#4B5320] hover:underline"
            >
              Ver Eventos
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Ainda não existem informações cadastradas nesta categoria.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-[#4B5320] transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-[#1A2421]">{evt.name}</p>
                    <p className="text-[11px] text-slate-600">
                      Data: {evt.dateTime} • Local: {evt.location}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Responsável: {evt.mainResponsible}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-200 text-slate-800 border border-slate-300">
                      {evt.status.replace('_', ' ')}
                    </span>
                    <div className="text-[11px] text-slate-600 mt-1 font-mono font-semibold">
                      Previsto: {formatCurrencyPtBr(evt.budgetAllocated)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
