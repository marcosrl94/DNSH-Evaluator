/**
 * Gemini AI Service Wrapper
 * 
 * Provides integration with Google Gemini AI API
 * Falls back to simulation if API key is not available or API call fails
 */

import { logger } from '../utils/logger';
import { loadGeminiSDK } from './geminiLoader';

// Try to import Gemini SDK dynamically
let GoogleGenerativeAI: any = null;
let isGeminiAvailable = false;
let geminiInitPromise: Promise<void> | null = null;

// Initialize Gemini SDK lazily - only when actually needed
const initializeGemini = async (): Promise<void> => {
  if (geminiInitPromise) {
    return geminiInitPromise;
  }
  
  geminiInitPromise = (async () => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        isGeminiAvailable = false;
        return;
      }
      
      // Try dynamic import - if it fails, we'll use fallback
      // IMPORTANT: This module is optional. If @google/generative-ai is not installed,
      // the app will use fallback simulation mode instead.
      try {
        // Use the loader function which handles the import dynamically
        const geminiModule = await loadGeminiSDK();
        
        if (!geminiModule) {
          logger.debug('@google/generative-ai not available - module not installed');
        }
        
        if (geminiModule && typeof geminiModule === 'object' && 'GoogleGenerativeAI' in geminiModule) {
          GoogleGenerativeAI = geminiModule.GoogleGenerativeAI;
          if (typeof GoogleGenerativeAI === 'function') {
            isGeminiAvailable = true;
            logger.info('Google Generative AI SDK loaded successfully');
          } else {
            isGeminiAvailable = false;
            logger.debug('Google Generative AI SDK not available - invalid export');
          }
        } else {
          isGeminiAvailable = false;
          logger.debug('Google Generative AI SDK not available - module not found');
        }
      } catch (importError: any) {
        // Module not available or failed to load - use fallback
        isGeminiAvailable = false;
        logger.debug('Google Generative AI SDK not available:', importError?.message || importError);
      }
    } catch (error: any) {
      // Catch any unexpected errors and ensure we don't break the app
      logger.warn('Google Generative AI SDK initialization error, using fallback mode:', error?.message || error);
      isGeminiAvailable = false;
    } finally {
      // Ensure promise resolves even if there were errors
      if (!isGeminiAvailable) {
        logger.debug('Gemini will use fallback simulation mode');
      }
    }
  })();
  
  return geminiInitPromise;
};

// Get API key from environment
const getApiKey = (): string | null => {
  try {
    // Use import.meta.env which is the Vite way
    // Vite automatically exposes variables prefixed with VITE_
    const apiKey = 
      (import.meta.env?.VITE_GEMINI_API_KEY as string | undefined) ||
      (import.meta.env?.GEMINI_API_KEY as string | undefined) ||
      null;
    
    // Return null if empty string
    return apiKey && apiKey.trim() !== '' ? apiKey.trim() : null;
  } catch (error) {
    // Fallback if import.meta.env is not available
    logger.debug('Could not access environment variables:', error);
    return null;
  }
};

/**
 * Check if Gemini API is available and configured
 */
export const isGeminiConfigured = async (): Promise<boolean> => {
  await initializeGemini();
  return isGeminiAvailable && getApiKey() !== null;
};

/**
 * Generate text using Gemini AI
 */
export const generateText = async (
  prompt: string,
  systemInstruction?: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> => {
  await initializeGemini();
  const apiKey = getApiKey();
  
  // Fallback to simulation if not configured
  if (!isGeminiAvailable || !apiKey) {
    logger.debug('Gemini not configured, using fallback simulation');
    return simulateAIResponse(prompt);
  }

  try {
    // Check if GoogleGenerativeAI is available
    if (!GoogleGenerativeAI || typeof GoogleGenerativeAI !== 'function') {
      logger.debug('GoogleGenerativeAI not available, using fallback');
      return simulateAIResponse(prompt);
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      systemInstruction: systemInstruction || 'Eres un asistente experto en DNSH (Do No Significant Harm) y Taxonomía Europea. Responde de forma clara, concisa y profesional en español.'
    });

    const generationConfig = {
      temperature: options?.temperature ?? 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: options?.maxTokens ?? 2048,
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = result.response;
    const text = response.text();
    
    logger.debug('Gemini API response received');
    return text;
  } catch (error: any) {
    logger.error('Error calling Gemini API:', error);
    // Fallback to simulation on error
    logger.warn('Falling back to simulation due to API error');
    return simulateAIResponse(prompt);
  }
};

/**
 * Simulate AI response (fallback when Gemini is not available)
 */
function simulateAIResponse(prompt: string): string {
  // Simple simulation - just return a basic response
  // This maintains compatibility when API is not configured
  return `Basándome en la información proporcionada, puedo ayudarte con tu consulta sobre "${prompt.substring(0, 50)}...". 

Nota: Esta es una respuesta simulada. Para obtener respuestas completas de IA, configura GEMINI_API_KEY en tu archivo .env.local.`;
}

/**
 * Generate content with context
 */
export const generateWithContext = async (
  prompt: string,
  context: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> => {
  const fullPrompt = `${context}\n\n${prompt}`;
  return generateText(fullPrompt, undefined, options);
};
