import {
  GremioConfig,
  User,
  CommissionMember,
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
  gmailFilterSelected: '',
  emailAccount: '',
  presidentName: 'Não informado',
  treasurerName: 'Não informado',
  fiscalCouncilNames: [],
  requireProofForExpense: true,
  maskSensitiveData: false,
};

// Registros administrativos oficiais da Comissão do Grêmio NPOR (armazenados em commissionMembers)
export const INITIAL_COMMISSION_MEMBERS: CommissionMember[] = [
  {
    id: 'com-ponce',
    name: 'AL PONCE',
    position: 'Presidente',
    role: 'presidente',
    description: 'Presidente da Comissão do Grêmio NPOR',
    linkedUserUid: null,
    linkedEmail: null,
    active: true,
    createdAt: '2026-02-16T08:00:00Z',
  },
  {
    id: 'com-araujo',
    name: 'AL ARAUJO',
    position: 'Vice-presidente',
    role: 'vice_presidente',
    description: 'Vice-Presidente da Comissão do Grêmio NPOR',
    linkedUserUid: null,
    linkedEmail: null,
    active: true,
    createdAt: '2026-02-16T08:00:00Z',
  },
  {
    id: 'com-emanuel',
    name: 'AL EMANUEL',
    position: 'Tesoureiro 1',
    role: 'tesoureiro_1',
    description: 'Tesouraria Geral e Prestação de Contas (Planilha-Mãe)',
    linkedUserUid: null,
    linkedEmail: null,
    active: true,
    createdAt: '2026-02-16T08:00:00Z',
  },
  {
    id: 'com-depaula',
    name: 'AL DE PAULA',
    position: 'Tesoureiro 2',
    role: 'tesoureiro_2',
    description: 'Tesouraria de Entradas, Arrecadações e Mensalidades',
    linkedUserUid: null,
    linkedEmail: null,
    active: true,
    createdAt: '2026-02-16T08:00:00Z',
  },
  {
    id: 'com-cavalcante',
    name: 'AL CAVALCANTE',
    position: 'Tesoureiro 3',
    role: 'tesoureiro_3',
    description: 'Tesouraria de Saídas, Pagamentos e Comprovantes',
    linkedUserUid: null,
    linkedEmail: null,
    active: true,
    createdAt: '2026-02-16T08:00:00Z',
  },
  {
    id: 'com-areco',
    name: 'AL ARECO',
    position: 'Eventos/Patrimônio',
    role: 'eventos_patrimonio',
    description: 'Comissão de Eventos e Gestão de Patrimônio',
    linkedUserUid: null,
    linkedEmail: null,
    active: true,
    createdAt: '2026-02-16T08:00:00Z',
  },
  {
    id: 'com-dosanjos',
    name: 'AL DOS ANJOS',
    position: 'Eventos/Patrimônio',
    role: 'eventos_patrimonio',
    description: 'Comissão de Eventos e Gestão de Patrimônio',
    linkedUserUid: null,
    linkedEmail: null,
    active: true,
    createdAt: '2026-02-16T08:00:00Z',
  },
];

// Perfis de usuários reais com acesso (a comissão não é cadastrada automaticamente aqui)
export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-root',
    name: 'Felipe Ponce (Administrador Geral)',
    warName: 'ADMINISTRADOR',
    email: 'felipegponce@gmail.com',
    role: 'admin',
    status: 'approved',
    officialRoleTitle: 'Administrador do Sistema',
    department: 'Comando / Administração Geral',
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
