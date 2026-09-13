import {
  Transaction,
  DocumentRecord,
  Category,
  DriveFolderSyncInfo,
  ClassificationRule,
  SyncSummaryReport,
} from '../types';
import {
  syncRealGoogleDrive,
  ROOT_FOLDER_ID,
  PLANILHA_MAE_FILE_ID,
  DriveSyncResult,
} from './googleDriveService';
import { AppState, runAutomatedAudit } from './dataService';
import { getAccessToken, googleSignIn } from './googleAuthService';

export interface PipelineProgressCallback {
  (stepName: string, stepIndex: number, totalSteps: number, details?: string): void;
}

export interface PipelineOptions {
  forceFull?: boolean;
  onProgress?: PipelineProgressCallback;
}

/**
 * -----------------------------------------------------------------------------
 * FLUXO COMPLETO DE LANÇAMENTO AUTOMÁTICO A PARTIR DO GOOGLE DRIVE
 * 
 * Pipeline automatizado executado assim que o Google Drive é conectado:
 * 1.  synchronizeDrive()            - Leitura da pasta raiz e recursiva de subpastas
 * 2.  processMasterSpreadsheet()    - Leitura da PLANILHA MÃE e extração de lançamentos
 * 3.  processDocuments()            - Leitura de comprovantes e documentos (PDFs, imagens)
 * 4.  classifyDocuments()           - Classificação de documentos e extração de metadados
 * 5.  createOrUpdateTransactions()  - Criação de movimentações (sem digitação duplicada)
 * 6.  linkDocumentsToTransactions() - Vinculação automática com evidência financeira
 * 7.  createRequiredCategories()    - Criação de novas categorias dinâmicas (ex: Material Ponte)
 * 8.  recalculateFinancialData()    - Recálculo de saldos, receitas e despesas
 * 9.  runAutomatedAudit()           - Auditoria automatizada e geração de alertas
 * 10. persistNormalizedData()       - Persistência dos dados normalizados
 * 11. refreshApplicationState()     - Atualização imediata da interface (sem reload)
 * -----------------------------------------------------------------------------
 */

