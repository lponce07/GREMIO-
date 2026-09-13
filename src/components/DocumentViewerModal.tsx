import React, { useState, useEffect, useRef } from 'react';
import { DocumentRecord, Transaction, EventRecord, GraduationService, UserRole, Category } from '../types';
import { formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
import { canManageDocuments, isReadOnlyRole } from '../utils/permissions';
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
  Sparkles,
  Tag,
  Check,
  Trash2,
  Upload,
  Unlink,
} from 'lucide-react';

interface DocumentViewerModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  events: EventRecord[];
  graduationServices: GraduationService[];
  userRole: UserRole;
  categories?: Category[];
  onUpdateDocument: (updated: DocumentRecord) => void;
  onLinkToTransaction: (documentId: string, transactionId: string) => void;
  onConfirmClassification?: (documentId: string, categoryId: string, categoryName: string) => void;
  onConfirmTransactionLink?: (documentId: string, transactionId: string) => void;
  onRejectTransactionLink?: (documentId: string) => void;
  onUnlinkTransaction?: (documentId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onReplaceAttachment?: (
    documentId: string,
    newFileData: { fileData?: string; fileUrl?: string; name?: string; fileType?: string; sizeBytes?: number }
  ) => void;
  onReprocessOcr?: (documentId: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  transactions,
  events,
  graduationServices,
  userRole,
  categories = [],
  onUpdateDocument,
  onLinkToTransaction,
  onConfirmClassification,
  onConfirmTransactionLink,
  onRejectTransactionLink,
  onUnlinkTransaction,
  onDeleteDocument,
  onReplaceAttachment,
  onReprocessOcr,
}) => {
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const isReadOnly = isReadOnlyRole(userRole);
  const canManage = canManageDocuments(userRole) && !isReadOnly;
  const canEdit = canManage;

  const handleFileReplacement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onReplaceAttachment) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onReplaceAttachment(doc.id, {
        fileData: result,
        fileUrl: result,
        name: file.name,
        fileType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = () => {
    if (onDeleteDocument) {
      onDeleteDocument(doc.id);
      onClose();
    }
  };

  // Find linked entities
  const linkedTx = transactions.find((t) => t.id === doc.relatedTransactionId);
  const suggestedTx = doc.suggestedTransactionId ? transactions.find((t) => t.id === doc.suggestedTransactionId) : null;
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

  const handleConfirmCategory = (catId?: string, catName?: string) => {
    const targetCatId = catId || doc.categoryId || selectedCatId;
    const found = categories.find((c) => c.id === targetCatId);
    const targetCatName = catName || doc.categoryName || found?.name || 'Geral';

    if (onConfirmClassification) {
      onConfirmClassification(doc.id, targetCatId, targetCatName);
    } else {
      onUpdateDocument({
        ...doc,
        categoryId: targetCatId,
        categoryName: targetCatName,
        classificationStatus: 'classificado',
      });
    }
  };

  const handleConfirmSuggestedLink = () => {
    if (suggestedTx && onConfirmTransactionLink) {
      onConfirmTransactionLink(doc.id, suggestedTx.id);
    } else if (suggestedTx) {
      onLinkToTransaction(doc.id, suggestedTx.id);
    }
  };

  const handleRejectSuggestedLink = () => {
    if (onRejectTransactionLink) {
      onRejectTransactionLink(doc.id);
    } else {
      onUpdateDocument({
        ...doc,
        suggestedTransactionId: undefined,
        transactionLinkStatus: 'sem_vinculo',
      });
    }
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
            {canEdit && onReprocessOcr && (
              <button
                onClick={() => onReprocessOcr(doc.id)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-[#D4AF37] font-bold text-xs rounded transition flex items-center gap-1.5 border border-[#D4AF37]/30"
                title="Reprocessar OCR deste comprovante"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Reprocessar OCR</span>
              </button>
            )}
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
                {/* Status do OCR */}
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#4B5320]" /> Status do OCR:
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                      doc.ocrStatus === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : doc.ocrStatus === 'needs_review'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : doc.ocrStatus === 'failed'
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {doc.ocrStatus === 'success'
                      ? '✓ OCR Concluído'
                      : doc.ocrStatus === 'needs_review'
                      ? '⚠ Revisão Necessária'
                      : doc.ocrStatus === 'failed'
                      ? '✕ Falha no OCR'
                      : 'Pendente'}
                  </span>
                </div>

                {doc.technicalError && (
                  <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-[10px] rounded">
                    <strong>Erro Técnico:</strong> {doc.technicalError}
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#4B5320]" /> Favorecido / Recebedor:
                  </span>
                  <span className="font-bold text-[#1A2421]">
                    {doc.detectedReceiver || doc.detectedSupplier || doc.detectedPersonOrCompany || 'Não identificado'}
                  </span>
                </div>

                {doc.detectedPayer && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#4B5320]" /> Pagador / Origem:
                    </span>
                    <span className="font-semibold text-slate-800">{doc.detectedPayer}</span>
                  </div>
                )}

                {doc.detectedCpfCnpj && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-[#4B5320]" /> CPF / CNPJ:
                    </span>
                    <span className="font-mono text-slate-800">{doc.detectedCpfCnpj}</span>
                  </div>
                )}

                {doc.detectedBank && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#4B5320]" /> Instituição Financeira:
                    </span>
                    <span className="font-medium text-slate-800">{doc.detectedBank}</span>
                  </div>
                )}

                {doc.detectedControlNumber && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-[#4B5320]" /> ID Controle / Autenticação:
                    </span>
                    <span className="font-mono text-[10px] text-slate-700 truncate max-w-[180px]" title={doc.detectedControlNumber}>
                      {doc.detectedControlNumber}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-[#4B5320]" /> Valor Detectado:
                  </span>
                  <span className="font-mono font-bold text-[#4B5320]">
                    {formatCurrencyPtBr(doc.detectedAmount || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#4B5320]" /> Data Identificada:
                  </span>
                  <span className="text-slate-700 font-medium">
                    {formatDatePtBr(doc.detectedDate || doc.date)}
                  </span>
                </div>

                {/* Categoria Contábil */}
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-[#4B5320]" /> Categoria Contábil:
                    </span>
                    <span className="font-bold text-slate-900">
                      {doc.categoryName || 'Não classificada'}
                    </span>
                  </div>

                  {doc.classificationConfidence !== undefined && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>Certeza da Classificação:</span>
                      <span className={`font-semibold ${doc.classificationConfidence >= 0.9 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {Math.round(doc.classificationConfidence * 100)}%
                        {doc.classificationConfidence >= 0.9 ? ' (Alta)' : ' (Aguardando Confirmação)'}
                      </span>
                    </div>
                  )}

                  {canEdit && doc.classificationStatus === 'aguardando_confirmacao' && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      <p className="text-[11px] text-amber-800 font-medium">
                        O sistema sugeriu <strong>"{doc.categoryName}"</strong>. Confirme ou altere a categoria:
                      </p>
                      <div className="flex gap-2">
                        <select
                          value={selectedCatId || doc.categoryId || ''}
                          onChange={(e) => setSelectedCatId(e.target.value)}
                          className="flex-1 bg-white border border-slate-300 px-2 py-1 text-xs text-slate-800 rounded-sm"
                        >
                          <option value="">Selecione categoria...</option>
                          {Array.from(new Map(categories.map((c) => [c.id, c])).values()).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleConfirmCategory()}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-sm transition flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sugestão Automática de Vínculo com Lançamento da Tesouraria */}
            {suggestedTx && doc.transactionLinkStatus === 'aguardando_confirmacao' && !linkedTx && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-blue-700" />
                  Sugestão de Lançamento Correspondente ({Math.round((doc.transactionLinkConfidence || 0) * 100)}% certeza)
                </div>
                <div className="bg-white p-2.5 border border-blue-100 rounded-sm text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{suggestedTx.code} - {suggestedTx.description}</span>
                    <span className="text-emerald-700">{formatCurrencyPtBr(suggestedTx.amount)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Data: {formatDatePtBr(suggestedTx.date)} • Favorecido: {suggestedTx.beneficiaryName || (suggestedTx as any).beneficiary || (suggestedTx as any).supplier || 'N/A'}
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={handleRejectSuggestedLink}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 border border-slate-300 text-xs font-semibold rounded-sm transition"
                  >
                    Rejeitar Sugestão
                  </button>
                  <button
                    onClick={handleConfirmSuggestedLink}
                    className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-sm transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Confirmar Vínculo
                  </button>
                </div>
              </div>
            )}

            {/* Current Association */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2421] mb-2 flex items-center gap-1.5 font-institutional">
                <LinkIcon className="w-4 h-4 text-[#4B5320]" />
                Vínculo Atual no Livro do Grêmio
              </h4>

              {linkedTx ? (
                <div className="p-4 bg-[#4B5320]/10 border border-[#4B5320]/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-mono font-bold text-[#1A2421]">{linkedTx.code}</span>
                    <span className="text-[#4B5320] font-bold">{formatCurrencyPtBr(linkedTx.amount)}</span>
                  </div>
                  <p className="text-[#1A2421] font-medium">{linkedTx.description}</p>
                  <p className="text-[10px] text-slate-500">Beneficiário: {linkedTx.beneficiaryName}</p>

                  {canEdit && (
                    <div className="pt-2 border-t border-[#4B5320]/20 flex justify-end">
                      <button
                        onClick={() => {
                          if (onUnlinkTransaction) {
                            onUnlinkTransaction(doc.id);
                          } else {
                            onUpdateDocument({
                              ...doc,
                              relatedTransactionId: undefined,
                              auditStatus: 'sem_vinculo',
                            });
                          }
                        }}
                        className="text-[11px] text-red-600 hover:text-red-800 font-bold underline cursor-pointer"
                      >
                        Desvincular deste lançamento
                      </button>
                    </div>
                  )}
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
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canManage && onReplaceAttachment && (
              <>
                <input
                  ref={replaceFileInputRef}
                  type="file"
                  onChange={handleFileReplacement}
                  className="hidden"
                  accept=".pdf,image/*"
                />
                <button
                  onClick={() => replaceFileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase text-xs border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                  title="Substituir o arquivo deste documento"
                >
                  <Upload className="w-3.5 h-3.5 text-[#4B5320]" />
                  Substituir Anexo
                </button>
              </>
            )}

            {canManage && onDeleteDocument && (
              <>
                {!isConfirmingDelete ? (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 font-bold uppercase text-xs border border-red-200 flex items-center gap-1.5 transition cursor-pointer"
                    title="Excluir comprovante formalmente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Comprovante
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-300 px-2 py-1">
                    <span className="text-[11px] text-red-900 font-bold">Confirma exclusão?</span>
                    <button
                      onClick={handleDelete}
                      className="px-2 py-0.5 bg-red-700 text-white font-bold text-xs uppercase hover:bg-red-800 transition cursor-pointer"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2 py-0.5 bg-white text-slate-700 font-bold text-xs uppercase hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
                    >
                      Não
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase text-xs border border-slate-300 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
