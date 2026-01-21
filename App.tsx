
import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { LayoutDashboard, Globe, ShieldCheck, FileText, Menu, X, Settings, BookOpen, LogOut, Briefcase, UserCircle, ChevronRight, Home, Shield } from 'lucide-react';
import { DEMO_OPERATIONS, DEMO_CLIENTS } from './constants';
import { Client } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { hasPermission } from './services/auth';
import { AssetDnshEvaluation, Operation, DnshObjective } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { logger } from './utils/logger';
import { getAllOperations, dataStore, updateAssetEvaluation, updateOperation as updateOperationInStore } from './services/dataManagement';
import PalantirLoader from './components/PalantirLoader';

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
// ClientDnshEvaluationPage removed - unified in DnshEvaluationEnhancedPage
const AIAssistant = lazy(() => import('./components/AIAssistant'));

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando...</p>
    </div>
  </div>
);

type View = 'dashboard' | 'operation-list' | 'operation-detail' | 'client-detail' | 'dnsh-evaluation' | 'map-viewer' | 'catalogs' | 'reports';

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
  const [operations, setOperations] = useState<Operation[]>(getAllOperations());

  // Subscribe to data store changes
  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      setOperations(getAllOperations());
    });
    return unsubscribe;
  }, []);

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
      {/* Sidebar - Pure Black Military Theme */}
      <aside 
        className={`${isSidebarOpen ? 'w-72' : 'w-20'} flex-shrink-0 border-r transition-all duration-300 flex flex-col z-20 ${
          theme === 'dark' 
            ? 'bg-black border-[#1a1a1a] text-[#a0a0a0]' 
            : 'bg-white border-gray-200 text-gray-600'
        }`}
      >
        {/* Logo Area */}
        <div className={`h-20 flex items-center px-6 border-b transition-colors ${
          theme === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="bg-[#00ff88] p-1.5 rounded">
              <ShieldCheck className="w-6 h-6 text-black" />
            </div>
            {isSidebarOpen && (
              <div>
                <h1 className={`font-bold leading-none tracking-tight font-mono transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>DNSH</h1>
                <p className={`text-[9px] mt-1 uppercase tracking-widest font-mono transition-colors ${
                  theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
                }`}>CLIMATE_RISK_PLATFORM</p>
              </div>
            )}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`ml-auto lg:hidden transition-colors ${
            theme === 'dark' ? 'text-[#666666] hover:text-white' : 'text-gray-500 hover:text-gray-900'
          }`}>
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="CMD_DASHBOARD" 
            isOpen={isSidebarOpen} 
            isActive={currentView === 'dashboard'}
            theme={theme}
            onClick={() => { 
              setSelectedOperationId(null); 
              setSelectedClientId(null);
              setSelectedAssetId(null);
              setCurrentView('dashboard'); 
            }} 
          />
          <SidebarItem 
            icon={<Briefcase size={20} />} 
            label="OPS_MANAGEMENT" 
            isOpen={isSidebarOpen} 
            isActive={currentView === 'operation-list' || currentView === 'operation-detail'}
            theme={theme}
            onClick={() => { setSelectedOperationId(null); setCurrentView('operation-list'); }} 
          />
          <SidebarItem 
            icon={<BookOpen size={20} />} 
            label="CATALOGS" 
            isOpen={isSidebarOpen} 
            isActive={currentView === 'catalogs'}
            theme={theme}
            onClick={() => setCurrentView('catalogs')} 
          />
          <SidebarItem 
            icon={<FileText size={20} />} 
            label="REPORTS" 
            isOpen={isSidebarOpen} 
            isActive={currentView === 'reports'}
            theme={theme}
            onClick={() => setCurrentView('reports')} 
          />
          <SidebarItem 
            icon={<Settings size={20} />} 
            label="ADMIN" 
            isOpen={isSidebarOpen} 
            isActive={false}
            theme={theme}
            onClick={() => {}} 
          />
        </nav>

        {/* User Profile Footer */}
        <div className={`p-4 border-t transition-colors ${
          theme === 'dark' 
            ? 'border-[#1a1a1a] bg-black' 
            : 'border-gray-200 bg-white'
        }`}>
          <div className={`flex items-center ${isSidebarOpen ? 'space-x-3' : 'justify-center'}`}>
            {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className={`w-10 h-10 rounded border transition-colors ${
                  theme === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-200'
                }`} />
            ) : (
                <div className={`w-10 h-10 rounded flex items-center justify-center border transition-colors ${
                  theme === 'dark' 
                    ? 'bg-[#111111] text-[#a0a0a0] border-[#1a1a1a]' 
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                    <UserCircle size={24} />
                </div>
            )}
            
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>{user?.name}</p>
                <p className={`text-xs truncate font-mono uppercase transition-colors ${
                  theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
                }`}>{user?.role}</p>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <button 
                onClick={logout}
                className={`mt-4 flex items-center text-xs transition-colors w-full font-mono ${
                  theme === 'dark' 
                    ? 'text-[#666666] hover:text-white' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <LogOut size={14} className="mr-2" />
              CERRAR SESIÓN
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-black' : 'bg-white'
      }`}>
        {/* Enhanced Header with Breadcrumbs */}
        {currentView !== 'dashboard' && (
          <header className={`border-b z-10 flex-shrink-0 transition-colors relative ${
            theme === 'dark' ? 'bg-black border-[#1a1a1a]' : 'bg-white border-gray-200'
          }`}>
            <div className="px-8 py-4">
              {/* Theme Toggle Button */}
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-all cursor-pointer active:scale-[0.90] ${
                    theme === 'dark' 
                      ? 'bg-[#111111] text-[#666666] hover:bg-[#1a1a1a] hover:text-white border border-[#1a1a1a]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border border-gray-200'
                  }`}
                  title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {theme === 'dark' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                  )}
                </button>
              </div>
              {/* Breadcrumbs */}
              <nav className={`flex items-center space-x-2 text-xs mb-2 font-mono uppercase tracking-wider transition-colors ${
                theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
              }`}>
                <button 
                  onClick={() => { setSelectedClientId(null); setSelectedOperationId(null); setCurrentView('dashboard'); }}
                  className={`transition-colors flex items-center ${
                    theme === 'dark' ? 'hover:text-[#00ff88]' : 'hover:text-[#0066cc]'
                  }`}
                >
                  <Home size={12} className="mr-1" />
                  DASHBOARD
                </button>
                {selectedClient && (
                  <>
                    <ChevronRight size={12} />
                    <button 
                      onClick={() => { setCurrentView('client-detail'); }}
                      className={theme === 'dark' ? 'hover:text-[#00ff88] transition-colors' : 'hover:text-[#0066cc] transition-colors'}
                    >
                      {selectedClient.name.toUpperCase().replace(/\s/g, '_')}
                    </button>
                  </>
                )}
                {/* client-dnsh-evaluation removed - unified in dnsh-evaluation */}
                {selectedOperation && (
                  <>
                    <ChevronRight size={12} />
                    <button 
                      onClick={() => { setCurrentView('operation-detail'); }}
                      className={theme === 'dark' ? 'hover:text-[#00ff88] transition-colors' : 'hover:text-[#0066cc] transition-colors'}
                    >
                      {selectedOperation.name}
                    </button>
                  </>
                )}
                {selectedAsset && (
                  <>
                    <ChevronRight size={12} />
                    <span className={`font-medium font-mono uppercase tracking-wider ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>{selectedAsset.name.toUpperCase().replace(/\s/g, '_')}</span>
                  </>
                )}
                {/* All DNSH evaluations now unified in dnsh-evaluation */}
              </nav>
              {/* Title */}
              {currentView !== 'dashboard' && (
                <h1 className={`text-xl font-bold tracking-tight font-mono uppercase transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                 {currentView === 'client-detail' && (selectedClient?.name ? `CLIENT_DETAIL: ${selectedClient.name.toUpperCase().replace(/\s/g, '_')}` : 'CLIENT_DETAIL')}
                 {/* client-dnsh-evaluation removed - unified in dnsh-evaluation */}
                 {currentView === 'operation-detail' && (selectedOperation?.name ? `OP_DETAIL: ${selectedOperation.name.toUpperCase().replace(/\s/g, '_')}` : 'OP_DETAIL')}
                 {currentView === 'dnsh-evaluation' && (selectedAssetId 
                   ? (selectedAsset?.name ? `DNSH_EVAL: ${selectedAsset.name.toUpperCase().replace(/\s/g, '_')}` : 'DNSH_EVAL_ASSET')
                   : 'DNSH_EVAL_COMPLETE')}
                 {currentView === 'operation-list' && 'OPS_PORTFOLIO'}
                 {currentView === 'map-viewer' && 'GEO_VIEWER_GLOBAL'}
                 {currentView === 'catalogs' && 'CATALOGS_MEASURES_HAZARDS'}
                 {currentView === 'reports' && 'REPORTS_GENERATOR_DNSH'}
                </h1>
              )}
            </div>
          </header>
        )}

        <div className={`flex-1 ${currentView === 'map-viewer' ? 'overflow-hidden relative' : 'overflow-auto'}`}>
          {renderContent}
        </div>
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

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  isActive: boolean;
  onClick: () => void;
  theme: 'light' | 'dark';
}

const SidebarItem = React.memo<SidebarItemProps>(({ icon, label, isOpen, isActive, onClick, theme }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all group font-mono border-l-4 ${
      theme === 'dark'
        ? isActive 
          ? 'bg-[#1e293b] text-white shadow-md border-[#00ff88]' 
          : 'text-[#666666] hover:bg-[#1e293b] hover:text-white border-transparent'
        : isActive
          ? 'bg-gray-100 text-gray-900 shadow-md border-[#0066cc]'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
    }`}
  >
    <span className={`flex-shrink-0 transition-colors ${
      isActive 
        ? theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'
        : theme === 'dark' ? 'group-hover:text-white' : 'group-hover:text-gray-900'
    }`}>{icon}</span>
    {isOpen && <span className="font-medium text-xs tracking-widest uppercase">{label}</span>}
  </button>
));

// Wrapper for Context
const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ErrorBoundary>
    );
}

const AppContent: React.FC = () => {
    const { user } = useAuth();
    if (!user) {
        return <LoginPage />;
    }
    return <AuthenticatedApp />;
}

export default App;
