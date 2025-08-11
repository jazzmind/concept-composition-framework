/**
 * Concept Validation Engine
 * 
 * Main export file for the concept validation system that compares
 * .concept specification files with TypeScript implementations.
 */

// Core validation components
export { ValidationEngine } from './validation-engine';
export { ConceptSpecParser } from './spec-parser';
export { TypeScriptAnalyzer } from './ts-analyzer';
export { AIAnalyzer } from './ai-analyzer';
export { ValidationReporter } from './reporter';

// Types
export * from './types';

// CLI interface
export { main as runCLI } from './cli';

// Utility function for quick validation
export async function validateProject(
  projectRoot: string,
  options: {
    includeAI?: boolean;
    apiKey?: string;
    outputFormat?: 'console' | 'html' | 'markdown' | 'json';
    outputPath?: string;
  } = {}
): Promise<void> {
  const { ValidationEngine } = await import('./validation-engine');
  const { ValidationReporter } = await import('./reporter');
  
  const config = {
    openaiApiKey: options.apiKey || process.env.OPENAI_API_KEY || '',
    modelName: 'gpt-4',
    projectRoot,
    specDir: 'specs',
    conceptDir: 'concepts', 
    syncDir: 'syncs',
    includeAiAnalysis: options.includeAI || false,
    strictMode: false
  };
  
  const engine = new ValidationEngine(config);
  const reporter = new ValidationReporter();
  
  console.log('🔍 Running concept validation...');
  const reports = await engine.validateAllConcepts();
  
  const format = options.outputFormat || 'console';
  
  switch (format) {
    case 'console':
      reporter.generateConsoleReport(reports);
      break;
    case 'html':
      if (options.outputPath) {
        await reporter.generateHtmlReport(reports, options.outputPath);
        console.log(`📄 HTML report saved to: ${options.outputPath}`);
      } else {
        console.error('❌ Output path required for HTML format');
      }
      break;
    case 'markdown':
      if (options.outputPath) {
        await reporter.generateMarkdownReport(reports, options.outputPath);
        console.log(`📄 Markdown report saved to: ${options.outputPath}`);
      } else {
        console.error('❌ Output path required for Markdown format');
      }
      break;
    case 'json':
      if (options.outputPath) {
        await reporter.exportJson(reports, options.outputPath);
        console.log(`📄 JSON report saved to: ${options.outputPath}`);
      } else {
        console.error('❌ Output path required for JSON format');
      }
      break;
  }
}
