/**
 * Document Management Service
 * 
 * Enhanced document management with versioning, metadata, and knowledge base integration
 */

import { EvidenceDocument, EvidenceType, DnshObjective } from '../types';
import { KnowledgeBaseEntry } from '../types/catalog';

export interface DocumentVersion {
  version: string;
  documentDate: string;
  uploadedBy: string;
  uploadedAt: string;
  changes?: string;
  fileUrl: string;
  fileSize: number;
}

export interface EnhancedEvidenceDocument extends EvidenceDocument {
  versions?: DocumentVersion[];
  currentVersion: string;
  relatedKnowledgeEntries?: string[]; // Knowledge base entry IDs
  extractedMetadata?: {
    keywords?: string[];
    summary?: string;
    entities?: Array<{ type: string; value: string }>;
    dates?: string[];
  };
  reviewStatus?: 'pending' | 'reviewed' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  qualityScore?: number; // 0-100
}

/**
 * Create a new document version
 */
export const createDocumentVersion = (
  document: EnhancedEvidenceDocument,
  newFileUrl: string,
  newFileSize: number,
  uploadedBy: string,
  changes?: string
): DocumentVersion => {
  const currentVersion = document.currentVersion || '1.0.0';
  const versionParts = currentVersion.split('.');
  const major = parseInt(versionParts[0]);
  const minor = parseInt(versionParts[1]);
  const patch = parseInt(versionParts[2]) || 0;
  
  const newVersion = `${major}.${minor}.${patch + 1}`;
  
  return {
    version: newVersion,
    documentDate: document.documentDate || new Date().toISOString(),
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    changes,
    fileUrl: newFileUrl,
    fileSize: newFileSize
  };
};

/**
 * Add version to document
 */
export const addDocumentVersion = (
  document: EnhancedEvidenceDocument,
  version: DocumentVersion
): EnhancedEvidenceDocument => {
  const versions = document.versions || [];
  return {
    ...document,
    versions: [...versions, version],
    currentVersion: version.version,
    fileUrl: version.fileUrl,
    fileSize: version.fileSize,
    uploadDate: version.uploadedAt
  };
};

/**
 * Link document to knowledge base entry
 */
export const linkDocumentToKnowledge = (
  document: EnhancedEvidenceDocument,
  knowledgeEntryId: string
): EnhancedEvidenceDocument => {
  const relatedEntries = document.relatedKnowledgeEntries || [];
  if (!relatedEntries.includes(knowledgeEntryId)) {
    return {
      ...document,
      relatedKnowledgeEntries: [...relatedEntries, knowledgeEntryId]
    };
  }
  return document;
};

/**
 * Extract metadata from document (mock implementation)
 * In production, this would use NLP/AI services
 */
export const extractDocumentMetadata = async (
  document: EnhancedEvidenceDocument
): Promise<EnhancedEvidenceDocument['extractedMetadata']> => {
  // Mock implementation - in production, use NLP/AI services
  const keywords: string[] = [];
  const entities: Array<{ type: string; value: string }> = [];
  
  // Extract from document name and description
  const text = `${document.name} ${document.description || ''}`.toLowerCase();
  
  // Simple keyword extraction (in production, use proper NLP)
  const commonKeywords = ['climate', 'risk', 'adaptation', 'mitigation', 'biodiversity', 'water', 'emissions'];
  commonKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      keywords.push(keyword);
    }
  });
  
  // Extract dates (simple regex)
  const dateRegex = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/g;
  const dates = text.match(dateRegex) || [];
  
  return {
    keywords,
    entities,
    dates: dates.slice(0, 5) // Limit to 5 dates
  };
};

/**
 * Calculate document quality score
 */
export const calculateDocumentQualityScore = (
  document: EnhancedEvidenceDocument
): number => {
  let score = 0;
  
  // Has description: +20
  if (document.description && document.description.length > 50) score += 20;
  
  // Has file: +30
  if (document.fileUrl) score += 30;
  
  // Has metadata: +20
  if (document.extractedMetadata) score += 20;
  
  // Has tags: +10
  if (document.tags && document.tags.length > 0) score += 10;
  
  // Has related objective: +10
  if (document.relatedObjective) score += 10;
  
  // Has versions: +10 (indicates active maintenance)
  if (document.versions && document.versions.length > 1) score += 10;
  
  return Math.min(100, score);
};

/**
 * Search documents by content
 */
export const searchDocuments = (
  documents: EnhancedEvidenceDocument[],
  query: string
): EnhancedEvidenceDocument[] => {
  const lowerQuery = query.toLowerCase();
  
  return documents.filter(doc => {
    // Search in name
    if (doc.name.toLowerCase().includes(lowerQuery)) return true;
    
    // Search in description
    if (doc.description?.toLowerCase().includes(lowerQuery)) return true;
    
    // Search in tags
    if (doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;
    
    // Search in extracted keywords
    if (doc.extractedMetadata?.keywords?.some(kw => kw.toLowerCase().includes(lowerQuery))) return true;
    
    return false;
  });
};

/**
 * Get documents by objective
 */
export const getDocumentsByObjective = (
  documents: EnhancedEvidenceDocument[],
  objective: DnshObjective
): EnhancedEvidenceDocument[] => {
  return documents.filter(doc => doc.relatedObjective === objective);
};

/**
 * Get documents needing review
 */
export const getDocumentsNeedingReview = (
  documents: EnhancedEvidenceDocument[]
): EnhancedEvidenceDocument[] => {
  return documents.filter(doc => 
    doc.reviewStatus === 'pending' || !doc.reviewStatus
  );
};

/**
 * Review document
 */
export const reviewDocument = (
  document: EnhancedEvidenceDocument,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  comments?: string
): EnhancedEvidenceDocument => {
  return {
    ...document,
    reviewStatus: status,
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    reviewComments: comments,
    qualityScore: calculateDocumentQualityScore(document)
  };
};
