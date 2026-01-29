/**
 * Report Configuration Service
 * 
 * Provides customizable report configuration system:
 * - Define which sections to include/exclude
 * - Configure section order
 * - Set section-specific options
 * - Save/load report templates
 */

import { ReportSectionType, ReportLevel } from './reportingService';

// Re-export for convenience
export { ReportSectionType, ReportLevel };

export interface ReportSectionConfig {
  type: ReportSectionType;
  enabled: boolean;
  order: number;
  title?: string; // Custom title override
  options?: {
    includeSubsections?: boolean;
    detailLevel?: 'summary' | 'standard' | 'detailed';
    includeCharts?: boolean;
    includeTables?: boolean;
    customFields?: Record<string, any>;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  level: ReportLevel;
  sections: ReportSectionConfig[];
  metadata?: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    tags?: string[];
  };
}

export interface ReportConfiguration {
  templateId?: string;
  level: ReportLevel;
  sections: ReportSectionConfig[];
  options: {
    includeCoverPage?: boolean;
    includeTableOfContents?: boolean;
    includeAppendices?: boolean;
    pageNumbering?: boolean;
    watermark?: boolean;
    customHeader?: string;
    customFooter?: string;
  };
}

// Default section configurations for each level
const DEFAULT_COMPANY_SECTIONS: ReportSectionConfig[] = [
  { type: ReportSectionType.EXECUTIVE_SUMMARY, enabled: true, order: 1, options: { detailLevel: 'standard' } },
  { type: ReportSectionType.DNSH_COMPLIANCE, enabled: true, order: 2, options: { detailLevel: 'detailed', includeCharts: true } },
  { type: ReportSectionType.RISK_ASSESSMENT, enabled: true, order: 3, options: { detailLevel: 'standard', includeCharts: true } },
  { type: ReportSectionType.EVIDENCE_REVIEW, enabled: true, order: 4, options: { detailLevel: 'standard' } },
  { type: ReportSectionType.FINANCIAL_METRICS, enabled: true, order: 5, options: { detailLevel: 'standard', includeTables: true } },
  { type: ReportSectionType.GEOGRAPHIC_ANALYSIS, enabled: false, order: 6, options: { detailLevel: 'standard' } },
  { type: ReportSectionType.RECOMMENDATIONS, enabled: true, order: 7, options: { detailLevel: 'standard' } },
];

const DEFAULT_PORTFOLIO_SECTIONS: ReportSectionConfig[] = [
  { type: ReportSectionType.EXECUTIVE_SUMMARY, enabled: true, order: 1, options: { detailLevel: 'standard' } },
  { type: ReportSectionType.DNSH_COMPLIANCE, enabled: true, order: 2, options: { detailLevel: 'detailed', includeCharts: true } },
  { type: ReportSectionType.RISK_ASSESSMENT, enabled: true, order: 3, options: { detailLevel: 'standard', includeCharts: true } },
  { type: ReportSectionType.EVIDENCE_REVIEW, enabled: true, order: 4, options: { detailLevel: 'standard' } },
  { type: ReportSectionType.GEOGRAPHIC_ANALYSIS, enabled: true, order: 5, options: { detailLevel: 'standard' } },
  { type: ReportSectionType.RECOMMENDATIONS, enabled: true, order: 6, options: { detailLevel: 'standard' } },
];

const DEFAULT_ASSET_SECTIONS: ReportSectionConfig[] = [
  { type: ReportSectionType.EXECUTIVE_SUMMARY, enabled: true, order: 1, options: { detailLevel: 'summary' } },
  { type: ReportSectionType.DNSH_COMPLIANCE, enabled: true, order: 2, options: { detailLevel: 'detailed' } },
  { type: ReportSectionType.RISK_ASSESSMENT, enabled: true, order: 3, options: { detailLevel: 'standard' } },
  { type: ReportSectionType.EVIDENCE_REVIEW, enabled: true, order: 4, options: { detailLevel: 'standard' } },
  { type: ReportSectionType.RECOMMENDATIONS, enabled: true, order: 5, options: { detailLevel: 'standard' } },
];

/**
 * Get default configuration for a report level
 */
export const getDefaultConfiguration = (level: ReportLevel): ReportConfiguration => {
  let sections: ReportSectionConfig[];
  
  switch (level) {
    case ReportLevel.COMPANY:
      sections = [...DEFAULT_COMPANY_SECTIONS];
      break;
    case ReportLevel.PORTFOLIO:
      sections = [...DEFAULT_PORTFOLIO_SECTIONS];
      break;
    case ReportLevel.ASSET:
      sections = [...DEFAULT_ASSET_SECTIONS];
      break;
    default:
      sections = [];
  }
  
  return {
    level,
    sections,
    options: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeAppendices: false,
      pageNumbering: true,
      watermark: false,
    }
  };
};

