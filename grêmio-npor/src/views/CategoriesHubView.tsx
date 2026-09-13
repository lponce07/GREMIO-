import React, { useState, useMemo } from 'react';
import {
  Category,
  UserRole,
  ClassificationRule,
} from '../types';
import { canManageCategories } from '../utils/permissions';
import {
  AppState,
  formatCurrencyPtBr,
  formatDatePtBr,
  createNewCategory,
  removeClassificationRule,
} from '../services/dataService';
import {
  FolderKanban,
  Plus,
  Sparkles,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  Tag,
  DollarSign,
  FileText,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
  Building2,
  Layers,
} from 'lucide-react';

interface CategoriesHubViewProps {
  appState: AppState;
  userRole: UserRole;
  onSelectCategory: (category: Category) => void;
  onUpdateAppState: (updater: (prev: AppState) => AppState) => void;
}

export const CategoriesHubView: React.FC<CategoriesHubViewProps> = ({
  appState,
  userRole,
  onSelectCategory,
  onUpdateAppState,
}) => {
  const [activeTab, setActiveTab] = useState<'todas' | 'dinamicas' | 'oficiais' | 'regras'>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Formulário de Nova Categoria
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatKeywords, setNewCatKeywords] = useState('');
  const [newCatColor, setNewCatColor] = useState('#4B5320');
  const [formError, setFormError] = useState('');

  // Categorias enriquecidas com estatísticas (com garantia estrita de chave única por id)
  const categories = useMemo(() => {
    const rawCategories = appState.categories || [];
    const uniqueMap = new Map<string, Category>();
    for (const c of rawCategories) {
      if (c && c.id && !uniqueMap.has(c.id)) {
        uniqueMap.set(c.id, c);
      }
    }

    return Array.from(uniqueMap.values()).map((cat) => {
      const catTxs = (appState.transactions || []).filter(
        (t) => t.categoryId === cat.id || (t.category && t.category.toLowerCase() === cat.name.toLowerCase())
      );
      const catDocs = (appState.documents || []).filter(
        (d) => d.categoryId === cat.id || (d.categoryName && d.categoryName.toLowerCase() === cat.name.toLowerCase())
      );
      const totalSpent = catTxs.filter((t) => t.type === 'despesa').reduce((s, t) => s + (t.amount || 0), 0);

      return {
        ...cat,
        totalSpent: cat.totalSpent || totalSpent,
        transactionsCount: catTxs.length,
        documentsCount: catDocs.length,
      };
    });
  }, [appState.categories, appState.transactions, appState.documents]);

  // Filtros
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'dinamicas') return cat.isDynamic;
      if (activeTab === 'oficiais') return !cat.isDynamic;

      return true;
    });
  }, [categories, searchTerm, activeTab]);

  // Métricas Consolidadas
  const dynamicCount = useMemo(() => categories.filter((c) => c.isDynamic).length, [categories]);
  const totalSpentAllCategories = useMemo(
    () => categories.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
    [categories]
  );
  const totalClassifiedDocs = useMemo(
    () => (appState.documents || []).filter((d) => d.classificationStatus === 'classificado').length,
    [appState.documents]
  );

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setFormError('Informe o nome da nova categoria.');
      return;
    }

    const keywordsList = newCatKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    onUpdateAppState((prev) => {
      const { state, category } = createNewCategory(
        prev,
        newCatName.trim(),
        newCatDesc.trim(),
        newCatColor,
        keywordsList
      );
      return state;
    });

    setNewCatName('');
    setNewCatDesc('');
    setNewCatKeywords('');
    setFormError('');
    setIsCreateModalOpen(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!confirm('Deseja realmente remover esta regra de classificação contábil?')) return;
    onUpdateAppState((prev) => removeClassificationRule(prev, ruleId));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-7 h-7 text-emerald-700" />
            Projetos e Categorias
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestão unificada de categorias oficiais e projetos dinâmicos identificados automaticamente a partir de comprovantes.
          </p>
        </div>

        {canManageCategories(userRole) && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Categoria
          </button>
        )}
      </div>

      {/* Grid de Resumo Geral */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total de Categorias
          </span>
          <p className="text-2xl font-bold text-slate-900">{categories.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Projetos estruturados</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Categorias Dinâmicas
          </span>
          <p className="text-2xl font-bold text-emerald-700">{dynamicCount}</p>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">Detectadas por classificação automática</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Alocado
          </span>
          <p className="text-2xl font-bold text-slate-900">{formatCurrencyPtBr(totalSpentAllCategories)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Em despesas consolidadas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Comprovantes Classificados
          </span>
          <p className="text-2xl font-bold text-blue-700">{totalClassifiedDocs}</p>
          <p className="text-[11px] text-slate-500 mt-1">Documentos identificados</p>
        </div>
      </div>

      {/* Abas e Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-4 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('todas')}
            className={`pb-3 -mb-3 border-b-2 transition-colors ${
              activeTab === 'todas'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Todas as Categorias ({categories.length})
          </button>

          <button
            onClick={() => setActiveTab('dinamicas')}
            className={`pb-3 -mb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'dinamicas'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Projetos Dinâmicos ({dynamicCount})
          </button>

          <button
            onClick={() => setActiveTab('oficiais')}
            className={`pb-3 -mb-3 border-b-2 transition-colors ${
              activeTab === 'oficiais'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Oficiais do Grêmio ({categories.length - dynamicCount})
          </button>

          <button
            onClick={() => setActiveTab('regras')}
            className={`pb-3 -mb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'regras'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-amber-600" />
            Regras de Classificação ({appState.classificationRules?.length || 0})
          </button>
        </div>

        {activeTab !== 'regras' && (
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar categoria ou projeto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* CONTEÚDO: CARDS DE CATEGORIAS */}
      {activeTab !== 'regras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCategories.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
              Nenhuma categoria encontrada com os filtros selecionados.
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat)}
                className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 transition-opacity"
                  style={{ backgroundColor: cat.color || '#4B5320' }}
                />

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs"
                        style={{ backgroundColor: cat.color || '#4B5320' }}
                      >
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {cat.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono">#{cat.slug}</p>
                      </div>
                    </div>

                    {cat.isDynamic ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Dinâmica
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                        Oficial
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {cat.description || `Módulo contábil e de comprovantes para ${cat.name}.`}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <span className="text-[10px] font-medium text-slate-500 block">Total Gasto</span>
                      <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                        {formatCurrencyPtBr(cat.totalSpent || 0)}
                      </strong>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2">
                      <span className="text-[10px] font-medium text-slate-500 block">Despesas</span>
                      <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                        {cat.transactionsCount || 0}
                      </strong>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2">
                      <span className="text-[10px] font-medium text-slate-500 block">Comprovantes</span>
                      <strong className="text-xs font-bold text-emerald-700 block mt-0.5">
                        {cat.documentsCount || 0}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                  <span>Acessar Painel da Categoria</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CONTEÚDO: REGRAS DE CLASSIFICAÇÃO APRENDIDAS */}
      {activeTab === 'regras' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Regras de Classificação Aprendidas</h3>
              <p className="text-xs text-slate-500">
                O motor contábil compara arquivos e comprovantes com estas regras em segundo plano antes de associá-los.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Critério / Gatilho</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Categoria de Destino</th>
                  <th className="py-3 px-4 text-center">Confiança</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(appState.classificationRules || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhuma regra de classificação cadastrada.
                    </td>
                  </tr>
                ) : (
                  (appState.classificationRules || []).map((rule) => {
                    const criterion = rule.supplier
                      ? `Fornecedor: ${rule.supplier}`
                      : rule.keyword
                      ? `Palavra-chave: "${rule.keyword}"`
                      : `Pasta: ${rule.folder}`;

                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {criterion}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {rule.supplier ? 'Fornecedor' : rule.keyword ? 'Palavra-chave' : 'Pasta Drive'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-emerald-800">
                          {rule.categoryName}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full">
                            {Math.round(rule.confidence * 100)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {rule.isUserConfirmed ? 'Confirmado pelo Usuário' : 'Regra do Sistema'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                            title="Remover regra"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Criar Nova Categoria */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-emerald-700" />
                Criar Nova Categoria / Projeto
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome da Categoria / Projeto *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Material Ponte, Reforma NPOR, Quadros BJJ..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  O sistema normaliza variações automaticamente para evitar duplicadas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição ou Finalidade
                </label>
                <textarea
                  placeholder="Descreva o propósito deste projeto ou grupo de despesas..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Palavras-chave para Detecção Automática (separadas por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: madeira, pregos, ponte, cabo, madeireira"
                  value={newCatKeywords}
                  onChange={(e) => setNewCatKeywords(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Cor da Identidade Visual
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-10 h-10 p-1 border border-slate-300 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-600">{newCatColor}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
