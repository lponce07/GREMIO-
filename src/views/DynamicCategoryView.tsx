import React, { useState, useMemo } from 'react';
import {
  Category,
  UserRole,
  Transaction,
  DocumentRecord,
} from '../types';
import {
  AppState,
  formatCurrencyPtBr,
  formatDatePtBr,
  addAuditLog,
} from '../services/dataService';
import {
  FolderKanban,
  FileText,
  DollarSign,
  Users,
  Building2,
  Calendar,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  ArrowLeft,
  Plus,
  Download,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface DynamicCategoryViewProps {
  category: Category;
  appState: AppState;
  userRole: UserRole;
  onOpenDocument?: (docId: string) => void;
  onNavigate: (view: string, targetId?: string) => void;
  onBackToCategories?: () => void;
  onUpdateCategory?: (updatedCategory: Category) => void;
  onAddTransactionToCategory?: (categoryName: string) => void;
}

export const DynamicCategoryView: React.FC<DynamicCategoryViewProps> = ({
  category,
  appState,
  userRole,
  onOpenDocument,
  onNavigate,
  onBackToCategories,
  onUpdateCategory,
  onAddTransactionToCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todas' | 'com_comprovante' | 'sem_comprovante'>('todas');
  const [activeSubTab, setActiveSubTab] = useState<'lancamentos' | 'comprovantes' | 'fornecedores' | 'regras'>('lancamentos');

  // Transações pertencentes a esta categoria
  const categoryTransactions = useMemo(() => {
    return (appState.transactions || []).filter((tx) => {
      const matchId = tx.categoryId === category.id;
      const matchName = tx.category && tx.category.toLowerCase() === category.name.toLowerCase();
      const matchSlug = tx.category && tx.category.toLowerCase().replace(/\s+/g, '-') === category.slug;
      return matchId || matchName || matchSlug;
    });
  }, [appState.transactions, category]);

  // Documentos e comprovantes desta categoria
  const categoryDocuments = useMemo(() => {
    return (appState.documents || []).filter((doc) => {
      const matchId = doc.categoryId === category.id;
      const matchName = doc.categoryName && doc.categoryName.toLowerCase() === category.name.toLowerCase();
      const matchTx = categoryTransactions.some((tx) => tx.id === doc.relatedTransactionId || (tx.documentIds && tx.documentIds.includes(doc.id)));
      return matchId || matchName || matchTx;
    });
  }, [appState.documents, category, categoryTransactions]);

  // Regras de classificação associadas a esta categoria
  const associatedRules = useMemo(() => {
    return (appState.classificationRules || []).filter(
      (r) => r.targetCategoryId === category.id || r.categoryName.toLowerCase() === category.name.toLowerCase()
    );
  }, [appState.classificationRules, category]);

  // Métricas calculadas
  const totalSpent = useMemo(() => {
    return categoryTransactions
      .filter((tx) => tx.type === 'despesa')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [categoryTransactions]);

  const totalRevenue = useMemo(() => {
    return categoryTransactions
      .filter((tx) => tx.type === 'receita')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [categoryTransactions]);

  // Fornecedores únicos e agregação
  const suppliersMap = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number; lastDate: string }>();

    categoryTransactions.forEach((tx) => {
      const sup = tx.beneficiaryName || (tx as any).beneficiary || (tx as any).supplier || 'Não especificado';
      if (!map.has(sup)) {
        map.set(sup, { name: sup, count: 0, total: 0, lastDate: tx.date });
      }
      const item = map.get(sup)!;
      item.count += 1;
      item.total += tx.amount || 0;
      if (tx.date > item.lastDate) item.lastDate = tx.date;
    });

    categoryDocuments.forEach((doc) => {
      const sup = doc.detectedSupplier || doc.detectedPersonOrCompany;
      if (sup && !map.has(sup)) {
        map.set(sup, { name: sup, count: 1, total: doc.detectedAmount || 0, lastDate: doc.date });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [categoryTransactions, categoryDocuments]);

  // Filtragem de lançamentos
  const filteredTransactions = useMemo(() => {
    return categoryTransactions.filter((tx) => {
      const matchesSearch =
        (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.beneficiaryName || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const hasReceipt = !!tx.receiptDocumentId || (tx.documentIds && tx.documentIds.length > 0);
      if (filterType === 'com_comprovante') return hasReceipt;
      if (filterType === 'sem_comprovante') return !hasReceipt;

      return true;
    });
  }, [categoryTransactions, searchTerm, filterType]);

  // Exportar relatório em CSV
  const handleExportCsv = () => {
    const headers = ['Data', 'Código', 'Descrição', 'Fornecedor/Favorecido', 'Tipo', 'Valor', 'Status Comprovante'];
    const rows = categoryTransactions.map((tx) => [
      tx.date,
      tx.code,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      `"${(tx.beneficiaryName || (tx as any).beneficiary || (tx as any).supplier || '').replace(/"/g, '""')}"`,
      tx.type,
      tx.amount.toFixed(2),
      tx.receiptDocumentId ? 'Comprovado' : 'Pendente',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_${category.slug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra de Navegação Superior / Voltar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToCategories && (
            <button
              onClick={onBackToCategories}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Voltar para Projetos e Categorias"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span
              className="cursor-pointer hover:underline text-slate-600"
              onClick={onBackToCategories}
            >
              Projetos e Categorias
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-800">{category.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar Relatório CSV
          </button>
        </div>
      </div>

      {/* Cabeçalho da Categoria com Estilo Militar Institucional */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: category.color || '#4B5320' }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-xs"
                style={{ backgroundColor: category.color || '#4B5320' }}
              >
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{category.name}</h1>
                <p className="text-xs text-slate-500 font-mono">slug: #{category.slug}</p>
              </div>

              {category.isDynamic ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Categoria Dinâmica Identificada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-300 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Categoria Oficial do Grêmio
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed pt-1">
              {category.description || `Painel contábil e documental unificado para a categoria ${category.name}.`}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Criado em: {formatDatePtBr(category.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Origem: {category.source === 'automatic' ? 'Google Drive (Classificação Automática)' : category.source === 'predefined' ? 'Oficial da Turma' : 'Criado Manualmente'}
              </span>
              {category.responsible && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Responsável: <strong className="text-slate-700">{category.responsible}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Resumo Financeiro da Categoria */}
          <div className="flex flex-wrap items-center gap-4 lg:border-l lg:border-slate-200 lg:pl-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 min-w-[160px]">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Gasto</span>
              <span className="text-2xl font-bold text-rose-700 mt-1 block">
                {formatCurrencyPtBr(totalSpent)}
              </span>
              <span className="text-[11px] text-slate-500">
                {categoryTransactions.filter((t) => t.type === 'despesa').length} despesas registradas
              </span>
            </div>

            {totalRevenue > 0 && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 min-w-[160px]">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Arrecadado</span>
                <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                  {formatCurrencyPtBr(totalRevenue)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {categoryTransactions.filter((t) => t.type === 'receita').length} receitas
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Métricas da Categoria */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lançamentos</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{categoryTransactions.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Transações na Tesouraria</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Comprovantes</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{categoryDocuments.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {categoryDocuments.filter((d) => d.auditStatus === 'conferido' || d.auditStatus === 'validado').length} conferidos
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fornecedores</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{suppliersMap.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Empresas e favorecidos</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Regras Ativas</span>
            <Tag className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{associatedRules.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Palavras-chave e critérios</p>
        </div>
      </div>

      {/* Sub-Navegação em Abas */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSubTab('lancamentos')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'lancamentos'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Lançamentos Financeiros ({categoryTransactions.length})
        </button>

        <button
          onClick={() => setActiveSubTab('comprovantes')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'comprovantes'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Comprovantes e Documentos ({categoryDocuments.length})
        </button>

        <button
          onClick={() => setActiveSubTab('fornecedores')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'fornecedores'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Fornecedores ({suppliersMap.length})
        </button>

        <button
          onClick={() => setActiveSubTab('regras')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'regras'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          Regras de Classificação ({associatedRules.length})
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: LANÇAMENTOS FINANCEIROS */}
      {activeSubTab === 'lancamentos' && (
        <div className="space-y-4">
          {/* Filtros e Busca */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por descrição, código ou fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-hidden"
              >
                <option value="todas">Todos os lançamentos</option>
                <option value="com_comprovante">Com comprovante vinculado</option>
                <option value="sem_comprovante">Sem comprovante (Pendente)</option>
              </select>
            </div>
          </div>

          {/* Tabela Exata Requisitada: | Data | Descrição | Fornecedor | Valor | Comprovante | Ações | */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Data</th>
                    <th className="py-3.5 px-4">Código</th>
                    <th className="py-3.5 px-4">Descrição</th>
                    <th className="py-3.5 px-4">Fornecedor / Favorecido</th>
                    <th className="py-3.5 px-4 text-right">Valor</th>
                    <th className="py-3.5 px-4 text-center">Comprovante</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhum lançamento financeiro encontrado para esta categoria com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const hasDoc = !!tx.receiptDocumentId || (tx.documentIds && tx.documentIds.length > 0);
                      const linkedDoc = appState.documents.find(
                        (d) => d.id === tx.receiptDocumentId || (tx.documentIds && tx.documentIds.includes(d.id))
                      );

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                            {formatDatePtBr(tx.date)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                            {tx.code || '-'}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            {tx.description}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {tx.beneficiaryName || (tx as any).beneficiary || (tx as any).supplier || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold whitespace-nowrap">
                            <span className={tx.type === 'despesa' ? 'text-rose-600' : 'text-emerald-600'}>
                              {tx.type === 'despesa' ? '-' : '+'} {formatCurrencyPtBr(tx.amount)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {hasDoc ? (
                              <span
                                onClick={() => linkedDoc && onOpenDocument && onOpenDocument(linkedDoc.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full cursor-pointer hover:bg-emerald-100 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Vinculado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded-full">
                                Pendente
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {linkedDoc ? (
                              <button
                                onClick={() => onOpenDocument && onOpenDocument(linkedDoc.id)}
                                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ver Arquivo
                              </button>
                            ) : (
                              <button
                                onClick={() => onNavigate('documents')}
                                className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1"
                              >
                                Vincular
                              </button>
                            )}
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

      {/* CONTEÚDO DA ABA 2: COMPROVANTES E DOCUMENTOS */}
      {activeSubTab === 'comprovantes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryDocuments.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
                Nenhum comprovante ou documento associado diretamente a esta categoria no momento.
              </div>
            ) : (
              categoryDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-mono">
                        {doc.type.replace('_', ' ').toUpperCase()}
                      </span>
                      {doc.classificationConfidence !== undefined && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                          Confiança: {Math.round(doc.classificationConfidence * 100)}%
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-slate-900 text-sm line-clamp-2" title={doc.name}>
                      {doc.name}
                    </h4>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Data: {formatDatePtBr(doc.date)}</p>
                      {doc.detectedAmount ? (
                        <p className="font-semibold text-slate-800">
                          Valor extraído: {formatCurrencyPtBr(doc.detectedAmount)}
                        </p>
                      ) : null}
                      {doc.detectedSupplier && (
                        <p className="text-slate-600">
                          Favorecido: {doc.detectedSupplier}
                        </p>
                      )}
                      {doc.driveFolder && (
                        <p className="text-slate-500 font-mono text-[11px]">
                          Pasta Drive: {doc.driveFolder}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-3">
                    <span className={`text-[11px] font-medium ${doc.relatedTransactionId ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {doc.relatedTransactionId ? '✓ Vinculado a lançamento' : 'Aguardando vínculo'}
                    </span>

                    <button
                      onClick={() => onOpenDocument && onOpenDocument(doc.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Visualizar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: FORNECEDORES RECORRENTES */}
      {activeSubTab === 'fornecedores' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Fornecedores e Favorecidos Envolvidos</h3>
            <p className="text-xs text-slate-500">
              Histórico de pagamentos e transações consolidadas para esta categoria.
            </p>
          </div>

          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Fornecedor / Favorecido</th>
                <th className="py-3 px-4 text-center">Quantidade de Pagamentos</th>
                <th className="py-3 px-4 text-right">Total Pago</th>
                <th className="py-3 px-4 text-right">Último Lançamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliersMap.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Nenhum fornecedor identificado nesta categoria até o momento.
                  </td>
                </tr>
              ) : (
                suppliersMap.map((sup, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {sup.name}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-600">
                      {sup.count}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrencyPtBr(sup.total)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-500">
                      {formatDatePtBr(sup.lastDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: REGRAS DE CLASSIFICAÇÃO */}
      {activeSubTab === 'regras' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Regras de Classificação desta Categoria</h3>
            <p className="text-xs text-slate-500">
              Critérios utilizados pelo motor em segundo plano para direcionar comprovantes e despesas para "{category.name}".
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {associatedRules.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-300">
                Nenhuma regra personalizada cadastrada para esta categoria ainda. Regras são aprendidas automaticamente quando você confirma comprovantes.
              </div>
            ) : (
              associatedRules.map((r) => (
                <div key={r.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      {r.supplier ? `Fornecedor: ${r.supplier}` : r.keyword ? `Palavra-chave: "${r.keyword}"` : `Pasta: ${r.folder}`}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {Math.round(r.confidence * 100)}% confiança
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Direciona automaticamente para: <strong>{r.categoryName}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Origem: {r.isUserConfirmed ? 'Confirmado pelo Usuário' : 'Regra Inicial'} • Criado em: {formatDatePtBr(r.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
