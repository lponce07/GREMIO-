import {
  GremioConfig,
  User,
  Transaction,
  HistoryRecord,
  EventRecord,
  FuturePlan,
  GraduationService,
  DocumentRecord,
  AuditAlert,
  AuditLog,
  SupplierComparison,
  GraduationGeneralInfo,
  UserRole,
  Member,
  MonthlyFee,
  Raffle,
  ShirtOrder,
  JacketOrder,
  UniformOrder,
  GetTogetherEvent,
  ContractRecord,
  AdditionalCostRecord,
  TransactionDocument,
  DriveFolderSyncInfo,
} from '../types';
import {
  INITIAL_GREMIO_CONFIG,
  INITIAL_USERS,
  INITIAL_TRANSACTIONS,
  INITIAL_DOCUMENTS,
  INITIAL_TRANSACTION_DOCUMENTS,
  INITIAL_ALERTS,
  INITIAL_HISTORY,
  INITIAL_EVENTS,
  INITIAL_FUTURE_PLANS,
  INITIAL_GRADUATION_SERVICES,
  INITIAL_GRADUATION_GENERAL,
  INITIAL_SUPPLIER_COMPARISONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_MEMBERS,
  INITIAL_MONTHLY_FEES,
  INITIAL_RAFFLES,
  INITIAL_SHIRT_ORDERS,
  INITIAL_JACKET_ORDERS,
  INITIAL_UNIFORM_ORDERS,
  INITIAL_GET_TOGETHERS,
  INITIAL_CONTRACTS,
  INITIAL_ADDITIONAL_COSTS,
} from '../data/initialDemoData';

const STORAGE_KEY_PREFIX = 'gremio_npor_v2_';

export interface AppState {
  config: GremioConfig;
  currentUser: User;
  users: User[];
  transactions: Transaction[];
  documents: DocumentRecord[];
  transactionDocuments: TransactionDocument[];
  members: Member[];
  monthlyFees: MonthlyFee[];
  raffles: Raffle[];
  shirtOrders: ShirtOrder[];
  jacketOrders: JacketOrder[];
  uniformOrders: UniformOrder[];
  getTogethers: GetTogetherEvent[];
  contracts: ContractRecord[];
  additionalCosts: AdditionalCostRecord[];
  alerts: AuditAlert[];
  history: HistoryRecord[];
  events: EventRecord[];
  plans: FuturePlan[];
  graduationServices: GraduationService[];
  graduationGeneral: GraduationGeneralInfo;
  supplierComparisons: SupplierComparison[];
  auditLogs: AuditLog[];
  isConfigured: boolean;
  lastSyncedAt?: string | null;
  driveFoldersStatus?: Record<string, DriveFolderSyncInfo>;
}

// Clean initial state (zero demo data)
export const DEFAULT_STATE: AppState = {
  config: INITIAL_GREMIO_CONFIG,
  currentUser: INITIAL_USERS[0],
  users: INITIAL_USERS,
  transactions: [],
  documents: [],
  transactionDocuments: [],
  members: [],
  monthlyFees: [],
  raffles: [],
  shirtOrders: [],
  jacketOrders: [],
  uniformOrders: [],
  getTogethers: [],
  contracts: [],
  additionalCosts: [],
  alerts: [],
  events: [],
  plans: [],
  graduationServices: [],
  graduationGeneral: INITIAL_GRADUATION_GENERAL,
  history: [],
  supplierComparisons: [],
  auditLogs: [],
  isConfigured: true,
  lastSyncedAt: null,
  driveFoldersStatus: {
    'PLANILHA MÃE': { name: 'PLANILHA MÃE', status: 'nao_sincronizado', count: 0, fileCount: 0, sheetCount: 0 },
    'FESTA JULINA': { name: 'FESTA JULINA', status: 'nao_sincronizado', count: 0, fileCount: 0, sheetCount: 0 },
    'CUSTOS ADICIONAIS': { name: 'CUSTOS ADICIONAIS', status: 'nao_sincronizado', count: 0, fileCount: 0, sheetCount: 0 },
    'CONTRATOS': { name: 'CONTRATOS', status: 'nao_sincronizado', count: 0, fileCount: 0, sheetCount: 0 },
    'UNIFORMES': { name: 'UNIFORMES', status: 'nao_sincronizado', count: 0, fileCount: 0, sheetCount: 0 },
    'CONFRATERNIZAÇÃO': { name: 'CONFRATERNIZAÇÃO', status: 'nao_sincronizado', count: 0, fileCount: 0, sheetCount: 0 },
    'ABRIGOS': { name: 'ABRIGOS', status: 'nao_sincronizado', count: 0, fileCount: 0, sheetCount: 0 },
    'CAMISAS': { name: 'CAMISAS', status: 'nao_sincronizado', count: 0, fileCount: 0, sheetCount: 0 },
    'RIFAS': { name: 'RIFAS', status: 'nao_sincronizado', count: 0, fileCount: 0, sheetCount: 0 },
    'MENSALIDADE': { name: 'MENSALIDADE', status: 'nao_sincronizado', count: 0, fileCount: 0, sheetCount: 0 },
  },
};

