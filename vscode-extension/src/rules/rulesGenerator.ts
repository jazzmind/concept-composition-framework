import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import OpenAI from 'openai';

export interface CompilationRecord {
    compilation: string;
    target: string;
    stack: string;
    specsDir: string;
    outDir: string;
    status: string;
}

export interface RulesGenerationOptions {
    target: string;
    stack: string;
    from: "framework" | "docs";
    targetDirectory: string;
    openaiApiKey?: string;
    modelName?: string;
}

export interface ArtifactRecord {
    artifact: string;
    compilation: string;
    path: string;
}

export class CompilerConcept {
    private compilations: Map<string, CompilationRecord> = new Map();
    private artifacts: Map<string, ArtifactRecord> = new Map();
    private artifactsByCompilation: Map<string, Set<string>> = new Map();
    private openai?: OpenAI;

    compile(
        { target, stack, from, specsDir, outDir }: {
            target: string;
            stack: string;
            from: "framework" | "docs";
            specsDir: string;
            outDir: string;
        },
    ): { compilation: string } {
        const id = randomUUID();
        this.compilations.set(id, {
            compilation: id,
            target,
            stack,
            specsDir,
            outDir,
            status: "started",
        });
        // Ensure output directory exists
        fs.mkdirSync(outDir, { recursive: true });
        // Generate a single LLM-facing instruction file instead of concrete rules
        const instructions = this.#generateLLMInstructions({ target, stack, from });
        this.record({ compilation: id, path: instructions });

        const rec = this.compilations.get(id)!;
        rec.status = "completed";
        return { compilation: id };
    }

