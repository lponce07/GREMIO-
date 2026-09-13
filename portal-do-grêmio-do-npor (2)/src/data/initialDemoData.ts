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
} from '../types';

export const INITIAL_GREMIO_CONFIG: GremioConfig = {
  gremioName: 'Grêmio do NPOR',
  turmaName: 'Turma NPOR',
  year: '2026',
  unitName: 'Núcleo de Preparação de Oficiais da Reserva',
  creationDate: '2026-02-16',
  initialBalance: 0,
  logoUrl: '',
  motto: 'Formar o Oficial da Reserva com Honra e Excelência',
  isDemoMode: false,
  googleDriveConnected: false,
  driveFolderSelected: 'Pasta Oficial do Grêmio',
  googleDriveFolderId: '1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU',
  gmailConnected: false,
  gmailFilterSelected: 'gremio.npor@gmail.com',
  emailAccount: 'gremio.npor@gmail.com',
  presidentName: 'Felipe Gonçalves Ponce',
  treasurerName: 'Tesouraria do Grêmio',
  fiscalCouncilNames: ['Conselho Fiscal do NPOR'],
  requireProofForExpense: true,
  maskSensitiveData: false,
};

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Felipe Gonçalves Ponce',
    warName: 'Al. Felipe',
    email: 'felipegponce@gmail.com',
    role: 'admin',
    department: 'Presidência do Grêmio',
    active: true,
    createdAt: '2026-02-16T08:00:00Z',
    lastLogin: new Date().toISOString(),
  },
];

// Listas estritamente vazias: zero dados fictícios
export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_DOCUMENTS: DocumentRecord[] = [];
export const INITIAL_TRANSACTION_DOCUMENTS: TransactionDocument[] = [];
export const INITIAL_EVENTS: EventRecord[] = [];
export const INITIAL_HISTORY: HistoryRecord[] = [];
export const INITIAL_FUTURE_PLANS: FuturePlan[] = [];
export const INITIAL_GRADUATION_SERVICES: GraduationService[] = [];
export const INITIAL_SUPPLIER_COMPARISONS: SupplierComparison[] = [];
export const INITIAL_ALERTS: AuditAlert[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

// Categorias Reais do Google Drive
export const INITIAL_MEMBERS: Member[] = [];
export const INITIAL_MONTHLY_FEES: MonthlyFee[] = [];
export const INITIAL_RAFFLES: Raffle[] = [];
export const INITIAL_SHIRT_ORDERS: ShirtOrder[] = [];
export const INITIAL_JACKET_ORDERS: JacketOrder[] = [];
export const INITIAL_UNIFORM_ORDERS: UniformOrder[] = [];
export const INITIAL_GET_TOGETHERS: GetTogetherEvent[] = [];
export const INITIAL_CONTRACTS: ContractRecord[] = [];
export const INITIAL_ADDITIONAL_COSTS: AdditionalCostRecord[] = [];

export const INITIAL_GRADUATION_GENERAL: GraduationGeneralInfo = {
  targetDate: '2026-11-28',
  eventDate: '2026-11-28',
  venueName: 'A definir pela comissão',
  location: 'A definir',
  targetGraduates: 0,
  estimatedGraduates: 0,
  estimatedGuests: 0,
  individualQuotaAmount: 0,
  ticketPricePerGraduate: 0,
  totalBudget: 0,
  totalCollected: 0,
  totalContracted: 0,
  totalPaid: 0,
  totalPending: 0,
  availableBalance: 0,
  timelineMilestones: [],
};
