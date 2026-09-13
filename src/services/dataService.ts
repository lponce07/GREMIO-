import {
  GremioConfig,
  User,
  CommissionMember,
  UserStatus,
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
  Category,
  ClassificationRule,
  SyncSummaryReport,
} from '../types';
import {
  INITIAL_GREMIO_CONFIG,
  INITIAL_COMMISSION_MEMBERS,
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
import { BASE_PREDEFINED_CATEGORIES, BASE_CLASSIFICATION_RULES } from '../data/baseCategories';
import { normalizeCategoryText, findMatchingCategory } from './categoryClassifier';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  limit,
  orderBy,
} from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'gremio_npor_v2_';

export interface AppState {
  config: GremioConfig;
  currentUser: User;
  users: User[];
  commissionMembers: CommissionMember[];
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
  categories: Category[];
  classificationRules: ClassificationRule[];
  lastSyncReport?: SyncSummaryReport | null;
  isConfigured: boolean;
  lastSyncedAt?: string | null;
  updatedAt?: string;
  driveFoldersStatus?: Record<string, DriveFolderSyncInfo>;
}

// Clean initial state (zero demo data)
export const DEFAULT_STATE: AppState = {
  config: INITIAL_GREMIO_CONFIG,
  currentUser: INITIAL_USERS[0],
  users: INITIAL_USERS,
  commissionMembers: INITIAL_COMMISSION_MEMBERS,
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
  categories: BASE_PREDEFINED_CATEGORIES,
  classificationRules: BASE_CLASSIFICATION_RULES,
  lastSyncReport: null,
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
    sourceFileName: t.sourceFileName || undefined,
    sourceSheetName: t.sourceSheetName || undefined,
    sourceRowId: t.sourceRowId || undefined,
    sourceCellRange: t.sourceCellRange || undefined,
    driveFolder: t.driveFolder || undefined,
    driveFolderPath: t.driveFolderPath || undefined,
    excludedFromFinancialTotals: !!t.excludedFromFinancialTotals,
    originalFileUrl: t.originalFileUrl || undefined,
    googleDriveFileLink: t.googleDriveFileLink || undefined,
    lastSyncedAt: t.lastSyncedAt || undefined,
    syncedAt: t.syncedAt || undefined,
    autoCreated: !!t.autoCreated,
    creationReason: t.creationReason || undefined,
    categoryId: t.categoryId || undefined,
    categoryName: t.categoryName || undefined,
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
    driveFolderPath: d.driveFolderPath || undefined,
    mimeType: d.mimeType || undefined,
    financialDirection: d.financialDirection || undefined,
    originalFileUrl: d.originalFileUrl || d.driveUrl || undefined,
    sourceFileId: d.sourceFileId || undefined,
    lastSyncedAt: d.lastSyncedAt || undefined,
    previewUrl: d.previewUrl || '',
    fileSizeKb: typeof d.fileSizeKb === 'number' ? d.fileSizeKb : 0,
    uploadedAt: d.uploadedAt || new Date().toISOString(),
    auditStatus: d.auditStatus || 'sem_vinculo',
    detectedAmount: typeof d.detectedAmount === 'number' ? d.detectedAmount : 0,
    detectedPersonOrCompany: d.detectedPersonOrCompany || '',
    detectedSupplier: d.detectedSupplier || d.detectedPersonOrCompany || '',
    detectedPurpose: d.detectedPurpose || '',
    relatedTransactionId: d.relatedTransactionId || undefined,
    relatedEventId: d.relatedEventId || undefined,
    relatedGraduationServiceId: d.relatedGraduationServiceId || undefined,
    fileContentOrOcrText: d.fileContentOrOcrText || '',
    extractedText: d.extractedText || d.fileContentOrOcrText || '',
    categoryId: d.categoryId || undefined,
    categoryName: d.categoryName || undefined,
    suggestedCategoryId: d.suggestedCategoryId || undefined,
    suggestedCategoryName: d.suggestedCategoryName || undefined,
    classificationConfidence: typeof d.classificationConfidence === 'number' ? d.classificationConfidence : undefined,
    classificationStatus: d.classificationStatus || (d.categoryId ? 'classificado' : (d.suggestedCategoryName ? 'aguardando_confirmacao' : 'aguardando_classificacao')),
    suggestedTransactionId: d.suggestedTransactionId || undefined,
    transactionLinkConfidence: typeof d.transactionLinkConfidence === 'number' ? d.transactionLinkConfidence : undefined,
    transactionLinkStatus: d.transactionLinkStatus || (d.relatedTransactionId ? 'vinculado' : (d.suggestedTransactionId ? 'aguardando_confirmacao' : 'sem_vinculo')),
    ocrProcessed: !!d.ocrProcessed,
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
  const commissionMembers: CommissionMember[] =
    Array.isArray(savedState?.commissionMembers) && savedState.commissionMembers.length > 0
      ? savedState.commissionMembers.filter(Boolean)
      : INITIAL_COMMISSION_MEMBERS;
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

  // Sanitize categories and deduplicate strictly by id, canonical slug, and normalized name
  const savedCategories: Category[] = Array.isArray(savedState?.categories) ? savedState.categories.filter(Boolean) : [];
  const idMap = new Map<string, Category>();
  const aliasToId = new Map<string, string>();

  const registerCategory = (cat: Category, isBase: boolean) => {
    if (!cat || !cat.id) return;

    const normSlug = normalizeCategoryText(cat.name || cat.slug || '').slug;
    const normName = (cat.name || '').trim().toLowerCase();
    const rawSlug = (cat.slug || '').trim().toLowerCase();

    // Determine if this category already exists by ID or by any alias
    const existingId =
      (idMap.has(cat.id) ? cat.id : null) ||
      aliasToId.get(cat.id) ||
      (rawSlug ? aliasToId.get(rawSlug) : null) ||
      (normSlug ? aliasToId.get(normSlug) : null) ||
      (normName ? aliasToId.get(normName) : null);

    if (existingId && idMap.has(existingId)) {
      const existing = idMap.get(existingId)!;
      idMap.set(existingId, {
        ...existing,
        description: cat.description || existing.description,
        color: cat.color || existing.color,
        responsible: cat.responsible || existing.responsible,
        keywords: Array.from(new Set([...(existing.keywords || []), ...(cat.keywords || [])])),
        isDynamic: existing.isDynamic !== undefined ? existing.isDynamic : (isBase ? false : true),
      });

      aliasToId.set(cat.id, existingId);
      if (rawSlug) aliasToId.set(rawSlug, existingId);
      if (normSlug) aliasToId.set(normSlug, existingId);
      if (normName) aliasToId.set(normName, existingId);
    } else {
      const newCategory: Category = {
        ...cat,
        slug: rawSlug || normSlug || cat.id,
        isDynamic: isBase ? false : (cat.isDynamic !== undefined ? cat.isDynamic : true),
      };
      idMap.set(cat.id, newCategory);
      aliasToId.set(cat.id, cat.id);
      if (rawSlug) aliasToId.set(rawSlug, cat.id);
      if (normSlug) aliasToId.set(normSlug, cat.id);
      if (normName) aliasToId.set(normName, cat.id);
    }
  };

  // 1. Primeiro adiciona categorias base oficiais
  for (const baseCat of BASE_PREDEFINED_CATEGORIES) {
    registerCategory({ ...baseCat }, true);
  }

  // 2. Mescla categorias salvas (preservando dinâmicas e criadas pelo usuário sem duplicar IDs)
  for (const savedCat of savedCategories) {
    registerCategory(savedCat, false);
  }

  // Recalcula totais por categoria garantindo unicidade absoluta de IDs
  const categories: Category[] = Array.from(idMap.values()).map((cat) => {
    const catTxs = transactions.filter((t) => t.categoryId === cat.id || (t.category && t.category.toLowerCase() === cat.name.toLowerCase()));
    const catDocs = documents.filter((d) => d.categoryId === cat.id || (d.categoryName && d.categoryName.toLowerCase() === cat.name.toLowerCase()));
    const totalSpent = catTxs.filter((t) => t.type === 'despesa').reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      ...cat,
      totalSpent,
      transactionsCount: catTxs.length,
      documentsCount: catDocs.length,
    };
  });

  // Sanitize classification rules
  const savedRules: ClassificationRule[] = Array.isArray(savedState?.classificationRules) ? savedState.classificationRules.filter(Boolean) : [];
  const rulesMap = new Map<string, ClassificationRule>();
  for (const baseRule of BASE_CLASSIFICATION_RULES) {
    rulesMap.set(baseRule.id, { ...baseRule });
  }
  for (const savedRule of savedRules) {
    rulesMap.set(savedRule.id, { ...savedRule });
  }
  const classificationRules: ClassificationRule[] = Array.from(rulesMap.values());

  const state: AppState = {
    config,
    currentUser,
    users,
    commissionMembers,
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
    categories,
    classificationRules,
    lastSyncReport: savedState?.lastSyncReport || null,
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

// -----------------------------------------------------------------------------
// PERSISTÊNCIA MODULAR EM COLEÇÕES NO CLOUD FIRESTORE
// -----------------------------------------------------------------------------

// Utilitário para salvar itens em lote usando Firestore Batches (máx 450 itens por lote)
export async function batchSaveCollection<T extends Record<string, any>>(
  collectionName: string,
  items: T[],
  idField: string = 'id'
): Promise<void> {
  if (!items || items.length === 0) return;
  // Segurança contra exaustão de write stream: nunca enfileira lotes sem usuário autenticado
  if (!auth.currentUser) return;

  const CHUNK_SIZE = 450; // Limite seguro para o limite de 500 do Firestore

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const docId = String(item[idField] || item.id || `item-${Date.now()}`);
      const cleanItem = JSON.parse(JSON.stringify(item));
      const ref = doc(db, collectionName, docId);
      batch.set(ref, cleanItem, { merge: true });
    }

    try {
      await batch.commit();
    } catch (batchErr) {
      console.warn(`[Firestore Batch] Erro ao gravar lote na coleção ${collectionName}:`, batchErr);
    }
  }
}

