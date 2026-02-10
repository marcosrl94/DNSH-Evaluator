/**
 * AI Provider Service
 * 
 * Manages available AI providers, user licenses, and provider selection
 * for enhanced report generation
 */

import { logger } from '../utils/logger';

export enum AIProvider {
  OPENAI_GPT4 = 'openai-gpt4',
  OPENAI_GPT4_TURBO = 'openai-gpt4-turbo',
  OPENAI_GPT35_TURBO = 'openai-gpt35-turbo',
  ANTHROPIC_CLAUDE_OPUS = 'anthropic-claude-opus',
  ANTHROPIC_CLAUDE_SONNET = 'anthropic-claude-sonnet',
  ANTHROPIC_CLAUDE_HAIKU = 'anthropic-claude-haiku',
  GOOGLE_GEMINI_PRO = 'google-gemini-pro',
  GOOGLE_GEMINI_ULTRA = 'google-gemini-ultra',
  MISTRAL_LARGE = 'mistral-large',
  MISTRAL_MEDIUM = 'mistral-medium',
  LOCAL_LLM = 'local-llm'
}

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  provider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'local';
  model: string;
  maxTokens: number;
  costPer1kTokens?: number;
  strengths: string[];
  bestFor: string[];
  requiresLicense: boolean;
  licenseType?: 'free' | 'pro' | 'enterprise';
  apiKeyEnvVar: string;
}

export interface UserAILicense {
  email: string;
  providers: AIProvider[];
  preferredProvider?: AIProvider;
  licenseType: 'free' | 'pro' | 'enterprise';
  features: {
    canUseAdvancedModels: boolean;
    canUseLongContext: boolean;
    canUseCustomPrompts: boolean;
    maxReportsPerMonth?: number;
  };
}

