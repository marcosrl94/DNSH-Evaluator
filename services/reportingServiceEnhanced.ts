/**
 * Enhanced Reporting Service
 * 
 * Generates comprehensive, detailed, and professional reports with deep analysis,
 * specific insights, and actionable recommendations based on actual evaluation data.
 */

import { Client, Operation, Asset, DnshObjective, EvidenceDocument, RiskBand, AssetDnshEvaluation } from '../types';
import { getAllMeasures } from '../constants/extendedMeasures';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';

/**
 * Enhanced Executive Summary with deep analysis
 */
export function generateEnhancedExecutiveSummary(
  client: Client,
  operations: Operation[],
  metrics: { totalAssets: number; compliantAssets: number; totalCapex: number; totalDealValue: number; overallComplianceRate: number },
  objectiveCompliance: Record<DnshObjective, { compliant: number; total: number; percentage: number }>,
  riskDistribution: Record<RiskBand, number>
): string {
  const nonCompliantAssets = metrics.totalAssets - metrics.compliantAssets;
  const complianceGap = 100 - metrics.overallComplianceRate;
  const highRiskOps = riskDistribution.High + riskDistribution['Very High'];
  const avgCapexPerAsset = metrics.totalAssets > 0 ? metrics.totalCapex / metrics.totalAssets : 0;
  
  // Identify strongest and weakest objectives
  const objectiveRanking = Object.entries(objectiveCompliance)
    .map(([obj, stats]) => ({ objective: obj, percentage: stats.percentage }))
    .sort((a, b) => b.percentage - a.percentage);
  
  const strongestObjective = objectiveRanking[0];
  const weakestObjective = objectiveRanking[objectiveRanking.length - 1];
  
  // Calculate evidence coverage
  const totalEvidence = operations.reduce((sum, op) => sum + (op.evidenceDocuments?.length || 0), 0);
  const avgEvidencePerOperation = operations.length > 0 ? totalEvidence / operations.length : 0;
  
  return `# Resumen Ejecutivo - Evaluación DNSH Portfolio ${client.name}

## Contexto y Alcance

Este informe presenta una evaluación exhaustiva del cumplimiento DNSH (Do No Significant Harm) conforme a la Taxonomía Europea de Actividades Sostenibles para el portfolio de inversiones de **${client.name}**${client.country ? `, con sede en ${client.country}` : ''}${client.sector ? `, operando en el sector ${client.sector}` : ''}.

El análisis abarca **${operations.length} operación${operations.length !== 1 ? 'es' : ''}** que comprenden un total de **${metrics.totalAssets} activos** distribuidos geográficamente en ${[...new Set(operations.map(op => op.country))].length} país${[...new Set(operations.map(op => op.country))].length !== 1 ? 'es' : ''} (${[...new Set(operations.map(op => op.country))].join(', ')}).

## Hallazgos Principales

### Cumplimiento DNSH General

El portfolio presenta un **nivel de cumplimiento DNSH del ${metrics.overallComplianceRate.toFixed(1)}%**, lo que representa:

- **${metrics.compliantAssets} activos** (${((metrics.compliantAssets / metrics.totalAssets) * 100).toFixed(1)}%) en estado **Compliant**
- **${nonCompliantAssets} activos** (${((nonCompliantAssets / metrics.totalAssets) * 100).toFixed(1)}%) que requieren atención

${metrics.overallComplianceRate >= 90 
  ? 'Este nivel de cumplimiento indica una **excelente alineación** con los criterios de la Taxonomía Europea, posicionando al portfolio como líder en inversión sostenible.'
  : metrics.overallComplianceRate >= 75
  ? 'Este nivel de cumplimiento refleja una **buena alineación** con la Taxonomía Europea, aunque existen oportunidades de mejora en áreas específicas.'
  : metrics.overallComplianceRate >= 50
  ? 'Este nivel de cumplimiento indica un **cumplimiento parcial** que requiere atención prioritaria y acciones correctivas para alcanzar los estándares de la Taxonomía Europea.'
  : 'Este nivel de cumplimiento refleja un **cumplimiento bajo** que requiere **acciones correctivas inmediatas** y un plan de mejora estructurado para alcanzar la conformidad con la Taxonomía Europea.'}

### Análisis por Objetivo DNSH

**Objetivo con Mayor Cumplimiento**: ${getObjectiveLabel(strongestObjective.objective as DnshObjective)} con ${strongestObjective.percentage.toFixed(1)}% de cumplimiento
${strongestObjective.percentage >= 90 
  ? 'Este objetivo muestra un desempeño excepcional, indicando prácticas robustas y bien establecidas.'
  : strongestObjective.percentage >= 75
  ? 'Este objetivo muestra un buen desempeño, con margen para optimización continua.'
  : 'Aunque es el objetivo con mejor desempeño, aún existe oportunidad de mejora.'}

**Objetivo Requiriendo Mayor Atención**: ${getObjectiveLabel(weakestObjective.objective as DnshObjective)} con ${weakestObjective.percentage.toFixed(1)}% de cumplimiento
${weakestObjective.percentage < 50 
  ? 'Este objetivo requiere **atención prioritaria inmediata** y la implementación de medidas correctivas específicas.'
  : weakestObjective.percentage < 75
  ? 'Este objetivo requiere **mejoras significativas** para alcanzar niveles aceptables de cumplimiento.'
  : 'Este objetivo requiere **optimización continua** para mantener y mejorar el cumplimiento.'}

### Evaluación de Riesgos Climáticos

El análisis de riesgos climáticos revela:

- **${riskDistribution.Low} operaciones** (${((riskDistribution.Low / operations.length) * 100).toFixed(1)}%) con **Riesgo Bajo**
- **${riskDistribution.Moderate} operaciones** (${((riskDistribution.Moderate / operations.length) * 100).toFixed(1)}%) con **Riesgo Moderado**
- **${riskDistribution.High} operaciones** (${((riskDistribution.High / operations.length) * 100).toFixed(1)}%) con **Riesgo Alto**
- **${riskDistribution['Very High']} operaciones** (${((riskDistribution['Very High'] / operations.length) * 100).toFixed(1)}%) con **Riesgo Muy Alto**

${highRiskOps > 0 
  ? `**ALERTA**: Se han identificado **${highRiskOps} operación${highRiskOps !== 1 ? 'es' : ''}** con riesgo alto o muy alto que requieren **medidas de adaptación prioritarias** y monitoreo continuo. Estas operaciones representan un ${((highRiskOps / operations.length) * 100).toFixed(1)}% del portfolio y deben ser objeto de planes de acción inmediatos.`
  : 'No se han identificado operaciones con riesgo alto o muy alto, lo que indica una exposición climática gestionada adecuadamente.'}

### Métricas Financieras

El portfolio representa una inversión significativa:

- **CAPEX Total**: €${(metrics.totalCapex / 1000000).toFixed(1)}M
- **Valor Total del Deal**: €${(metrics.totalDealValue / 1000000).toFixed(1)}M
- **CAPEX Promedio por Activo**: €${(avgCapexPerAsset / 1000000).toFixed(2)}M

${metrics.totalDealValue > metrics.totalCapex 
  ? `El valor del deal (€${(metrics.totalDealValue / 1000000).toFixed(1)}M) supera el CAPEX en un ${(((metrics.totalDealValue - metrics.totalCapex) / metrics.totalCapex) * 100).toFixed(1)}%, indicando una valoración favorable del portfolio.`
  : ''}

### Cobertura de Evidencias

El portfolio cuenta con **${totalEvidence} documentos de evidencia** distribuidos entre las operaciones, con un promedio de **${avgEvidencePerOperation.toFixed(1)} documentos por operación**.

${avgEvidencePerOperation >= 5 
  ? 'La documentación disponible proporciona un **soporte sólido** para las evaluaciones DNSH realizadas.'
  : avgEvidencePerOperation >= 3
  ? 'La documentación disponible proporciona un **soporte adecuado**, aunque se recomienda fortalecer la evidencia en áreas específicas.'
  : 'La documentación disponible es **limitada** y se recomienda fortalecer significativamente la evidencia para respaldar las evaluaciones DNSH.'}

## Conclusiones Ejecutivas

${metrics.overallComplianceRate >= 80 
  ? `El portfolio de ${client.name} demuestra un **alto nivel de cumplimiento DNSH** (${metrics.overallComplianceRate.toFixed(1)}%), posicionándolo favorablemente en el contexto de la Taxonomía Europea. Los esfuerzos continuos de monitoreo y mejora son esenciales para mantener este nivel de excelencia.`
  : `El portfolio de ${client.name} presenta un **cumplimiento DNSH del ${metrics.overallComplianceRate.toFixed(1)}%**, lo que indica la necesidad de implementar medidas correctivas específicas, particularmente en el objetivo de ${getObjectiveLabel(weakestObjective.objective as DnshObjective)}. Se recomienda desarrollar un plan de acción estructurado con plazos definidos para alcanzar niveles de cumplimiento superiores al 80%.`}

${highRiskOps > 0 
  ? `La presencia de ${highRiskOps} operación${highRiskOps !== 1 ? 'es' : ''} de alto riesgo climático requiere **atención inmediata** y la implementación de medidas de adaptación específicas para mitigar la exposición a eventos climáticos extremos.`
  : 'La exposición a riesgos climáticos está adecuadamente gestionada en todo el portfolio.'}

## Próximos Pasos Recomendados

1. **Revisión Detallada**: Analizar en profundidad los ${nonCompliantAssets} activos no compliant para identificar causas raíz
2. **Plan de Acción**: Desarrollar planes de acción específicos para mejorar el cumplimiento en ${getObjectiveLabel(weakestObjective.objective as DnshObjective)}
3. **Medidas de Adaptación**: ${highRiskOps > 0 ? `Implementar medidas de adaptación prioritarias en las ${highRiskOps} operaciones de alto riesgo` : 'Continuar monitoreando y optimizando las medidas de adaptación existentes'}
4. **Fortalecimiento de Evidencias**: ${avgEvidencePerOperation < 5 ? 'Aumentar la documentación de soporte, especialmente en operaciones con menor cobertura' : 'Mantener y actualizar la documentación existente'}
5. **Monitoreo Continuo**: Establecer procesos de revisión periódica para mantener y mejorar el cumplimiento DNSH

---

*Este informe ha sido generado el ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} y refleja el estado actual del portfolio basado en las evaluaciones DNSH disponibles.*
`;
}

