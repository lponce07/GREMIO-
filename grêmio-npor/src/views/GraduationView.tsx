import React, { useState } from 'react';
import { GraduationService, GraduationGeneralInfo, SupplierComparison, UserRole } from '../types';
import { canManageEvents } from '../utils/permissions';
import { AppState, formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Clock,
  FileCheck,
  FileX,
  Plus,
  Scale,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface GraduationViewProps {
  appState: AppState;
  userRole: UserRole;
  onUpdateService: (service: GraduationService) => void;
  onOpenDocument: (docId: string) => void;
}

export const GraduationView: React.FC<GraduationViewProps> = ({
  appState,
  userRole,
  onUpdateService,
  onOpenDocument,
}) => {
  const { graduationGeneral, graduationServices, supplierComparisons } = appState;
  const canEdit = canManageEvents(userRole);

  const [activeTab, setActiveTab] = useState<'servicos' | 'comparador' | 'geral'>('servicos');
  const [filterCategory, setFilterCategory] = useState<string>('todas');
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(graduationServices[0]?.id || null);

  // Modal for editing or adding service
  const [selectedService, setSelectedService] = useState<GraduationService | null>(null);

  const categories = Array.from(new Set(graduationServices.map((s) => s.category)));

  const filteredServices = graduationServices.filter((s) => {
    if (filterCategory === 'todas') return true;
    return s.category === filterCategory;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#1A2421] text-[#D4AF37] border border-[#D4AF37]/30">
              Comissão de Formatura
            </span>
            <span className="text-xs text-slate-500 font-medium">Baile das Espadas • NPOR 2026</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A2421] mt-1 font-institutional flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#D4AF37]" />
            Organização Integral da Festa de Formatura
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhamento das 18 categorias de serviços, contratos, cotações comparadas e cronograma de pagamentos.
          </p>
        </div>
      </div>

      {/* Main Graduation Thermometer Summary */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A2421] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              Painel Financeiro da Formatura
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Data: <strong className="text-slate-700">{formatDatePtBr(graduationGeneral.eventDate)}</strong> • Local: <strong className="text-slate-700">{graduationGeneral.venueName}</strong> • {graduationGeneral.targetGraduates} Formandos
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Cota Individual:</span>
              <strong className="text-[#1A2421] font-bold">{formatCurrencyPtBr(graduationGeneral.individualQuotaAmount)}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Caixa Disponível:</span>
              <strong className="text-[#4B5320] font-bold">{formatCurrencyPtBr(graduationGeneral.availableBalance)}</strong>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-600">
              Arrecadado de Cotas: <strong className="text-[#1A2421]">{formatCurrencyPtBr(graduationGeneral.totalCollected)}</strong>
            </span>
            <span className="text-slate-500">
              Meta Orçada: <strong className="text-slate-700">{formatCurrencyPtBr(graduationGeneral.totalBudget)}</strong> ({Math.round((graduationGeneral.totalCollected / graduationGeneral.totalBudget) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-3 overflow-hidden border border-slate-200">
            <div
              className="bg-[#4B5320] h-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (graduationGeneral.totalCollected / graduationGeneral.totalBudget) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Breakdown 4 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Contratado</span>
            <p className="text-sm font-bold font-mono text-[#1A2421] mt-1">
              {formatCurrencyPtBr(graduationGeneral.totalContracted)}
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Pago a Fornecedores</span>
            <p className="text-sm font-bold font-mono text-[#4B5320] mt-1">
              {formatCurrencyPtBr(graduationGeneral.totalPaid)}
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Saldo a Pagar (Contratos)</span>
            <p className="text-sm font-bold font-mono text-red-600 mt-1">
              {formatCurrencyPtBr(graduationGeneral.totalPending)}
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Fundo de Reserva (15%)</span>
            <p className="text-sm font-bold font-mono text-[#D4AF37] mt-1">
              {formatCurrencyPtBr(21600)}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('servicos')}
          className={`pb-3 px-1 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'servicos'
              ? 'border-[#4B5320] text-[#1A2421]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          18 Categorias de Serviços ({graduationServices.length})
        </button>
        <button
          onClick={() => setActiveTab('comparador')}
          className={`pb-3 px-1 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'comparador'
              ? 'border-[#4B5320] text-[#1A2421]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Comparador de Fornecedores & Orçamentos
        </button>
      </div>

      {/* TAB 1: 18 Categories of Services */}
      {activeTab === 'servicos' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 p-4 shadow-sm">
            <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">Filtrar Categoria:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#4B5320]"
            >
              <option value="todas">Todas as 18 Categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* List of Services */}
          <div className="space-y-3">
            {filteredServices.map((serv) => {
              const isExpanded = expandedServiceId === serv.id;
              const hasContract = !!serv.contractDocumentId;
              const totalPaid = (serv.installments || []).filter((i) => i.status === 'pago').reduce((s, i) => s + i.amount, 0);

              return (
                <div
                  key={serv.id}
                  className="bg-white border border-slate-200 overflow-hidden transition shadow-sm"
                >
                  {/* Service Header Row */}
                  <div
                    onClick={() => setExpandedServiceId(isExpanded ? null : serv.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#1A2421] text-white flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#4B5320]">
                            {serv.category}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 border ${
                              serv.status === 'pago_integral' || serv.status === 'contratado'
                                ? 'bg-[#4B5320]/15 text-[#4B5320] border-[#4B5320]/40'
                                : serv.status === 'pago_parcial'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {serv.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#1A2421] mt-0.5">{serv.name}</h4>
                        <p className="text-[11px] text-slate-500">
                          Fornecedor: <strong className="text-slate-700">{serv.supplierName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Contratado</span>
                        <span className="font-mono font-bold text-xs sm:text-sm text-[#1A2421]">
                          {formatCurrencyPtBr(serv.contractedAmount || serv.estimatedAmount)}
                        </span>
                        <span className="text-[10px] text-[#4B5320] font-bold block">
                          Pago: {formatCurrencyPtBr(totalPaid)}
                        </span>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4 text-xs">
                      <p className="text-slate-600">{serv.fullDescription}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Contract Status Box */}
                        <div className="p-3.5 bg-white border border-slate-200 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                            Contrato Formal
                          </span>
                          {hasContract ? (
                            <div className="flex items-center justify-between">
                              <span className="text-[#4B5320] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Assinado & Arquivado
                              </span>
                              <button
                                onClick={() => onOpenDocument(serv.contractDocumentId!)}
                                className="text-[10px] text-[#D4AF37] font-bold hover:underline"
                              >
                                Visualizar
                              </button>
                            </div>
                          ) : (
                            <div className="text-amber-700 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Contrato Pendente de Assinatura
                            </div>
                          )}
                        </div>

                        {/* Estimated vs Contracted */}
                        <div className="p-3.5 bg-white border border-slate-200 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Orçado vs Contratado
                          </span>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Estimado:</span>
                            <span className="font-mono text-slate-700">
                              {formatCurrencyPtBr(serv.estimatedAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Fechado:</span>
                            <span className="font-mono font-bold text-[#1A2421]">
                              {formatCurrencyPtBr(serv.contractedAmount || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Responsible */}
                        <div className="p-3.5 bg-white border border-slate-200 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Responsável na Comissão
                          </span>
                          <p className="font-bold text-[#1A2421]">
                            {serv.responsible
                              ? (serv.responsible.startsWith('AL ') || serv.responsible.startsWith('Aluno ')
                                  ? serv.responsible
                                  : `AL ${serv.responsible}`)
                              : 'Não informado'}
                          </p>
                          <p className="text-[10px] text-slate-500">Acompanhamento e fiscalização direta</p>
                        </div>
                      </div>

                      {/* Installments Breakdown */}
                      <div className="space-y-2 pt-2">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#1A2421]">
                          Cronograma de Parcelas & Pagamentos
                        </h5>
                        <div className="space-y-1.5">
                          {(serv.installments || []).map((inst, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1A2421]">Parcela {inst.number}:</span>
                                <span className="text-slate-500">Vencimento: {formatDatePtBr(inst.dueDate)}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-[#1A2421]">
                                  {formatCurrencyPtBr(inst.amount)}
                                </span>
                                <span
                                  className={`text-[9px] font-bold uppercase px-2 py-0.5 border ${
                                    inst.status === 'pago'
                                      ? 'bg-[#4B5320]/15 text-[#4B5320] border-[#4B5320]/40'
                                      : 'bg-amber-100 text-amber-800 border-amber-300'
                                  }`}
                                >
                                  {inst.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Supplier Comparison */}
      {activeTab === 'comparador' && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-slate-200 shadow-sm space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A2421] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#D4AF37]" />
              Tomada de Preços & Comparador de Propostas
            </h3>
            <p className="text-[11px] text-slate-500">
              Conformidade com os princípios de transparência militar: registro de pelo menos 2 a 3 propostas para cada serviço relevante da formatura.
            </p>
          </div>

          <div className="space-y-4">
            {supplierComparisons.map((comp) => (
              <div key={comp.id} className="bg-white border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#4B5320]">
                      {comp.serviceCategory}
                    </span>
                    <h4 className="text-sm font-bold text-[#1A2421] mt-0.5">
                      Cotação Comparativa de Fornecedores
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500">
                    Vencedor Eleito:{' '}
                    <strong className="text-[#4B5320] font-bold">{comp.selectedSupplierName}</strong>
                  </span>
                </div>

                {/* Proposals Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {comp.proposals.map((prop, pIdx) => {
                    const isWinner = prop.supplierName === comp.selectedSupplierName;
                    return (
                      <div
                        key={pIdx}
                        className={`p-4 border text-xs space-y-2.5 ${
                          isWinner
                            ? 'bg-[#4B5320]/10 border-2 border-[#4B5320] shadow-xs'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[#1A2421] text-xs">{prop.supplierName}</span>
                          {isWinner && (
                            <span className="text-[9px] bg-[#4B5320] text-white font-bold px-2 py-0.5 uppercase tracking-wider">
                              Eleito
                            </span>
                          )}
                        </div>

                        <div className="font-mono font-bold text-base text-[#1A2421]">
                          {formatCurrencyPtBr(prop.totalAmount)}
                        </div>

                        <div className="space-y-1 text-[11px]">
                          <p className="text-[#4B5320] font-bold">Vantagens: {prop.pros}</p>
                          <p className="text-red-700 font-medium">Desvantagens: {prop.cons}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 bg-slate-50 text-xs text-slate-700 border border-slate-200">
                  <strong className="text-[#1A2421] uppercase tracking-wider text-[10px]">Justificativa da Escolha pela Comissão:</strong> {comp.decisionRationale}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
