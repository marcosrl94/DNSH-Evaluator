/**
 * Advanced Reporting Service
 * 
 * Provides comprehensive reporting capabilities across all abstraction levels:
 * - Company (Client) level
 * - Portfolio (Operation) level  
 * - Asset level
 * 
 * Aggregates DNSH evaluations, evidence, risk assessments, and financial metrics
 */

import { Client, Operation, Asset, DnshObjective, EvidenceDocument, RiskBand, AssetDnshEvaluation } from '../types';
import { getAllMeasures } from '../constants/extendedMeasures';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { generateEnhancedExecutiveSummary, generateEnhancedDNSHComplianceSection } from './reportingServiceEnhanced';

// Report aggregation levels
export enum ReportLevel {
  COMPANY = 'company',
  PORTFOLIO = 'portfolio',
  ASSET = 'asset'
}

// Report section types
export enum ReportSectionType {
  EXECUTIVE_SUMMARY = 'executive_summary',
  DNSH_COMPLIANCE = 'dnsh_compliance',
  RISK_ASSESSMENT = 'risk_assessment',
  EVIDENCE_REVIEW = 'evidence_review',
  FINANCIAL_METRICS = 'financial_metrics',
  GEOGRAPHIC_ANALYSIS = 'geographic_analysis',
  METHODOLOGY = 'methodology',
  APPENDICES = 'appendices',
  RECOMMENDATIONS = 'recommendations'
}

export interface ReportSection {
  id: string;
  type: ReportSectionType;
  title: string;
  content: string;
  editable: boolean;
  metadata?: {
    lastModified?: string;
    modifiedBy?: string;
    version?: number;
    aiGenerated?: boolean;
    evidenceReferences?: string[];
  };
}

export interface CompanyLevelReport {
  clientId: string;
  clientName: string;
  reportDate: string;
  sections: ReportSection[];
  metrics: {
    totalOperations: number;
    totalAssets: number;
    totalCapex: number;
    totalDealValue: number;
    overallComplianceRate: number;
    objectiveCompliance: Record<DnshObjective, {
      compliant: number;
      total: number;
      percentage: number;
    }>;
    riskDistribution: Record<RiskBand, number>;
    evidenceCount: number;
    highRiskOperations: number;
  };
  operations: Operation[];
}

export interface PortfolioLevelReport {
  operationId: string;
  operationName: string;
  reportDate: string;
  sections: ReportSection[];
  metrics: {
    totalAssets: number;
    totalCapex: number;
    overallComplianceRate: number;
    objectiveCompliance: Record<DnshObjective, {
      status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
      compliantAssets: number;
      totalAssets: number;
      percentage: number;
    }>;
    riskBand?: RiskBand;
    totalAAL?: number;
    evidenceCount: number;
    missingEvidenceCount: number;
  };
  assets: Asset[];
  evidenceDocuments: EvidenceDocument[];
}

export interface AssetLevelReport {
  assetId: string;
  assetName: string;
  reportDate: string;
  sections: ReportSection[];
  metrics: {
    exposedValue: number;
    overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
    objectiveStatus: Record<DnshObjective, 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed'>;
    riskBand?: RiskBand;
    evidenceCount: number;
    adaptationMeasuresCount: number;
  };
  asset: Asset;
  evidenceDocuments: EvidenceDocument[];
}

/**
 * Generate company-level report aggregating all operations and assets
 */
export const generateCompanyReport = (
  client: Client,
  operations: Operation[]
): CompanyLevelReport => {
  const clientOperations = operations.filter(op => op.clientId === client.id);
  
  // Calculate aggregated metrics
  let totalAssets = 0;
  let compliantAssets = 0;
  let totalCapex = 0;
  let totalDealValue = 0;
  let totalEvidenceCount = 0;
  let highRiskOperations = 0;
  
  const objectiveCompliance: Record<DnshObjective, { compliant: number; total: number }> = {
    [DnshObjective.MITIGATION]: { compliant: 0, total: 0 },
    [DnshObjective.ADAPTATION]: { compliant: 0, total: 0 },
    [DnshObjective.WATER]: { compliant: 0, total: 0 },
    [DnshObjective.CIRCULAR]: { compliant: 0, total: 0 },
    [DnshObjective.POLLUTION]: { compliant: 0, total: 0 },
    [DnshObjective.BIODIVERSITY]: { compliant: 0, total: 0 },
  };
  
  const riskDistribution: Record<RiskBand, number> = {
    'Low': 0,
    'Moderate': 0,
    'High': 0,
    'Very High': 0,
  };
  
  clientOperations.forEach(operation => {
    totalCapex += operation.capex;
    totalDealValue += operation.dealPrice || operation.capex;
    totalEvidenceCount += operation.evidenceDocuments?.length || 0;
    
    if (operation.maxRiskBand) {
      riskDistribution[operation.maxRiskBand]++;
      if (operation.maxRiskBand === 'High' || operation.maxRiskBand === 'Very High') {
        highRiskOperations++;
      }
    }
    
    operation.assets.forEach(asset => {
      totalAssets++;
      
      if (asset.dnshEvaluation) {
        const evaluation = asset.dnshEvaluation;
        
        if (evaluation.overallStatus === 'Compliant') {
          compliantAssets++;
        }
        
        // Aggregate objective compliance
        Object.values(DnshObjective).forEach(objective => {
          objectiveCompliance[objective].total++;
          const status = getObjectiveStatusFromAsset(evaluation, objective);
          if (status === 'Compliant') {
            objectiveCompliance[objective].compliant++;
          }
        });
      }
    });
  });
  
  // Calculate percentage for objective compliance
  const objectiveComplianceWithPercentage = Object.fromEntries(
    Object.entries(objectiveCompliance).map(([key, value]) => [
      key,
      {
        ...value,
        percentage: value.total > 0 ? (value.compliant / value.total) * 100 : 0
      }
    ])
  ) as Record<DnshObjective, { compliant: number; total: number; percentage: number }>;
  
  // Generate sections with enhanced content
  const sections: ReportSection[] = [
    generateExecutiveSummary(client, clientOperations, {
      totalAssets,
      compliantAssets,
      totalCapex,
      totalDealValue,
      overallComplianceRate: totalAssets > 0 ? (compliantAssets / totalAssets) * 100 : 0
    }, objectiveComplianceWithPercentage, riskDistribution),
    generateDNSHComplianceSection(clientOperations, objectiveComplianceWithPercentage),
    generateRiskAssessmentSection(clientOperations, riskDistribution),
    generateEvidenceReviewSection(clientOperations),
    generateFinancialMetricsSection(clientOperations, { totalCapex, totalDealValue }),
    generateRecommendationsSection(clientOperations, objectiveComplianceWithPercentage, riskDistribution)
  ];
  
  return {
    clientId: client.id,
    clientName: client.name || 'Unknown Client',
    reportDate: new Date().toISOString(),
    sections,
    metrics: {
      totalOperations: clientOperations.length,
      totalAssets,
      totalCapex,
      totalDealValue,
      overallComplianceRate: totalAssets > 0 ? (compliantAssets / totalAssets) * 100 : 0,
      objectiveCompliance: Object.fromEntries(
        Object.entries(objectiveCompliance).map(([key, value]) => [
          key,
          {
            ...value,
            percentage: value.total > 0 ? (value.compliant / value.total) * 100 : 0
          }
        ])
      ) as Record<DnshObjective, { compliant: number; total: number; percentage: number }>,
      riskDistribution,
      evidenceCount: totalEvidenceCount,
      highRiskOperations
    },
    operations: clientOperations
  };
};