/**
 * Enhanced DNSH Compliance Section with detailed analysis
 */
export function generateEnhancedDNSHComplianceSection(
  operations: Operation[],
  objectiveCompliance: Record<DnshObjective, { compliant: number; total: number; percentage: number }>
): string {
  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: '1. Mitigación del Cambio Climático',
    [DnshObjective.ADAPTATION]: '2. Adaptación al Cambio Climático',
    [DnshObjective.WATER]: '3. Uso Sostenible y Protección del Agua y los Recursos Marinos',
    [DnshObjective.CIRCULAR]: '4. Transición hacia una Economía Circular',
    [DnshObjective.POLLUTION]: '5. Prevención y Control de la Contaminación',
    [DnshObjective.BIODIVERSITY]: '6. Protección y Restauración de la Biodiversidad y los Ecosistemas'
  };
  
  const objectiveDescriptions: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'Evalúa si la actividad contribuye significativamente a la mitigación del cambio climático sin causar daño significativo a otros objetivos ambientales.',
    [DnshObjective.ADAPTATION]: 'Evalúa si la actividad contribuye significativamente a la adaptación al cambio climático y si los activos están protegidos contra riesgos climáticos.',
    [DnshObjective.WATER]: 'Evalúa el impacto de la actividad en la calidad y cantidad de recursos hídricos, incluyendo aguas superficiales, subterráneas y marinas.',
    [DnshObjective.CIRCULAR]: 'Evalúa si la actividad promueve la reutilización, reciclaje y eficiencia de recursos, minimizando la generación de residuos.',
    [DnshObjective.POLLUTION]: 'Evalúa si la actividad previene o minimiza la emisión de contaminantes al aire, agua o suelo.',
    [DnshObjective.BIODIVERSITY]: 'Evalúa el impacto de la actividad en la biodiversidad, ecosistemas y servicios ecosistémicos.'
  };
  
  // Analyze each objective in detail
  const detailedAnalysis = Object.entries(objectiveCompliance).map(([objective, stats]) => {
    const obj = objective as DnshObjective;
    const nonCompliant = stats.total - stats.compliant;
    const conditional = 0; // Would need to track this separately
    
    // Find specific assets/operations with issues
    const problematicAssets: string[] = [];
    operations.forEach(op => {
      op.assets.forEach(asset => {
        if (asset.dnshEvaluation) {
          const status = getObjectiveStatusFromAsset(asset.dnshEvaluation, obj);
          if (status === 'Non-Compliant' || status === 'Conditional') {
            problematicAssets.push(`${asset.name} (${op.name})`);
          }
        }
      });
    });
    
    return `### ${objectiveLabels[obj]}

**Descripción del Objetivo**: ${objectiveDescriptions[obj]}

#### Métricas de Cumplimiento

- **Activos Evaluados**: ${stats.total}
- **Activos Compliant**: ${stats.compliant} (${stats.percentage.toFixed(1)}%)
- **Activos No Compliant**: ${nonCompliant} (${(100 - stats.percentage).toFixed(1)}%)
- **Brecha de Cumplimiento**: ${(100 - stats.percentage).toFixed(1)} puntos porcentuales

#### Análisis de Cumplimiento

${stats.percentage >= 90 
  ? `Este objetivo muestra un **desempeño excepcional** con ${stats.percentage.toFixed(1)}% de cumplimiento. Los ${stats.compliant} activos compliant demuestran prácticas alineadas con los requisitos de la Taxonomía Europea. Se recomienda mantener este nivel mediante revisiones periódicas y actualización continua de prácticas.`
  : stats.percentage >= 75
  ? `Este objetivo muestra un **buen desempeño** con ${stats.percentage.toFixed(1)}% de cumplimiento. Aunque la mayoría de los activos cumplen con los requisitos, existen ${nonCompliant} activos que requieren atención para alcanzar niveles óptimos. Se recomienda identificar las causas específicas de no cumplimiento y desarrollar planes de acción dirigidos.`
  : stats.percentage >= 50
  ? `Este objetivo muestra un **cumplimiento parcial** con ${stats.percentage.toFixed(1)}% de cumplimiento. Los ${nonCompliant} activos no compliant representan una proporción significativa que requiere **atención prioritaria**. Se recomienda realizar una evaluación detallada de cada activo no compliant para identificar barreras específicas y desarrollar medidas correctivas estructuradas.`
  : `Este objetivo muestra un **cumplimiento bajo** con ${stats.percentage.toFixed(1)}% de cumplimiento. Los ${nonCompliant} activos no compliant representan la mayoría del portfolio, lo que indica la necesidad de **acciones correctivas inmediatas y comprehensivas**. Se recomienda desarrollar un plan de acción urgente con plazos definidos, asignación de recursos y seguimiento continuo.`}

${problematicAssets.length > 0 
  ? `#### Activos Requiriendo Atención

Los siguientes activos requieren atención específica para este objetivo:
${problematicAssets.slice(0, 10).map(asset => `- ${asset}`).join('\n')}
${problematicAssets.length > 10 ? `\n*Y ${problematicAssets.length - 10} activos adicionales...*` : ''}`
  : ''}

#### Recomendaciones Específicas

${stats.percentage < 75 
  ? `1. **Evaluación Detallada**: Realizar evaluaciones individuales de los ${nonCompliant} activos no compliant para identificar causas raíz específicas
2. **Plan de Acción**: Desarrollar planes de acción por activo con medidas correctivas específicas y plazos definidos
3. **Capacitación**: Proporcionar capacitación sobre requisitos específicos de este objetivo DNSH
4. **Monitoreo**: Establecer indicadores de seguimiento para medir el progreso de las medidas correctivas
5. **Revisión Periódica**: Implementar revisiones trimestrales del cumplimiento para este objetivo`
  : `1. **Mantenimiento**: Continuar con las prácticas actuales que han demostrado efectividad
2. **Optimización**: Identificar oportunidades de mejora continua en los ${nonCompliant} activos restantes
3. **Documentación**: Asegurar que toda la evidencia de cumplimiento esté adecuadamente documentada
4. **Actualización**: Mantenerse informado sobre cambios en regulaciones y mejores prácticas relacionadas con este objetivo`}
`;
  }).join('\n\n');
  
  // Overall analysis
  const overallCompliance = Object.values(objectiveCompliance).reduce((sum, stats) => sum + stats.percentage, 0) / Object.keys(objectiveCompliance).length;
  const objectivesAbove80 = Object.values(objectiveCompliance).filter(stats => stats.percentage >= 80).length;
  const objectivesBelow50 = Object.values(objectiveCompliance).filter(stats => stats.percentage < 50).length;
  
  return `# Evaluación Detallada de Cumplimiento DNSH

## Resumen General

El análisis del cumplimiento DNSH abarca los seis objetivos ambientales establecidos en la Taxonomía Europea de Actividades Sostenibles. El cumplimiento promedio general es del **${overallCompliance.toFixed(1)}%**, con ${objectivesAbove80} objetivo${objectivesAbove80 !== 1 ? 's' : ''} mostrando cumplimiento superior al 80% y ${objectivesBelow50} objetivo${objectivesBelow50 !== 1 ? 's' : ''} requiriendo atención prioritaria (cumplimiento inferior al 50%).

${objectivesBelow50 > 0 
  ? `**ALERTA**: ${objectivesBelow50} objetivo${objectivesBelow50 !== 1 ? 's' : ''} presenta${objectivesBelow50 === 1 ? '' : 'n'} cumplimiento inferior al 50%, lo que requiere **acción inmediata** para evitar impactos significativos en la elegibilidad del portfolio bajo la Taxonomía Europea.`
  : ''}

## Análisis por Objetivo DNSH

${detailedAnalysis}

## Conclusiones y Prioridades

### Objetivos con Mayor Desempeño

Los objetivos con mayor cumplimiento demuestran prácticas robustas y bien establecidas. Se recomienda:
- Documentar y replicar las mejores prácticas identificadas
- Compartir conocimiento entre operaciones
- Mantener el nivel de cumplimiento mediante revisiones periódicas

### Objetivos Requiriendo Atención Prioritaria

Los objetivos con menor cumplimiento requieren atención inmediata. Las acciones prioritarias incluyen:
- Evaluación detallada de causas raíz
- Desarrollo de planes de acción específicos con plazos definidos
- Asignación de recursos adecuados para implementación
- Monitoreo continuo del progreso

### Estrategia de Mejora Continua

Se recomienda establecer un proceso estructurado de mejora continua que incluya:
1. **Evaluación Trimestral**: Revisión periódica del cumplimiento por objetivo
2. **Benchmarking**: Comparación con mejores prácticas del sector
3. **Capacitación Continua**: Actualización de conocimientos sobre requisitos DNSH
4. **Trazabilidad**: Sistema robusto de seguimiento de medidas correctivas
5. **Comunicación**: Reportes regulares a stakeholders sobre progreso

---

*Este análisis se basa en las evaluaciones DNSH disponibles al ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}.*
`;
}

function getObjectiveLabel(objective: DnshObjective): string {
  const labels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'Mitigación del Cambio Climático',
    [DnshObjective.ADAPTATION]: 'Adaptación al Cambio Climático',
    [DnshObjective.WATER]: 'Uso Sostenible del Agua',
    [DnshObjective.CIRCULAR]: 'Economía Circular',
    [DnshObjective.POLLUTION]: 'Prevención de la Contaminación',
    [DnshObjective.BIODIVERSITY]: 'Biodiversidad y Ecosistemas'
  };
  return labels[objective];
}
