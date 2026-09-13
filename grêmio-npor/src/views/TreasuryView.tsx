import React, { useState } from 'react';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  UserRole,
  DocumentRecord,
} from '../types';
import {
  canCreateTransaction,
  canEditTransaction,
  canDeleteTransaction,
  isReadOnlyRole,
} from '../utils/permissions';
import { AppState, formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
import {
  Landmark,
  Plus,
  Filter,
  Search,
  FileCheck2,
  FileX,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Ban,
  Calendar,
  Layers,
  Building2,
  FileText,
  Download,
  Eye,
  Info,
  FolderSync,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';

interface TreasuryViewProps {
  appState: AppState;
  userRole: UserRole;
  onAddTransaction: (tx: Transaction) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  onCancelTransaction: (id: string, reason: string) => void;
  onOpenDocument: (docId: string) => void;
}

export const TreasuryView: React.FC<TreasuryViewProps> = ({
  appState,
  userRole,
  onAddTransaction,
  onUpdateTransaction,
  onCancelTransaction,
  onOpenDocument,
}) => {
  const { transactions, documents, config } = appState;
  const canCreate = canCreateTransaction(userRole);
  const canEdit = canEditTransaction(userRole);
  const canDelete = canDeleteTransaction(userRole);
  const isReadOnly = isReadOnlyRole(userRole);

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'pagar_receber' | 'fornecedores' | 'fechamento'>('lancamentos');

  // Filters
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterCategory, setFilterCategory] = useState<string>('todas');
  const [filterReceiptStatus, setFilterReceiptStatus] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for New Transaction
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [newTxType, setNewTxType] = useState<TransactionType>('despesa');
  const [newTxDesc, setNewTxDesc] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTxDueDate, setNewTxDueDate] = useState('');
  const [newTxCategory, setNewTxCategory] = useState('Eventos e Confraternizações');
  const [newTxPaymentMethod, setNewTxPaymentMethod] = useState<PaymentMethod>('pix');
  const [newTxBeneficiary, setNewTxBeneficiary] = useState('');
  const [newTxInstallmentsCount, setNewTxInstallmentsCount] = useState(1);
  const [newTxReceiptRequired, setNewTxReceiptRequired] = useState(true);
  const [newTxResponsible, setNewTxResponsible] = useState(appState.currentUser.warName);
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  // Cancellation Modal State
  const [txToCancel, setTxToCancel] = useState<Transaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Traceability & Origin Modal State
  const [selectedTxForDetails, setSelectedTxForDetails] = useState<Transaction | null>(null);

  // Calculations
  const computedTotalRevenues = transactions
    .filter((t) => t.type === 'receita' && (t.status === 'recebida' || t.status === 'paga'))
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

  const computedTotalPaidExpenses = transactions
    .filter((t) => t.type === 'despesa' && (t.status === 'paga' || t.status === 'recebida'))
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

  const totalRevenues = typeof config.totalRealRevenue === 'number' ? config.totalRealRevenue : computedTotalRevenues;
  const totalPaidExpenses = typeof config.totalRealExpenses === 'number' ? config.totalRealExpenses : computedTotalPaidExpenses;

  const totalPendingExpenses = transactions
    .filter((t) => t.type === 'despesa' && t.status === 'pendente')
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

  const totalPendingRevenues = transactions
    .filter((t) => t.type === 'receita' && t.status === 'pendente')
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

  const netBalance = typeof config.currentCashBalance === 'number'
    ? config.currentCashBalance
    : (config.initialBalance || 0) + totalRevenues - totalPaidExpenses;

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    if (t.isArchived) return false;
    if (filterType !== 'todos' && t.type !== filterType) return false;
    if (filterCategory !== 'todas' && t.category !== filterCategory) return false;

    if (filterReceiptStatus === 'com_comprovante' && !t.receiptDocumentId) return false;
    if (filterReceiptStatus === 'sem_comprovante' && (t.receiptDocumentId || !t.receiptRequired)) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCode = t.code.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchBene = t.beneficiaryName.toLowerCase().includes(q);
      const matchResp = t.responsibleUser.toLowerCase().includes(q);
      if (!matchCode && !matchDesc && !matchBene && !matchResp) return false;
    }

    return true;
  });

  // Extract unique categories
  const categories = Array.from(new Set(transactions.map((t) => t.category)));

  // Unique suppliers
  const suppliers = Array.from(
    new Set(
      transactions
        .filter((t) => t.beneficiaryName && t.beneficiaryName.trim() !== '')
        .map((t) => t.beneficiaryName)
    )
  );

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newTxAmount.replace(/\./g, '').replace(',', '.')) || 0;
    if (amountNum <= 0) return;

    const nextNumber = transactions.length + 1;
    const code = `NPOR-2026-${newTxType === 'receita' ? 'REC' : 'DES'}-${String(nextNumber).padStart(3, '0')}`;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      code,
      type: newTxType,
      date: newTxDate,
      dueDate: newTxDueDate || undefined,
      description: newTxDesc,
      category: newTxCategory,
      amount: amountNum,
      paymentMethod: newTxPaymentMethod,
      status: newTxDueDate && new Date(newTxDueDate) > new Date() ? 'pendente' : (newTxType === 'receita' ? 'recebida' : 'paga'),
      beneficiaryName: newTxBeneficiary || (newTxType === 'receita' ? 'Alunos do Grêmio' : 'Fornecedor Não Identificado'),
      receiptDocumentId: selectedDocId || undefined,
      receiptRequired: newTxReceiptRequired,
      responsibleUser: newTxResponsible,
      installmentsCount: newTxInstallmentsCount,
      currentInstallment: 1,
      createdAt: new Date().toISOString(),
    };

    onAddTransaction(newTx);
    setIsNewTxModalOpen(false);

    // Reset fields
    setNewTxDesc('');
    setNewTxAmount('');
    setNewTxBeneficiary('');
    setSelectedDocId('');
  };

  const handleConfirmCancel = () => {
    if (!txToCancel || !cancelReason.trim()) return;
    onCancelTransaction(txToCancel.id, cancelReason);
    setTxToCancel(null);
    setCancelReason('');
  };

  const handlePayInstallment = (tx: Transaction) => {
    onUpdateTransaction({
      ...tx,
      status: 'paga',
      paidAt: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#4B5320] text-white border border-[#D4AF37]/50">
              Diretoria Financeira
            </span>
            <span className="text-xs text-slate-500">Livro Caixa Geral do NPOR</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A2421] mt-1.5 font-institutional flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#4B5320]" />
            Tesouraria Geral do Grêmio
          </h2>
          <p className="text-xs text-slate-500">
            Registro, conferência e quitação de receitas, despesas e parcelas com comprovação documental.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsNewTxModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            Novo Lançamento no Livro
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2.5 rounded-sm">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Modo Consulta e Transparência:</strong> Como integrante da Turma, você possui acesso irrestrito para visualização e prestação de contas dos lançamentos e comprovantes contábeis do Grêmio.
          </span>
        </div>
      )}

      {/* Mini Financial Summary Cards - Geometric Balance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-4 bg-white border-l-4 border-[#4B5320] border-t border-r border-b border-slate-200 shadow-sm">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Saldo Atual em Caixa</span>
          <span className="text-xl font-bold font-mono text-[#1A2421] mt-1 block">
            {formatCurrencyPtBr(netBalance)}
          </span>
        </div>
        <div className="p-4 bg-white border-l-4 border-[#D4AF37] border-t border-r border-b border-slate-200 shadow-sm">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Receitas Arrecadadas</span>
          <span className="text-xl font-bold font-mono text-[#1A2421] mt-1 block">
            {formatCurrencyPtBr(totalRevenues)}
          </span>
        </div>
        <div className="p-4 bg-white border-l-4 border-red-500 border-t border-r border-b border-slate-200 shadow-sm">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Despesas Pagas</span>
          <span className="text-xl font-bold font-mono text-red-600 mt-1 block">
            {formatCurrencyPtBr(totalPaidExpenses)}
          </span>
        </div>
        <div className="p-4 bg-white border-l-4 border-blue-500 border-t border-r border-b border-slate-200 shadow-sm">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Contas a Pagar (Pendentes)</span>
          <span className="text-xl font-bold font-mono text-amber-600 mt-1 block">
            {formatCurrencyPtBr(totalPendingExpenses)}
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-3">
        <button
          onClick={() => setActiveTab('lancamentos')}
          className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'lancamentos'
              ? 'border-[#4B5320] text-[#1A2421]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Livro de Lançamentos ({filteredTransactions.length})
        </button>
        <button
          onClick={() => setActiveTab('pagar_receber')}
          className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'pagar_receber'
              ? 'border-[#4B5320] text-[#1A2421]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Contas a Pagar & Receber
        </button>
        <button
          onClick={() => setActiveTab('fornecedores')}
          className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'fornecedores'
              ? 'border-[#4B5320] text-[#1A2421]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Fornecedores Cadastrados ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: Livro de Lançamentos */}
      {activeTab === 'lancamentos' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white border border-slate-200 shadow-sm flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por código, fornecedor, descrição..."
                  className="w-full bg-white border border-slate-300 rounded-none pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4B5320]"
                />
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-slate-300 rounded-none px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#4B5320]"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="receita">Apenas Receitas (+)</option>
                <option value="despesa">Apenas Despesas (-)</option>
                <option value="transferencia">Transferências</option>
              </select>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-white border border-slate-300 rounded-none px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#4B5320]"
              >
                <option value="todas">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Receipt Status Filter */}
              <select
                value={filterReceiptStatus}
                onChange={(e) => setFilterReceiptStatus(e.target.value)}
                className="bg-white border border-slate-300 rounded-none px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#4B5320]"
              >
                <option value="todos">Todos Comprovantes</option>
                <option value="com_comprovante">Com Comprovante Anexo</option>
                <option value="sem_comprovante">SEM Comprovante (Pendente)</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Código / Data</th>
                    <th className="py-3 px-4">Descrição & Beneficiário</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Comprovante</th>
                    <th className="py-3 px-4 text-right">Valor (R$)</th>
                    <th className="py-3 px-4 text-center">Situação</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhuma transação encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isExpense = tx.type === 'despesa';
                      const hasDoc = !!tx.receiptDocumentId;
                      const isOverdue =
                        tx.status === 'pendente' &&
                        tx.dueDate &&
                        new Date(tx.dueDate) < new Date();

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50 transition group"
                        >
                          {/* Code and Date */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-[#1A2421] text-xs">
                              {tx.code}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {formatDatePtBr(tx.date)}
                            </div>
                          </td>

                          {/* Description & Beneficiary */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#1A2421] text-xs">
                              {tx.description}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{tx.beneficiaryName || 'Não especificado'}</span>
                              <span className="text-slate-400">• Resp: {tx.responsibleUser}</span>
                            </div>
                            {(tx.origin === 'Google Drive' || tx.source === 'Google Drive' || tx.autoCreated) && (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 font-mono font-medium">
                                  <FolderSync className="w-2.5 h-2.5 text-blue-600" />
                                  Origem: Google Drive
                                </span>
                                {tx.sourceFileName && (
                                  <span className="text-slate-500 font-mono text-[10px]">
                                    {tx.sourceFileName}
                                    {tx.sourceSheetName && ` (${tx.sourceSheetName})`}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 border border-slate-300 text-slate-700">
                              {tx.category}
                            </span>
                          </td>

                          {/* Receipt Indicator */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {hasDoc ? (
                              <button
                                onClick={() => onOpenDocument(tx.receiptDocumentId!)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition"
                                title="Ver documento comprobatório anexado"
                              >
                                <FileCheck2 className="w-3 h-3 text-emerald-700" />
                                <span>Anexado</span>
                              </button>
                            ) : tx.receiptRequired ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-800 border border-red-300 animate-pulse"
                                title="Exigência legal: este pagamento não possui comprovante anexado!"
                              >
                                <FileX className="w-3 h-3 text-red-600" />
                                <span>Sem Comprovante</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Não exigido</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span
                              className={`font-mono font-bold text-xs ${
                                isExpense ? 'text-red-600' : 'text-[#4B5320]'
                              }`}
                            >
                              {isExpense ? '-' : '+'} {formatCurrencyPtBr(tx.amount)}
                            </span>
                            <div className="text-[10px] text-slate-500 capitalize">
                              {tx.paymentMethod}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                                tx.status === 'paga' || tx.status === 'recebida'
                                  ? 'bg-[#4B5320]/15 text-[#4B5320] border-[#4B5320]/40'
                                  : tx.status === 'cancelada'
                                  ? 'bg-slate-100 text-slate-500 border-slate-300'
                                  : isOverdue
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              {isOverdue ? 'Vencida' : tx.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedTxForDetails(tx)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-[#4B5320] transition"
                                title="Ver Histórico de Origem e Rastreabilidade"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>

                              {hasDoc && (
                                <button
                                  onClick={() => onOpenDocument(tx.receiptDocumentId!)}
                                  className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-white"
                                  title="Ver Comprovante"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canEdit && tx.status === 'pendente' && (
                                <button
                                  onClick={() => handlePayInstallment(tx)}
                                  className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[10px] font-medium"
                                  title="Dar baixa / Quitar"
                                >
                                  Quitar
                                </button>
                              )}

                              {canDelete && tx.status !== 'cancelada' && (
                                <button
                                  onClick={() => setTxToCancel(tx)}
                                  className="p-1 rounded hover:bg-red-100 text-stone-400 hover:text-red-700 transition cursor-pointer"
                                  title="Cancelar lançamento com justificativa formal"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Contas a Pagar & Receber */}
      {activeTab === 'pagar_receber' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contas a Pagar (Despesas Pendentes) */}
            <div className="bg-white border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4" />
                  Contas a Pagar (Fornecedores & Parcelas)
                </h3>
                <span className="font-mono font-bold text-[#1A2421] text-xs">
                  {formatCurrencyPtBr(totalPendingExpenses)}
                </span>
              </div>

              <div className="space-y-2">
                {transactions
                  .filter((t) => t.type === 'despesa' && t.status === 'pendente')
                  .map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-slate-50 border border-slate-200 flex justify-between items-center hover:border-[#4B5320] transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#1A2421] text-xs">{t.code}</span>
                          <span className="text-slate-700 font-bold text-xs">{t.description}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Vencimento: <strong className="text-slate-700">{formatDatePtBr(t.dueDate)}</strong> • {t.beneficiaryName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-red-600 text-xs block">
                          {formatCurrencyPtBr(t.amount)}
                        </span>
                        {canEdit && (
                          <div className="mt-1">
                            <button
                              onClick={() => handlePayInstallment(t)}
                              className="px-2.5 py-0.5 bg-[#4B5320] hover:bg-[#3d441a] text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Dar Baixa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Contas a Receber */}
            <div className="bg-white border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-[#4B5320] uppercase tracking-widest flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-[#4B5320]" />
                  Contas a Receber (Cotas e Mensalidades)
                </h3>
                <span className="font-mono font-bold text-[#1A2421] text-xs">
                  {formatCurrencyPtBr(totalPendingRevenues)}
                </span>
              </div>

              <div className="space-y-2">
                {transactions
                  .filter((t) => t.type === 'receita' && t.status === 'pendente')
                  .map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-slate-50 border border-slate-200 flex justify-between items-center hover:border-[#4B5320] transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#1A2421] text-xs">{t.code}</span>
                        <p className="text-slate-700 font-bold text-xs">{t.description}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Previsto: {formatDatePtBr(t.dueDate)}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#4B5320] text-xs">
                          {formatCurrencyPtBr(t.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Fornecedores Cadastrados */}
      {activeTab === 'fornecedores' && (
        <div className="bg-white border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A2421]">
              Relação de Empresas e Fornecedores Contratados
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Consolidado de pagamentos efetuados e contratos com o Grêmio do NPOR.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suppliers.map((sup, idx) => {
              const txsOfSupplier = transactions.filter((t) => t.beneficiaryName === sup);
              const totalPaidToSupplier = txsOfSupplier
                .filter((t) => t.status === 'paga')
                .reduce((s, t) => s + t.amount, 0);

              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 border border-slate-200 hover:border-[#4B5320] transition-colors space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#1A2421] text-white flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1A2421] text-xs">{sup}</p>
                      <p className="text-[10px] text-slate-500">
                        {txsOfSupplier.length} lançamento(s) associado(s)
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Total Liquidado:</span>
                    <span className="font-mono font-bold text-[#4B5320]">
                      {formatCurrencyPtBr(totalPaidToSupplier)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: New Transaction Form */}
      {isNewTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 bg-[#1A2421] text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] font-institutional">
                Novo Lançamento no Livro Caixa
              </h3>
              <button
                onClick={() => setIsNewTxModalOpen(false)}
                className="text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700">
              {/* Type toggle */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewTxType('despesa')}
                  className={`py-2 font-bold uppercase text-xs transition border ${
                    newTxType === 'despesa'
                      ? 'bg-red-600 text-white border-red-700'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  Despesa (-)
                </button>
                <button
                  type="button"
                  onClick={() => setNewTxType('receita')}
                  className={`py-2 font-bold uppercase text-xs transition border ${
                    newTxType === 'receita'
                      ? 'bg-[#4B5320] text-white border-[#3d441a]'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  Receita (+)
                </button>
                <button
                  type="button"
                  onClick={() => setNewTxType('transferencia')}
                  className={`py-2 font-bold uppercase text-xs transition border ${
                    newTxType === 'transferencia'
                      ? 'bg-[#1A2421] text-white border-black'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  Transferência
                </button>
              </div>

              {/* Description & Value */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Descrição do Lançamento</label>
                  <input
                    type="text"
                    required
                    value={newTxDesc}
                    onChange={(e) => setNewTxDesc(e.target.value)}
                    placeholder="Ex: Aquisição de troféus para o torneio Duque de Caxias"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    required
                    value={newTxAmount}
                    onChange={(e) => setNewTxAmount(e.target.value)}
                    placeholder="Ex: 850,00"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 font-mono text-sm focus:outline-none focus:border-[#4B5320]"
                  />
                </div>
              </div>

              {/* Beneficiary & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {newTxType === 'receita' ? 'Pagador / Origem' : 'Fornecedor / Beneficiário'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTxBeneficiary}
                    onChange={(e) => setNewTxBeneficiary(e.target.value)}
                    placeholder="Ex: Troféus & Medalhas Militares Ltda"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Categoria</label>
                  <select
                    value={newTxCategory}
                    onChange={(e) => setNewTxCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                  >
                    <option value="Eventos e Confraternizações">Eventos e Confraternizações</option>
                    <option value="Festa de Formatura">Festa de Formatura</option>
                    <option value="Material Esportivo">Material Esportivo</option>
                    <option value="Comunicação e Uniformes">Comunicação e Uniformes</option>
                    <option value="Arrecadação e Cotas">Arrecadação e Cotas</option>
                    <option value="Despesas Administrativas">Despesas Administrativas</option>
                  </select>
                </div>
              </div>

              {/* Date & Due Date & Method */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Data do Lançamento</label>
                  <input
                    type="date"
                    required
                    value={newTxDate}
                    onChange={(e) => setNewTxDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={newTxDueDate}
                    onChange={(e) => setNewTxDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Forma de Pagamento</label>
                  <select
                    value={newTxPaymentMethod}
                    onChange={(e) => setNewTxPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none"
                  >
                    <option value="pix">PIX Oficial</option>
                    <option value="transferencia">TED / Transferência</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="cartao">Cartão da Conta</option>
                    <option value="dinheiro">Espécie / Caixinha</option>
                  </select>
                </div>
              </div>

              {/* Link Document */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Vincular Comprovante Digital já importado
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none text-xs"
                >
                  <option value="">Nenhum (anexar posteriormente ou registrar pendência)</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({formatCurrencyPtBr(d.detectedAmount || 0)}) - {d.detectedPersonOrCompany || d.source}
                    </option>
                  ))}
                </select>
              </div>

              {/* Controls */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4B5320] hover:bg-[#3d441a] text-white font-bold uppercase text-xs shadow-sm transition-colors"
                >
                  Registrar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Justified Cancellation */}
      {txToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-300 shadow-2xl p-6 space-y-4 text-slate-700">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A2421]">Cancelamento Formal de Lançamento</h3>
            </div>
            <p className="text-xs text-slate-700">
              Você está cancelando a movimentação <strong className="text-[#1A2421] font-mono">{txToCancel.code}</strong> no valor de{' '}
              <strong className="text-red-600">{formatCurrencyPtBr(txToCancel.amount)}</strong>.
            </p>
            <p className="text-[11px] text-slate-500">
              Em conformidade com a auditoria militar, nenhum lançamento é excluído permanentemente. Um registro de estorno/cancelamento com justificativa será gravado na trilha de auditoria.
            </p>

            <div>
              <label className="block text-slate-700 font-bold text-xs mb-1">
                Justificativa Obrigatória do Tesoureiro:
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Lançamento em duplicidade verificado no extrato da conta corrente..."
                className="w-full bg-white border border-slate-300 p-2.5 text-slate-800 text-xs focus:outline-none focus:border-[#4B5320]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTxToCancel(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold uppercase"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Histórico de Origem e Rastreabilidade */}
      {selectedTxForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-slate-300 shadow-2xl p-6 space-y-4 text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#4B5320]" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A2421]">
                    Rastreabilidade & Histórico de Origem
                  </h3>
                  <span className="font-mono text-[11px] text-slate-500">
                    Lançamento {selectedTxForDetails.code}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTxForDetails(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 space-y-1">
              <div className="text-xs font-bold text-[#1A2421]">
                {selectedTxForDetails.description}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Valor Contábil:</span>
                <span className={`font-mono font-bold ${selectedTxForDetails.type === 'despesa' ? 'text-red-600' : 'text-[#4B5320]'}`}>
                  {selectedTxForDetails.type === 'despesa' ? '-' : '+'} {formatCurrencyPtBr(selectedTxForDetails.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Data de Competência:</span>
                <span className="text-slate-700 font-medium">{formatDatePtBr(selectedTxForDetails.date)}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-white border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Origem</span>
                  <strong className="text-slate-800 flex items-center gap-1 mt-0.5">
                    <FolderSync className="w-3.5 h-3.5 text-blue-600" />
                    {selectedTxForDetails.origin || selectedTxForDetails.source || 'Manual'}
                  </strong>
                </div>
                <div className="p-2.5 bg-white border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Criado Automaticamente</span>
                  <strong className="text-slate-800 block mt-0.5">
                    {selectedTxForDetails.autoCreated ? 'Sim (Sem digitação manual)' : 'Lançamento Manual'}
                  </strong>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 space-y-1.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Arquivo de Origem</span>
                  <strong className="text-slate-800 block">
                    {selectedTxForDetails.sourceFileName || (selectedTxForDetails.source === 'Google Drive' ? 'PLANILHA MÃE' : 'Inserção Manual')}
                  </strong>
                </div>

                {selectedTxForDetails.sourceSheetName && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Planilha / Aba / Linha</span>
                    <span className="text-slate-700 font-mono text-[11px]">
                      Aba: <strong>{selectedTxForDetails.sourceSheetName}</strong> • {selectedTxForDetails.sourceRowId || 'Linha mapeada'}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Categoria Atribuída</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/30 inline-block mt-0.5">
                    {selectedTxForDetails.category}
                  </span>
                </div>

                {selectedTxForDetails.creationReason && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Evidência / Motivo do Lançamento</span>
                    <p className="text-[11px] text-slate-600 italic mt-0.5">
                      "{selectedTxForDetails.creationReason}"
                    </p>
                  </div>
                )}

                {(selectedTxForDetails.syncedAt || selectedTxForDetails.lastSyncedAt) && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Data e Hora da Sincronização</span>
                    <span className="text-[11px] text-slate-600 font-mono">
                      {new Date(selectedTxForDetails.syncedAt || selectedTxForDetails.lastSyncedAt!).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              {selectedTxForDetails.originalFileUrl ? (
                <a
                  href={selectedTxForDetails.originalFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir Arquivo no Google Drive
                </a>
              ) : selectedTxForDetails.receiptDocumentId ? (
                <button
                  onClick={() => {
                    const docId = selectedTxForDetails.receiptDocumentId;
                    setSelectedTxForDetails(null);
                    onOpenDocument(docId!);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
                  Ver Comprovante Anexado
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">Sem link direto disponível</span>
              )}

              <button
                type="button"
                onClick={() => setSelectedTxForDetails(null)}
                className="px-4 py-1.5 bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold uppercase tracking-wider transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