// Helper to safely parse JSON without throwing
function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw || raw === 'undefined' || raw === 'null') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    console.warn('Falha no parse JSON de chave:', e);
    return fallback;
  }
}

// Helper to safely load a key from LocalStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) return fallback;
    const parsed = safeJsonParse<T>(raw, fallback);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed;
  } catch (e) {
    console.warn(`Falha ao ler ${key} do localStorage:`, e);
    return fallback;
  }
}

// Helper to safely save to LocalStorage (strictly for local cache and UI preferences)
function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Falha ao salvar ${key} no storage:`, e);
  }
}

// Deep state normalizer to ensure no undefined arrays and sanitize real records
export function normalizeAppState(savedState: any): AppState {
  const rawConfig = savedState?.config || {};
  const config: GremioConfig = {
    ...DEFAULT_STATE.config,
    ...rawConfig,
    initialBalance:
      typeof rawConfig.initialBalance === 'number' && !isNaN(rawConfig.initialBalance)
        ? rawConfig.initialBalance
        : 0,
    gremioName: rawConfig.gremioName || 'Grêmio do NPOR',
    turmaName: rawConfig.turmaName || 'Turma NPOR',
    year: String(rawConfig.year || '2026'),
    unitName: rawConfig.unitName || 'Núcleo de Preparação de Oficiais da Reserva',
    isDemoMode: false, // Regra fundamental: modo de dados reais
    googleDriveFolderId: rawConfig.googleDriveFolderId || '1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU',
  };

  const users: User[] = Array.isArray(savedState?.users) && savedState.users.length > 0
    ? savedState.users.filter(Boolean)
    : INITIAL_USERS;

  const currentUser: User = (savedState?.currentUser && savedState.currentUser.warName)
    ? savedState.currentUser
    : (users[0] || INITIAL_USERS[0]);

  const rawGradGeneral = savedState?.graduationGeneral || {};
  const graduationGeneral: GraduationGeneralInfo = {
    ...DEFAULT_STATE.graduationGeneral,
    ...rawGradGeneral,
    totalBudget: typeof rawGradGeneral.totalBudget === 'number' ? rawGradGeneral.totalBudget : 0,
    totalCollected: typeof rawGradGeneral.totalCollected === 'number' ? rawGradGeneral.totalCollected : 0,
    totalContracted: typeof rawGradGeneral.totalContracted === 'number' ? rawGradGeneral.totalContracted : 0,
    totalPaid: typeof rawGradGeneral.totalPaid === 'number' ? rawGradGeneral.totalPaid : 0,
    totalPending: typeof rawGradGeneral.totalPending === 'number' ? rawGradGeneral.totalPending : 0,
    availableBalance: typeof rawGradGeneral.availableBalance === 'number' ? rawGradGeneral.availableBalance : 0,
  };

  // Sanitize transactions (only real items, preserve traceability)
  const rawTransactions = Array.isArray(savedState?.transactions) ? savedState.transactions : [];
  const transactions: Transaction[] = rawTransactions.filter(Boolean).map((t: any, idx: number) => ({
    id: t.id || `tx-${idx}-${Date.now()}`,
    code: t.code || `TX-${String(idx + 1).padStart(4, '0')}`,
    date: t.date || new Date().toISOString().split('T')[0],
    description: t.description || 'Lançamento sem descrição',
    category: t.category || 'Geral',
    amount: typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : 0,
    type: t.type === 'receita' ? 'receita' : 'despesa',
    status: t.status || 'pendente',
    beneficiaryName: t.beneficiaryName || '',
    responsibleUser: t.responsibleUser || currentUser.warName,
    paymentMethod: t.paymentMethod || 'PIX',
    receiptRequired: typeof t.receiptRequired === 'boolean' ? t.receiptRequired : true,
    receiptDocumentId: t.receiptDocumentId || undefined,
    notes: t.notes || '',
    isArchived: Boolean(t.isArchived),
    source: t.source || 'Manual',
    sourceFileId: t.sourceFileId || undefined,
    sourceRowId: t.sourceRowId || undefined,
    driveFolder: t.driveFolder || undefined,
    originalFileUrl: t.originalFileUrl || undefined,
    lastSyncedAt: t.lastSyncedAt || undefined,
    documentIds: Array.isArray(t.documentIds) ? t.documentIds : [],
    createdAt: t.createdAt || new Date().toISOString(),
  }));

  // Sanitize documents
  const rawDocuments = Array.isArray(savedState?.documents) ? savedState.documents : [];
  const documents: DocumentRecord[] = rawDocuments.filter(Boolean).map((d: any, idx: number) => ({
    id: d.id || `doc-${idx}-${Date.now()}`,
    name: d.name || `Documento ${idx + 1}`,
    type: d.type || 'outro',
    date: d.date || d.uploadDate || new Date().toISOString().split('T')[0],
    source: d.source || 'Upload Manual',
    driveUrl: d.driveUrl || '',
    driveFolder: d.driveFolder || undefined,
    originalFileUrl: d.originalFileUrl || d.driveUrl || undefined,
    sourceFileId: d.sourceFileId || undefined,
    lastSyncedAt: d.lastSyncedAt || undefined,
    previewUrl: d.previewUrl || '',
    fileSizeKb: typeof d.fileSizeKb === 'number' ? d.fileSizeKb : 0,
    uploadedAt: d.uploadedAt || new Date().toISOString(),
    auditStatus: d.auditStatus || 'sem_vinculo',
    detectedAmount: typeof d.detectedAmount === 'number' ? d.detectedAmount : 0,
    detectedPersonOrCompany: d.detectedPersonOrCompany || '',
    relatedTransactionId: d.relatedTransactionId || undefined,
    relatedEventId: d.relatedEventId || undefined,
    relatedGraduationServiceId: d.relatedGraduationServiceId || undefined,
    fileContentOrOcrText: d.fileContentOrOcrText || '',
  }));

  // Sanitize transactionDocuments
  const rawTxDocs = Array.isArray(savedState?.transactionDocuments) ? savedState.transactionDocuments : [];
  const transactionDocuments: TransactionDocument[] = rawTxDocs.filter(Boolean).map((td: any) => ({
    id: td.id || `td-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    transaction_id: td.transaction_id,
    document_id: td.document_id,
    relationship_type: td.relationship_type || 'comprovante',
    notes: td.notes || '',
    linked_at: td.linked_at || new Date().toISOString(),
    linked_by: td.linked_by || currentUser.warName,
  }));

  const members: Member[] = Array.isArray(savedState?.members) ? savedState.members.filter(Boolean) : [];
  const monthlyFees: MonthlyFee[] = Array.isArray(savedState?.monthlyFees) ? savedState.monthlyFees.filter(Boolean) : [];
  const raffles: Raffle[] = Array.isArray(savedState?.raffles) ? savedState.raffles.filter(Boolean) : [];
  const shirtOrders: ShirtOrder[] = Array.isArray(savedState?.shirtOrders) ? savedState.shirtOrders.filter(Boolean) : [];
  const jacketOrders: JacketOrder[] = Array.isArray(savedState?.jacketOrders) ? savedState.jacketOrders.filter(Boolean) : [];
  const uniformOrders: UniformOrder[] = Array.isArray(savedState?.uniformOrders) ? savedState.uniformOrders.filter(Boolean) : [];
  const getTogethers: GetTogetherEvent[] = Array.isArray(savedState?.getTogethers) ? savedState.getTogethers.filter(Boolean) : [];
  const contracts: ContractRecord[] = Array.isArray(savedState?.contracts) ? savedState.contracts.filter(Boolean) : [];
  const additionalCosts: AdditionalCostRecord[] = Array.isArray(savedState?.additionalCosts) ? savedState.additionalCosts.filter(Boolean) : [];

  const events: EventRecord[] = Array.isArray(savedState?.events) ? savedState.events.filter(Boolean) : [];
  const plans: FuturePlan[] = Array.isArray(savedState?.plans) ? savedState.plans.filter(Boolean) : [];
  const graduationServices: GraduationService[] = Array.isArray(savedState?.graduationServices)
    ? savedState.graduationServices.filter(Boolean)
    : [];
  const supplierComparisons: SupplierComparison[] = Array.isArray(savedState?.supplierComparisons)
    ? savedState.supplierComparisons.filter(Boolean)
    : [];
  const history: HistoryRecord[] = Array.isArray(savedState?.history) ? savedState.history.filter(Boolean) : [];
  const auditLogs: AuditLog[] = Array.isArray(savedState?.auditLogs) ? savedState.auditLogs.filter(Boolean) : [];

  // Deterministic alerts derived strictly from actual transactions and documents
  const alerts = runAutomatedAudit(transactions, documents, graduationServices, savedState?.alerts || []);

  const state: AppState = {
    config,
    currentUser,
    users,
    transactions,
    documents,
    transactionDocuments,
    members,
    monthlyFees,
    raffles,
    shirtOrders,
    jacketOrders,
    uniformOrders,
    getTogethers,
    contracts,
    additionalCosts,
    alerts,
    history,
    events,
    plans,
    graduationServices,
    graduationGeneral,
    supplierComparisons,
    auditLogs,
    isConfigured: true,
    lastSyncedAt: savedState?.lastSyncedAt || null,
    driveFoldersStatus: {
      ...DEFAULT_STATE.driveFoldersStatus,
      ...(savedState?.driveFoldersStatus || {}),
    },
  };

  (state as any).graduation = state.graduationServices;
  return state;
}

