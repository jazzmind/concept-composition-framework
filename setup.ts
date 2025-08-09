import { uuid } from "./framework/engine/util";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export interface CompilationRecord {
    compilation: string;
    target: string;
    stack: string;
    specsDir: string;
    outDir: string;
    status: string;
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

    compile(
        { target, stack, from, specsDir, outDir }: {
            target: string;
            stack: string;
            from: "framework" | "docs";
            specsDir: string;
            outDir: string;
        },
    ): { compilation: string } {
        const id = uuid();
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
            `- Favor links to existing repo files over duplicating text.`,
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
        const id = uuid();
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
        "nextjs",
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
