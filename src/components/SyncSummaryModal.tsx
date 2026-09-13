import React, { useEffect } from 'react';
import { SyncSummaryReport } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  Link2,
  FileText,
  Building2,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react';

interface SyncSummaryModalProps {
  report: SyncSummaryReport;
  isOpen?: boolean;
  onClose: () => void;
  onNavigateToCategories?: () => void;
  onNavigateToDocuments?: () => void;
  onGoToCategories?: () => void;
  onGoToDocuments?: () => void;
}

export const SyncSummaryModal: React.FC<SyncSummaryModalProps> = ({
  report,
  isOpen = true,
  onClose,
  onNavigateToCategories,
  onNavigateToDocuments,
  onGoToCategories,
  onGoToDocuments,
}) => {
  if (isOpen === false || !report) return null;

  const handleGoToCategories = onNavigateToCategories || onGoToCategories;
  const handleGoToDocuments = onNavigateToDocuments || onGoToDocuments;

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

  const totalFiles = report.filesAnalyzed ?? report.documentsFound ?? 0;
  const newCatCount = Array.isArray(report.newCategoriesCreated)
    ? report.newCategoriesCreated.length
    : (typeof report.newCategoriesCreated === 'number' ? report.newCategoriesCreated : 0);
  const createdNames = report.createdCategoryNames || (Array.isArray(report.newCategoriesCreated) ? report.newCategoriesCreated : []);
  const pendingCount = report.pendingConfirmations ?? report.linksPendingConfirmation ?? 0;
  const suppliersCount = report.newSuppliersIdentified ?? 0;
  const existingCount = Array.isArray(report.existingCategoriesUsed) ? report.existingCategoriesUsed.length : (report.existingCategoriesUsed || 0);
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
        {/* Topo com Identidade Militar */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Resumo da Sincronização & Classificação
              </h2>
              <p className="text-xs text-slate-500">
                Google Drive processado por regras contábeis, OCR e classificação documental automática.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grade de Estatísticas do Relatório */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Arquivos Analisados
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalFiles}</p>
            <span className="text-[10px] text-slate-400">Total no Google Drive</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Identificados
            </div>
            <p className="text-2xl font-bold text-emerald-700">{report.documentsIdentified}</p>
            <span className="text-[10px] text-emerald-600">Comprovantes válidos</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              Vínculos Automáticos
            </div>
            <p className="text-2xl font-bold text-blue-700">{report.automaticLinks}</p>
            <span className="text-[10px] text-blue-600">Com alta certeza (&ge;85%)</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
              <FolderPlus className="w-3.5 h-3.5 text-purple-600" />
              Novas Categorias
            </div>
            <p className="text-2xl font-bold text-purple-700">{newCatCount}</p>
            <span className="text-[10px] text-purple-600">Criadas dinamicamente</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              Novos Fornecedores
            </div>
            <p className="text-2xl font-bold text-amber-700">{suppliersCount}</p>
            <span className="text-[10px] text-amber-600">Empresas e favorecidos</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Para Confirmação
            </div>
            <p className="text-2xl font-bold text-rose-700">{pendingCount}</p>
            <span className="text-[10px] text-rose-600">Casos duvidosos</span>
          </div>
        </div>

        {/* Lista de Novas Categorias Criadas se houver */}
        {createdNames.length > 0 && (
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-emerald-700" />
              Categorias Criadas Automaticamente:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {createdNames.map((name, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 text-xs font-semibold bg-white text-emerald-900 border border-emerald-300 rounded-lg shadow-2xs"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé e Ações */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Categorias oficiais preservadas: <strong>{existingCount}</strong>
          </div>

          <div className="flex items-center gap-2">
            {handleGoToCategories && (
              <button
                onClick={() => {
                  onClose();
                  handleGoToCategories();
                }}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                Ver Projetos e Categorias
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-xs"
            >
              Fechar Resumo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
