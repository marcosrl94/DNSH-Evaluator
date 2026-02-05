import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { DEMO_OPERATIONS } from '../constants';
import { Operation, Asset } from '../types';
import { formatLargeNumber } from '../utils/common';
import { logger } from '../utils/logger';
import { useActiveContext } from '../context/ActiveContext';
import { generateText, generateWithContext, isGeminiConfigured } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  operations?: Operation[];
  currentOperation?: Operation | null;
  currentAsset?: Asset | null;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ 
  operations = DEMO_OPERATIONS,
  currentOperation = null,
  currentAsset = null 
}) => {
  // Use active context for client/project awareness
  const { activeClient, activeOperation: contextOperation } = useActiveContext();
  
  // Prefer context operation over prop, but allow prop override
  const effectiveOperation = contextOperation || currentOperation;
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de IA para DNSH. Puedo ayudarte con preguntas sobre:\n\n• Evaluación DNSH y cumplimiento\n• Operaciones y activos\n• Riesgos climáticos y adaptación\n• Objetivos ambientales de la Taxonomía Europea\n• Medidas de mitigación y adaptación\n\n¿En qué puedo ayudarte?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Memoize context building to avoid recalculation
  const buildContext = useCallback((): string => {
    let context = `Eres un asistente experto en DNSH (Do No Significant Harm) y Taxonomía Europea. `;
    context += `Estás ayudando a usuarios de una plataforma de evaluación DNSH para inversiones sostenibles.\n\n`;
    
    // Add active client context if available
    if (activeClient) {
      context += `CONTEXTO DE CLIENTE ACTIVO:\n`;
      context += `Cliente: ${activeClient.name}\n`;
      if (activeClient.country) context += `País: ${activeClient.country}\n`;
      if (activeClient.sector) context += `Sector: ${activeClient.sector}\n`;
      if (activeClient.description) context += `Descripción: ${activeClient.description}\n`;
      context += `\n`;
    }
    
    if (operations.length > 0) {
      context += `CONTEXTO DE OPERACIONES:\n`;
      context += `Total de operaciones: ${operations.length}\n`;
      operations.forEach(op => {
        context += `- ${op.name} (${op.id}): ${op.assets.length} activos, ${op.country}, Sector NACE ${op.sectorNACE}, CAPEX ${formatLargeNumber(op.capex)}, Estado: ${op.status}\n`;
      });
      context += `\n`;
    }

    if (effectiveOperation) {
      context += `OPERACIÓN ACTUAL (CONTEXTO ACTIVO):\n`;
      context += `Nombre: ${effectiveOperation.name}\n`;
      context += `País: ${effectiveOperation.country}\n`;
      context += `Sector NACE: ${effectiveOperation.sectorNACE}\n`;
      context += `Activos: ${effectiveOperation.assets.length}\n`;
      effectiveOperation.assets.forEach(asset => {
        context += `  - ${asset.name}: ${asset.assetType}, Valor ${formatLargeNumber(asset.exposedValue)}\n`;
        if (asset.dnshEvaluation) {
          context += `    Estado DNSH: ${asset.dnshEvaluation.overallStatus}\n`;
        }
      });
      context += `\n`;
    }

    if (currentAsset || (effectiveOperation && effectiveOperation.assets.length === 1)) {
      const asset = currentAsset || (effectiveOperation?.assets[0]);
      if (asset) {
        context += `ASSET ACTUAL:\n`;
        context += `Nombre: ${asset.name}\n`;
        context += `Tipo: ${asset.assetType}\n`;
        context += `Ubicación: Lat ${asset.lat}, Lng ${asset.lng}\n`;
        context += `Valor: ${formatLargeNumber(asset.exposedValue)}\n`;
        if (asset.dnshEvaluation) {
          context += `Evaluación DNSH:\n`;
          context += `  Mitigación: ${asset.dnshEvaluation.mitigationStatus}\n`;
          context += `  Adaptación: ${asset.dnshEvaluation.adaptationStatus || 'Not Assessed'}\n`;
          context += `  Agua: ${asset.dnshEvaluation.waterStatus}\n`;
          context += `  Circular: ${asset.dnshEvaluation.circularStatus}\n`;
          context += `  Contaminación: ${asset.dnshEvaluation.pollutionStatus}\n`;
          context += `  Biodiversidad: ${asset.dnshEvaluation.biodiversityStatus}\n`;
          context += `  Estado General: ${asset.dnshEvaluation.overallStatus}\n`;
        }
        context += `\n`;
      }
    }

    context += `OBJETIVOS DNSH (Taxonomía Europea):\n`;
    context += `1. Mitigación del Cambio Climático\n`;
    context += `2. Adaptación al Cambio Climático\n`;
    context += `3. Uso Sostenible del Agua\n`;
    context += `4. Economía Circular\n`;
    context += `5. Prevención de la Contaminación\n`;
    context += `6. Biodiversidad y Ecosistemas\n\n`;

    context += `Responde de forma clara, concisa y profesional. Si no tienes información específica, indica que necesitas más contexto. `;
    context += `Siempre menciona referencias a la Taxonomía Europea cuando sea relevante.`;

    return context;
  }, [operations, effectiveOperation, currentAsset, activeClient]);

  // Get AI response using Gemini or fallback to rule-based
  const getAIResponse = async (userMessage: string): Promise<string> => {
    const context = buildContext();
    
    // Try to use Gemini AI if available
    if (await isGeminiConfigured()) {
      try {
        const prompt = `${context}\n\nPREGUNTA DEL USUARIO: ${userMessage}\n\nResponde de forma clara, concisa y profesional en español.`;
        const response = await generateText(prompt, 'Eres un asistente experto en DNSH (Do No Significant Harm) y Taxonomía Europea. Ayudas a usuarios de una plataforma de evaluación DNSH para inversiones sostenibles.', {
          temperature: 0.7,
          maxTokens: 1024
        });
        return response;
      } catch (error) {
        logger.warn('Error using Gemini AI, falling back to rule-based responses:', error);
        // Fall through to rule-based responses
      }
    }
    
    // Fallback to rule-based responses
    const lowerMessage = userMessage.toLowerCase();

    // Simple pattern matching with context awareness
    if (lowerMessage.includes('hola') || lowerMessage.includes('help') || lowerMessage.includes('ayuda')) {
      return '¡Hola! Puedo ayudarte con:\n\n• Preguntas sobre DNSH y Taxonomía Europea\n• Información sobre operaciones y activos\n• Evaluación de riesgos climáticos\n• Medidas de adaptación y mitigación\n• Cumplimiento de objetivos ambientales\n\n¿Qué te gustaría saber?';
    }

    if (lowerMessage.includes('operacion') || lowerMessage.includes('operación')) {
      if (currentOperation) {
        return `La operación actual es **${currentOperation.name}**:\n\n• País: ${currentOperation.country}\n• Sector NACE: ${currentOperation.sectorNACE}\n• Activos: ${currentOperation.assets.length}\n• CAPEX Total: ${formatLargeNumber(currentOperation.capex)}\n• Estado: ${currentOperation.status}\n\n${currentOperation.assets.map(a => `- ${a.name} (${a.assetType}): ${formatLargeNumber(a.exposedValue)}`).join('\n')}`;
      }
      return `Hay ${operations.length} operaciones en total:\n\n${operations.map(op => `• ${op.name}: ${op.assets.length} activos, ${op.country}`).join('\n')}\n\n¿Sobre cuál operación quieres más información?`;
    }

    if (lowerMessage.includes('asset') || lowerMessage.includes('activo')) {
      if (currentAsset) {
        return `El asset actual es **${currentAsset.name}**:\n\n• Tipo: ${currentAsset.assetType}\n• Valor: ${formatLargeNumber(currentAsset.exposedValue)}\n• Ubicación: ${currentAsset.lat.toFixed(4)}, ${currentAsset.lng.toFixed(4)}\n${currentAsset.dnshEvaluation ? `• Estado DNSH: ${currentAsset.dnshEvaluation.overallStatus}` : '• Evaluación DNSH: Pendiente'}`;
      }
      return 'No hay un asset seleccionado actualmente. ¿Sobre qué asset te gustaría información?';
    }

    if (lowerMessage.includes('dnsh') || lowerMessage.includes('cumplimiento')) {
      if (currentAsset?.dnshEvaluation) {
        const evaluation = currentAsset.dnshEvaluation;
        return `Estado DNSH del asset **${currentAsset.name}**:\n\n✅ Mitigación: ${evaluation.mitigationStatus}\n⚠️ Adaptación: ${evaluation.adaptationStatus || 'Not Assessed'}\n💧 Agua: ${evaluation.waterStatus}\n♻️ Circular: ${evaluation.circularStatus}\n🚫 Contaminación: ${evaluation.pollutionStatus}\n🌿 Biodiversidad: ${evaluation.biodiversityStatus}\n\n**Estado General: ${evaluation.overallStatus}**`;
      }
      return 'DNSH (Do No Significant Harm) evalúa 6 objetivos ambientales según la Taxonomía Europea:\n\n1. Mitigación del Cambio Climático\n2. Adaptación al Cambio Climático\n3. Uso Sostenible del Agua\n4. Economía Circular\n5. Prevención de la Contaminación\n6. Biodiversidad y Ecosistemas\n\nCada asset debe cumplir con todos los objetivos para ser considerado compliant.';
    }

    if (lowerMessage.includes('riesgo') || lowerMessage.includes('climatico') || lowerMessage.includes('climático')) {
      return 'Los riesgos climáticos físicos se evalúan mediante:\n\n• **Hazard (H)**: Peligros climáticos (28 tipos según EU Taxonomy)\n• **Exposure (E)**: Exposición del asset\n• **Vulnerability (V)**: Vulnerabilidad del asset\n\nEl riesgo se calcula como H+E+V y se clasifica en:\n• Low (0-5)\n• Moderate (6-10)\n• High (11-15)\n• Very High (16+)';
    }

    if (lowerMessage.includes('adaptacion') || lowerMessage.includes('adaptación')) {
      return 'La adaptación al cambio climático requiere:\n\n1. **Evaluación CRVA** (Climate Risk & Vulnerability Assessment)\n2. **Identificación de riesgos materiales** (High o Very High)\n3. **Implementación de medidas** de adaptación\n4. **Verificación** de reducción de vulnerabilidad\n\nLas medidas comunes incluyen barreras contra inundaciones, sistemas de drenaje mejorados, materiales resistentes al calor, etc.';
    }

    if (lowerMessage.includes('taxonomia') || lowerMessage.includes('taxonomía')) {
      return 'La **Taxonomía Europea** (Reglamento UE 2020/852) establece criterios para:\n\n• **Contribución Sustancial**: La actividad debe contribuir significativamente a uno de los 6 objetivos ambientales\n• **DNSH**: No debe causar daño significativo a ninguno de los otros objetivos\n• **Garantías Mínimas**: Cumplimiento de normas sociales y de gobernanza\n\nEs fundamental para la clasificación de inversiones sostenibles en la UE.';
    }

    // Default response
    return `Entiendo tu pregunta sobre "${userMessage}". ` +
           `Basándome en el contexto actual${currentOperation ? ` de la operación ${currentOperation.name}` : ''}${currentAsset ? ` y el asset ${currentAsset.name}` : ''}, ` +
           `te recomiendo revisar la documentación DNSH específica. ` +
           `¿Puedes ser más específico sobre qué aspecto te interesa? Por ejemplo:\n\n` +
           `• Estado de cumplimiento DNSH\n` +
           `• Riesgos climáticos identificados\n` +
           `• Medidas de adaptación recomendadas\n` +
           `• Documentación requerida`;
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const aiResponse = await getAIResponse(userMessage.content);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      logger.error('Error in AI assistant:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu pregunta. Por favor, inténtalo de nuevo.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, getAIResponse]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 group"
          aria-label="Abrir asistente de IA"
        >
          <MessageCircle size={24} />
          <span className="hidden group-hover:inline-block text-sm font-medium ml-2">Asistente DNSH</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-xl shadow-2xl flex flex-col border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-white/20 p-2 rounded-lg">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Asistente DNSH</h3>
                <p className="text-xs text-emerald-100">IA para evaluación DNSH</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              aria-label="Cerrar chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-900 border border-slate-200'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    )}
                    {message.role === 'user' && (
                      <User size={16} className="text-white mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-emerald-100' : 'text-slate-400'
                      }`}>
                        {(() => {
                          // #region agent log
                          try {
                            const ts = message.timestamp;
                            fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AIAssistant.tsx:321',message:'Rendering timestamp',data:{timestampType:typeof ts,isDate:ts instanceof Date,timestampValue:ts instanceof Date ? ts.toISOString() : String(ts)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                            if (ts instanceof Date) {
                              return ts.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                            }
                            const date = new Date(ts);
                            return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                          } catch (e) {
                            fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AIAssistant.tsx:321',message:'Error converting timestamp',data:{conversionError:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                            return '';
                          }
                          // #endregion
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <Loader2 size={16} className="text-emerald-600 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
            <div className="flex items-end space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta sobre DNSH..."
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-colors"
                aria-label="Enviar mensaje"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Presiona Enter para enviar
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
