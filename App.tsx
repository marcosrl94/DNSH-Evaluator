
import React, { useState } from 'react';
import { LayoutDashboard, Globe, ShieldCheck, FileText, Menu, X, Settings, BookOpen, LogOut, Briefcase, UserCircle, ChevronRight, Home, Shield } from 'lucide-react';
import { DEMO_OPERATIONS, DEMO_CLIENTS } from './constants';
import { Client } from './types';
import DashboardPage from './pages/Dashboard';
import UnifiedDashboardPage from './pages/UnifiedDashboard';
import OperationDetailPage from './pages/OperationDetail';
import DnshAdaptationPage from './pages/DnshAdaptation'; // Used embedded in DnshEvaluationEnhanced
import DnshEvaluationEnhancedPage from './pages/DnshEvaluationEnhanced'; // UNIFIED DNSH EVALUATION PAGE
import OperationsListPage from './pages/OperationsList';
import GlobalMapViewerPage from './pages/GlobalMapViewer';
import CatalogsPage from './pages/Catalogs';
import ReportsPage from './pages/Reports';
import LoginPage from './pages/Login';
import ClientDetailPage from './pages/ClientDetail';
import ClientDnshEvaluationPage from './pages/ClientDnshEvaluation';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { hasPermission } from './services/auth';
import { AssetDnshEvaluation, Operation, DnshObjective } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import AIAssistant from './components/AIAssistant';

type View = 'dashboard' | 'operation-list' | 'operation-detail' | 'client-detail' | 'client-dnsh-evaluation' | 'dnsh-evaluation' | 'map-viewer' | 'catalogs' | 'reports';