// Available AI Providers Configuration
export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  [AIProvider.OPENAI_GPT4]: {
    id: AIProvider.OPENAI_GPT4,
    name: 'GPT-4',
    description: 'Modelo más avanzado de OpenAI, excelente para análisis complejos y generación de contenido detallado',
    provider: 'openai',
    model: 'gpt-4',
    maxTokens: 8192,
    costPer1kTokens: 0.03,
    strengths: ['Análisis profundo', 'Razonamiento complejo', 'Generación de contenido largo', 'Comprensión de contexto'],
    bestFor: ['Reportes ejecutivos complejos', 'Análisis detallados', 'Recomendaciones estratégicas'],
    requiresLicense: true,
    licenseType: 'pro',
    apiKeyEnvVar: 'VITE_OPENAI_API_KEY'
  },
  [AIProvider.OPENAI_GPT4_TURBO]: {
    id: AIProvider.OPENAI_GPT4_TURBO,
    name: 'GPT-4 Turbo',
    description: 'Versión optimizada de GPT-4 con mejor rendimiento y contexto extendido',
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    maxTokens: 128000,
    costPer1kTokens: 0.01,
    strengths: ['Contexto muy largo', 'Rápido', 'Análisis exhaustivo', 'Múltiples documentos'],
    bestFor: ['Reportes largos', 'Análisis de múltiples operaciones', 'Documentación completa'],
    requiresLicense: true,
    licenseType: 'pro',
    apiKeyEnvVar: 'VITE_OPENAI_API_KEY'
  },
  [AIProvider.OPENAI_GPT35_TURBO]: {
    id: AIProvider.OPENAI_GPT35_TURBO,
    name: 'GPT-3.5 Turbo',
    description: 'Modelo rápido y eficiente, ideal para generación rápida de contenido',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    maxTokens: 16385,
    costPer1kTokens: 0.0005,
    strengths: ['Rápido', 'Económico', 'Buen rendimiento general'],
    bestFor: ['Reportes rápidos', 'Contenido estándar', 'Iteraciones rápidas'],
    requiresLicense: false,
    licenseType: 'free',
    apiKeyEnvVar: 'VITE_OPENAI_API_KEY'
  },
  [AIProvider.ANTHROPIC_CLAUDE_OPUS]: {
    id: AIProvider.ANTHROPIC_CLAUDE_OPUS,
    name: 'Claude Opus',
    description: 'Modelo más avanzado de Anthropic, excelente para análisis técnicos y documentación',
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    maxTokens: 200000,
    costPer1kTokens: 0.015,
    strengths: ['Análisis técnico profundo', 'Documentación excelente', 'Razonamiento estructurado', 'Contexto muy largo'],
    bestFor: ['Análisis técnicos DNSH', 'Documentación regulatoria', 'Reportes técnicos detallados'],
    requiresLicense: true,
    licenseType: 'enterprise',
    apiKeyEnvVar: 'VITE_ANTHROPIC_API_KEY'
  },
  [AIProvider.ANTHROPIC_CLAUDE_SONNET]: {
    id: AIProvider.ANTHROPIC_CLAUDE_SONNET,
    name: 'Claude Sonnet',
    description: 'Balance perfecto entre rendimiento y costo, ideal para la mayoría de casos de uso',
    provider: 'anthropic',
    model: 'claude-3-sonnet-20240229',
    maxTokens: 200000,
    costPer1kTokens: 0.003,
    strengths: ['Balance rendimiento/costo', 'Buen análisis', 'Contexto largo', 'Rápido'],
    bestFor: ['Reportes estándar', 'Análisis DNSH', 'Recomendaciones', 'Uso general'],
    requiresLicense: true,
    licenseType: 'pro',
    apiKeyEnvVar: 'VITE_ANTHROPIC_API_KEY'
  },
  [AIProvider.ANTHROPIC_CLAUDE_HAIKU]: {
    id: AIProvider.ANTHROPIC_CLAUDE_HAIKU,
    name: 'Claude Haiku',
    description: 'Modelo rápido y económico, ideal para tareas simples y rápidas',
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    maxTokens: 200000,
    costPer1kTokens: 0.00025,
    strengths: ['Muy rápido', 'Muy económico', 'Buen para tareas simples'],
    bestFor: ['Resúmenes rápidos', 'Generación básica', 'Iteraciones rápidas'],
    requiresLicense: false,
    licenseType: 'free',
    apiKeyEnvVar: 'VITE_ANTHROPIC_API_KEY'
  },
  [AIProvider.GOOGLE_GEMINI_PRO]: {
    id: AIProvider.GOOGLE_GEMINI_PRO,
    name: 'Gemini Pro',
    description: 'Modelo avanzado de Google, excelente para análisis de datos y visualización',
    provider: 'google',
    model: 'gemini-pro',
    maxTokens: 32768,
    costPer1kTokens: 0.0005,
    strengths: ['Análisis de datos', 'Razonamiento matemático', 'Multimodal'],
    bestFor: ['Análisis financieros', 'Métricas y KPIs', 'Reportes con datos'],
    requiresLicense: true,
    licenseType: 'pro',
    apiKeyEnvVar: 'VITE_GOOGLE_AI_API_KEY'
  },
  [AIProvider.GOOGLE_GEMINI_ULTRA]: {
    id: AIProvider.GOOGLE_GEMINI_ULTRA,
    name: 'Gemini Ultra',
    description: 'Modelo más avanzado de Google, para tareas complejas y análisis profundos',
    provider: 'google',
    model: 'gemini-ultra',
    maxTokens: 32768,
    costPer1kTokens: 0.002,
    strengths: ['Máximo rendimiento', 'Análisis complejos', 'Razonamiento avanzado'],
    bestFor: ['Reportes ejecutivos complejos', 'Análisis estratégicos', 'Decisiones críticas'],
    requiresLicense: true,
    licenseType: 'enterprise',
    apiKeyEnvVar: 'VITE_GOOGLE_AI_API_KEY'
  },
  [AIProvider.MISTRAL_LARGE]: {
    id: AIProvider.MISTRAL_LARGE,
    name: 'Mistral Large',
    description: 'Modelo avanzado de Mistral AI, excelente para análisis en múltiples idiomas',
    provider: 'mistral',
    model: 'mistral-large-latest',
    maxTokens: 32000,
    costPer1kTokens: 0.002,
    strengths: ['Multilingüe', 'Rápido', 'Buen análisis'],
    bestFor: ['Reportes multilingües', 'Análisis internacionales'],
    requiresLicense: true,
    licenseType: 'pro',
    apiKeyEnvVar: 'VITE_MISTRAL_API_KEY'
  },
  [AIProvider.MISTRAL_MEDIUM]: {
    id: AIProvider.MISTRAL_MEDIUM,
    name: 'Mistral Medium',
    description: 'Modelo balanceado de Mistral AI',
    provider: 'mistral',
    model: 'mistral-medium-latest',
    maxTokens: 32000,
    costPer1kTokens: 0.001,
    strengths: ['Balance rendimiento/costo', 'Multilingüe'],
    bestFor: ['Uso general', 'Reportes estándar'],
    requiresLicense: false,
    licenseType: 'free',
    apiKeyEnvVar: 'VITE_MISTRAL_API_KEY'
  },
  [AIProvider.LOCAL_LLM]: {
    id: AIProvider.LOCAL_LLM,
    name: 'LLM Local',
    description: 'Modelo ejecutado localmente, sin costos de API pero requiere recursos locales',
    provider: 'local',
    model: 'local',
    maxTokens: 4096,
    strengths: ['Sin costos', 'Privacidad total', 'Sin límites de API'],
    bestFor: ['Datos sensibles', 'Uso intensivo', 'Privacidad crítica'],
    requiresLicense: false,
    licenseType: 'free',
    apiKeyEnvVar: ''
  }
};

