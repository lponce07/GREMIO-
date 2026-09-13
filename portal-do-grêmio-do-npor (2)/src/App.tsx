import React, { useState, useEffect } from 'react';
import {
  AppState,
  loadAppState,
  saveAppState,
  resetAppState,
  fetchServerAppState,
  runAutomatedAudit,
  addAuditLog,
  formatCurrencyPtBr,
} from './services/dataService';
import { syncRealGoogleDrive } from './services/googleDriveService';
import {
  Transaction,
  EventRecord,
  GraduationService,
  HistoryRecord,
  FuturePlan,
  DocumentRecord,
  AuditAlert,
  UserRole,
  GremioConfig,
} from './types';

// Shell Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

// Modals
import { SetupWizardModal } from './components/SetupWizardModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';

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

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [userRole, setUserRole] = useState<UserRole>(() => appState?.currentUser?.role || 'admin');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);

  // Carregar dados persistentes do servidor na inicialização
  useEffect(() => {
    console.log('[DEBUG URL]', {
      origin: window.location.origin,
      hostname: window.location.hostname,
      href: window.location.href,
    });

    fetchServerAppState().then((serverState) => {
      if (serverState) {
        setAppState(serverState);
        if (serverState.currentUser?.role) {
          setUserRole(serverState.currentUser.role);
        }
      }
    });
  }, []);

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
        'Parâmetros do Grêmio e Unidade Militar atualizados via Assistente de Configuração',
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

  // Real Google Drive & Sheets Synchronization
  const handleSyncGoogleDrive = async () => {
    try {
      const result = await syncRealGoogleDrive(appState?.transactions || [], appState?.documents || []);
      if (result.success) {
        updateStateAndPersist((prev) => {
          const freshAlerts = runAutomatedAudit(
            result.newTransactions,
            result.newDocuments,
            prev.graduationServices || [],
            prev.alerts || []
          );

          const updatedState: AppState = {
            ...prev,
            transactions: result.newTransactions,
            documents: result.newDocuments,
            driveFoldersStatus: result.folderStatuses,
            monthlyFees: result.newMonthlyFees.length > 0 ? result.newMonthlyFees : prev.monthlyFees,
            raffles: result.newRaffles.length > 0 ? result.newRaffles : prev.raffles,
            shirtOrders: result.newShirtOrders.length > 0 ? result.newShirtOrders : prev.shirtOrders,
            jacketOrders: result.newJacketOrders.length > 0 ? result.newJacketOrders : prev.jacketOrders,
            uniformOrders: result.newUniformOrders.length > 0 ? result.newUniformOrders : prev.uniformOrders,
            contracts: result.newContracts.length > 0 ? result.newContracts : prev.contracts,
            additionalCosts: result.newAdditionalCosts.length > 0 ? result.newAdditionalCosts : prev.additionalCosts,
            alerts: freshAlerts,
            lastSyncedAt: new Date().toISOString(),
          };

          return addAuditLog(
            updatedState,
            'integracao',
            `Sincronização real com Google Drive concluída. ${result.totalFilesFound} arquivos verificados, ${result.totalRecordsExtracted} lançamentos financeiros extraídos.`,
            prev.config?.googleDriveFolderId || '1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU',
            prev.currentUser?.warName || 'OFICIAL'
          );
        });
      }
    } catch (err: any) {
      console.error('Erro na sincronização real com Google Drive:', err);
      throw err;
    }
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

  return (
    <div className="min-h-screen bg-[#F0F2F0] text-slate-800 flex flex-col selection:bg-[#D4AF37] selection:text-[#1A2421]">
      {/* Mensagem visível temporária de depuração de URL */}
      <div className="bg-slate-900 text-slate-100 text-xs px-4 py-2 flex flex-wrap items-center justify-between border-b border-slate-700 font-mono gap-2 z-50">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span><strong className="text-[#D4AF37]">window.location.origin:</strong> {window.location.origin}</span>
          <span><strong className="text-[#D4AF37]">hostname:</strong> {window.location.hostname}</span>
          <span className="break-all"><strong className="text-[#D4AF37]">href:</strong> {window.location.href}</span>
        </div>
      </div>

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
          onUpdateDocument={(updated) => {
            updateStateAndPersist((prev) => ({
              ...prev,
              documents: (prev.documents || []).map((d) => (d.id === updated.id ? updated : d)),
            }));
          }}
          onLinkToTransaction={handleLinkDocumentToTransaction}
        />
      )}
    </div>
  );
}
