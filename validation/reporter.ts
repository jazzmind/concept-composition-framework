/**
 * Validation Report Generator
 * 
 * Generates human-readable reports from validation results in multiple formats:
 * - Console output with colors
 * - HTML reports 
 * - JSON exports
 * - Markdown summaries
 */

import * as fs from 'fs';
import * as path from 'path';
import { ValidationReport, ValidationIssue, ValidationCategory } from './types';

export class ValidationReporter {
  
  /**
   * Generate console output with color coding
   */
  generateConsoleReport(reports: ValidationReport[]): void {
    console.log('\n🔍 Concept Validation Report');
    console.log('═'.repeat(50));
    
    // Overall summary
    const totalErrors = reports.reduce((sum, r) => sum + r.summary.errors, 0);
    const totalWarnings = reports.reduce((sum, r) => sum + r.summary.warnings, 0);
    const totalInfo = reports.reduce((sum, r) => sum + r.summary.info, 0);
    const avgScore = reports.reduce((sum, r) => sum + r.summary.overallScore, 0) / reports.length;
    
    console.log(`\n📊 Overall Summary:`);
    console.log(`   Concepts analyzed: ${reports.length}`);
    console.log(`   ${this.colorize('error', '❌')} Errors: ${totalErrors}`);
    console.log(`   ${this.colorize('warning', '⚠️')} Warnings: ${totalWarnings}`);
    console.log(`   ${this.colorize('info', 'ℹ️')} Info: ${totalInfo}`);
    console.log(`   📈 Average Score: ${avgScore.toFixed(1)}/100`);
    
    // Individual concept reports
    for (const report of reports) {
      this.generateConceptConsoleReport(report);
    }
    
    console.log('\n✅ Validation complete');
  }

  private generateConceptConsoleReport(report: ValidationReport): void {
    const scoreColor = this.getScoreColor(report.summary.overallScore);
    
    console.log(`\n📦 ${report.conceptName}`);
    console.log(`   Score: ${this.colorize(scoreColor, report.summary.overallScore.toString())}/100`);
    console.log(`   Spec: ${this.formatFilePath(report.specFile)}`);
    console.log(`   Impl: ${this.formatFilePath(report.implementationFile)}`);
    
    if (report.syncFiles.length > 0) {
      console.log(`   Syncs: ${report.syncFiles.map(f => this.formatFilePath(f)).join(', ')}`);
    }
    
    // Group issues by type
    const errors = report.issues.filter(i => i.type === 'error');
    const warnings = report.issues.filter(i => i.type === 'warning');
    const info = report.issues.filter(i => i.type === 'info');
    
    if (errors.length > 0) {
      console.log(`\n   ${this.colorize('error', '❌ Errors:')}`);
      errors.forEach(issue => this.printIssue(issue, '     '));
    }
    
    if (warnings.length > 0) {
      console.log(`\n   ${this.colorize('warning', '⚠️  Warnings:')}`);
      warnings.forEach(issue => this.printIssue(issue, '     '));
    }
    
    if (info.length > 0) {
      console.log(`\n   ${this.colorize('info', 'ℹ️  Info:')}`);
      info.forEach(issue => this.printIssue(issue, '     '));
    }
    
    // AI analysis
    if (report.aiAnalysis) {
      console.log(`\n   🤖 AI Analysis:`);
      console.log(`     Purpose Alignment: ${report.aiAnalysis.conceptPurposeAlignment.substring(0, 100)}...`);
      console.log(`     Quality: ${report.aiAnalysis.implementationQuality.substring(0, 100)}...`);
    }
  }

  private printIssue(issue: ValidationIssue, indent: string): void {
    const location = issue.location.line ? `${path.basename(issue.location.file)}:${issue.location.line}` : path.basename(issue.location.file);
    console.log(`${indent}• ${issue.message} (${location})`);
    
    if (issue.suggestion) {
      console.log(`${indent}  💡 ${issue.suggestion}`);
    }
  }

