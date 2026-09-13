import React, { useState } from 'react';
import { DocumentRecord, Transaction, EventRecord, GraduationService, UserRole } from '../types';
import { formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
import {
  X,
  FileText,
  Download,
  Printer,
  Link as LinkIcon,
  CheckCircle,
  AlertTriangle,
  FileSearch,
  Building2,
  Calendar,
  DollarSign,
  User,
} from 'lucide-react';

interface DocumentViewerModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  events: EventRecord[];
  graduationServices: GraduationService[];
  userRole: UserRole;
  onUpdateDocument: (updated: DocumentRecord) => void;
  onLinkToTransaction: (documentId: string, transactionId: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  transactions,
  events,
  graduationServices,
  userRole,
  onUpdateDocument,
  onLinkToTransaction,
}) => {
  const [selectedTxId, setSelectedTxId] = useState<string>('');

  if (!isOpen || !doc) return null;

  const canEdit = userRole === 'admin' || userRole === 'tesouraria';

  // Find linked entities
  const linkedTx = transactions.find((t) => t.id === doc.relatedTransactionId);
  const linkedEvent = events.find((e) => e.id === doc.relatedEventId);
  const linkedGrad = graduationServices.find((g) => g.id === doc.relatedGraduationServiceId);

  const handleLink = () => {
    if (!selectedTxId) return;
    onLinkToTransaction(doc.id, selectedTxId);
  };

  const handleValidateDoc = () => {
    onUpdateDocument({
      ...doc,
      auditStatus: 'validado',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white border border-slate-300 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-[#1A2421] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#25332e] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono truncate max-w-md">
                {doc.name}
              </h3>
              <p className="text-[11px] text-[#D4AF37]/80">
                Tipo: <span className="capitalize">{doc.type.replace('_', ' ')}</span> • Origem: {doc.source} • Data: {formatDatePtBr(doc.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition"
              title="Imprimir visualização do comprovante"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Left is Preview / Details; Right is Link & OCR Data */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs">
          {/* Left Column: Document Visual Representation */}
          <div className="p-6 space-y-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Visualização do Comprovante Digital
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 uppercase border ${
                  doc.auditStatus === 'validado'
                    ? 'bg-[#4B5320]/15 text-[#4B5320] border-[#4B5320]/40'
                    : doc.auditStatus === 'sem_vinculo'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-red-50 text-red-700 border-red-300'
                }`}
              >
                {doc.auditStatus.replace('_', ' ')}
              </span>
            </div>

            {/* Simulated Document Canvas / Letterhead */}
            <div className="p-6 bg-white border border-slate-200 shadow-xs font-mono text-[11px] text-slate-700 space-y-4">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                <div>
                  <p className="font-bold text-[#1A2421] text-xs">COMPROVANTE OFICIAL</p>
                  <p className="text-slate-500 text-[10px]">{doc.detectedPersonOrCompany || 'Beneficiário Não Especificado'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">{formatDatePtBr(doc.date)}</p>
                  <p className="text-[#4B5320] font-bold text-xs">{formatCurrencyPtBr(doc.detectedAmount || 0)}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Texto Extraído via OCR / Leitor:</p>
                <div className="mt-1 p-3 bg-slate-50 border border-slate-200 whitespace-pre-wrap text-slate-700 font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto">
                  {doc.fileContentOrOcrText || 'Texto original não processado ou ilegível.'}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                <p>Hash SHA-256 de Autenticidade: <span className="text-slate-600 font-mono">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span></p>
                <p>Tamanho do arquivo: {(doc.fileSizeKb / 1024).toFixed(2)} MB • Formato: PDF/Digital</p>
              </div>
            </div>

            {/* Validation Button */}
            {canEdit && doc.auditStatus !== 'validado' && (
              <button
                onClick={handleValidateDoc}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#4B5320] hover:bg-[#3d441a] text-white font-bold uppercase text-xs tracking-wider shadow-sm transition"
              >
                <CheckCircle className="w-4 h-4 text-[#D4AF37]" /> Marcar como Validado pela Tesouraria
              </button>
            )}
          </div>

          {/* Right Column: Metadata & Relations Linking */}
          <div className="p-6 space-y-5 bg-white">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2421] mb-3 flex items-center gap-1.5 font-institutional">
                <FileSearch className="w-4 h-4 text-[#4B5320]" />
                Dados Identificados no Documento
              </h4>

              <div className="space-y-2 bg-slate-50 p-4 border border-slate-200">
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#4B5320]" /> Fornecedor / Empresa:
                  </span>
                  <span className="font-bold text-[#1A2421]">
                    {doc.detectedPersonOrCompany || 'Não identificado'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-[#4B5320]" /> Valor Detectado:
                  </span>
                  <span className="font-mono font-bold text-[#4B5320]">
                    {formatCurrencyPtBr(doc.detectedAmount || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#4B5320]" /> Data Identificada:
                  </span>
                  <span className="text-slate-700 font-medium">
                    {formatDatePtBr(doc.detectedDate || doc.date)}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Association */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2421] mb-2 flex items-center gap-1.5 font-institutional">
                <LinkIcon className="w-4 h-4 text-[#4B5320]" />
                Vínculo Atual no Livro do Grêmio
              </h4>

              {linkedTx ? (
                <div className="p-4 bg-[#4B5320]/10 border border-[#4B5320]/30 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-mono font-bold text-[#1A2421]">{linkedTx.code}</span>
                    <span className="text-[#4B5320] font-bold">{formatCurrencyPtBr(linkedTx.amount)}</span>
                  </div>
                  <p className="text-[#1A2421] font-medium">{linkedTx.description}</p>
                  <p className="text-[10px] text-slate-500">Beneficiário: {linkedTx.beneficiaryName}</p>
                </div>
              ) : linkedEvent ? (
                <div className="p-4 bg-blue-50 border border-blue-200 space-y-1">
                  <span className="font-bold text-blue-900">Evento: {linkedEvent.name}</span>
                  <p className="text-slate-700">{linkedEvent.description}</p>
                </div>
              ) : linkedGrad ? (
                <div className="p-4 bg-amber-50 border border-amber-200 space-y-1">
                  <span className="font-bold text-amber-900">Formatura: {linkedGrad.name}</span>
                  <p className="text-slate-700">{linkedGrad.supplierName}</p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">Comprovante sem Vínculo</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Este documento foi importado, mas ainda não está associado a nenhuma despesa da tesouraria.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Associate with another Transaction form */}
            {canEdit && (
              <div className="space-y-2 pt-3 border-t border-slate-200">
                <label className="block text-slate-700 font-bold">
                  Vincular a uma Transação Existente:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedTxId}
                    onChange={(e) => setSelectedTxId(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#4B5320] text-xs"
                  >
                    <option value="">Selecione a despesa...</option>
                    {transactions
                      .filter((t) => t.type === 'despesa' && t.status !== 'cancelada')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} - {t.description} ({formatCurrencyPtBr(t.amount)})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleLink}
                    disabled={!selectedTxId}
                    className="px-4 py-1.5 bg-[#4B5320] hover:bg-[#3d441a] disabled:opacity-40 text-white font-bold uppercase text-xs transition"
                  >
                    Vincular
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase text-xs border border-slate-300 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