    #copyRecursive(srcDir: string, destDir: string) {
        const stat = fs.statSync(srcDir);
        if (!stat.isDirectory()) {
            fs.mkdirSync(path.dirname(destDir), { recursive: true });
            fs.copyFileSync(srcDir, destDir);
            return;
        }
        fs.mkdirSync(destDir, { recursive: true });
        for (const entry of fs.readdirSync(srcDir)) {
            const from = path.join(srcDir, entry);
            const to = path.join(destDir, entry);
            const st = fs.statSync(from);
            if (st.isDirectory()) {
                this.#copyRecursive(from, to);
            } else {
                fs.copyFileSync(from, to);
            }
        }
    }

    #generateLLMInstructions(
        { target, stack, from }: { target: string; stack: string; from: "framework" | "docs" },
    ): string {
        const file = path.join(".", "rules", "prompts", `${target}_${stack}_${from}_PROMPT.md`);
        const toolTargets = [
            { name: "cursor", location: ".cursor/rules/", files: "multiple .mdc files" },
            { name: "claude-code", location: "CLAUDE.md", files: "single workspace instruction file" },
            { name: "windsurf", location: ".windsurf/rules/rules.md", files: "single rules file" },
            { name: "copilot", location: ".github/copilot-instructions.md", files: "single instruction file" },
        ];
        const stacks = ["nextjs", "sveltekit", "node-express"];
        // Discover the location of the target tool
        const targetLocation = toolTargets.map((t) => {
            if (t.name === target) {
                return `${t.location} (${t.files})`;
            }
        });
        if (!targetLocation) {
            throw new Error(`Target tool ${target} not found`);
        }
        const tasks = {
            "framework": [
            `1) Read framework explanation (rules/concept-design.md) to understand the framework.`,
            `2) Read framework specs (rules/specs/framework/*.concept) this is the framework defined using itself.`,
            `3) Read tool spec (rules/specs/tools/${target}.concept) to understand the tool and tool rules spec (rules/specs/tools/${target}-rules.concept if present).`,
            `4) Read stack spec (compiler/specs/stacks/${stack}.concept if present) for route, engine, and test shapes.`,
            `5) Synthesize a generation plan that merges framework constraints, tool rules structure, and stack patterns.`,
            `6) Create the rules files in the correct location for the tool:`,
            ...targetLocation,
            ],
            "docs": [
                `1) Read the concept documentation (rules/docs/*) to understand the framework.`,
                `2) Use the web to research the best practices for ${target} and ${stack} to create the rules files.`,
                `3) Create the rules files in the correct location for the tool:`,
                ...targetLocation,
            ],
        };
        const body = [
            `# LLM Rule Creation Instructions`,
            `Your task is to create a set of rules for ${target} that explains how to design and implement concepts and synchronizations to build software using the ${stack} stack.`,
            ``,
            `## Task`,
            ...tasks[from],
            ``,
             `## Output`,
            `- Do not overwrite custom existing files; append a generated section if needed.`,
            `- Keep files thorough yet concise, deterministic, and idempotent.`,
            ``,
            `## Notes`,
            `- Do not link to other files e.g. docs - they might not exist.`,
            `- Queries are pure and return arrays; actions are single input/output maps.`,
        ].join("\n");
        fs.writeFileSync(file, body, "utf-8");
        return file;
    }

    #discoverDomainConcepts(specsDir: string): string[] {
        const names: string[] = [];
        const walk = (dir: string) => {
            for (const entry of fs.readdirSync(dir)) {
                const full = path.join(dir, entry);
                const st = fs.statSync(full);
                if (st.isDirectory()) {
                    // Skip framework/tools/stacks as they are compiler specs
                    if (/\b(framework|tools|stacks)\b/.test(full)) continue;
                    walk(full);
                } else if (entry.endsWith(".concept")) {
                    const txt = fs.readFileSync(full, "utf-8");
                    const m = txt.match(/\nconcept\s+([A-Za-z0-9_]+)/);
                    if (m) {
                        const name = m[1];
                        if (!names.includes(name)) names.push(name);
                    }
                }
            }
        };
        walk(specsDir);
        return names;
    }

    record(
        { compilation, path: filePath }: { compilation: string; path: string },
    ): { artifact: string } {
        const id = randomUUID();
        this.artifacts.set(id, { artifact: id, compilation, path: filePath });
        if (!this.artifactsByCompilation.has(compilation)) {
            this.artifactsByCompilation.set(compilation, new Set());
        }
        this.artifactsByCompilation.get(compilation)!.add(id);
        return { artifact: id };
    }

    _getArtifacts(
        { compilation }: { compilation: string },
    ): { path: string }[] {
        const ids = this.artifactsByCompilation.get(compilation) ?? new Set();
        return [...ids].map((id) => {
            const a = this.artifacts.get(id)!;
            return { path: a.path };
        });
    }

    /**
     * Generate rules with OpenAI integration
     */
    async generateRules(options: RulesGenerationOptions): Promise<{ success: boolean; files: string[]; error?: string }> {
        try {
            if (options.openaiApiKey) {
                this.openai = new OpenAI({ apiKey: options.openaiApiKey });
            }

            const prompt = this.generateRulesPrompt(options);
            
            if (!this.openai) {
                throw new Error('OpenAI API key required for rules generation');
            }

            const rulesContent = await this.callOpenAI(prompt, options.modelName || 'gpt-4');
            const files = await this.writeRulesFiles(rulesContent, options);

            return { success: true, files };
        } catch (error) {
            return { 
                success: false, 
                files: [], 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    /**
     * Generate the prompt for OpenAI
     */
    private generateRulesPrompt(options: RulesGenerationOptions): string {
        const { target, stack, from } = options;
        
        const toolTargets = [
            { name: "cursor", location: ".cursor/rules/", files: "multiple .md files", description: "Cursor IDE rules" },
            { name: "claude-code", location: "CLAUDE.md", files: "single workspace instruction file", description: "Claude for VSCode instructions" },
            { name: "windsurf", location: ".windsurf/rules/rules.md", files: "single rules file", description: "Windsurf AI IDE rules" },
            { name: "copilot", location: ".github/copilot-instructions.md", files: "single instruction file", description: "GitHub Copilot instructions" },
            { name: "codeium", location: ".codeium/instructions.md", files: "single instruction file", description: "Codeium AI instructions" },
            { name: "custom", location: "custom location", files: "custom format", description: "Custom AI tool rules" }
        ];

        const selectedTool = toolTargets.find(t => t.name === target);
        if (!selectedTool && target !== 'custom') {
            throw new Error(`Unsupported target tool: ${target}`);
        }

        const frameworkTasks = [
            `1) Read framework explanation to understand Concept Design methodology`,
            `2) Understand that concepts are single-purpose, independent modules`,
            `3) Learn that actions take single input/output objects with error handling`,
            `4) Learn that queries are pure functions returning arrays with underscore prefix`,
            `5) Understand that synchronizations connect concepts without direct dependencies`,
            `6) Create comprehensive rules for ${target} that explain how to implement concepts with ${stack}`
        ];

        const docsTasks = [
            `1) Research best practices for ${target} and ${stack}`,
            `2) Apply Concept Design principles to the stack`,
            `3) Create rules that guide developers on implementation patterns`,
            `4) Include specific examples for ${stack} integration`
        ];

        const tasks = from === "framework" ? frameworkTasks : docsTasks;

        return `# AI Tool Rules Generation Request

You are an expert in software architecture and development tooling. Create comprehensive rules for ${target} that explain how to design and implement software using the Concept Design methodology with the ${stack} stack.

## Target Tool
- **Tool**: ${target}
- **Location**: ${selectedTool?.location || options.targetDirectory}
- **Format**: ${selectedTool?.files || 'custom format'}
- **Description**: ${selectedTool?.description || 'Custom AI tool rules'}

## Stack
${stack}

## Concept Design Principles

### Core Concepts
- **Single Purpose**: Each concept serves exactly one purpose and solves one problem
- **Independence**: Concepts cannot import or reference other concepts directly
- **Reusability**: Concepts should be highly reusable across different applications
- **State Isolation**: Each concept manages its own state independently

### Actions
- Take exactly one input object and return one output object
- Errors are not special - they're just another output pattern with an 'error' key
- Must specify all possible outcomes and transitions
- Only actions can modify state or perform side-effects

### Queries
- Must be side-effect free and return arrays
- Must start with underscore '_' to distinguish from actions
- Always return arrays of objects to enable declarative composition
- Provide the only way to read concept state in synchronizations

### Synchronizations
- Connect concepts without creating direct dependencies
- Use when/then patterns to coordinate concept interactions
- Maintain concept independence through the sync engine

## Task
${tasks.map(task => `- ${task}`).join('\n')}

## Stack-Specific Requirements
${this.generateStackSpecificRequirements(stack)}

## Output Requirements

Generate rules that should be placed in the specified location with the following characteristics:

1. **Comprehensive Coverage**: Cover all aspects of Concept Design methodology
2. **Stack Integration**: Show how to integrate concepts with ${stack} patterns
3. **Practical Examples**: Include code examples for common patterns
4. **Best Practices**: Establish conventions for ${stack} + Concept Design
5. **Error Handling**: Standardize error handling patterns
6. **Testing Strategies**: Guide on testing concepts and synchronizations
7. **File Organization**: Recommend directory structure and naming conventions

## Format Instructions

${target === 'cursor' ? `Create multiple .md files:
- concept-design.md (core principles)
- ${stack}-integration.md (stack-specific patterns)
- development-workflow.md (step-by-step process)
- examples.md (code examples)
- testing.md (testing strategies)` : 
`Create a single comprehensive file that covers all aspects in organized sections.`}

## Key Points to Include

- How to structure projects using Concept Design with ${stack}
- Database integration patterns (if applicable)
- API route patterns for concept actions/queries
- Frontend component patterns (if applicable)
- Error handling conventions
- Testing approaches
- Development workflow recommendations
- Common anti-patterns to avoid

Generate comprehensive, production-ready rules that will help developers build high-quality software using Concept Design methodology with ${stack}.`;
    }

    /**
     * Generate stack-specific requirements
     */
    private generateStackSpecificRequirements(stack: string): string {
        const requirements: Record<string, string[]> = {
            'nextjs': [
                'API routes for concept actions and queries',
                'Server components and client components patterns',
                'Database integration (Prisma, MongoDB, etc.)',
                'Authentication and authorization patterns',
                'File-based routing conventions',
                'Middleware integration',
                'Static generation and server-side rendering'
            ],
            'nextjs-15': [
                'App Router patterns and conventions',
                'Server Actions integration with concepts',
                'React 19 features integration',
                'Turbopack optimization patterns',
                'New caching strategies'
            ],
            'sveltekit': [
                'Load functions for concept queries',
                'Form actions for concept actions',
                'Store patterns for concept state',
                'SSR and CSR integration',
                'Authentication hooks',
                'Database integration patterns'
            ],
            'node-express': [
                'Express middleware patterns',
                'Route organization for concepts',
                'Authentication middleware',
                'Error handling middleware',
                'Database connection patterns',
                'API versioning strategies'
            ]
        };

        const stackReqs = requirements[stack] || requirements['nextjs'];
        return stackReqs.map(req => `- ${req}`).join('\n');
    }

    /**
     * Call OpenAI API to generate rules
     */
    private async callOpenAI(prompt: string, modelName: string): Promise<string> {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }

        const response = await this.openai.chat.completions.create({
            model: modelName,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert in software architecture, development tooling, and AI-assisted development. Generate comprehensive, practical rules for development teams using Concept Design methodology.'
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

        return content;
    }

    /**
     * Write rules files to target directory
     */
    private async writeRulesFiles(content: string, options: RulesGenerationOptions): Promise<string[]> {
        const { target, targetDirectory } = options;
        const files: string[] = [];

        // Ensure target directory exists
        fs.mkdirSync(targetDirectory, { recursive: true });

        if (target === 'cursor') {
            // Parse multiple files for Cursor
            const parsedFiles = this.parseMultipleFiles(content);
            
            for (const [filename, fileContent] of Object.entries(parsedFiles)) {
                const filePath = path.join(targetDirectory, filename);
                fs.writeFileSync(filePath, fileContent, 'utf-8');
                files.push(filePath);
            }

            // Create index file
            const indexContent = this.generateIndexFile(Object.keys(parsedFiles));
            const indexPath = path.join(targetDirectory, 'README.md');
            fs.writeFileSync(indexPath, indexContent, 'utf-8');
            files.push(indexPath);
        } else {
            // Single file for other tools
            const filename = this.getFilenameForTool(target);
            const filePath = path.join(targetDirectory, filename);
            fs.writeFileSync(filePath, content, 'utf-8');
            files.push(filePath);
        }

        return files;
    }

    /**
     * Parse content into multiple files (for Cursor)
     */
    private parseMultipleFiles(content: string): { [filename: string]: string } {
        const files: { [filename: string]: string } = {};
        
        // Try to extract files based on markdown headers
        const filePattern = /^#\s+(.+\.md)[\r\n]+([\s\S]*?)(?=^#\s+.+\.md|$)/gm;
        let match;
        
        while ((match = filePattern.exec(content)) !== null) {
            const filename = match[1].trim();
            const fileContent = match[2].trim();
            files[filename] = fileContent;
        }
        
        // If no files were parsed, create default structure
        if (Object.keys(files).length === 0) {
            files['concept-design.md'] = content;
        }
        
        return files;
    }

    /**
     * Generate index file for multiple files
     */
    private generateIndexFile(filenames: string[]): string {
        return `# AI Development Rules

This directory contains AI development rules generated for this project using Concept Design methodology.

## Files

${filenames.map(filename => `- [${filename}](./${filename})`).join('\n')}

Generated on: ${new Date().toISOString()}

## Usage

These rules guide AI assistants in understanding and implementing the Concept Design methodology in this project. Each file covers specific aspects of the development process.
`;
    }

    /**
     * Get appropriate filename for different tools
     */
    private getFilenameForTool(tool: string): string {
        const filenames: Record<string, string> = {
            'claude-code': 'CLAUDE.md',
            'windsurf': 'rules.md',
            'copilot': 'copilot-instructions.md',
            'codeium': 'instructions.md',
            'custom': 'ai-rules.md'
        };

        return filenames[tool] || 'ai-rules.md';
    }

    /**
     * Get available tools
     */
    static getAvailableTools(): Array<{ name: string; label: string; description: string }> {
        return [
            { name: 'cursor', label: 'Cursor IDE', description: 'Multiple .md files in .cursor/rules/' },
            { name: 'claude-code', label: 'Claude for VSCode', description: 'Single CLAUDE.md file' },
            { name: 'windsurf', label: 'Windsurf AI IDE', description: 'Single rules.md in .windsurf/rules/' },
            { name: 'copilot', label: 'GitHub Copilot', description: 'Single file in .github/' },
            { name: 'codeium', label: 'Codeium AI', description: 'Single instructions.md file' },
            { name: 'custom', label: 'Custom Target', description: 'Custom location and format' }
        ];
    }

    /**
     * Get available stacks
     */
    static getAvailableStacks(): Array<{ name: string; label: string; description: string }> {
        return [
            { name: 'nextjs-15', label: 'Next.js 15+', description: 'Latest Next.js with App Router' },
            { name: 'nextjs-14', label: 'Next.js 14', description: 'Next.js 14 with App Router' },
            { name: 'nextjs', label: 'Next.js (General)', description: 'General Next.js patterns' },
            { name: 'sveltekit', label: 'SvelteKit', description: 'SvelteKit framework' },
            { name: 'node-express', label: 'Node.js + Express', description: 'Express.js backend' },
            { name: 'deno-fresh', label: 'Deno + Fresh', description: 'Deno with Fresh framework' },
            { name: 'bun-hono', label: 'Bun + Hono', description: 'Bun runtime with Hono framework' }
        ];
    }
}


function usage() {
    console.log(
        "Usage: tsx compile.ts <target> <stack>\n       or run without args for interactive mode",
    );
}

// 
async function main() {
    const tools = ["cursor", "claude-code", "windsurf", "copilot"] as const;
    const stacks = [
        "nextjs 15+",
        "nextjs 14",
        "sveltekit",
        "node-express",
        // "python-fastapi",
        // "rust-axum",
        // "go-fiber",
    ] as const;

    let [target, stack, from = "docs"] = process.argv.slice(2);
    if (!target || !stack || !from) {
        const rl = readline.createInterface({ input, output });
        try {
            const t = (await rl.question(
                `Select tool [${tools.join("/")}] (default: ${tools[0]}): `,
            )).trim().toLowerCase();
            target = tools.includes(t as any) ? t : tools[0];
            const s = (await rl.question(
                `Select stack [${stacks.join("/")}] (default: ${stacks[0]}): `,
            )).trim().toLowerCase();
            stack = stacks.includes(s as any) ? s : stacks[0];
            const f = (await rl.question(
                `Select from [framework/docs] (default: framework): `,
            )).trim().toLowerCase();
            from = f === "framework" || f === "docs" ? f : "framework";
            const confirm = (await rl.question(
                `Proceed with tool="${target}" stack="${stack}" from="${from}"? [Y/n]: `,
            )).trim().toLowerCase();
            if (confirm === "n" || confirm === "no") {
                console.log("Aborted by user.");
                process.exit(0);
            }
        } finally {
            await rl.close();
        }
    }

    // In the compiler workspace, specs live under ./compiler/specs relative to repo root
    const repoRoot = path.resolve(path.join(process.cwd()));
    const specsDir = path.join(repoRoot, "rules", "specs");
    // Output INSTRUCTIONS.md one level above compiler/ (top directory)
    const outDir = path.join(repoRoot);
    if (!fs.existsSync(specsDir)) {
        console.error(`Specs dir not found: ${specsDir}`);
        process.exit(1);
    }
    const Compiler = new CompilerConcept();
    const { compilation } = Compiler.compile({ target, stack, from: from as "framework" | "docs", specsDir, outDir });
    const artifacts = Compiler._getArtifacts({ compilation });
    console.log(JSON.stringify({ compilation, artifacts }, null, 2));
}

main();
