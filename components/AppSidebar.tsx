/**
 * App Sidebar Component
 * 
 * Extracted from App.tsx for better code organization
 */

import React from 'react';
import { LayoutDashboard, Globe, ShieldCheck, FileText, Menu, X, Settings, BookOpen, LogOut, Briefcase, UserCircle, Upload, Archive } from 'lucide-react';
import { User } from '../types';

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

interface AppSidebarProps {
  isOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  currentView: string;
  setCurrentView: (view: string) => void;
  setSelectedOperationId: (id: string | null) => void;
  setSelectedClientId: (id: string | null) => void;
  setSelectedAssetId: (id: string | null) => void;
  theme: 'light' | 'dark';
  user: User | null;
  logout: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen,
  setIsSidebarOpen,
  currentView,
  setCurrentView,
  setSelectedOperationId,
  setSelectedClientId,
  setSelectedAssetId,
  theme,
  user,
  logout,
}) => {
  const handleNavigation = (view: string) => {
    setSelectedOperationId(null);
    setSelectedClientId(null);
    setSelectedAssetId(null);
    setCurrentView(view);
  };

  return (
    <aside 
      className={`${isOpen ? 'w-72' : 'w-20'} flex-shrink-0 border-r transition-all duration-300 flex flex-col z-20 ${
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
          {isOpen && (
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
        <button onClick={() => setIsSidebarOpen(!isOpen)} className={`ml-auto lg:hidden transition-colors ${
          theme === 'dark' ? 'text-[#666666] hover:text-white' : 'text-gray-500 hover:text-gray-900'
        }`}>
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        <SidebarItem 
          icon={<LayoutDashboard size={20} />} 
          label="CMD_DASHBOARD" 
          isOpen={isOpen} 
          isActive={currentView === 'dashboard'}
          theme={theme}
          onClick={() => handleNavigation('dashboard')} 
        />
        <SidebarItem 
          icon={<Briefcase size={20} />} 
          label="OPS_MANAGEMENT" 
          isOpen={isOpen} 
          isActive={currentView === 'operation-list' || currentView === 'operation-detail'}
          theme={theme}
          onClick={() => { setSelectedOperationId(null); setCurrentView('operation-list'); }} 
        />
        <SidebarItem 
          icon={<Upload size={20} />} 
          label="DEAL_MANAGEMENT" 
          isOpen={isOpen} 
          isActive={currentView === 'deal-management'}
          theme={theme}
          onClick={() => handleNavigation('deal-management')} 
        />
        <SidebarItem 
          icon={<BookOpen size={20} />} 
          label="CATALOGS" 
          isOpen={isOpen} 
          isActive={currentView === 'catalogs'}
          theme={theme}
          onClick={() => setCurrentView('catalogs')} 
        />
        <SidebarItem 
          icon={<Archive size={20} />} 
          label="HISTORICAL" 
          isOpen={isOpen} 
          isActive={currentView === 'historical-operations'}
          theme={theme}
          onClick={() => handleNavigation('historical-operations')} 
        />
        <SidebarItem 
          icon={<FileText size={20} />} 
          label="REPORTS" 
          isOpen={isOpen} 
          isActive={currentView === 'reports'}
          theme={theme}
          onClick={() => setCurrentView('reports')} 
        />
        <SidebarItem 
          icon={<Settings size={20} />} 
          label="ADMIN" 
          isOpen={isOpen} 
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
        <div className={`flex items-center ${isOpen ? 'space-x-3' : 'justify-center'}`}>
          {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.name || 'User'} 
                className={`w-10 h-10 rounded-full border-2 transition-all object-cover ${
                  theme === 'dark' 
                    ? 'border-[#00ff88]/30 hover:border-[#00ff88]/50' 
                    : 'border-emerald-500/30 hover:border-emerald-500/50'
                }`}
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
          ) : null}
          <div 
            className={`avatar-fallback w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
              theme === 'dark' 
                ? 'bg-[#111111] text-[#a0a0a0] border-[#1a1a1a]' 
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
            style={{ display: user?.avatarUrl ? 'none' : 'flex' }}
          >
            <UserCircle size={24} />
          </div>
          
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>{user?.name || 'Usuario'}</p>
              <p className={`text-xs truncate font-mono uppercase transition-colors ${
                theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
              }`}>{user?.role || 'Analyst'}</p>
            </div>
          )}
        </div>
        {isOpen && (
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
  );
};
