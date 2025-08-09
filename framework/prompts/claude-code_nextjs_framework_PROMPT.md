# LLM Rule Creation Instructions
Your task is to create a set of rules for claude-code that explains how to design and implement concepts and synchronizations to build software using the nextjs stack.

## Task
1) Read framework explanation (rules/concept-design.md) to understand the framework.
2) Read framework specs (rules/specs/framework/*.concept) this is the framework defined using itself.
3) Read tool spec (rules/specs/tools/claude-code.concept) to understand the tool and tool rules spec (rules/specs/tools/claude-code-rules.concept if present).
4) Read stack spec (compiler/specs/stacks/nextjs.concept if present) for route, engine, and test shapes.
5) Synthesize a generation plan that merges framework constraints, tool rules structure, and stack patterns.
6) Create the rules files in the correct location for the tool:

CLAUDE.md (single workspace instruction file)



## Output
- Do not overwrite custom existing files; append a generated section if needed.
- Keep files thorough yet concise, deterministic, and idempotent.

## Notes
- Favor links to existing repo files over duplicating text.
- Queries are pure and return arrays; actions are single input/output maps.