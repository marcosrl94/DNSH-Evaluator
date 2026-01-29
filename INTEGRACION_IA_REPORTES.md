# 🤖 Integración de IA para Generación de Reportes

## ✅ Implementación Completada

### 1. Sistema de Gestión de Proveedores de IA

**Archivo**: `services/aiProviderService.ts`

- ✅ Configuración de múltiples proveedores de IA:
  - OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
  - Anthropic (Claude Opus, Sonnet, Haiku)
  - Google (Gemini Pro, Ultra)
  - Mistral (Large, Medium)
  - LLM Local (para privacidad)

- ✅ Sistema de licencias por usuario:
  - **Free**: Acceso a modelos básicos
  - **Pro**: Acceso a modelos avanzados
  - **Enterprise**: Acceso completo a todos los modelos

- ✅ Reconocimiento automático según email:
  - Mapeo de dominios a tipos de licencia
  - Detección de proveedores disponibles según API keys configuradas
  - Proveedor preferido por usuario

- ✅ Sistema de recomendación inteligente:
  - Recomienda el mejor modelo según el caso de uso
  - Considera disponibilidad de API keys
  - Respeta restricciones de licencia

### 2. Servicio de Integración con APIs de IA

**Archivo**: `services/aiIntegrationService.ts`

- ✅ Integración con múltiples APIs:
  - OpenAI API (Chat Completions)
  - Anthropic API (Messages)
  - Google Gemini API
  - Mistral API
  - LLM Local (mock para desarrollo)

- ✅ Función especializada para reportes:
  - `generateReportSectionWithAI()` - Genera contenido mejorado para secciones específicas
  - Prompts optimizados por tipo de sección
  - Contexto completo del reporte incluido
  - Mejora contenido existente o genera nuevo

### 3. Componente UI de Selección

**Archivo**: `components/AIProviderSelector.tsx`

- ✅ Selector visual de proveedores:
  - Muestra solo proveedores disponibles según licencia
  - Indica recomendación automática
  - Muestra información detallada de cada proveedor
  - Badges de tipo de licencia requerida
  - Indicadores de API keys configuradas

- ✅ Información contextual:
  - Fortalezas de cada modelo
  - Casos de uso ideales
  - Costos y límites
  - Estado de configuración

### 4. Integración en Módulo de Reportes

**Archivo**: `pages/Reports.tsx`

- ✅ Selector de IA integrado:
  - Aparece cuando hay un reporte generado
  - Se adapta al nivel de reporte (Company/Portfolio/Asset)
  - Recomienda modelo según caso de uso

- ✅ Funcionalidades de generación:
  - Checkbox para activar generación con IA
  - Botón "Regenerar Todo con IA" para todas las secciones
  - Botón "IA" en cada sección para regenerar individualmente
  - Indicadores de generación en progreso

- ✅ Actualización de contenido:
  - Las secciones se actualizan en tiempo real
  - Marcado como "IA Gen" cuando se genera con IA
  - Preserva metadata y referencias

## 🔧 Configuración Necesaria

### Variables de Entorno

Para usar los diferentes proveedores, configura las siguientes variables en `.env.local`:

```env
# OpenAI
VITE_OPENAI_API_KEY=sk-...

# Anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Google AI
VITE_GOOGLE_AI_API_KEY=...

# Mistral
VITE_MISTRAL_API_KEY=...
```

### Mapeo de Licencias por Email

El sistema reconoce automáticamente la licencia según el dominio del email:

- **@gmail.com**: Licencia Free (modelos básicos)
- **@ecoinvest.com**: Licencia Enterprise (todos los modelos)
- **Otros dominios**: Licencia Pro (modelos avanzados)

En producción, esto debería consultar una base de datos o API.

## 📋 Flujo de Uso

1. **Usuario selecciona nivel de reporte** (Company/Portfolio/Asset)
2. **Sistema genera reporte base** con contenido mejorado
3. **Selector de IA aparece** mostrando proveedores disponibles
4. **Sistema recomienda** el mejor modelo según caso de uso
5. **Usuario selecciona modelo** (o usa el recomendado)
6. **Usuario activa checkbox** "Usar IA para generar contenido"
7. **Usuario hace click** en "Regenerar Todo con IA" o regenera secciones individuales
8. **Sistema llama a API** del proveedor seleccionado
9. **Contenido mejorado** reemplaza secciones del reporte
10. **Secciones marcadas** como "IA Gen" para indicar origen

## 🎯 Casos de Uso y Recomendaciones

### Resumen Ejecutivo
- **Recomendado**: Claude Opus, GPT-4, Claude Sonnet
- **Razón**: Necesita análisis profundo y síntesis ejecutiva

### Análisis Detallado DNSH
- **Recomendado**: Claude Opus, Claude Sonnet, GPT-4 Turbo
- **Razón**: Requiere comprensión técnica y análisis estructurado

### Análisis Financiero
- **Recomendado**: Gemini Pro, Gemini Ultra
- **Razón**: Excelente con datos numéricos y métricas

### Reporte Rápido
- **Recomendado**: GPT-3.5 Turbo, Claude Haiku
- **Razón**: Rápido y económico para contenido estándar

### Análisis Técnico
- **Recomendado**: Claude Opus, Claude Sonnet
- **Razón**: Excelente para documentación técnica y regulatoria

## 🔒 Seguridad y Privacidad

- Las API keys se almacenan solo en variables de entorno del cliente
- No se envían al backend (llamadas directas desde frontend)
- Para datos sensibles, usar LLM Local
- Las llamadas a API incluyen timeout y manejo de errores

## 📊 Métricas y Costos

Cada proveedor muestra:
- Costo por 1k tokens
- Tokens máximos disponibles
- Estimación de costo por reporte

El sistema puede rastrear tokens usados para facturación futura.

## 🚀 Próximas Mejoras

1. **Caché de respuestas**: Evitar regenerar contenido idéntico
2. **Streaming de respuestas**: Mostrar contenido mientras se genera
3. **Historial de generaciones**: Guardar versiones anteriores
4. **Comparación de modelos**: Permitir comparar salidas de diferentes modelos
5. **Personalización de prompts**: Permitir usuarios Pro/Enterprise personalizar prompts
6. **Integración con backend**: Mover llamadas a backend para mejor seguridad

## 🐛 Troubleshooting

**Error: "API key not configured"**
- Verifica que la variable de entorno esté configurada
- Reinicia el servidor de desarrollo después de agregar variables

**Error: "Provider not available"**
- Verifica tu tipo de licencia
- Algunos modelos requieren licencia Pro o Enterprise

**Error: "Rate limit exceeded"**
- Espera unos minutos antes de intentar de nuevo
- Considera usar un modelo diferente menos solicitado

**Contenido no se actualiza**
- Verifica que el checkbox "Usar IA" esté activado
- Revisa la consola del navegador para errores
- Asegúrate de tener conexión a internet