/**
 * Generate portfolio-level report for a specific operation
 */
export const generatePortfolioReport = (operation: Operation): PortfolioLevelReport => {
  const totalAssets = operation.assets.length;
  let compliantAssets = 0;
  const objectiveCompliance: Record<DnshObjective, {
    status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
    compliantAssets: number;
    totalAssets: number;
  }> = {
    [DnshObjective.MITIGATION]: { status: 'Not Assessed', compliantAssets: 0, totalAssets: 0 },
    [DnshObjective.ADAPTATION]: { status: 'Not Assessed', compliantAssets: 0, totalAssets: 0 },
    [DnshObjective.WATER]: { status: 'Not Assessed', compliantAssets: 0, totalAssets: 0 },
    [DnshObjective.CIRCULAR]: { status: 'Not Assessed', compliantAssets: 0, totalAssets: 0 },
    [DnshObjective.POLLUTION]: { status: 'Not Assessed', compliantAssets: 0, totalAssets: 0 },
    [DnshObjective.BIODIVERSITY]: { status: 'Not Assessed', compliantAssets: 0, totalAssets: 0 },
  };
  
  let missingEvidenceCount = 0;
  
  // Analyze each objective
  Object.values(DnshObjective).forEach(objective => {
    let compliant = 0;
    let hasNonCompliant = false;
    let hasConditional = false;
    
    operation.assets.forEach(asset => {
      if (asset.dnshEvaluation) {
        const status = getObjectiveStatusFromAsset(asset.dnshEvaluation, objective);
        if (status === 'Compliant') {
          compliant++;
        } else if (status === 'Non-Compliant') {
          hasNonCompliant = true;
        } else if (status === 'Conditional') {
          hasConditional = true;
        }
      } else {
        missingEvidenceCount++;
      }
    });
    
    let overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
    if (compliant === totalAssets && totalAssets > 0) {
      overallStatus = 'Compliant';
    } else if (hasNonCompliant) {
      overallStatus = 'Non-Compliant';
    } else if (hasConditional) {
      overallStatus = 'Conditional';
    } else {
      overallStatus = 'Not Assessed';
    }
    
    objectiveCompliance[objective] = {
      status: overallStatus,
      compliantAssets: compliant,
      totalAssets
    };
    
    if (overallStatus === 'Compliant') {
      compliantAssets++;
    }
  });
  
  const sections: ReportSection[] = [
    generateExecutiveSummaryForPortfolio(operation, {
      totalAssets,
      compliantAssets,
      overallComplianceRate: totalAssets > 0 ? (compliantAssets / totalAssets) * 100 : 0
    }),
    generateDNSHComplianceSectionForPortfolio(operation, objectiveCompliance),
    generateRiskAssessmentSectionForPortfolio(operation),
    generateEvidenceReviewSectionForPortfolio(operation),
    generateGeographicAnalysisSectionForPortfolio(operation),
    generateRecommendationsSectionForPortfolio(operation)
  ];
  
  return {
    operationId: operation.id,
    operationName: operation.name,
    reportDate: new Date().toISOString(),
    sections,
    metrics: {
      totalAssets,
      totalCapex: operation.capex,
      overallComplianceRate: totalAssets > 0 ? (compliantAssets / totalAssets) * 100 : 0,
      objectiveCompliance: Object.fromEntries(
        Object.entries(objectiveCompliance).map(([key, value]) => [
          key,
          {
            ...value,
            percentage: value.totalAssets > 0 ? (value.compliantAssets / value.totalAssets) * 100 : 0
          }
        ])
      ) as Record<DnshObjective, {
        status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
        compliantAssets: number;
        totalAssets: number;
        percentage: number;
      }>,
      riskBand: operation.maxRiskBand,
      totalAAL: operation.totalAAL,
      evidenceCount: operation.evidenceDocuments?.length || 0,
      missingEvidenceCount
    },
    assets: operation.assets,
    evidenceDocuments: operation.evidenceDocuments || []
  };
};

/**
 * Generate asset-level report for a specific asset
 */