// Load state: checks backend server first, with localStorage as local fallback
export function getInitialAppState(): AppState {
  try {
    const localRaw = localStorage.getItem(STORAGE_KEY_PREFIX + 'state');
    if (localRaw) {
      const parsed = safeJsonParse(localRaw, null);
      if (parsed) {
        return normalizeAppState(parsed);
      }
    }
    return DEFAULT_STATE;
  } catch (err) {
    console.error('Erro ao ler estado inicial local:', err);
    return DEFAULT_STATE;
  }
}

// Asynchronously load from backend server
export async function fetchServerAppState(): Promise<AppState | null> {
  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      const data = await res.json();
      const normalized = normalizeAppState(data);
      persistAppState(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('Servidor offline ou inicializando, usando cache local:', err);
  }
  return null;
}

// Persist full state to LocalStorage and asynchronous push to backend server
export function persistAppState(state: AppState): void {
  try {
    saveToStorage('state', state);

    // Asynchronously update server
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch((err) => {
      console.warn('Erro ao sincronizar estado com o servidor persistente:', err);
    });
  } catch (e) {
    console.error('Falha ao persistir estado:', e);
  }
}

export const loadAppState = getInitialAppState;
export const saveAppState = persistAppState;

// Reset data to empty (Real clean base)
export function resetAppState(_toDemo: boolean = false): AppState {
  const cleanState: AppState = {
    ...DEFAULT_STATE,
    config: {
      ...INITIAL_GREMIO_CONFIG,
      isDemoMode: false,
      initialBalance: 0,
    },
    currentUser: INITIAL_USERS[0],
    users: [INITIAL_USERS[0]],
    transactions: [],
    documents: [],
    transactionDocuments: [],
    members: [],
    monthlyFees: [],
    raffles: [],
    shirtOrders: [],
    jacketOrders: [],
    uniformOrders: [],
    getTogethers: [],
    contracts: [],
    additionalCosts: [],
    alerts: [],
    history: [],
    events: [],
    plans: [],
    graduationServices: [],
    graduationGeneral: {
      ...INITIAL_GRADUATION_GENERAL,
      totalBudget: 0,
      totalCollected: 0,
      totalContracted: 0,
      totalPaid: 0,
      totalPending: 0,
      availableBalance: 0,
    },
    supplierComparisons: [],
    auditLogs: [
      {
        id: 'log-init-' + Date.now(),
        timestamp: new Date().toISOString(),
        userName: INITIAL_USERS[0].warName,
        userRole: 'admin',
        module: 'Sistema',
        action: 'inicializacao_base_real',
        summary: 'Base de dados oficial do Grêmio do NPOR inicializada sem dados fictícios.',
      },
    ],
  };

  persistAppState(cleanState);
  return cleanState;
}

