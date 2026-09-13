import React, { useState } from 'react';
import { FuturePlan, UserRole } from '../types';
import { AppState, formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
import {
  Target,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FuturePlansViewProps {
  appState: AppState;
  userRole: UserRole;
  onUpdatePlan: (plan: FuturePlan) => void;
  onAddPlan: (plan: FuturePlan) => void;
}

export const FuturePlansView: React.FC<FuturePlansViewProps> = ({
  appState,
  userRole,
  onUpdatePlan,
  onAddPlan,
}) => {
  const { plans } = appState;
  const canEdit = userRole === 'admin' || userRole === 'diretor_eventos' || userRole === 'comissao_formatura';

  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Plan form
  const [newTitle, setNewTitle] = useState('');
  const [newJustification, setNewJustification] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newResponsible, setNewResponsible] = useState(appState.currentUser.warName);

  const filteredPlans = plans.filter((p) => {
    if (filterStatus === 'todos') return true;
    return p.status === filterStatus;
  });

  const handleToggleStage = (planId: string, stageIndex: number) => {
    if (!canEdit) return;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const updatedStages = [...plan.stages];
    updatedStages[stageIndex].completed = !updatedStages[stageIndex].completed;

    const completedCount = updatedStages.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / updatedStages.length) * 100);

    onUpdatePlan({
      ...plan,
      stages: updatedStages,
      progressPercentage: progress,
      status: progress === 100 ? 'concluido' : 'em_execucao',
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = parseFloat(newBudget.replace(/\./g, '').replace(',', '.')) || 0;

    const newPlan: FuturePlan = {
      id: `plan-${Date.now()}`,
      title: newTitle,
      justification: newJustification,
      estimatedBudget: budgetNum,
      targetDate: newTargetDate,
      responsibleUser: newResponsible,
      status: 'em_estudo',
      progressPercentage: 0,
      stages: [
        { name: 'Elaboração do projeto e aprovação da Diretoria', completed: true },
        { name: 'Tomada de orçamentos e cotação de viabilidade', completed: false },
        { name: 'Execução e aquisição dos materiais', completed: false },
        { name: 'Entrega final e prestação de contas', completed: false },
      ],
      identifiedRisks: ['Possível variação de preços no mercado', 'Atraso de entrega de fornecedores'],
      contingencyPlans: 'Realizar compra com antecedência mínima de 30 dias com contrato firmado.',
    };

    onAddPlan(newPlan);
    setIsModalOpen(false);
    setNewTitle('');
    setNewJustification('');
    setNewBudget('');
    setNewTargetDate('');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Planejamento Estratégico
            </span>
            <span className="text-xs text-stone-400">Metas & Propostas do Grêmio</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 font-institutional flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Planejamentos Futuros & Projetos
          </h2>
          <p className="text-xs text-stone-400">
            Acompanhamento de propostas em estudo, orçamentos previstos, etapas de execução e planos de contingência.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Nova Proposta de Projeto
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 p-2 rounded-xl text-xs">
        <span className="text-stone-400 text-[11px] px-2">Situação:</span>
        {['todos', 'em_execucao', 'aprovado', 'em_estudo', 'concluido'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1 rounded-lg capitalize transition ${
              filterStatus === st
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-semibold'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            {st === 'todos' ? 'Todos os Projetos' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-stone-700 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-stone-800 pb-2">
                <div>
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      plan.status === 'concluido'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : plan.status === 'em_execucao'
                        ? 'bg-blue-950 text-blue-300 border-blue-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}
                  >
                    {plan.status.replace('_', ' ')}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1">{plan.title}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 uppercase block">Orçamento Estimado</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                    {formatCurrencyPtBr(plan.estimatedBudget)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">{plan.justification}</p>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-stone-400">Progresso do Projeto</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {plan.progressPercentage}%
                  </span>
                </div>
                <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden border border-stone-700">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${plan.progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Stages list */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-stone-400">
                  Etapas Programadas:
                </span>
                {plan.stages.map((stg, sIdx) => (
                  <div
                    key={sIdx}
                    onClick={() => handleToggleStage(plan.id, sIdx)}
                    className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={stg.completed}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 accent-emerald-600 rounded"
                    />
                    <span className={stg.completed ? 'line-through text-stone-400' : ''}>
                      {stg.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Risks & Contingency */}
              <div className="p-3 bg-stone-800/50 rounded-xl border border-stone-700/60 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Riscos & Contingência</span>
                </div>
                <p className="text-[11px] text-stone-400">
                  Riscos: {plan.identifiedRisks.join(', ')}
                </p>
                <p className="text-[11px] text-stone-300">
                  Contingência: {plan.contingencyPlans}
                </p>
              </div>
            </div>

            {/* Card Footer */}
            <div className="pt-2 border-t border-stone-800 flex justify-between items-center text-[11px] text-stone-400">
              <span>Prazo Alvo: <strong className="text-stone-300">{formatDatePtBr(plan.targetDate)}</strong></span>
              <span>Responsável: Aluno {plan.responsibleUser}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: New Plan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-white font-institutional">
                Nova Proposta de Projeto do Grêmio
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-medium mb-1">Título do Projeto</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Aquisição de Uniforme de Educação Física da Turma"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Justificativa e Objetivos</label>
                <textarea
                  required
                  rows={3}
                  value={newJustification}
                  onChange={(e) => setNewJustification(e.target.value)}
                  placeholder="Explique a necessidade e os benefícios para a turma do NPOR..."
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Orçamento Estimado (R$)</label>
                  <input
                    type="text"
                    required
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="Ex: 4.500,00"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Data Alvo</label>
                  <input
                    type="date"
                    required
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-stone-800 text-stone-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg"
                >
                  Salvar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