export const generateAssetReport = (asset: Asset, operation: Operation): AssetLevelReport => {
  const evaluation = asset.dnshEvaluation;
  const evidenceDocuments = (operation.evidenceDocuments || []).filter(
    ev => !ev.assetId || ev.assetId === asset.id
  );
  
  const objectiveStatus: Record<DnshObjective, 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed'> = {
    [DnshObjective.MITIGATION]: evaluation?.mitigationStatus || 'Not Assessed',
    [DnshObjective.ADAPTATION]: evaluation?.adaptationStatus || 'Not Assessed',
    [DnshObjective.WATER]: evaluation?.waterStatus || 'Not Assessed',
    [DnshObjective.CIRCULAR]: evaluation?.circularStatus || 'Not Assessed',
    [DnshObjective.POLLUTION]: evaluation?.pollutionStatus || 'Not Assessed',
    [DnshObjective.BIODIVERSITY]: evaluation?.biodiversityStatus || 'Not Assessed',
  };
  
  const sections: ReportSection[] = [
    generateExecutiveSummaryForAsset(asset, operation, evaluation),
    generateDNSHComplianceSectionForAsset(asset, evaluation, objectiveStatus),
    generateRiskAssessmentSectionForAsset(asset, evaluation),
    generateEvidenceReviewSectionForAsset(asset, evidenceDocuments),
    generateRecommendationsSectionForAsset(asset, evaluation)
  ];
  
  return {
    assetId: asset.id,
    assetName: asset.name,
    reportDate: new Date().toISOString(),
    sections,
    metrics: {
      exposedValue: asset.exposedValue,
      overallStatus: evaluation?.overallStatus || 'Not Assessed',
      objectiveStatus,
      riskBand: evaluation?.adaptationRiskBand,
      evidenceCount: evidenceDocuments.length,
      adaptationMeasuresCount: evaluation?.adaptationMeasures?.length || 0
    },
    asset,
    evidenceDocuments
  };
};

