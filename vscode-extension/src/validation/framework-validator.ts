/**
 * Framework Validator
 * 
 * Orchestrates all validation types to provide comprehensive framework validation.
 * Combines concept spec validation, sync spec validation, implementation validation,
 * and cross-cutting concerns.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConceptSpecValidator } from './concept-spec-validator';
import { SyncSpecValidator } from './sync-spec-validator';
import { ConceptImplementationValidator } from './concept-implementation-validator';
import { SyncImplementationValidator } from './sync-implementation-validator';
import { ValidationReport, ValidationIssue } from './types';

export interface FrameworkValidationConfig {
  projectRoot: string;
  specsDir: string;
  conceptsDir: string;
  syncsDir: string;
  openaiApiKey?: string;
}

export interface FrameworkValidationResult {
  conceptSpecs: ValidationReport[];
  syncSpecs: ValidationReport[];
  conceptImplementations: ValidationReport[];
  syncImplementations: ValidationReport[];
  crossCuttingIssues: ValidationIssue[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalInfo: number;
    overallScore: number;
    conceptsAnalyzed: number;
    syncsAnalyzed: number;
  };
}

export class FrameworkValidator {
  private conceptSpecValidator: ConceptSpecValidator;
  private syncSpecValidator: SyncSpecValidator;
  private conceptImplValidator: ConceptImplementationValidator;
  private syncImplValidator: SyncImplementationValidator;
  private config: FrameworkValidationConfig;

  constructor(config: FrameworkValidationConfig) {
    this.config = config;
    this.conceptSpecValidator = new ConceptSpecValidator(config.openaiApiKey);
    this.syncSpecValidator = new SyncSpecValidator(config.openaiApiKey);
    this.conceptImplValidator = new ConceptImplementationValidator(config.openaiApiKey);
    this.syncImplValidator = new SyncImplementationValidator(config.openaiApiKey);
  }

  /**
   * Validate entire framework
   */
  async validateFramework(): Promise<FrameworkValidationResult> {
    const result: FrameworkValidationResult = {
      conceptSpecs: [],
      syncSpecs: [],
      conceptImplementations: [],
      syncImplementations: [],
      crossCuttingIssues: [],
      summary: {
        totalErrors: 0,
        totalWarnings: 0,
        totalInfo: 0,
        overallScore: 0,
        conceptsAnalyzed: 0,
        syncsAnalyzed: 0
      }
    };

    try {
      // Validate concept specifications
      const specsPath = path.join(this.config.projectRoot, this.config.specsDir);
      if (fs.existsSync(specsPath)) {
        result.conceptSpecs = await this.conceptSpecValidator.validateAllConceptSpecs(specsPath);
      }

      // Validate concept implementations
      const conceptsPath = path.join(this.config.projectRoot, this.config.conceptsDir);
      if (fs.existsSync(conceptsPath) && fs.existsSync(specsPath)) {
        result.conceptImplementations = await this.conceptImplValidator.validateAllConceptImplementations(
          specsPath, 
          conceptsPath
        );
      }

      // Validate sync specifications and implementations
      const syncsPath = path.join(this.config.projectRoot, this.config.syncsDir);
      if (fs.existsSync(syncsPath)) {
        result.syncSpecs = await this.syncSpecValidator.validateAllSyncSpecs(syncsPath);
        result.syncImplementations = await this.syncImplValidator.validateAllSyncImplementations(syncsPath);
      }

      // Perform cross-cutting validation
      result.crossCuttingIssues = await this.validateCrossCuttingConcerns(result);

      // Calculate summary
      this.calculateFrameworkSummary(result);

    } catch (error) {
      result.crossCuttingIssues.push({
        type: 'error',
        category: 'state_mismatch',
        message: 'Framework validation failed',
        description: error instanceof Error ? error.message : 'Unknown framework validation error',
        location: { file: this.config.projectRoot }
      });
    }

    return result;
  }

  /**
   * Validate concept specifications only
   */
  async validateConceptSpecs(): Promise<ValidationReport[]> {
    const specsPath = path.join(this.config.projectRoot, this.config.specsDir);
    if (!fs.existsSync(specsPath)) {
      return [{
        conceptName: 'DIRECTORY_ERROR',
        specFile: specsPath,
        implementationFile: 'N/A',
        syncFiles: [],
        timestamp: new Date(),
        issues: [{
          type: 'error',
          category: 'state_mismatch',
          message: 'Specs directory not found',
          description: `Directory ${specsPath} does not exist`,
          location: { file: specsPath },
          suggestion: `Create the specs directory at ${specsPath}`
        }],
        summary: { errors: 1, warnings: 0, info: 0, overallScore: 0 }
      }];
    }

    return await this.conceptSpecValidator.validateAllConceptSpecs(specsPath);
  }

  /**
   * Validate sync specifications only
   */
  async validateSyncSpecs(): Promise<ValidationReport[]> {
    const syncsPath = path.join(this.config.projectRoot, this.config.syncsDir);
    if (!fs.existsSync(syncsPath)) {
      return [{
        conceptName: 'DIRECTORY_ERROR',
        specFile: syncsPath,
        implementationFile: 'N/A',
        syncFiles: [],
        timestamp: new Date(),
        issues: [{
          type: 'error',
          category: 'sync_alignment',
          message: 'Syncs directory not found',
          description: `Directory ${syncsPath} does not exist`,
          location: { file: syncsPath },
          suggestion: `Create the syncs directory at ${syncsPath}`
        }],
        summary: { errors: 1, warnings: 0, info: 0, overallScore: 0 }
      }];
    }

    return await this.syncSpecValidator.validateAllSyncSpecs(syncsPath);
  }

  /**
   * Validate concept implementations only
   */
  async validateConceptImplementations(): Promise<ValidationReport[]> {
    const specsPath = path.join(this.config.projectRoot, this.config.specsDir);
    const conceptsPath = path.join(this.config.projectRoot, this.config.conceptsDir);

    if (!fs.existsSync(specsPath) || !fs.existsSync(conceptsPath)) {
      return [{
        conceptName: 'DIRECTORY_ERROR',
        specFile: fs.existsSync(specsPath) ? specsPath : 'MISSING',
        implementationFile: fs.existsSync(conceptsPath) ? conceptsPath : 'MISSING',
        syncFiles: [],
        timestamp: new Date(),
        issues: [{
          type: 'error',
          category: 'state_mismatch',
          message: 'Required directories not found',
          description: `Missing specs (${specsPath}) or concepts (${conceptsPath}) directory`,
          location: { file: this.config.projectRoot },
          suggestion: 'Create both specs and concepts directories'
        }],
        summary: { errors: 1, warnings: 0, info: 0, overallScore: 0 }
      }];
    }

    return await this.conceptImplValidator.validateAllConceptImplementations(specsPath, conceptsPath);
  }

  /**
   * Validate sync implementations only
   */
  async validateSyncImplementations(): Promise<ValidationReport[]> {
    const syncsPath = path.join(this.config.projectRoot, this.config.syncsDir);
    if (!fs.existsSync(syncsPath)) {
      return [{
        conceptName: 'DIRECTORY_ERROR',
        specFile: syncsPath,
        implementationFile: 'N/A',
        syncFiles: [],
        timestamp: new Date(),
        issues: [{
          type: 'error',
          category: 'sync_alignment',
          message: 'Syncs directory not found',
          description: `Directory ${syncsPath} does not exist`,
          location: { file: syncsPath },
          suggestion: `Create the syncs directory at ${syncsPath}`
        }],
        summary: { errors: 1, warnings: 0, info: 0, overallScore: 0 }
      }];
    }

    return await this.syncImplValidator.validateAllSyncImplementations(syncsPath);
  }

  /**
   * Validate cross-cutting concerns across the framework
   */
  private async validateCrossCuttingConcerns(result: FrameworkValidationResult): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Check for concept name consistency
    await this.validateConceptNameConsistency(result, issues);

    // Check for sync-concept alignment
    await this.validateSyncConceptAlignment(result, issues);

    // Check for framework completeness
    await this.validateFrameworkCompleteness(result, issues);

    // Check for architectural patterns
    await this.validateArchitecturalPatterns(result, issues);

    return issues;
  }

  /**
   * Validate concept name consistency across specs and implementations
   */
  private async validateConceptNameConsistency(
    result: FrameworkValidationResult, 
    issues: ValidationIssue[]
  ): Promise<void> {
    
    const specNames = new Set(result.conceptSpecs.map(r => r.conceptName.toLowerCase()));
    const implNames = new Set(result.conceptImplementations.map(r => r.conceptName.toLowerCase()));

    // Check for naming mismatches
    for (const specReport of result.conceptSpecs) {
      const specName = specReport.conceptName.toLowerCase();
      if (!implNames.has(specName) && !implNames.has(specName + 'concept')) {
        issues.push({
          type: 'warning',
          category: 'naming_convention',
          message: `Concept '${specReport.conceptName}' has naming inconsistency`,
          description: 'Concept name in spec does not match implementation file name',
          location: { file: specReport.specFile },
          suggestion: 'Ensure concept names are consistent between .concept and .ts files'
        });
      }
    }
  }

  /**
   * Validate sync-concept alignment
   */
  private async validateSyncConceptAlignment(
    result: FrameworkValidationResult, 
    issues: ValidationIssue[]
  ): Promise<void> {
    
    const conceptNames = new Set([
      ...result.conceptSpecs.map(r => r.conceptName),
      ...result.conceptImplementations.map(r => r.conceptName)
    ]);

    // Check if syncs reference non-existent concepts
    for (const syncReport of result.syncSpecs) {
      try {
        const syncPath = syncReport.syncFiles[0];
        if (syncPath && fs.existsSync(syncPath)) {
          const content = await fs.promises.readFile(syncPath, 'utf-8');
          
          // Extract concept references
          const conceptReferences = content.match(/(\w+)\.\w+\(/g) || [];
          for (const ref of conceptReferences) {
            const conceptName = ref.split('.')[0];
            if (!conceptNames.has(conceptName) && conceptName !== 'console' && conceptName !== 'Math') {
              issues.push({
                type: 'warning',
                category: 'sync_alignment',
                message: `Sync '${syncReport.conceptName}' references unknown concept '${conceptName}'`,
                description: 'Sync references a concept that may not exist in the project',
                location: { file: syncPath },
                suggestion: `Verify that concept '${conceptName}' exists or remove the reference`
              });
            }
          }
        }
      } catch (error) {
        // Skip if file cannot be read
      }
    }
  }

  /**
   * Validate framework completeness
   */
  private async validateFrameworkCompleteness(
    result: FrameworkValidationResult, 
    issues: ValidationIssue[]
  ): Promise<void> {
    
    // Check if there are concepts but no syncs
    if (result.conceptSpecs.length > 1 && result.syncSpecs.length === 0) {
      issues.push({
        type: 'info',
        category: 'sync_alignment',
        message: 'No synchronizations found',
        description: 'Multiple concepts exist but no synchronizations coordinate them',
        location: { file: this.config.projectRoot },
        suggestion: 'Consider adding synchronizations to coordinate concept interactions'
      });
    }

    // Check if there are many syncs relative to concepts
    if (result.syncSpecs.length > result.conceptSpecs.length * 2) {
      issues.push({
        type: 'warning',
        category: 'concept_independence',
        message: 'High sync-to-concept ratio',
        description: 'Many synchronizations relative to concepts may indicate tight coupling',
        location: { file: this.config.projectRoot },
        suggestion: 'Review if concepts are properly independent or if some syncs can be consolidated'
      });
    }

    // Check for missing core concepts
    const conceptNames = result.conceptSpecs.map(r => r.conceptName.toLowerCase());
    if (conceptNames.length > 0 && !conceptNames.includes('api') && !conceptNames.includes('user')) {
      issues.push({
        type: 'info',
        category: 'purpose_alignment',
        message: 'Consider adding core concepts',
        description: 'Most applications benefit from API and User concepts',
        location: { file: this.config.projectRoot },
        suggestion: 'Consider adding API concept for external interface and User concept for authentication'
      });
    }
  }

  /**
   * Validate architectural patterns
   */
  private async validateArchitecturalPatterns(
    result: FrameworkValidationResult, 
    issues: ValidationIssue[]
  ): Promise<void> {
    
    // Check for proper separation of concerns
    const allErrors = [
      ...result.conceptSpecs.flatMap(r => r.issues),
      ...result.conceptImplementations.flatMap(r => r.issues),
      ...result.syncSpecs.flatMap(r => r.issues),
      ...result.syncImplementations.flatMap(r => r.issues)
    ];

    const independenceViolations = allErrors.filter(i => i.category === 'concept_independence');
    if (independenceViolations.length > 0) {
      issues.push({
        type: 'warning',
        category: 'concept_independence',
        message: 'Multiple concept independence violations detected',
        description: `${independenceViolations.length} violations suggest architectural issues`,
        location: { file: this.config.projectRoot },
        suggestion: 'Review concept boundaries and remove direct dependencies between concepts'
      });
    }

    // Check for consistent error handling patterns
    const errorHandlingIssues = allErrors.filter(i => i.category === 'missing_error_handling');
    if (errorHandlingIssues.length > result.conceptImplementations.length * 0.5) {
      issues.push({
        type: 'info',
        category: 'missing_error_handling',
        message: 'Inconsistent error handling patterns',
        description: 'Many concepts lack proper error handling',
        location: { file: this.config.projectRoot },
        suggestion: 'Establish consistent error handling patterns across all concepts'
      });
    }
  }

  /**
   * Calculate framework summary
   */
  private calculateFrameworkSummary(result: FrameworkValidationResult): void {
    const allReports = [
      ...result.conceptSpecs,
      ...result.conceptImplementations,
      ...result.syncSpecs,
      ...result.syncImplementations
    ];

    const allIssues = [
      ...allReports.flatMap(r => r.issues),
      ...result.crossCuttingIssues
    ];

    const errors = allIssues.filter(i => i.type === 'error').length;
    const warnings = allIssues.filter(i => i.type === 'warning').length;
    const info = allIssues.filter(i => i.type === 'info').length;

    const conceptsAnalyzed = Math.max(result.conceptSpecs.length, result.conceptImplementations.length);
    const syncsAnalyzed = Math.max(result.syncSpecs.length, result.syncImplementations.length);

    result.summary = {
      totalErrors: errors,
      totalWarnings: warnings,
      totalInfo: info,
      overallScore: Math.max(0, 100 - (errors * 15 + warnings * 5 + info * 1)),
      conceptsAnalyzed,
      syncsAnalyzed
    };
  }
}
