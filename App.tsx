
import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { Client } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { ActiveContextProvider } from './context/ActiveContext';
import { OnlineUsersProvider } from './context/OnlineUsersContext';
import { ToastProvider } from './components/Toast';
import { hasPermission } from './services/auth';
import { Operation, DnshObjective } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { logger } from './utils/logger';
import { getAllOperations, getAllClients, getOperation, dataStore, updateOperation as updateOperationInStore } from './services/dataManagement';
import { socketService } from './src/services/socketService';
import PalantirLoader from './components/PalantirLoader';
import { AppSidebar } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';
import { FloatingOnlineUsers } from './components/FloatingOnlineUsers';

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
const SettingsPage = lazy(() => import('./pages/Settings'));
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

type View = 'dashboard' | 'operation-list' | 'operation-detail' | 'client-detail' | 'dnsh-evaluation' | 'map-viewer' | 'catalogs' | 'reports' | 'deal-management' | 'historical-operations' | 'settings';

// Separate component for the authenticated layout to use the hook
const AuthenticatedApp: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [ops, cl] = await Promise.all([getAllOperations(), getAllClients()]);
      setOperations(Array.isArray(ops) ? ops : []);
      setClients(Array.isArray(cl) ? cl : []);
    } catch (error) {
      logger.error('Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = dataStore.subscribe(loadData);
    return unsubscribe;
  }, [loadData]);

  // Al cargar una operación seleccionada, traer detalle con assets (el listado GET /operations no incluye assets)
  useEffect(() => {
    if (!selectedOperationId) return;
    getOperation(selectedOperationId)
      .then((fullOp) => {
        if (fullOp) {
          setOperations((prev) =>
            prev.map((op) => (op.id === selectedOperationId ? fullOp : op))
          );
        }
      })
      .catch((err) => logger.error('Error loading operation detail:', err));
  }, [selectedOperationId]);

  // Update user presence when navigating
  useEffect(() => {
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

  // Memoize selected entities and handlers (must be before any early return - rules of hooks)
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
  const clientOperations = useMemo(
    () => selectedClient ? operations.filter(op => op.clientId === selectedClient.id) : [],
    [operations, selectedClient]
  );

  const handleUpdateOperation = useCallback((updatedOperation: Operation) => {
    try {
      updateOperationInStore(updatedOperation);
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

  const navigateToAssetEvaluation = useCallback((assetId: string) => {
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

  const handleNavigateToDnshEvaluationWithAsset = useCallback((operationId: string, assetId?: string | null) => {
    setSelectedOperationId(operationId);
    setSelectedAssetId(assetId || null);
    setCurrentView('dnsh-evaluation');
  }, []);

  const handleNavigateToClientDnshEvaluation = useCallback((clientId: string) => {
    const clientOps = operations.filter(op => op.clientId === clientId);
    if (clientOps.length > 0) {
      setSelectedClientId(clientId);
      setSelectedOperationId(clientOps[0].id);
      setSelectedAssetId(null);
      setCurrentView('dnsh-evaluation');
    } else {
      setSelectedClientId(clientId);
      setCurrentView('client-detail');
    }
  }, [operations]);

  const handleNavigateToDnshObjective = useCallback((_objective: DnshObjective) => {
    setCurrentView('dnsh-evaluation');
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

  const handleNavigateToDnshEvaluationFromMap = useCallback((operationId: string, _objective?: DnshObjective) => {
    const operation = operations.find(op => op.id === operationId);
    if (operation) {
      setSelectedOperationId(operationId);
      setCurrentView('dnsh-evaluation');
    }
  }, [operations]);

  const renderContent = useMemo(() => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UnifiedDashboardPage 
              operations={operations}
              clients={clients}
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
              operations={operations}
              clients={clients}
              onNavigateToOperation={navigateToOperation} 
              selectedClientId={selectedClientId} 
              onNavigateToClient={navigateToClient} 
            />
          </Suspense>
        );
      case 'client-detail':
        if (!selectedClient) {
          return (
            <div className={`flex flex-col items-center justify-center h-full p-8 transition-colors ${
              theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'
            }`}>
              <AlertTriangle className={`w-16 h-16 mb-4 ${theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'}`} />
              <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Cliente no encontrado
              </h2>
              <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                El cliente seleccionado no está disponible. Por favor, selecciona otro cliente.
              </p>
              <button
                onClick={() => setCurrentView('operation-list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#00ff88] text-black hover:bg-[#00cc6f]'
                    : 'bg-[#0066cc] text-white hover:bg-[#0052a3]'
                }`}
              >
                Ir a lista de operaciones
              </button>
            </div>
          );
        }
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ClientDetailPage 
              client={selectedClient}
              operations={clientOperations}
              onNavigateToOperation={navigateToOperation}
              onNavigateToDnshEvaluation={handleNavigateToClientDnshEvaluation}
              onBack={() => navigateToClient('')}
            />
          </Suspense>
        );
      case 'map-viewer':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <GlobalMapViewerPage 
              operations={operations}
              clients={clients}
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
            <ReportsPage operations={operations} clients={clients} />
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
      case 'settings':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SettingsPage />
          </Suspense>
        );
      case 'operation-detail':
        if (!selectedOperation) {
          return (
            <div className={`flex flex-col items-center justify-center h-full p-8 transition-colors ${
              theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'
            }`}>
              <AlertTriangle className={`w-16 h-16 mb-4 ${theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'}`} />
              <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Operación no encontrada
              </h2>
              <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                La operación seleccionada no está disponible. Por favor, selecciona otra operación.
              </p>
              <button
                onClick={() => setCurrentView('operation-list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#00ff88] text-black hover:bg-[#00cc6f]'
                    : 'bg-[#0066cc] text-white hover:bg-[#0052a3]'
                }`}
              >
                Ir a lista de operaciones
              </button>
            </div>
          );
        }
        return (
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
        );
      case 'dnsh-evaluation':
        if (!selectedOperation) {
          return (
            <div className={`flex flex-col items-center justify-center h-full p-8 transition-colors ${
              theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'
            }`}>
              <AlertTriangle className={`w-16 h-16 mb-4 ${theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'}`} />
              <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Operación no seleccionada
              </h2>
              <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Por favor, selecciona una operación para continuar con la evaluación DNSH.
              </p>
              <button
                onClick={() => setCurrentView('operation-list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#00ff88] text-black hover:bg-[#00cc6f]'
                    : 'bg-[#0066cc] text-white hover:bg-[#0052a3]'
                }`}
              >
                Ir a lista de operaciones
              </button>
            </div>
          );
        }
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DnshEvaluationEnhancedPage 
              operation={selectedOperation} 
              onBack={handleBackToOperationDetail}
              onUpdateOperation={handleUpdateOperation}
              initialAssetId={selectedAssetId}
            />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage operations={operations} clients={clients} onNavigateToOperation={navigateToOperation} />
          </Suspense>
        );
    }
  }, [
    theme,
    currentView,
    operations,
    clients,
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
        selectedOperationId={selectedOperationId}
        selectedAssetId={selectedAssetId}
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

      {/* Floating Online Users - Always visible top-right */}
      <FloatingOnlineUsers 
        operationId={selectedOperationId || undefined}
        assetId={selectedAssetId || undefined}
      />
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
                        <ToastProvider>
                            <AppContent />
                        </ToastProvider>
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
