import React, { useState } from 'react';
import { DocumentRecord, Transaction, UserRole } from '../types';
import {
  canManageDocuments,
  canRunOcr,
  isReadOnlyRole,
} from '../utils/permissions';
import { AppState, formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
import { extractTextFromPdfBuffer, parseVoucherMetadata } from '../services/categoryClassifier';
import { robustOcrService } from '../services/ocrService';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Eye,
  Link,
  CheckCircle,
  AlertTriangle,
  FileCheck2,
  FileSearch,
  Sparkles,
  Building2,
  Trash2,
  RefreshCw,
  Unlink,
  User,
} from 'lucide-react';

interface DocumentsViewProps {
  appState: AppState;
  userRole: UserRole;
  onOpenDocument: (docId: string) => void;
  onAddDocument: (doc: DocumentRecord) => void;
  onDeleteDocument?: (docId: string) => void;
  onReprocessDocumentOcr?: (docId: string) => Promise<void>;
  onUnlinkDocument?: (docId: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  appState,
  userRole,
  onOpenDocument,
  onAddDocument,
  onDeleteDocument,
  onReprocessDocumentOcr,
  onUnlinkDocument,
}) => {
  const { documents, transactions } = appState;
  const canManage = canManageDocuments(userRole);
  const canOcr = canRunOcr(userRole);
  const isReadOnly = isReadOnlyRole(userRole);

  const [filterType, setFilterType] = useState<string>('todos');
  const [filterAudit, setFilterAudit] = useState<string>('todos');
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload simulation modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadType, setUploadType] = useState<any>('comprovante_pix');
  const [uploadSource, setUploadSource] = useState<'upload_manual' | 'google_drive' | 'email_gmail'>('upload_manual');
  const [uploadSupplier, setUploadSupplier] = useState('');
  const [uploadAmount, setUploadAmount] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAnalyzingOcr, setIsAnalyzingOcr] = useState(false);
  const [ocrExtractedText, setOcrExtractedText] = useState('');
  const [detectedPayer, setDetectedPayer] = useState('');
  const [detectedReceiver, setDetectedReceiver] = useState('');
  const [detectedCpfCnpj, setDetectedCpfCnpj] = useState('');
  const [detectedBank, setDetectedBank] = useState('');
  const [detectedControlNumber, setDetectedControlNumber] = useState('');
  const [ocrStatus, setOcrStatus] = useState<'pending' | 'processing' | 'success' | 'needs_review' | 'failed'>('pending');
  const [reprocessingDocId, setReprocessingDocId] = useState<string | null>(null);

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    if (filterType !== 'todos' && doc.type !== filterType) return false;
    if (filterAudit !== 'todos' && doc.auditStatus !== filterAudit) return false;
    if (filterCategory !== 'todos') {
      if (filterCategory === 'sem_categoria') {
        if (doc.categoryId || doc.categoryName) return false;
      } else if (doc.categoryId !== filterCategory && doc.categoryName !== filterCategory) {
        return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchSup = (doc.detectedPersonOrCompany || doc.detectedSupplier || doc.detectedReceiver || '').toLowerCase().includes(q);
      const matchText = (doc.fileContentOrOcrText || '').toLowerCase().includes(q);
      const matchCat = (doc.categoryName || '').toLowerCase().includes(q);
      if (!matchName && !matchSup && !matchText && !matchCat) return false;
    }

    return true;
  });

  const unlinkedCount = documents.filter((d) => d.auditStatus === 'sem_vinculo').length;

  const handleSimulatedFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setIsAnalyzingOcr(true);
    setOcrExtractedText('');

    try {
      const buffer = await file.arrayBuffer();
      // Use the robust singleton OCR queue engine
      const ocrResult = await robustOcrService.processDocument(
        {
          fileName: file.name,
          buffer,
          mimeType: file.type || 'application/octet-stream',
        },
        (progress, phase) => {
          console.log(`[OCR Upload] ${progress}% - ${phase}`);
        }
      );
      const extractedText = ocrResult.text || '';
      setOcrExtractedText(extractedText);

      const metadata = parseVoucherMetadata(`${file.name} ${extractedText}`);
      if (metadata.detectedSupplier) setUploadSupplier(metadata.detectedSupplier);
      if (metadata.detectedAmount) setUploadAmount(metadata.detectedAmount.toFixed(2).replace('.', ','));
      if (metadata.detectedDate) setUploadDate(metadata.detectedDate);
      if (metadata.detectedReceiver) setDetectedReceiver(metadata.detectedReceiver);
      if (metadata.detectedPayer) setDetectedPayer(metadata.detectedPayer);
      if (metadata.detectedCpfCnpj) setDetectedCpfCnpj(metadata.detectedCpfCnpj);
      if (metadata.detectedBank) setDetectedBank(metadata.detectedBank);
      if (metadata.detectedControlNumber) setDetectedControlNumber(metadata.detectedControlNumber);
      if (metadata.detectedTransactionType) setUploadType(metadata.detectedTransactionType);

      setOcrStatus(ocrResult.status);
    } catch (err) {
      console.warn('Não foi possível extrair automaticamente o conteúdo do arquivo enviado:', err);
      setOcrExtractedText('');
      setOcrStatus('failed');
    } finally {
      setIsAnalyzingOcr(false);
    }
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(uploadAmount.replace(/\./g, '').replace(',', '.')) || 0;

    const newDoc: DocumentRecord = {
      id: `doc-${Date.now()}`,
      name: uploadFileName || `comprovante_${Date.now()}.pdf`,
      source: uploadSource,
      type: uploadType,
      date: uploadDate,
      detectedDate: uploadDate,
      detectedAmount: amountNum,
      detectedPersonOrCompany: detectedReceiver || uploadSupplier || 'Não informado',
      detectedSupplier: uploadSupplier,
      detectedReceiver: detectedReceiver || uploadSupplier,
      detectedPayer: detectedPayer,
      detectedCpfCnpj: detectedCpfCnpj,
      detectedBank: detectedBank,
      detectedControlNumber: detectedControlNumber,
      detectedTransactionType: uploadType,
      fileContentOrOcrText: ocrExtractedText,
      extractedText: ocrExtractedText,
      auditStatus: 'sem_vinculo',
      ocrStatus: ocrStatus === 'pending' ? (ocrExtractedText.length > 10 ? 'success' : 'needs_review') : ocrStatus,
      uploadedAt: new Date().toISOString(),
    };

    onAddDocument(newDoc);
    setIsUploadModalOpen(false);

    // Reset
    setUploadFileName('');
    setUploadSupplier('');
    setDetectedPayer('');
    setDetectedReceiver('');
    setDetectedCpfCnpj('');
    setDetectedBank('');
    setDetectedControlNumber('');
    setUploadAmount('');
    setOcrExtractedText('');
    setOcrStatus('pending');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#1A2421] text-[#D4AF37] border border-[#D4AF37]/30">
              Arquivo & Fiscalização
            </span>
            <span className="text-xs text-slate-500 font-medium">Repositório Digital Auditável</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A2421] mt-1 font-institutional flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#4B5320]" />
            Central de Documentos & Comprovantes
          </h2>
          <p className="text-xs text-slate-500">
            Notas fiscais, recibos, comprovantes bancários PIX, contratos e cotações vinculados ao livro do Grêmio.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Anexar Documento Digital
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2.5 rounded-sm">
          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Modo Consulta Aberta:</strong> Alunos da Turma possuem acesso irrestrito para visualização, download e conferência de todos os comprovantes, notas fiscais e recibos arquivados do Grêmio.
          </span>
        </div>
      )}

      {/* Unlinked Documents Alert Banner */}
      {unlinkedCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-[#1A2421]">
                Existem {unlinkedCount} comprovante(s) sem vínculo com despesas da tesouraria!
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Arquivos recebidos por e-mail ou sincronizados do Google Drive que aguardam conciliação.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterAudit('sem_vinculo')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase text-xs tracking-wider whitespace-nowrap transition"
          >
            Filtrar Sem Vínculo
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome do arquivo, empresa ou conteúdo OCR..."
              className="w-full bg-white border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4B5320]"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#4B5320]"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="nota_fiscal">Notas Fiscais (NF-e)</option>
            <option value="comprovante_pix">Comprovantes PIX</option>
            <option value="recibo">Recibos Simples</option>
            <option value="contrato">Contratos Assinados</option>
            <option value="orcamento">Orçamentos e Cotações</option>
          </select>

          <select
            value={filterAudit}
            onChange={(e) => setFilterAudit(e.target.value)}
            className="bg-white border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#4B5320]"
          >
            <option value="todos">Todas as Situações Fiscais</option>
            <option value="sem_vinculo">Sem Vínculo (Pendente)</option>
            <option value="validado">Validados pela Tesouraria</option>
            <option value="pendente_conferencia">Pendente de Conferência</option>
            <option value="com_divergencia">Com Divergência</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#4B5320]"
          >
            <option value="todos">Todas as Categorias</option>
            <option value="sem_categoria">Sem Categoria</option>
            {Array.from(new Map((appState.categories || []).map((cat) => [cat.id, cat])).values()).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-[11px] text-slate-500 font-medium">
          Mostrando {filteredDocs.length} de {documents.length} documentos
        </span>
      </div>

      {/* Documents Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => {
          const linkedTx = transactions.find((t) => t.id === doc.relatedTransactionId);
          const isReprocessingThis = reprocessingDocId === doc.id;

          const handleReprocess = async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!onReprocessDocumentOcr) return;
            setReprocessingDocId(doc.id);
            try {
              await onReprocessDocumentOcr(doc.id);
            } finally {
              setReprocessingDocId(null);
            }
          };

          const handleUnlink = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (onUnlinkDocument) {
              onUnlinkDocument(doc.id);
            }
          };

          return (
            <div
              key={doc.id}
              className="bg-white border border-slate-200 p-4 shadow-xs space-y-3 hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                {/* Header: File Name & Badges */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 truncate flex-1">
                    <FileText className="w-4 h-4 text-[#4B5320] shrink-0" />
                    <span className="font-mono text-xs font-bold text-[#1A2421] truncate" title={doc.name}>
                      {doc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* OCR Status Badge */}
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 border rounded-xs ${
                        doc.ocrStatus === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : doc.ocrStatus === 'needs_review'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : doc.ocrStatus === 'failed'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                      title={doc.technicalError ? `Erro: ${doc.technicalError}` : `Status OCR: ${doc.ocrStatus || 'pendente'}`}
                    >
                      {doc.ocrStatus === 'success'
                        ? 'OCR OK'
                        : doc.ocrStatus === 'needs_review'
                        ? 'OCR Revisar'
                        : doc.ocrStatus === 'failed'
                        ? 'OCR Falha'
                        : 'OCR Pendente'}
                    </span>

                    {/* Audit Status Badge */}
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 border rounded-xs ${
                        doc.auditStatus === 'validado'
                          ? 'bg-[#4B5320]/15 text-[#4B5320] border-[#4B5320]/40'
                          : doc.auditStatus === 'sem_vinculo'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-red-50 text-red-700 border-red-300'
                      }`}
                    >
                      {doc.auditStatus === 'validado' ? 'Validado' : doc.auditStatus === 'sem_vinculo' ? 'Sem Vínculo' : 'Divergência'}
                    </span>
                  </div>
                </div>

                {/* Document Type & Origin */}
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold uppercase tracking-wider text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-xs border border-slate-200 text-[10px]">
                    {doc.type ? doc.type.replace('_', ' ') : 'Comprovante'}
                  </span>
                  <span>
                    Origem: <strong className="capitalize text-slate-700">{doc.source.replace('_', ' ')}</strong>
                  </span>
                </div>

                {/* Extracted Structured Metadata */}
                <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-xs border border-slate-150">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-medium">Favorecido / Recebedor:</span>
                    <p className="text-[#1A2421] font-bold truncate" title={doc.detectedReceiver || doc.detectedPersonOrCompany || ''}>
                      {doc.detectedReceiver || doc.detectedPersonOrCompany || 'Não Identificado'}
                    </p>
                  </div>

                  {doc.detectedPayer && (
                    <div className="pt-0.5">
                      <span className="text-[10px] text-slate-500 uppercase font-medium">Pagador:</span>
                      <p className="text-slate-700 truncate" title={doc.detectedPayer}>
                        {doc.detectedPayer}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 border-t border-slate-200/60 mt-1">
                    <span>Data: <strong className="text-slate-800">{formatDatePtBr(doc.detectedDate || doc.date)}</strong></span>
                    {doc.detectedBank && (
                      <span className="truncate max-w-[120px]" title={doc.detectedBank}>
                        Banco: <strong className="text-slate-800">{doc.detectedBank}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount and Category */}
                <div className="pt-1 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Valor Identificado</span>
                    <p className="text-base font-mono font-bold text-[#1A2421]">
                      {formatCurrencyPtBr(doc.detectedAmount || 0)}
                    </p>
                  </div>
                  {doc.categoryName && (
                    <div className="text-right">
                      <span className="inline-block text-[10px] font-semibold bg-[#4B5320]/10 border border-[#4B5320]/20 px-2 py-0.5 rounded text-[#4B5320]">
                        {doc.categoryName}
                      </span>
                      {doc.classificationStatus === 'aguardando_confirmacao' && (
                        <span className="block text-[9px] text-amber-700 font-bold mt-0.5">
                          Aguardando Confirmação
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Linked Transaction Status */}
                <div className="pt-2 border-t border-slate-100 text-[11px] flex items-center justify-between">
                  {linkedTx ? (
                    <div className="text-[#4B5320] flex items-center gap-1.5 font-medium truncate">
                      <Link className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Vinculado a: <strong>{linkedTx.code}</strong></span>
                    </div>
                  ) : (
                    <div className="text-amber-700 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Sem lançamento associado</span>
                    </div>
                  )}

                  {canManage && linkedTx && onUnlinkDocument && (
                    <button
                      onClick={handleUnlink}
                      className="text-[10px] text-red-600 hover:text-red-800 font-bold flex items-center gap-0.5 underline shrink-0 cursor-pointer"
                      title="Desvincular deste lançamento"
                    >
                      <Unlink className="w-3 h-3" />
                      Desvincular
                    </button>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => onOpenDocument(doc.id)}
                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-[#1A2421] text-xs font-bold uppercase tracking-wider border border-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Visualizar & Vincular
                </button>

                {canOcr && onReprocessDocumentOcr && (
                  <button
                    onClick={handleReprocess}
                    disabled={isReprocessingThis}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition disabled:opacity-50 cursor-pointer"
                    title="Reprocessar OCR deste comprovante"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#4B5320] ${isReprocessingThis ? 'animate-spin' : ''}`} />
                  </button>
                )}

                {canManage && onDeleteDocument && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Confirma a exclusão formal do documento "${doc.name}"? Esta operação desvinculará o documento e atualizará a auditoria contábil.`)) {
                        onDeleteDocument(doc.id);
                      }
                    }}
                    className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-700 border border-slate-200 transition cursor-pointer"
                    title="Excluir comprovante formalmente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Upload and OCR Document */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-slate-300 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#1A2421] p-4 text-white">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] font-institutional flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#D4AF37]" />
                Anexar Comprovante / Nota Fiscal
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveDocument} className="p-6 space-y-3.5 text-xs text-slate-700">
              {/* Drop area */}
              <div className="border-2 border-dashed border-slate-300 p-5 text-center bg-slate-50 hover:border-[#4B5320] transition">
                <input
                  type="file"
                  id="docUploadInput"
                  onChange={handleSimulatedFileUpload}
                  className="hidden"
                />
                <label htmlFor="docUploadInput" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                  <p className="font-bold text-[#1A2421]">Clique para selecionar ou arraste o arquivo PDF/Imagem</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    O sistema analisará automaticamente os dados de pagamento via OCR
                  </p>
                  {uploadFileName && (
                    <p className="mt-2 text-[#4B5320] font-mono font-bold text-xs">
                      Arquivo selecionado: {uploadFileName}
                    </p>
                  )}
                </label>
              </div>

              {isAnalyzingOcr && (
                <div className="p-3 bg-[#4B5320]/10 border border-[#4B5320]/30 flex items-center gap-2 text-[#4B5320]">
                  <Sparkles className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span className="font-medium">Extraindo valores, datas e fornecedor via Inteligência Artificial...</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tipo de Documento</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                  >
                    <option value="comprovante_pix">Comprovante PIX</option>
                    <option value="nota_fiscal">Nota Fiscal Eletrônica</option>
                    <option value="recibo">Recibo Simples</option>
                    <option value="contrato">Contrato de Prestação</option>
                    <option value="orcamento">Orçamento de Serviço</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Canal de Entrada</label>
                  <select
                    value={uploadSource}
                    onChange={(e) => setUploadSource(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                  >
                    <option value="upload_manual">Upload Manual Direto</option>
                    <option value="google_drive">Google Drive Integrado</option>
                    <option value="email_gmail">E-mail Gmail do Grêmio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fornecedor / Beneficiário</label>
                  <input
                    type="text"
                    required
                    value={uploadSupplier}
                    onChange={(e) => setUploadSupplier(e.target.value)}
                    placeholder="Ex: Cerimonial Espadas de Honra"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Valor do Documento (R$)</label>
                  <input
                    type="text"
                    required
                    value={uploadAmount}
                    onChange={(e) => setUploadAmount(e.target.value)}
                    placeholder="Ex: 850,00"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-[#4B5320]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAnalyzingOcr}
                  className="px-5 py-2 bg-[#4B5320] hover:bg-[#3d441a] disabled:opacity-50 text-white font-bold uppercase text-xs shadow-sm transition"
                >
                  Salvar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
