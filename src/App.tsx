import React, { useState, useEffect } from 'react';
import {
  AppState,
  loadAppState,
  saveAppState,
  resetAppState,
  fetchServerAppState,
  subscribeToFirestoreState,
  subscribeToFirestoreUsers,
  saveUserProfileToFirestore,
  runAutomatedAudit,
  addAuditLog,
  formatCurrencyPtBr,
  confirmDocumentClassification,
  confirmDocumentTransactionLink,
  rejectDocumentTransactionLink,
  seedOfficialCommission,
  subscribeCommissionMembers,
  deleteDocumentFromFirestore,
  saveDocumentToFirestore,
  saveTransactionToFirestore,
} from './services/dataService';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { syncRealGoogleDrive } from './services/googleDriveService';
import { onGoogleDriveConnected } from './services/driveSyncPipeline';
import { initAuth } from './services/googleAuthService';
import { parseVoucherMetadata } from './services/categoryClassifier';
import {
  Transaction,
  EventRecord,
  GraduationService,
  HistoryRecord,
  FuturePlan,
  DocumentRecord,
  AuditAlert,
  User,
  UserRole,
  UserStatus,
  GremioConfig,
  Category,
  SyncSummaryReport,
} from './types';

// Shell Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';

// Modals
import { SetupWizardModal } from './components/SetupWizardModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { SyncSummaryModal } from './components/SyncSummaryModal';

