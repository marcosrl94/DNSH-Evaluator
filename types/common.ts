/**
 * Common type definitions to replace 'any' types
 */

import { ReactNode } from 'react';
import { Asset, AssetDnshEvaluation, DnshObjective } from './types';

/**
 * Generic component props with common patterns
 */
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

/**
 * KPI Card props
 */
export interface KPICardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  iconBg?: string;
}

/**
 * Status Badge props
 */
export interface StatusBadgeProps {
  label: string;
  value: string | number;
  color: string;
  icon?: ReactNode;
}

/**
 * Score Card props
 */
export interface ScoreCardProps {
  label: string;
  score: number;
  description?: string;
  color: string;
}

/**
 * Item Card props for dashboard
 */
export interface ItemCardProps {
  item: {
    id: string;
    name: string;
    [key: string]: unknown;
  };
  granularityLevel: 'company' | 'portfolio' | 'asset';
  theme: 'light' | 'dark';
  onClick: (item: { id: string; name: string; [key: string]: unknown }) => void;
}

/**
 * CORDEX Data type (more specific than any)
 */
export interface CORDEXData {
  value?: number;
  changeFromBaseline?: number;
  unit?: string;
  [key: string]: unknown;
}

/**
 * Evaluation data type
 */
export interface EvaluationData extends AssetDnshEvaluation {
  [key: string]: unknown;
}

/**
 * Evidence document type
 */
export interface EvidenceDocument {
  id: string;
  name: string;
  type: string;
  documentDate?: string;
  description?: string;
  relatedObjective?: DnshObjective;
  [key: string]: unknown;
}

/**
 * Suggested measure type
 */
export interface SuggestedMeasure {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}
