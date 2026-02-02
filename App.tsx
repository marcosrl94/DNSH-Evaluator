
import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { DEMO_OPERATIONS, DEMO_CLIENTS } from './constants';
import { Client } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { ActiveContextProvider } from './context/ActiveContext';
import { OnlineUsersProvider } from './context/OnlineUsersContext';
import { hasPermission } from './services/auth';
import { AssetDnshEvaluation, Operation, DnshObjective } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { logger } from './utils/logger';
import { getAllOperations, dataStore, updateAssetEvaluation, updateOperation as updateOperationInStore } from './services/dataManagement';
import PalantirLoader from './components/PalantirLoader';
import { AppSidebar } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';

// Lazy load heavy components for better performance
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const UnifiedDashboardPage = lazy(() => import('./pages/UnifiedDashboard'));
const OperationDetailPage = lazy(() => import('./pages/OperationDetail'));
const DnshEvaluationEnhancedPage = lazy(() => import('./pages/DnshEvaluationEnhanced'));
const OperationsListPage = lazy(() => import('./pages/OperationsList'));
const GlobalMapViewerPage = lazy(() => import('./pages/GlobalMapViewer'));
const CatalogsPage = lazy(() => import('./pages/Catalogs'));
const ReportsPage = lazy(() => import('./pages/Reports'));
const LoginPage = lazy(() => import('./pages/Login'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetail'));
const DealManagementPage = lazy(() => import('./pages/DealManagement'));
const HistoricalOperationsPage = lazy(() => import('./pages/HistoricalOperations'));
// ClientDnshEvaluationPage removed - unified in DnshEvaluationEnhancedPage
const AIAssistant = lazy(() => import('./components/AIAssistant'));
const CollaborationNotification = lazy(() => import('./components/CollaborationNotification'));

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando...</p>
    </div>
  </div>
);

type View = 'dashboard' | 'operation-list' | 'operation-detail' | 'client-detail' | 'dnsh-evaluation' | 'map-viewer' | 'catalogs' | 'reports' | 'deal-management' | 'historical-operations';

// Separate component for the authenticated layout to use the hook
const AuthenticatedApp: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [clients, setClients] = useState<Client[]>(DEMO_CLIENTS);
  const [operations, setOperations] = useState<Operation[]>([]);

  // Load operations on mount
  useEffect(() => {
    const loadOperations = async () => {
      try {
        const ops = await getAllOperations();
        setOperations(ops);
      } catch (error) {
        logger.error('Error loading operations:', error);
        // Fallback to demo operations
        setOperations(DEMO_OPERATIONS);
      }
    };
    loadOperations();
  }, []);

  // Subscribe to data store changes
  useEffect(() => {
    const unsubscribe = dataStore.subscribe(async () => {
      try {
        const ops = await getAllOperations();
        setOperations(ops);
      } catch (error) {
        logger.error('Error loading operations:', error);
      }
    });
    return unsubscribe;
  }, []);

  // Update user presence when navigating
  useEffect(() => {
    const { socketService } = require('./src/services/socketService');
    if (socketService.isConnected()) {
      socketService.updatePresence(selectedOperationId || undefined, selectedAssetId || undefined);
      
      // Join/leave operation room
      if (selectedOperationId) {
        socketService.joinOperation(selectedOperationId);
      }
      if (selectedAssetId) {
        socketService.joinAsset(selectedAssetId);
      }
      
      return () => {
        if (selectedOperationId) {
          socketService.leaveOperation(selectedOperationId);
        }
        if (selectedAssetId) {
          socketService.leaveAsset(selectedAssetId);
        }
      };
    }
  }, [selectedOperationId, selectedAssetId]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <PalantirLoader size="lg" text="INITIALIZING" />
      </div>
    );
  }

  // Security: Always show login page if not authenticated
  if (!user) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-black">
          <PalantirLoader size="lg" text="LOADING" />
        </div>
      }>
        <LoginPage />
      </Suspense>
    );
  }

  if (!user.permissions || !hasPermission(user, 'canViewOperations')) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">Your account does not have the required permissions.</p>
        </div>
      </div>
    );
  }

  // Memoize selected entities to avoid recalculation
  const selectedClient = useMemo(
    () => clients.find(c => c.id === selectedClientId),
    [clients, selectedClientId]
  );
  
  const selectedOperation = useMemo(
    () => operations.find(op => op.id === selectedOperationId),
    [operations, selectedOperationId]
  );
  
  const selectedAsset = useMemo(
    () => selectedOperation?.assets.find(a => a.id === selectedAssetId),
    [selectedOperation, selectedAssetId]
  );

  // Memoize client operations
  const clientOperations = useMemo(
    () => selectedClient ? operations.filter(op => op.clientId === selectedClient.id) : [],
    [operations, selectedClient]
  );

  const handleUpdateOperation = useCallback((updatedOperation: Operation) => {
    // Update both local state and data store for consistency
    try {
      updateOperationInStore(updatedOperation);
      // State will be updated automatically via subscription
    } catch (error) {
      logger.error('Error updating operation:', error);
    }
  }, []);

  const navigateToOperation = useCallback((id: string) => {
    const operation = operations.find(op => op.id === id);
    if (operation) {
      setSelectedClientId(operation.clientId);
      setSelectedOperationId(id);
      setCurrentView('operation-detail');
    }
  }, [operations]);

  const navigateToClient = useCallback((clientId: string) => {
    if (clientId) {
      setSelectedClientId(clientId);
      setSelectedOperationId(null);
      setCurrentView('client-detail');
    } else {
      setSelectedClientId(null);
      setSelectedOperationId(null);
      setCurrentView('operation-list');
    }
  }, []);

  const navigateToDnshEvaluation = useCallback((id: string) => {
    setSelectedOperationId(id);
    setCurrentView('dnsh-evaluation');
  }, []);

  const navigateToAssetEvaluation = useCallback((assetId: string) => {
    // Navigate to unified DNSH evaluation with asset selected
    const asset = operations.find(op => op.assets.some(a => a.id === assetId))?.assets.find(a => a.id === assetId);
    if (asset) {
      const operation = operations.find(op => op.assets.some(a => a.id === assetId));
      if (operation) {
        setSelectedOperationId(operation.id);
        setSelectedAssetId(assetId);
        setCurrentView('dnsh-evaluation');
      }
    }
  }, [operations]);

  const handleSaveAssetEvaluation = useCallback((evaluation: AssetDnshEvaluation) => {
    // Update both local state and data store for consistency
    try {
      // Update in data store (this will notify all subscribers)
      if (updateAssetEvaluation(evaluation.assetId, evaluation)) {
        // Also update local state for immediate UI update
        if (selectedOperation && selectedAsset) {
          const updatedOperation = {
            ...selectedOperation,
            assets: selectedOperation.assets.map(a =>
              a.id === selectedAsset.id
                ? { ...a, dnshEvaluation: evaluation }
                : a
            )
          };
          updateOperationInStore(updatedOperation);
          // State will be updated automatically via subscription
        }
      }
    } catch (error) {
      logger.error('Error saving asset evaluation:', error);
    }
  }, [selectedOperation, selectedAsset]);

  // Memoize navigation handlers
  const handleNavigateToDnshEvaluationWithAsset = useCallback((operationId: string, assetId?: string | null) => {
    setSelectedOperationId(operationId);
    setSelectedAssetId(assetId || null);
    setCurrentView('dnsh-evaluation');
  }, []);

  const handleNavigateToClientDnshEvaluation = useCallback((clientId: string) => {
    // Unificar: navegar a la evaluación detallada de la primera operación del cliente
    const clientOps = operations.filter(op => op.clientId === clientId);
    if (clientOps.length > 0) {
      // Navegar a la primera operación del cliente y luego a la evaluación detallada
      setSelectedClientId(clientId);
      setSelectedOperationId(clientOps[0].id);
      setSelectedAssetId(null); // Empezar en vista Portfolio
      setCurrentView('dnsh-evaluation');
    } else {
      // Si no hay operaciones, mantener en client-detail
      setSelectedClientId(clientId);
      setCurrentView('client-detail');
    }
  }, [operations]);

  const handleNavigateToDnshObjective = useCallback((objective: DnshObjective) => {
    setCurrentView('dnsh-evaluation');
    // Store the objective to navigate to in state (we'll handle this in DnshEvaluationPage)
  }, []);

  const handleBackToOperationDetail = useCallback(() => {
    setSelectedAssetId(null);
    setCurrentView('operation-detail');
  }, []);

  const handleBackToClientDetail = useCallback(() => {
    setCurrentView('client-detail');
  }, []);

  const handleBackToOperationList = useCallback(() => {
    setCurrentView('operation-list');
  }, []);

  const handleNavigateToDnshEvaluationFromMap = useCallback((operationId: string, objective?: DnshObjective) => {
    const operation = operations.find(op => op.id === operationId);
    if (operation) {
      setSelectedOperationId(operationId);
      setCurrentView('dnsh-evaluation');
      // TODO: Navigate to specific objective if provided
    }
  }, [operations]);

  const renderContent = useMemo(() => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UnifiedDashboardPage 
              onNavigateToOperation={navigateToOperation}
              onNavigateToClient={navigateToClient}
              onNavigateToAssetEvaluation={navigateToAssetEvaluation}
              onNavigateToDnshEvaluation={handleNavigateToDnshEvaluationWithAsset}
            />
          </Suspense>
        );
      case 'operation-list':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <OperationsListPage 
              onNavigateToOperation={navigateToOperation} 
              selectedClientId={selectedClientId} 
              onNavigateToClient={navigateToClient} 
            />
          </Suspense>
        );
      case 'client-detail':
        return selectedClient ? (
          <Suspense fallback={<LoadingFallback />}>
            <ClientDetailPage 
              client={selectedClient}
              operations={clientOperations}
              onNavigateToOperation={navigateToOperation}
              onNavigateToDnshEvaluation={handleNavigateToClientDnshEvaluation}
              onBack={() => navigateToClient('')}
            />
          </Suspense>
        ) : <div className="p-8">Cliente no encontrado</div>;
      // client-dnsh-evaluation removed - unified in dnsh-evaluation
      // All DNSH evaluations now go through DnshEvaluationEnhancedPage
      case 'map-viewer':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <GlobalMapViewerPage 
              onNavigateToOperation={navigateToOperation}
              onNavigateToAssetEvaluation={navigateToAssetEvaluation}
              onNavigateToDnshEvaluation={handleNavigateToDnshEvaluationFromMap}
            />
          </Suspense>
        );
      case 'catalogs':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CatalogsPage />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ReportsPage />
          </Suspense>
        );
      case 'deal-management':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DealManagementPage />
          </Suspense>
        );
      case 'historical-operations':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HistoricalOperationsPage 
              onNavigateToOperation={navigateToOperation}
            />
          </Suspense>
        );
      case 'operation-detail':
        return selectedOperation ? (
          <Suspense fallback={<LoadingFallback />}>
            <OperationDetailPage 
              operation={selectedOperation} 
              onNavigateToDnshEvaluation={() => setCurrentView('dnsh-evaluation')}
              onNavigateToDnshObjective={handleNavigateToDnshObjective}
              onNavigateToAssetEvaluation={navigateToAssetEvaluation}
              onBack={handleBackToOperationList}
              onUpdateOperation={handleUpdateOperation}
            />
          </Suspense>
        ) : <div>Operation not found</div>;
      case 'dnsh-evaluation':
        return selectedOperation ? (
          <Suspense fallback={<LoadingFallback />}>
            <DnshEvaluationEnhancedPage 
              operation={selectedOperation} 
              onBack={handleBackToOperationDetail}
              onUpdateOperation={handleUpdateOperation}
              initialAssetId={selectedAssetId}
            />
          </Suspense>
        ) : <div>Operation not found</div>;
      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage onNavigateToOperation={navigateToOperation} />
          </Suspense>
        );
    }
  }, [
    currentView,
    selectedClient,
    selectedOperation,
    selectedAssetId,
    selectedClientId,
    clientOperations,
    navigateToOperation,
    navigateToClient,
    navigateToAssetEvaluation,
    handleUpdateOperation,
    handleNavigateToDnshEvaluationWithAsset,
    handleNavigateToClientDnshEvaluation,
    handleNavigateToDnshObjective,
    handleBackToOperationDetail,
    handleBackToClientDetail,
    handleBackToOperationList,
    handleNavigateToDnshEvaluationFromMap,
  ]);

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors ${
      theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'
    }`}>
      <AppSidebar
        isOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentView={currentView}
        setCurrentView={setCurrentView}
        setSelectedOperationId={setSelectedOperationId}
        setSelectedClientId={setSelectedClientId}
        setSelectedAssetId={setSelectedAssetId}
        theme={theme}
        user={user}
        logout={logout}
      />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-black' : 'bg-white'
      }`}>
        <AppHeader
          theme={theme}
          toggleTheme={toggleTheme}
          currentView={currentView}
          selectedClient={selectedClient}
          selectedOperation={selectedOperation}
          selectedAsset={selectedAsset}
          setSelectedClientId={setSelectedClientId}
          setSelectedOperationId={setSelectedOperationId}
          setCurrentView={setCurrentView}
        />

        <div className={`flex-1 ${currentView === 'map-viewer' ? 'overflow-hidden relative' : 'overflow-auto'}`}>
          {renderContent}
        </div>

        {/* Collaboration Notifications */}
        <Suspense fallback={null}>
          <CollaborationNotification />
        </Suspense>
      </main>

      {/* AI Assistant - Available globally */}
      <Suspense fallback={null}>
        <AIAssistant 
          operations={operations}
          currentOperation={selectedOperation || undefined}
          currentAsset={selectedAsset || undefined}
        />
      </Suspense>
    </div>
  );
};

// Wrapper for Context
const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <OnlineUsersProvider>
                    <ActiveContextProvider>
                        <AppContent />
                    </ActiveContextProvider>
                </OnlineUsersProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

const AppContent: React.FC = () => {
    const { user, isLoading } = useAuth();
    
    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black">
                <PalantirLoader size="lg" text="LOADING" />
            </div>
        );
    }
    
    // Show login if no user
    if (!user) {
        return (
            <Suspense fallback={
                <div className="flex items-center justify-center h-screen bg-black">
                    <PalantirLoader size="lg" text="LOADING" />
                </div>
            }>
                <LoginPage />
            </Suspense>
        );
    }
    
    // Show authenticated app
    return <AuthenticatedApp />;
}

export default App;
