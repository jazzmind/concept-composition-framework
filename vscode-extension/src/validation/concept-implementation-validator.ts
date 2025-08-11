/**
 * Concept Implementation Validator
 * 
 * Validates that concept TypeScript implementations correctly implement
 * the concept specification and follow concept design principles.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConceptSpecParser } from './spec-parser';
import { TypeScriptAnalyzer } from './ts-analyzer';
import { AIAnalyzer } from './ai-analyzer';
import { ValidationReport, ValidationIssue, ConceptSpec, ConceptImplementation } from './types';

export class ConceptImplementationValidator {
  private specParser: ConceptSpecParser;
  private tsAnalyzer: TypeScriptAnalyzer;
  private aiAnalyzer?: AIAnalyzer;

  constructor(apiKey?: string) {
    this.specParser = new ConceptSpecParser();
    this.tsAnalyzer = new TypeScriptAnalyzer();
    if (apiKey) {
      this.aiAnalyzer = new AIAnalyzer(apiKey);
    }
  }

  /**
   * Validate a concept implementation against its specification
   */
  async validateConceptImplementation(
    specPath: string, 
    implementationPath: string
  ): Promise<ValidationReport> {
    
    const report: ValidationReport = {
      conceptName: path.basename(specPath, '.concept'),
      specFile: specPath,
      implementationFile: implementationPath,
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
      // Parse specification and implementation
      const spec = await this.specParser.parseConceptFile(specPath);
      const implementation = await this.tsAnalyzer.analyzeImplementationFile(implementationPath);

      // Validate alignment between spec and implementation
      await this.validateAlignment(spec, implementation, report);

      // Validate implementation patterns
      await this.validateImplementationPatterns(implementation, report);

      // Perform AI analysis if available
      if (this.aiAnalyzer) {
        await this.performAIAnalysis(spec, implementation, report);
      } else {
        report.issues.push({
          type: 'info',
          category: 'purpose_alignment',
          message: 'AI analysis not available',
          description: 'Set OpenAI API key for semantic validation',
          location: { file: implementationPath }
        });
      }

      // Calculate summary
      this.calculateSummary(report);

    } catch (error) {
      report.issues.push({
        type: 'error',
        category: 'state_mismatch',
        message: 'Failed to validate implementation',
        description: error instanceof Error ? error.message : 'Unknown validation error',
        location: { file: implementationPath }
      });
      report.summary.errors = 1;
      report.summary.overallScore = 0;
    }

    return report;
  }

  /**
   * Validate all concept implementations in directories
   */
  async validateAllConceptImplementations(
    specsDir: string, 
    conceptsDir: string
  ): Promise<ValidationReport[]> {
    const reports: ValidationReport[] = [];

    try {
      const specFiles = await fs.promises.readdir(specsDir);
      const conceptSpecs = specFiles.filter(f => f.endsWith('.concept'));

      for (const specFile of conceptSpecs) {
        const specPath = path.join(specsDir, specFile);
        const conceptName = path.basename(specFile, '.concept').toLowerCase();
        const implPath = path.join(conceptsDir, `${conceptName}.ts`);

        if (fs.existsSync(implPath)) {
          const report = await this.validateConceptImplementation(specPath, implPath);
          reports.push(report);
        } else {
          // Create missing implementation report
          reports.push(this.createMissingImplementationReport(specPath, implPath));
        }
      }

      // Check for implementations without specs
      const implFiles = await fs.promises.readdir(conceptsDir);
      const tsFiles = implFiles.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));

      for (const implFile of tsFiles) {
        const implName = path.basename(implFile, '.ts');
        const specPath = path.join(specsDir, `${implName}.concept`);
        
        if (!fs.existsSync(specPath)) {
          const implPath = path.join(conceptsDir, implFile);
          reports.push(this.createMissingSpecReport(implPath, specPath));
        }
      }

    } catch (error) {
      reports.push({
        conceptName: 'DIRECTORY_ERROR',
        specFile: specsDir,
        implementationFile: conceptsDir,
        syncFiles: [],
        timestamp: new Date(),
        issues: [{
          type: 'error',
          category: 'state_mismatch',
          message: 'Cannot read concept directories',
          description: error instanceof Error ? error.message : 'Unknown directory error',
          location: { file: specsDir }
        }],
        summary: { errors: 1, warnings: 0, info: 0, overallScore: 0 }
      });
    }

    return reports;
  }

  /**
   * Validate alignment between specification and implementation
   */
  private async validateAlignment(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    report: ValidationReport
  ): Promise<void> {
    
    // Validate actions
    await this.validateActions(spec, implementation, report);
    
    // Validate queries
    await this.validateQueries(spec, implementation, report);
    
    // Validate class naming
    await this.validateNaming(spec, implementation, report);
    
    // Validate concept independence
    await this.validateIndependence(implementation, report);
  }

  /**
   * Validate action implementations
   */
  private async validateActions(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    report: ValidationReport
  ): Promise<void> {
    
    const implementedActions = implementation.methods.filter(m => !m.isQuery);
    const specActions = spec.actions;

    // Check for missing actions
    for (const specAction of specActions) {
      const implemented = implementedActions.find(impl => impl.name === specAction.name);
      if (!implemented) {
        report.issues.push({
          type: 'error',
          category: 'missing_action',
          message: `Missing action: ${specAction.name}`,
          description: `Action '${specAction.name}' is specified but not implemented`,
          location: { file: implementation.file },
          suggestion: `Implement the '${specAction.name}' method in the concept class`,
          related: {
            file: spec.file,
            line: specAction.lineNumber,
            excerpt: specAction.signature
          }
        });
      } else {
        // Validate action signature and patterns
        this.validateActionImplementation(specAction, implemented, report);
      }
    }

    // Check for extra actions
    for (const implAction of implementedActions) {
      const specified = specActions.find(spec => spec.name === implAction.name);
      if (!specified && !this.isUtilityMethod(implAction.name)) {
        report.issues.push({
          type: 'warning',
          category: 'signature_mismatch',
          message: `Unspecified action: ${implAction.name}`,
          description: `Action '${implAction.name}' is implemented but not in specification`,
          location: { 
            file: implementation.file, 
            line: implAction.lineNumber 
          },
          suggestion: `Add '${implAction.name}' to the concept specification or remove if unnecessary`
        });
      }
    }
  }

  /**
   * Validate query implementations
   */
  private async validateQueries(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    report: ValidationReport
  ): Promise<void> {
    
    const implementedQueries = implementation.methods.filter(m => m.isQuery);
    const specQueries = spec.queries;

    // Check for missing queries
    for (const specQuery of specQueries) {
      const implemented = implementedQueries.find(impl => impl.name === specQuery.name);
      if (!implemented) {
        report.issues.push({
          type: 'error',
          category: 'missing_query',
          message: `Missing query: ${specQuery.name}`,
          description: `Query '${specQuery.name}' is specified but not implemented`,
          location: { file: implementation.file },
          suggestion: `Implement the '${specQuery.name}' method in the concept class`,
          related: {
            file: spec.file,
            line: specQuery.lineNumber,
            excerpt: specQuery.signature
          }
        });
      } else {
        // Validate query returns array
        this.validateQueryImplementation(specQuery, implemented, report);
      }
    }

    // Check for queries not starting with underscore
    for (const implQuery of implementedQueries) {
      if (!implQuery.name.startsWith('_')) {
        report.issues.push({
          type: 'error',
          category: 'naming_convention',
          message: `Query '${implQuery.name}' should start with underscore`,
          description: 'All query methods must start with underscore to distinguish from actions',
          location: { 
            file: implementation.file, 
            line: implQuery.lineNumber 
          },
          suggestion: `Rename to '_${implQuery.name}'`
        });
      }
    }
  }

  /**
   * Validate specific action implementation
   */
  private validateActionImplementation(
    specAction: any,
    implAction: any,
    report: ValidationReport
  ): void {
    
    // Check error handling
    if (!implAction.returnType.includes('error') && !implAction.body.includes('error')) {
      report.issues.push({
        type: 'warning',
        category: 'missing_error_handling',
        message: `Action '${implAction.name}' may lack error handling`,
        description: 'Actions should handle errors and return error objects when appropriate',
        location: { 
          file: report.implementationFile, 
          line: implAction.lineNumber 
        },
        suggestion: 'Add error handling and return {error: string} for failure cases'
      });
    }

    // Check async patterns for database operations
    if (!implAction.isAsync && implAction.body.includes('prisma')) {
      report.issues.push({
        type: 'warning',
        category: 'signature_mismatch',
        message: `Action '${implAction.name}' should be async`,
        description: 'Database operations require async/await patterns',
        location: { 
          file: report.implementationFile, 
          line: implAction.lineNumber 
        },
        suggestion: 'Make this method async and use await for database operations'
      });
    }

    // Check input/output patterns
    if (implAction.parameters.length !== 1 || !implAction.parameters[0].name.includes('input')) {
      report.issues.push({
        type: 'warning',
        category: 'signature_mismatch',
        message: `Action '${implAction.name}' should take single input object`,
        description: 'Actions should take exactly one input object parameter',
        location: { 
          file: report.implementationFile, 
          line: implAction.lineNumber 
        },
        suggestion: 'Change method signature to take single input: {param1, param2, ...} object'
      });
    }
  }

  /**
   * Validate specific query implementation
   */
  private validateQueryImplementation(
    specQuery: any,
    implQuery: any,
    report: ValidationReport
  ): void {
    
    // Check return type is array
    if (!implQuery.returnType.includes('[]') && !implQuery.returnType.includes('Array')) {
      report.issues.push({
        type: 'error',
        category: 'return_type_mismatch',
        message: `Query '${implQuery.name}' should return an array`,
        description: 'Queries must return arrays to enable declarative composition',
        location: { 
          file: report.implementationFile, 
          line: implQuery.lineNumber 
        },
        suggestion: `Change return type to include '[]' or 'Array<T>'`
      });
    }

    // Check for side effects
    if (implQuery.body.includes('create') || implQuery.body.includes('update') || implQuery.body.includes('delete')) {
      report.issues.push({
        type: 'warning',
        category: 'operational_principle_violation',
        message: `Query '${implQuery.name}' may have side effects`,
        description: 'Queries should be side-effect free and only read data',
        location: { 
          file: report.implementationFile, 
          line: implQuery.lineNumber 
        },
        suggestion: 'Move data modification logic to an action method'
      });
    }
  }

  /**
   * Validate naming conventions
   */
  private async validateNaming(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    report: ValidationReport
  ): Promise<void> {
    
    const expectedClassName = `${spec.name}Concept`;
    if (implementation.className !== expectedClassName) {
      report.issues.push({
        type: 'warning',
        category: 'naming_convention',
        message: `Class name should be '${expectedClassName}'`,
        description: `Found '${implementation.className}', expected '${expectedClassName}'`,
        location: { file: implementation.file },
        suggestion: `Rename class to '${expectedClassName}'`
      });
    }
  }

  /**
   * Validate concept independence
   */
  private async validateIndependence(
    implementation: ConceptImplementation,
    report: ValidationReport
  ): Promise<void> {
    
    if (implementation.dependencies.length > 0) {
      report.issues.push({
        type: 'error',
        category: 'concept_independence',
        message: `Concept has dependencies on other concepts: ${implementation.dependencies.join(', ')}`,
        description: 'Concepts must be independent and cannot import other concepts',
        location: { file: implementation.file },
        suggestion: 'Remove concept dependencies and use synchronizations for inter-concept communication'
      });
    }
  }

  /**
   * Validate implementation patterns and best practices
   */
  private async validateImplementationPatterns(
    implementation: ConceptImplementation,
    report: ValidationReport
  ): Promise<void> {
    
    // Check for TypeScript best practices
    const patterns = this.tsAnalyzer.validateImplementation(implementation);
    for (const pattern of patterns) {
      report.issues.push({
        type: 'warning',
        category: 'concept_independence',
        message: pattern,
        description: 'Implementation may violate concept design principles',
        location: { file: implementation.file }
      });
    }
  }

  /**
   * Perform AI analysis of implementation alignment
   */
  private async performAIAnalysis(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    report: ValidationReport
  ): Promise<void> {
    
    if (!this.aiAnalyzer) return;

    try {
      const aiResult = await this.aiAnalyzer.analyzeConceptAlignment(
        spec,
        implementation
      );

      report.aiAnalysis = {
        conceptPurposeAlignment: aiResult.purposeAlignment,
        implementationQuality: aiResult.implementationQuality,
        suggestions: aiResult.suggestions
      };

      // Convert AI issues to validation issues
      for (const issue of aiResult.issues) {
        report.issues.push({
          type: issue.type === 'critical' ? 'error' : issue.type === 'major' ? 'warning' : 'info',
          category: 'purpose_alignment',
          message: issue.description,
          description: issue.suggestion,
          location: { file: implementation.file },
          suggestion: issue.suggestion
        });
      }

    } catch (error) {
      report.issues.push({
        type: 'warning',
        category: 'purpose_alignment',
        message: 'AI analysis failed',
        description: error instanceof Error ? error.message : 'Unknown AI analysis error',
        location: { file: implementation.file }
      });
    }
  }

  /**
   * Check if method is a utility method (constructor, private methods, etc.)
   */
  private isUtilityMethod(methodName: string): boolean {
    return methodName === 'constructor' || 
           methodName.startsWith('private') ||
           methodName.includes('prisma') ||
           methodName === 'init' ||
           methodName === 'close';
  }

  /**
   * Create report for missing implementation
   */
  private createMissingImplementationReport(specPath: string, implPath: string): ValidationReport {
    const conceptName = path.basename(specPath, '.concept');
    return {
      conceptName,
      specFile: specPath,
      implementationFile: 'MISSING',
      syncFiles: [],
      timestamp: new Date(),
      issues: [{
        type: 'error',
        category: 'missing_action',
        message: 'Implementation file not found',
        description: `No TypeScript implementation found for concept '${conceptName}'`,
        location: { file: specPath },
        suggestion: `Create ${conceptName.toLowerCase()}.ts in the concepts directory`
      }],
      summary: { errors: 1, warnings: 0, info: 0, overallScore: 0 }
    };
  }

  /**
   * Create report for missing specification
   */
  private createMissingSpecReport(implPath: string, specPath: string): ValidationReport {
    const conceptName = path.basename(implPath, '.ts');
    return {
      conceptName,
      specFile: 'MISSING',
      implementationFile: implPath,
      syncFiles: [],
      timestamp: new Date(),
      issues: [{
        type: 'warning',
        category: 'state_mismatch',
        message: 'Specification file not found',
        description: `No .concept specification found for implementation '${conceptName}'`,
        location: { file: implPath },
        suggestion: `Create ${conceptName}.concept in the specs directory`
      }],
      summary: { errors: 0, warnings: 1, info: 0, overallScore: 60 }
    };
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
      overallScore: Math.max(0, 100 - (errors * 20 + warnings * 5 + info * 1))
    };
  }
}
