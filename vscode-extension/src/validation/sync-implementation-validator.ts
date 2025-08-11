/**
 * Sync Implementation Validator
 * 
 * Validates that sync implementations correctly coordinate between concepts
 * and follow synchronization design principles.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AIAnalyzer } from './ai-analyzer';
import { ValidationReport, ValidationIssue, SyncSpec } from './types';

export class SyncImplementationValidator {
  private aiAnalyzer?: AIAnalyzer;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.aiAnalyzer = new AIAnalyzer(apiKey);
    }
  }

  /**
   * Validate a sync implementation
   */
  async validateSyncImplementation(filePath: string): Promise<ValidationReport> {
    const report: ValidationReport = {
      conceptName: path.basename(filePath, '.ts'),
      specFile: filePath,
      implementationFile: filePath,
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
      
      // Parse the sync implementation
      const syncSpec = this.parseSyncImplementation(content, filePath);
      
      // Validate implementation patterns
      await this.validateImplementationPatterns(syncSpec, content, report);
      
      // Validate concept interactions
      await this.validateConceptInteractions(syncSpec, content, report);
      
      // Perform AI analysis if available
      if (this.aiAnalyzer) {
        await this.performAIAnalysis(syncSpec, content, report);
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
        message: 'Failed to validate sync implementation',
        description: error instanceof Error ? error.message : 'Unknown validation error',
        location: { file: filePath }
      });
      report.summary.errors = 1;
      report.summary.overallScore = 0;
    }

    return report;
  }

  /**
   * Validate all sync implementations in a directory
   */
  async validateAllSyncImplementations(syncsDir: string): Promise<ValidationReport[]> {
    const reports: ValidationReport[] = [];

    try {
      const files = await fs.promises.readdir(syncsDir);
      const syncFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));

      for (const file of syncFiles) {
        const fullPath = path.join(syncsDir, file);
        const report = await this.validateSyncImplementation(fullPath);
        reports.push(report);
      }
    } catch (error) {
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
   * Parse sync implementation to extract sync specification
   */
  private parseSyncImplementation(content: string, filePath: string): SyncSpec {
    const spec: SyncSpec = {
      name: path.basename(filePath, '.ts'),
      file: filePath,
      when: [],
      where: [],
      then: []
    };

    const lines = content.split('\n');
    let inWhenClause = false;
    let inThenClause = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track brace depth
      for (const char of line) {
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
      }

      // Detect when/then sections in object literals
      if (trimmed.includes('when:') || trimmed.match(/when\s*:/)) {
        inWhenClause = true;
        inThenClause = false;
      } else if (trimmed.includes('then:') || trimmed.match(/then\s*:/)) {
        inWhenClause = false;
        inThenClause = true;
      }

      // Extract concept method calls
      const conceptCallMatches = trimmed.matchAll(/(\w+)\.(\w+)\s*\(/g);
      for (const match of conceptCallMatches) {
        const [, concept, action] = match;
        const syncAction = {
          concept,
          action,
          inputs: {},
          outputs: {}
        };

        if (inWhenClause) {
          spec.when.push(syncAction);
        } else if (inThenClause) {
          spec.then.push(syncAction);
        }
      }

      // Extract await calls (concept actions)
      const awaitCallMatches = trimmed.matchAll(/await\s+(\w+)\.(\w+)\s*\(/g);
      for (const match of awaitCallMatches) {
        const [, concept, action] = match;
        const syncAction = {
          concept,
          action,
          inputs: {},
          outputs: {}
        };

        if (inThenClause || (!inWhenClause && !inThenClause)) {
          spec.then.push(syncAction);
        }
      }
    }

    return spec;
  }

  /**
   * Validate implementation patterns
   */
  private async validateImplementationPatterns(
    spec: SyncSpec,
    content: string,
    report: ValidationReport
  ): Promise<void> {
    
    // Check for proper export
    if (!content.includes('export')) {
      report.issues.push({
        type: 'error',
        category: 'sync_alignment',
        message: 'Sync must be exported',
        description: 'Synchronizations must be exported for registration with the engine',
        location: { file: spec.file },
        suggestion: 'Add export statement (e.g., export function syncName or export default)'
      });
    }

    // Check for proper function structure
    if (!content.includes('function') && !content.includes('=>')) {
      report.issues.push({
        type: 'warning',
        category: 'sync_alignment',
        message: 'Sync should be a function',
        description: 'Synchronizations should be implemented as functions',
        location: { file: spec.file },
        suggestion: 'Structure as a function that takes sync engine as parameter'
      });
    }

    // Check for async patterns
    const hasAsyncCalls = content.includes('await') || content.includes('.action(') || content.includes('.query(');
    if (hasAsyncCalls && !content.includes('async')) {
      report.issues.push({
        type: 'error',
        category: 'sync_alignment',
        message: 'Sync should be async',
        description: 'Synchronizations with concept calls must be async',
        location: { file: spec.file },
        suggestion: 'Add async keyword to function declaration'
      });
    }

    // Check for proper sync structure (when/then)
    if (spec.when.length === 0 && spec.then.length === 0) {
      report.issues.push({
        type: 'warning',
        category: 'sync_alignment',
        message: 'No clear when/then structure',
        description: 'Synchronizations should have clear triggering and response patterns',
        location: { file: spec.file },
        suggestion: 'Structure sync with clear when (trigger) and then (response) logic'
      });
    }

    // Check for error handling
    if (!content.includes('try') && !content.includes('catch') && hasAsyncCalls) {
      report.issues.push({
        type: 'warning',
        category: 'missing_error_handling',
        message: 'Missing error handling',
        description: 'Synchronizations should handle potential errors from concept calls',
        location: { file: spec.file },
        suggestion: 'Add try/catch blocks around concept action calls'
      });
    }
  }

  /**
   * Validate concept interactions
   */
  private async validateConceptInteractions(
    spec: SyncSpec,
    content: string,
    report: ValidationReport
  ): Promise<void> {
    
    const allActions = [...spec.when, ...spec.then];
    const conceptNames = new Set(allActions.map(a => a.concept));

    // Check concept independence
    if (conceptNames.size > 5) {
      report.issues.push({
        type: 'warning',
        category: 'concept_independence',
        message: 'Sync involves many concepts',
        description: `This sync coordinates ${conceptNames.size} concepts, which may indicate tight coupling`,
        location: { file: spec.file },
        suggestion: 'Consider breaking this into smaller, more focused synchronizations'
      });
    }

    // Check for proper concept naming
    for (const action of allActions) {
      if (!/^[A-Z][A-Za-z0-9]*$/.test(action.concept)) {
        report.issues.push({
          type: 'warning',
          category: 'naming_convention',
          message: `Concept name '${action.concept}' should use PascalCase`,
          description: 'Concept names should follow PascalCase convention',
          location: { file: spec.file },
          suggestion: `Use PascalCase for concept name: ${action.concept}`
        });
      }

      // Check action/query naming
      if (action.action.startsWith('_')) {
        // This is a query
        if (!/^_[a-z][A-Za-z0-9]*$/.test(action.action)) {
          report.issues.push({
            type: 'warning',
            category: 'naming_convention',
            message: `Query '${action.action}' should follow camelCase after underscore`,
            description: 'Query methods should start with underscore followed by camelCase',
            location: { file: spec.file },
            suggestion: 'Use camelCase after the underscore prefix'
          });
        }
      } else {
        // This is an action
        if (!/^[a-z][A-Za-z0-9]*$/.test(action.action)) {
          report.issues.push({
            type: 'warning',
            category: 'naming_convention',
            message: `Action '${action.action}' should use camelCase`,
            description: 'Action methods should follow camelCase convention',
            location: { file: spec.file },
            suggestion: 'Use camelCase for action names'
          });
        }
      }
    }

    // Check for circular dependencies
    this.validateCircularDependencies(spec, content, report);

    // Check for data flow patterns
    this.validateDataFlow(spec, content, report);
  }

  /**
   * Validate circular dependencies
   */
  private validateCircularDependencies(
    spec: SyncSpec,
    content: string,
    report: ValidationReport
  ): void {
    
    // Simple check: if a concept appears in both when and then, it might be circular
    const whenConcepts = new Set(spec.when.map(w => w.concept));
    const thenConcepts = new Set(spec.then.map(t => t.concept));
    
    const overlap = [...whenConcepts].filter(c => thenConcepts.has(c));
    
    if (overlap.length > 0) {
      report.issues.push({
        type: 'info',
        category: 'concept_independence',
        message: 'Potential circular dependency',
        description: `Concepts ${overlap.join(', ')} appear in both trigger and response`,
        location: { file: spec.file },
        suggestion: 'Verify this pattern doesn\'t create infinite loops'
      });
    }
  }

  /**
   * Validate data flow patterns
   */
  private validateDataFlow(
    spec: SyncSpec,
    content: string,
    report: ValidationReport
  ): void {
    
    // Check for proper data passing between actions
    const hasDataPassing = content.includes('result') || content.includes('response') || content.includes('output');
    
    if (spec.then.length > 1 && !hasDataPassing) {
      report.issues.push({
        type: 'info',
        category: 'sync_alignment',
        message: 'Consider data flow between actions',
        description: 'Multiple actions in then clause might benefit from data passing',
        location: { file: spec.file },
        suggestion: 'Consider passing data between sequential concept actions'
      });
    }

    // Check for proper input validation
    if (!content.includes('input') && (spec.when.length > 0 || spec.then.length > 0)) {
      report.issues.push({
        type: 'info',
        category: 'sync_alignment',
        message: 'Consider input validation',
        description: 'Synchronizations should validate inputs before processing',
        location: { file: spec.file },
        suggestion: 'Add input validation at the beginning of the sync function'
      });
    }
  }

  /**
   * Perform AI analysis of sync implementation
   */
  private async performAIAnalysis(
    spec: SyncSpec,
    content: string,
    report: ValidationReport
  ): Promise<void> {
    
    if (!this.aiAnalyzer) return;

    try {
      const prompt = this.buildAIAnalysisPrompt(spec, content);
      
      // Use general purpose analysis
      const analysis = await this.aiAnalyzer.analyzeSpecificAspect(
        {
          name: spec.name,
          purpose: 'Synchronization coordination',
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
        implementationQuality: 'Sync implementation analysis',
        suggestions: []
      };

      // Parse analysis for specific issues
      if (analysis.toLowerCase().includes('complex') || analysis.toLowerCase().includes('unclear')) {
        report.issues.push({
          type: 'warning',
          category: 'sync_alignment',
          message: 'Sync implementation may be complex',
          description: 'AI analysis suggests the synchronization logic could be simplified',
          location: { file: spec.file },
          suggestion: 'Consider breaking down complex sync logic into smaller functions'
        });
      }

      if (analysis.toLowerCase().includes('tight') || analysis.toLowerCase().includes('coupled')) {
        report.issues.push({
          type: 'warning',
          category: 'concept_independence',
          message: 'Potential tight coupling detected',
          description: 'AI analysis suggests concepts may be too tightly coupled',
          location: { file: spec.file },
          suggestion: 'Review concept interactions to ensure proper separation of concerns'
        });
      }

    } catch (error) {
      report.issues.push({
        type: 'warning',
        category: 'sync_alignment',
        message: 'AI analysis failed',
        description: error instanceof Error ? error.message : 'Unknown AI analysis error',
        location: { file: spec.file }
      });
    }
  }

  /**
   * Build AI analysis prompt
   */
  private buildAIAnalysisPrompt(spec: SyncSpec, content: string): string {
    return `
Please analyze this synchronization implementation for code quality and adherence to concept design principles:

Sync: ${spec.name}
When actions: ${spec.when.map(w => `${w.concept}.${w.action}`).join(', ')}
Then actions: ${spec.then.map(t => `${t.concept}.${t.action}`).join(', ')}

Implementation:
${content}

Evaluate:
1. Is the sync logic clear and well-structured?
2. Does it maintain concept independence?
3. Are error cases properly handled?
4. Is the coordination logic focused and not overly complex?
5. Does it follow async/await patterns correctly?
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
