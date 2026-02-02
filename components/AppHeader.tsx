/**
 * App Header Component
 * 
 * Extracted from App.tsx for better code organization
 */

import React from 'react';
import { Home, ChevronRight, Shield } from 'lucide-react';
import { Client, Operation, Asset } from '../types';
import { OnlineUsersIndicator } from './OnlineUsersIndicator';

interface AppHeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentView: string;
  selectedClient: Client | null;
  selectedOperation: Operation | null;
  selectedAsset: Asset | null;
  setSelectedClientId: (id: string | null) => void;
  setSelectedOperationId: (id: string | null) => void;
  setCurrentView: (view: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  theme,
  toggleTheme,
  currentView,
  selectedClient,
  selectedOperation,
  selectedAsset,
  setSelectedClientId,
  setSelectedOperationId,
  setCurrentView,
}) => {
  if (currentView === 'dashboard') return null;

  const getViewTitle = (): string => {
    if (currentView === 'client-detail' && selectedClient) {
      return `CLIENT_DETAIL: ${selectedClient.name.toUpperCase().replace(/\s/g, '_')}`;
    }
    if (currentView === 'operation-detail' && selectedOperation) {
      return `OP_DETAIL: ${selectedOperation.name.toUpperCase().replace(/\s/g, '_')}`;
    }
    if (currentView === 'dnsh-evaluation') {
      return selectedAsset
        ? `DNSH_EVAL: ${selectedAsset.name.toUpperCase().replace(/\s/g, '_')}`
        : 'DNSH_EVAL_COMPLETE';
    }
    if (currentView === 'operation-list') return 'OPS_PORTFOLIO';
    if (currentView === 'deal-management') return 'DEAL_MANAGEMENT';
    if (currentView === 'historical-operations') return 'OPERACIONES_HISTÓRICAS';
    if (currentView === 'map-viewer') return 'GEO_VIEWER_GLOBAL';
    if (currentView === 'catalogs') return 'CATALOGS_MEASURES_HAZARDS';
    if (currentView === 'reports') return 'REPORTS_GENERATOR_DNSH';
    return '';
  };

  return (
    <header className={`border-b z-10 flex-shrink-0 transition-colors relative ${
      theme === 'dark' ? 'bg-black border-[#1a1a1a]' : 'bg-white border-gray-200'
    }`}>
      <div className="px-8 py-4">
        {/* Right Side Actions */}
        <div className="absolute top-4 right-4 flex items-center space-x-3">
          {/* Online Users Indicator */}
          <OnlineUsersIndicator 
            operationId={selectedOperation?.id}
            assetId={selectedAsset?.id}
            maxVisible={5}
          />
          
          {/* Theme Toggle Button */}
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
        </nav>
        
        {/* Title */}
        <h1 className={`text-xl font-bold tracking-tight font-mono uppercase transition-colors ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {getViewTitle()}
        </h1>
      </div>
    </header>
  );
};
