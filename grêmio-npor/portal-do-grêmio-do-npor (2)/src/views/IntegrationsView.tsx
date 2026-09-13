import React, { useState, useEffect } from 'react';
import { AppState, formatDatePtBr } from '../services/dataService';
import {
  OFFICIAL_CATEGORIES,
  ROOT_FOLDER_ID,
  ROOT_FOLDER_URL,
  getFolderDisplayStatus,
} from '../services/googleDriveService';
import {
  googleSignIn,
  googleSignOut,
  getCachedUser,
  isGoogleConnected,
  initAuth,
} from '../services/googleAuthService';
import { UserRole } from '../types';
import {
  Share2,
  HardDrive,
  ExternalLink,
  FolderSync,
  FileSpreadsheet,
  CheckCircle2,
  UploadCloud,
  FileText,
  RefreshCw,
  LogIn,
  LogOut,
  ShieldCheck,
  FolderOpen,
  FileCode,
  File,
} from 'lucide-react';

interface IntegrationsViewProps {
  appState: AppState;
  userRole: UserRole;
  onSyncGoogleDrive?: () => Promise<void> | void;
  onSyncGmail?: () => void;
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'PLANILHA MÃE': 'Movimentações financeiras gerais, livro caixa e lançamentos oficiais do Grêmio.',
  'FESTA JULINA': 'Documentos, planilhas de receitas e despesas vinculadas ao evento Festa Julina.',
  'CUSTOS ADICIONAIS': 'Gastos operacionais extraordinários, taxas e despesas complementares.',
  'CONTRATOS': 'Contratos formais com prestadores de serviço, músicos, buffet e fornecedores.',
  'UNIFORMES': 'Pedidos, orçamentos e fornecedores de fardamento e uniformes militares.',
  'CONFRATERNIZAÇÃO': 'Eventos sociais, encontros de confraternização e confrarias da turma.',
  'ABRIGOS': 'Agasalhos e abrigos padronizados de representação do NPOR.',
  'CAMISAS': 'Camisas temáticas, esportivas e casuais do Grêmio de alunos.',
  'RIFAS': 'Campanhas de rifas, ações entre amigos e controle de bilhetes vendidos.',
  'MENSALIDADE': 'Planilha de controle individual de mensalidades arrecadadas dos alunos.',
};

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  appState,
  onSyncGoogleDrive,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('PLANILHA MÃE');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [connectedUser, setConnectedUser] = useState<any>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    setConnectedUser(getCachedUser());
    setHasToken(isGoogleConnected());

    const unsubscribe = initAuth(
      (user) => {
        setConnectedUser(user);
        setHasToken(true);
      },
      () => {
        setConnectedUser(null);
        setHasToken(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleConnectGoogle = async () => {
    try {
      setSyncFeedback(null);
      const res = await googleSignIn();
      if (res) {
        setConnectedUser(res.user);
        setHasToken(true);
        setSyncFeedback({
          type: 'success',
          message: `Conectado com sucesso à conta Google (${res.user.email || res.user.displayName}) via projeto GREMIO NPOR (gremio-npor.firebaseapp.com).`,
        });
      }
    } catch (err: any) {
      console.error('[IntegrationsView] Erro Firebase Authentication:', err);
      let errMsg = err.message || 'Janela fechada ou acesso recusado.';
      if (err.code === 'auth/unauthorized-domain') {
        errMsg = `Domínio não autorizado no Firebase Auth (gremio-npor). Certifique-se de adicionar os domínios do app nas configurações do Firebase Console (Authentication > Settings > Authorized domains).`;
      } else if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'A janela de autenticação foi fechada antes da conclusão do login.';
      }
      setSyncFeedback({
        type: 'error',
        message: `Falha na autenticação Google: ${errMsg}`,
      });
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await googleSignOut();
      setConnectedUser(null);
      setHasToken(false);
      setSyncFeedback({
        type: 'success',
        message: 'Desconectado da conta Google com sucesso.',
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Erro ao desconectar: ${err.message}`,
      });
    }
  };

  const handleTriggerSync = async () => {
    if (!onSyncGoogleDrive) return;
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      await onSyncGoogleDrive();
      setConnectedUser(getCachedUser());
      setHasToken(isGoogleConnected());
      setSyncFeedback({
        type: 'success',
        message: 'Sincronização real com o Google Drive realizada com sucesso! Dados e pastas atualizados.',
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Erro durante sincronização: ${err.message || 'Falha ao comunicar com a API do Google Drive'}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    setIsSubmitting(true);
    setImportStatus(null);

    try {
      const res = await fetch('/api/drive/import-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: selectedFolder,
          rawText: importText,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportStatus(`Sucesso: ${data.importedCount} registros importados para "${selectedFolder}". ${data.duplicatedCount} duplicidades evitadas.`);
        setImportText('');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setImportStatus(`Erro na importação: ${data.error || 'Verifique o formato dos dados.'}`);
      }
    } catch (err: any) {
      setImportStatus(`Falha de conexão com o servidor: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
      }
    };
    reader.readAsText(file);
  };

  const selectedFolderInfo = appState.driveFoldersStatus?.[selectedFolder];
  const selectedFolderDisplay = getFolderDisplayStatus(selectedFolderInfo);
  const selectedFolderFiles = selectedFolderInfo?.files || [];

  // Lançamentos associados à pasta selecionada
  const relatedTransactions = (appState.transactions || []).filter(
    (t) => t.driveFolder === selectedFolder || t.category?.toUpperCase() === selectedFolder
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12 text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#4B5320] text-white border border-[#D4AF37]/50">
              Repositório Oficial
            </span>
            <span className="text-xs text-slate-500 font-mono">Google Drive API v3 & Sheets v4</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A2421] mt-1.5 flex items-center gap-2 font-institutional">
            <Share2 className="w-5 h-5 text-[#4B5320]" />
            Integração Google Drive & Estrutura de Pastas
          </h2>
          <p className="text-xs text-slate-500">
            Conexão com a pasta raiz oficial do Grêmio do NPOR e leitura das 10 categorias estruturadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={ROOT_FOLDER_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider shadow-sm transition-colors border border-slate-300"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            Abrir Pasta Raiz Oficial
          </a>
        </div>
      </div>

      {/* Google OAuth & Synchronization Control Card */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <FolderSync className="w-5 h-5 text-[#4B5320]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#1A2421]">
                  Autenticação OAuth 2.0 com Google Workspace
                </h3>
                {hasToken ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />
                    Autorizado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-300">
                    Aguardando Autorização
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Projeto Firebase: <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 text-slate-700 font-bold">gremio-npor</code> (<code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 text-slate-700">gremio-npor.firebaseapp.com</code>).
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Escopos autorizados: <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 text-slate-700">drive.readonly</code> e <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 text-slate-700">spreadsheets.readonly</code>.
              </p>
              {connectedUser && (
                <p className="text-[11px] text-slate-600 mt-1 font-medium">
                  Conta conectada: <strong>{connectedUser.displayName || connectedUser.email || 'Usuário Google'}</strong> ({connectedUser.email})
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hasToken ? (
              <button
                onClick={handleConnectGoogle}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#4B5320] hover:bg-[#3b4119] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition"
              >
                <LogIn className="w-4 h-4 text-[#D4AF37]" />
                Conectar com Google
              </button>
            ) : (
              <>
                <button
                  onClick={handleTriggerSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4B5320] hover:bg-[#3b4119] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition"
                >
                  <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Google Drive Agora'}
                </button>
                <button
                  onClick={handleDisconnectGoogle}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider border border-slate-300 transition"
                  title="Desconectar conta Google ativa"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  Desconectar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sync Feedback Message */}
        {syncFeedback && (
          <div
            className={`p-3 text-xs border flex items-center gap-2 ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-red-50 text-red-800 border-red-300'
            }`}
          >
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
        )}

        {/* Informative Rule Box */}
        <div className="bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#4B5320]" />
            Regra Rigorosa de Estados de Sincronização:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
            <li>
              <strong>Não sincronizado:</strong> A pasta ainda não foi lida na sessão atual através da API do Google Drive. Não exibe 0 como se estivesse verificada.
            </li>
            <li>
              <strong>Sincronizado — 0 registros:</strong> A API consultou a pasta no Google Drive e confirmou com precisão que ela está vazia.
            </li>
            <li>
              <strong>Sincronizado — X registros:</strong> Foram encontrados e catalogados X arquivos ou lançamentos contábeis reais.
            </li>
          </ul>
        </div>
      </div>

      {/* 10 Folders Grid */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A2421] flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#4B5320]" />
              Estrutura das 10 Pastas Oficiais do Google Drive
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ID da Pasta Raiz: <code className="font-mono text-[#1A2421] bg-slate-100 px-1 py-0.5 text-xs">{ROOT_FOLDER_ID}</code>
            </p>
          </div>
          <span className="text-[10px] uppercase font-bold px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300">
            10 Categorias Estruturadas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {OFFICIAL_CATEGORIES.map((catName) => {
            const statusInfo = appState.driveFoldersStatus?.[catName];
            const statusDisplay = getFolderDisplayStatus(statusInfo);
            const isSelected = selectedFolder === catName;

            return (
              <div
                key={catName}
                onClick={() => setSelectedFolder(catName)}
                className={`p-3.5 border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-50 border-[#4B5320] ring-1 ring-[#4B5320]'
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#1A2421] truncate" title={catName}>
                      {catName}
                    </span>
                    {statusDisplay.isSynced && (
                      <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 text-slate-700 border border-slate-200">
                        {statusDisplay.count}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                    {CATEGORY_DESCRIPTIONS[catName] || 'Arquivos e registros do Grêmio'}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1">
                  <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 ${statusDisplay.badgeClass}`}>
                    {statusDisplay.label}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>{statusDisplay.isSynced ? (statusDisplay.count === 0 ? 'Pasta vazia' : `${statusDisplay.count} item(ns)`) : 'Pendente'}</span>
                    <span className="text-[#4B5320] text-[9px] uppercase font-bold">Ver detalhes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Folder Details Drawer / View */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 border border-slate-200 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-[#4B5320]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1A2421]">
                  Pasta: {selectedFolder}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 ${selectedFolderDisplay.badgeClass}`}>
                  {selectedFolderDisplay.label}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {CATEGORY_DESCRIPTIONS[selectedFolder]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={ROOT_FOLDER_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              Abrir no Drive
            </a>
          </div>
        </div>

        {/* Real Files in this category */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#4B5320]" />
            Arquivos Reais Catalogados ({selectedFolderFiles.length})
          </h4>

          {selectedFolderFiles.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 border border-slate-200 text-slate-500 text-xs">
              {!selectedFolderDisplay.isSynced ? (
                <p>Esta pasta ainda está com status <strong>"Não sincronizado"</strong>. Clique em <strong>"Sincronizar Google Drive Agora"</strong> acima para consultar seus arquivos reais.</p>
              ) : (
                <p>A pasta foi consultada no Google Drive e não contém nenhum arquivo arquivado no momento (0 registros).</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedFolderFiles.map((f) => (
                <div
                  key={f.id}
                  className="p-3 bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 hover:border-[#4B5320] transition"
                >
                  <div className="flex items-start gap-2.5 overflow-hidden">
                    <div className="w-7 h-7 bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                      {f.mimeType.includes('spreadsheet') ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <File className="w-4 h-4 text-[#4B5320]" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-[#1A2421] truncate" title={f.name}>
                        {f.name}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {f.modifiedTime ? `Modificado em: ${f.modifiedTime.slice(0, 10)}` : 'Data não informada'}
                        {f.size ? ` • ${Math.round(Number(f.size) / 1024)} KB` : ''}
                      </p>
                    </div>
                  </div>

                  <a
                    href={f.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 shrink-0"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                    Abrir
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lançamentos Contábeis Extraídos (se houver) */}
        {relatedTransactions.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#4B5320]" />
              Lançamentos Financeiros Extraídos desta Categoria ({relatedTransactions.length})
            </h4>
            <div className="overflow-x-auto border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Data</th>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5">Responsável</th>
                    <th className="p-2.5 text-right">Valor</th>
                    <th className="p-2.5 text-center">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relatedTransactions.slice(0, 10).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-slate-800">{t.code}</td>
                      <td className="p-2.5 text-slate-600">{formatDatePtBr(t.date)}</td>
                      <td className="p-2.5 text-slate-800 font-medium">{t.description}</td>
                      <td className="p-2.5 text-slate-600">{t.responsibleUser || 'Tesouraria'}</td>
                      <td className="p-2.5 font-mono font-bold text-right">
                        <span className={t.type === 'receita' ? 'text-emerald-700' : 'text-slate-800'}>
                          {t.type === 'receita' ? '+ ' : '- '}
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 text-slate-600 border border-slate-200">
                          {t.source || 'Drive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {relatedTransactions.length > 10 && (
                <p className="text-[11px] text-slate-500 p-2 text-center bg-slate-50">
                  Mostrando 10 de {relatedTransactions.length} lançamentos. Acesse o módulo de Tesouraria para listagem completa.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual / Fallback Import Engine */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A2421] flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#4B5320]" />
              Importação Manual / Backup para "{selectedFolder}"
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Caso deseje carregar dados em lote colando diretamente do Google Sheets ou através de arquivo .CSV.
            </p>
          </div>
        </div>

        {importStatus && (
          <div className={`p-3 text-xs border flex items-center gap-2 ${
            importStatus.startsWith('Sucesso')
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        <form onSubmit={handleImportData} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Categoria de Destino:
              </label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#4B5320]"
              >
                {OFFICIAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Registros serão associados a <code className="text-slate-600 font-mono">driveFolder: {selectedFolder}</code>.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Upload Direto de Arquivo .CSV / .TSV:
              </label>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-bold file:uppercase file:bg-[#4B5320] file:text-white hover:file:bg-[#3b4119] file:cursor-pointer"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Conteúdo da Planilha (Linha de Cabeçalho + Registros):
              </label>
              <span className="text-[10px] text-slate-400">
                Colunas esperadas: Data, Descrição, Entrada, Saída, Responsável, Forma de Pagamento
              </span>
            </div>
            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Exemplo colado do Google Sheets:&#10;Data&#9;Descrição&#9;Entrada&#9;Saída&#9;Forma de Pagamento&#9;Responsável&#10;2026-03-01&#9;Mensalidade Março - Al. Gonçalves&#9;50,00&#9;0&#9;PIX&#9;Tesouraria&#10;2026-03-02&#9;Fardamento Camisas Turma&#9;0&#9;450,00&#9;PIX&#9;Al. Felipe"
              className="w-full font-mono text-xs p-3 bg-white border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4B5320]"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="text-[11px] text-slate-500">
              * O motor de importação detecta e previne automaticamente registros duplicados.
            </div>
            <button
              type="submit"
              disabled={!importText.trim() || isSubmitting}
              className="px-5 py-2.5 bg-[#4B5320] hover:bg-[#3b4119] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
            >
              {isSubmitting ? 'Processando e Persistindo...' : `Importar para "${selectedFolder}"`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
