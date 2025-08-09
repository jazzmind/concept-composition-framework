# Concept Design Framework Generator

This repository contains a meta-framework for generating instruction prompts and rules that help AI assistants build applications using **Concept Design** - a modular approach where applications are built from independent concepts connected by synchronizations.

## Quick Start

1. **Generate Framework Instructions**
   ```bash
   npm run setup
   ```

2. **Use Generated Prompts**
   - Find generated prompts in `framework/prompts/`
   - Apply these prompts to your AI assistant (Claude, GPT, etc.)

3. **Build Your Application**
   - AI assistant will generate rules in `framework/output/`
   - Use these rules to build concept-based applications

## How It Works

### 1. Setup Phase (`setup.ts`)

The setup script generates framework instruction prompts by:

- Reading the core concept design documentation from `framework/docs/`
- Reading framework specifications from `framework/specs/`
- Creating targeted prompts for different AI tools and stacks
- Outputting prompts to `framework/prompts/`

**Generated Prompts:**
- `claude-code_nextjs_docs_PROMPT.md` - For Claude with Next.js stack
- `claude-code_nextjs_framework_PROMPT.md` - Framework-based Claude instructions
- `cursor_nextjs_docs_PROMPT.md` - For Cursor IDE with Next.js

### 2. Prompt Application Phase

Take the generated prompts and apply them to your AI assistant:

1. **For Claude/ChatGPT**: Copy the prompt content and provide it as system instructions
2. **For Cursor**: The prompts include instructions for placing rules in `.cursor/rules/`

The AI will then generate comprehensive rules and documentation in `framework/output/`.

### 3. Application Building Phase

With the generated rules, you can now prompt the AI to build applications following Concept Design principles:

```
Build a Slido-inspired quiz application with the following features:
- Users can create quizzes with multiple choice questions
- Real-time voting and results display
- QR code sharing for audience participation
```

The AI will create:
- **Concept Specifications** (`specs/*.concept`)
- **TypeScript Implementations** (`concepts/*.ts`) 
- **Synchronizations** (`syncs/*.ts`)
- **Next.js Application** (`app/`, `lib/`, etc.)

## Example: Quizzie Application

The `quizzie/` folder contains complete examples of applications built using this framework:

### Example Structure
```
quizzie/
├── example/           # Reference implementation
├── claude-4/          # Built with Claude-4
├── gpt5/             # Built with GPT-5
└── prompt/           # Original specification with images
```

### Key Components

**Concept Specifications** (`specs/`):
- `User.concept` - User management
- `Quiz.concept` - Quiz and question management  
- `Activation.concept` - Live voting sessions
- `API.concept` - HTTP request handling

**TypeScript Implementations** (`concepts/`):
- Each concept as an independent class
- MongoDB persistence layer
- Pure query functions (prefixed with `_`)
- Error handling with structured responses

**Synchronizations** (`syncs/`):
- Connect API requests to domain actions
- Declarative flow-based composition
- Frame processing for data enrichment

**Next.js Application**:
- Generic API routes that proxy to concepts
- React components for quiz management
- Real-time voting interface with QR codes

## Core Principles

### Concepts
- **Single Purpose**: Each concept solves exactly one problem
- **Independence**: Concepts cannot import or reference each other
- **Reusability**: Highly reusable across different applications
- **State Isolation**: Each concept manages its own state independently

### Actions & Queries
- **Actions**: Single input/output, can modify state, handle side effects
- **Queries**: Pure functions, prefixed with `_`, return arrays, no side effects
- **Error Handling**: Return `{ error: string }` objects, don't throw exceptions

### Synchronizations
- **Flow-Based**: Actions share flow tokens for causal grouping
- **Declarative**: `when` (conditions) → `where` (filtering) → `then` (actions)
- **Reactive**: Automatically trigger when conditions are met

## Development Workflow

1. **Design Phase**
   - Define concept purposes and operational principles
   - Specify state using Simple State Form (SSF)
   - Design actions with complete input/output patterns

2. **Implementation Phase**
   - Create TypeScript concept classes
   - Set up MongoDB collections and indexes
   - Implement actions and pure query functions

3. **Integration Phase**
   - Design synchronizations between concepts
   - Register with sync engine for reactivity
   - Create API routes and UI components

4. **Testing Phase**
   - Test concepts independently
   - Verify synchronizations with realistic data flows
   - End-to-end testing of complete user workflows

## File Structure

```
├── framework/
│   ├── docs/           # Core documentation
│   ├── specs/          # Framework specifications
│   ├── prompts/        # Generated instruction prompts
│   └── output/         # Generated rules and documentation
├── quizzie/            # Example applications
├── engine/             # Synchronization engine
├── setup.ts            # Prompt generation script
└── README.md           # This file
```

## Getting Started with Your Own App

1. **Run Setup**
   ```bash
   npm run setup
   ```

2. **Choose Your AI Assistant**
   - **Claude**: Use `framework/prompts/claude-code_nextjs_framework_PROMPT.md`
   - **Cursor**: Use `framework/prompts/cursor_nextjs_docs_PROMPT.md`

3. **Apply Prompt**
   - Provide the prompt content to your AI assistant
   - Ask it to generate rules in `framework/output/`

4. **Build Your Application**
   ```
   Build a [your app description] with the following features:
   - [Feature 1]
   - [Feature 2]
   - [Feature 3]
   ```

5. **Follow Generated Structure**
   - The AI will create `specs/`, `concepts/`, `syncs/`, and app files
   - Use `npm run api` for development with auth bypass
   - Test concepts individually before integration

## Key Benefits

- **Modular Architecture**: Independent, reusable concepts
- **Declarative Synchronizations**: Clear flow-based composition
- **Type Safety**: Full TypeScript support with strict typing
- **Real-time Reactivity**: Automatic synchronization between concepts
- **Database Agnostic**: MongoDB with clean abstraction layer
- **Framework Agnostic**: Works with Next.js, Express, SvelteKit, etc.

## Examples and References

- **Quizzie Apps**: See `quizzie/` for complete implementations
- **Framework Specs**: See `framework/specs/` for formal specifications  
- **Generated Rules**: See `framework/output/` for AI-generated documentation
- **Core Docs**: See `framework/docs/` for design principles

## Contributing

1. Update core documentation in `framework/docs/`
2. Modify framework specifications in `framework/specs/`
3. Run `npm run setup` to regenerate prompts
4. Test with example applications
5. Update this README as needed

---

*This meta-framework enables AI assistants to understand and apply Concept Design principles effectively, resulting in maintainable, modular applications with clear separation of concerns.*
