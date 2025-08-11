import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';

const execAsync = promisify(exec);

export class ConceptDesignCommands {
    private outputChannel: vscode.OutputChannel;
    private lastValidationReportPath?: string;

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Concept Design Tools');
        context.subscriptions.push(this.outputChannel);
    }

    /**
     * Generate Prisma schema from .concept files
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
                const apiKey = config.get('openaiApiKey') as string || process.env.OPENAI_API_KEY;
                if (!apiKey) {
                    vscode.window.showErrorMessage('OpenAI API key required for AI analysis. Set it in settings or OPENAI_API_KEY environment variable.');
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
            const apiKey = config.get('openaiApiKey') as string || process.env.OPENAI_API_KEY;
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
     * Generate cursor rules interactively using OpenAI
     */
    async generateCursorRules(): Promise<void> {
        try {
            this.outputChannel.show();
            this.outputChannel.appendLine('🤖 Starting interactive cursor rules generation...');

            // Check for OpenAI API key
            const config = vscode.workspace.getConfiguration('conceptDesign');
            const apiKey = config.get<string>('openai.apiKey');
            
            if (!apiKey) {
                const inputKey = await vscode.window.showInputBox({
                    prompt: 'Enter your OpenAI API key',
                    password: true,
                    placeHolder: 'sk-...'
                });
                
                if (!inputKey) {
                    vscode.window.showWarningMessage('OpenAI API key required for cursor rules generation');
                    return;
                }
                
                // Save the key to configuration
                await config.update('openai.apiKey', inputKey, vscode.ConfigurationTarget.Global);
            }

            const workspaceFolder = this.getWorkspaceFolder();
            if (!workspaceFolder) return;

            // Interactive prompts for framework and tooling selection
            const frameworkOptions = await this.getFrameworkSelection();
            if (!frameworkOptions) return;

            const toolingOptions = await this.getToolingSelection();
            if (!toolingOptions) return;

            // Generate the prompt and call OpenAI
            const prompt = this.generateRulesPrompt(frameworkOptions, toolingOptions);
            this.outputChannel.appendLine('📝 Generated prompt for OpenAI...');

            const rules = await this.callOpenAI(prompt, apiKey || config.get<string>('openai.apiKey')!);
            if (!rules) return;

            // Install the generated rules
            await this.installCursorRules(workspaceFolder, rules);
            
            vscode.window.showInformationMessage('✅ Cursor rules generated and installed successfully!');
            this.outputChannel.appendLine('✅ Cursor rules generation completed successfully');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to generate cursor rules: ${errorMessage}`);
            this.outputChannel.appendLine(`❌ Error: ${errorMessage}`);
        }
    }

    private async getFrameworkSelection(): Promise<{framework: string, version: string} | null> {
        const frameworks = [
            { label: 'Next.js 15', value: 'nextjs-15' },
            { label: 'Next.js 14', value: 'nextjs-14' },
            { label: 'SvelteKit 2', value: 'sveltekit-2' },
            { label: 'SvelteKit 1', value: 'sveltekit-1' },
            { label: 'Node.js + Express', value: 'node-express' },
            { label: 'Deno + Fresh', value: 'deno-fresh' },
            { label: 'Bun + Hono', value: 'bun-hono' }
        ];

        const selected = await vscode.window.showQuickPick(frameworks, {
            placeHolder: 'Select your framework and version',
            canPickMany: false
        });

        if (!selected) return null;

        const [framework, version] = selected.value.split('-');
        return { framework, version };
    }

    private async getToolingSelection(): Promise<{[key: string]: string} | null> {
        const categories = [
            {
                name: 'AI/LLM Framework',
                options: [
                    { label: 'LangChain', value: 'langchain' },
                    { label: 'LlamaIndex', value: 'llamaindex' },
                    { label: 'Vercel AI SDK', value: 'vercel-ai' },
                    { label: 'OpenAI SDK only', value: 'openai-sdk' },
                    { label: 'None', value: 'none' }
                ]
            },
            {
                name: 'CSS Framework',
                options: [
                    { label: 'Tailwind CSS', value: 'tailwind' },
                    { label: 'CSS Modules', value: 'css-modules' },
                    { label: 'Styled Components', value: 'styled-components' },
                    { label: 'Vanilla CSS', value: 'vanilla-css' }
                ]
            },
            {
                name: 'UI Components',
                options: [
                    { label: 'shadcn/ui', value: 'shadcn' },
                    { label: 'Radix UI', value: 'radix' },
                    { label: 'Headless UI', value: 'headless-ui' },
                    { label: 'Material UI', value: 'mui' },
                    { label: 'Custom components', value: 'custom' }
                ]
            },
            {
                name: 'Database',
                options: [
                    { label: 'Prisma + PostgreSQL', value: 'prisma-postgres' },
                    { label: 'Prisma + SQLite', value: 'prisma-sqlite' },
                    { label: 'MongoDB + Mongoose', value: 'mongodb-mongoose' },
                    { label: 'Supabase', value: 'supabase' },
                    { label: 'PlanetScale', value: 'planetscale' }
                ]
            }
        ];

        const selections: {[key: string]: string} = {};

        for (const category of categories) {
            const selected = await vscode.window.showQuickPick(category.options, {
                placeHolder: `Select ${category.name}`,
                canPickMany: false
            });

            if (!selected) return null;
            selections[category.name.toLowerCase().replace(/[^a-z]/g, '')] = selected.value;
        }

        return selections;
    }

    private generateRulesPrompt(framework: {framework: string, version: string}, tooling: {[key: string]: string}): string {
        return `# Cursor Rules Generation Request

Create comprehensive Cursor IDE rules for a Concept Design project using the following stack:

## Framework & Version
- **Framework**: ${framework.framework}
- **Version**: ${framework.version}

## Selected Tooling
${Object.entries(tooling).map(([category, tool]) => `- **${category}**: ${tool}`).join('\n')}

## Requirements

Generate rules that should be placed in \`.cursor/rules/\` directory with the following files:

1. **concept-design.md** - Core concept design principles and patterns
2. **framework-integration.md** - How to integrate concepts with ${framework.framework} ${framework.version}
3. **tooling-setup.md** - Configuration and best practices for the selected tools
4. **development-workflow.md** - Step-by-step development process
5. **code-patterns.md** - Common patterns and examples

## Key Principles to Include

- Concept Design methodology (single-purpose, independent concepts)
- Actions take single input/output objects with error handling
- Queries are pure functions returning arrays with underscore prefix
- Synchronizations connect concepts without direct dependencies
- ${framework.framework}-specific patterns for API routes and components
- Integration patterns for ${tooling.aillmframework || 'AI frameworks'}
- Database patterns for ${tooling.database || 'selected database'}
- UI component patterns for ${tooling.uicomponents || 'selected UI library'}

## Output Format

Provide the content for each file in markdown format, clearly separated with file headers.
Make the rules practical, actionable, and specific to the selected stack.
Include code examples and best practices for each technology.
Focus on how to implement the Concept Design methodology with this specific tech stack.

Generate comprehensive, production-ready cursor rules now.`;
    }

    private async callOpenAI(prompt: string, apiKey: string): Promise<string | null> {
        try {
            this.outputChannel.appendLine('🔄 Calling OpenAI API with GPT-4...');
            
            const openai = new OpenAI({ apiKey });
            
            // Use the new responses API with GPT-4 (GPT-5 when available)
            const response = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview', // Will update to 'gpt-5' when available
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert in software architecture and development tooling. Generate comprehensive, practical cursor rules for development teams.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 4000,
                temperature: 0.7
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content received from OpenAI API');
            }

            this.outputChannel.appendLine('✅ Received response from OpenAI');
            return content;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`❌ OpenAI API Error: ${errorMessage}`);
            vscode.window.showErrorMessage(`OpenAI API Error: ${errorMessage}`);
            return null;
        }
    }

    private async installCursorRules(workspaceFolder: string, rulesContent: string): Promise<void> {
        const cursorRulesDir = path.join(workspaceFolder, '.cursor', 'rules');
        
        // Ensure the .cursor/rules directory exists
        if (!fs.existsSync(cursorRulesDir)) {
            fs.mkdirSync(cursorRulesDir, { recursive: true });
            this.outputChannel.appendLine(`📁 Created directory: ${cursorRulesDir}`);
        }

        // Parse the content and extract individual files
        const files = this.parseRulesContent(rulesContent);
        
        for (const [filename, content] of Object.entries(files)) {
            const filePath = path.join(cursorRulesDir, filename);
            fs.writeFileSync(filePath, content, 'utf-8');
            this.outputChannel.appendLine(`📄 Created: ${filename}`);
        }

        // Create an index file that references all rules
        const indexContent = `# Cursor Rules Index

This directory contains Concept Design rules generated for this project.

## Files

${Object.keys(files).map(filename => `- [${filename}](./${filename})`).join('\n')}

Generated on: ${new Date().toISOString()}
`;
        
        fs.writeFileSync(path.join(cursorRulesDir, 'README.md'), indexContent, 'utf-8');
        this.outputChannel.appendLine('📄 Created: README.md');
    }

    private parseRulesContent(content: string): {[filename: string]: string} {
        const files: {[filename: string]: string} = {};
        
        // Try to extract files based on markdown headers
        const filePattern = /^#\s+(.+\.md)[\r\n]+([\s\S]*?)(?=^#\s+.+\.md|$)/gm;
        let match;
        
        while ((match = filePattern.exec(content)) !== null) {
            const filename = match[1].trim();
            const fileContent = match[2].trim();
            files[filename] = fileContent;
        }
        
        // If no files were parsed, create a single comprehensive rules file
        if (Object.keys(files).length === 0) {
            files['concept-design-rules.md'] = content;
        }
        
        return files;
    }
}
