# Concept Design Framework

A comprehensive development framework for building modular, maintainable applications using **Concept Design** methodology - where applications are built from independent concepts connected by synchronizations.

## 🎯 What is Concept Design?

Concept Design is a modular software architecture approach that emphasizes:

- **Single Purpose**: Each concept serves exactly one purpose and solves one problem
- **Independence**: Concepts cannot import or reference other concepts directly  
- **Reusability**: Concepts are highly reusable across different applications
- **State Isolation**: Each concept manages its own state independently
- **Synchronization**: Concepts interact through a sync engine without creating dependencies

## 📦 Repository Structure

This repository contains the complete Concept Design ecosystem:

### 1. 🧩 [VS Code Extension](./vscode-extension/) 
**Production-ready IDE tooling for Concept Design development**

- **AI Rules Generation**: Generate customized rules for Cursor, Claude, Windsurf, GitHub Copilot, and other AI tools
- **Schema Generation**: Auto-generate Prisma schemas from concept specifications
- **Code Generation**: Generate TypeScript implementations from `.concept` files
- **Comprehensive Validation**: AI-powered validation of specs and implementations
- **Language Support**: Syntax highlighting and IntelliSense for `.concept` and `.sync` files
- **Real-time Linting**: Live validation and error detection

**Key Features:**
- Multi-tool AI rule generation (not just Cursor!)
- Interactive UI for technology stack selection
- OpenAI integration for intelligent code analysis
- Database schema synchronization
- Complete validation pipeline with HTML reports

### 2. ⚙️ [Engine Library](./engine-library/)
**Core runtime engine for Concept Design applications**

Published as `@sonnenreich/concept-design-engine` - the foundational library that powers Concept Design applications.

- **Sync Engine**: Coordinates concept interactions through synchronizations
- **Database Integration**: Support for MongoDB, Prisma, and other databases  
- **Next.js Integration**: Seamless integration with Next.js App Router
- **Type Safety**: Full TypeScript support with strict typing
- **Action/Query System**: Standardized patterns for concept operations

**Key Components:**
- `SyncConcept`: Core synchronization engine
- Database adapters and connection management
- Next.js API route generation
- Frame-based reactive system

### 3. 📚 [Framework Documentation](./framework/)
**Core methodology and specification reference**

- **[Concept Design Guide](./framework/docs/concept-design.md)**: Complete methodology explanation
- **[Implementation Patterns](./framework/docs/concept-implementation.md)**: How to implement concepts in TypeScript
- **[State Specification](./framework/docs/concept-state-specification.md)**: Database and state management patterns
- **[Synchronization Guide](./framework/docs/synchronization-implementation.md)**: How to connect concepts

**Framework Specs:** Self-documenting framework defined using its own specification format
- Core concepts: `action.concept`, `query.concept`, `state.concept`
- Meta-concepts: `concept.concept`, `synchronization.concept`
- Operational patterns: `when.concept`, `then.concept`, `where.concept`

### 4. 🤖 [AI Rules Generator](./rules/) 
**Standalone generator for AI development rules**

Multi-tool rule generation system that creates customized development guidelines:

- **Supported Tools**: Cursor, Claude for VSCode, Windsurf, GitHub Copilot, Codeium
- **Technology Stacks**: Next.js 15+, SvelteKit, Node.js + Express, Deno + Fresh, Bun + Hono  
- **Smart Prompts**: Context-aware prompt generation for each tool/stack combination
- **Flexible Output**: Single-file or multi-file outputs based on tool requirements

**Usage:**
```bash
cd rules
npm install
npx tsx generate.ts cursor nextjs-15 framework
```

### 5. 🔍 [Validation Engine](./validation/)
**Standalone validation system for concept specifications**

AI-powered validation that ensures concept specifications align with TypeScript implementations:

- **Spec Validation**: Verify `.concept` files are well-formed and complete
- **Implementation Validation**: Check TypeScript implementations match specifications  
- **AI Analysis**: OpenAI GPT-4 powered semantic analysis
- **Multiple Output Formats**: Console, HTML, Markdown, and JSON reports
- **CLI Interface**: Command-line tool for CI/CD integration

**Usage:**
```bash
cd validation  
npm install
npx tsx cli.ts validate --ai --format html
```

### 6. 🧪 [Testing & Evaluation](./tests/)
**Comprehensive evaluation framework for testing AI-generated code**

Real-world application examples that test the complete Concept Design workflow:

#### Quizzie - Quiz Application
A complete Slido-inspired quiz application demonstrating:
- User authentication and management
- Quiz creation and editing
- Real-time quiz activation
- Full-stack Next.js implementation

**Evaluation Variants:**
- **[Claude-4](./tests/quizzie/claude-4/)**: Generated with Claude Sonnet 4
- **[GPT-5](./tests/quizzie/gpt5/)**: Generated with GPT-5
- **[Example](./tests/quizzie/example/)**: Reference implementation

Each variant includes:
- Complete `.concept` specifications
- TypeScript implementations  
- Synchronization definitions
- Working Next.js application
- Database schema and migrations

## 🚀 Quick Start

### For Developers Using Concept Design

1. **Install VS Code Extension**
   ```bash
   cd vscode-extension
   npm install && npm run compile
   npm run install-extension
   ```

