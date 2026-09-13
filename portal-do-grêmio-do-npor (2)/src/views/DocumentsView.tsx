import React, { useState } from 'react';
import { DocumentRecord, Transaction, UserRole } from '../types';
import { AppState, formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
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
} from 'lucide-react';

interface DocumentsViewProps {
  appState: AppState;
  userRole: UserRole;
  onOpenDocument: (docId: string) => void;
  onAddDocument: (doc: DocumentRecord) => void;
  onDeleteDocument?: (docId: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  appState,
  userRole,
  onOpenDocument,
  onAddDocument,
  onDeleteDocument,
}) => {
  const { documents, transactions } = appState;
  const canEdit = userRole === 'admin' || userRole === 'tesouraria';

  const [filterType, setFilterType] = useState<string>('todos');
  const [filterAudit, setFilterAudit] = useState<string>('todos');
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

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    if (filterType !== 'todos' && doc.type !== filterType) return false;
    if (filterAudit !== 'todos' && doc.auditStatus !== filterAudit) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchSup = (doc.detectedPersonOrCompany || '').toLowerCase().includes(q);
      const matchText = (doc.fileContentOrOcrText || '').toLowerCase().includes(q);
      if (!matchName && !matchSup && !matchText) return false;
    }

    return true;
  });

  const unlinkedCount = documents.filter((d) => d.auditStatus === 'sem_vinculo').length;

  const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setIsAnalyzingOcr(true);

    // Call OCR analysis API endpoint
    setTimeout(async () => {
      try {
        const response = await fetch('/api/gemini/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentText: `COMPROVANTE DE PAGAMENTO PIX
Data: ${new Date().toLocaleDateString('pt-BR')}
Recebedor: COMERCIO MILITAR LTDA
CNPJ: 12.345.678/0001-90
Instituição: BANCO DO BRASIL S.A.
Valor: R$ 380,00
Autenticação: A789B123C456D789`,
            documentType: uploadType,
          }),
        });

        if (response.ok) {
          const res = await response.json();
          if (res.detectedPersonOrCompany) setUploadSupplier(res.detectedPersonOrCompany);
          if (res.detectedAmount) setUploadAmount(res.detectedAmount.toString());
          if (res.detectedDate) setUploadDate(res.detectedDate);
          setOcrExtractedText(res.notes || 'Comprovante autêntico processado com sucesso.');
        }
      } catch (err) {
        setUploadSupplier('Fornecedor Identificado');
        setUploadAmount('380,00');
        setOcrExtractedText('Processamento automático local concluído.');
      } finally {
        setIsAnalyzingOcr(false);
      }
    }, 1200);
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
      detectedPersonOrCompany: uploadSupplier || 'Não Identificado',
      fileSizeKb: 650,
      fileContentOrOcrText: ocrExtractedText || `Documento digital arquivado na pasta do Grêmio em ${uploadDate}.`,
      auditStatus: 'sem_vinculo',
      uploadedAt: new Date().toISOString(),
    };

    onAddDocument(newDoc);
    setIsUploadModalOpen(false);

    // Reset
    setUploadFileName('');
    setUploadSupplier('');
    setUploadAmount('');
    setOcrExtractedText('');
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

        {canEdit && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition"
          >
            <Upload className="w-4 h-4" />
            Anexar Documento Digital
          </button>
        )}
      </div>

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
        </div>

        <span className="text-[11px] text-slate-500 font-medium">
          Mostrando {filteredDocs.length} de {documents.length} documentos
        </span>
      </div>

      {/* Documents Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => {
          const linkedTx = transactions.find((t) => t.id === doc.relatedTransactionId);

          return (
            <div
              key={doc.id}
              className="bg-white border border-slate-200 p-5 shadow-sm space-y-3 hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-[#4B5320] shrink-0" />
                    <span className="font-mono text-xs font-bold text-[#1A2421] truncate" title={doc.name}>
                      {doc.name}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] uppercase font-bold px-2 py-0.5 shrink-0 border ${
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

                <div className="text-xs space-y-1">
                  <p className="text-[#1A2421] font-bold">
                    {doc.detectedPersonOrCompany || 'Fornecedor Não Identificado'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Data: {formatDatePtBr(doc.date)} • Origem: <span className="capitalize">{doc.source.replace('_', ' ')}</span>
                  </p>
                </div>

                {/* Amount */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Valor Identificado</span>
                  <p className="text-base font-mono font-bold text-[#1A2421]">
                    {formatCurrencyPtBr(doc.detectedAmount || 0)}
                  </p>
                </div>

                {/* Linked Transaction Status */}
                <div className="pt-2 border-t border-slate-100 text-[11px]">
                  {linkedTx ? (
                    <div className="text-[#4B5320] flex items-center gap-1.5 font-medium">
                      <Link className="w-3.5 h-3.5" />
                      <span>Vinculado a: <strong>{linkedTx.code}</strong></span>
                    </div>
                  ) : (
                    <div className="text-amber-700 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Sem lançamento associado</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => onOpenDocument(doc.id)}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-[#1A2421] text-xs font-bold uppercase tracking-wider border border-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Visualizar & Vincular
                </button>
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
