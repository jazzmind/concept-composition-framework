/**
 * Report Display Manager
 * 
 * Handles displaying validation reports in new VS Code tabs with rich formatting.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ValidationReport, ValidationIssue } from './types';
import { FrameworkValidationResult } from './framework-validator';

export class ReportDisplayManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Display a single validation report in a new tab
   */
  async displayReport(report: ValidationReport, title: string): Promise<void> {
    const content = this.generateReportContent([report], title);
    await this.showInNewTab(content, `${title} - ${report.conceptName}`);
  }

  /**
   * Display multiple validation reports in a new tab
   */
  async displayReports(reports: ValidationReport[], title: string): Promise<void> {
    const content = this.generateReportContent(reports, title);
    await this.showInNewTab(content, title);
  }

  /**
   * Display framework validation result in a new tab
   */
  async displayFrameworkReport(result: FrameworkValidationResult): Promise<void> {
    const content = this.generateFrameworkReportContent(result);
    await this.showInNewTab(content, 'Framework Validation Report');
  }

  /**
   * Show content in a new VS Code tab
   */
  private async showInNewTab(content: string, title: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown'
    });

    const editor = await vscode.window.showTextDocument(document, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside
    });

    // Set a custom tab title (this is a workaround since VS Code doesn't directly support custom tab titles)
    const tabTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
    
    // Add timestamp to make tabs unique
    const timestamp = new Date().toLocaleTimeString();
    const finalTitle = `${tabTitle} (${timestamp})`;
    
    // Use the file path as a way to set the title
    const tempUri = vscode.Uri.parse(`untitled:${finalTitle}.md`);
    
    try {
      await vscode.workspace.fs.writeFile(tempUri, Buffer.from(content));
      const newDoc = await vscode.workspace.openTextDocument(tempUri);
      await vscode.window.showTextDocument(newDoc, {
        preview: false,
        viewColumn: vscode.ViewColumn.Beside
      });
      
      // Close the original untitled document
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    } catch (error) {
      // Fallback to original document if URI approach fails
      console.warn('Could not create custom titled document, using default approach');
    }
  }

  /**
   * Generate markdown content for validation reports
   */
  private generateReportContent(reports: ValidationReport[], title: string): string {
    const timestamp = new Date().toLocaleString();
    
    let content = `# ${title}\n\n`;
    content += `**Generated:** ${timestamp}\n\n`;
    
    // Summary
    const totalErrors = reports.reduce((sum, r) => sum + r.summary.errors, 0);
    const totalWarnings = reports.reduce((sum, r) => sum + r.summary.warnings, 0);
    const totalInfo = reports.reduce((sum, r) => sum + r.summary.info, 0);
    const avgScore = reports.reduce((sum, r) => sum + r.summary.overallScore, 0) / reports.length;
    
    content += `## 📊 Summary\n\n`;
    content += `- **Reports:** ${reports.length}\n`;
    content += `- **Errors:** ${totalErrors} ❌\n`;
    content += `- **Warnings:** ${totalWarnings} ⚠️\n`;
    content += `- **Info:** ${totalInfo} ℹ️\n`;
    content += `- **Average Score:** ${avgScore.toFixed(1)}/100\n\n`;
    
    // Individual reports
    for (const report of reports) {
      content += this.generateSingleReportContent(report);
    }
    
    return content;
  }

  /**
   * Generate content for a single report
   */
  private generateSingleReportContent(report: ValidationReport): string {
    const scoreEmoji = this.getScoreEmoji(report.summary.overallScore);
    
    let content = `## ${scoreEmoji} ${report.conceptName}\n\n`;
    content += `**Score:** ${report.summary.overallScore}/100\n\n`;
    
    // File paths
    content += `**Files:**\n`;
    content += `- Spec: \`${this.formatFilePath(report.specFile)}\`\n`;
    content += `- Implementation: \`${this.formatFilePath(report.implementationFile)}\`\n`;
    if (report.syncFiles.length > 0) {
      content += `- Syncs: ${report.syncFiles.map(f => `\`${this.formatFilePath(f)}\``).join(', ')}\n`;
    }
    content += '\n';
    
    // Issues by type
    const errors = report.issues.filter(i => i.type === 'error');
    const warnings = report.issues.filter(i => i.type === 'warning');
    const info = report.issues.filter(i => i.type === 'info');
    
    if (errors.length > 0) {
      content += `### ❌ Errors (${errors.length})\n\n`;
      for (const error of errors) {
        content += this.formatIssue(error);
      }
    }
    
    if (warnings.length > 0) {
      content += `### ⚠️ Warnings (${warnings.length})\n\n`;
      for (const warning of warnings) {
        content += this.formatIssue(warning);
      }
    }
    
    if (info.length > 0) {
      content += `### ℹ️ Info (${info.length})\n\n`;
      for (const infoItem of info) {
        content += this.formatIssue(infoItem);
      }
    }
    
    // AI Analysis
    if (report.aiAnalysis) {
      content += `### 🤖 AI Analysis\n\n`;
      content += `**Purpose Alignment:** ${report.aiAnalysis.conceptPurposeAlignment}\n\n`;
      content += `**Implementation Quality:** ${report.aiAnalysis.implementationQuality}\n\n`;
      
      if (report.aiAnalysis.suggestions.length > 0) {
        content += `**Suggestions:**\n`;
        for (const suggestion of report.aiAnalysis.suggestions) {
          content += `- ${suggestion}\n`;
        }
        content += '\n';
      }
    }
    
    content += '---\n\n';
    return content;
  }

  /**
   * Generate content for framework validation result
   */
  private generateFrameworkReportContent(result: FrameworkValidationResult): string {
    const timestamp = new Date().toLocaleString();
    
    let content = `# 🏗️ Framework Validation Report\n\n`;
    content += `**Generated:** ${timestamp}\n\n`;
    
    // Overall summary
    content += `## 📊 Overall Summary\n\n`;
    content += `- **Concepts Analyzed:** ${result.summary.conceptsAnalyzed}\n`;
    content += `- **Syncs Analyzed:** ${result.summary.syncsAnalyzed}\n`;
    content += `- **Total Errors:** ${result.summary.totalErrors} ❌\n`;
    content += `- **Total Warnings:** ${result.summary.totalWarnings} ⚠️\n`;
    content += `- **Total Info:** ${result.summary.totalInfo} ℹ️\n`;
    content += `- **Overall Score:** ${result.summary.overallScore.toFixed(1)}/100\n\n`;
    
    // Cross-cutting issues
    if (result.crossCuttingIssues.length > 0) {
      content += `## 🔄 Cross-Cutting Issues\n\n`;
      for (const issue of result.crossCuttingIssues) {
        content += this.formatIssue(issue);
      }
    }
    
    // Section summaries
    if (result.conceptSpecs.length > 0) {
      content += `## 📋 Concept Specifications (${result.conceptSpecs.length})\n\n`;
      content += this.generateSectionSummary(result.conceptSpecs);
    }
    
    if (result.conceptImplementations.length > 0) {
      content += `## 💻 Concept Implementations (${result.conceptImplementations.length})\n\n`;
      content += this.generateSectionSummary(result.conceptImplementations);
    }
    
    if (result.syncSpecs.length > 0) {
      content += `## 🔄 Sync Specifications (${result.syncSpecs.length})\n\n`;
      content += this.generateSectionSummary(result.syncSpecs);
    }
    
    if (result.syncImplementations.length > 0) {
      content += `## ⚙️ Sync Implementations (${result.syncImplementations.length})\n\n`;
      content += this.generateSectionSummary(result.syncImplementations);
    }
    
    // Detailed reports
    content += `## 📖 Detailed Reports\n\n`;
    
    const allReports = [
      ...result.conceptSpecs,
      ...result.conceptImplementations,
      ...result.syncSpecs,
      ...result.syncImplementations
    ];
    
    for (const report of allReports) {
      if (report.summary.errors > 0 || report.summary.warnings > 0) {
        content += this.generateSingleReportContent(report);
      }
    }
    
    return content;
  }

  /**
   * Generate summary for a section of reports
   */
  private generateSectionSummary(reports: ValidationReport[]): string {
    let content = '';
    
    for (const report of reports) {
      const scoreEmoji = this.getScoreEmoji(report.summary.overallScore);
      const issueCount = report.summary.errors + report.summary.warnings;
      
      content += `- ${scoreEmoji} **${report.conceptName}** `;
      content += `(${report.summary.overallScore}/100)`;
      
      if (issueCount > 0) {
        content += ` - ${report.summary.errors}❌ ${report.summary.warnings}⚠️ ${report.summary.info}ℹ️`;
      }
      
      content += '\n';
    }
    
    content += '\n';
    return content;
  }

  /**
   * Format an individual issue
   */
  private formatIssue(issue: ValidationIssue): string {
    let content = `**${issue.message}**\n\n`;
    content += `${issue.description}\n\n`;
    
    if (issue.location.line) {
      content += `📍 Location: \`${this.formatFilePath(issue.location.file)}:${issue.location.line}\`\n\n`;
    } else {
      content += `📍 File: \`${this.formatFilePath(issue.location.file)}\`\n\n`;
    }
    
    if (issue.suggestion) {
      content += `💡 **Suggestion:** ${issue.suggestion}\n\n`;
    }
    
    if (issue.related) {
      content += `🔗 **Related:** \`${this.formatFilePath(issue.related.file)}\``;
      if (issue.related.line) {
        content += `:${issue.related.line}`;
      }
      content += '\n\n';
    }
    
    return content;
  }

  /**
   * Format file path for display
   */
  private formatFilePath(filePath: string): string {
    if (filePath === 'MISSING' || filePath === 'N/A') {
      return filePath;
    }
    
    // Show only the filename and parent directory for brevity
    const parts = filePath.split(path.sep);
    if (parts.length > 2) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return filePath;
  }

  /**
   * Get emoji for score
   */
  private getScoreEmoji(score: number): string {
    if (score >= 90) return '🟢';
    if (score >= 75) return '🔵';
    if (score >= 50) return '🟡';
    return '🔴';
  }
}