2. **Install Engine Library**
   ```bash
   npm install @sonnenreich/concept-design-engine
   ```

3. **Generate AI Rules**
   - Open Command Palette in VS Code
   - Search "Generate AI Rules"
   - Select your AI tool and technology stack
   - Generated rules will guide your development

### For AI Tool Users

1. **Generate Rules for Your Tool**
   ```bash
   cd rules
   npm install
   npx tsx generate.ts <tool> <stack> framework
   ```

2. **Apply Rules to Your AI Assistant**
   - Copy generated rules to appropriate location
   - Use rules to guide Concept Design development

### For Framework Contributors

1. **Run Validation Tests**
   ```bash
   cd validation
   npm install
   npx tsx cli.ts validate --ai
   ```

2. **Test Code Generation**
   ```bash
   cd tests/quizzie/example
   npm install && npm run dev
   ```

## 🛠 Development Workflow

### 1. Design Phase
- Define concept purpose and boundaries
- Specify state using Simple State Form (SSF)
- Design actions (input/output patterns)
- Create queries for state access
- Write operational principle

### 2. Implementation Phase  
- Generate TypeScript skeleton from specs
- Implement concept actions and queries
- Set up database collections/tables
- Add validation and error handling

### 3. Integration Phase
- Design synchronizations between concepts
- Implement sync patterns
- Register concepts with engine
- Create API routes (Next.js)
- Build UI components

### 4. Validation Phase
- Run validation engine on specs and implementations
- Use AI analysis for semantic verification
- Generate validation reports
- Fix any alignment issues

## 🏗 Architecture Principles

### Concepts
- **Encapsulation**: All concept logic contained within the concept
- **Single Responsibility**: One concept = one problem domain
- **Interface Consistency**: Standardized action/query patterns
- **Database Independence**: Concepts work with any database

### Actions
- Take exactly one input object
- Return exactly one output object  
- Errors are structured outputs, not exceptions
- Side-effects only within concept boundaries

### Queries
- Pure functions with no side effects
- Always return arrays for composition
- Start with underscore `_` prefix
- Enable declarative data access

### Synchronizations
- Connect concepts without dependencies
- Use when/where/then patterns
- Maintain concept independence
- Enable complex workflows

## 📋 Use Cases

### Enterprise Applications
- **Modular Architecture**: Break complex systems into manageable concepts
- **Team Collaboration**: Independent concept development
- **Code Reuse**: Share concepts across projects
- **Maintainability**: Clear boundaries and responsibilities

### AI-Assisted Development
- **Consistent Patterns**: AI tools understand standardized patterns
- **Quality Assurance**: Validation ensures spec/implementation alignment
- **Rapid Prototyping**: Generate working code from specifications
- **Best Practices**: Built-in architectural guidance

### Educational Projects
- **Learning Architecture**: Understand modular design principles
- **Clear Examples**: Real-world applications demonstrate patterns
- **Progressive Complexity**: Start simple, add features incrementally
- **Documentation**: Comprehensive guides and examples

## 🎯 Technology Support

### Frontend Frameworks
- **Next.js 15+**: App Router, Server Actions, React 19
- **Next.js 14**: Established App Router patterns
- **SvelteKit**: Full-stack with load functions and form actions

### Backend Frameworks  
- **Node.js + Express**: Traditional server patterns
- **Deno + Fresh**: Modern runtime with edge deployment
- **Bun + Hono**: High-performance server applications

### Databases
- **MongoDB**: Document-based with TypeScript driver
- **PostgreSQL**: Relational with Prisma ORM
- **SQLite**: Lightweight with Prisma support
- **Supabase**: Hosted PostgreSQL with real-time features

### AI Development Tools
- **Cursor IDE**: Multi-file rules in `.cursor/rules/`
- **Claude for VSCode**: Workspace instructions in `CLAUDE.md`
- **Windsurf AI IDE**: Single rules file in `.windsurf/rules/`
- **GitHub Copilot**: Instructions in `.github/copilot-instructions.md`
- **Codeium**: Custom instructions in `.codeium/instructions.md`

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Install dependencies in each sub-project
3. Build the engine library first
4. Install and test the VS Code extension

### Testing
- Run validation tests on example projects
- Test code generation with different AI tools
- Verify generated applications work correctly
- Update documentation with new features

### Documentation
- Update guides when adding new features
- Include practical examples
- Test all code examples
- Keep architecture diagrams current

## 📄 License

This project is licensed under the MIT License - see individual LICENSE files in each sub-project for details.

## 🌟 Key Benefits

- **🧠 AI-Ready**: Purpose-built for AI-assisted development
- **🔧 Tool Agnostic**: Works with any AI development tool
- **📚 Well-Documented**: Comprehensive guides and examples
- **🎯 Production-Ready**: Battle-tested patterns and validation
- **🔄 Iterative**: Supports rapid development and refactoring
- **🤝 Team-Friendly**: Clear boundaries enable parallel development
- **📈 Scalable**: Patterns work from prototypes to enterprise applications

---

**Ready to build better software with Concept Design?** Start with the [VS Code Extension](./vscode-extension/) for the complete development experience, or explore the [Framework Documentation](./framework/) to understand the methodology.
