import React, { useState, useEffect } from 'react';
import {
  Transaction,
  EventRecord,
  GraduationService,
  DocumentRecord,
  AuditAlert,
  HistoryRecord,
} from '../types';
import { formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
import { Search, X, Landmark, Calendar, GraduationCap, FileText, ShieldAlert, ArrowRight } from 'lucide-react';

import { AppState } from '../services/dataService';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState?: AppState;
  transactions?: Transaction[];
  events?: EventRecord[];
  graduationServices?: GraduationService[];
  documents?: DocumentRecord[];
  alerts?: AuditAlert[];
  history?: HistoryRecord[];
  onNavigate: (view: string, targetId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  appState,
  transactions: propTransactions,
  events: propEvents,
  graduationServices: propGraduationServices,
  documents: propDocuments,
  alerts: propAlerts,
  history: propHistory,
  onNavigate,
}) => {
  const transactions = propTransactions || appState?.transactions || [];
  const events = propEvents || appState?.events || [];
  const graduationServices = propGraduationServices || appState?.graduationServices || [];
  const documents = propDocuments || appState?.documents || [];
  const alerts = propAlerts || appState?.alerts || [];
  const history = propHistory || appState?.history || [];

  const [query, setQuery] = useState('');

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle handled by parent or opened
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  // Search in transactions
  const matchedTransactions = normalizedQuery
    ? transactions.filter(
        (t) =>
          t.code.toLowerCase().includes(normalizedQuery) ||
          t.description.toLowerCase().includes(normalizedQuery) ||
          t.beneficiaryName.toLowerCase().includes(normalizedQuery) ||
          t.category.toLowerCase().includes(normalizedQuery) ||
          t.responsibleUser.toLowerCase().includes(normalizedQuery) ||
          t.amount.toString().includes(normalizedQuery)
      )
    : [];

  // Search in events
  const matchedEvents = normalizedQuery
    ? events.filter(
        (e) =>
          e.name.toLowerCase().includes(normalizedQuery) ||
          e.description.toLowerCase().includes(normalizedQuery) ||
          e.mainResponsible.toLowerCase().includes(normalizedQuery) ||
          e.location.toLowerCase().includes(normalizedQuery)
      )
    : [];

  // Search in graduation services
  const matchedGraduation = normalizedQuery
    ? graduationServices.filter(
        (g) =>
          g.name.toLowerCase().includes(normalizedQuery) ||
          g.supplierName.toLowerCase().includes(normalizedQuery) ||
          g.category.toLowerCase().includes(normalizedQuery) ||
          g.fullDescription.toLowerCase().includes(normalizedQuery)
      )
    : [];

  // Search in documents
  const matchedDocs = normalizedQuery
    ? documents.filter(
        (d) =>
          d.name.toLowerCase().includes(normalizedQuery) ||
          (d.detectedPersonOrCompany && d.detectedPersonOrCompany.toLowerCase().includes(normalizedQuery)) ||
          (d.fileContentOrOcrText && d.fileContentOrOcrText.toLowerCase().includes(normalizedQuery)) ||
          d.type.toLowerCase().includes(normalizedQuery)
      )
    : [];

  // Search in alerts
  const matchedAlerts = normalizedQuery
    ? alerts.filter(
        (a) =>
          a.title.toLowerCase().includes(normalizedQuery) ||
          a.description.toLowerCase().includes(normalizedQuery) ||
          a.location.toLowerCase().includes(normalizedQuery)
      )
    : [];

  const totalResults =
    matchedTransactions.length +
    matchedEvents.length +
    matchedGraduation.length +
    matchedDocs.length +
    matchedAlerts.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-2xl bg-white border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-[#4B5320] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por código, fornecedor, valor, evento, documento ou palavra-chave..."
            autoFocus
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-700 p-1 uppercase font-bold"
            >
              Limpar
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query && (
            <div className="py-12 text-center text-slate-500 text-xs">
              <p className="font-bold text-[#1A2421] text-sm font-institutional">Pesquisa Global Unificada</p>
              <p className="mt-1 text-slate-500">
                Digite um nome de fornecedor, código de transação (ex: NPOR-2026-DES-002), serviço da formatura ou valor para localizar.
              </p>
            </div>
          )}

          {query && totalResults === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              <p className="font-bold text-[#1A2421] text-sm">Nenhum resultado encontrado para "{query}"</p>
              <p className="mt-1">Verifique os termos digitados ou tente buscar por parte do código.</p>
            </div>
          )}

          {/* Transactions Group */}
          {matchedTransactions.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase text-[#4B5320] tracking-wider flex items-center gap-1.5 mb-2 font-institutional">
                <Landmark className="w-3.5 h-3.5" />
                <span>Transações Financeiras ({matchedTransactions.length})</span>
              </div>
              <div className="space-y-1.5">
                {matchedTransactions.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onNavigate('treasury', t.id);
                      onClose();
                    }}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer flex items-center justify-between group transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#1A2421]">{t.code}</span>
                        <span className="text-xs font-medium text-slate-700">{t.description}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {t.beneficiaryName} • {formatDatePtBr(t.date)} • {t.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#4B5320]">
                        {formatCurrencyPtBr(t.amount)}
                      </div>
                      <span className="text-[10px] text-[#4B5320] font-bold uppercase tracking-wider group-hover:underline flex items-center gap-1">
                        Ver <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events Group */}
          {matchedEvents.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase text-blue-800 tracking-wider flex items-center gap-1.5 mb-2 font-institutional">
                <Calendar className="w-3.5 h-3.5" />
                <span>Eventos do Grêmio ({matchedEvents.length})</span>
              </div>
              <div className="space-y-1.5">
                {matchedEvents.slice(0, 4).map((e) => (
                  <div
                    key={e.id}
                    onClick={() => {
                      onNavigate('events', e.id);
                      onClose();
                    }}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer flex items-center justify-between group transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#1A2421]">{e.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {e.dateTime} • {e.location} • Resp: {e.mainResponsible}
                      </p>
                    </div>
                    <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider group-hover:underline flex items-center gap-1">
                      Ver <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graduation Group */}
          {matchedGraduation.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase text-amber-800 tracking-wider flex items-center gap-1.5 mb-2 font-institutional">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Formatura ({matchedGraduation.length})</span>
              </div>
              <div className="space-y-1.5">
                {matchedGraduation.slice(0, 4).map((g) => (
                  <div
                    key={g.id}
                    onClick={() => {
                      onNavigate('graduation', g.id);
                      onClose();
                    }}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer flex items-center justify-between group transition"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-700">{g.category}</span>
                      <p className="text-xs font-bold text-[#1A2421]">{g.name}</p>
                      <p className="text-[11px] text-slate-500">Fornecedor: {g.supplierName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#1A2421]">
                        {formatCurrencyPtBr(g.contractedAmount || g.estimatedAmount)}
                      </div>
                      <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider group-hover:underline flex items-center gap-1">
                        Ver <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Group */}
          {matchedDocs.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-2 font-institutional">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Documentos & Comprovantes ({matchedDocs.length})</span>
              </div>
              <div className="space-y-1.5">
                {matchedDocs.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      onNavigate('documents', d.id);
                      onClose();
                    }}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer flex items-center justify-between group transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#1A2421] font-mono truncate max-w-md">{d.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {d.source} • {formatDatePtBr(d.date)} • {d.detectedPersonOrCompany || 'Não identificado'}
                      </p>
                    </div>
                    <span className="text-[10px] text-[#4B5320] font-bold uppercase tracking-wider group-hover:underline flex items-center gap-1">
                      Abrir <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts Group */}
          {matchedAlerts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase text-red-700 tracking-wider flex items-center gap-1.5 mb-2 font-institutional">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Pendências e Alertas ({matchedAlerts.length})</span>
              </div>
              <div className="space-y-1.5">
                {matchedAlerts.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      onNavigate('alerts', a.id);
                      onClose();
                    }}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer flex items-center justify-between group transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#1A2421]">{a.title}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-md">{a.description}</p>
                    </div>
                    <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider group-hover:underline flex items-center gap-1">
                      Conferir <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-right text-[11px] text-slate-500">
          Pressione <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 font-mono text-xs">ESC</kbd> para fechar
        </div>
      </div>
    </div>
  );
};