// Views
import { DashboardView } from './views/DashboardView';
import { TreasuryView } from './views/TreasuryView';
import { EventsView } from './views/EventsView';
import { GraduationView } from './views/GraduationView';
import { HistoryView } from './views/HistoryView';
import { FuturePlansView } from './views/FuturePlansView';
import { DocumentsView } from './views/DocumentsView';
import { AuditAlertsView } from './views/AuditAlertsView';
import { ReportsView } from './views/ReportsView';
import { IntegrationsView } from './views/IntegrationsView';
import { AuditLogsView } from './views/AuditLogsView';
import { UsersView } from './views/UsersView';
import { CategoriesHubView } from './views/CategoriesHubView';
import { DynamicCategoryView } from './views/DynamicCategoryView';
import { CustomizationView } from './views/CustomizationView';
import { applyThemeToDocument, getStoredTheme } from './utils/themeManager';
import { MilitaryInsignia } from './components/MilitaryInsignia';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('gremio_guest_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [appState, setAppState] = useState<AppState>(() => {
    const loaded = loadAppState();
    try {
      if (sessionStorage.getItem('gremio_guest_mode') === 'true') {
        return {
          ...loaded,
          currentUser: {
            id: 'guest-consulta-publica',
            name: 'Convidado (Consulta Pública)',
            warName: 'VISITANTE',
            email: '',
            department: 'Comunidade NPOR / Consulta Pública',
            role: 'visitante_publico',
            status: 'approved',
            officialRoleTitle: 'Consulta Pública e Transparência',
            active: true,
            createdAt: new Date().toISOString(),
          },
        };
      }
    } catch {}
    return loaded;
  });
  const appStateRef = React.useRef<AppState>(appState);
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      if (sessionStorage.getItem('gremio_guest_mode') === 'true') return 'visitante_publico';
    } catch {}
    return appState?.currentUser?.role || 'admin';
  });

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [syncSummaryReport, setSyncSummaryReport] = useState<SyncSummaryReport | null>(null);

  // Manipuladores de acesso convidado e logout
  const handleGuestAccess = () => {
    try {
      sessionStorage.setItem('gremio_guest_mode', 'true');
    } catch {}
    setIsGuestMode(true);
    const guestUser: User = {
      id: 'guest-consulta-publica',
      name: 'Convidado (Consulta Pública)',
      warName: 'VISITANTE',
      email: '',
      department: 'Comunidade NPOR / Consulta Pública',
      role: 'visitante_publico',
      status: 'approved',
      officialRoleTitle: 'Consulta Pública e Transparência',
      active: true,
      createdAt: new Date().toISOString(),
    };
    setUserRole('visitante_publico');
    setAppState((prev) => ({
      ...prev,
      currentUser: guestUser,
    }));
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('gremio_guest_mode');
    } catch {}
    setIsGuestMode(false);
    if (firebaseUser) {
      await signOut(auth);
    }
  };

  // 1. Firebase Authentication State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        try {
          sessionStorage.removeItem('gremio_guest_mode');
        } catch {}
        setIsGuestMode(false);

        const userEmailNormalized = (user.email || '').toLowerCase().trim();
        const isDefaultAdmin = userEmailNormalized === 'felipegponce@gmail.com';
        let determinedRole: UserRole = isDefaultAdmin ? 'admin' : 'visualizador';
        let determinedStatus: UserStatus = 'approved';
        let determinedWarName = user.displayName ? user.displayName.split(' ')[0].toUpperCase() : 'OFICIAL';
        let determinedOfficialTitle: string | undefined = isDefaultAdmin ? 'Administrador Geral' : undefined;

        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const uData = userDocSnap.data();
            if (uData.role) {
              determinedRole = uData.role as UserRole;
            }
            if (uData.status) {
              determinedStatus = uData.status as UserStatus;
            }
            if (uData.warName) {
              determinedWarName = uData.warName;
            }
            if (uData.officialRoleTitle) {
              determinedOfficialTitle = uData.officialRoleTitle;
            }
          }
        } catch (err) {
          console.warn('[Auth] Erro ao consultar perfil no Firestore:', err);
        }

        const userProfile: User = {
          id: user.uid,
          name: user.displayName || 'Usuário Grêmio NPOR',
          warName: determinedWarName,
          email: user.email || '',
          department: isDefaultAdmin ? 'Comando / Administração Geral' : 'Grêmio do NPOR',
          role: determinedRole,
          status: determinedStatus,
          officialRoleTitle: determinedOfficialTitle,
          active: determinedStatus === 'approved',
          createdAt: new Date().toISOString(),
          avatar: user.photoURL || undefined,
        };

        setUserRole(determinedRole);
        setAppState((prev) => ({
          ...prev,
          currentUser: userProfile,
        }));

        saveUserProfileToFirestore(userProfile)
          .then(() => {
            // Sincroniza a Comissão Oficial caso seja o administrador
            if (isDefaultAdmin || determinedRole === 'admin') {
              seedOfficialCommission();
            }
          })
          .catch(console.warn);
      } else {
        setFirebaseUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1.5. Aplica tema visual dinâmico (cores, fontes, bordas e variáveis CSS)
  useEffect(() => {
    if (appState?.config?.theme) {
      applyThemeToDocument(appState.config.theme);
    } else {
      applyThemeToDocument(getStoredTheme());
    }
  }, [appState?.config?.theme]);

  // 2. Real-time Firestore Listeners (quando autenticado OU em modo convidado)
  useEffect(() => {
    if (!firebaseUser && !isGuestMode) return;

    // Carrega dados iniciais do Firestore
    fetchServerAppState().then((serverState) => {
      if (serverState) {
        setAppState((prev) => ({
          ...serverState,
          currentUser: prev.currentUser,
        }));
      }
    });

    // Escuta alterações em gremio_state/main em tempo real (multi-usuário)
    const unsubState = subscribeToFirestoreState((cloudState) => {
      setAppState((prev) => {
        if (prev.updatedAt && cloudState.updatedAt && prev.updatedAt === cloudState.updatedAt) {
          return prev;
        }
        return {
          ...cloudState,
          currentUser: prev.currentUser,
        };
      });
    });

    // Escuta coleção de usuários em tempo real
    const unsubUsers = subscribeToFirestoreUsers((cloudUsers) => {
      setAppState((prev) => ({
        ...prev,
        users: cloudUsers,
      }));
      if (firebaseUser) {
        const myRecord = cloudUsers.find((u) => u.id === firebaseUser.uid || u.email === firebaseUser.email);
        if (myRecord?.role) {
          setUserRole(myRecord.role);
        }
      }
    });

    // Escuta integrantes da Comissão Oficial em tempo real
    const unsubCommission = subscribeCommissionMembers((cloudCommission) => {
      setAppState((prev) => ({
        ...prev,
        commissionMembers: cloudCommission,
      }));
    });

    return () => {
      unsubState();
      unsubUsers();
      unsubCommission();
    };
  }, [firebaseUser, isGuestMode]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update helper
  const updateStateAndPersist = (updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      const next = updater(prev);
      saveAppState(next);
      return next;
    });
  };

  // Sincronização Automática com Google Drive ao Inicializar (quando usuário já conectado)
  const hasAutoSyncedRef = React.useRef(false);
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        if (user && token && !hasAutoSyncedRef.current) {
          hasAutoSyncedRef.current = true;
          console.log('[Auto-Sync] Google Drive autenticado detectado. Iniciando esteira completa de importação e conciliação...');
          try {
            await handleSyncGoogleDrive();
          } catch (e) {
            console.warn('[Auto-Sync] Sincronização em background finalizada ou aguardando ação:', e);
          }
        }
      },
      () => {}
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Re-run audit
  const handleRunAudit = () => {
    updateStateAndPersist((prev) => {
      const freshAlerts = runAutomatedAudit(
        prev.transactions || [],
        prev.documents || [],
        prev.graduationServices || [],
        prev.alerts || []
      );
      const withLog = addAuditLog(
        { ...prev, alerts: freshAlerts },
        'auditoria',
        'Auditoria geral automática reexecutada no sistema',
        `${freshAlerts.filter((a) => a.status === 'ativo').length} pendências ativas`,
        prev.currentUser?.warName || 'OFICIAL'
      );
      return withLog;
    });
  };

  // Setup Wizard Save
  const handleSaveConfig = (updated: Partial<AppState> | GremioConfig) => {
    updateStateAndPersist((prev) => {
      let nextConfig = prev.config;
      let nextGrad = prev.graduationGeneral;
      let gremioName = prev.config?.gremioName || 'Grêmio';

      if ('gremioName' in updated) {
        nextConfig = { ...(prev.config || {}), ...(updated as GremioConfig) };
        gremioName = nextConfig.gremioName;
      } else if (typeof updated === 'object') {
        const partial = updated as Partial<AppState>;
        if (partial.config) {
          nextConfig = { ...(prev.config || {}), ...partial.config };
          gremioName = nextConfig.gremioName;
        }
        if (partial.graduationGeneral) {
          nextGrad = { ...(prev.graduationGeneral || {}), ...partial.graduationGeneral };
        }
      }

      const updatedState = {
        ...prev,
        config: nextConfig,
        graduationGeneral: nextGrad,
      };
      return addAuditLog(
        updatedState,
        'config',
        'Parâmetros do Grêmio e Unidade Militar atualizados pela tela de Configuração',
        gremioName,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  // Role switch
  const handleChangeRole = (role: UserRole) => {
    setUserRole(role);
    updateStateAndPersist((prev) => ({
      ...prev,
      currentUser: {
        ...(prev.currentUser || {}),
        role,
      } as any,
    }));
  };

  // Navigation from alerts or search
  const handleNavigate = (view: string, targetId?: string) => {
    setActiveTab(view);
    if (view === 'documents' && targetId) {
      setViewingDocumentId(targetId);
    }
  };

  // Treasury Handlers
  const handleAddTransaction = (t: Transaction) => {
    updateStateAndPersist((prev) => {
      const updatedList = [t, ...(prev.transactions || [])];
      const nextState = { ...prev, transactions: updatedList };
      const freshAlerts = runAutomatedAudit(
        updatedList,
        nextState.documents || [],
        nextState.graduationServices || [],
        nextState.alerts || []
      );
      return addAuditLog(
        { ...nextState, alerts: freshAlerts },
        'tesouraria',
        `Novo lançamento registrado: ${t.type.toUpperCase()} [${t.code}] - ${t.description}`,
        t.code,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    updateStateAndPersist((prev) => {
      const updatedList = (prev.transactions || []).map((t) => (t.id === updatedTx.id ? updatedTx : t));
      const nextState = { ...prev, transactions: updatedList };
      const freshAlerts = runAutomatedAudit(
        updatedList,
        nextState.documents || [],
        nextState.graduationServices || [],
        nextState.alerts || []
      );
      return addAuditLog(
        { ...nextState, alerts: freshAlerts },
        'tesouraria',
        `Lançamento atualizado/estornado: [${updatedTx.code}]`,
        updatedTx.code,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  const handleCancelTransaction = (id: string, reason: string) => {
    updateStateAndPersist((prev) => {
      const updatedList = (prev.transactions || []).map((t) =>
        t.id === id ? { ...t, status: 'cancelada' as const, cancellationReason: reason } : t
      );
      const nextState = { ...prev, transactions: updatedList };
      const freshAlerts = runAutomatedAudit(
        updatedList,
        nextState.documents || [],
        nextState.graduationServices || [],
        nextState.alerts || []
      );
      return addAuditLog(
        { ...nextState, alerts: freshAlerts },
        'tesouraria',
        `Lançamento cancelado [${id}]: ${reason}`,
        id,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  // Events Handlers
  const handleAddEvent = (evt: EventRecord) => {
    updateStateAndPersist((prev) => {
      const updatedEvents = [...(prev.events || []), evt];
      return addAuditLog(
        { ...prev, events: updatedEvents },
        'eventos',
        `Novo evento programado: ${evt.name}`,
        evt.name,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  const handleUpdateEvent = (evt: EventRecord) => {
    updateStateAndPersist((prev) => {
      const updatedEvents = (prev.events || []).map((e) => (e.id === evt.id ? evt : e));
      return addAuditLog(
        { ...prev, events: updatedEvents },
        'eventos',
        `Evento atualizado: ${evt.name} (Checklist modificado)`,
        evt.name,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  // Graduation Handler
  const handleUpdateGraduationService = (service: GraduationService) => {
    updateStateAndPersist((prev) => {
      const updatedServices = (prev.graduationServices || []).map((s) => (s.id === service.id ? service : s));
      const totalContracted = updatedServices.reduce((acc, s) => acc + (s.contractedAmount || s.estimatedAmount || 0), 0);
      const totalPaid = updatedServices.reduce(
        (acc, s) =>
          acc +
          ((Array.isArray(s.installments) ? s.installments : []).filter((i) => i.status === 'pago').reduce((si, i) => si + i.amount, 0) ||
            s.paidAmount ||
            0),
        0
      );
      const totalPending = totalContracted - totalPaid;

      const nextState = {
        ...prev,
        graduationServices: updatedServices,
        graduationGeneral: {
          totalBudget: prev.graduationGeneral?.totalBudget ?? 0,
          totalCollected: prev.graduationGeneral?.totalCollected ?? 0,
          availableBalance: prev.graduationGeneral?.availableBalance ?? 0,
          ...(prev.graduationGeneral || {}),
          totalContracted,
          totalPaid,
          totalPending,
        },
      };

      const freshAlerts = runAutomatedAudit(
        nextState.transactions || [],
        nextState.documents || [],
        updatedServices,
        nextState.alerts || []
      );

      return addAuditLog(
        { ...nextState, alerts: freshAlerts },
        'formatura',
        `Categoria de formatura atualizada: ${service.category} - ${service.name}`,
        service.category,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  // History Handler
  const handleAddHistoryRecord = (record: HistoryRecord) => {
    updateStateAndPersist((prev) => {
      const updatedHistory = [record, ...(prev.history || [])];
      return addAuditLog(
        { ...prev, history: updatedHistory },
        'historia',
        `Registro histórico adicionado ao livro: ${record.title}`,
        record.title,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  // Future Plans Handler
  const handleAddPlan = (plan: FuturePlan) => {
    updateStateAndPersist((prev) => {
      const updatedPlans = [...(prev.plans || []), plan];
      return addAuditLog(
        { ...prev, plans: updatedPlans },
        'planejamento',
        `Nova proposta de projeto: ${plan.title}`,
        plan.title,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  const handleUpdatePlan = (plan: FuturePlan) => {
    updateStateAndPersist((prev) => {
      const updatedPlans = (prev.plans || []).map((p) => (p.id === plan.id ? plan : p));
      return addAuditLog(
        { ...prev, plans: updatedPlans },
        'planejamento',
        `Projeto atualizado: ${plan.title} (${plan.progressPercentage || 0}%)`,
        plan.title,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  // Documents Handlers
  const handleAddDocument = (doc: DocumentRecord) => {
    updateStateAndPersist((prev) => {
      const updatedDocs = [doc, ...(prev.documents || [])];
      const nextState = { ...prev, documents: updatedDocs };
      const freshAlerts = runAutomatedAudit(
        nextState.transactions || [],
        updatedDocs,
        nextState.graduationServices || [],
        nextState.alerts || []
      );
      return addAuditLog(
        { ...nextState, alerts: freshAlerts },
        'documentos',
        `Novo documento/comprovante anexado: ${doc.name} (${doc.type})`,
        doc.name,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  const handleLinkDocumentToTransaction = (docId: string, txId: string) => {
    updateStateAndPersist((prev) => {
      const updatedDocs: DocumentRecord[] = (prev.documents || []).map((d) =>
        d.id === docId ? { ...d, relatedTransactionId: txId, auditStatus: 'validado' } : d
      );
      const updatedTx = (prev.transactions || []).map((t) =>
        t.id === txId ? { ...t, receiptDocumentId: docId } : t
      );
      const nextState = { ...prev, documents: updatedDocs, transactions: updatedTx };
      const freshAlerts = runAutomatedAudit(
        updatedTx,
        updatedDocs,
        nextState.graduationServices || [],
        nextState.alerts || []
      );
      return addAuditLog(
        { ...nextState, alerts: freshAlerts },
        'documentos',
        `Documento [${docId}] vinculado formalmente à transação [${txId}]`,
        txId,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  // Alerts Handler
  const handleUpdateAlert = (alert: AuditAlert) => {
    updateStateAndPersist((prev) => {
      const updatedAlerts = (prev.alerts || []).map((a) => (a.id === alert.id ? alert : a));
      return addAuditLog(
        { ...prev, alerts: updatedAlerts },
        'auditoria',
        `Alerta de auditoria [${alert.id}] marcado como: ${alert.status}`,
        alert.title,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  // Real Google Drive & Sheets Synchronization Pipeline
  const handleSyncGoogleDrive = async () => {
    try {
      const result = await onGoogleDriveConnected(
        appStateRef.current,
        (updatedState) => {
          updateStateAndPersist(() => updatedState);
        }
      );

      if (result.success && result.syncReport) {
        setSyncSummaryReport(result.syncReport);
      }
    } catch (err: any) {
      console.error('Erro na esteira de sincronização com Google Drive:', err);
      throw err;
    }
  };

  // Handlers para confirmação de classificação e vínculos de comprovantes
  const handleConfirmDocumentClassification = (docId: string, categoryId: string, categoryName: string) => {
    updateStateAndPersist((prev) => confirmDocumentClassification(prev, docId, categoryId || categoryName, true));
  };

  const handleConfirmDocumentTransactionLink = (docId: string, transactionId: string) => {
    updateStateAndPersist((prev) => confirmDocumentTransactionLink(prev, docId, transactionId));
  };

  const handleRejectDocumentTransactionLink = (docId: string) => {
    updateStateAndPersist((prev) => rejectDocumentTransactionLink(prev, docId));
  };

  const handleReprocessDocumentOcr = async (docId: string) => {
    const doc = (appState.documents || []).find((d) => d.id === docId);
    if (!doc) return;

    // Use parseVoucherMetadata with existing extracted text or filename
    const textToAnalyze = `${doc.name} ${doc.fileContentOrOcrText || doc.extractedText || ''}`;
    const metadata = parseVoucherMetadata(textToAnalyze);

    const hasSignificantText = Boolean(doc.fileContentOrOcrText && doc.fileContentOrOcrText.trim().length > 15);

    const updatedDoc: DocumentRecord = {
      ...doc,
      detectedSupplier: metadata.detectedSupplier || doc.detectedSupplier,
      detectedPersonOrCompany: metadata.detectedReceiver || metadata.detectedSupplier || doc.detectedPersonOrCompany,
      detectedAmount: metadata.detectedAmount !== undefined ? metadata.detectedAmount : doc.detectedAmount,
      detectedDate: metadata.detectedDate || doc.detectedDate,
      detectedReceiver: metadata.detectedReceiver || doc.detectedReceiver,
      detectedPayer: metadata.detectedPayer || doc.detectedPayer,
      detectedCpfCnpj: metadata.detectedCpfCnpj || doc.detectedCpfCnpj,
      detectedBank: metadata.detectedBank || doc.detectedBank,
      detectedControlNumber: metadata.detectedControlNumber || doc.detectedControlNumber,
      detectedTransactionType: metadata.detectedTransactionType || doc.detectedTransactionType,
      ocrStatus: hasSignificantText ? 'success' : 'needs_review',
    };

    updateStateAndPersist((prev) => ({
      ...prev,
      documents: (prev.documents || []).map((d) => (d.id === docId ? updatedDoc : d)),
    }));
  };

  const handleUnlinkDocument = (docId: string) => {
    updateStateAndPersist((prev) => {
      const targetDoc = (prev.documents || []).find((d) => d.id === docId);
      const linkedTxId = targetDoc?.relatedTransactionId;

      const updatedDocs: DocumentRecord[] = (prev.documents || []).map((d) =>
        d.id === docId
          ? {
              ...d,
              relatedTransactionId: undefined,
              transactionLinkStatus: undefined,
              transactionLinkConfidence: undefined,
              auditStatus: 'sem_vinculo',
            }
          : d
      );

      const updatedTx = (prev.transactions || []).map((t) => {
        if (t.receiptDocumentId === docId || (linkedTxId && t.id === linkedTxId)) {
          const { receiptDocumentId, receiptDocumentName, ...rest } = t;
          return {
            ...rest,
            receiptDocumentId: undefined,
            receiptDocumentName: undefined,
          };
        }
        return t;
      });

      // Persist changes to Firestore
      const unlinkedDoc = updatedDocs.find((d) => d.id === docId);
      if (unlinkedDoc) {
        saveDocumentToFirestore(unlinkedDoc).catch((e) => console.warn(e));
      }

      updatedTx.forEach((tx) => {
        if (tx.id === linkedTxId || (prev.transactions || []).find((pt) => pt.id === tx.id)?.receiptDocumentId === docId) {
          saveTransactionToFirestore(tx).catch((e) => console.warn(e));
        }
      });

      const freshAlerts = runAutomatedAudit(
        updatedTx,
        updatedDocs,
        prev.graduationServices || [],
        prev.alerts || []
      );

      const nextState = {
        ...prev,
        documents: updatedDocs,
        transactions: updatedTx,
        alerts: freshAlerts,
      };

      return addAuditLog(
        nextState,
        'documentos',
        `Documento [${targetDoc?.name || docId}] desvinculado formalmente do lançamento financeiro`,
        targetDoc?.name || docId,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocumentFromFirestore(docId);
    } catch (err) {
      console.warn(`[Firestore] Aviso ao remover documento ${docId}:`, err);
    }

    updateStateAndPersist((prev) => {
      const targetDoc = (prev.documents || []).find((d) => d.id === docId);
      const updatedDocs = (prev.documents || []).filter((d) => d.id !== docId);

      // Clear reference from any transactions
      const updatedTx = (prev.transactions || []).map((t) => {
        if (t.receiptDocumentId === docId) {
          const { receiptDocumentId, receiptDocumentName, ...rest } = t;
          return {
            ...rest,
            receiptDocumentId: undefined,
            receiptDocumentName: undefined,
          };
        }
        return t;
      });

      // Persist modified transactions to Firestore
      updatedTx.forEach((tx) => {
        const prevTx = (prev.transactions || []).find((pt) => pt.id === tx.id);
        if (prevTx?.receiptDocumentId === docId) {
          saveTransactionToFirestore(tx).catch((e) => console.warn(e));
        }
      });

      // Re-run automated audit engine
      const freshAlerts = runAutomatedAudit(
        updatedTx,
        updatedDocs,
        prev.graduationServices || [],
        prev.alerts || []
      );

      const nextState = {
        ...prev,
        documents: updatedDocs,
        transactions: updatedTx,
        alerts: freshAlerts,
      };

      return addAuditLog(
        nextState,
        'documentos',
        `Documento [${targetDoc?.name || docId}] excluído formalmente e desvinculado dos lançamentos contábeis`,
        targetDoc?.name || docId,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });

    if (viewingDocumentId === docId) {
      setViewingDocumentId(null);
    }
  };

  const handleReplaceDocumentAttachment = (
    docId: string,
    newFileData: { fileData?: string; fileUrl?: string; name?: string; fileType?: string; sizeBytes?: number }
  ) => {
    updateStateAndPersist((prev) => {
      const targetDoc = (prev.documents || []).find((d) => d.id === docId);
      if (!targetDoc) return prev;

      const updatedDoc: DocumentRecord = {
        ...targetDoc,
        name: newFileData.name || targetDoc.name,
        fileUrl: newFileData.fileUrl || targetDoc.fileUrl,
        fileData: newFileData.fileData || targetDoc.fileData,
        fileType: newFileData.fileType || targetDoc.fileType,
        sizeBytes: newFileData.sizeBytes || targetDoc.sizeBytes,
        uploadedAt: new Date().toISOString(),
      };

      const updatedDocs = (prev.documents || []).map((d) => (d.id === docId ? updatedDoc : d));

      saveDocumentToFirestore(updatedDoc).catch((e) => console.warn(e));

      const freshAlerts = runAutomatedAudit(
        prev.transactions || [],
        updatedDocs,
        prev.graduationServices || [],
        prev.alerts || []
      );

      return addAuditLog(
        { ...prev, documents: updatedDocs, alerts: freshAlerts },
        'documentos',
        `Anexo do comprovante [${updatedDoc.name}] substituído com sucesso`,
        updatedDoc.name,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  const handleSyncGmail = () => {
    updateStateAndPersist((prev) => {
      return addAuditLog(
        prev,
        'integracao',
        'Varredura de anexos fiscais no Gmail oficial concluída',
        prev.config?.emailAccount,
        prev.currentUser?.warName || 'OFICIAL'
      );
    });
  };

  const handleToggleDemoMode = (toDemo: boolean) => {
    const updated = resetAppState(toDemo);
    setAppState(updated);
  };

  const activeAlertsCount = (appState?.alerts || []).filter((a) => a && a.status === 'ativo').length;
  const criticalRedAlerts = (appState?.alerts || []).filter((a) => a && a.status === 'ativo' && a.severity === 'vermelho').length;
  const unlinkedDocsCount = (appState?.documents || []).filter((d) => d && d.auditStatus === 'sem_vinculo').length;

  // Loading institutional splash
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-sm bg-[#4B5320] flex items-center justify-center border-2 border-[#D4AF37] mb-4 shadow-xl">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#D4AF37] animate-spin" />
        </div>
        <h1 className="text-lg font-bold text-white font-institutional tracking-widest uppercase">
          Portal do Grêmio do NPOR
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Verificando credenciais militares e sincronizando dados...
        </p>
      </div>
    );
  }

  // Se não autenticado nem em modo visitante, exige login com Google
  if (!firebaseUser && !isGuestMode) {
    return (
      <LoginScreen
        onLoginSuccess={() => {}}
        onGuestAccess={handleGuestAccess}
      />
    );
  }

  // Verificação do status de aprovação militar
  const isCurrentUserApproved =
    isGuestMode ||
    appState.currentUser?.status === 'approved' ||
    (firebaseUser?.email || '').toLowerCase().trim() === 'felipegponce@gmail.com';

  if (!isCurrentUserApproved && firebaseUser) {
    return (
      <PendingApprovalScreen
        firebaseUser={firebaseUser}
        userProfile={appState.currentUser}
        onRefreshProfile={async () => {
          try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const snap = await getDoc(userDocRef);
            if (snap.exists()) {
              const data = snap.data();
              const updatedStatus = (data.status as UserStatus) || 'approved';
              const updatedRole = (data.role as UserRole) || 'visualizador';
              setAppState((prev) => ({
                ...prev,
                currentUser: {
                  ...prev.currentUser,
                  status: updatedStatus,
                  role: updatedRole,
                  warName: data.warName || prev.currentUser.warName,
                },
              }));
              setUserRole(updatedRole);
            }
          } catch (err) {
            console.warn('Erro ao atualizar status:', err);
          }
        }}
        onSignOut={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F0] text-slate-800 flex flex-col relative selection:bg-[#D4AF37] selection:text-[#1A2421]">
      {/* Background Watermark Institucional */}
      {(appState?.config?.theme?.showBackgroundWatermark ?? true) && (
        <div
          className="fixed inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden z-0"
          style={{ opacity: (appState?.config?.theme?.watermarkOpacity ?? 4) / 100 }}
          aria-hidden="true"
        >
          <MilitaryInsignia
            className="w-[520px] h-[520px] max-w-[70vw] max-h-[70vh] filter grayscale contrast-125"
            customSrc={appState?.config?.logoUrl || appState?.config?.theme?.customLogoUrl || undefined}
          />
        </div>
      )}

      {/* Top Application Header */}
      <Header
        appState={appState}
        config={appState?.config}
        currentUser={appState?.currentUser}
        users={appState?.users}
        alerts={appState?.alerts}
        userRole={userRole}
        activeAlertsCount={activeAlertsCount}
        criticalRedAlerts={criticalRedAlerts}
        onChangeUserRole={handleChangeRole}
        onSelectUser={(u) => {
          setAppState((prev) => ({ ...prev, currentUser: u }));
          setUserRole(u.role);
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
        onToggleDemoMode={handleToggleDemoMode}
        activeView={activeTab}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={activeTab}
          activeTab={activeTab}
          onNavigate={handleNavigate}
          setActiveTab={(tab) => {
            handleNavigate(tab);
            setIsMobileSidebarOpen(false);
          }}
          userRole={userRole}
          pendingAlertsCount={activeAlertsCount}
          alertsCount={activeAlertsCount}
          unlinkedDocsCount={unlinkedDocsCount}
          isOpenMobile={isMobileSidebarOpen}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* View Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              appState={appState}
              userRole={userRole}
              onNavigate={handleNavigate}
              onSyncGoogleDrive={handleSyncGoogleDrive}
            />
          )}

          {activeTab === 'treasury' && (
            <TreasuryView
              appState={appState}
              userRole={userRole}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onCancelTransaction={handleCancelTransaction}
              onOpenDocument={(docId) => setViewingDocumentId(docId)}
            />
          )}

          {activeTab === 'categories' && (
            selectedCategory ? (
              <DynamicCategoryView
                category={selectedCategory}
                appState={appState}
                userRole={userRole}
                onOpenDocument={(docId) => setViewingDocumentId(docId)}
                onNavigate={handleNavigate}
                onBackToCategories={() => setSelectedCategory(null)}
                onUpdateCategory={(updated) => {
                  updateStateAndPersist((prev) => ({
                    ...prev,
                    categories: (prev.categories || []).map((c) => (c.id === updated.id ? updated : c)),
                  }));
                  setSelectedCategory(updated);
                }}
              />
            ) : (
              <CategoriesHubView
                appState={appState}
                userRole={userRole}
                onSelectCategory={(cat) => setSelectedCategory(cat)}
                onUpdateAppState={updateStateAndPersist}
              />
            )
          )}

          {activeTab === 'events' && (
            <EventsView
              appState={appState}
              userRole={userRole}
              onAddEvent={handleAddEvent}
              onUpdateEvent={handleUpdateEvent}
              onNavigateToDocuments={() => setActiveTab('documents')}
            />
          )}

          {activeTab === 'graduation' && (
            <GraduationView
              appState={appState}
              userRole={userRole}
              onUpdateService={handleUpdateGraduationService}
              onOpenDocument={(docId) => setViewingDocumentId(docId)}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              appState={appState}
              userRole={userRole}
              onAddHistoryRecord={handleAddHistoryRecord}
            />
          )}

          {(activeTab === 'future_plans' || activeTab === 'plans') && (
            <FuturePlansView
              appState={appState}
              userRole={userRole}
              onAddPlan={handleAddPlan}
              onUpdatePlan={handleUpdatePlan}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              appState={appState}
              userRole={userRole}
              onOpenDocument={(docId) => setViewingDocumentId(docId)}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              onReprocessDocumentOcr={handleReprocessDocumentOcr}
              onUnlinkDocument={handleUnlinkDocument}
            />
          )}

          {(activeTab === 'audit_alerts' || activeTab === 'alerts') && (
            <AuditAlertsView
              appState={appState}
              userRole={userRole}
              onUpdateAlert={handleUpdateAlert}
              onNavigate={handleNavigate}
              onRunAudit={handleRunAudit}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView appState={appState} userRole={userRole} />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsView
              appState={appState}
              userRole={userRole}
              onSyncGoogleDrive={handleSyncGoogleDrive}
              onSyncGmail={handleSyncGmail}
            />
          )}

          {(activeTab === 'audit_logs' || activeTab === 'audit') && (
            <AuditLogsView appState={appState} />
          )}

          {activeTab === 'users' && (
            <UsersView
              appState={appState}
              userRole={userRole}
              onChangeUserRole={handleChangeRole}
              onUpdateUserRoleInState={(targetUserId, newRole) => {
                setAppState((prev) => ({
                  ...prev,
                  users: (prev.users || []).map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u)),
                }));
              }}
            />
          )}

          {activeTab === 'customization' && (
            <CustomizationView
              appState={appState}
              userRole={userRole}
              onUpdateAppState={updateStateAndPersist}
            />
          )}
        </main>
      </div>

      {/* Geometric Balance Institutional Footer */}
      <footer className="h-8 bg-slate-100 border-t border-slate-200 px-6 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest no-print">
        <span>© {appState?.config?.year || 2026} Portal do Grêmio {appState?.config?.gremioName || 'NPOR'} — Sistema Integrado de Fiscalização</span>
        <div className="flex items-center space-x-4">
          <span className="hidden sm:inline">
            {appState?.lastSyncedAt
              ? `Google Drive: Sincronizado (${new Date(appState.lastSyncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`
              : 'Google Drive: Não sincronizado'}
          </span>
          <span className="text-[#4B5320] flex items-center gap-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4B5320] inline-block animate-pulse" />
            Servidor Online NPOR
          </span>
        </div>
      </footer>

      {/* Global Modals */}
      <SetupWizardModal
        isOpen={isSetupWizardOpen}
        onClose={() => setIsSetupWizardOpen(false)}
        appState={appState}
        onSaveConfig={handleSaveConfig}
        onResetData={handleToggleDemoMode}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        appState={appState}
        onNavigate={handleNavigate}
      />

      {viewingDocumentId && (
        <DocumentViewerModal
          document={(appState.documents || []).find((d) => d.id === viewingDocumentId) || null}
          isOpen={Boolean(viewingDocumentId)}
          onClose={() => setViewingDocumentId(null)}
          transactions={appState.transactions || []}
          events={appState.events || []}
          graduationServices={appState.graduationServices || []}
          userRole={userRole}
          categories={appState.categories || []}
          onUpdateDocument={(updated) => {
            updateStateAndPersist((prev) => ({
              ...prev,
              documents: (prev.documents || []).map((d) => (d.id === updated.id ? updated : d)),
            }));
          }}
          onLinkToTransaction={handleLinkDocumentToTransaction}
          onConfirmClassification={handleConfirmDocumentClassification}
          onConfirmTransactionLink={handleConfirmDocumentTransactionLink}
          onRejectTransactionLink={handleRejectDocumentTransactionLink}
          onUnlinkTransaction={handleUnlinkDocument}
          onDeleteDocument={handleDeleteDocument}
          onReplaceAttachment={handleReplaceDocumentAttachment}
          onReprocessOcr={handleReprocessDocumentOcr}
        />
      )}

      {syncSummaryReport && (
        <SyncSummaryModal
          report={syncSummaryReport}
          isOpen={Boolean(syncSummaryReport)}
          onClose={() => setSyncSummaryReport(null)}
          onNavigateToCategories={() => {
            setSyncSummaryReport(null);
            setActiveTab('categories');
          }}
          onNavigateToDocuments={() => {
            setSyncSummaryReport(null);
            setActiveTab('documents');
          }}
        />
      )}
    </div>
  );
}
