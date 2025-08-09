# LLM Rule Creation Instructions
Your task is to create a set of rules for claude-code that explains how to design and implement concepts and synchronizations to build software using the nextjs stack.

## Task
1) Read the concept documentation (rules/docs/*) to understand the framework.
2) Use the web to research the best practices for claude-code and nextjs to create the rules files.
3) Create the rules files in the correct location for the tool:

CLAUDE.md (single workspace instruction file)



## Output
- Do not overwrite custom existing files; append a generated section if needed.
- Keep files thorough yet concise, deterministic, and idempotent.

## Notes
- Favor links to existing repo files over duplicating text.
- Queries are pure and return arrays; actions are single input/output maps.