// Section generators - Enhanced versions
function generateExecutiveSummary(
  client: Client,
  operations: Operation[],
  metrics: { totalAssets: number; compliantAssets: number; totalCapex: number; totalDealValue: number; overallComplianceRate: number },
  objectiveCompliance?: Record<DnshObjective, { compliant: number; total: number; percentage: number }>,
  riskDistribution?: Record<RiskBand, number>
): ReportSection {
  // Use enhanced version if additional data available
  if (objectiveCompliance && riskDistribution) {
    const content = generateEnhancedExecutiveSummary(client, operations, metrics, objectiveCompliance, riskDistribution);
    return {
      id: 'exec-summary-company',
      type: ReportSectionType.EXECUTIVE_SUMMARY,
      title: 'Resumen Ejecutivo',
      content,
      editable: true,
      metadata: {
        lastModified: new Date().toISOString(),
        aiGenerated: true
      }
    };
  }
  
  // Fallback to basic version
  const content = `# Resumen Ejecutivo - ${client.name}

## Información General
La compañía ${client.name}${client.country ? ` con sede en ${client.country}` : ''} gestiona un portfolio de ${operations.length} operaciones que comprenden un total de ${metrics.totalAssets} activos.

## Métricas Clave
- **Total de Activos**: ${metrics.totalAssets}
- **Activos Compliant**: ${metrics.compliantAssets} (${metrics.overallComplianceRate.toFixed(1)}%)
- **CAPEX Total**: €${(metrics.totalCapex / 1000000).toFixed(1)}M
- **Valor Total del Deal**: €${(metrics.totalDealValue / 1000000).toFixed(1)}M

## Estado de Cumplimiento DNSH
El portfolio muestra un nivel de cumplimiento DNSH del ${metrics.overallComplianceRate.toFixed(1)}%, lo que indica ${metrics.overallComplianceRate >= 80 ? 'un alto nivel de alineamiento con la Taxonomía Europea' : metrics.overallComplianceRate >= 50 ? 'un cumplimiento parcial que requiere atención' : 'un cumplimiento bajo que requiere acciones correctivas inmediatas'}.

## Operaciones Incluidas
${operations.map(op => `- ${op.name}: ${op.assets.length} activos, ${op.country}`).join('\n')}
`;

  return {
    id: 'exec-summary-company',
    type: ReportSectionType.EXECUTIVE_SUMMARY,
    title: 'Resumen Ejecutivo',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

function generateDNSHComplianceSection(
  operations: Operation[],
  objectiveCompliance: Record<DnshObjective, { compliant: number; total: number; percentage?: number }>
): ReportSection {
  // Use enhanced version if available
  if (objectiveCompliance[Object.keys(objectiveCompliance)[0] as DnshObjective].percentage !== undefined) {
    try {
      const content = generateEnhancedDNSHComplianceSection(operations, objectiveCompliance as Record<DnshObjective, { compliant: number; total: number; percentage: number }>);
      return {
        id: 'dnsh-compliance-company',
        type: ReportSectionType.DNSH_COMPLIANCE,
        title: 'Cumplimiento DNSH',
        content,
        editable: true,
        metadata: {
          lastModified: new Date().toISOString(),
          aiGenerated: true
        }
      };
    } catch (error) {
      // Fallback to basic version if enhanced fails
    }
  }
  
  // Basic version
  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: '1. Mitigación Cambio Climático',
    [DnshObjective.ADAPTATION]: '2. Adaptación Cambio Climático',
    [DnshObjective.WATER]: '3. Uso Sostenible del Agua',
    [DnshObjective.CIRCULAR]: '4. Economía Circular',
    [DnshObjective.POLLUTION]: '5. Prevención de la Contaminación',
    [DnshObjective.BIODIVERSITY]: '6. Biodiversidad y Ecosistemas'
  };
  
  const content = `# Cumplimiento Objetivos DNSH

## Resumen por Objetivo

${Object.entries(objectiveCompliance).map(([objective, stats]) => {
  const percentage = stats.percentage !== undefined ? stats.percentage : (stats.total > 0 ? (stats.compliant / stats.total) * 100 : 0);
  return `### ${objectiveLabels[objective as DnshObjective]}
- **Activos Compliant**: ${stats.compliant} / ${stats.total}
- **Tasa de Cumplimiento**: ${percentage.toFixed(1)}%
- **Estado**: ${percentage >= 80 ? '✅ Alto cumplimiento' : percentage >= 50 ? '⚠️ Cumplimiento parcial' : '❌ Cumplimiento bajo'}
`;
}).join('\n')}

## Análisis Detallado
Los objetivos con mayor tasa de cumplimiento requieren mantenimiento continuo, mientras que aquellos con menor cumplimiento necesitan atención prioritaria y medidas correctivas.
`;

  return {
    id: 'dnsh-compliance-company',
    type: ReportSectionType.DNSH_COMPLIANCE,
    title: 'Cumplimiento DNSH',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

function generateRiskAssessmentSection(
  operations: Operation[],
  riskDistribution: Record<RiskBand, number>
): ReportSection {
  const totalOperations = operations.length;
  const highRiskOps = riskDistribution.High + riskDistribution['Very High'];
  
  // Enhanced risk analysis
  const highRiskOperations = operations.filter(op => 
    op.maxRiskBand === 'High' || op.maxRiskBand === 'Very High'
  );
  
  const totalAAL = operations.reduce((sum, op) => sum + (op.totalAAL || 0), 0);
  const avgAALPerOperation = totalOperations > 0 ? totalAAL / totalOperations : 0;
  
  const content = `# Evaluación Detallada de Riesgos Climáticos

## Resumen Ejecutivo de Riesgos

El análisis de riesgos climáticos del portfolio revela una distribución heterogénea de exposición a eventos climáticos extremos. De las ${totalOperations} operaciones evaluadas:

- **${riskDistribution.Low} operaciones** (${((riskDistribution.Low / totalOperations) * 100).toFixed(1)}%) presentan **Riesgo Bajo**
- **${riskDistribution.Moderate} operaciones** (${((riskDistribution.Moderate / totalOperations) * 100).toFixed(1)}%) presentan **Riesgo Moderado**
- **${riskDistribution.High} operaciones** (${((riskDistribution.High / totalOperations) * 100).toFixed(1)}%) presentan **Riesgo Alto**
- **${riskDistribution['Very High']} operaciones** (${((riskDistribution['Very High'] / totalOperations) * 100).toFixed(1)}%) presentan **Riesgo Muy Alto**

## Análisis de Exposición Financiera

${totalAAL > 0 
  ? `El análisis de pérdidas anuales promedio (AAL) indica una exposición financiera total de **€${(totalAAL / 1000000).toFixed(2)}M anuales**, con un promedio de **€${(avgAALPerOperation / 1000000).toFixed(2)}M por operación**.

${totalAAL > 10000000 
  ? '**ALERTA**: La exposición financiera es significativa y requiere medidas de mitigación inmediatas para proteger el valor del portfolio.'
  : 'La exposición financiera está dentro de niveles gestionables, aunque se recomienda monitoreo continuo.'}`
  : 'No se dispone de datos de pérdidas anuales promedio (AAL) para todas las operaciones. Se recomienda completar esta evaluación para una comprensión completa del riesgo financiero.'}

## Operaciones de Alto Riesgo - Análisis Detallado

${highRiskOps > 0 
  ? `### Identificación de Operaciones Críticas

Se han identificado **${highRiskOps} operación${highRiskOps !== 1 ? 'es' : ''}** con riesgo alto o muy alto que requieren **atención prioritaria inmediata**:

${highRiskOperations.slice(0, 5).map(op => {
  const riskLevel = op.maxRiskBand === 'Very High' ? 'MUY ALTO' : 'ALTO';
  const aalInfo = op.totalAAL ? ` (AAL: €${(op.totalAAL / 1000000).toFixed(2)}M)` : '';
  return `- **${op.name}** (${op.country}): Riesgo ${riskLevel}${aalInfo}
  - Activos afectados: ${op.assets.length}
  - CAPEX: €${(op.capex / 1000000).toFixed(1)}M
  - Medidas de adaptación requeridas: ${op.assets.some(a => a.dnshEvaluation?.adaptationMeasures && a.dnshEvaluation.adaptationMeasures.length > 0) ? 'Parcialmente implementadas' : 'Pendientes de implementación'}`;
}).join('\n\n')}

${highRiskOperations.length > 5 ? `\n*Y ${highRiskOperations.length - 5} operación${highRiskOperations.length - 5 !== 1 ? 'es' : ''} adicional${highRiskOperations.length - 5 !== 1 ? 'es' : ''}...*` : ''}

### Impacto en el Portfolio

Las operaciones de alto riesgo representan:
- **${((highRiskOps / totalOperations) * 100).toFixed(1)}% del total de operaciones**
- **CAPEX total de €${(highRiskOperations.reduce((sum, op) => sum + op.capex, 0) / 1000000).toFixed(1)}M**
- **${highRiskOperations.reduce((sum, op) => sum + op.assets.length, 0)} activos** expuestos a riesgos climáticos significativos

### Medidas de Adaptación Requeridas

Para cada operación de alto riesgo se recomienda:

1. **Evaluación Inmediata**: Realizar evaluación detallada de vulnerabilidades específicas
2. **Plan de Adaptación**: Desarrollar plan de adaptación con medidas específicas y cronograma
3. **Implementación Prioritaria**: Ejecutar medidas de adaptación de mayor impacto en los primeros 90 días
4. **Monitoreo Continuo**: Establecer sistema de monitoreo de riesgos climáticos en tiempo real
5. **Revisión Periódica**: Actualizar evaluaciones de riesgo anualmente o tras eventos climáticos significativos`
  : `### Estado de Riesgo Favorable

**No se han identificado operaciones con riesgo alto o muy alto**, lo que indica que la exposición climática del portfolio está adecuadamente gestionada. Esto refleja:

- Ubicaciones geográficas con menor exposición a eventos climáticos extremos
- Medidas de adaptación efectivas implementadas
- Evaluaciones de riesgo adecuadas y actualizadas

Se recomienda mantener este nivel mediante:
- Monitoreo continuo de cambios en patrones climáticos
- Actualización periódica de evaluaciones de riesgo
- Revisión de medidas de adaptación existentes`}

## Tipos de Riesgos Identificados

Basado en las evaluaciones realizadas, los principales tipos de riesgos climáticos identificados incluyen:

${operations.some(op => op.assets.some(a => a.attributes?.distanceToCoastKm && a.attributes.distanceToCoastKm < 10))
  ? '- **Riesgo de Inundación Costera**: Activos ubicados cerca de la costa (<10km) están expuestos a riesgo de inundación por aumento del nivel del mar y marejadas ciclónicas'
  : ''}
${operations.some(op => op.assets.some(a => a.attributes?.elevationMeters && a.attributes.elevationMeters < 50))
  ? '- **Riesgo de Inundación Fluvial**: Activos en elevaciones bajas están expuestos a riesgo de inundación por eventos de precipitación extrema'
  : ''}
${operations.some(op => op.assets.some(a => a.attributes?.waterDependency === 'High'))
  ? '- **Riesgo de Escasez Hídrica**: Activos con alta dependencia del agua están expuestos a riesgo de disponibilidad hídrica reducida'
  : ''}
- **Riesgo de Temperatura Extrema**: Exposición a olas de calor y eventos de temperatura extrema que pueden afectar operaciones y activos
- **Riesgo de Eventos Meteorológicos Extremos**: Exposición a tormentas, vientos fuertes y otros eventos meteorológicos extremos

## Recomendaciones Estratégicas

### Para Operaciones de Alto Riesgo

${highRiskOps > 0 
  ? `1. **Acción Inmediata** (0-30 días):
   - Completar evaluaciones de vulnerabilidad detalladas
   - Identificar medidas de adaptación de implementación rápida
   - Establecer sistema de alerta temprana

2. **Implementación Prioritaria** (30-90 días):
   - Ejecutar medidas de adaptación de mayor impacto
   - Asignar presupuesto específico para adaptación
   - Establecer monitoreo continuo

3. **Planificación Estratégica** (90-180 días):
   - Desarrollar planes de adaptación comprehensivos
   - Integrar adaptación en estrategia de operación
   - Establecer procesos de revisión periódica`
  : `1. **Mantenimiento**: Continuar con las prácticas actuales que han demostrado efectividad
2. **Optimización**: Identificar oportunidades de mejora continua en gestión de riesgos
3. **Preparación**: Mantener capacidad de respuesta ante cambios en patrones climáticos
4. **Innovación**: Explorar nuevas tecnologías y prácticas de adaptación climática`}

### Para Todo el Portfolio

1. **Monitoreo Continuo**: Establecer sistema de monitoreo de riesgos climáticos con actualizaciones trimestrales
2. **Actualización de Evaluaciones**: Revisar y actualizar evaluaciones de riesgo anualmente o tras eventos significativos
3. **Capacitación**: Desarrollar capacidades internas en evaluación y gestión de riesgos climáticos
4. **Integración**: Incorporar consideraciones de riesgo climático en decisiones de inversión y operación
5. **Comunicación**: Establecer comunicación regular con stakeholders sobre gestión de riesgos climáticos

## Métricas de Seguimiento

Se recomienda establecer las siguientes métricas para monitorear la efectividad de las medidas de adaptación:

- **Reducción de Riesgo**: Medir reducción en número de operaciones de alto riesgo
- **Reducción de AAL**: Monitorear reducción en pérdidas anuales promedio
- **Implementación de Medidas**: Seguimiento de medidas de adaptación implementadas vs. planificadas
- **Efectividad**: Evaluar efectividad de medidas implementadas en reducción de vulnerabilidad
- **Cobertura**: Medir porcentaje de activos con evaluaciones de riesgo actualizadas

---

*Esta evaluación se basa en los datos disponibles al ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} y debe actualizarse periódicamente para reflejar cambios en el portfolio y nuevos datos climáticos.*
`;

  return {
    id: 'risk-assessment-company',
    type: ReportSectionType.RISK_ASSESSMENT,
    title: 'Evaluación de Riesgos',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

function generateEvidenceReviewSection(operations: Operation[]): ReportSection {
  const allEvidence = operations.flatMap(op => op.evidenceDocuments || []);
  const evidenceByType = allEvidence.reduce((acc, ev) => {
    acc[ev.type] = (acc[ev.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const content = `# Revisión de Evidencias

## Resumen de Documentación
- **Total de Documentos**: ${allEvidence.length}
- **Documentos por Tipo**:
${Object.entries(evidenceByType).map(([type, count]) => `  - ${type}: ${count}`).join('\n')}

## Cobertura de Evidencias
${allEvidence.length > 0 ? 'La documentación proporcionada cubre los diferentes objetivos DNSH y proporciona soporte para las evaluaciones realizadas.' : 'Se requiere cargar más documentación de soporte para las evaluaciones DNSH.'}
`;

  return {
    id: 'evidence-review-company',
    type: ReportSectionType.EVIDENCE_REVIEW,
    title: 'Revisión de Evidencias',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true,
      evidenceReferences: allEvidence.map(ev => ev.id)
    }
  };
}

function generateFinancialMetricsSection(
  operations: Operation[],
  metrics: { totalCapex: number; totalDealValue: number }
): ReportSection {
  const content = `# Métricas Financieras

## Resumen Financiero
- **CAPEX Total**: €${(metrics.totalCapex / 1000000).toFixed(1)}M
- **Valor Total del Deal**: €${(metrics.totalDealValue / 1000000).toFixed(1)}M

## Análisis
El portfolio representa una inversión significativa con un valor total de deal de €${(metrics.totalDealValue / 1000000).toFixed(1)}M.
`;

  return {
    id: 'financial-metrics-company',
    type: ReportSectionType.FINANCIAL_METRICS,
    title: 'Métricas Financieras',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
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

function generateRecommendationsSection(
  operations: Operation[],
  objectiveCompliance?: Record<DnshObjective, { compliant: number; total: number; percentage: number }>,
  riskDistribution?: Record<RiskBand, number>
): ReportSection {
  // Enhanced recommendations based on actual data
  let content = `# Recomendaciones Estratégicas y Acciones Prioritarias

## Análisis de Situación Actual

`;
  
  if (objectiveCompliance && riskDistribution) {
    const overallCompliance = Object.values(objectiveCompliance).reduce((sum, stats) => sum + stats.percentage, 0) / Object.keys(objectiveCompliance).length;
    const objectivesBelow50 = Object.values(objectiveCompliance).filter(stats => stats.percentage < 50).length;
    const highRiskOps = riskDistribution.High + riskDistribution['Very High'];
    
    content += `El análisis del portfolio revela un cumplimiento promedio del ${overallCompliance.toFixed(1)}% con ${objectivesBelow50} objetivo${objectivesBelow50 !== 1 ? 's' : ''} requiriendo atención prioritaria y ${highRiskOps} operación${highRiskOps !== 1 ? 'es' : ''} con riesgo climático alto o muy alto.

`;
    
    // Priority actions based on data
    content += `## Acciones Prioritarias (Corto Plazo - 0-3 meses)

`;
    
    if (objectivesBelow50 > 0) {
      const weakestObjectives = Object.entries(objectiveCompliance)
        .filter(([_, stats]) => stats.percentage < 50)
        .sort((a, b) => a[1].percentage - b[1].percentage)
        .slice(0, 2);
      
      content += `### 1. Abordar Objetivos DNSH Críticos

**Prioridad ALTA**: ${weakestObjectives.length} objetivo${weakestObjectives.length !== 1 ? 's' : ''} con cumplimiento inferior al 50% requiere acción inmediata:

${weakestObjectives.map(([obj, stats]) => {
  const objLabel = getObjectiveLabel(obj as DnshObjective);
  return `- **${objLabel}** (${stats.percentage.toFixed(1)}% cumplimiento): 
  - Realizar evaluación detallada de los ${stats.total - stats.compliant} activos no compliant
  - Identificar causas raíz específicas por activo
  - Desarrollar planes de acción con plazos de 30, 60 y 90 días
  - Asignar responsables y recursos específicos
  - Establecer indicadores de seguimiento`;
}).join('\n\n')}

`;
    }
    
    if (highRiskOps > 0) {
      content += `### 2. Implementar Medidas de Adaptación en Operaciones de Alto Riesgo

**Prioridad ALTA**: ${highRiskOps} operación${highRiskOps !== 1 ? 'es' : ''} con riesgo climático alto o muy alto:

- Identificar medidas de adaptación específicas por operación
- Priorizar medidas con mayor impacto en reducción de riesgo
- Establecer cronograma de implementación con hitos de 30 días
- Asignar presupuesto específico para medidas de adaptación
- Implementar sistema de monitoreo de efectividad

`;
    }
    
    content += `### 3. Fortalecer Documentación de Evidencias

- Revisar cobertura de evidencias por objetivo DNSH
- Identificar gaps en documentación requerida
- Establecer proceso de recopilación sistemática
- Implementar sistema de gestión documental centralizado
- Capacitar equipos en requisitos de documentación

`;
    
    content += `## Acciones Estratégicas (Mediano Plazo - 3-6 meses)

### 4. Establecer Proceso de Mejora Continua

- Implementar revisiones trimestrales de cumplimiento DNSH
- Desarrollar dashboard de seguimiento de métricas clave
- Establecer comité de revisión DNSH con representación multidisciplinaria
- Crear biblioteca de mejores prácticas y lecciones aprendidas
- Establecer benchmarking con estándares del sector

### 5. Optimización de Objetivos con Buen Desempeño

Los objetivos con cumplimiento superior al 80% pueden optimizarse aún más:

${Object.entries(objectiveCompliance)
  .filter(([_, stats]) => stats.percentage >= 80)
  .map(([obj, stats]) => {
    const objLabel = getObjectiveLabel(obj as DnshObjective);
    return `- **${objLabel}** (${stats.percentage.toFixed(1)}%): 
  - Documentar y replicar mejores prácticas identificadas
  - Compartir conocimiento entre operaciones
  - Identificar oportunidades de mejora incremental
  - Establecer objetivos de excelencia (95%+)`;
  }).join('\n\n')}

`;
    
    content += `## Acciones de Largo Plazo (6-12 meses)

### 6. Transformación hacia Excelencia DNSH

- Establecer objetivo de cumplimiento del 95%+ en todos los objetivos
- Desarrollar capacidades internas de evaluación DNSH
- Integrar DNSH en procesos de toma de decisiones de inversión
- Establecer alianzas estratégicas para compartir mejores prácticas
- Desarrollar capacidades de innovación en sostenibilidad

### 7. Monitoreo y Reporte Continuo

- Implementar sistema de reporte automático de cumplimiento
- Establecer comunicación regular con stakeholders sobre progreso DNSH
- Desarrollar capacidades de análisis predictivo de riesgos
- Integrar DNSH en estrategia corporativa de sostenibilidad
- Preparar para futuras regulaciones y estándares

`;
    
    content += `## Métricas de Éxito

Para medir el progreso de las recomendaciones, se recomienda establecer las siguientes métricas:

- **Cumplimiento DNSH General**: Objetivo de ${overallCompliance < 80 ? 'alcanzar 80%+' : 'mantener 90%+'} en 6 meses
- **Objetivos Críticos**: Reducir número de objetivos con cumplimiento <50% a cero en 3 meses
- **Riesgo Climático**: Reducir operaciones de alto riesgo en ${highRiskOps > 0 ? '50%' : 'mantener en cero'} en 6 meses
- **Evidencias**: Aumentar cobertura de evidencias a 100% de activos evaluados
- **Tiempo de Respuesta**: Reducir tiempo de implementación de medidas correctivas en 30%

## Recursos Requeridos

Para implementar estas recomendaciones de manera efectiva, se recomienda:

1. **Recursos Humanos**: Asignar equipo dedicado de 2-3 personas para coordinación DNSH
2. **Presupuesto**: Establecer presupuesto específico para medidas correctivas y de adaptación
3. **Tecnología**: Implementar herramientas de gestión y seguimiento DNSH
4. **Capacitación**: Desarrollar programa de capacitación continua para equipos
5. **Tiempo**: Establecer cronograma realista con hitos claros y responsables definidos

---

*Estas recomendaciones se basan en el análisis detallado del portfolio al ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} y deben revisarse periódicamente para reflejar cambios en el portfolio y nuevas regulaciones.*
`;
  } else {
    // Basic version
    content = `# Recomendaciones

## Acciones Prioritarias
1. Continuar el monitoreo de cumplimiento DNSH en todas las operaciones
2. Implementar medidas correctivas en operaciones con bajo cumplimiento
3. Fortalecer la documentación de evidencias donde sea necesario
4. Revisar periódicamente los riesgos climáticos y actualizar las medidas de adaptación

## Mejoras Sugeridas
- Incrementar la frecuencia de evaluaciones DNSH
- Establecer procesos de revisión continua
- Mejorar la trazabilidad de evidencias
`;
  }
  

  return {
    id: 'recommendations-company',
    type: ReportSectionType.RECOMMENDATIONS,
    title: 'Recomendaciones',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

// Portfolio-level section generators
function generateExecutiveSummaryForPortfolio(
  operation: Operation,
  metrics: { totalAssets: number; compliantAssets: number; overallComplianceRate: number }
): ReportSection {
  const content = `# Resumen Ejecutivo - ${operation.name}

## Información General
La operación ${operation.name} ubicada en ${operation.country} comprende ${metrics.totalAssets} activos en el sector NACE ${operation.sectorNACE}.

## Métricas Clave
- **Total de Activos**: ${metrics.totalAssets}
- **Activos Compliant**: ${metrics.compliantAssets} (${metrics.overallComplianceRate.toFixed(1)}%)
- **CAPEX**: €${(operation.capex / 1000000).toFixed(1)}M
${operation.dealPrice ? `- **Valor del Deal**: €${(operation.dealPrice / 1000000).toFixed(1)}M` : ''}

## Estado de Cumplimiento DNSH
La operación muestra un nivel de cumplimiento DNSH del ${metrics.overallComplianceRate.toFixed(1)}%.
`;

  return {
    id: 'exec-summary-portfolio',
    type: ReportSectionType.EXECUTIVE_SUMMARY,
    title: 'Resumen Ejecutivo',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

function generateDNSHComplianceSectionForPortfolio(
  operation: Operation,
  objectiveCompliance: Record<DnshObjective, { status: string; compliantAssets: number; totalAssets: number }>
): ReportSection {
  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: '1. Mitigación Cambio Climático',
    [DnshObjective.ADAPTATION]: '2. Adaptación Cambio Climático',
    [DnshObjective.WATER]: '3. Uso Sostenible del Agua',
    [DnshObjective.CIRCULAR]: '4. Economía Circular',
    [DnshObjective.POLLUTION]: '5. Prevención de la Contaminación',
    [DnshObjective.BIODIVERSITY]: '6. Biodiversidad y Ecosistemas'
  };
  
  const content = `# Cumplimiento Objetivos DNSH

${Object.entries(objectiveCompliance).map(([objective, stats]) => {
  const percentage = stats.totalAssets > 0 ? (stats.compliantAssets / stats.totalAssets) * 100 : 0;
  return `### ${objectiveLabels[objective as DnshObjective]}
- **Estado**: ${stats.status}
- **Activos Compliant**: ${stats.compliantAssets} / ${stats.totalAssets}
- **Tasa de Cumplimiento**: ${percentage.toFixed(1)}%
`;
}).join('\n')}
`;

  return {
    id: 'dnsh-compliance-portfolio',
    type: ReportSectionType.DNSH_COMPLIANCE,
    title: 'Cumplimiento DNSH',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

function generateRiskAssessmentSectionForPortfolio(operation: Operation): ReportSection {
  const content = `# Evaluación de Riesgos Climáticos

## Nivel de Riesgo
${operation.maxRiskBand ? `**Riesgo Identificado**: ${operation.maxRiskBand}` : 'No se ha identificado un nivel de riesgo específico.'}

${operation.totalAAL ? `**Pérdida Anual Promedio (AAL)**: €${(operation.totalAAL / 1000000).toFixed(2)}M` : ''}

## Análisis
${operation.maxRiskBand === 'High' || operation.maxRiskBand === 'Very High' ? 'Esta operación presenta riesgos climáticos significativos que requieren medidas de adaptación.' : 'Los riesgos climáticos identificados están dentro de niveles aceptables.'}
`;

  return {
    id: 'risk-assessment-portfolio',
    type: ReportSectionType.RISK_ASSESSMENT,
    title: 'Evaluación de Riesgos',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

function generateEvidenceReviewSectionForPortfolio(operation: Operation): ReportSection {
  const evidence = operation.evidenceDocuments || [];
  const content = `# Revisión de Evidencias

## Documentos Disponibles
- **Total**: ${evidence.length} documentos

${evidence.length > 0 ? evidence.map(ev => `- ${ev.name} (${ev.type})${ev.relatedObjective ? ` - Objetivo: ${ev.relatedObjective}` : ''}`).join('\n') : 'No se han cargado documentos de evidencia para esta operación.'}
`;

  return {
    id: 'evidence-review-portfolio',
    type: ReportSectionType.EVIDENCE_REVIEW,
    title: 'Revisión de Evidencias',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true,
      evidenceReferences: evidence.map(ev => ev.id)
    }
  };
}

function generateGeographicAnalysisSectionForPortfolio(operation: Operation): ReportSection {
  const assets = operation.assets || [];
  const countries = [...new Set(assets.map(a => a.country).filter(Boolean))];
  const assetTypes = [...new Set(assets.map(a => a.assetType))];
  
  const content = `# Análisis Geográfico

## Distribución Geográfica
${countries.length > 0 ? `La operación comprende activos ubicados en ${countries.length} ${countries.length === 1 ? 'país' : 'países'}: ${countries.join(', ')}.` : 'No se ha especificado la ubicación geográfica de los activos.'}

## Tipos de Activos
${assetTypes.length > 0 ? `Se han identificado ${assetTypes.length} tipos de activos: ${assetTypes.join(', ')}.` : 'No se han especificado tipos de activos.'}

## Análisis de Riesgo Geográfico
Los activos están distribuidos geográficamente, lo que puede afectar la exposición a diferentes riesgos climáticos según la ubicación específica de cada activo.

## Consideraciones
- Evaluar riesgos climáticos específicos por región
- Considerar variaciones en regulaciones ambientales por país
- Analizar exposición a eventos climáticos extremos según ubicación
`;

  return {
    id: 'geographic-analysis-portfolio',
    type: ReportSectionType.GEOGRAPHIC_ANALYSIS,
    title: 'Análisis Geográfico',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

function generateRecommendationsSectionForPortfolio(operation: Operation): ReportSection {
  const content = `# Recomendaciones

## Acciones Sugeridas
1. Revisar el cumplimiento DNSH de todos los activos
2. Implementar medidas de adaptación donde sea necesario
3. Asegurar que toda la documentación requerida esté disponible
4. Monitorear continuamente los riesgos climáticos
`;

  return {
    id: 'recommendations-portfolio',
    type: ReportSectionType.RECOMMENDATIONS,
    title: 'Recomendaciones',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

// Asset-level section generators
function generateExecutiveSummaryForAsset(
  asset: Asset,
  operation: Operation,
  evaluation?: AssetDnshEvaluation
): ReportSection {
  const content = `# Resumen Ejecutivo - ${asset.name}

## Información del Activo
- **Tipo**: ${asset.assetType}
- **Ubicación**: ${asset.lat.toFixed(4)}, ${asset.lng.toFixed(4)}
- **Valor Expuesto**: €${(asset.exposedValue / 1000000).toFixed(1)}M
- **Operación**: ${operation.name}

## Estado DNSH
**Estado General**: ${evaluation?.overallStatus || 'Not Assessed'}

${evaluation?.overallNotes ? `**Notas**: ${evaluation.overallNotes}` : ''}
`;

  return {
    id: 'exec-summary-asset',
    type: ReportSectionType.EXECUTIVE_SUMMARY,
    title: 'Resumen Ejecutivo',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

function generateDNSHComplianceSectionForAsset(
  asset: Asset,
  evaluation: AssetDnshEvaluation | undefined,
  objectiveStatus: Record<DnshObjective, string>
): ReportSection {
  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: '1. Mitigación Cambio Climático',
    [DnshObjective.ADAPTATION]: '2. Adaptación Cambio Climático',
    [DnshObjective.WATER]: '3. Uso Sostenible del Agua',
    [DnshObjective.CIRCULAR]: '4. Economía Circular',
    [DnshObjective.POLLUTION]: '5. Prevención de la Contaminación',
    [DnshObjective.BIODIVERSITY]: '6. Biodiversidad y Ecosistemas'
  };
  
  const content = `# Cumplimiento Objetivos DNSH

${Object.entries(objectiveStatus).map(([objective, status]) => {
  return `### ${objectiveLabels[objective as DnshObjective]}
- **Estado**: ${status}
${evaluation ? `- **Evidencias**: ${getEvidenceForObjective(evaluation, objective as DnshObjective).length} documentos` : ''}
`;
}).join('\n')}
`;

  return {
    id: 'dnsh-compliance-asset',
    type: ReportSectionType.DNSH_COMPLIANCE,
    title: 'Cumplimiento DNSH',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

function generateRiskAssessmentSectionForAsset(
  asset: Asset,
  evaluation?: AssetDnshEvaluation
): ReportSection {
  const content = `# Evaluación de Riesgos Climáticos

## Nivel de Riesgo
${evaluation?.adaptationRiskBand ? `**Riesgo Identificado**: ${evaluation.adaptationRiskBand}` : 'No se ha evaluado el riesgo climático para este activo.'}

${evaluation?.adaptationAAL ? `**Pérdida Anual Promedio (AAL)**: €${(evaluation.adaptationAAL / 1000000).toFixed(2)}M` : ''}

## Medidas de Adaptación
${evaluation?.adaptationMeasures && evaluation.adaptationMeasures.length > 0 
  ? `Se han implementado ${evaluation.adaptationMeasures.length} medidas de adaptación.`
  : 'No se han implementado medidas de adaptación específicas.'}
`;

  return {
    id: 'risk-assessment-asset',
    type: ReportSectionType.RISK_ASSESSMENT,
    title: 'Evaluación de Riesgos',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

function generateEvidenceReviewSectionForAsset(
  asset: Asset,
  evidenceDocuments: EvidenceDocument[]
): ReportSection {
  const content = `# Revisión de Evidencias

## Documentos Disponibles
- **Total**: ${evidenceDocuments.length} documentos

${evidenceDocuments.length > 0 
  ? evidenceDocuments.map(ev => `- ${ev.name} (${ev.type})${ev.relatedObjective ? ` - Objetivo: ${ev.relatedObjective}` : ''}`).join('\n')
  : 'No se han cargado documentos de evidencia específicos para este activo.'}
`;

  return {
    id: 'evidence-review-asset',
    type: ReportSectionType.EVIDENCE_REVIEW,
    title: 'Revisión de Evidencias',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true,
      evidenceReferences: evidenceDocuments.map(ev => ev.id)
    }
  };
}

function generateRecommendationsSectionForAsset(
  asset: Asset,
  evaluation?: AssetDnshEvaluation
): ReportSection {
  const needsAttention = evaluation && evaluation.overallStatus !== 'Compliant';
  
  const content = `# Recomendaciones

${needsAttention 
  ? `## Acciones Requeridas
Este activo requiere atención para alcanzar el cumplimiento DNSH completo. Se recomienda:
1. Revisar los objetivos con estado "Non-Compliant" o "Conditional"
2. Implementar medidas correctivas específicas
3. Asegurar que toda la documentación requerida esté disponible
`
  : `## Mantenimiento
Este activo cumple con los requisitos DNSH. Se recomienda:
1. Mantener el cumplimiento mediante revisiones periódicas
2. Actualizar la documentación según sea necesario
3. Monitorear cambios en los riesgos climáticos
`}
`;

  return {
    id: 'recommendations-asset',
    type: ReportSectionType.RECOMMENDATIONS,
    title: 'Recomendaciones',
    content,
    editable: true,
    metadata: {
      lastModified: new Date().toISOString(),
      aiGenerated: true
    }
  };
}

// Helper functions
function getEvidenceForObjective(evaluation: AssetDnshEvaluation, objective: DnshObjective): string[] {
  switch (objective) {
    case DnshObjective.MITIGATION:
      return evaluation.mitigationEvidence || [];
    case DnshObjective.ADAPTATION:
      return evaluation.adaptationMeasures || [];
    case DnshObjective.WATER:
      return evaluation.waterEvidence || [];
    case DnshObjective.CIRCULAR:
      return evaluation.circularEvidence || [];
    case DnshObjective.POLLUTION:
      return evaluation.pollutionEvidence || [];
    case DnshObjective.BIODIVERSITY:
      return evaluation.biodiversityEvidence || [];
    default:
      return [];
  }
}
