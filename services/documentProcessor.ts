import { EvidenceDocument, EvidenceType, DnshObjective } from '../types';

export interface ProcessedDocumentData {
  // Extracted metadata
  documentType?: EvidenceType;
  title?: string;
  description?: string;
  author?: string;
  documentDate?: string;
  language?: string;
  
  // DNSH-related information
  relatedObjectives?: DnshObjective[];
  mentionedAssets?: string[];
  complianceStatus?: {
    objective: DnshObjective;
    status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
    evidence: string;
  }[];
  
  // Key findings
  keyFindings?: string[];
  risksIdentified?: string[];
  measuresSuggested?: string[];
  
  // Tags
  suggestedTags?: string[];
  
  // Confidence scores
  confidence?: {
    documentType: number;
    objectives: number;
    metadata: number;
  };
}

/**
 * Process a document file and extract DNSH-relevant information
 * In production, this would call an AI service (OpenAI, Anthropic, etc.)
 */
export const processDocument = async (
  file: File | string, // File object or URL
  operationContext?: {
    operationName?: string;
    assets?: Array<{ id: string; name: string }>;
    sectorNACE?: string;
  }
): Promise<ProcessedDocumentData> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // In production, this would:
  // 1. Extract text from PDF/image using OCR or PDF parser
  // 2. Send to AI service (OpenAI GPT-4, Anthropic Claude, etc.) with prompt
  // 3. Parse structured response
  // 4. Return processed data

  // For demo, we'll simulate intelligent extraction based on filename/content
  const fileName = typeof file === 'string' ? file : file.name;
  const fileType = typeof file === 'string' ? 'url' : file.type;
  
  const processed: ProcessedDocumentData = {
    confidence: {
      documentType: 0.85,
      objectives: 0.75,
      metadata: 0.80
    }
  };

  // Extract document type from filename/content
  const fileNameLower = fileName.toLowerCase();
  
  if (fileNameLower.includes('tdd') || fileNameLower.includes('due diligence') || fileNameLower.includes('technical')) {
    processed.documentType = EvidenceType.TECHNICAL_DUE_DILIGENCE;
    processed.suggestedTags = ['TDD', 'Due Diligence', 'Technical'];
  } else if (fileNameLower.includes('eia') || fileNameLower.includes('impact') || fileNameLower.includes('ambiental')) {
    processed.documentType = EvidenceType.ENVIRONMENTAL_IMPACT_ASSESSMENT;
    processed.suggestedTags = ['EIA', 'Environmental', 'Impact Assessment'];
  } else if (fileNameLower.includes('climate') || fileNameLower.includes('risk') || fileNameLower.includes('climatico')) {
    processed.documentType = EvidenceType.CLIMATE_RISK_ASSESSMENT;
    processed.suggestedTags = ['Climate Risk', 'Risk Assessment'];
  } else if (fileNameLower.includes('adaptation') || fileNameLower.includes('adaptacion')) {
    processed.documentType = EvidenceType.ADAPTATION_PLAN;
    processed.suggestedTags = ['Adaptation', 'Climate Adaptation'];
  } else if (fileNameLower.includes('biodiversity') || fileNameLower.includes('biodiversidad') || fileNameLower.includes('natura')) {
    processed.documentType = EvidenceType.BIODIVERSITY_STUDY;
    processed.suggestedTags = ['Biodiversity', 'Ecosystems'];
  } else if (fileNameLower.includes('water') || fileNameLower.includes('agua') || fileNameLower.includes('permit')) {
    processed.documentType = EvidenceType.WATER_PERMIT;
    processed.suggestedTags = ['Water', 'Permit'];
  } else if (fileNameLower.includes('waste') || fileNameLower.includes('residuos')) {
    processed.documentType = EvidenceType.WASTE_MANAGEMENT_PLAN;
    processed.suggestedTags = ['Waste', 'Management'];
  } else if (fileNameLower.includes('emission') || fileNameLower.includes('emision')) {
    processed.documentType = EvidenceType.EMISSION_REPORT;
    processed.suggestedTags = ['Emissions', 'Carbon'];
  } else {
    processed.documentType = EvidenceType.OTHER;
  }

  // Extract title (remove extension, clean up)
  processed.title = fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words

  // Simulate extraction of DNSH objectives from content
  // In production, AI would analyze document content
  const contentLower = fileNameLower;
  processed.relatedObjectives = [];
  
  if (contentLower.includes('mitigation') || contentLower.includes('mitigacion') || contentLower.includes('emission') || contentLower.includes('carbon')) {
    processed.relatedObjectives.push(DnshObjective.MITIGATION);
  }
  if (contentLower.includes('adaptation') || contentLower.includes('adaptacion') || contentLower.includes('climate risk') || contentLower.includes('vulnerability')) {
    processed.relatedObjectives.push(DnshObjective.ADAPTATION);
  }
  if (contentLower.includes('water') || contentLower.includes('agua') || contentLower.includes('marine')) {
    processed.relatedObjectives.push(DnshObjective.WATER);
  }
  if (contentLower.includes('circular') || contentLower.includes('waste') || contentLower.includes('recycle')) {
    processed.relatedObjectives.push(DnshObjective.CIRCULAR);
  }
  if (contentLower.includes('pollution') || contentLower.includes('contaminacion') || contentLower.includes('emission')) {
    processed.relatedObjectives.push(DnshObjective.POLLUTION);
  }
  if (contentLower.includes('biodiversity') || contentLower.includes('biodiversidad') || contentLower.includes('ecosystem') || contentLower.includes('natura')) {
    processed.relatedObjectives.push(DnshObjective.BIODIVERSITY);
  }

  // If no objectives found, suggest based on document type
  if (processed.relatedObjectives.length === 0) {
    switch (processed.documentType) {
      case EvidenceType.CLIMATE_RISK_ASSESSMENT:
      case EvidenceType.ADAPTATION_PLAN:
        processed.relatedObjectives.push(DnshObjective.ADAPTATION);
        break;
      case EvidenceType.ENVIRONMENTAL_IMPACT_ASSESSMENT:
      case EvidenceType.BIODIVERSITY_STUDY:
        processed.relatedObjectives.push(DnshObjective.BIODIVERSITY);
        break;
      case EvidenceType.WATER_PERMIT:
        processed.relatedObjectives.push(DnshObjective.WATER);
        break;
      case EvidenceType.WASTE_MANAGEMENT_PLAN:
        processed.relatedObjectives.push(DnshObjective.CIRCULAR);
        break;
      case EvidenceType.EMISSION_REPORT:
        processed.relatedObjectives.push(DnshObjective.MITIGATION, DnshObjective.POLLUTION);
        break;
    }
  }

  // Extract description (simulated)
  processed.description = `Documento procesado automáticamente: ${processed.title}. ` +
    `Tipo identificado: ${processed.documentType}. ` +
    `Objetivos DNSH relacionados: ${processed.relatedObjectives.map(o => o.split(' ')[0]).join(', ')}.`;

  // Extract author (simulated - would use AI to find in document)
  if (contentLower.includes('consultora') || contentLower.includes('consulting')) {
    processed.author = 'Consultora Externa';
  } else if (contentLower.includes('gobierno') || contentLower.includes('government')) {
    processed.author = 'Autoridad Competente';
  }

  // Extract date (simulated - would parse from document)
  const currentYear = new Date().getFullYear();
  processed.documentDate = `${currentYear}-01-01`; // Default to current year

  // Detect language
  if (contentLower.includes('español') || contentLower.includes('es_') || fileNameLower.match(/[áéíóúñ]/)) {
    processed.language = 'ES';
  } else {
    processed.language = 'EN';
  }

  // Extract mentioned assets (if context provided)
  if (operationContext?.assets) {
    processed.mentionedAssets = operationContext.assets
      .filter(asset => fileNameLower.includes(asset.name.toLowerCase().substring(0, 5)))
      .map(asset => asset.id);
  }

  // Generate key findings (simulated)
  processed.keyFindings = [
    `Documento de tipo ${processed.documentType} relacionado con ${processed.relatedObjectives.length} objetivo(s) DNSH`,
    'Revisar contenido para validar cumplimiento de criterios específicos'
  ];

  return processed;
};

/**
 * Process multiple documents in batch
 */
export const processDocumentsBatch = async (
  files: (File | string)[],
  operationContext?: {
    operationName?: string;
    assets?: Array<{ id: string; name: string }>;
    sectorNACE?: string;
  }
): Promise<ProcessedDocumentData[]> => {
  const results = await Promise.all(
    files.map(file => processDocument(file, operationContext))
  );
  return results;
};

/**
 * Create EvidenceDocument from processed data
 */
export const createEvidenceFromProcessed = (
  processed: ProcessedDocumentData,
  operationId: string,
  assetId?: string,
  fileUrl?: string,
  uploadedBy: string = 'System (Auto-processed)'
): Omit<EvidenceDocument, 'id' | 'uploadDate'> => {
  return {
    operationId,
    assetId,
    name: processed.title || 'Documento sin título',
    type: processed.documentType || EvidenceType.OTHER,
    description: processed.description,
    uploadedBy,
    fileUrl,
    documentDate: processed.documentDate,
    author: processed.author,
    language: processed.language,
    relatedObjective: processed.relatedObjectives?.[0], // Primary objective
    tags: processed.suggestedTags,
  };
};
