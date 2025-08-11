/**
 * Concept Specification Validator
 * 
 * Validates that concept specifications are well-defined, have no errors,
 * and meet the requirements for a concept using OpenAI API analysis.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConceptSpecParser } from './spec-parser';
import { AIAnalyzer } from './ai-analyzer';
import { ValidationReport, ValidationIssue, ConceptSpec } from './types';

export class ConceptSpecValidator {
  private specParser: ConceptSpecParser;
  private aiAnalyzer?: AIAnalyzer;

  constructor(apiKey?: string) {
    this.specParser = new ConceptSpecParser();
    if (apiKey) {
      this.aiAnalyzer = new AIAnalyzer(apiKey);
    }
  }

  /**
   * Validate a single concept specification file
   */
  async validateConceptSpec(filePath: string): Promise<ValidationReport> {
    const report: ValidationReport = {
      conceptName: path.basename(filePath, '.concept'),
      specFile: filePath,
      implementationFile: 'N/A',
      syncFiles: [],
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
      // Parse the concept spec
      const spec = await this.specParser.parseConceptFile(filePath);
      
      // Perform basic structural validation
      await this.validateStructure(spec, report);
      
      // Perform semantic validation using AI if available
      if (this.aiAnalyzer) {
        await this.validateSemantics(spec, report);
      } else {
        report.issues.push({
          type: 'info',
          category: 'purpose_alignment',
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
        category: 'state_mismatch',
        message: 'Failed to parse concept specification',
        description: error instanceof Error ? error.message : 'Unknown parsing error',
        location: { file: filePath }
      });
      report.summary.errors = 1;
      report.summary.overallScore = 0;
    }

    return report;
  }

  /**
   * Validate all concept specifications in a directory
   */
  async validateAllConceptSpecs(specsDir: string): Promise<ValidationReport[]> {
    const reports: ValidationReport[] = [];

    try {
      const files = await fs.promises.readdir(specsDir);
      const conceptFiles = files.filter(f => f.endsWith('.concept'));

      for (const file of conceptFiles) {
        const fullPath = path.join(specsDir, file);
        const report = await this.validateConceptSpec(fullPath);
        reports.push(report);
      }
    } catch (error) {
      // Create an error report if directory cannot be read
      reports.push({
        conceptName: 'DIRECTORY_ERROR',
        specFile: specsDir,
        implementationFile: 'N/A',
        syncFiles: [],
        timestamp: new Date(),
        issues: [{
          type: 'error',
          category: 'state_mismatch',
          message: 'Cannot read specs directory',
          description: error instanceof Error ? error.message : 'Unknown directory error',
          location: { file: specsDir }
        }],
        summary: { errors: 1, warnings: 0, info: 0, overallScore: 0 }
      });
    }

    return reports;
  }

  /**
   * Validate structural requirements of a concept spec
   */
  private async validateStructure(spec: ConceptSpec, report: ValidationReport): Promise<void> {
    const specErrors = this.specParser.validateSpec(spec);
    
    for (const error of specErrors) {
      report.issues.push({
        type: 'error',
        category: 'state_mismatch',
        message: error,
        description: 'Specification structure is invalid',
        location: { file: spec.file },
        suggestion: this.getSuggestionForStructuralError(error)
      });
    }

    // Validate concept design principles
    this.validateConceptDesignPrinciples(spec, report);
  }

  /**
   * Validate adherence to concept design principles
   */
  private validateConceptDesignPrinciples(spec: ConceptSpec, report: ValidationReport): void {
    // Check single purpose principle
    if (!spec.purpose || spec.purpose.split(' ').length < 3) {
      report.issues.push({
        type: 'warning',
        category: 'purpose_alignment',
        message: 'Purpose statement should be more descriptive',
        description: 'A clear purpose helps ensure single responsibility',
        location: { file: spec.file },
        suggestion: 'Write a clear, concise purpose statement describing what this concept does'
      });
    }

    // Check state independence
    if (Object.keys(spec.state).length === 0) {
      report.issues.push({
        type: 'warning',
        category: 'state_mismatch',
        message: 'No state defined',
        description: 'Most concepts should define their data structure',
        location: { file: spec.file },
        suggestion: 'Define the state structure this concept manages'
      });
    }

    // Check action/query balance
    if (spec.actions.length === 0 && spec.queries.length === 0) {
      report.issues.push({
        type: 'error',
        category: 'missing_action',
        message: 'No actions or queries defined',
        description: 'Concepts must provide ways to interact with their state',
        location: { file: spec.file },
        suggestion: 'Add actions for state modification and/or queries for state access'
      });
    }

    // Validate query naming convention
    for (const query of spec.queries) {
      if (!query.name.startsWith('_')) {
        report.issues.push({
          type: 'error',
          category: 'naming_convention',
          message: `Query '${query.name}' should start with underscore`,
          description: 'Query methods must start with underscore to distinguish from actions',
          location: { file: spec.file, line: query.lineNumber },
          suggestion: `Rename to '_${query.name}'`
        });
      }
    }

    // Validate operational principle
    if (!spec.operationalPrinciple || spec.operationalPrinciple.length < 20) {
      report.issues.push({
        type: 'warning',
        category: 'operational_principle_violation',
        message: 'Operational principle should be more detailed',
        description: 'Operational principle demonstrates how the concept fulfills its purpose',
        location: { file: spec.file },
        suggestion: 'Write a detailed operational principle showing how actions and queries work together'
      });
    }
  }

  /**
   * Validate semantics using AI analysis
   */
  private async validateSemantics(spec: ConceptSpec, report: ValidationReport): Promise<void> {
    if (!this.aiAnalyzer) return;

    try {
      // Create a prompt for semantic validation
      const prompt = this.buildSemanticValidationPrompt(spec);
      
      const analysis = await this.aiAnalyzer.analyzeSpecificAspect(
        spec,
        { 
          name: spec.name,
          className: '',
          file: '',
          methods: [],
          imports: [],
          exports: [],
          dependencies: []
        },
        'purpose'
      );

      report.aiAnalysis = {
        conceptPurposeAlignment: analysis,
        implementationQuality: 'N/A - Spec validation only',
        suggestions: []
      };

      // Parse AI analysis for specific issues
      if (analysis.toLowerCase().includes('unclear') || analysis.toLowerCase().includes('vague')) {
        report.issues.push({
          type: 'warning',
          category: 'purpose_alignment',
          message: 'Purpose may be unclear',
          description: 'AI analysis suggests the purpose could be more specific',
          location: { file: spec.file },
          suggestion: 'Refine the purpose statement to be more specific and actionable'
        });
      }

    } catch (error) {
      report.issues.push({
        type: 'warning',
        category: 'purpose_alignment',
        message: 'AI semantic analysis failed',
        description: error instanceof Error ? error.message : 'Unknown AI analysis error',
        location: { file: spec.file }
      });
    }
  }

  /**
   * Build prompt for semantic validation
   */
  private buildSemanticValidationPrompt(spec: ConceptSpec): string {
    return `
Please analyze this concept specification for semantic clarity and adherence to concept design principles:

Concept: ${spec.name}
Purpose: ${spec.purpose}
State: ${JSON.stringify(spec.state, null, 2)}
Actions: ${spec.actions.map(a => a.name).join(', ')}
Queries: ${spec.queries.map(q => q.name).join(', ')}
Operational Principle: ${spec.operationalPrinciple}

Evaluate:
1. Is the purpose clear and focused on a single responsibility?
2. Do the actions and queries logically support the purpose?
3. Is the state structure appropriate for the purpose?
4. Does the operational principle demonstrate coherent behavior?
`;
  }

  /**
   * Get suggestion for structural errors
   */
  private getSuggestionForStructuralError(error: string): string {
    if (error.includes('name is missing')) {
      return 'Add "concept ConceptName" at the top of the file';
    }
    if (error.includes('Purpose is missing')) {
      return 'Add a "purpose" section describing what this concept does';
    }
    if (error.includes('State specification is missing')) {
      return 'Add a "state" section defining the data structure';
    }
    if (error.includes('No actions defined')) {
      return 'Add an "actions" section with methods that modify state';
    }
    return 'Check the concept specification format and required sections';
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
      overallScore: Math.max(0, 100 - (errors * 25 + warnings * 10 + info * 2))
    };
  }
}
