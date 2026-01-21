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
  
  // Generate sections
  const sections: ReportSection[] = [
    generateExecutiveSummary(client, clientOperations, {
      totalAssets,
      compliantAssets,
      totalCapex,
      totalDealValue,
      overallComplianceRate: totalAssets > 0 ? (compliantAssets / totalAssets) * 100 : 0
    }),
    generateDNSHComplianceSection(clientOperations, objectiveCompliance),
    generateRiskAssessmentSection(clientOperations, riskDistribution),
    generateEvidenceReviewSection(clientOperations),
    generateFinancialMetricsSection(clientOperations, { totalCapex, totalDealValue }),
    generateRecommendationsSection(clientOperations)
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

// Section generators
function generateExecutiveSummary(
  client: Client,
  operations: Operation[],
  metrics: { totalAssets: number; compliantAssets: number; totalCapex: number; totalDealValue: number; overallComplianceRate: number }
): ReportSection {
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
  objectiveCompliance: Record<DnshObjective, { compliant: number; total: number }>
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

## Resumen por Objetivo

${Object.entries(objectiveCompliance).map(([objective, stats]) => {
  const percentage = stats.total > 0 ? (stats.compliant / stats.total) * 100 : 0;
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
  
  const content = `# Evaluación de Riesgos Climáticos

## Distribución de Riesgo
- **Riesgo Bajo**: ${riskDistribution.Low} operaciones
- **Riesgo Moderado**: ${riskDistribution.Moderate} operaciones
- **Riesgo Alto**: ${riskDistribution.High} operaciones
- **Riesgo Muy Alto**: ${riskDistribution['Very High']} operaciones

## Operaciones de Alto Riesgo
${highRiskOps > 0 ? `Se han identificado ${highRiskOps} operaciones con riesgo alto o muy alto que requieren medidas de adaptación prioritarias.` : 'No se han identificado operaciones con riesgo alto o muy alto.'}

## Recomendaciones
Las operaciones con riesgo alto deben implementar medidas de adaptación específicas y monitoreo continuo de los riesgos climáticos identificados.
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

function generateRecommendationsSection(operations: Operation[]): ReportSection {
  const content = `# Recomendaciones

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