// -----------------------------------------------------------------------------
// MUTAÇÕES GRANULARES E PONTUAIS NO FIRESTORE (SEM REESCREVER O SISTEMA TODO)
// -----------------------------------------------------------------------------

export async function saveTransactionToFirestore(tx: Transaction): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'transactions', tx.id);
    await setDoc(ref, JSON.parse(JSON.stringify(tx)), { merge: true });
  } catch (err) {
    console.error(`[Firestore] Erro ao salvar transação ${tx.id}:`, err);
    handleFirestoreError(err, OperationType.WRITE, `transactions/${tx.id}`);
  }
}

export async function deleteTransactionFromFirestore(id: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'transactions', id);
    await deleteDoc(ref);
  } catch (err) {
    console.error(`[Firestore] Erro ao remover transação ${id}:`, err);
    handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`);
  }
}

export async function saveDocumentToFirestore(docRecord: DocumentRecord): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'documents', docRecord.id);
    await setDoc(ref, JSON.parse(JSON.stringify(docRecord)), { merge: true });
  } catch (err) {
    console.error(`[Firestore] Erro ao salvar documento ${docRecord.id}:`, err);
    handleFirestoreError(err, OperationType.WRITE, `documents/${docRecord.id}`);
  }
}

export async function deleteDocumentFromFirestore(id: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'documents', id);
    await deleteDoc(ref);
  } catch (err) {
    console.error(`[Firestore] Erro ao remover documento ${id}:`, err);
    handleFirestoreError(err, OperationType.DELETE, `documents/${id}`);
  }
}

export async function updateDocumentOcrInFirestore(
  id: string,
  updates: Partial<DocumentRecord>
): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'documents', id);
    await updateDoc(ref, updates as any);
  } catch (err) {
    console.warn(`[Firestore] Erro ao atualizar status OCR do documento ${id}:`, err);
  }
}

export async function saveCategoryToFirestore(cat: Category): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'categories', cat.id);
    await setDoc(ref, JSON.parse(JSON.stringify(cat)), { merge: true });
  } catch (err) {
    console.error(`[Firestore] Erro ao salvar categoria ${cat.id}:`, err);
    handleFirestoreError(err, OperationType.WRITE, `categories/${cat.id}`);
  }
}

export async function deleteCategoryFromFirestore(id: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'categories', id);
    await deleteDoc(ref);
  } catch (err) {
    console.error(`[Firestore] Erro ao excluir categoria ${id}:`, err);
    handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
  }
}

export async function saveMonthlyFeeToFirestore(fee: MonthlyFee): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'monthlyFees', fee.id);
    await setDoc(ref, JSON.parse(JSON.stringify(fee)), { merge: true });
  } catch (err) {
    console.warn(`[Firestore] Erro ao salvar mensalidade ${fee.id}:`, err);
  }
}

export async function saveEventToFirestore(event: EventRecord): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'events', event.id);
    await setDoc(ref, JSON.parse(JSON.stringify(event)), { merge: true });
  } catch (err) {
    console.warn(`[Firestore] Erro ao salvar evento ${event.id}:`, err);
  }
}

export async function savePlanToFirestore(plan: FuturePlan): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'plans', plan.id);
    await setDoc(ref, JSON.parse(JSON.stringify(plan)), { merge: true });
  } catch (err) {
    console.warn(`[Firestore] Erro ao salvar plano ${plan.id}:`, err);
  }
}

export async function saveContractToFirestore(contract: ContractRecord): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'contracts', contract.id);
    await setDoc(ref, JSON.parse(JSON.stringify(contract)), { merge: true });
  } catch (err) {
    console.warn(`[Firestore] Erro ao salvar contrato ${contract.id}:`, err);
  }
}

export async function saveAuditAlertToFirestore(alert: AuditAlert): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'auditAlerts', alert.id);
    await setDoc(ref, JSON.parse(JSON.stringify(alert)), { merge: true });
  } catch (err) {
    console.warn(`[Firestore] Erro ao salvar alerta de auditoria:`, err);
  }
}

export async function saveAuditLogToFirestore(log: AuditLog): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'auditLogs', log.id);
    await setDoc(ref, JSON.parse(JSON.stringify(log)), { merge: true });
  } catch (err) {
    console.warn(`[Firestore] Erro ao registrar log de auditoria:`, err);
  }
}

export async function saveSystemConfigToFirestore(config: GremioConfig): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'system', 'config');
    await setDoc(ref, JSON.parse(JSON.stringify(config)), { merge: true });
  } catch (err) {
    console.warn(`[Firestore] Erro ao salvar configurações de sistema:`, err);
  }
}

// -----------------------------------------------------------------------------
// ROTINA DE MIGRAÇÃO: MONÓLITO (gremio_state/main) -> COLEÇÕES REAIS
// -----------------------------------------------------------------------------

let migrationAttempted = false;

export async function migrateLegacyStateToModularCollections(): Promise<boolean> {
  if (migrationAttempted) return false;
  migrationAttempted = true;

  // Garante que a migração para coleções só ocorre se houver usuário administrador autenticado
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  const userEmail = (currentUser.email || '').toLowerCase().trim();
  const isRoot = userEmail === 'felipegponce@gmail.com';
  if (!isRoot) return false;

  try {
    // 1. Verifica se a migração para coleções já foi registrada
    const migrationRef = doc(db, 'system', 'migration');
    const migrationSnap = await getDoc(migrationRef);
    if (migrationSnap.exists() && migrationSnap.data()?.migrationVersion >= 2) {
      return false; // Já migrado oficialmente
    }

    console.log('[Migração Firestore] Verificando dados para migração em coleções modulares...');

    // 2. Busca dados legados em gremio_state/main
    let legacyState: any = null;
    const mainDocRef = doc(db, 'gremio_state', 'main');
    const mainSnap = await getDoc(mainDocRef);

    if (mainSnap.exists()) {
      legacyState = mainSnap.data();
    } else {
      // Fallback para cache local / demo inicial se Firestore estiver zerado
      const localRaw = localStorage.getItem(STORAGE_KEY_PREFIX + 'state');
      if (localRaw) {
        legacyState = safeJsonParse(localRaw, null);
      }
    }

    if (!legacyState) {
      // Cria registro de sistema inicial
      await setDoc(migrationRef, {
        migrationVersion: 2,
        migratedAt: new Date().toISOString(),
        source: 'clean_init',
      });
      return false;
    }

    console.log('[Migração Firestore] Executando migração para coleções granulares no Cloud Firestore...');

    // 3. Grava cada conjunto de dados na sua respectiva coleção via batch
    if (Array.isArray(legacyState.transactions) && legacyState.transactions.length > 0) {
      await batchSaveCollection('transactions', legacyState.transactions);
    }

    if (Array.isArray(legacyState.documents) && legacyState.documents.length > 0) {
      await batchSaveCollection('documents', legacyState.documents);
    }

    if (Array.isArray(legacyState.categories) && legacyState.categories.length > 0) {
      await batchSaveCollection('categories', legacyState.categories);
    }

    if (Array.isArray(legacyState.monthlyFees) && legacyState.monthlyFees.length > 0) {
      await batchSaveCollection('monthlyFees', legacyState.monthlyFees);
    }

    if (Array.isArray(legacyState.raffles) && legacyState.raffles.length > 0) {
      await batchSaveCollection('raffles', legacyState.raffles);
    }

    if (Array.isArray(legacyState.shirtOrders) && legacyState.shirtOrders.length > 0) {
      await batchSaveCollection('shirtOrders', legacyState.shirtOrders);
    }

    if (Array.isArray(legacyState.jacketOrders) && legacyState.jacketOrders.length > 0) {
      await batchSaveCollection('jacketOrders', legacyState.jacketOrders);
    }

    if (Array.isArray(legacyState.uniformOrders) && legacyState.uniformOrders.length > 0) {
      await batchSaveCollection('uniformOrders', legacyState.uniformOrders);
    }

    if (Array.isArray(legacyState.events) && legacyState.events.length > 0) {
      await batchSaveCollection('events', legacyState.events);
    }

    if (Array.isArray(legacyState.plans) && legacyState.plans.length > 0) {
      await batchSaveCollection('plans', legacyState.plans);
    }

    if (Array.isArray(legacyState.contracts) && legacyState.contracts.length > 0) {
      await batchSaveCollection('contracts', legacyState.contracts);
    }

    if (Array.isArray(legacyState.alerts) && legacyState.alerts.length > 0) {
      await batchSaveCollection('auditAlerts', legacyState.alerts);
    }

    if (Array.isArray(legacyState.auditLogs) && legacyState.auditLogs.length > 0) {
      await batchSaveCollection('auditLogs', legacyState.auditLogs);
    }

    if (Array.isArray(legacyState.classificationRules) && legacyState.classificationRules.length > 0) {
      await batchSaveCollection('classificationRules', legacyState.classificationRules);
    }

    // Salva configuração do sistema
    if (legacyState.config) {
      await setDoc(doc(db, 'system', 'config'), JSON.parse(JSON.stringify(legacyState.config)), { merge: true });
    }

    // Salva estado de sincronização
    await setDoc(
      doc(db, 'system', 'sync'),
      {
        lastSyncedAt: legacyState.lastSyncedAt || new Date().toISOString(),
        lastSyncReport: legacyState.lastSyncReport || null,
        driveFoldersStatus: legacyState.driveFoldersStatus || {},
      },
      { merge: true }
    );

    // Marca a migração como concluída SEM apagar gremio_state/main (preservado para segurança)
    await setDoc(migrationRef, {
      migrationVersion: 2,
      migratedAt: new Date().toISOString(),
      stats: {
        transactionsCount: legacyState.transactions?.length || 0,
        documentsCount: legacyState.documents?.length || 0,
        categoriesCount: legacyState.categories?.length || 0,
      },
      preservedLegacyDoc: 'gremio_state/main',
    });

    console.log('[Migração Firestore] Migração para coleções concluída com sucesso!');
    return true;
  } catch (err) {
    console.warn('[Migração Firestore] Falha na migração automática:', err);
    return false;
  }
}

// -----------------------------------------------------------------------------
// SINCRONIZAÇÃO EM TEMPO REAL MODULAR E GRANULAR
// -----------------------------------------------------------------------------

// Sincronização em tempo real dos perfis de usuários no Firestore
export function subscribeToFirestoreUsers(onUpdate: (users: User[]) => void): () => void {
  const usersColl = collection(db, 'users');
  return onSnapshot(
    usersColl,
    (snapshot) => {
      const usersList: User[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        const userStatus: UserStatus = data.status || (data.role === 'admin' ? 'approved' : 'pending');
        usersList.push({
          id: d.id,
          name: data.displayName || data.name || 'Usuário',
          warName: data.warName || data.displayName || 'OFICIAL',
          email: data.email || '',
          role: (data.role as UserRole) || 'visualizador',
          status: userStatus,
          officialRoleTitle: data.officialRoleTitle || undefined,
          department: data.department || 'Grêmio do NPOR',
          active: data.active !== undefined ? Boolean(data.active) : (userStatus === 'approved'),
          createdAt: data.createdAt || new Date().toISOString(),
          lastLogin: data.lastLogin || data.updatedAt,
          avatar: data.photoURL,
        });
      });
      if (usersList.length > 0) {
        onUpdate(usersList);
      } else {
        // Se ainda não houver usuários cadastrados no banco, utiliza a lista oficial
        onUpdate(INITIAL_USERS);
      }
    },
    (err) => {
      console.warn('[Firestore] Erro ao carregar usuários:', err);
    }
  );
}

// Inscrição em tempo real para a coleção commissionMembers
export function subscribeCommissionMembers(
  onUpdate: (members: CommissionMember[]) => void
): () => void {
  const coll = collection(db, 'commissionMembers');
  return onSnapshot(
    coll,
    (snap) => {
      if (!snap.empty) {
        const membersList: CommissionMember[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || '',
            position: data.position || '',
            role: data.role || 'visualizador',
            description: data.description || '',
            linkedUserUid: data.linkedUserUid ?? null,
            linkedEmail: data.linkedEmail ?? null,
            active: data.active !== undefined ? data.active : true,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        onUpdate(membersList);
      } else {
        onUpdate(INITIAL_COMMISSION_MEMBERS);
      }
    },
    (err) => {
      console.info('[Firestore] Comissão Oficial operando com registros locais:', err.message);
      onUpdate(INITIAL_COMMISSION_MEMBERS);
    }
  );
}

// Rotina idempotente para cadastrar a Comissão Oficial em sua própria coleção 'commissionMembers'
let isSeedingCommission = false;

export async function seedOfficialCommission(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return; // Não autenticado: ignora silenciosamente
  }

  if (isSeedingCommission) return;
  isSeedingCommission = true;

  try {
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const isRoot = userEmail === 'felipegponce@gmail.com';

    // Se não for root admin, verifica se possui perfil aprovado de administrador
    if (!isRoot) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        return; // Sem documento de usuário: ignora silenciosamente
      }
      const data = userSnap.data();
      if (data.role !== 'admin' || data.status !== 'approved') {
        return; // Não possui privilégio de administrador: ignora silenciosamente
      }
    }

    const commissionColl = collection(db, 'commissionMembers');
    const existingSnap = await getDocs(commissionColl);
    const existingDocs = existingSnap.docs;

    const existingIds = new Set(existingDocs.map((d) => d.id));
    const existingNames = new Set(
      existingDocs.map((d) => (d.data().name || '').trim().toUpperCase())
    );
    const existingPositions = new Set(
      existingDocs.map((d) => `${(d.data().position || '').trim().toUpperCase()}_${(d.data().name || '').trim().toUpperCase()}`)
    );

    // Identifica apenas os ausentes da lista oficial
    const missingMembers = INITIAL_COMMISSION_MEMBERS.filter((m) => {
      const nameKey = m.name.trim().toUpperCase();
      const posKey = `${m.position.trim().toUpperCase()}_${nameKey}`;
      return !existingIds.has(m.id) && !existingNames.has(nameKey) && !existingPositions.has(posKey);
    });

    if (missingMembers.length === 0) {
      return; // Todos os membros já existem, nada a duplicar
    }

    for (const member of missingMembers) {
      const memberRef = doc(db, 'commissionMembers', member.id);
      await setDoc(memberRef, {
        id: member.id,
        name: member.name,
        position: member.position,
        role: member.role,
        description: member.description,
        linkedUserUid: member.linkedUserUid || null,
        linkedEmail: member.linkedEmail || null,
        active: member.active,
        createdAt: member.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    console.info(`[Firestore] Comissão Oficial sincronizada: ${missingMembers.length} membro(s) novo(s).`);
  } catch (err: any) {
    if (err?.code === 'permission-denied' || (err?.message && err.message.includes('permission'))) {
      console.info('[Firestore] seedOfficialCommission aguardando permissões administrativas.');
    } else {
      console.warn('[Firestore] Aviso ao sincronizar Comissão Oficial:', err?.message || err);
    }
  } finally {
    isSeedingCommission = false;
  }
}

// Atualizar integrante da Comissão Oficial
export async function updateCommissionMemberInFirestore(
  memberId: string,
  updates: Partial<CommissionMember>,
  actor?: { warName: string; name: string; role: UserRole }
): Promise<void> {
  try {
    const memberRef = doc(db, 'commissionMembers', memberId);
    await updateDoc(memberRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    if (actor) {
      await saveAuditLogToFirestore({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        user: auth.currentUser?.uid || 'admin',
        userName: actor.warName || actor.name,
        userRole: actor.role,
        action: 'edicao',
        entityType: 'usuario',
        entityId: memberId,
        summary: `Atualização de dados do integrante da Comissão Oficial: ${memberId}`,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `commissionMembers/${memberId}`);
  }
}

// Vincular conta Google (e-mail e UID) a um integrante da Comissão Oficial
export async function linkCommissionMemberAccountInFirestore(
  memberId: string,
  email: string,
  uid?: string | null,
  actor?: { warName: string; name: string; role: UserRole }
): Promise<void> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const memberRef = doc(db, 'commissionMembers', memberId);
    const memberSnap = await getDoc(memberRef);
    const memberData = memberSnap.exists() ? memberSnap.data() : null;

    let targetUid = uid || null;

    // Busca se já existe usuário registrado com este email na coleção users
    if (!targetUid && normalizedEmail) {
      const usersColl = collection(db, 'users');
      const q = query(usersColl, where('email', '==', normalizedEmail));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        targetUid = qSnap.docs[0].id;
      }
    }

    // Atualiza o documento na coleção commissionMembers
    await updateDoc(memberRef, {
      linkedEmail: normalizedEmail || null,
      linkedUserUid: targetUid,
      updatedAt: new Date().toISOString(),
    });

    // Se o usuário já possuir conta no banco, atualiza seu perfil com a função e aprova
    if (targetUid && memberData) {
      const userRef = doc(db, 'users', targetUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          role: memberData.role || 'visualizador',
          status: 'approved',
          officialRoleTitle: memberData.position,
          department: memberData.description,
          active: true,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (actor) {
      await saveAuditLogToFirestore({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        user: auth.currentUser?.uid || 'admin',
        userName: actor.warName || actor.name,
        userRole: actor.role,
        action: 'edicao',
        entityType: 'usuario',
        entityId: memberId,
        summary: `Vínculo de conta Google (${normalizedEmail}) ao integrante ${memberId}`,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `commissionMembers/${memberId}`);
  }
}

// Salvar / atualizar perfil de usuário autenticado no Firestore
export async function saveUserProfileToFirestore(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.id);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const isDefaultAdmin = (user.email || '').toLowerCase().trim() === 'felipegponce@gmail.com';
      if (isDefaultAdmin) {
        // Bootstrap do primeiro administrador
        await setDoc(userRef, {
          uid: user.id,
          email: user.email,
          displayName: user.name,
          name: user.name,
          warName: user.warName || 'ADMINISTRADOR',
          role: 'admin',
          status: 'approved',
          officialRoleTitle: 'Administrador do Sistema',
          department: 'Comando / Administração Geral',
          active: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
      } else {
        // Usuário comum: cadastrado automaticamente como visualizador aprovado para consulta imediata
        await setDoc(userRef, {
          uid: user.id,
          email: user.email,
          displayName: user.name,
          name: user.name,
          warName: user.warName || (user.name ? user.name.split(' ')[0].toUpperCase() : 'VISUALIZADOR'),
          role: 'visualizador',
          status: 'approved',
          active: true,
          department: 'Turma do NPOR / Consulta Pública',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
      }
    } else {
      // Usuário existente: atualiza apenas campos de apresentação e data de login
      // NUNCA modifica role, status, active, uid ou email
      await setDoc(
        userRef,
        {
          displayName: user.name,
          photoURL: user.avatar || '',
          lastLogin: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('[Firestore] Erro ao salvar perfil de usuário:', err);
  }
}

// Atualização de papel do usuário por administrador no Firestore
export async function updateUserRoleInFirestore(
  uid: string,
  newRole: UserRole,
  actor?: { warName: string; name: string; role: UserRole }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const prevRole = snap.exists() ? snap.data().role : 'indefinido';
    const userName = snap.exists() ? (snap.data().warName || snap.data().displayName || uid) : uid;

    await updateDoc(userRef, {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });

    // Registra auditoria contábil
    if (actor) {
      await saveAuditLogToFirestore({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        user: actor.warName || actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'permissao',
        entityType: 'usuario',
        entityId: uid,
        summary: `Administrador alterou perfil de usuário (${userName})`,
        previousValue: String(prevRole),
        newValue: String(newRole),
        reason: 'Atualização de permissões administrativas',
      });
    }
  } catch (err) {
    console.error('[Firestore] Erro ao atualizar papel de usuário:', err);
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

// Atualização de status de aprovação de usuário (Aprovar, Rejeitar, Suspender)
export async function updateUserStatusInFirestore(
  uid: string,
  newStatus: UserStatus,
  newRole?: UserRole,
  actor?: { warName: string; name: string; role: UserRole }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const prevStatus = snap.exists() ? (snap.data().status || 'pending') : 'pending';
    const userName = snap.exists() ? (snap.data().warName || snap.data().displayName || uid) : uid;

    const payload: any = {
      status: newStatus,
      active: newStatus === 'approved',
      updatedAt: new Date().toISOString(),
    };
    if (newRole) {
      payload.role = newRole;
    }

    await updateDoc(userRef, payload);

    if (actor) {
      const actionDescription =
        newStatus === 'approved'
          ? `Administrador aprovou acesso de ${userName} (${newRole || 'visualizador'})`
          : newStatus === 'rejected'
          ? `Administrador rejeitou solicitação de acesso de ${userName}`
          : `Administrador suspendeu acesso de ${userName}`;

      await saveAuditLogToFirestore({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        user: actor.warName || actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'permissao',
        entityType: 'usuario',
        entityId: uid,
        summary: actionDescription,
        previousValue: String(prevStatus),
        newValue: `${newStatus} (${newRole || 'inalterado'})`,
        reason: 'Fluxo de aprovação de acessos',
      });
    }
  } catch (err) {
    console.error('[Firestore] Erro ao atualizar status do usuário:', err);
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

// Associação de e-mail Google a um integrante da Comissão Oficial
export async function linkUserGoogleEmailInFirestore(
  userId: string,
  googleEmail: string,
  actor?: { warName: string; name: string; role: UserRole }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    const prevEmail = snap.exists() ? (snap.data().email || 'sem e-mail') : 'não encontrado';
    const userName = snap.exists() ? (snap.data().warName || snap.data().displayName || userId) : userId;

    await updateDoc(userRef, {
      email: googleEmail.trim().toLowerCase(),
      updatedAt: new Date().toISOString(),
    });

    if (actor) {
      await saveAuditLogToFirestore({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        user: actor.warName || actor.name,
        userName: actor.name,
        userRole: actor.role,
        action: 'configuracao',
        entityType: 'usuario',
        entityId: userId,
        summary: `Administrador associou conta Google (${googleEmail}) ao integrante ${userName}`,
        previousValue: String(prevEmail),
        newValue: String(googleEmail),
        reason: 'Associação de credencial Google à Comissão Oficial',
      });
    }
  } catch (err) {
    console.error('[Firestore] Erro ao associar conta Google do integrante:', err);
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

// -----------------------------------------------------------------------------
// CARREGAMENTO DO ESTADO OFICIAL DO FIRESTORE (A PARTIR DAS COLEÇÕES)
// -----------------------------------------------------------------------------

export async function fetchServerAppState(): Promise<AppState | null> {
  try {
    // Garante migração se necessário
    await migrateLegacyStateToModularCollections();

    // Carregamento paralelo direto das coleções modulares
    const [
      txSnap,
      docSnap,
      catSnap,
      feeSnap,
      raffleSnap,
      shirtSnap,
      jacketSnap,
      uniformSnap,
      eventSnap,
      planSnap,
      contractSnap,
      alertSnap,
      logSnap,
      ruleSnap,
      configSnap,
      syncSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'transactions')),
      getDocs(collection(db, 'documents')),
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'monthlyFees')),
      getDocs(collection(db, 'raffles')),
      getDocs(collection(db, 'shirtOrders')),
      getDocs(collection(db, 'jacketOrders')),
      getDocs(collection(db, 'uniformOrders')),
      getDocs(collection(db, 'events')),
      getDocs(collection(db, 'plans')),
      getDocs(collection(db, 'contracts')),
      getDocs(collection(db, 'auditAlerts')),
      getDocs(collection(db, 'auditLogs')),
      getDocs(collection(db, 'classificationRules')),
      getDoc(doc(db, 'system', 'config')),
      getDoc(doc(db, 'system', 'sync')),
    ]);

    const transactions: Transaction[] = txSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
    const documents: DocumentRecord[] = docSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentRecord));
    const categories: Category[] = catSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
    const monthlyFees: MonthlyFee[] = feeSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MonthlyFee));
    const raffles: Raffle[] = raffleSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Raffle));
    const shirtOrders: ShirtOrder[] = shirtSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ShirtOrder));
    const jacketOrders: JacketOrder[] = jacketSnap.docs.map((d) => ({ id: d.id, ...d.data() } as JacketOrder));
    const uniformOrders: UniformOrder[] = uniformSnap.docs.map((d) => ({ id: d.id, ...d.data() } as UniformOrder));
    const events: EventRecord[] = eventSnap.docs.map((d) => ({ id: d.id, ...d.data() } as EventRecord));
    const plans: FuturePlan[] = planSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FuturePlan));
    const contracts: ContractRecord[] = contractSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ContractRecord));
    const alerts: AuditAlert[] = alertSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditAlert));
    const auditLogs: AuditLog[] = logSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
    const classificationRules: ClassificationRule[] = ruleSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassificationRule));

    const configData = configSnap.exists() ? configSnap.data() : null;
    const syncData = syncSnap.exists() ? syncSnap.data() : null;

    if (transactions.length > 0 || documents.length > 0 || configData) {
      const stateObj: any = {
        config: configData || INITIAL_GREMIO_CONFIG,
        transactions,
        documents,
        categories: categories.length > 0 ? categories : BASE_PREDEFINED_CATEGORIES,
        monthlyFees,
        raffles,
        shirtOrders,
        jacketOrders,
        uniformOrders,
        events,
        plans,
        contracts,
        alerts,
        auditLogs,
        classificationRules: classificationRules.length > 0 ? classificationRules : BASE_CLASSIFICATION_RULES,
        lastSyncedAt: syncData?.lastSyncedAt || null,
        lastSyncReport: syncData?.lastSyncReport || null,
        driveFoldersStatus: syncData?.driveFoldersStatus || {},
      };

      const normalized = normalizeAppState(stateObj);
      saveToStorage('state', normalized); // Cache local
      return normalized;
    }
  } catch (err) {
    console.warn('[Firestore] Falha ao ler coleções modulares, verificando documento de transição:', err);
  }

  // Fallback 1: Documento legado gremio_state/main se coleções ainda estiverem vazias
  try {
    const docRef = doc(db, 'gremio_state', 'main');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && (data.transactions || data.documents || data.config)) {
        const normalized = normalizeAppState(data as any);
        saveToStorage('state', normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.warn('[Firestore] Erro ao consultar documento legado:', err);
  }

  // Fallback 2: Cache local
  try {
    const localRaw = localStorage.getItem(STORAGE_KEY_PREFIX + 'state');
    if (localRaw) {
      const parsed = safeJsonParse(localRaw, null);
      if (parsed) return normalizeAppState(parsed);
    }
  } catch {
    // Ignora erro de cache
  }

  return null;
}

// -----------------------------------------------------------------------------
// LISTENER MODULAR EM TEMPO REAL NO FIRESTORE
// -----------------------------------------------------------------------------

export function subscribeToFirestoreState(
  onUpdate: (state: AppState) => void,
  onError?: (error: unknown) => void
): () => void {
  const unsubs: (() => void)[] = [];

  // Escuta modular por coleções: apenas alterações pontuais disparam reações
  try {
    const unsubTx = onSnapshot(
      collection(db, 'transactions'),
      (snapshot) => {
        if (!snapshot.empty) {
          const txs: Transaction[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
          const current = getInitialAppState();
          const next = normalizeAppState({ ...current, transactions: txs });
          saveToStorage('state', next);
          onUpdate(next);
        }
      },
      (err) => console.warn('[Firestore Listener] Transações:', err)
    );
    unsubs.push(unsubTx);

    const unsubDoc = onSnapshot(
      collection(db, 'documents'),
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: DocumentRecord[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentRecord));
          const current = getInitialAppState();
          const next = normalizeAppState({ ...current, documents: docs });
          saveToStorage('state', next);
          onUpdate(next);
        }
      },
      (err) => console.warn('[Firestore Listener] Documentos:', err)
    );
    unsubs.push(unsubDoc);

    const unsubCats = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cats: Category[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
          const current = getInitialAppState();
          const next = normalizeAppState({ ...current, categories: cats });
          saveToStorage('state', next);
          onUpdate(next);
        }
      },
      (err) => console.warn('[Firestore Listener] Categorias:', err)
    );
    unsubs.push(unsubCats);

    // Escuta configurações do sistema e personalizações de interface em tempo real
    const unsubConfig = onSnapshot(
      doc(db, 'system', 'config'),
      (snapshot) => {
        if (snapshot.exists()) {
          const cfg = snapshot.data();
          if (cfg && (cfg.gremioName || cfg.theme)) {
            const current = getInitialAppState();
            const next = normalizeAppState({
              ...current,
              config: {
                ...current.config,
                ...cfg,
                theme: {
                  ...(current.config?.theme || {}),
                  ...(cfg.theme || {}),
                },
              },
            });
            saveToStorage('state', next);
            onUpdate(next);
          }
        }
      },
      (err) => console.warn('[Firestore Listener] Configuração do Sistema:', err)
    );
    unsubs.push(unsubConfig);

    // Também escuta gremio_state/main durante transição para garantir consistência
    const unsubLegacy = onSnapshot(
      doc(db, 'gremio_state', 'main'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && (data.transactions || data.documents || data.config)) {
            const normalized = normalizeAppState(data as any);
            saveToStorage('state', normalized);
            onUpdate(normalized);
          }
        }
      },
      (err) => {
        console.warn('[Firestore Listener] Legado gremio_state:', err);
        if (onError) onError(err);
      }
    );
    unsubs.push(unsubLegacy);
  } catch (err) {
    console.warn('[Firestore] Erro ao registrar listeners modulares:', err);
    if (onError) onError(err);
  }

  return () => {
    unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // Ignora
      }
    });
  };
}

// -----------------------------------------------------------------------------
// PERSISTÊNCIA COMPLETA E COMPACTAÇÃO
// -----------------------------------------------------------------------------

function compactStateForPersistence(state: AppState): AppState {
  const compactText = (value: unknown, max = 3500) => {
    const text = String(value ?? '');
    return text.length > max ? `${text.slice(0, max)}…` : text;
  };

  return {
    ...state,
    documents: (state.documents || []).map((doc) => ({
      ...doc,
      extractedText: compactText(doc.extractedText),
      fileContentOrOcrText: compactText(doc.fileContentOrOcrText),
    })),
  };
}

// Controle de concorrência e debouncing para Firestore
let cloudPersistTimer: ReturnType<typeof setTimeout> | null = null;
let isCloudWriteInFlight = false;
let pendingStateToPersist: AppState | null = null;

// Persistência OFICIAL: Salva no cache local instantaneamente e debounced no Cloud Firestore
export function persistAppState(state: AppState): void {
  try {
    const compactState = compactStateForPersistence(state);

    // 1. Atualização imediata do cache local (sempre síncrono e instantâneo)
    saveToStorage('state', compactState);

    // 2. Não enfileira gravações no Firestore se não houver usuário autenticado
    if (!auth.currentUser) {
      return;
    }

    // 3. Debounce com serialização para evitar o erro "Write stream exhausted maximum allowed queued writes"
    pendingStateToPersist = compactState;

    if (cloudPersistTimer) {
      clearTimeout(cloudPersistTimer);
    }

    cloudPersistTimer = setTimeout(async () => {
      cloudPersistTimer = null;
      if (isCloudWriteInFlight) {
        // Se já houver gravação em andamento, reagenda brevemente
        cloudPersistTimer = setTimeout(() => {
          if (pendingStateToPersist) persistAppState(pendingStateToPersist);
        }, 500);
        return;
      }

      if (!pendingStateToPersist || !auth.currentUser) return;
      const targetState = pendingStateToPersist;
      pendingStateToPersist = null;

      isCloudWriteInFlight = true;
      try {
        const nowIso = new Date().toISOString();

        // 3.1. Persiste configurações de interface e metadados no Firestore
        if (targetState.config) {
          const configRef = doc(db, 'system', 'config');
          await setDoc(configRef, JSON.parse(JSON.stringify(targetState.config)), { merge: true });
        }

        // 3.2. Persiste status de sincronização
        const syncRef = doc(db, 'system', 'sync');
        await setDoc(
          syncRef,
          {
            lastSyncedAt: targetState.lastSyncedAt || nowIso,
            lastSyncReport: targetState.lastSyncReport || null,
            driveFoldersStatus: targetState.driveFoldersStatus || {},
          },
          { merge: true }
        );

        // 3.3. Persiste snapshot consolidado em gremio_state/main de forma controlada
        const docRef = doc(db, 'gremio_state', 'main');
        const cleanPayload: any = JSON.parse(JSON.stringify(targetState));
        cleanPayload.updatedAt = nowIso;
        await setDoc(docRef, cleanPayload, { merge: true });
      } catch (err: any) {
        if (err?.code === 'permission-denied') {
          console.info('[Firestore] Persistência cloud restrita ao perfil do usuário atual.');
        } else {
          console.warn('[Firestore] Aviso na persistência em nuvem:', err?.message || err);
        }
      } finally {
        isCloudWriteInFlight = false;
      }
    }, 1200);
  } catch (e) {
    console.error('Falha geral ao persistir estado do Grêmio:', e);
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

  // 2. Comprovantes fiscais/bancários sem vínculo (ignora planilhas, contratos, fotos e arquivos administrativos)
  const financialVoucherTypes = new Set(['comprovante_pix', 'recibo', 'nota_fiscal', 'boleto']);

  documents.filter(Boolean).forEach((doc) => {
    // Apenas documentos estritamente do tipo comprovante financeiro
    if (!financialVoucherTypes.has(doc.type)) {
      return;
    }

    const isLinked = Boolean(doc.relatedTransactionId || doc.relatedEventId || doc.relatedGraduationServiceId);
    if (isLinked) {
      return;
    }

    const detectedAmt = typeof doc.detectedAmount === 'number' ? doc.detectedAmount : 0;
    if (doc.auditStatus === 'sem_vinculo' || !isLinked) {
      generatedAlerts.push({
        id: `alt-unlinked-doc-${doc.id}`,
        severity: 'amarelo',
        title: `Comprovante importado sem vínculo (${doc.name || 'Arquivo'})`,
        description: `O comprovante "${doc.name || 'Documento'}"${detectedAmt > 0 ? ` no valor identificado de R$ ${detectedAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''} não possui associação com nenhuma despesa registrada.`,
        location: 'Central de Documentos > Comprovantes Sem Vínculo',
        relatedDocumentId: doc.id,
        divergentValueOrInfo: detectedAmt > 0 ? `R$ ${detectedAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sem lançamento` : 'Sem lançamento vinculado',
        probableReason: 'Comprovante bancário ou recibo arquivado no Drive sem lançamento correspondente no livro caixa da tesouraria.',
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

  // Reconstrói alertas automáticos a cada auditoria para remover pendências que já deixaram de existir.
  // Preserva apenas alertas manuais e o status de resolução de um alerta automático que ainda é aplicável.
  const previousById = new Map<string, AuditAlert>();
  activeAlerts.filter(Boolean).forEach((a) => previousById.set(a.id, a));

  const mergedGenerated = generatedAlerts.map((generated) => {
    const previous = previousById.get(generated.id);
    if (!previous) return generated;
    if (previous.status !== 'ativo') {
      return {
        ...generated,
        status: previous.status,
        justification: previous.justification,
        resolutionNotes: previous.resolutionNotes,
        resolvedBy: previous.resolvedBy,
        resolvedAt: previous.resolvedAt,
      };
    }
    return generated;
  });

  const manualAlerts = activeAlerts.filter((a) => a && !String(a.id || '').startsWith('alt-'));
  const map = new Map<string, AuditAlert>();
  [...manualAlerts, ...mergedGenerated].forEach((a) => {
    if (a?.id) map.set(a.id, a);
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
  const warName = userName || state?.currentUser?.warName || 'USUÁRIO';
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
  };
  const updated = {
    ...state,
    auditLogs: [newLog, ...(Array.isArray(state?.auditLogs) ? state.auditLogs : [])],
  };
  return updated;
}

/**
 * Confirmação humana de classificação de documento e aprendizado de regras
 */
export function confirmDocumentClassification(
  state: AppState,
  docId: string,
  chosenCategoryNameOrId: string,
  createRule: boolean = true,
  ruleScope: 'supplier' | 'keyword' | 'folder' = 'supplier'
): AppState {
  const docIndex = state.documents.findIndex((d) => d.id === docId);
  if (docIndex === -1) return state;

  const targetDoc = state.documents[docIndex];
  let targetCat = state.categories.find(
    (c) => c.id === chosenCategoryNameOrId || c.name.toLowerCase() === chosenCategoryNameOrId.toLowerCase()
  );

  let updatedCategories = [...state.categories];

  // Se a categoria ainda não existe, cria dinamicamente
  if (!targetCat) {
    const { slug, canonicalName } = normalizeCategoryText(chosenCategoryNameOrId);
    targetCat = {
      id: `cat-dyn-${slug}-${Date.now()}`,
      name: canonicalName,
      slug,
      source: 'user_created',
      isDynamic: true,
      createdAt: new Date().toISOString(),
      description: `Categoria criada a partir da confirmação do comprovante ${targetDoc.name}`,
      color: '#4B5320',
      keywords: [canonicalName.toLowerCase()],
      totalSpent: 0,
      transactionsCount: 0,
      documentsCount: 1,
    };
    updatedCategories.push(targetCat);
  }

  // Cria regra de aprendizado contábil
  let updatedRules = [...state.classificationRules];
  let ruleCriteria = '';

  if (createRule) {
    let keyword: string | undefined;
    let supplier: string | undefined;
    let folder: string | undefined;

    if (ruleScope === 'supplier' && (targetDoc.detectedSupplier || targetDoc.detectedPersonOrCompany)) {
      supplier = targetDoc.detectedSupplier || targetDoc.detectedPersonOrCompany;
      ruleCriteria = `Fornecedor: ${supplier}`;
    } else if (ruleScope === 'folder' && targetDoc.driveFolder) {
      folder = targetDoc.driveFolder;
      ruleCriteria = `Pasta: ${folder}`;
    } else {
      // Keyword a partir do nome do arquivo
      const words = (targetDoc.name || '')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !/^(comprovante|recibo|nota|fiscal|pix)$/i.test(w));
      keyword = words[0] || targetCat.name.toLowerCase();
      ruleCriteria = `Palavra-chave: ${keyword}`;
    }

    const newRule: ClassificationRule = {
      id: `rule-usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      keyword,
      supplier,
      folder,
      targetCategoryId: targetCat.id,
      categoryName: targetCat.name,
      confidence: 1.0,
      priority: 100, // Maior prioridade por ser confirmada pelo usuário
      createdAt: new Date().toISOString(),
      isUserConfirmed: true,
    };

    updatedRules.push(newRule);
  }

  // Atualiza o documento alvo e outros similares pendentes
  const updatedDocuments = state.documents.map((d) => {
    if (d.id === docId) {
      return {
        ...d,
        categoryId: targetCat!.id,
        categoryName: targetCat!.name,
        classificationStatus: 'classificado' as const,
        classificationConfidence: 1.0,
      };
    }

    // Propagação inteligente para outros documentos do mesmo fornecedor ou pasta se regra foi criada
    if (createRule && d.classificationStatus !== 'classificado') {
      const matchSup =
        (targetDoc.detectedSupplier || targetDoc.detectedPersonOrCompany) &&
        (d.detectedSupplier === targetDoc.detectedSupplier ||
          d.detectedPersonOrCompany === targetDoc.detectedPersonOrCompany);

      if (matchSup) {
        return {
          ...d,
          categoryId: targetCat!.id,
          categoryName: targetCat!.name,
          classificationStatus: 'classificado' as const,
          classificationConfidence: 0.98,
        };
      }
    }

    return d;
  });

  const updatedState: AppState = {
    ...state,
    categories: updatedCategories,
    classificationRules: updatedRules,
    documents: updatedDocuments,
  };

  const loggedState = addAuditLog(
    updatedState,
    'Classificação',
    `Classificou documento "${targetDoc.name}" na categoria "${targetCat.name}" (${ruleCriteria || 'manual'})`,
    targetDoc.id
  );

  return loggedState;
}

/**
 * Confirmação de vínculo entre comprovante e lançamento contábil
 */
export function confirmDocumentTransactionLink(
  state: AppState,
  docId: string,
  transactionId: string
): AppState {
  const docIndex = state.documents.findIndex((d) => d.id === docId);
  const txIndex = state.transactions.findIndex((t) => t.id === transactionId);
  if (docIndex === -1 || txIndex === -1) return state;

  const targetDoc = state.documents[docIndex];
  const targetTx = state.transactions[txIndex];

  // Atualiza documento
  const updatedDocuments = [...state.documents];
  updatedDocuments[docIndex] = {
    ...targetDoc,
    relatedTransactionId: targetTx.id,
    transactionLinkStatus: 'vinculado',
    transactionLinkConfidence: 1.0,
    auditStatus: 'conferido',
  };

  // Atualiza transação
  const updatedTransactions = [...state.transactions];
  const existingDocs = Array.isArray(targetTx.documentIds) ? [...targetTx.documentIds] : [];
  if (!existingDocs.includes(docId)) existingDocs.push(docId);

  updatedTransactions[txIndex] = {
    ...targetTx,
    receiptDocumentId: targetTx.receiptDocumentId || docId,
    documentIds: existingDocs,
    categoryId: targetTx.categoryId || targetDoc.categoryId,
    category: (targetTx.category && targetTx.category !== 'Custos adicionais' && targetTx.category !== 'Geral')
      ? targetTx.category
      : (targetDoc.categoryName || targetTx.category),
  };

  const updatedState: AppState = {
    ...state,
    documents: updatedDocuments,
    transactions: updatedTransactions,
  };

  return addAuditLog(
    updatedState,
    'Auditoria',
    `Vinculou comprovante "${targetDoc.name}" ao lançamento "${targetTx.description}" (${formatCurrencyPtBr(targetTx.amount)})`,
    targetDoc.id
  );
}

/**
 * Rejeição de vínculo sugerido
 */
export function rejectDocumentTransactionLink(state: AppState, docId: string): AppState {
  const docIndex = state.documents.findIndex((d) => d.id === docId);
  if (docIndex === -1) return state;

  const targetDoc = state.documents[docIndex];
  const updatedDocuments = [...state.documents];
  updatedDocuments[docIndex] = {
    ...targetDoc,
    suggestedTransactionId: undefined,
    transactionLinkStatus: 'sem_vinculo',
    transactionLinkConfidence: 0,
  };

  const updatedState: AppState = {
    ...state,
    documents: updatedDocuments,
  };

  return addAuditLog(
    updatedState,
    'Auditoria',
    `Rejeitou sugestão de vínculo para o comprovante "${targetDoc.name}"`,
    targetDoc.id
  );
}

/**
 * Criação manual de nova categoria
 */
export function createNewCategory(
  state: AppState,
  name: string,
  description?: string,
  color?: string,
  keywords?: string[]
): { state: AppState; category: Category } {
  const { slug, canonicalName } = normalizeCategoryText(name);
  const existing = state.categories.find((c) => c.slug === slug);
  if (existing) {
    return { state, category: existing };
  }

  const newCat: Category = {
    id: `cat-${slug}-${Date.now()}`,
    name: canonicalName,
    slug,
    source: 'user_created',
    isDynamic: true,
    createdAt: new Date().toISOString(),
    description: description || `Categoria de projeto: ${canonicalName}`,
    color: color || '#4B5320',
    keywords: keywords || [canonicalName.toLowerCase()],
    totalSpent: 0,
    transactionsCount: 0,
    documentsCount: 0,
  };

  const updatedState: AppState = {
    ...state,
    categories: [...state.categories, newCat],
  };

  const loggedState = addAuditLog(
    updatedState,
    'Categorias',
    `Criou nova categoria "${newCat.name}"`,
    newCat.id
  );

  return { state: loggedState, category: newCat };
}

/**
 * Exclusão de regra de classificação
 */
export function removeClassificationRule(state: AppState, ruleId: string): AppState {
  const updatedRules = state.classificationRules.filter((r) => r.id !== ruleId);
  const updatedState: AppState = {
    ...state,
    classificationRules: updatedRules,
  };
  return addAuditLog(updatedState, 'Regras de Classificação', `Removeu regra de classificação (${ruleId})`, ruleId);
}

