/**
 * AI Provider Selector Component - Simplified Dropdown
 * 
 * Simple dropdown to select AI provider for report generation
 */

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { 
  AIProvider, 
  getAvailableProvidersForUser, 
  getUserLicense, 
  recommendProvider,
  getProviderConfig
} from '../services/aiProviderService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

interface AIProviderSelectorProps {
  selectedProvider: AIProvider | null;
  onProviderChange: (provider: AIProvider) => void;
  useCase?: 'executive_summary' | 'detailed_analysis' | 'quick_report' | 'technical_analysis' | 'financial_analysis';
  reportLevel?: 'company' | 'portfolio' | 'asset';
}

const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  useCase = 'detailed_analysis',
  reportLevel = 'portfolio'
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
  const [recommendedProvider, setRecommendedProvider] = useState<AIProvider | null>(null);
  
  useEffect(() => {
    try {
      if (user?.email) {
        const providers = getAvailableProvidersForUser(user.email);
        const license = getUserLicense(user.email);
        const recommended = recommendProvider(useCase, providers, license);
        
        setAvailableProviders(Array.isArray(providers) ? providers : []);
        setRecommendedProvider(recommended || null);
        
        // Auto-select recommended if none selected
        if (!selectedProvider && recommended) {
          onProviderChange(recommended);
        }
      } else {
        setAvailableProviders([]);
        setRecommendedProvider(null);
      }
    } catch (error) {
      console.error('Error initializing AI provider selector:', error);
      setAvailableProviders([]);
      setRecommendedProvider(null);
    }
  }, [user?.email, useCase]);
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as AIProvider;
    if (provider) {
      onProviderChange(provider);
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      <Sparkles size={16} className={theme === 'dark' ? 'text-[#00ff88]' : 'text-emerald-600'} />
      <label className={`text-sm font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
        MODELO_IA:
      </label>
      <select
        value={selectedProvider || ''}
        onChange={handleChange}
        className={`${themeClasses.inputClass} text-sm rounded-lg px-3 py-1.5 min-w-[200px] shadow-sm border`}
      >
        <option value="">Seleccionar...</option>
        {Array.isArray(availableProviders) ? availableProviders.map((provider) => {
          try {
            if (!provider) return null;
            const config = getProviderConfig(provider);
            if (!config) return null;
            const hasApiKey = !config.apiKeyEnvVar || !!import.meta.env[config.apiKeyEnvVar];
            const isRecommended = recommendedProvider === provider;
            
            if (!hasApiKey) return null;
            
            return (
              <option key={provider} value={provider}>
                {config.name || provider}{isRecommended ? ' ⭐' : ''}
              </option>
            );
          } catch (error) {
            console.error(`Error rendering provider ${provider}:`, error);
            return null;
          }
        }).filter(Boolean) : null}
      </select>
      {recommendedProvider && selectedProvider === recommendedProvider && (
        <span className={`text-xs px-2 py-0.5 rounded border ${theme === 'dark' ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'} font-mono`}>
          RECOMENDADO
        </span>
      )}
    </div>
  );
};

export default AIProviderSelector;
