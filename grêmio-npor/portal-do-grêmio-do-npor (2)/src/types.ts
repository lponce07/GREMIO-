export type UserRole =
  | 'admin'
  | 'tesouraria'
  | 'diretor_eventos'
  | 'comissao_formatura'
  | 'aluno'
  | 'instrutor_fiscal'
  | 'membro_consulta'
  | 'visitante_publico';

export type UserProfile = User;

export interface User {
  id: string;
  name: string;
  warName: string; // Nome de Guerra / Posto (ex: Ten. R/2 Felipe, Al. Castro)
  email: string;
  role: UserRole;
  avatar?: string;
  department: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface GremioConfig {
  gremioName: string;
  turmaName: string;
  year: string | number;
  unitName: string; // Ex: NPOR / 28º BIB
  creationDate: string;
  initialBalance: number;
  logoUrl?: string;
  motto?: string;
  isDemoMode: boolean;
  googleDriveConnected: boolean;
  driveFolderSelected?: string;
  googleDriveFolderId?: string;
  gmailConnected: boolean;
  gmailFilterSelected?: string;
  emailAccount?: string;
  presidentName: string;
  treasurerName: string;
  fiscalCouncilNames: string[];
  requireProofForExpense?: boolean;
  maskSensitiveData?: boolean;
}

export type TransactionType = 'receita' | 'despesa' | 'transferencia';
export type PaymentMethod =
  | 'PIX'
  | 'pix'
  | 'Boleto'
  | 'Transferência TED'
  | 'Cartão'
  | 'Dinheiro Espécie'
  | 'Outro';

export interface Transaction {
  id: string;
  code: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  description: string;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  sourceAccount?: string;
  destinationAccount?: string;
  beneficiaryName: string;
  beneficiaryCpfCnpj?: string;
  responsibleUser: string;
  relatedEventId?: string;
  relatedGraduationServiceId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentsCount?: number;
  currentInstallment?: number;
  dueDate?: string;
  paymentDate?: string;
  paidAt?: string;
  status: 'prevista' | 'pendente' | 'paga' | 'recebida' | 'atrasada' | 'cancelada';
  notes?: string;
  receiptRequired: boolean;
  receiptDocumentId?: string;
  contractOrInvoiceDocumentId?: string;
  googleDriveFileLink?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  isArchived?: boolean;
  cancellationReason?: string;
  isDemoData?: boolean;
  // Rastreabilidade Google Drive e Multi-Documentos
  source?: 'Google Drive' | 'Manual' | 'Planilha Importada';
  sourceFileId?: string;
  sourceRowId?: string;
  driveFolder?: string;
  originalFileUrl?: string;
  lastSyncedAt?: string;
  documentIds?: string[];
}

export interface TransactionDocument {
  id: string;
  transaction_id: string;
  document_id: string;
  relationship_type: 'comprovante' | 'contrato' | 'orcamento' | 'nota' | 'recibo';
  notes?: string;
  linked_at?: string;
  linked_by?: string;
}

export interface Member {
  id: string;
  name: string;
  warName: string;
  militaryId?: string;
  active: boolean;
  phone?: string;
  email?: string;
  shirtSize?: string;
  jacketSize?: string;
  notes?: string;
}

export interface MonthlyFee {
  id: string;
  memberId?: string;
  memberName: string;
  competenceMonth: string; // Ex: '2026-03'
  amount: number;
  paymentDate?: string;
  status: 'Pago' | 'Pendente' | 'Atrasado' | 'Isento';
  documentId?: string;
  notes?: string;
  source?: string;
  sourceFileId?: string;
  sourceRowId?: string;
  lastSyncedAt?: string;
}

export interface Raffle {
  id: string;
  name: string;
  purpose: string;
  totalTickets: number;
  ticketPrice: number;
  responsible: string;
  collectedAmount: number;
  pendingAmount: number;
  expensesAmount: number;
  netResult: number;
  status: 'planejada' | 'em_andamento' | 'encerrada' | 'sorteada';
  relatedDocumentIds?: string[];
  source?: string;
  sourceFileId?: string;
  lastSyncedAt?: string;
}

export interface ShirtOrder {
  id: string;
  model: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paidAmount: number;
  pendingBalance: number;
  membersList?: { memberName: string; size: string; paid: boolean }[];
  sizesSummary?: Record<string, number>;
  documentIds?: string[];
  source?: string;
  sourceFileId?: string;
  lastSyncedAt?: string;
}

export interface JacketOrder {
  id: string;
  supplier: string;
  quantity: number;
  totalCost: number;
  paidAmount: number;
  pendingBalance: number;
  orderStatus: 'cotacao' | 'pedido_feito' | 'em_producao' | 'entregue';
  membersList?: { memberName: string; size: string; paid: boolean }[];
  documentIds?: string[];
  source?: string;
  sourceFileId?: string;
  lastSyncedAt?: string;
}

export interface UniformOrder {
  id: string;
  uniformType: string;
  supplier: string;
  quantity: number;
  totalAmount: number;
  paidAmount: number;
  status: 'orcamento' | 'encomendado' | 'entregue' | 'pago';
  documentIds?: string[];
  source?: string;
  sourceFileId?: string;
  lastSyncedAt?: string;
}

export interface GetTogetherEvent {
  id: string;
  title: string;
  date: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  suppliers?: string[];
  services?: string[];
  responsibles?: string[];
  documentIds?: string[];
  notes?: string;
}

export interface ContractRecord {
  id: string;
  serviceName: string;
  contractor: string;
  contractorCnpjCpf?: string;
  object: string;
  totalAmount: number;
  downPayment: number;
  installmentsCount: number;
  paidAmount: number;
  pendingBalance: number;
  contractDate: string;
  dueDates?: string[];
  documentId?: string;
  originalFileUrl?: string;
  status: 'ativo' | 'concluido' | 'cancelado';
  notes?: string;
}

export interface AdditionalCostRecord {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  responsible: string;
  justification: string;
  documentId?: string;
  transactionId?: string;
}

export interface HistoryRecord {
  id: string;
  title: string;
  date: string;
  description: string;
  objective?: string;
  achievedResult?: string;
  responsibles?: string[];
  participants?: string;
  amountSpentOrRaised?: number;
  type?: 'receita' | 'despesa' | 'neutro';
  relatedEventId?: string;
  photos?: string[];
  documents?: string[];
  receipts?: string[];
  status?: 'concluida' | 'em_andamento' | 'cancelada' | 'planejada';
  originalSource?: string;
  updatedAt?: string;
  category?: 'instrucao' | 'evento' | 'formatura' | 'administrativo' | string;
  author?: string;
  photosOrAttachments?: string[];
}

export interface EventRecord {
  id: string;
  name: string;
  description: string;
  objective?: string;
  dateTime: string;
  location: string;
  mainResponsible: string;
  team?: string[];
  supportTeam?: string[];
  estimatedAudience?: number;
  plannedBudget?: number;
  budgetAllocated?: number;
  usedBudget: number;
  relatedIncome?: number;
  relatedExpense?: number;
  suppliers?: string[];
  suppliersInvolved?: string[];
  hiredServices?: string[];
  schedule?: { time: string; activity: string; status: 'pendente' | 'em_andamento' | 'concluido' }[];
  checklist: {
    id?: string;
    task?: string;
    text?: string;
    category?: 'Planejamento' | 'Orçamento' | 'Contratação' | 'Divulgação' | 'Execução' | 'Prestação de Contas' | string;
    completed: boolean;
    responsible: string;
  }[];
  documents?: string[];
  receiptDocumentIds?: string[];
  receipts?: string[];
  photos?: string[];
  status:
    | 'ideia'
    | 'em_planejamento'
    | 'planejado'
    | 'aguardando_aprovacao'
    | 'aprovado'
    | 'em_contratacao'
    | 'em_execucao'
    | 'em_andamento'
    | 'concluido'
    | 'cancelado';
  pendingIssues?: string[];
  finalEvaluation?: string;
  evaluation?: {
    attendance: number;
    strengths: string[];
    improvements: string[];
  };
}

export interface FuturePlan {
  id: string;
  title: string;
  objective?: string;
  justification: string;
  description?: string;
  priority?: 'alta' | 'media' | 'baixa';
  responsible?: string;
  responsibleUser?: string;
  participants?: string[];
  targetDate: string;
  estimatedCost?: number;
  estimatedBudget?: number;
  fundingSources?: string[];
  requiredMaterials?: string[];
  potentialSuppliers?: string[];
  steps?: { id: string; title: string; completed: boolean; dueDate: string }[];
  stages?: { name: string; completed: boolean }[];
  dependencies?: string[];
  risks?: string[];
  identifiedRisks?: string[];
  contingencyPlans?: string;
  pendingIssues?: string[];
  approvalStatus?: 'aguardando' | 'aprovado' | 'reprovado' | 'em_revisao';
  status?: 'em_estudo' | 'aprovado' | 'em_execucao' | 'cancelado' | 'concluido';
  progressPercentage?: number;
  documents?: string[];
  notes?: string;
}

export interface GraduationService {
  id: string;
  category: string;
  name: string;
  fullDescription: string;
  supplierName: string;
  trackingResponsible?: string;
  responsible?: string;
  quantity?: number;
  estimatedAmount: number;
  contractedAmount: number;
  paymentMethod?: string;
  installmentsCount?: number;
  installments?: {
    number: number;
    dueDate: string;
    amount: number;
    status: 'pago' | 'pendente';
  }[];
  paidAmount?: number;
  pendingAmount?: number;
  dueDates?: string[];
  serviceDateTime?: string;
  contractDocumentId?: string;
  quotesReceived?: {
    id: string;
    supplier: string;
    amount: number;
    notes: string;
    selected: boolean;
  }[];
  receiptIds?: string[];
  agreedConditions?: string;
  notes?: string;
  status:
    | 'pesquisa'
    | 'em_negociacao'
    | 'contratado'
    | 'pago_parcial'
    | 'pago_integral'
    | 'quitado'
    | 'cancelado';
  pendingIssues?: string[];
  auditResponsible?: string;
  lastAuditDate?: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  type:
    | 'comprovante_pix'
    | 'transferencia'
    | 'recibo'
    | 'nota_fiscal'
    | 'boleto'
    | 'contrato'
    | 'orcamento'
    | 'planilha'
    | 'pdf'
    | 'imagem'
    | 'email'
    | 'outro';
  date: string;
  detectedDate?: string;
  detectedAmount?: number;
  detectedPersonOrCompany?: string;
  relatedTransactionId?: string;
  relatedEventId?: string;
  relatedGraduationServiceId?: string;
  responsible?: string;
  source: 'Google Drive' | 'Gmail' | 'Upload Manual' | 'Planilha Importada' | 'google_drive' | 'email_gmail' | 'upload_manual';
  driveUrl?: string;
  driveFolder?: string;
  originalFileUrl?: string;
  sourceFileId?: string;
  lastSyncedAt?: string;
  previewUrl?: string;
  fileSizeKb?: number;
  uploadedAt?: string;
  importDate?: string;
  auditStatus: 'conferido' | 'pendente_conferencia' | 'divergente' | 'sem_vinculo' | 'validado';
  fileContentOrOcrText?: string;
  isDemoData?: boolean;
}

export type AlertSeverity = 'vermelho' | 'amarelo' | 'azul' | 'verde';

export interface AuditAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  location: string;
  relatedDocumentId?: string;
  relatedTransactionId?: string;
  relatedGraduationServiceId?: string;
  relatedEventId?: string;
  divergentValueOrInfo?: string;
  probableReason?: string;
  recommendedAction?: string;
  status: 'ativo' | 'corrigido' | 'confirmado_correto' | 'ignorado' | 'resolvido' | 'dispensado';
  justification?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export type AuditLogRecord = AuditLog;

export interface AuditLog {
  id: string;
  timestamp: string;
  user?: string;
  userName?: string;
  userRole?: UserRole;
  module?: string;
  action: 'criacao' | 'edicao' | 'cancelamento' | 'conferencia' | 'importacao' | 'permissao' | 'configuracao' | string;
  entityType?: 'transacao' | 'evento' | 'formatura' | 'documento' | 'alerta' | 'usuario' | 'sistema' | string;
  entityId?: string;
  targetEntity?: string;
  summary?: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  relatedDocumentId?: string;
  confirmedBy?: string;
  ipAddress?: string;
}

export interface SupplierComparison {
  id: string;
  serviceCategory: string;
  selectedSupplierName?: string;
  decisionRationale?: string;
  proposals?: {
    supplierName: string;
    totalAmount: number;
    pros: string;
    cons: string;
  }[];
  supplierName?: string;
  price?: number;
  offeredService?: string;
  conditions?: string;
  rating?: number;
  advantages?: string[];
  disadvantages?: string[];
  isSelected?: boolean;
  contact?: string;
}

export interface GraduationGeneralInfo {
  eventDate?: string;
  venueName?: string;
  targetGraduates?: number;
  individualQuotaAmount?: number;
  targetDate?: string;
  location?: string;
  estimatedGraduates?: number;
  estimatedGuests?: number;
  ticketPricePerGraduate?: number;
  totalBudget: number;
  totalCollected: number;
  totalContracted: number;
  totalPaid: number;
  totalPending: number;
  availableBalance: number;
  timelineMilestones?: {
    id: string;
    title: string;
    date: string;
    status: 'concluido' | 'em_andamento' | 'planejado';
    responsible: string;
  }[];
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  size?: number | string;
  iconLink?: string;
}

export interface DriveFolderSyncInfo {
  name: string;
  folderId?: string;
  status: 'nao_sincronizado' | 'sincronizado';
  count: number;
  fileCount: number;
  sheetCount: number;
  lastSyncedAt?: string;
  error?: string;
  files?: DriveFileMetadata[];
}