/**
 * Get available AI providers for a user based on their email/license
 */
export function getAvailableProvidersForUser(userEmail: string): AIProvider[] {
  try {
    // In production, this would query a database or API
    // For now, we'll use a simple mapping based on email patterns
    
    if (!userEmail || typeof userEmail !== 'string') {
      return [];
    }
    
    const emailParts = userEmail.split('@');
    const emailDomain = emailParts.length > 1 ? emailParts[1]?.toLowerCase() || '' : '';
    
    // Mapeo de dominios de email a tipo de licencia AI
    const licenseMap: Record<string, UserAILicense> = {
    // Free tier users
    'gmail.com': {
      email: userEmail,
      providers: [
        AIProvider.OPENAI_GPT35_TURBO,
        AIProvider.ANTHROPIC_CLAUDE_HAIKU,
        AIProvider.MISTRAL_MEDIUM,
        AIProvider.LOCAL_LLM
      ],
      licenseType: 'free',
      features: {
        canUseAdvancedModels: false,
        canUseLongContext: false,
        canUseCustomPrompts: false,
        maxReportsPerMonth: 10
      }
    },
    // Pro tier users (default for most corporate emails)
    'default': {
      email: userEmail,
      providers: [
        AIProvider.OPENAI_GPT4_TURBO,
        AIProvider.OPENAI_GPT35_TURBO,
        AIProvider.ANTHROPIC_CLAUDE_SONNET,
        AIProvider.ANTHROPIC_CLAUDE_HAIKU,
        AIProvider.GOOGLE_GEMINI_PRO,
        AIProvider.MISTRAL_LARGE,
        AIProvider.LOCAL_LLM
      ],
      preferredProvider: AIProvider.ANTHROPIC_CLAUDE_SONNET,
      licenseType: 'pro',
      features: {
        canUseAdvancedModels: true,
        canUseLongContext: true,
        canUseCustomPrompts: true,
        maxReportsPerMonth: 100
      }
    },
    // Enterprise tier (specific domains)
    'ecoinvest.com': {
      email: userEmail,
      providers: Object.values(AIProvider),
      preferredProvider: AIProvider.ANTHROPIC_CLAUDE_OPUS,
      licenseType: 'enterprise',
      features: {
        canUseAdvancedModels: true,
        canUseLongContext: true,
        canUseCustomPrompts: true
      }
    }
  };
  
    const userLicense = licenseMap[emailDomain] || licenseMap['default'];
    
    if (!userLicense || !Array.isArray(userLicense.providers)) {
      return [];
    }
    
    // Filter providers based on API key availability
    return userLicense.providers.filter(provider => {
      try {
        const config = AI_PROVIDERS[provider];
        if (!config) return false;
        if (!config.apiKeyEnvVar) return true; // Local LLM doesn't need API key
        return !!import.meta.env[config.apiKeyEnvVar];
      } catch {
        return false;
      }
    });
  } catch (error) {
    logger.error('Error getting available providers:', error, { component: 'AIProviderService', action: 'getAvailableProviders' });
    return [];
  }
}

/**
 * Get user license information
 */