// Deterministic Audit Rules Engine: executes only against real existing records
export function runAutomatedAudit(
  transactions: Transaction[],
  documents: DocumentRecord[],
  graduationServices: GraduationService[],
  activeAlerts: AuditAlert[] = []
): AuditAlert[] {
  const generatedAlerts: AuditAlert[] = [];
  const today = new Date().toISOString().split('T')[0];

  // 1. Despesas pagas sem comprovante
  transactions
    .filter((t) => t && !t.isArchived && t.status !== 'cancelada')
    .forEach((t) => {
      const amt = typeof t.amount === 'number' ? t.amount : 0;
      const hasDoc = Boolean(t.receiptDocumentId || (t.documentIds && t.documentIds.length > 0));
      if (t.receiptRequired && (t.status === 'paga' || t.status === 'recebida') && !hasDoc) {
        generatedAlerts.push({
          id: `alt-no-receipt-${t.id}`,
          severity: 'vermelho',
          title: `Transação sem comprovante anexado (${t.code || 'TX'})`,
          description: `A movimentação de R$ ${amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente a "${t.description || 'Despesa'}" foi liquidada sem documento comprobatório.`,
          location: `Tesouraria > Transação ${t.code || 'TX'}`,
          relatedTransactionId: t.id,
          divergentValueOrInfo: `R$ ${amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          probableReason: 'O responsável registrou o lançamento no sistema sem vincular o arquivo digital do comprovante ou PIX.',
          recommendedAction: 'Anexar imediatamente o documento original ou comprovante bancário da operação.',
          status: 'ativo',
        });
      }
    });

  // 2. Comprovantes sem vínculo
  documents.filter(Boolean).forEach((doc) => {
    const isLinked = Boolean(doc.relatedTransactionId || doc.relatedEventId || doc.relatedGraduationServiceId);
    const detectedAmt = typeof doc.detectedAmount === 'number' ? doc.detectedAmount : 0;
    if (!isLinked || doc.auditStatus === 'sem_vinculo') {
      generatedAlerts.push({
        id: `alt-unlinked-doc-${doc.id}`,
        severity: 'amarelo',
        title: `Comprovante importado sem vínculo (${doc.name || 'Arquivo'})`,
        description: `O arquivo "${doc.name || 'Documento'}" com valor identificado de R$ ${detectedAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} não possui associação com nenhuma despesa, receita ou evento.`,
        location: 'Central de Documentos > Comprovantes Sem Vínculo',
        relatedDocumentId: doc.id,
        divergentValueOrInfo: `R$ ${detectedAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sem lançamento`,
        probableReason: 'Importado de pasta do Google Drive ou e-mail sem lançamento correspondente no livro da tesouraria.',
        recommendedAction: 'Criar uma transação a partir do comprovante ou vincular a uma despesa pré-existente.',
        status: 'ativo',
      });
    }
  });

  // 3. Divergência de valores entre lançamento e comprovante
  transactions
    .filter((t) => t && !t.isArchived && t.receiptDocumentId)
    .forEach((t) => {
      const doc = documents.find((d) => d && d.id === t.receiptDocumentId);
      const tAmt = typeof t.amount === 'number' ? t.amount : 0;
      if (doc && typeof doc.detectedAmount === 'number' && doc.detectedAmount > 0 && Math.abs(doc.detectedAmount - tAmt) > 0.05) {
        generatedAlerts.push({
          id: `alt-divergent-amt-${t.id}-${doc.id}`,
          severity: 'vermelho',
          title: `Divergência de valores entre lançamento e documento (${t.code || 'TX'})`,
          description: `O lançamento registra R$ ${tAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, mas o documento "${doc.name || 'Comprovante'}" apresenta o valor de R$ ${doc.detectedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          location: `Tesouraria > Conferência de Documento`,
          relatedTransactionId: t.id,
          relatedDocumentId: doc.id,
          divergentValueOrInfo: `Diferença: R$ ${Math.abs(tAmt - doc.detectedAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          probableReason: 'Erro de digitação no lançamento ou documento anexado de lote parcial.',
          recommendedAction: 'Conferir o documento original e ajustar o valor lançado com justificativa formal do tesoureiro.',
          status: 'ativo',
        });
      }
    });

  // 4. Parcela vencida e pendente
  transactions
    .filter((t) => t && !t.isArchived && t.status === 'pendente' && t.dueDate && t.dueDate < today)
    .forEach((t) => {
      const amt = typeof t.amount === 'number' ? t.amount : 0;
      generatedAlerts.push({
        id: `alt-overdue-${t.id}`,
        severity: 'vermelho',
        title: `Parcela vencida e pendente (${t.code || 'TX'})`,
        description: `A despesa "${t.description || 'Item'}" no valor de R$ ${amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} venceu em ${formatDatePtBr(t.dueDate)} e permanece com situação pendente.`,
        location: `Tesouraria > Contas a Pagar`,
        relatedTransactionId: t.id,
        divergentValueOrInfo: `Vencido em ${formatDatePtBr(t.dueDate)}`,
        probableReason: 'Falta de quitação bancária ou pagamento já efetuado sem baixa no portal.',
        recommendedAction: 'Confirmar se o pagamento foi realizado no banco e dar a baixa com o comprovante.',
        status: 'ativo',
      });
    });

  // 5. Possível duplicidade de transações
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const t1 = transactions[i];
      const t2 = transactions[j];
      if (
        t1 &&
        t2 &&
        !t1.isArchived &&
        !t2.isArchived &&
        t1.type === t2.type &&
        Math.abs(t1.amount - t2.amount) < 0.01 &&
        Math.abs(new Date(t1.date).getTime() - new Date(t2.date).getTime()) <= 2 * 24 * 60 * 60 * 1000 &&
        t1.status !== 'cancelada' &&
        t2.status !== 'cancelada'
      ) {
        generatedAlerts.push({
          id: `alt-dup-${t1.id}-${t2.id}`,
          severity: 'vermelho',
          title: `Possível transação duplicada identificada (${t1.code || 'TX'} e ${t2.code || 'TX'})`,
          description: `Duas transações do tipo ${t1.type} com o mesmo valor de R$ ${(t1.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foram registradas em ${formatDatePtBr(t1.date)} e ${formatDatePtBr(t2.date)}.`,
          location: 'Tesouraria > Lançamentos',
          relatedTransactionId: t1.id,
          divergentValueOrInfo: `R$ ${(t1.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} repetido`,
          probableReason: 'Lançamento efetuado em duplicidade.',
          recommendedAction: 'Verificar o extrato bancário oficial e, se for duplicidade, cancelar uma das transações.',
          status: 'ativo',
        });
      }
    }
  }

  // Merge com os alertas manuais preservando status
  const map = new Map<string, AuditAlert>();
  activeAlerts.forEach((a) => {
    if (a && a.id) map.set(a.id, a);
  });
  generatedAlerts.forEach((a) => {
    if (a && a.id && !map.has(a.id)) {
      map.set(a.id, a);
    }
  });

  return Array.from(map.values());
}

export function formatCurrencyPtBr(value: number): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatDatePtBr(isoDateString?: string): string {
  if (!isoDateString) return '-';
  try {
    const parts = String(isoDateString).split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return String(isoDateString);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return String(isoDateString);
  }
}

export function addAuditLog(
  state: AppState,
  module: string,
  action: string,
  targetEntity?: string,
  userName?: string
): AppState {
  const warName = userName || state?.currentUser?.warName || 'Al. Felipe';
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    user: warName,
    userName: warName,
    userRole: state?.currentUser?.role || 'admin',
    module,
    action: action as any,
    entityType: module as any,
    entityId: targetEntity || 'gen-id',
    targetEntity,
    summary: action,
    ipAddress: '127.0.0.1',
  };
  const updated = {
    ...state,
    auditLogs: [newLog, ...(Array.isArray(state?.auditLogs) ? state.auditLogs : [])],
  };
  persistAppState(updated);
  return updated;
}