  /**
   * Generate HTML report
   */
  async generateHtmlReport(reports: ValidationReport[], outputPath: string): Promise<void> {
    const html = this.buildHtmlReport(reports);
    await fs.promises.writeFile(outputPath, html, 'utf-8');
  }

  private buildHtmlReport(reports: ValidationReport[]): string {
    const timestamp = new Date().toISOString();
    const totalErrors = reports.reduce((sum, r) => sum + r.summary.errors, 0);
    const totalWarnings = reports.reduce((sum, r) => sum + r.summary.warnings, 0);
    const avgScore = reports.reduce((sum, r) => sum + r.summary.overallScore, 0) / reports.length;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Concept Validation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .concept { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .score { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .score.excellent { color: #28a745; }
        .score.good { color: #17a2b8; }
        .score.fair { color: #ffc107; }
        .score.poor { color: #dc3545; }
        .issue { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .issue.error { background: #f8d7da; border-left: 4px solid #dc3545; }
        .issue.warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .issue.info { background: #d1ecf1; border-left: 4px solid #17a2b8; }
        .file-path { font-family: 'Monaco', 'Consolas', monospace; font-size: 12px; color: #666; }
        .ai-analysis { background: #e7f3ff; padding: 15px; border-radius: 4px; margin-top: 15px; }
        .stats { display: flex; gap: 20px; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Concept Validation Report</h1>
            <p>Generated on ${timestamp}</p>
        </div>
        
        <div class="summary">
            <h2>📊 Summary</h2>
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${reports.length}</div>
                    <div class="stat-label">Concepts</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${totalErrors}</div>
                    <div class="stat-label">Errors</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${totalWarnings}</div>
                    <div class="stat-label">Warnings</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${avgScore.toFixed(1)}</div>
                    <div class="stat-label">Avg Score</div>
                </div>
            </div>
        </div>
        
        ${reports.map(report => this.buildConceptHtml(report)).join('')}
    </div>
</body>
</html>`;
  }

  private buildConceptHtml(report: ValidationReport): string {
    const scoreClass = this.getScoreClass(report.summary.overallScore);
    
    return `
        <div class="concept">
            <h3>📦 ${report.conceptName}</h3>
            <div class="score ${scoreClass}">${report.summary.overallScore}/100</div>
            
            <div class="file-path">
                <strong>Spec:</strong> ${report.specFile}<br>
                <strong>Impl:</strong> ${report.implementationFile}
                ${report.syncFiles.length > 0 ? `<br><strong>Syncs:</strong> ${report.syncFiles.join(', ')}` : ''}
            </div>
            
            ${report.issues.map(issue => `
                <div class="issue ${issue.type}">
                    <strong>${issue.message}</strong><br>
                    <small>${issue.description}</small>
                    ${issue.suggestion ? `<br><em>💡 ${issue.suggestion}</em>` : ''}
                </div>
            `).join('')}
            
            ${report.aiAnalysis ? `
                <div class="ai-analysis">
                    <h4>🤖 AI Analysis</h4>
                    <p><strong>Purpose Alignment:</strong> ${report.aiAnalysis.conceptPurposeAlignment}</p>
                    <p><strong>Implementation Quality:</strong> ${report.aiAnalysis.implementationQuality}</p>
                    ${report.aiAnalysis.suggestions.length > 0 ? `
                        <p><strong>Suggestions:</strong></p>
                        <ul>${report.aiAnalysis.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
                    ` : ''}
                </div>
            ` : ''}
        </div>`;
  }

  /**
   * Generate markdown summary
   */
  async generateMarkdownReport(reports: ValidationReport[], outputPath: string): Promise<void> {
    const markdown = this.buildMarkdownReport(reports);
    await fs.promises.writeFile(outputPath, markdown, 'utf-8');
  }

  private buildMarkdownReport(reports: ValidationReport[]): string {
    const timestamp = new Date().toISOString();
    const totalErrors = reports.reduce((sum, r) => sum + r.summary.errors, 0);
    const totalWarnings = reports.reduce((sum, r) => sum + r.summary.warnings, 0);
    const avgScore = reports.reduce((sum, r) => sum + r.summary.overallScore, 0) / reports.length;
    
    let markdown = `# 🔍 Concept Validation Report

Generated on ${timestamp}

## 📊 Summary

- **Concepts Analyzed:** ${reports.length}
- **Total Errors:** ${totalErrors}
- **Total Warnings:** ${totalWarnings}
- **Average Score:** ${avgScore.toFixed(1)}/100

`;

    for (const report of reports) {
      markdown += this.buildConceptMarkdown(report);
    }
    
    return markdown;
  }

  private buildConceptMarkdown(report: ValidationReport): string {
    const scoreEmoji = this.getScoreEmoji(report.summary.overallScore);
    
    let md = `## ${scoreEmoji} ${report.conceptName} (${report.summary.overallScore}/100)

- **Specification:** \`${report.specFile}\`
- **Implementation:** \`${report.implementationFile}\`
${report.syncFiles.length > 0 ? `- **Synchronizations:** ${report.syncFiles.map(f => `\`${f}\``).join(', ')}\n` : ''}

`;

    if (report.issues.length > 0) {
      md += '### Issues\n\n';
      
      const errors = report.issues.filter(i => i.type === 'error');
      const warnings = report.issues.filter(i => i.type === 'warning');
      const info = report.issues.filter(i => i.type === 'info');
      
      if (errors.length > 0) {
        md += '#### ❌ Errors\n\n';
        errors.forEach(issue => {
          md += `- **${issue.message}**\n  - ${issue.description}\n`;
          if (issue.suggestion) {
            md += `  - 💡 ${issue.suggestion}\n`;
          }
          md += '\n';
        });
      }
      
      if (warnings.length > 0) {
        md += '#### ⚠️ Warnings\n\n';
        warnings.forEach(issue => {
          md += `- **${issue.message}**\n  - ${issue.description}\n`;
          if (issue.suggestion) {
            md += `  - 💡 ${issue.suggestion}\n`;
          }
          md += '\n';
        });
      }
    }
    
    if (report.aiAnalysis) {
      md += '### 🤖 AI Analysis\n\n';
      md += `**Purpose Alignment:** ${report.aiAnalysis.conceptPurposeAlignment}\n\n`;
      md += `**Implementation Quality:** ${report.aiAnalysis.implementationQuality}\n\n`;
      
      if (report.aiAnalysis.suggestions.length > 0) {
        md += '**Suggestions:**\n';
        report.aiAnalysis.suggestions.forEach(suggestion => {
          md += `- ${suggestion}\n`;
        });
        md += '\n';
      }
    }
    
    return md + '\n';
  }

  /**
   * Export validation data as JSON
   */
  async exportJson(reports: ValidationReport[], outputPath: string): Promise<void> {
    const data = {
      timestamp: new Date().toISOString(),
      summary: {
        conceptsAnalyzed: reports.length,
        totalErrors: reports.reduce((sum, r) => sum + r.summary.errors, 0),
        totalWarnings: reports.reduce((sum, r) => sum + r.summary.warnings, 0),
        averageScore: reports.reduce((sum, r) => sum + r.summary.overallScore, 0) / reports.length
      },
      reports
    };
    
    await fs.promises.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private colorize(type: string, text: string): string {
    const colors = {
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      info: '\x1b[36m',    // Cyan
      excellent: '\x1b[32m', // Green
      good: '\x1b[32m',      // Green
      fair: '\x1b[33m',      // Yellow
      poor: '\x1b[31m',      // Red
      reset: '\x1b[0m'
    };
    
    const color = colors[type as keyof typeof colors] || colors.reset;
    return `${color}${text}${colors.reset}`;
  }

  private formatFilePath(filePath: string): string {
    if (filePath === 'MISSING') {
      return this.colorize('error', 'MISSING');
    }
    return path.basename(filePath);
  }

  private getScoreColor(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  private getScoreClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  private getScoreEmoji(score: number): string {
    if (score >= 90) return '🟢';
    if (score >= 75) return '🔵';
    if (score >= 50) return '🟡';
    return '🔴';
  }
}
