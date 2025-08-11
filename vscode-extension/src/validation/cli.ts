#!/usr/bin/env node

/**
 * Concept Validation CLI
 * 
 * Command-line interface for running concept validation with various options
 * and output formats.
 */

import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ValidationEngine } from './validation-engine';
import { ValidationReporter } from './reporter';
import { ValidationConfig } from './types';

interface CLIOptions {
  config?: string;
  project?: string;
  specs?: string;
  concepts?: string;
  syncs?: string;
  output?: string;
  format?: string;
  ai?: boolean;
  apiKey?: string;
  model?: string;
  strict?: boolean;
  concept?: string;
  verbose?: boolean;
}

async function main() {
  program
    .name('concept-validator')
    .description('Validate alignment between concept specifications and TypeScript implementations')
    .version('1.0.0');

  program
    .command('validate')
    .description('Validate all concepts or a specific concept')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .option('-s, --specs <path>', 'Specs directory relative to project root', 'specs')
    .option('-i, --concepts <path>', 'Concepts directory relative to project root', 'concepts')
    .option('-y, --syncs <path>', 'Syncs directory relative to project root', 'syncs')
    .option('-o, --output <path>', 'Output directory for reports', './validation-reports')
    .option('-f, --format <type>', 'Output format (console|html|markdown|json|all)', 'console')
    .option('--ai', 'Enable AI-powered analysis')
    .option('--api-key <key>', 'OpenAI API key for AI analysis')
    .option('--model <name>', 'AI model to use', 'gpt-4')
    .option('--strict', 'Enable strict validation mode')
    .option('--concept <name>', 'Validate specific concept only')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options: CLIOptions) => {
      await runValidation(options);
    });

  program
    .command('init')
    .description('Initialize validation configuration file')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .action(async (options: CLIOptions) => {
      await initializeConfig(options);
    });

  program
    .command('analyze')
    .description('Analyze a specific aspect of concept alignment')
    .argument('<concept>', 'Concept name to analyze')
    .argument('<aspect>', 'Aspect to analyze (purpose|actions|queries|state|independence)')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--api-key <key>', 'OpenAI API key for AI analysis')
    .action(async (conceptName: string, aspect: string, options: CLIOptions) => {
      await runSpecificAnalysis(conceptName, aspect, options);
    });

  await program.parseAsync();
}

