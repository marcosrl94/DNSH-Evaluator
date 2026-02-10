/**
 * AI Integration Service
 * 
 * Handles actual API calls to different AI providers
 */

import { AIProvider, AIProviderConfig, getProviderConfig } from './aiProviderService';
import { logger } from '../utils/logger';

export interface AIGenerationRequest {
  provider: AIProvider;
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIGenerationResponse {
  content: string;
  tokensUsed?: number;
  model: string;
  provider: AIProvider;
  error?: string;
}

/**
 * Generate content using selected AI provider
 */
export async function generateWithAI(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  const config = getProviderConfig(request.provider);
  
  if (!config) {
    return {
      content: '',
      model: 'unknown',
      provider: request.provider,
      error: `Provider configuration not found for ${request.provider}`
    };
  }
  
  try {
    switch (config.provider) {
      case 'openai':
        return await generateWithOpenAI(request, config);
      case 'anthropic':
        return await generateWithAnthropic(request, config);
      case 'google':
        return await generateWithGoogle(request, config);
      case 'mistral':
        return await generateWithMistral(request, config);
      case 'local':
        return await generateWithLocal(request, config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  } catch (error: any) {
    return {
      content: '',
      model: config?.model || 'unknown',
      provider: request.provider,
      error: error.message || 'Error generating content with AI'
    };
  }
}

/**
 * Generate with OpenAI
 */
async function generateWithOpenAI(
  request: AIGenerationRequest,
  config: AIProviderConfig
): Promise<AIGenerationResponse> {
  const apiKey = import.meta.env[config.apiKeyEnvVar];
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        {
          role: 'user',
          content: request.context 
            ? `${request.context}\n\n${request.prompt}`
            : request.prompt
        }
      ],
      max_tokens: request.maxTokens || config.maxTokens,
      temperature: request.temperature || 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens,
    model: config.model,
    provider: request.provider
  };
}

/**
 * Generate with Anthropic Claude
 */
async function generateWithAnthropic(
  request: AIGenerationRequest,
  config: AIProviderConfig
): Promise<AIGenerationResponse> {
  const apiKey = import.meta.env[config.apiKeyEnvVar];
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }
  
  const messages = [
    {
      role: 'user' as const,
      content: request.context 
        ? `${request.context}\n\n${request.prompt}`
        : request.prompt
    }
  ];
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: request.maxTokens || config.maxTokens,
      temperature: request.temperature || 0.7,
      system: request.systemPrompt || 'You are an expert DNSH (Do No Significant Harm) evaluator and sustainability analyst. Generate comprehensive, professional reports based on the provided data.',
      messages
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `Anthropic API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.content[0]?.text || '',
    tokensUsed: data.usage?.input_tokens && data.usage?.output_tokens 
      ? data.usage.input_tokens + data.usage.output_tokens 
      : undefined,
    model: config.model,
    provider: request.provider
  };
}

/**
 * Generate with Google Gemini
 */
async function generateWithGoogle(
  request: AIGenerationRequest,
  config: AIProviderConfig
): Promise<AIGenerationResponse> {
  const apiKey = import.meta.env[config.apiKeyEnvVar];
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }
  
  const fullPrompt = request.systemPrompt 
    ? `${request.systemPrompt}\n\n${request.context || ''}\n\n${request.prompt}`
    : request.context 
      ? `${request.context}\n\n${request.prompt}`
      : request.prompt;
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          maxOutputTokens: request.maxTokens || config.maxTokens,
          temperature: request.temperature || 0.7
        }
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `Google AI API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    tokensUsed: data.usageMetadata?.totalTokenCount,
    model: config.model,
    provider: request.provider
  };
}

/**
 * Generate with Mistral
 */
async function generateWithMistral(
  request: AIGenerationRequest,
  config: AIProviderConfig
): Promise<AIGenerationResponse> {
  const apiKey = import.meta.env[config.apiKeyEnvVar];
  if (!apiKey) {
    throw new Error('Mistral API key not configured');
  }
  
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        {
          role: 'user',
          content: request.context 
            ? `${request.context}\n\n${request.prompt}`
            : request.prompt
        }
      ],
      max_tokens: request.maxTokens || config.maxTokens,
      temperature: request.temperature || 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `Mistral API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens,
    model: config.model,
    provider: request.provider
  };
}

/**
 * Generación con LLM local (Ollama, LM Studio, etc.).
 * Para usarlo: configure un servidor LLM y conecte esta función (p. ej. VITE_LOCAL_LLM_URL).
 */
async function generateWithLocal(
  request: AIGenerationRequest,
  config: AIProviderConfig
): Promise<AIGenerationResponse> {
  return {
    content: '',
    model: config.model,
    provider: request.provider,
    error: 'Modelo local no configurado. Configure un servidor LLM (Ollama, LM Studio) en la configuración de proveedores para usar generación local.'
  };
}

/**
 * Generate enhanced report section using AI
 */
export async function generateReportSectionWithAI(
  provider: AIProvider,
  sectionType: string,
  context: {
    client?: any;
    operation?: any;
    asset?: any;
    operations?: any[];
    metrics?: any;
    objectiveCompliance?: any;
    riskDistribution?: any;
    detailedDnshData?: any;
    customPrompt?: string; // Custom prompt override
  },
  existingContent?: string
): Promise<string> {
  try {
    if (!provider || !sectionType) {
      throw new Error('Provider and section type are required');
    }
    
    const systemPrompt = `Eres un experto analista DNSH (Do No Significant Harm) y evaluador de sostenibilidad conforme a la Taxonomía Europea de Actividades Sostenibles. 

Tu tarea es generar reportes profesionales, detallados y accionables basados en datos reales de evaluación DNSH.

Características de tu estilo:
- Profesional y ejecutivo
- Basado en datos específicos
- Análisis profundo, no solo números
- Recomendaciones accionables y específicas
- Estructura clara y bien organizada
- Lenguaje técnico pero accesible
- Incluye métricas, porcentajes y datos específicos cuando estén disponibles

Genera contenido en español, usando formato Markdown.`;

    // Use custom prompt if provided, otherwise generate default
    let prompt = '';
    
    if (context.customPrompt) {
      // Use custom prompt directly
      prompt = context.customPrompt;
    } else {
      // Import prompt service functions
      const { getDefaultPromptForSection, buildDetailedDNSHContext } = await import('./reportPromptService');
      
      // Build detailed DNSH context
      const detailedDnshData = buildDetailedDNSHContext(context.operation, context.asset);
      
      // Get default prompt for section
      prompt = getDefaultPromptForSection(sectionType as any, {
        ...context,
        detailedDnshData
      });
    }
    
    // Add existing content reference if available
    if (existingContent) {
      prompt += `\n\nContenido existente para mejorar o expandir:\n${existingContent}`;
    }
  
    const response = await generateWithAI({
      provider,
      prompt,
      systemPrompt,
      maxTokens: 4000,
      temperature: 0.7
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.content || existingContent || 'No se pudo generar contenido con IA.';
  } catch (error: any) {
    logger.error('Error generating report section with AI:', error);
    return existingContent || `Error al generar contenido con IA: ${error.message || 'Error desconocido'}`;
  }
}
