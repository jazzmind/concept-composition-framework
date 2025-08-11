/**
 * Concept Validation Engine
 * 
 * Main orchestrator for validating alignment between concept specifications
 * and their TypeScript implementations using AI-powered analysis.
 */

import * as path from 'path';
import * as fs from 'fs';
import { ConceptSpecParser } from './spec-parser';
import { TypeScriptAnalyzer } from './ts-analyzer';
import { AIAnalyzer } from './ai-analyzer';
import { 
  ValidationConfig, 
  ValidationReport, 
  ValidationIssue, 
  ConceptSpec, 
  ConceptImplementation,
  ValidationCategory
} from './types';

export class ValidationEngine {
  private specParser: ConceptSpecParser;
  private tsAnalyzer: TypeScriptAnalyzer;
  private aiAnalyzer?: AIAnalyzer;
  private config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.config = config;
    this.specParser = new ConceptSpecParser();
    this.tsAnalyzer = new TypeScriptAnalyzer();
    
    if (config.includeAiAnalysis && config.openaiApiKey) {
      this.aiAnalyzer = new AIAnalyzer(config.openaiApiKey, config.modelName);
    }
  }

  /**
   * Validate all concepts in the project
   */
  async validateAllConcepts(): Promise<ValidationReport[]> {
    const reports: ValidationReport[] = [];
    
    try {
      // Parse all specifications
      const specs = await this.specParser.parseConceptDirectory(
        path.join(this.config.projectRoot, this.config.specDir)
      );
      
      // Analyze all implementations
      const implementations = await this.tsAnalyzer.analyzeConceptDirectory(
        path.join(this.config.projectRoot, this.config.conceptDir)
      );
      
      // Validate each concept
      for (const spec of specs) {
        const implementation = this.findMatchingImplementation(spec, implementations);
        if (implementation) {
          const report = await this.validateConcept(spec, implementation);
          reports.push(report);
        } else {
          reports.push(this.createMissingImplementationReport(spec));
        }
      }
      
      // Check for implementations without specs
      for (const impl of implementations) {
        const hasSpec = specs.some(spec => this.isMatchingPair(spec, impl));
        if (!hasSpec) {
          reports.push(this.createMissingSpecReport(impl));
        }
      }
      
    } catch (error) {
      console.error('Validation failed:', error);
    }
    
    return reports;
  }

  /**
   * Validate a specific concept by name
   */
  async validateConcept(
    spec: ConceptSpec, 
    implementation: ConceptImplementation
  ): Promise<ValidationReport> {
    
    const report: ValidationReport = {
      conceptName: spec.name,
      specFile: spec.file,
      implementationFile: implementation.file,
      syncFiles: await this.findSyncFiles(spec.name),
      timestamp: new Date(),
      issues: [],
      summary: {
        errors: 0,
        warnings: 0,
        info: 0,
        overallScore: 0
      }
    };

    // Perform basic validation
    await this.performBasicValidation(spec, implementation, report);
    
    // Perform AI analysis if enabled
    if (this.aiAnalyzer) {
      try {
        const syncCode = await this.loadSyncCode(report.syncFiles);
        const aiResult = await this.aiAnalyzer.analyzeConceptAlignment(
          spec, 
          implementation, 
          syncCode
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
        console.error('AI analysis failed:', error);
        report.issues.push({
          type: 'warning',
          category: 'purpose_alignment',
          message: 'AI analysis failed',
          description: 'Could not perform AI-powered analysis',
          location: { file: implementation.file }
        });
      }
    }

    // Calculate summary
    this.calculateSummary(report);
    
    return report;
  }

  private async performBasicValidation(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    report: ValidationReport
  ): Promise<void> {
    
    // Validate spec completeness
    const specErrors = this.specParser.validateSpec(spec);
    for (const error of specErrors) {
      report.issues.push({
        type: 'error',
        category: 'state_mismatch',
        message: error,
        description: 'Specification is incomplete',
        location: { file: spec.file }
      });
    }

    // Validate implementation patterns
    const implIssues = this.tsAnalyzer.validateImplementation(implementation);
    for (const issue of implIssues) {
      report.issues.push({
        type: 'warning',
        category: 'concept_independence',
        message: issue,
        description: 'Implementation may violate concept design principles',
        location: { file: implementation.file }
      });
    }

    // Check action alignment
    await this.validateActions(spec, implementation, report);
    
    // Check query alignment
    await this.validateQueries(spec, implementation, report);
    
    // Check naming conventions
    await this.validateNamingConventions(spec, implementation, report);
  }

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
          suggestion: `Implement the '${specAction.name}' method`,
          related: {
            file: spec.file,
            line: specAction.lineNumber,
            excerpt: specAction.signature
          }
        });
      } else {
        // Validate action signature
        await this.validateActionSignature(specAction, implemented, report);
      }
    }

    // Check for extra actions
    for (const implAction of implementedActions) {
      const specified = specActions.find(spec => spec.name === implAction.name);
      if (!specified) {
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
          suggestion: `Implement the '${specQuery.name}' method`,
          related: {
            file: spec.file,
            line: specQuery.lineNumber,
            excerpt: specQuery.signature
          }
        });
      } else {
        // Validate query returns array
        if (!implemented.returnType.includes('[]') && !implemented.returnType.includes('Array')) {
          report.issues.push({
            type: 'error',
            category: 'return_type_mismatch',
            message: `Query '${implemented.name}' should return an array`,
            description: 'Queries must return arrays to enable declarative composition',
            location: { 
              file: implementation.file, 
              line: implemented.lineNumber 
            },
            suggestion: `Change return type to include '[]' or 'Array<T>'`
          });
        }
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

  private async validateActionSignature(
    specAction: any,
    implAction: any,
    report: ValidationReport
  ): Promise<void> {
    
    // Check if action handles errors properly
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

    // Check if action is async (recommended for database operations)
    if (!implAction.isAsync && implAction.body.includes('prisma')) {
      report.issues.push({
        type: 'info',
        category: 'signature_mismatch',
        message: `Action '${implAction.name}' should probably be async`,
        description: 'Database operations typically require async/await patterns',
        location: { 
          file: report.implementationFile, 
          line: implAction.lineNumber 
        },
        suggestion: 'Consider making this method async'
      });
    }
  }

  private async validateNamingConventions(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    report: ValidationReport
  ): Promise<void> {
    
    // Check class name convention
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

  private findMatchingImplementation(
    spec: ConceptSpec, 
    implementations: ConceptImplementation[]
  ): ConceptImplementation | undefined {
    return implementations.find(impl => this.isMatchingPair(spec, impl));
  }

  private isMatchingPair(spec: ConceptSpec, impl: ConceptImplementation): boolean {
    const specName = spec.name.toLowerCase();
    const implName = impl.name.toLowerCase();
    return specName === implName || 
           specName === implName.replace('concept', '') ||
           implName === specName.replace('concept', '');
  }

  private async findSyncFiles(conceptName: string): Promise<string[]> {
    const syncDir = path.join(this.config.projectRoot, this.config.syncDir);
    const syncFiles: string[] = [];
    
    try {
      const files = await fs.promises.readdir(syncDir);
      for (const file of files) {
        if (file.endsWith('.ts')) {
          const content = await fs.promises.readFile(path.join(syncDir, file), 'utf-8');
          if (content.includes(conceptName)) {
            syncFiles.push(path.join(syncDir, file));
          }
        }
      }
    } catch (error) {
      // Sync directory might not exist
    }
    
    return syncFiles;
  }

  private async loadSyncCode(syncFiles: string[]): Promise<string> {
    const syncContents: string[] = [];
    
    for (const file of syncFiles) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        syncContents.push(`// File: ${file}\n${content}`);
      } catch (error) {
        console.error(`Failed to read sync file ${file}:`, error);
      }
    }
    
    return syncContents.join('\n\n');
  }

  private createMissingImplementationReport(spec: ConceptSpec): ValidationReport {
    return {
      conceptName: spec.name,
      specFile: spec.file,
      implementationFile: 'MISSING',
      syncFiles: [],
      timestamp: new Date(),
      issues: [{
        type: 'error',
        category: 'missing_action',
        message: 'Implementation file not found',
        description: `No TypeScript implementation found for concept '${spec.name}'`,
        location: { file: spec.file },
        suggestion: `Create ${spec.name.toLowerCase()}.ts in the concepts directory`
      }],
      summary: {
        errors: 1,
        warnings: 0,
        info: 0,
        overallScore: 0
      }
    };
  }

  private createMissingSpecReport(impl: ConceptImplementation): ValidationReport {
    return {
      conceptName: impl.name,
      specFile: 'MISSING',
      implementationFile: impl.file,
      syncFiles: [],
      timestamp: new Date(),
      issues: [{
        type: 'warning',
        category: 'state_mismatch',
        message: 'Specification file not found',
        description: `No .concept specification found for implementation '${impl.name}'`,
        location: { file: impl.file },
        suggestion: `Create ${impl.name}.concept in the specs directory`
      }],
      summary: {
        errors: 0,
        warnings: 1,
        info: 0,
        overallScore: 60
      }
    };
  }

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
