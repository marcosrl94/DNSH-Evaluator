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
 * Generate with Local LLM (fallback/mock)
 */
async function generateWithLocal(
  request: AIGenerationRequest,
  config: AIProviderConfig
): Promise<AIGenerationResponse> {
  // In a real implementation, this would call a local LLM API
  // For now, we'll return a mock response indicating local generation
  // In production, this could use Ollama, LM Studio, or similar
  
  return {
    content: `[Generación Local - No disponible en modo demo]\n\nPara usar modelos locales, configure un servidor LLM local (Ollama, LM Studio, etc.) y actualice esta función para conectarse a él.\n\nPrompt recibido: ${request.prompt.substring(0, 200)}...`,
    model: config.model,
    provider: request.provider,
    error: 'Local LLM not configured'
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

    let prompt = '';
    
    // Map section types to use cases
    const sectionTypeMap: Record<string, string> = {
    'executive_summary': 'executive_summary',
    'dnsh_compliance': 'detailed_analysis',
    'risk_assessment': 'technical_analysis',
    'evidence_review': 'detailed_analysis',
    'financial_metrics': 'financial_analysis',
    'geographic_analysis': 'detailed_analysis',
      'recommendations': 'executive_summary'
    };
    
    const useCase = sectionTypeMap[sectionType] || 'detailed_analysis';
    
    switch (sectionType) {
    case 'executive_summary':
      prompt = `Genera un Resumen Ejecutivo profesional y completo para un reporte DNSH. 

Contexto:
${JSON.stringify(context, null, 2)}

El resumen debe incluir:
1. Contexto y alcance del análisis
2. Hallazgos principales con métricas específicas
3. Análisis por objetivo DNSH identificando fortalezas y debilidades
4. Evaluación de riesgos climáticos con datos específicos
5. Conclusiones ejecutivas basadas en los datos
6. Próximos pasos recomendados con acciones específicas

${existingContent ? `\nContenido existente para mejorar:\n${existingContent}` : ''}`;
      break;
      
    case 'dnsh_compliance':
      prompt = `Genera una sección detallada de Cumplimiento DNSH.

Contexto:
${JSON.stringify(context, null, 2)}

La sección debe incluir:
1. Análisis detallado por cada uno de los 6 objetivos DNSH
2. Identificación de activos/operaciones problemáticas específicas
3. Análisis de causas raíz donde sea posible
4. Recomendaciones específicas por objetivo
5. Estrategia de mejora continua

${existingContent ? `\nContenido existente para mejorar:\n${existingContent}` : ''}`;
      break;
      
    case 'risk_assessment':
      prompt = `Genera una Evaluación Detallada de Riesgos Climáticos.

Contexto:
${JSON.stringify(context, null, 2)}

La evaluación debe incluir:
1. Análisis de exposición financiera (AAL si está disponible)
2. Identificación de operaciones críticas con detalles específicos
3. Análisis de tipos de riesgos identificados
4. Recomendaciones específicas por nivel de riesgo
5. Métricas de seguimiento propuestas

${existingContent ? `\nContenido existente para mejorar:\n${existingContent}` : ''}`;
      break;
      
    case 'recommendations':
      prompt = `Genera Recomendaciones Estratégicas y Acciones Prioritarias.

Contexto:
${JSON.stringify(context, null, 2)}

Las recomendaciones deben:
1. Estar priorizadas por plazo (corto, mediano, largo)
2. Ser específicas y accionables
3. Incluir métricas de éxito
4. Especificar recursos requeridos
5. Basarse en los datos reales del análisis

${existingContent ? `\nContenido existente para mejorar:\n${existingContent}` : ''}`;
      break;
      
    default:
      prompt = `Genera contenido profesional para la sección "${sectionType}" de un reporte DNSH.

Contexto:
${JSON.stringify(context, null, 2)}

${existingContent ? `\nContenido existente para mejorar:\n${existingContent}` : ''}`;
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