/**
 * Create a custom report configuration
 */
export const createCustomConfiguration = (
  level: ReportLevel,
  enabledSections: ReportSectionType[],
  options?: Partial<ReportConfiguration['options']>
): ReportConfiguration => {
  const defaultConfig = getDefaultConfiguration(level);
  
  // Update section enabled status based on enabledSections
  const sections = defaultConfig.sections.map(section => ({
    ...section,
    enabled: enabledSections.includes(section.type)
  }));
  
  return {
    ...defaultConfig,
    sections,
    options: {
      ...defaultConfig.options,
      ...options
    }
  };
};

/**
 * Toggle section in configuration
 */
export const toggleSection = (
  config: ReportConfiguration,
  sectionType: ReportSectionType,
  enabled?: boolean
): ReportConfiguration => {
  const sections = config.sections.map(section => {
    if (section.type === sectionType) {
      return {
        ...section,
        enabled: enabled !== undefined ? enabled : !section.enabled
      };
    }
    return section;
  });
  
  return {
    ...config,
    sections
  };
};

/**
 * Reorder sections in configuration
 */
export const reorderSections = (
  config: ReportConfiguration,
  sectionType: ReportSectionType,
  newOrder: number
): ReportConfiguration => {
  const sections = [...config.sections];
  const sectionIndex = sections.findIndex(s => s.type === sectionType);
  
  if (sectionIndex === -1) return config;
  
  const [movedSection] = sections.splice(sectionIndex, 1);
  movedSection.order = newOrder;
  sections.splice(newOrder - 1, 0, movedSection);
  
  // Reorder remaining sections
  sections.forEach((section, index) => {
    section.order = index + 1;
  });
  
  return {
    ...config,
    sections
  };
};

/**
 * Update section options
 */
export const updateSectionOptions = (
  config: ReportConfiguration,
  sectionType: ReportSectionType,
  options: Partial<ReportSectionConfig['options']>
): ReportConfiguration => {
  const sections = config.sections.map(section => {
    if (section.type === sectionType) {
      return {
        ...section,
        options: {
          ...section.options,
          ...options
        }
      };
    }
    return section;
  });
  
  return {
    ...config,
    sections
  };
};

/**
 * Save configuration as template
 */
export const saveAsTemplate = (
  config: ReportConfiguration,
  name: string,
  description?: string
): ReportTemplate => {
  const template: ReportTemplate = {
    id: `template-${Date.now()}`,
    name,
    description,
    level: config.level,
    sections: config.sections,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: []
    }
  };
  
  // In production, save to backend/localStorage
  const templates = getSavedTemplates();
  templates.push(template);
  localStorage.setItem('reportTemplates', JSON.stringify(templates));
  
  return template;
};

/**
 * Load template
 */
export const loadTemplate = (templateId: string): ReportTemplate | null => {
  const templates = getSavedTemplates();
  return templates.find(t => t.id === templateId) || null;
};

/**
 * Get all saved templates
 */
export const getSavedTemplates = (): ReportTemplate[] => {
  try {
    const stored = localStorage.getItem('reportTemplates');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Delete template
 */
export const deleteTemplate = (templateId: string): boolean => {
  const templates = getSavedTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  localStorage.setItem('reportTemplates', JSON.stringify(filtered));
  return filtered.length < templates.length;
};

/**
 * Apply template to configuration
 */
export const applyTemplate = (template: ReportTemplate): ReportConfiguration => {
  return {
    level: template.level,
    sections: template.sections,
    templateId: template.id,
    options: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeAppendices: false,
      pageNumbering: true,
      watermark: false,
    }
  };
};

/**
 * Get enabled sections from configuration
 */
export const getEnabledSections = (config: ReportConfiguration): ReportSectionConfig[] => {
  return config.sections
    .filter(section => section.enabled)
    .sort((a, b) => a.order - b.order);
};

/**
 * Validate configuration
 */
export const validateConfiguration = (config: ReportConfiguration): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (config.sections.length === 0) {
    errors.push('La configuración debe incluir al menos una sección');
  }
  
  const enabledSections = config.sections.filter(s => s.enabled);
  if (enabledSections.length === 0) {
    errors.push('Debe haber al menos una sección habilitada');
  }
  
  // Check for duplicate orders
  const orders = config.sections.map(s => s.order);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    errors.push('Hay secciones con el mismo orden');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
