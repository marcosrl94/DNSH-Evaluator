/**
 * Dynamic loader for @google/generative-ai
 * This file exists to prevent Vite from analyzing the import statically
 * The import is done in a way that Vite cannot resolve at build time
 */

/**
 * Dynamically load the Gemini SDK
 * Returns null if the module is not available
 * 
 * NOTE: This module is optional. If @google/generative-ai is not installed,
 * this function will return null and the app will use fallback mode.
 */
export async function loadGeminiSDK(): Promise<any> {
  try {
    // Build the module path using string concatenation to prevent static analysis
    // Vite cannot analyze this import path statically
    const parts: string[] = [];
    parts.push('@google');
    parts.push('/generative-ai');
    const modulePath = parts.join('');
    
    // Use Function constructor to create a truly dynamic import
    // This completely prevents Vite from analyzing the import statically
    const dynamicImport = new Function('path', 'return import(path)');
    const module = await dynamicImport(modulePath);
    return module;
  } catch (error: any) {
    // Module not available - return null (this is expected if module is not installed)
    return null;
  }
}
