/**
 * Sync Specification Validator
 * 
 * Validates that sync specifications are well-defined, have no errors,
 * and meet the requirements for synchronizations using OpenAI API analysis.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AIAnalyzer } from './ai-analyzer';
import { ValidationReport, ValidationIssue, SyncSpec } from './types';

export class SyncSpecValidator {
  private aiAnalyzer?: AIAnalyzer;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.aiAnalyzer = new AIAnalyzer(apiKey);
    }
  }

  /**
   * Validate a single sync specification file
   */
  async validateSyncSpec(filePath: string): Promise<ValidationReport> {
    const report: ValidationReport = {
      conceptName: path.basename(filePath, '.ts'),
      specFile: filePath,
      implementationFile: filePath, // Sync files are both spec and implementation
      syncFiles: [filePath],
      timestamp: new Date(),
      issues: [],
      summary: {
        errors: 0,
        warnings: 0,
        info: 0,
        overallScore: 0
      }
    };

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // Parse the sync specification
      const syncSpec = this.parseSyncFile(content, filePath);
      
      // Perform structural validation
      await this.validateStructure(syncSpec, content, report);
      
      // Perform semantic validation using AI if available
      if (this.aiAnalyzer) {
        await this.validateSemantics(syncSpec, content, report);
      } else {
        report.issues.push({
          type: 'info',
          category: 'sync_alignment',
          message: 'AI analysis not available',
          description: 'Set OpenAI API key for semantic validation',
          location: { file: filePath }
        });
      }

      // Calculate summary
      this.calculateSummary(report);

    } catch (error) {
      report.issues.push({
        type: 'error',
        category: 'sync_alignment',
        message: 'Failed to parse sync specification',
        description: error instanceof Error ? error.message : 'Unknown parsing error',
        location: { file: filePath }
      });
      report.summary.errors = 1;
      report.summary.overallScore = 0;
    }

    return report;
  }

  /**
   * Validate all sync specifications in a directory
   */
  async validateAllSyncSpecs(syncsDir: string): Promise<ValidationReport[]> {
    const reports: ValidationReport[] = [];

    try {
      const files = await fs.promises.readdir(syncsDir);
      const syncFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));

      for (const file of syncFiles) {
        const fullPath = path.join(syncsDir, file);
        const report = await this.validateSyncSpec(fullPath);
        reports.push(report);
      }
    } catch (error) {
      // Create an error report if directory cannot be read
      reports.push({
        conceptName: 'DIRECTORY_ERROR',
        specFile: syncsDir,
        implementationFile: 'N/A',
        syncFiles: [],
        timestamp: new Date(),
        issues: [{
          type: 'error',
          category: 'sync_alignment',
          message: 'Cannot read syncs directory',
          description: error instanceof Error ? error.message : 'Unknown directory error',
          location: { file: syncsDir }
        }],
        summary: { errors: 1, warnings: 0, info: 0, overallScore: 0 }
      });
    }

    return reports;
  }

  /**
   * Parse sync file to extract sync specification
   */
  private parseSyncFile(content: string, filePath: string): SyncSpec {
    const spec: SyncSpec = {
      name: path.basename(filePath, '.ts'),
      file: filePath,
      when: [],
      where: [],
      then: []
    };

    const lines = content.split('\n');
    let currentSection = '';
    let braceDepth = 0;
    let inWhen = false;
    let inThen = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track brace depth for nested structures
      for (const char of line) {
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
      }

      // Detect when/then sections
      if (trimmed.includes('when:') || trimmed.includes('when :')) {
        inWhen = true;
        inThen = false;
        currentSection = 'when';
      } else if (trimmed.includes('then:') || trimmed.includes('then :')) {
        inWhen = false;
        inThen = true;
        currentSection = 'then';
      }

      // Extract concept actions
      const conceptActionMatch = trimmed.match(/(\w+)\.(\w+)\(/);
      if (conceptActionMatch && (inWhen || inThen)) {
        const [, concept, action] = conceptActionMatch;
        const syncAction = {
          concept,
          action,
          inputs: {},
          outputs: {}
        };

        if (inWhen) {
          spec.when.push(syncAction);
        } else if (inThen) {
          spec.then.push(syncAction);
        }
      }
    }

    return spec;
  }

  /**
   * Validate structural requirements of a sync spec
   */
  private async validateStructure(spec: SyncSpec, content: string, report: ValidationReport): Promise<void> {
    // Check for required sync structure
    if (!content.includes('export')) {
      report.issues.push({
        type: 'error',
        category: 'sync_alignment',
        message: 'Sync should export a function',
        description: 'Synchronizations must be exported for registration',
        location: { file: spec.file },
        suggestion: 'Add export statement for the sync function'
      });
    }

    // Check for when clause
    if (spec.when.length === 0 && !content.includes('when')) {
      report.issues.push({
        type: 'warning',
        category: 'sync_alignment',
        message: 'Missing when clause',
        description: 'Synchronizations should specify triggering conditions',
        location: { file: spec.file },
        suggestion: 'Add when clause to specify what triggers this sync'
      });
    }

    // Check for then clause
    if (spec.then.length === 0 && !content.includes('then')) {
      report.issues.push({
        type: 'warning',
        category: 'sync_alignment',
        message: 'Missing then clause',
        description: 'Synchronizations should specify consequent actions',
        location: { file: spec.file },
        suggestion: 'Add then clause to specify what actions to take'
      });
    }

    // Validate concept references
    this.validateConceptReferences(spec, content, report);

    // Check for proper async patterns
    if (!content.includes('async') && (content.includes('await') || content.includes('.action') || content.includes('.query'))) {
      report.issues.push({
        type: 'warning',
        category: 'sync_alignment',
        message: 'Sync function should be async',
        description: 'Synchronizations that call concept actions should be async',
        location: { file: spec.file },
        suggestion: 'Make the sync function async if it calls concept actions'
      });
    }
  }

  /**
   * Validate concept references in sync
   */
  private validateConceptReferences(spec: SyncSpec, content: string, report: ValidationReport): void {
    const allActions = [...spec.when, ...spec.then];
    
    for (const action of allActions) {
      // Validate concept name format
      if (!/^[A-Z][A-Za-z0-9_]*$/.test(action.concept)) {
        report.issues.push({
          type: 'warning',
          category: 'naming_convention',
          message: `Concept name '${action.concept}' should start with uppercase letter`,
          description: 'Follow PascalCase convention for concept names',
          location: { file: spec.file },
          suggestion: `Use proper PascalCase for concept name: ${action.concept}`
        });
      }

      // Validate action/query naming
      if (action.action.startsWith('_') && !/^_[a-z][A-Za-z0-9_]*$/.test(action.action)) {
        report.issues.push({
          type: 'warning',
          category: 'naming_convention',
          message: `Query method '${action.action}' naming convention`,
          description: 'Query methods should start with underscore followed by camelCase',
          location: { file: spec.file },
          suggestion: 'Follow camelCase convention after the underscore'
        });
      }
    }

    // Check for potential concept independence violations
    const conceptNames = new Set(allActions.map(a => a.concept));
    if (conceptNames.size > 3) {
      report.issues.push({
        type: 'info',
        category: 'concept_independence',
        message: 'Sync involves many concepts',
        description: `This sync references ${conceptNames.size} different concepts`,
        location: { file: spec.file },
        suggestion: 'Consider if this sync maintains clear separation of concerns'
      });
    }
  }

  /**
   * Validate semantics using AI analysis
   */
  private async validateSemantics(spec: SyncSpec, content: string, report: ValidationReport): Promise<void> {
    if (!this.aiAnalyzer) return;

    try {
      const prompt = this.buildSemanticValidationPrompt(spec, content);
      
      // Use general purpose analysis since we don't have a specific sync analyzer method
      const analysis = await this.aiAnalyzer.analyzeSpecificAspect(
        {
          name: spec.name,
          purpose: 'Synchronization between concepts',
          state: {},
          actions: [],
          queries: [],
          operationalPrinciple: content,
          file: spec.file
        },
        {
          name: spec.name,
          className: '',
          file: spec.file,
          methods: [],
          imports: [],
          exports: [],
          dependencies: []
        },
        'purpose'
      );

      report.aiAnalysis = {
        conceptPurposeAlignment: analysis,
        implementationQuality: 'Sync semantic analysis',
        suggestions: []
      };

      // Parse AI analysis for sync-specific issues
      if (analysis.toLowerCase().includes('unclear') || analysis.toLowerCase().includes('complex')) {
        report.issues.push({
          type: 'warning',
          category: 'sync_alignment',
          message: 'Sync logic may be unclear',
          description: 'AI analysis suggests the synchronization logic could be simplified',
          location: { file: spec.file },
          suggestion: 'Consider simplifying the sync logic or adding comments'
        });
      }

    } catch (error) {
      report.issues.push({
        type: 'warning',
        category: 'sync_alignment',
        message: 'AI semantic analysis failed',
        description: error instanceof Error ? error.message : 'Unknown AI analysis error',
        location: { file: spec.file }
      });
    }
  }

  /**
   * Build prompt for semantic validation
   */
  private buildSemanticValidationPrompt(spec: SyncSpec, content: string): string {
    return `
Please analyze this synchronization specification for semantic clarity and adherence to concept design principles:

Sync: ${spec.name}
When actions: ${spec.when.map(w => `${w.concept}.${w.action}`).join(', ')}
Then actions: ${spec.then.map(t => `${t.concept}.${t.action}`).join(', ')}

Code:
${content}

Evaluate:
1. Is the synchronization logic clear and understandable?
2. Does it maintain concept independence (no direct concept-to-concept dependencies)?
3. Are the triggering conditions (when) appropriate for the resulting actions (then)?
4. Is the sync focused on a single coordination concern?
`;
  }

  /**
   * Calculate summary scores
   */
  private calculateSummary(report: ValidationReport): void {
    const errors = report.issues.filter(i => i.type === 'error').length;
    const warnings = report.issues.filter(i => i.type === 'warning').length;
    const info = report.issues.filter(i => i.type === 'info').length;
    
    report.summary = {
      errors,
      warnings,
      info,
      overallScore: Math.max(0, 100 - (errors * 20 + warnings * 8 + info * 2))
    };
  }
}