export function getUserLicense(userEmail: string): UserAILicense {
  try {
    if (!userEmail || typeof userEmail !== 'string') {
      // Return default free license
      return {
        email: '',
        providers: [AIProvider.OPENAI_GPT35_TURBO, AIProvider.LOCAL_LLM],
        licenseType: 'free',
        features: {
          canUseAdvancedModels: false,
          canUseLongContext: false,
          canUseCustomPrompts: false,
          maxReportsPerMonth: 10
        }
      };
    }
    
    const emailParts = userEmail.split('@');
    const emailDomain = emailParts.length > 1 ? emailParts[1]?.toLowerCase() || '' : '';
    
    const licenseMap: Record<string, UserAILicense> = {
    'gmail.com': {
      email: userEmail,
      providers: [
        AIProvider.OPENAI_GPT35_TURBO,
        AIProvider.ANTHROPIC_CLAUDE_HAIKU,
        AIProvider.MISTRAL_MEDIUM,
        AIProvider.LOCAL_LLM
      ],
      licenseType: 'free',
      features: {
        canUseAdvancedModels: false,
        canUseLongContext: false,
        canUseCustomPrompts: false,
        maxReportsPerMonth: 10
      }
    },
    'default': {
      email: userEmail,
      providers: [
        AIProvider.OPENAI_GPT4_TURBO,
        AIProvider.OPENAI_GPT35_TURBO,
        AIProvider.ANTHROPIC_CLAUDE_SONNET,
        AIProvider.ANTHROPIC_CLAUDE_HAIKU,
        AIProvider.GOOGLE_GEMINI_PRO,
        AIProvider.MISTRAL_LARGE,
        AIProvider.LOCAL_LLM
      ],
      preferredProvider: AIProvider.ANTHROPIC_CLAUDE_SONNET,
      licenseType: 'pro',
      features: {
        canUseAdvancedModels: true,
        canUseLongContext: true,
        canUseCustomPrompts: true,
        maxReportsPerMonth: 100
      }
    },
    'ecoinvest.com': {
      email: userEmail,
      providers: Object.values(AIProvider),
      preferredProvider: AIProvider.ANTHROPIC_CLAUDE_OPUS,
      licenseType: 'enterprise',
      features: {
        canUseAdvancedModels: true,
        canUseLongContext: true,
        canUseCustomPrompts: true
      }
    }
    };
    
    return licenseMap[emailDomain] || licenseMap['default'];
  } catch (error) {
    logger.error('Error getting user license:', error, { component: 'AIProviderService', action: 'getUserLicense', userEmail });
    // Return default free license on error
    return {
      email: userEmail || '',
      providers: [AIProvider.OPENAI_GPT35_TURBO, AIProvider.LOCAL_LLM],
      licenseType: 'free',
      features: {
        canUseAdvancedModels: false,
        canUseLongContext: false,
        canUseCustomPrompts: false,
        maxReportsPerMonth: 10
      }
    };
  }
}

/**
 * Recommend best AI provider for a specific use case
 */
export function recommendProvider(
  useCase: 'executive_summary' | 'detailed_analysis' | 'quick_report' | 'technical_analysis' | 'financial_analysis',
  availableProviders: AIProvider[],
  userLicense: UserAILicense
): AIProvider | null {
  try {
    if (!useCase || !Array.isArray(availableProviders) || !userLicense) {
      return null;
    }
    
    const recommendations: Record<string, AIProvider[]> = {
    executive_summary: [
      AIProvider.ANTHROPIC_CLAUDE_OPUS,
      AIProvider.OPENAI_GPT4,
      AIProvider.ANTHROPIC_CLAUDE_SONNET,
      AIProvider.OPENAI_GPT4_TURBO
    ],
    detailed_analysis: [
      AIProvider.ANTHROPIC_CLAUDE_OPUS,
      AIProvider.OPENAI_GPT4_TURBO,
      AIProvider.ANTHROPIC_CLAUDE_SONNET,
      AIProvider.OPENAI_GPT4
    ],
    quick_report: [
      AIProvider.OPENAI_GPT35_TURBO,
      AIProvider.ANTHROPIC_CLAUDE_HAIKU,
      AIProvider.MISTRAL_MEDIUM
    ],
    technical_analysis: [
      AIProvider.ANTHROPIC_CLAUDE_OPUS,
      AIProvider.ANTHROPIC_CLAUDE_SONNET,
      AIProvider.OPENAI_GPT4_TURBO
    ],
    financial_analysis: [
      AIProvider.GOOGLE_GEMINI_PRO,
      AIProvider.GOOGLE_GEMINI_ULTRA,
      AIProvider.OPENAI_GPT4_TURBO
    ]
  };
  
  const recommended = recommendations[useCase] || recommendations.detailed_analysis;
  
    // Find first recommended provider that's available and user has access to
    for (const provider of recommended) {
      if (availableProviders.includes(provider)) {
        try {
          // Check if user has license for this provider
          const config = AI_PROVIDERS[provider];
          if (config && (!config.requiresLicense || userLicense.features.canUseAdvancedModels)) {
            return provider;
          }
        } catch {
          continue;
        }
      }
    }
    
    // Fallback to user's preferred provider or first available
    if (userLicense.preferredProvider && availableProviders.includes(userLicense.preferredProvider)) {
      return userLicense.preferredProvider;
    }
    
    return availableProviders.length > 0 ? availableProviders[0] : AIProvider.LOCAL_LLM;
  } catch (error) {
    logger.error('Error recommending provider:', error, { component: 'AIProviderService', action: 'recommendProvider', useCase });
    return null;
  }
}

/**
 * Get provider configuration
 */
export function getProviderConfig(provider: AIProvider): AIProviderConfig | null {
  try {
    if (!provider) return null;
    const config = AI_PROVIDERS[provider];
    return config || null;
  } catch (error) {
    logger.error(`Error getting provider config for ${provider}:`, error, { component: 'AIProviderService', action: 'getProviderConfig', provider });
    return null;
  }
}