// Separate component for the authenticated layout to use the hook
const AuthenticatedApp: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [clients, setClients] = useState<Client[]>(DEMO_CLIENTS);
  const [operations, setOperations] = useState(DEMO_OPERATIONS);

  // Security: Check if user has minimum permissions (after hooks)
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-600">Please log in to continue.</p>
        </div>
      </div>
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

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedOperation = operations.find(op => op.id === selectedOperationId);
  const selectedAsset = selectedOperation?.assets.find(a => a.id === selectedAssetId);

  const handleUpdateOperation = (updatedOperation: Operation) => {
    // Update both local state and data store for consistency
    const { updateOperation } = require('./services/dataManagement');
    updateOperation(updatedOperation);
    setOperations(prev => prev.map(op => op.id === updatedOperation.id ? updatedOperation : op));
  };

  const navigateToOperation = (id: string) => {
    const operation = operations.find(op => op.id === id);
    if (operation) {
      setSelectedClientId(operation.clientId);
      setSelectedOperationId(id);
      setCurrentView('operation-detail');
    }
  };

  const navigateToClient = (clientId: string) => {
    if (clientId) {
      setSelectedClientId(clientId);
      setSelectedOperationId(null);
      setCurrentView('client-detail');
    } else {
      setSelectedClientId(null);
      setSelectedOperationId(null);
      setCurrentView('operation-list');
    }
  };

  // Removed: navigateToDnshAdaptation, navigateToDnshChecklist
  // All DNSH evaluations now happen in the unified dnsh-evaluation page

  const navigateToDnshEvaluation = (id: string) => {
    setSelectedOperationId(id);
    setCurrentView('dnsh-evaluation');
  };

  const navigateToAssetEvaluation = (assetId: string) => {
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
  };

  const handleSaveAssetEvaluation = (evaluation: AssetDnshEvaluation) => {
    // Update both local state and data store for consistency
    const { updateAssetEvaluation, updateOperation } = require('./services/dataManagement');
    
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
        updateOperation(updatedOperation);
        setOperations(prev => prev.map(op => 
          op.id === updatedOperation.id ? updatedOperation : op
        ));
      }
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <UnifiedDashboardPage 
            onNavigateToOperation={navigateToOperation}
            onNavigateToClient={navigateToClient}
            onNavigateToAssetEvaluation={navigateToAssetEvaluation}
            onNavigateToDnshEvaluation={(operationId, assetId) => {
              setSelectedOperationId(operationId);
              setSelectedAssetId(assetId || null);
              setCurrentView('dnsh-evaluation');
            }}
          />
        );
      case 'operation-list':
        return <OperationsListPage onNavigateToOperation={navigateToOperation} selectedClientId={selectedClientId} onNavigateToClient={navigateToClient} />;
      case 'client-detail':
        return selectedClient ? (
          <ClientDetailPage 
            client={selectedClient}
            operations={operations.filter(op => op.clientId === selectedClient.id)}
            onNavigateToOperation={navigateToOperation}
            onNavigateToDnshEvaluation={(clientId: string) => {
              setSelectedClientId(clientId);
              setCurrentView('client-dnsh-evaluation');
            }}
            onBack={() => navigateToClient('')}
          />
        ) : <div className="p-8">Cliente no encontrado</div>;
      case 'client-dnsh-evaluation':
        return selectedClient ? (
          <ClientDnshEvaluationPage
            client={selectedClient}
            operations={operations.filter(op => op.clientId === selectedClient.id)}
            onBack={() => setCurrentView('client-detail')}
          />
        ) : <div className="p-8">Cliente no encontrado</div>;
      case 'map-viewer':
        return (
          <GlobalMapViewerPage 
            onNavigateToOperation={navigateToOperation}
            onNavigateToAssetEvaluation={navigateToAssetEvaluation}
            onNavigateToDnshEvaluation={(operationId: string, objective?: DnshObjective) => {
              const operation = operations.find(op => op.id === operationId);
              if (operation) {
                setSelectedOperationId(operationId);
                setCurrentView('dnsh-evaluation');
                // TODO: Navigate to specific objective if provided
              }
            }}
          />
        );
      case 'catalogs':
        return <CatalogsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'operation-detail':
        return selectedOperation ? (
          <OperationDetailPage 
            operation={selectedOperation} 
            onNavigateToDnshEvaluation={() => {
              setCurrentView('dnsh-evaluation');
            }}
            onNavigateToDnshObjective={(objective: DnshObjective) => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/3643d2bc-84c4-48ef-965a-acea6e50f48b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:122',message:'onNavigateToDnshObjective called',data:{objective,currentView},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              setCurrentView('dnsh-evaluation');
              // Store the objective to navigate to in state (we'll handle this in DnshEvaluationPage)
              // For now, just navigate to evaluation page
            }}
            onNavigateToAssetEvaluation={navigateToAssetEvaluation}
            onBack={() => setCurrentView('operation-list')}
            onUpdateOperation={handleUpdateOperation}
          />
        ) : <div>Operation not found</div>;
      // All DNSH evaluations unified in 'dnsh-evaluation' case below
      // Removed routes: asset-evaluation, dnsh-adaptation, dnsh-checklist
      // These functionalities are now integrated in DnshEvaluationEnhancedPage
      case 'dnsh-evaluation':
        return selectedOperation ? (
          <DnshEvaluationEnhancedPage 
            operation={selectedOperation} 
            onBack={() => {
              setSelectedAssetId(null);
              setCurrentView('operation-detail');
            }}
            onUpdateOperation={handleUpdateOperation}
            initialAssetId={selectedAssetId}
          />
        ) : <div>Operation not found</div>;
      default:
        return <DashboardPage onNavigateToOperation={navigateToOperation} />;
    }
  };

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
                {currentView === 'client-dnsh-evaluation' && (
                  <>
                    <ChevronRight size={12} />
                    <span className={theme === 'dark' ? 'text-white font-medium' : 'text-gray-900 font-medium'}>EVALUACIÓN DNSH</span>
                  </>
                )}
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
                 {currentView === 'client-dnsh-evaluation' && (selectedClient?.name ? `DNSH_EVAL: ${selectedClient.name.toUpperCase().replace(/\s/g, '_')}` : 'DNSH_EVAL_COMPANY')}
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
          {renderContent()}
        </div>
      </main>

      {/* AI Assistant - Available globally */}
      <AIAssistant 
        operations={operations}
        currentOperation={selectedOperation || undefined}
        currentAsset={selectedAsset || undefined}
      />
    </div>
  );
};

const SidebarItem = ({ icon, label, isOpen, isActive, onClick, theme }: any) => (
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
);

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
