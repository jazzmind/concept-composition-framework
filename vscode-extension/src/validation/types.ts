/**
 * Types for the Concept Validation Engine
 * 
 * This module defines the core types used for validating alignment between
 * .concept specification files and their TypeScript implementations.
 */

export interface ConceptSpec {
  name: string;
  purpose: string;
  state: Record<string, any>;
  actions: ConceptAction[];
  queries: ConceptQuery[];
  operationalPrinciple: string;
  file: string; // path to .concept file
}

export interface ConceptAction {
  name: string;
  signature: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  description: string;
  lineNumber?: number;
}

export interface ConceptQuery {
  name: string;
  signature: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  description: string;
  lineNumber?: number;
}

export interface ConceptImplementation {
  name: string;
  className: string;
  file: string; // path to .ts file
  methods: ImplementationMethod[];
  imports: string[];
  exports: string[];
  dependencies: string[];
}

export interface ImplementationMethod {
  name: string;
  isAsync: boolean;
  parameters: Parameter[];
  returnType: string;
  body: string;
  isQuery: boolean; // starts with _
  lineNumber?: number;
}

export interface Parameter {
  name: string;
  type: string;
  optional: boolean;
}

export interface SyncSpec {
  name: string;
  file: string;
  when: SyncAction[];
  where?: SyncCondition[];
  then: SyncAction[];
}

export interface SyncAction {
  concept: string;
  action: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}

export interface SyncCondition {
  expression: string;
  variables: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: ValidationCategory;
  message: string;
  description: string;
  location: {
    file: string;
    line?: number;
    column?: number;
  };
  suggestion?: string;
  related?: {
    file: string;
    line?: number;
    excerpt?: string;
  };
}

export type ValidationCategory = 
  | 'missing_action'
  | 'missing_query' 
  | 'signature_mismatch'
  | 'return_type_mismatch'
  | 'missing_error_handling'
  | 'state_mismatch'
  | 'naming_convention'
  | 'purpose_alignment'
  | 'operational_principle_violation'
  | 'sync_alignment'
  | 'dependency_violation'
  | 'concept_independence';

export interface ValidationReport {
  conceptName: string;
  specFile: string;
  implementationFile: string;
  syncFiles: string[];
  timestamp: Date;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    overallScore: number; // 0-100
  };
  aiAnalysis?: {
    conceptPurposeAlignment: string;
    implementationQuality: string;
    suggestions: string[];
  };
}

export interface ValidationConfig {
  openaiApiKey: string;
  modelName: string;
  projectRoot: string;
  specDir: string;
  conceptDir: string;
  syncDir: string;
  includeAiAnalysis: boolean;
  strictMode: boolean;
}

export interface AIAnalysisPrompt {
  conceptSpec: string;
  implementationCode: string;
  syncCode?: string;
  focusAreas: string[];
}

export interface AIAnalysisResponse {
  alignment: 'excellent' | 'good' | 'fair' | 'poor';
  score: number; // 0-100
  purposeAlignment: string;
  implementationQuality: string;
  issues: Array<{
    type: 'critical' | 'major' | 'minor';
    description: string;
    suggestion: string;
  }>;
  suggestions: string[];
}
