/**
 * Validation Commands for VS Code
 * 
 * Implements the VS Code commands for concept and sync validation.
 * Each command generates a validation report and displays it in a new tab.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConceptSpecValidator } from './concept-spec-validator';
import { SyncSpecValidator } from './sync-spec-validator';
import { ConceptImplementationValidator } from './concept-implementation-validator';
import { SyncImplementationValidator } from './sync-implementation-validator';
import { FrameworkValidator, FrameworkValidationConfig } from './framework-validator';
import { ReportDisplayManager } from './report-display';

export class ValidationCommands {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private reportManager: ReportDisplayManager;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('Concept Validation');
    this.reportManager = new ReportDisplayManager(context);
    context.subscriptions.push(this.outputChannel);
  }

  /**
   * Register all validation commands
   */
  registerCommands(): void {
    const commands = [
      vscode.commands.registerCommand('concept-design.validateConceptSpecs', 
        () => this.validateConceptSpecs()),
      vscode.commands.registerCommand('concept-design.validateSyncSpecs', 
        () => this.validateSyncSpecs()),
      vscode.commands.registerCommand('concept-design.validateConceptImplementation', 
        () => this.validateConceptImplementation()),
      vscode.commands.registerCommand('concept-design.validateSyncImplementation', 
        () => this.validateSyncImplementation()),
      vscode.commands.registerCommand('concept-design.validateFramework', 
        () => this.validateFramework()),
    ];

    this.context.subscriptions.push(...commands);
  }

  /**
   * Validate concept specifications
   */
  async validateConceptSpecs(): Promise<void> {
    try {
      this.outputChannel.show();
      this.outputChannel.appendLine('🔍 Validating concept specifications...');

      const config = await this.getValidationConfig();
      if (!config) return;

      const validator = new ConceptSpecValidator(config.openaiApiKey);
      const reports = await validator.validateAllConceptSpecs(
        path.join(config.projectRoot, config.specsDir)
      );

      this.outputChannel.appendLine(`✅ Validated ${reports.length} concept specifications`);

      await this.reportManager.displayReports(reports, 'Concept Specifications Validation');

      const totalErrors = reports.reduce((sum, r) => sum + r.summary.errors, 0);
      if (totalErrors > 0) {
        vscode.window.showWarningMessage(`Concept specs validation completed with ${totalErrors} errors. Check the report for details.`);
      } else {
        vscode.window.showInformationMessage('Concept specifications validation completed successfully!');
      }

    } catch (error) {
      this.handleError('concept specs validation', error);
    }
  }

  /**
   * Validate sync specifications
   */
  async validateSyncSpecs(): Promise<void> {
    try {
      this.outputChannel.show();
      this.outputChannel.appendLine('🔍 Validating sync specifications...');

      const config = await this.getValidationConfig();
      if (!config) return;

      const validator = new SyncSpecValidator(config.openaiApiKey);
      const reports = await validator.validateAllSyncSpecs(
        path.join(config.projectRoot, config.syncsDir)
      );

      this.outputChannel.appendLine(`✅ Validated ${reports.length} sync specifications`);

      await this.reportManager.displayReports(reports, 'Sync Specifications Validation');

      const totalErrors = reports.reduce((sum, r) => sum + r.summary.errors, 0);
      if (totalErrors > 0) {
        vscode.window.showWarningMessage(`Sync specs validation completed with ${totalErrors} errors. Check the report for details.`);
      } else {
        vscode.window.showInformationMessage('Sync specifications validation completed successfully!');
      }

    } catch (error) {
      this.handleError('sync specs validation', error);
    }
  }

  /**
   * Validate concept implementations
   */
  async validateConceptImplementation(): Promise<void> {
    try {
      this.outputChannel.show();
      this.outputChannel.appendLine('🔍 Validating concept implementations...');

      const config = await this.getValidationConfig();
      if (!config) return;

      const validator = new ConceptImplementationValidator(config.openaiApiKey);
      const reports = await validator.validateAllConceptImplementations(
        path.join(config.projectRoot, config.specsDir),
        path.join(config.projectRoot, config.conceptsDir)
      );

      this.outputChannel.appendLine(`✅ Validated ${reports.length} concept implementations`);

      await this.reportManager.displayReports(reports, 'Concept Implementation Validation');

      const totalErrors = reports.reduce((sum, r) => sum + r.summary.errors, 0);
      if (totalErrors > 0) {
        vscode.window.showWarningMessage(`Concept implementation validation completed with ${totalErrors} errors. Check the report for details.`);
      } else {
        vscode.window.showInformationMessage('Concept implementation validation completed successfully!');
      }

    } catch (error) {
      this.handleError('concept implementation validation', error);
    }
  }

  /**
   * Validate sync implementations
   */
  async validateSyncImplementation(): Promise<void> {
    try {
      this.outputChannel.show();
      this.outputChannel.appendLine('🔍 Validating sync implementations...');

      const config = await this.getValidationConfig();
      if (!config) return;

      const validator = new SyncImplementationValidator(config.openaiApiKey);
      const reports = await validator.validateAllSyncImplementations(
        path.join(config.projectRoot, config.syncsDir)
      );

      this.outputChannel.appendLine(`✅ Validated ${reports.length} sync implementations`);

      await this.reportManager.displayReports(reports, 'Sync Implementation Validation');

      const totalErrors = reports.reduce((sum, r) => sum + r.summary.errors, 0);
      if (totalErrors > 0) {
        vscode.window.showWarningMessage(`Sync implementation validation completed with ${totalErrors} errors. Check the report for details.`);
      } else {
        vscode.window.showInformationMessage('Sync implementation validation completed successfully!');
      }

    } catch (error) {
      this.handleError('sync implementation validation', error);
    }
  }

  /**
   * Validate entire framework
   */
  async validateFramework(): Promise<void> {
    try {
      this.outputChannel.show();
      this.outputChannel.appendLine('🔍 Validating entire framework...');

      const config = await this.getValidationConfig();
      if (!config) return;

      const validator = new FrameworkValidator(config);
      const result = await validator.validateFramework();

      this.outputChannel.appendLine(`✅ Framework validation completed`);
      this.outputChannel.appendLine(`   Concepts: ${result.summary.conceptsAnalyzed}`);
      this.outputChannel.appendLine(`   Syncs: ${result.summary.syncsAnalyzed}`);
      this.outputChannel.appendLine(`   Errors: ${result.summary.totalErrors}`);
      this.outputChannel.appendLine(`   Warnings: ${result.summary.totalWarnings}`);
      this.outputChannel.appendLine(`   Score: ${result.summary.overallScore.toFixed(1)}/100`);

      await this.reportManager.displayFrameworkReport(result);

      if (result.summary.totalErrors > 0) {
        vscode.window.showWarningMessage(
          `Framework validation completed with ${result.summary.totalErrors} errors and ${result.summary.totalWarnings} warnings. Check the report for details.`
        );
      } else if (result.summary.totalWarnings > 0) {
        vscode.window.showWarningMessage(
          `Framework validation completed with ${result.summary.totalWarnings} warnings. Check the report for details.`
        );
      } else {
        vscode.window.showInformationMessage('Framework validation completed successfully!');
      }

    } catch (error) {
      this.handleError('framework validation', error);
    }
  }

  /**
   * Get validation configuration from workspace settings
   */
  private async getValidationConfig(): Promise<FrameworkValidationConfig | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open. Please open a workspace to run validation.');
      return null;
    }

    const config = vscode.workspace.getConfiguration('conceptDesign');
    const projectRoot = workspaceFolder.uri.fsPath;

    // Get directory settings
    const specsDir = config.get('directories.specs', 'specs');
    const conceptsDir = config.get('directories.concepts', 'concepts');
    const syncsDir = config.get('directories.syncs', 'syncs');

    // Check if directories exist and prompt to create if missing
    const missingDirs: string[] = [];
    const checkDirs = [
      { name: 'specs', path: specsDir },
      { name: 'concepts', path: conceptsDir },
      { name: 'syncs', path: syncsDir }
    ];

    for (const dir of checkDirs) {
      const fullPath = path.join(projectRoot, dir.path);
      if (!fs.existsSync(fullPath)) {
        missingDirs.push(dir.name);
      }
    }

    if (missingDirs.length > 0) {
      const choice = await vscode.window.showWarningMessage(
        `Missing directories: ${missingDirs.join(', ')}. Create them?`,
        'Create Directories',
        'Cancel'
      );

      if (choice === 'Create Directories') {
        for (const dir of checkDirs) {
          const fullPath = path.join(projectRoot, dir.path);
          if (!fs.existsSync(fullPath)) {
            await fs.promises.mkdir(fullPath, { recursive: true });
            this.outputChannel.appendLine(`Created directory: ${fullPath}`);
          }
        }
      } else {
        return null;
      }
    }

    // Get OpenAI API key
    let openaiApiKey = config.get('openai.apiKey', '') || process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      const useAI = await vscode.window.showInformationMessage(
        'No OpenAI API key configured. Validation will run without AI analysis.',
        'Set API Key',
        'Continue Without AI'
      );

      if (useAI === 'Set API Key') {
        const apiKey = await vscode.window.showInputBox({
          prompt: 'Enter your OpenAI API key',
          password: true,
          placeHolder: 'sk-...'
        });

        if (apiKey) {
          await config.update('openai.apiKey', apiKey, vscode.ConfigurationTarget.Workspace);
          openaiApiKey = apiKey;
        }
      }
    }

    return {
      projectRoot,
      specsDir,
      conceptsDir,
      syncsDir,
      openaiApiKey: openaiApiKey || undefined
    };
  }

  /**
   * Handle validation errors
   */
  private handleError(operation: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.outputChannel.appendLine(`❌ ${operation} failed: ${errorMessage}`);
    
    if (error instanceof Error && error.stack) {
      this.outputChannel.appendLine(error.stack);
    }
    
    vscode.window.showErrorMessage(`${operation} failed: ${errorMessage}`);
  }
}