async function runValidation(options: CLIOptions): Promise<void> {
  try {
    const config = await loadConfig(options);
    
    if (options.verbose) {
      console.log('🔧 Configuration:');
      console.log(`   Project Root: ${config.projectRoot}`);
      console.log(`   Specs Dir: ${config.specDir}`);
      console.log(`   Concepts Dir: ${config.conceptDir}`);
      console.log(`   Syncs Dir: ${config.syncDir}`);
      console.log(`   AI Analysis: ${config.includeAiAnalysis ? 'Enabled' : 'Disabled'}`);
      console.log('');
    }

    const engine = new ValidationEngine(config);
    const reporter = new ValidationReporter();

    let reports;
    if (options.concept) {
      console.log(`🔍 Validating concept: ${options.concept}`);
      // TODO: Implement single concept validation
      reports = await engine.validateAllConcepts();
      reports = reports.filter(r => r.conceptName.toLowerCase() === options.concept!.toLowerCase());
    } else {
      console.log('🔍 Validating all concepts...');
      reports = await engine.validateAllConcepts();
    }

    if (reports.length === 0) {
      console.log('❌ No concepts found to validate');
      return;
    }

    // Ensure output directory exists
    if (options.output && options.format !== 'console') {
      await fs.promises.mkdir(options.output, { recursive: true });
    }

    // Generate reports in requested format
    const format = options.format || 'console';
    
    if (format === 'console' || format === 'all') {
      reporter.generateConsoleReport(reports);
    }
    
    if (format === 'html' || format === 'all') {
      const htmlPath = path.join(options.output!, 'validation-report.html');
      await reporter.generateHtmlReport(reports, htmlPath);
      console.log(`📄 HTML report saved to: ${htmlPath}`);
    }
    
    if (format === 'markdown' || format === 'all') {
      const mdPath = path.join(options.output!, 'validation-report.md');
      await reporter.generateMarkdownReport(reports, mdPath);
      console.log(`📄 Markdown report saved to: ${mdPath}`);
    }
    
    if (format === 'json' || format === 'all') {
      const jsonPath = path.join(options.output!, 'validation-report.json');
      await reporter.exportJson(reports, jsonPath);
      console.log(`📄 JSON report saved to: ${jsonPath}`);
    }

    // Exit with error code if there are errors
    const totalErrors = reports.reduce((sum, r) => sum + r.summary.errors, 0);
    if (totalErrors > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

async function runSpecificAnalysis(
  conceptName: string, 
  aspect: string, 
  options: CLIOptions
): Promise<void> {
  try {
    const config = await loadConfig(options);
    
    if (!config.includeAiAnalysis) {
      console.error('❌ AI analysis is required for specific aspect analysis');
      console.log('💡 Enable AI analysis with --ai and provide --api-key');
      process.exit(1);
    }

    console.log(`🤖 Analyzing ${aspect} for concept: ${conceptName}`);
    
    // TODO: Implement specific aspect analysis
    console.log('⚠️ Specific aspect analysis not yet implemented');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

async function initializeConfig(options: CLIOptions): Promise<void> {
  const projectRoot = options.project || process.cwd();
  const configPath = path.join(projectRoot, 'concept-validation.config.json');
  
  const defaultConfig: ValidationConfig = {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    modelName: 'gpt-4',
    projectRoot: projectRoot,
    specDir: 'specs',
    conceptDir: 'concepts',
    syncDir: 'syncs',
    includeAiAnalysis: false,
    strictMode: false
  };
  
  try {
    await fs.promises.writeFile(
      configPath, 
      JSON.stringify(defaultConfig, null, 2), 
      'utf-8'
    );
    
    console.log('✅ Configuration file created:', configPath);
    console.log('📝 Edit the configuration file to customize validation settings');
    
    if (!defaultConfig.openaiApiKey) {
      console.log('💡 Set OPENAI_API_KEY environment variable or update config for AI analysis');
    }
    
  } catch (error) {
    console.error('❌ Failed to create configuration file:', error);
    process.exit(1);
  }
}

async function loadConfig(options: CLIOptions): Promise<ValidationConfig> {
  let config: ValidationConfig;
  
  // Try to load from config file
  if (options.config) {
    try {
      const configContent = await fs.promises.readFile(options.config, 'utf-8');
      config = JSON.parse(configContent);
    } catch (error) {
      console.error(`❌ Failed to load config file: ${options.config}`);
      throw error;
    }
  } else {
    // Try default config file
    const defaultConfigPath = path.join(options.project || process.cwd(), 'concept-validation.config.json');
    try {
      const configContent = await fs.promises.readFile(defaultConfigPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch {
      // Use default configuration
      config = {
        openaiApiKey: '',
        modelName: 'gpt-4',
        projectRoot: options.project || process.cwd(),
        specDir: 'specs',
        conceptDir: 'concepts',
        syncDir: 'syncs',
        includeAiAnalysis: false,
        strictMode: false
      };
    }
  }
  
  // Override with command line options
  if (options.project) config.projectRoot = options.project;
  if (options.specs) config.specDir = options.specs;
  if (options.concepts) config.conceptDir = options.concepts;
  if (options.syncs) config.syncDir = options.syncs;
  if (options.ai) config.includeAiAnalysis = true;
  if (options.apiKey) config.openaiApiKey = options.apiKey;
  if (options.model) config.modelName = options.model;
  if (options.strict) config.strictMode = true;
  
  // Use environment variable if no API key provided
  if (!config.openaiApiKey) {
    config.openaiApiKey = process.env.OPENAI_API_KEY || '';
  }
  
  // Validate configuration
  if (config.includeAiAnalysis && !config.openaiApiKey) {
    console.warn('⚠️ AI analysis requested but no API key provided');
    console.log('💡 Provide --api-key or set OPENAI_API_KEY environment variable');
    config.includeAiAnalysis = false;
  }
  
  return config;
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// If this file is being run directly
if (process.argv[1] === __filename) {
  main().catch(error => {
    console.error('❌ CLI failed:', error);
    process.exit(1);
  });
}

export { main };
