import React, { useState } from 'react';
import { AuditAlert, AlertSeverity, UserRole } from '../types';
import { AppState, formatDatePtBr } from '../services/dataService';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  Filter,
  FileCheck2,
  FileX,
  RefreshCw,
  Eye,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface AuditAlertsViewProps {
  appState: AppState;
  userRole: UserRole;
  onUpdateAlert: (alert: AuditAlert) => void;
  onNavigate: (view: string, targetId?: string) => void;
  onRunAudit: () => void;
}

export const AuditAlertsView: React.FC<AuditAlertsViewProps> = ({
  appState,
  userRole,
  onUpdateAlert,
  onNavigate,
  onRunAudit,
}) => {
  const { alerts } = appState;
  const canEdit = userRole === 'admin' || userRole === 'tesouraria';

  const [filterSeverity, setFilterSeverity] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('ativo');

  // Justify / Dismiss modal state
  const [alertToDismiss, setAlertToDismiss] = useState<AuditAlert | null>(null);
  const [dismissReason, setDismissReason] = useState('');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity !== 'todos' && a.severity !== filterSeverity) return false;
    if (filterStatus !== 'todos' && a.status !== filterStatus) return false;
    return true;
  });

  const redCount = alerts.filter((a) => a.status === 'ativo' && a.severity === 'vermelho').length;
  const yellowCount = alerts.filter((a) => a.status === 'ativo' && a.severity === 'amarelo').length;
  const blueCount = alerts.filter((a) => a.status === 'ativo' && a.severity === 'azul').length;
  const resolvedCount = alerts.filter((a) => a.status === 'resolvido' || a.status === 'dispensado').length;

  const handleConfirmDismiss = () => {
    if (!alertToDismiss || !dismissReason.trim()) return;
    onUpdateAlert({
      ...alertToDismiss,
      status: 'dispensado',
      resolutionNotes: dismissReason,
      resolvedBy: appState.currentUser.warName,
      resolvedAt: new Date().toISOString(),
    });
    setAlertToDismiss(null);
    setDismissReason('');
  };

  const handleMarkResolved = (alert: AuditAlert) => {
    onUpdateAlert({
      ...alert,
      status: 'resolvido',
      resolutionNotes: 'Conferido e conciliado formalmente pela Tesouraria.',
      resolvedBy: appState.currentUser.warName,
      resolvedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#1A2421] text-[#D4AF37] border border-[#D4AF37]/30">
              Controle Interno & Conformidade
            </span>
            <span className="text-xs text-slate-500 font-medium">Auditoria Contínua do Grêmio</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A2421] mt-1 font-institutional flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Central de Pendências & Auditoria
          </h2>
          <p className="text-xs text-slate-500">
            Detecção automática de divergências, pagamentos sem comprovante, parcelas vencidas e inconsistências contratuais.
          </p>
        </div>

        <button
          onClick={onRunAudit}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition"
          title="Executar varredura completa de consistência nos registros"
        >
          <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
          Reauditar Sistema Agora
        </button>
      </div>

      {/* Classification Cards by Color */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Vermelho */}
        <div
          onClick={() => {
            setFilterSeverity('vermelho');
            setFilterStatus('ativo');
          }}
          className={`p-4 bg-white border cursor-pointer transition shadow-xs ${
            filterSeverity === 'vermelho'
              ? 'border-red-600 ring-2 ring-red-600/30 bg-red-50/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Crítico (Grave)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-red-700">
            {redCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Sem comprovante, duplicidade ou divergência
          </p>
        </div>

        {/* Amarelo */}
        <div
          onClick={() => {
            setFilterSeverity('amarelo');
            setFilterStatus('ativo');
          }}
          className={`p-4 bg-white border cursor-pointer transition shadow-xs ${
            filterSeverity === 'amarelo'
              ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-50/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Atenção</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-700">
            {yellowCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Sem vínculo ou dados incompletos
          </p>
        </div>

        {/* Azul */}
        <div
          onClick={() => {
            setFilterSeverity('azul');
            setFilterStatus('ativo');
          }}
          className={`p-4 bg-white border cursor-pointer transition shadow-xs ${
            filterSeverity === 'azul'
              ? 'border-blue-600 ring-2 ring-blue-600/30 bg-blue-50/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Informativo</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-blue-700">
            {blueCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Contratos em cotação e prazos
          </p>
        </div>

        {/* Verde */}
        <div
          onClick={() => {
            setFilterSeverity('todos');
            setFilterStatus('resolvido');
          }}
          className={`p-4 bg-white border cursor-pointer transition shadow-xs ${
            filterStatus === 'resolvido'
              ? 'border-[#4B5320] ring-2 ring-[#4B5320]/30 bg-[#4B5320]/5'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Resolvidos</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#4B5320]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#4B5320]">
            {resolvedCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Conciliados e atestados
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-4 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Filtrar Gravidade:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-white border border-slate-300 px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#4B5320]"
          >
            <option value="todos">Todas as Gravidades</option>
            <option value="vermelho">Apenas Vermelho (Crítico)</option>
            <option value="amarelo">Apenas Amarelo (Atenção)</option>
            <option value="azul">Apenas Azul (Informativo)</option>
          </select>

          <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px] ml-2">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-300 px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#4B5320]"
          >
            <option value="ativo">Pendências Ativas</option>
            <option value="resolvido">Resolvidas</option>
            <option value="dispensado">Dispensadas com Justificativa</option>
            <option value="todos">Todos os Registros</option>
          </select>
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          {filteredAlerts.length} alerta(s) listado(s)
        </span>
      </div>

      {/* Alerts Detailed Feed */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 shadow-sm space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#4B5320] mx-auto" />
            <h4 className="font-bold text-[#1A2421] text-sm font-institutional">Nenhuma pendência encontrada nesta categoria</h4>
            <p className="text-xs text-slate-500">
              Todos os lançamentos analisados estão em conformidade com as regras de auditoria do Grêmio.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isRed = alert.severity === 'vermelho';
            const isYellow = alert.severity === 'amarelo';
            const isBlue = alert.severity === 'azul';

            return (
              <div
                key={alert.id}
                className={`border p-6 transition space-y-4 text-xs bg-white shadow-sm ${
                  alert.status !== 'ativo'
                    ? 'border-slate-200 opacity-75 bg-slate-50'
                    : isRed
                    ? 'border-l-4 border-l-red-600 border-slate-200'
                    : isYellow
                    ? 'border-l-4 border-l-amber-500 border-slate-200'
                    : isBlue
                    ? 'border-l-4 border-l-blue-600 border-slate-200'
                    : 'border-l-4 border-l-[#4B5320] border-slate-200'
                }`}
              >
                {/* Alert Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 shrink-0 ${
                        isRed
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : isYellow
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : isBlue
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isRed ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : isYellow ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isBlue ? (
                        <Info className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 border ${
                            isRed
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isYellow
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : isBlue
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-[#4B5320]/10 text-[#4B5320] border-[#4B5320]/30'
                          }`}
                        >
                          Gravidade: {alert.severity}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Local: <strong className="text-slate-800">{alert.location}</strong>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#1A2421] mt-1">{alert.title}</h4>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 border self-start ${
                      alert.status === 'ativo'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-[#4B5320]/15 text-[#4B5320] border-[#4B5320]/40'
                    }`}
                  >
                    {alert.status}
                  </span>
                </div>

                {/* Description and Diagnostic */}
                <p className="text-slate-600 text-xs leading-relaxed">{alert.description}</p>

                {/* Technical Diagnostic Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block tracking-wider">
                      Informação Divergente:
                    </span>
                    <p className="font-mono text-[#1A2421] font-bold mt-0.5">
                      {alert.divergentValueOrInfo || 'Ausência de documento'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block tracking-wider">
                      Motivo Provável:
                    </span>
                    <p className="text-slate-600 mt-0.5 text-[11px]">
                      {alert.probableReason || 'Lançamento pendente de conferência'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block tracking-wider">
                      Ação Recomendada:
                    </span>
                    <p className="text-[#4B5320] mt-0.5 text-[11px] font-bold">
                      {alert.recommendedAction || 'Conferir com o tesoureiro'}
                    </p>
                  </div>
                </div>

                {/* Resolution Notes if resolved */}
                {alert.resolutionNotes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                    <strong className="text-[#1A2421]">Parecer de Resolução:</strong> {alert.resolutionNotes} (por Aluno {alert.resolvedBy} em {formatDatePtBr(alert.resolvedAt)})
                  </div>
                )}

                {/* Interactive Action Controls */}
                {alert.status === 'ativo' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {alert.relatedTransactionId && (
                        <button
                          onClick={() => onNavigate('treasury', alert.relatedTransactionId)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase text-xs border border-slate-200 transition flex items-center gap-1.5"
                        >
                          Ir para Lançamento <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {alert.relatedDocumentId && (
                        <button
                          onClick={() => onNavigate('documents', alert.relatedDocumentId)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase text-xs border border-slate-200 transition flex items-center gap-1.5"
                        >
                          Ir para Documento <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {alert.relatedGraduationServiceId && (
                        <button
                          onClick={() => onNavigate('graduation', alert.relatedGraduationServiceId)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase text-xs border border-slate-200 transition flex items-center gap-1.5"
                        >
                          Ir para Formatura <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAlertToDismiss(alert)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold uppercase text-xs transition"
                          title="Dispensar alerta com justificativa formal"
                        >
                          Justificar / Dispensar
                        </button>
                        <button
                          onClick={() => handleMarkResolved(alert)}
                          className="px-4 py-1.5 bg-[#4B5320] hover:bg-[#3d441a] text-white font-bold uppercase text-xs transition shadow-sm"
                        >
                          Marcar como Resolvido
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Justify and Dismiss Alert */}
      {alertToDismiss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-300 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-[#1A2421] p-4 text-white border-b border-slate-200">
              <div className="flex items-center gap-2 text-[#D4AF37]">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-xs font-bold uppercase tracking-widest font-institutional text-[#D4AF37]">
                  Dispensar Alerta com Justificativa
                </h3>
              </div>
              <button onClick={() => setAlertToDismiss(null)} className="text-slate-300 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <p className="text-slate-700">
                Você está dispensando o alerta <strong className="text-[#1A2421]">"{alertToDismiss.title}"</strong>.
              </p>
              <p className="text-[11px] text-slate-500">
                A justificativa será gravada permanentemente na auditoria do Grêmio para conferência do Comando e da Comissão Fiscal.
              </p>

              <div>
                <label className="block text-slate-700 font-bold text-xs mb-1">
                  Justificativa Formal:
                </label>
                <textarea
                  required
                  rows={3}
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  placeholder="Ex: Pagamento verificado no extrato da conta corrente do Banco do Brasil em 02/05..."
                  className="w-full bg-white border border-slate-300 p-2.5 text-slate-800 text-xs focus:outline-none focus:border-[#4B5320]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAlertToDismiss(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDismiss}
                  disabled={!dismissReason.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold uppercase text-xs shadow-sm transition"
                >
                  Gravar Justificativa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
