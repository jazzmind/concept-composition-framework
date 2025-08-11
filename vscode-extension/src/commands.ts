import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import { SchemaGenerator } from './database/schema';
import { CompilerConcept } from './rules/rulesGenerator';

const execAsync = promisify(exec);

export class ConceptDesignCommands {
    private outputChannel: vscode.OutputChannel;
    private lastValidationReportPath?: string;

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Concept Design Tools');
        context.subscriptions.push(this.outputChannel);
    }

    /**
     * Sync Prisma schema with concept specifications
     */
    async syncSchema(): Promise<void> {
        try {
            this.outputChannel.show();
            this.outputChannel.appendLine('🔄 Syncing Prisma schema with concept specifications...');

            const workspaceFolder = this.getWorkspaceFolder();
            if (!workspaceFolder) return;

            // Get user to select directories
            const specsDir = await this.selectSpecsDirectory(workspaceFolder);
            if (!specsDir) return;

            const schemaPath = await this.selectSchemaPath(workspaceFolder);
            if (!schemaPath) return;

            // Check if specs directory exists and has concept files
            if (!fs.existsSync(specsDir)) {
                vscode.window.showErrorMessage(`Specs directory not found: ${specsDir}`);
                return;
            }

            const conceptFiles = fs.readdirSync(specsDir).filter(file => file.endsWith('.concept'));
            if (conceptFiles.length === 0) {
                vscode.window.showWarningMessage(`No .concept files found in: ${specsDir}`);
                return;
            }

            this.outputChannel.appendLine(`📦 Found ${conceptFiles.length} concept files in ${specsDir}`);

            // Ensure schema directory exists
            const schemaDir = path.dirname(schemaPath);
            if (!fs.existsSync(schemaDir)) {
                fs.mkdirSync(schemaDir, { recursive: true });
                this.outputChannel.appendLine(`📁 Created directory: ${schemaDir}`);
            }

            // Generate schema using the SchemaGenerator
            const generator = new SchemaGenerator(specsDir, schemaPath);
            
            // Check if schema already exists
            const schemaExists = fs.existsSync(schemaPath);
            if (schemaExists) {
                const overwrite = await vscode.window.showQuickPick(
                    ['Yes, overwrite existing schema', 'No, cancel operation'],
                    {
                        placeHolder: 'Schema file already exists. Overwrite it?',
                        canPickMany: false
                    }
                );
                
                if (!overwrite || overwrite === 'No, cancel operation') {
                    this.outputChannel.appendLine('❌ Operation cancelled by user');
                    return;
                }
            }

            // Generate the schema
            generator.writeSchema();
            
            this.outputChannel.appendLine('✅ Schema sync completed successfully');
            vscode.window.showInformationMessage('Prisma schema synced with concept specifications!');
            
            // Open the generated/updated schema
            const schemaUri = vscode.Uri.file(schemaPath);
            await vscode.window.showTextDocument(schemaUri);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`❌ Schema sync failed: ${errorMessage}`);
            vscode.window.showErrorMessage(`Schema sync failed: ${errorMessage}`);
        }
    }

    /**
     * Generate Prisma schema from .concept files (legacy method)
     */
    async generateSchema(): Promise<void> {
        try {
            this.outputChannel.show();
            this.outputChannel.appendLine('🔧 Generating Prisma schema from concept specifications...');

            const workspaceFolder = this.getWorkspaceFolder();
            if (!workspaceFolder) return;

            const config = vscode.workspace.getConfiguration('conceptDesign');
            const specsDir = path.join(workspaceFolder, config.get('directories.specs', 'specs'));
            const schemaPath = path.join(workspaceFolder, config.get('directories.schema', 'prisma/schema.prisma'));

            // Check if specs directory exists
            if (!fs.existsSync(specsDir)) {
                vscode.window.showErrorMessage(`Specs directory not found: ${specsDir}`);
                return;
            }

            // Ensure schema directory exists
            const schemaDir = path.dirname(schemaPath);
            if (!fs.existsSync(schemaDir)) {
                fs.mkdirSync(schemaDir, { recursive: true });
            }

            // Look for generate-schema.js in the workspace
            const schemaGeneratorPath = await this.findSchemaGenerator(workspaceFolder);
            
            if (schemaGeneratorPath) {
                // Use existing schema generator
                this.outputChannel.appendLine(`📄 Using schema generator: ${schemaGeneratorPath}`);
                
                const { stdout, stderr } = await execAsync(`node "${schemaGeneratorPath}" generate`, {
                    cwd: workspaceFolder
                });
                
                if (stderr) {
                    this.outputChannel.appendLine(`⚠️ Warnings: ${stderr}`);
                }
                
                this.outputChannel.appendLine(stdout);
                this.outputChannel.appendLine('✅ Schema generation completed');
                
                vscode.window.showInformationMessage('Prisma schema generated successfully!');
                
                // Open the generated schema
                const schemaUri = vscode.Uri.file(schemaPath);
                await vscode.window.showTextDocument(schemaUri);
                
            } else {
                // Use built-in schema generator
                await this.generateSchemaBuiltIn(specsDir, schemaPath);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`❌ Schema generation failed: ${errorMessage}`);
            vscode.window.showErrorMessage(`Schema generation failed: ${errorMessage}`);
        }
    }

    /**
     * Validate concept alignment with implementations
     */
    async validateConcepts(useAI: boolean = false, silent: boolean = false): Promise<void> {
        try {
            if (!silent) {
                this.outputChannel.show();
                this.outputChannel.appendLine(`🔍 Validating concept alignment${useAI ? ' with AI analysis' : ''}...`);
            }

            const workspaceFolder = this.getWorkspaceFolder();
            if (!workspaceFolder) return;

            const config = vscode.workspace.getConfiguration('conceptDesign');
            
            if (useAI) {
                const apiKey = config.get('openai.apiKey') as string || process.env.OPENAI_API_KEY;
                if (!apiKey) {
                    vscode.window.showErrorMessage('OpenAI API key required for AI analysis. Set it in settings (conceptDesign.openai.apiKey) or OPENAI_API_KEY environment variable.');
                    return;
                }
            }

            // Look for validation engine in the workspace
            const validationEngine = await this.findValidationEngine(workspaceFolder);
            
            if (validationEngine) {
                await this.runValidationEngine(validationEngine, workspaceFolder, useAI, silent);
            } else {
                await this.runBuiltInValidation(workspaceFolder, useAI, silent);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (!silent) {
                this.outputChannel.appendLine(`❌ Validation failed: ${errorMessage}`);
                vscode.window.showErrorMessage(`Validation failed: ${errorMessage}`);
            }
        }
    }

    /**
     * Generate TypeScript code from concept specifications
     */
    async generateCode(): Promise<void> {
        try {
            this.outputChannel.show();
            this.outputChannel.appendLine('🏗️ Generating TypeScript code from concept specifications...');

            const workspaceFolder = this.getWorkspaceFolder();
            if (!workspaceFolder) return;

            const config = vscode.workspace.getConfiguration('conceptDesign');
            const specsDir = path.join(workspaceFolder, config.get('directories.specs', 'specs'));
            const conceptsDir = path.join(workspaceFolder, config.get('directories.concepts', 'concepts'));
            const syncsDir = path.join(workspaceFolder, config.get('directories.syncs', 'syncs'));
            const overwriteExisting = config.get('codeGeneration.overwriteExisting', false);
            const useMongoDb = config.get('codeGeneration.useMongoDb', false);

            // Check if specs directory exists
            if (!fs.existsSync(specsDir)) {
                vscode.window.showErrorMessage(`Specs directory not found: ${specsDir}`);
                return;
            }

            // Create output directories
            [conceptsDir, syncsDir].forEach(dir => {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            });

            // Find concept files
            const conceptFiles = await this.findConceptFiles(specsDir);
            const syncFiles = await this.findSyncFiles(specsDir);

            this.outputChannel.appendLine(`📦 Found ${conceptFiles.length} concept files and ${syncFiles.length} sync files`);

            // Generate concept implementations
            let generatedCount = 0;
            for (const conceptFile of conceptFiles) {
                const generated = await this.generateConceptImplementation(
                    conceptFile, 
                    conceptsDir, 
                    overwriteExisting,
                    useMongoDb
                );
                if (generated) generatedCount++;
            }

            // Generate sync implementations
            for (const syncFile of syncFiles) {
                const generated = await this.generateSyncImplementation(
                    syncFile, 
                    syncsDir, 
                    overwriteExisting
                );
                if (generated) generatedCount++;
            }

            this.outputChannel.appendLine(`✅ Code generation completed. Generated ${generatedCount} files.`);
            vscode.window.showInformationMessage(`Generated ${generatedCount} TypeScript files from specifications!`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`❌ Code generation failed: ${errorMessage}`);
            vscode.window.showErrorMessage(`Code generation failed: ${errorMessage}`);
        }
    }

    /**
     * Open the last validation report
     */
    async openValidationReport(): Promise<void> {
        if (!this.lastValidationReportPath || !fs.existsSync(this.lastValidationReportPath)) {
            vscode.window.showWarningMessage('No validation report found. Run validation first.');
            return;
        }

        const reportUri = vscode.Uri.file(this.lastValidationReportPath);
        await vscode.env.openExternal(reportUri);
    }

    private getWorkspaceFolder(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder found');
            return undefined;
        }
        return workspaceFolders[0].uri.fsPath;
    }

    private async findSchemaGenerator(workspaceRoot: string): Promise<string | null> {
        // Look for generate-schema.js in common locations
        const possiblePaths = [
            path.join(workspaceRoot, 'scripts', 'generate-schema.js'),
            path.join(workspaceRoot, 'tools', 'generate-schema.js'),
            path.join(workspaceRoot, 'generate-schema.js'),
        ];

        for (const schemaPath of possiblePaths) {
            if (fs.existsSync(schemaPath)) {
                return schemaPath;
            }
        }

        return null;
    }

    private async findValidationEngine(workspaceRoot: string): Promise<string | null> {
        // Look for validation engine
        const possiblePaths = [
            path.join(workspaceRoot, 'validation', 'cli.ts'),
            path.join(workspaceRoot, 'validation', 'cli.js'),
            path.join(workspaceRoot, 'tools', 'validate.ts'),
            path.join(workspaceRoot, 'tools', 'validate.js'),
        ];

        for (const validationPath of possiblePaths) {
            if (fs.existsSync(validationPath)) {
                return validationPath;
            }
        }

        return null;
    }

    private async runValidationEngine(enginePath: string, workspaceRoot: string, useAI: boolean, silent: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration('conceptDesign');
        const reportDir = path.join(workspaceRoot, '.concept-design', 'reports');
        
        // Ensure report directory exists
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const reportPath = path.join(reportDir, `validation-${Date.now()}.html`);
        
        let command = `node "${enginePath}" validate --format html --output "${reportDir}"`;
        
        if (useAI) {
            const apiKey = config.get('openai.apiKey') as string || process.env.OPENAI_API_KEY;
            command += ` --ai --api-key "${apiKey}"`;
        }

        const { stdout, stderr } = await execAsync(command, { cwd: workspaceRoot });
        
        if (!silent) {
            this.outputChannel.appendLine(stdout);
            if (stderr) {
                this.outputChannel.appendLine(`⚠️ Warnings: ${stderr}`);
            }
        }

        // Find the generated report
        const reportFiles = fs.readdirSync(reportDir).filter(f => f.endsWith('.html'));
        if (reportFiles.length > 0) {
            this.lastValidationReportPath = path.join(reportDir, reportFiles[reportFiles.length - 1]);
            if (!silent) {
                this.outputChannel.appendLine(`📄 Report saved: ${this.lastValidationReportPath}`);
            }
        }

        if (!silent) {
            vscode.window.showInformationMessage('Concept validation completed! Check the output for details.');
        }
    }

    private async runBuiltInValidation(workspaceRoot: string, useAI: boolean, silent: boolean): Promise<void> {
        // Built-in validation logic
        const config = vscode.workspace.getConfiguration('conceptDesign');
        const specsDir = path.join(workspaceRoot, config.get('directories.specs', 'specs'));
        const conceptsDir = path.join(workspaceRoot, config.get('directories.concepts', 'concepts'));

        if (!silent) {
            this.outputChannel.appendLine('🔍 Running built-in validation...');
        }

        // Simple validation - check for missing implementations
        const conceptFiles = await this.findConceptFiles(specsDir);
        const missingImplementations: string[] = [];

        for (const conceptFile of conceptFiles) {
            const conceptName = path.basename(conceptFile, '.concept').toLowerCase();
            const implPath = path.join(conceptsDir, `${conceptName}.ts`);
            
            if (!fs.existsSync(implPath)) {
                missingImplementations.push(conceptName);
            }
        }

        if (missingImplementations.length > 0 && !silent) {
            this.outputChannel.appendLine(`⚠️ Missing implementations: ${missingImplementations.join(', ')}`);
            vscode.window.showWarningMessage(`Missing implementations for: ${missingImplementations.join(', ')}`);
        } else if (!silent) {
            this.outputChannel.appendLine('✅ All concepts have implementations');
            vscode.window.showInformationMessage('Basic validation passed!');
        }
    }

    private async generateSchemaBuiltIn(specsDir: string, schemaPath: string): Promise<void> {
        // Built-in schema generation logic
        this.outputChannel.appendLine('🔧 Using built-in schema generator...');
        
        const conceptFiles = await this.findConceptFiles(specsDir);
        
        const schemaHeader = `// Generated Prisma schema from concept specifications
// DO NOT EDIT MANUALLY - This file is auto-generated

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

        let schemaContent = schemaHeader;

        for (const conceptFile of conceptFiles) {
            const conceptName = path.basename(conceptFile, '.concept');
            schemaContent += `model ${conceptName} {\n`;
            schemaContent += `  id        String    @id @default(cuid())\n`;
            schemaContent += `  createdAt DateTime  @default(now())\n`;
            schemaContent += `  updatedAt DateTime  @updatedAt\n`;
            schemaContent += `\n`;
            schemaContent += `  @@map("${conceptName.toLowerCase()}")\n`;
            schemaContent += `}\n\n`;
        }

        fs.writeFileSync(schemaPath, schemaContent, 'utf-8');
        this.outputChannel.appendLine(`✅ Schema generated: ${schemaPath}`);
    }

    private async findConceptFiles(directory: string): Promise<string[]> {
        if (!fs.existsSync(directory)) return [];
        
        return fs.readdirSync(directory)
            .filter(file => file.endsWith('.concept'))
            .map(file => path.join(directory, file));
    }

    private async findSyncFiles(directory: string): Promise<string[]> {
        if (!fs.existsSync(directory)) return [];
        
        return fs.readdirSync(directory)
            .filter(file => file.endsWith('.sync'))
            .map(file => path.join(directory, file));
    }

    private async generateConceptImplementation(
        conceptFile: string, 
        outputDir: string, 
        overwrite: boolean,
        useMongoDb: boolean
    ): Promise<boolean> {
        const conceptName = path.basename(conceptFile, '.concept');
        const outputPath = path.join(outputDir, `${conceptName.toLowerCase()}.ts`);
        
        if (fs.existsSync(outputPath) && !overwrite) {
            this.outputChannel.appendLine(`⏭️ Skipping existing file: ${outputPath}`);
            return false;
        }

        // Generate basic concept implementation template
        const template = this.generateConceptTemplate(conceptName, useMongoDb);
        
        fs.writeFileSync(outputPath, template, 'utf-8');
        this.outputChannel.appendLine(`✅ Generated: ${outputPath}`);
        return true;
    }

    private async generateSyncImplementation(
        syncFile: string, 
        outputDir: string, 
        overwrite: boolean
    ): Promise<boolean> {
        const syncName = path.basename(syncFile, '.sync');
        const outputPath = path.join(outputDir, `${syncName.toLowerCase()}.ts`);
        
        if (fs.existsSync(outputPath) && !overwrite) {
            this.outputChannel.appendLine(`⏭️ Skipping existing file: ${outputPath}`);
            return false;
        }

        try {
            // Parse sync specification
            const content = fs.readFileSync(syncFile, 'utf-8');
            const { SyncCodeGenerator } = await import('./codegen/syncGenerator');
            const { SyncSpecParser } = await import('./parsers/syncParser');
            
            const parser = new SyncSpecParser();
            const generator = new SyncCodeGenerator();
            
            const syncSpec = parser.parseSyncSpec(content);
            
            let code: string;
            if (syncSpec.name && (syncSpec.when.length > 0 || syncSpec.then.length > 0)) {
                // Generate from spec
                code = generator.generateSyncImplementation(syncSpec, outputPath);
                this.outputChannel.appendLine(`📝 Generated sync from specification: ${syncSpec.name}`);
            } else {
                // Generate template
                code = generator.generateSyncTemplate(syncName, outputPath);
                this.outputChannel.appendLine(`📝 Generated sync template for: ${syncName}`);
            }
            
            fs.writeFileSync(outputPath, code, 'utf-8');
            this.outputChannel.appendLine(`✅ Generated: ${outputPath}`);
            return true;
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to generate sync ${syncName}: ${error}`);
            // Fallback to template
            const template = this.generateSyncTemplate(syncName);
            fs.writeFileSync(outputPath, template, 'utf-8');
            this.outputChannel.appendLine(`✅ Generated template: ${outputPath}`);
            return true;
        }
    }

    private generateConceptTemplate(conceptName: string, useMongoDb: boolean): string {
        if (useMongoDb) {
            return `import { MongoClient, Db, Collection } from 'mongodb';

export interface ${conceptName}Record {
    id: string;
    // Add fields based on concept specification
}

export class ${conceptName}Concept {
    private collection: Collection<${conceptName}Record>;

    constructor(db: Db) {
        this.collection = db.collection('${conceptName.toLowerCase()}');
    }

    // Implement actions from concept specification
    async sampleAction(input: { field: string }): Promise<{ result: string } | { error: string }> {
        try {
            // Implementation logic here
            return { result: "success" };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    // Implement queries from concept specification  
    async _sampleQuery(input: { field: string }): Promise<Array<${conceptName}Record>> {
        try {
            const results = await this.collection.find(input).toArray();
            return results;
        } catch (error) {
            return [];
        }
    }
}
`;
        } else {
            return `import { PrismaClient } from '@prisma/client';

export interface ${conceptName}Record {
    id: string;
    // Add fields based on concept specification
}

export class ${conceptName}Concept {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    // Implement actions from concept specification
    async sampleAction(input: { field: string }): Promise<{ result: string } | { error: string }> {
        try {
            // Implementation logic here
            return { result: "success" };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    // Implement queries from concept specification
    async _sampleQuery(input: { field: string }): Promise<Array<${conceptName}Record>> {
        try {
            const results = await this.prisma.${conceptName.toLowerCase()}.findMany({
                where: input
            });
            return results;
        } catch (error) {
            return [];
        }
    }
}
`;
        }
    }

    private generateSyncTemplate(syncName: string): string {
        return `import { actions, Frames, Vars } from '../engine/mod';

export const ${syncName} = ({ input, output }: Vars) => ({
    when: actions(
        // Add action patterns here
        // [Concept.action, { input: value }, { output: variable }]
    ),
    where: (frames: Frames): Frames => {
        // Add filtering and query logic here
        return frames;
    },
    then: actions(
        // Add consequent actions here
        // [Concept.action, { input: variable }]
    ),
});
`;
    }

    /**
     * Generate AI rules interactively using OpenAI
     */
    async generateCursorRules(): Promise<void> {
        try {
            this.outputChannel.show();
            this.outputChannel.appendLine('🤖 Starting interactive AI rules generation...');

            // Check for OpenAI API key
            const config = vscode.workspace.getConfiguration('conceptDesign');
            let apiKey = config.get<string>('openai.apiKey') || process.env.OPENAI_API_KEY;
            
            if (!apiKey) {
                const inputKey = await vscode.window.showInputBox({
                    prompt: 'Enter your OpenAI API key',
                    password: true,
                    placeHolder: 'sk-...'
                });
                
                if (!inputKey) {
                    vscode.window.showWarningMessage('OpenAI API key required for AI rules generation');
                    return;
                }
                
                apiKey = inputKey;
                // Save the key to configuration
                await config.update('openai.apiKey', inputKey, vscode.ConfigurationTarget.Global);
            }

            const workspaceFolder = this.getWorkspaceFolder();
            if (!workspaceFolder) return;

            // Interactive selection for tool, stack, and target directory
            const toolSelection = await this.getToolSelection();
            if (!toolSelection) return;

            const stackSelection = await this.getStackSelection();
            if (!stackSelection) return;

            const targetDirectory = await this.getTargetDirectory(workspaceFolder, toolSelection.name);
            if (!targetDirectory) return;

            const fromSelection = await this.getFromSelection();
            if (!fromSelection) return;

            this.outputChannel.appendLine(`🔧 Configuration:`);
            this.outputChannel.appendLine(`   Tool: ${toolSelection.label}`);
            this.outputChannel.appendLine(`   Stack: ${stackSelection.label}`);
            this.outputChannel.appendLine(`   Target: ${targetDirectory}`);
            this.outputChannel.appendLine(`   Source: ${fromSelection}`);

            // Generate rules using the abstracted generator
            const generator = new CompilerConcept();

            const result = await generator.generateRules({
                target: toolSelection.name,
                stack: stackSelection.name,
                from: fromSelection as 'framework' | 'docs',
                targetDirectory,
                openaiApiKey: apiKey,
                modelName: config.get('openai.model', 'gpt-4')
            });

            if (!result.success) {
                throw new Error(result.error || 'Rules generation failed');
            }

            this.outputChannel.appendLine(`✅ Generated ${result.files.length} files:`);
            result.files.forEach(file => {
                this.outputChannel.appendLine(`   📄 ${file}`);
            });
            
            vscode.window.showInformationMessage(`✅ AI rules generated successfully! Created ${result.files.length} files.`);

            // Open the main rules file
            if (result.files.length > 0) {
                const mainFile = result.files.find(f => f.includes('README.md')) || result.files[0];
                const uri = vscode.Uri.file(mainFile);
                await vscode.window.showTextDocument(uri);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to generate AI rules: ${errorMessage}`);
            this.outputChannel.appendLine(`❌ Error: ${errorMessage}`);
        }
    }

    /**
     * Get tool selection from user
     */
    private async getToolSelection(): Promise<{ name: string; label: string; description: string } | null> {
        const tools = CompilerConcept.getAvailableTools();

        const options = tools.map(tool => ({
            label: tool.label,
            description: tool.description,
            detail: tool.name
        }));

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select target AI tool for rules generation',
            matchOnDescription: true,
            canPickMany: false
        });

        if (!selected) return null;

        return tools.find(tool => tool.name === selected.detail)!;
    }

    /**
     * Get stack selection from user
     */
    private async getStackSelection(): Promise<{ name: string; label: string; description: string } | null> {
        const stacks = CompilerConcept.getAvailableStacks();

        const options = stacks.map(stack => ({
            label: stack.label,
            description: stack.description,
            detail: stack.name
        }));

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select technology stack',
            matchOnDescription: true,
            canPickMany: false
        });

        if (!selected) return null;

        return stacks.find(stack => stack.name === selected.detail)!;
    }

    /**
     * Get target directory from user
     */
    private async getTargetDirectory(workspaceFolder: string, toolName: string): Promise<string | null> {
        const defaultPaths: Record<string, string> = {
            'cursor': '.cursor/rules',
            'claude-code': '.',
            'windsurf': '.windsurf/rules',
            'copilot': '.github',
            'codeium': '.codeium',
            'custom': 'ai-rules'
        };

        const defaultPath = defaultPaths[toolName] || 'ai-rules';
        const fullDefaultPath = path.join(workspaceFolder, defaultPath);

        const options = [
            {
                label: `📁 ${defaultPath}/ (recommended)`,
                description: 'Use the standard location for this tool',
                value: fullDefaultPath
            },
            {
                label: '🔍 Browse for directory...',
                description: 'Select a custom directory',
                value: 'browse'
            }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select target directory for generated rules',
            canPickMany: false
        });

        if (!selected) return null;

        if (selected.value === 'browse') {
            const browsed = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: vscode.Uri.file(workspaceFolder),
                title: 'Select target directory for AI rules'
            });

            return browsed ? browsed[0].fsPath : null;
        }

        return selected.value;
    }

    /**
     * Get source selection (framework vs docs)
     */
    private async getFromSelection(): Promise<string | null> {
        const options = [
            {
                label: 'Framework Specs',
                description: 'Generate from framework specifications (more comprehensive)',
                detail: 'framework'
            },
            {
                label: 'Documentation',
                description: 'Generate from documentation and best practices (faster)',
                detail: 'docs'
            }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select generation source',
            canPickMany: false
        });

        return selected?.detail || null;
    }



    /**
     * Let user select the specs directory
     */
    private async selectSpecsDirectory(workspaceFolder: string): Promise<string | undefined> {
        const config = vscode.workspace.getConfiguration('conceptDesign');
        const defaultSpecsDir = config.get('directories.specs', 'specs');
        
        // Common specs directory options
        const options = [
            { label: `📁 ${defaultSpecsDir}/ (default from config)`, value: path.join(workspaceFolder, defaultSpecsDir) },
            { label: '📁 specs/', value: path.join(workspaceFolder, 'specs') },
            { label: '📁 src/specs/', value: path.join(workspaceFolder, 'src', 'specs') },
            { label: '📁 concepts/', value: path.join(workspaceFolder, 'concepts') },
            { label: '🔍 Browse for directory...', value: 'browse' }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select the directory containing your .concept files',
            canPickMany: false
        });

        if (!selected) return undefined;

        if (selected.value === 'browse') {
            const browsed = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: vscode.Uri.file(workspaceFolder),
                title: 'Select specs directory'
            });
            
            return browsed ? browsed[0].fsPath : undefined;
        }

        return selected.value;
    }

    /**
     * Let user select the schema file path
     */
    private async selectSchemaPath(workspaceFolder: string): Promise<string | undefined> {
        const config = vscode.workspace.getConfiguration('conceptDesign');
        const defaultSchemaPath = config.get('directories.schema', 'prisma/schema.prisma');
        
        // Common schema file locations
        const options = [
            { label: `📄 ${defaultSchemaPath} (default from config)`, value: path.join(workspaceFolder, defaultSchemaPath) },
            { label: '📄 prisma/schema.prisma', value: path.join(workspaceFolder, 'prisma', 'schema.prisma') },
            { label: '📄 src/prisma/schema.prisma', value: path.join(workspaceFolder, 'src', 'prisma', 'schema.prisma') },
            { label: '📄 schema.prisma (root)', value: path.join(workspaceFolder, 'schema.prisma') },
            { label: '🔍 Browse for file...', value: 'browse' }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select where to save the Prisma schema file',
            canPickMany: false
        });

        if (!selected) return undefined;

        if (selected.value === 'browse') {
            const browsed = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.join(workspaceFolder, 'prisma', 'schema.prisma')),
                filters: {
                    'Prisma Schema': ['prisma'],
                    'All Files': ['*']
                },
                title: 'Save Prisma schema as...'
            });
            
            return browsed ? browsed.fsPath : undefined;
        }

        return selected.value;
    }

    /**
     * Toggle the language server / linting on/off
     */
    async toggleLinting(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('conceptDesign');
            const currentValue = config.get('linting.enableLanguageServer', false);
            const newValue = !currentValue;
            
            await config.update('linting.enableLanguageServer', newValue, vscode.ConfigurationTarget.Workspace);
            
            const message = newValue 
                ? '✅ Language Server / Linting enabled. Please reload VS Code for changes to take effect.'
                : '❌ Language Server / Linting disabled. Please reload VS Code for changes to take effect.';
            
            const action = await vscode.window.showInformationMessage(message, 'Reload Now', 'Later');
            
            if (action === 'Reload Now') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to toggle linting: ${errorMessage}`);
        }
    }

    /**
     * Test extension functionality without linting
     */
    async testExtension(): Promise<void> {
        try {
            this.outputChannel.show();
            this.outputChannel.appendLine('🧪 Testing Concept Design Tools extension...');
            
            const workspaceFolder = this.getWorkspaceFolder();
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found for testing');
                return;
            }
            
            this.outputChannel.appendLine(`📁 Workspace: ${workspaceFolder}`);
            
            // Test configuration reading
            const config = vscode.workspace.getConfiguration('conceptDesign');
            const debugLogging = config.get('debug.enableLogging', false);
            const languageServer = config.get('linting.enableLanguageServer', false);
            const realTimeLinting = config.get('linting.enableRealTime', false);
            const openaiApiKey = config.get('openai.apiKey', '');
            const openaiModel = config.get('openai.model', 'gpt-4.1');
            const syntaxSafeMode = config.get('syntax.useSafeMode', true);
            
            this.outputChannel.appendLine('⚙️ Configuration:');
            this.outputChannel.appendLine(`  - Debug Logging: ${debugLogging}`);
            this.outputChannel.appendLine(`  - Language Server: ${languageServer}`);
            this.outputChannel.appendLine(`  - Real-time Linting: ${realTimeLinting}`);
            this.outputChannel.appendLine(`  - OpenAI API Key: ${openaiApiKey ? 'Set ✅' : 'Not set ❌'}`);
            this.outputChannel.appendLine(`  - OpenAI Model: ${openaiModel}`);
            this.outputChannel.appendLine(`  - Syntax Safe Mode: ${syntaxSafeMode}`);
            
            // Test directory detection
            const specsDir = path.join(workspaceFolder, config.get('directories.specs', 'specs'));
            const conceptsDir = path.join(workspaceFolder, config.get('directories.concepts', 'concepts'));
            const syncsDir = path.join(workspaceFolder, config.get('directories.syncs', 'syncs'));
            
            this.outputChannel.appendLine('📂 Directories:');
            this.outputChannel.appendLine(`  - Specs: ${specsDir} ${fs.existsSync(specsDir) ? '✅' : '❌'}`);
            this.outputChannel.appendLine(`  - Concepts: ${conceptsDir} ${fs.existsSync(conceptsDir) ? '✅' : '❌'}`);
            this.outputChannel.appendLine(`  - Syncs: ${syncsDir} ${fs.existsSync(syncsDir) ? '✅' : '❌'}`);
            
            // Test file detection
            let conceptFiles: string[] = [];
            let syncFiles: string[] = [];
            
            if (fs.existsSync(specsDir)) {
                conceptFiles = await this.findConceptFiles(specsDir);
                syncFiles = await this.findSyncFiles(specsDir);
            }
            
            this.outputChannel.appendLine('📄 Files:');
            this.outputChannel.appendLine(`  - Concept files: ${conceptFiles.length}`);
            conceptFiles.forEach(file => {
                this.outputChannel.appendLine(`    - ${path.basename(file)}`);
            });
            this.outputChannel.appendLine(`  - Sync files: ${syncFiles.length}`);
            syncFiles.forEach(file => {
                this.outputChannel.appendLine(`    - ${path.basename(file)}`);
            });
            
            // Test command availability
            this.outputChannel.appendLine('🔧 Commands:');
            this.outputChannel.appendLine('  - Generate Schema: Available');
            this.outputChannel.appendLine('  - Validate Concepts: Available');
            this.outputChannel.appendLine('  - Generate Code: Available');
            this.outputChannel.appendLine('  - Generate Cursor Rules: Available');
            this.outputChannel.appendLine('  - Toggle Linting: Available');
            this.outputChannel.appendLine('  - Toggle Syntax Safe Mode: Available');
            
            this.outputChannel.appendLine('✅ Extension test completed successfully!');
            
            vscode.window.showInformationMessage(
                `✅ Extension test completed! Found ${conceptFiles.length} concept files and ${syncFiles.length} sync files. Check output for details.`
            );
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`❌ Extension test failed: ${errorMessage}`);
            vscode.window.showErrorMessage(`Extension test failed: ${errorMessage}`);
        }
    }

    /**
     * Toggle syntax highlighting on/off
     */
    async toggleSyntaxHighlighting(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('conceptDesign');
            const currentValue = config.get('syntax.enableHighlighting', false);
            const newValue = !currentValue;
            
            await config.update('syntax.enableHighlighting', newValue, vscode.ConfigurationTarget.Workspace);
            
            const message = newValue 
                ? '🎨 Syntax highlighting enabled (EXPERIMENTAL - may cause crashes)'
                : '🔒 Syntax highlighting disabled (safe mode)';
            
            const action = await vscode.window.showInformationMessage(
                message + ' Please reload VS Code for changes to take effect.',
                'Reload Now', 
                'Later'
            );
            
            if (action === 'Reload Now') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to toggle syntax highlighting: ${error}`);
        }
    }

    /**
     * Toggle syntax highlighting safety mode
     */
    async toggleSyntaxSafeMode(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('conceptDesign');
            const currentValue = config.get('syntax.useSafeMode', true);
            const newValue = !currentValue;
            
            await config.update('syntax.useSafeMode', newValue, vscode.ConfigurationTarget.Workspace);
            
            const message = newValue 
                ? '🛡️ Safe syntax highlighting enabled (prevents crashes)'
                : '⚡ Full syntax highlighting enabled (may cause crashes with large files)';
            
            const action = await vscode.window.showInformationMessage(
                message + ' Please reload VS Code for changes to take effect.',
                'Reload Now', 
                'Later'
            );
            
            if (action === 'Reload Now') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to toggle syntax mode: ${errorMessage}`);
        }
    }
}