export async function onGoogleDriveConnected(
  currentState: AppState,
  onUpdateState: (newState: AppState) => void,
  options?: PipelineOptions
): Promise<DriveSyncResult> {
  const onProgress = options?.onProgress;
  const totalSteps = 11;

  const notify = (stepIndex: number, stepName: string, details?: string) => {
    if (onProgress) {
      onProgress(stepName, stepIndex, totalSteps, details);
    }
  };

  try {
    // 1. synchronizeDrive: Autenticação e leitura da pasta raiz do Grêmio e subpastas
    notify(1, 'Conectando ao Google Drive e varrendo pastas...', 'Lendo pasta raiz e subpastas recursivamente');
    let token = await getAccessToken();
    if (!token) {
      const authResult = await googleSignIn();
      if (!authResult || !authResult.accessToken) {
        throw new Error('Falha na autenticação com Google Drive. Permissão necessária.');
      }
      token = authResult.accessToken;
    }

    // 2. processMasterSpreadsheet & 3. processDocuments
    notify(2, 'Lendo PLANILHA MÃE e documentos...', 'Identificando arquivos novos e modificados');

    // Executa a sincronização real com o motor integrado do Google Drive
    notify(3, 'Processando comprovantes fiscais e recibos...', 'Identificando valores, datas e fornecedores');
    const syncResult = await syncRealGoogleDrive(
      currentState.transactions || [],
      currentState.documents || [],
      currentState.categories || [],
      currentState.classificationRules || []
    );

    if (!syncResult.success) {
      throw new Error(syncResult.message || 'Falha ao sincronizar arquivos do Google Drive.');
    }

    // 4. classifyDocuments & 5. createOrUpdateTransactions
    notify(4, 'Classificando documentos e criando lançamentos...', 'Gerando lançamentos com evidência financeira');
    let updatedTransactions = [...syncResult.newTransactions];
    let updatedDocuments = [...syncResult.newDocuments];
    let updatedCategories = syncResult.updatedCategories && syncResult.updatedCategories.length > 0
      ? [...syncResult.updatedCategories]
      : [...(currentState.categories || [])];

    // 6. linkDocumentsToTransactions
    notify(6, 'Vinculando comprovantes às movimentações...', `${syncResult.syncReport?.automaticLinks || 0} vínculos automáticos de alta certeza`);

    // 7. createRequiredCategories: Garante categorias dinâmicas (ex: Material Ponte)
    notify(7, 'Atualizando Projetos e Categorias...', 'Verificando novas categorias dinâmicas identificadas');

    // 8. recalculateFinancialData: Recálculo de saldos gerais e categorias
    notify(8, 'Recalculando saldos da Tesouraria...', 'Atualizando receitas, despesas e saldo bancário');

    // 9. runAutomatedAudit: Auditoria automatizada
    notify(9, 'Executando auditoria contábil automatizada...', 'Checando pendências de comprovantes e conferência');
    const freshAlerts = runAutomatedAudit(
      updatedTransactions,
      updatedDocuments,
      currentState.graduationServices || [],
      currentState.alerts || []
    );

    // 10. persistNormalizedData: Prepara o novo estado e persiste
    notify(10, 'Persistindo dados normalizados...', 'Salvando registros no banco de dados local');
    const updatedState: AppState = {
      ...currentState,
      config: syncResult.financialSummary
        ? {
            ...currentState.config,
            // Corrige migração da versão anterior que gravava o saldo atual da PLANILHA MÃE como saldo inicial.
            initialBalance: (typeof syncResult.financialSummary.currentCashBalance === 'number' &&
              Math.abs((currentState.config.initialBalance || 0) - syncResult.financialSummary.currentCashBalance) < 0.01)
              ? 0
              : (currentState.config.initialBalance || 0),
            currentCashBalance: syncResult.financialSummary.currentCashBalance,
            totalRealRevenue: syncResult.financialSummary.totalRealRevenue,
            totalRealExpenses: syncResult.financialSummary.totalRealExpenses,
            totalPlannedRevenue: syncResult.financialSummary.totalPlannedRevenue,
            totalPlannedExpenses: syncResult.financialSummary.totalPlannedExpenses,
            financialSummarySource: 'PLANILHA MÃE / Resumo',
            financialSummaryUpdatedAt: new Date().toISOString(),
          }
        : currentState.config,
      transactions: updatedTransactions,
      documents: updatedDocuments,
      categories: updatedCategories,
      lastSyncReport: syncResult.syncReport || null,
      driveFoldersStatus: syncResult.folderStatuses,
      members: syncResult.newMembers && syncResult.newMembers.length > 0 ? syncResult.newMembers : currentState.members,
      monthlyFees: syncResult.newMonthlyFees.length > 0 ? syncResult.newMonthlyFees : currentState.monthlyFees,
      raffles: syncResult.newRaffles.length > 0 ? syncResult.newRaffles : currentState.raffles,
      shirtOrders: syncResult.newShirtOrders.length > 0 ? syncResult.newShirtOrders : currentState.shirtOrders,
      jacketOrders: syncResult.newJacketOrders.length > 0 ? syncResult.newJacketOrders : currentState.jacketOrders,
      uniformOrders: syncResult.newUniformOrders.length > 0 ? syncResult.newUniformOrders : currentState.uniformOrders,
      contracts: syncResult.newContracts.length > 0 ? syncResult.newContracts : currentState.contracts,
      additionalCosts: syncResult.newAdditionalCosts.length > 0 ? syncResult.newAdditionalCosts : currentState.additionalCosts,
      alerts: freshAlerts,
      lastSyncedAt: new Date().toISOString(),
    };

    // 11. refreshApplicationState: Atualização imediata da interface sem reload
    notify(11, 'Sincronização finalizada com sucesso!', 'Painel Geral, Tesouraria e Auditoria atualizados');
    onUpdateState(updatedState);

    return syncResult;
  } catch (err: any) {
    console.error('[DriveSyncPipeline] Erro na esteira de sincronização:', err);
    throw err;
  }
}
