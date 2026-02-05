/**
 * User Journey Types
 * Defines the 5-stage evaluation workflow
 */

export enum JourneyStage {
  INPUT_LOADING = 'input-loading',           // 1. Carga de inputs
  AUTOMATED_EVALUATION = 'automated-evaluation', // 2. Evaluación automatizada
  MANUAL_DATA_ENTRY = 'manual-data-entry',   // 3. Inserción de datos manuales
  REPORT_GENERATION = 'report-generation',   // 4. Generación de expedientes y reportes
  REVIEW_MANAGEMENT = 'review-management'    // 5. Revisión de históricos y deal management
}

export interface JourneyProgress {
  operationId: string;
  stage: JourneyStage;
  completed: boolean;
  progress: number; // 0-100
  lastUpdated: string;
  updatedBy: string;
}

export interface StageMetadata {
  stage: JourneyStage;
  label: string;
  description: string;
  icon: string;
  order: number;
  requiredFields?: string[];
}

export const JOURNEY_STAGES: StageMetadata[] = [
  {
    stage: JourneyStage.INPUT_LOADING,
    label: 'CARGA_INPUTS',
    description: 'Carga de inputs y documentación inicial',
    icon: 'Upload',
    order: 1,
    requiredFields: ['operation', 'assets', 'documents']
  },
  {
    stage: JourneyStage.AUTOMATED_EVALUATION,
    label: 'EVAL_DNSH',
    description: 'Evaluación DNSH automatizada y datos manuales',
    icon: 'Zap',
    order: 2,
    requiredFields: ['climateData', 'hazardData', 'evidence']
  },
  {
    stage: JourneyStage.MANUAL_DATA_ENTRY,
    label: 'EVAL_DNSH',
    description: 'Evaluación DNSH automatizada y datos manuales',
    icon: 'Zap',
    order: 2,
    requiredFields: ['evaluations', 'justifications']
  },
  {
    stage: JourneyStage.REPORT_GENERATION,
    label: 'EXPEDIENTES_REPORTES',
    description: 'Generación de expedientes y reportes de justificación',
    icon: 'FileText',
    order: 4,
    requiredFields: ['reports', 'justifications']
  },
  {
    stage: JourneyStage.REVIEW_MANAGEMENT,
    label: 'REVISION_HISTORICOS',
    description: 'Revisión de históricos y deal management',
    icon: 'Archive',
    order: 5,
    requiredFields: ['historicalData', 'approvals']
  }
];
