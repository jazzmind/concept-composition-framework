# Concept Design Tools

A VS Code extension that provides comprehensive development tools for Concept Design applications, including linting, validation, schema generation, and code generation.

## Features

### 🔍 Intelligent Linting
- Real-time syntax validation for `.concept` and `.sync` files
- Concept design principle enforcement
- Naming convention checking
- Type validation

### 🤖 AI-Powered Validation
- Alignment analysis between specifications and implementations
- OpenAI GPT-4 powered code quality assessment
- Detailed validation reports with actionable suggestions

### ⚡ Code Generation
- Automatic TypeScript implementation generation from concept specs
- Support for both MongoDB and PostgreSQL/Prisma backends
- Synchronization code scaffolding

### 🛠️ Schema Management
- Prisma schema generation from concept specifications
- Support for Simple State Form (SSF) syntax
- Automatic type mapping and relationship handling

### 📝 Language Support
- Syntax highlighting for `.concept` and `.sync` files
- IntelliSense auto-completion
- Hover documentation
- Code formatting

## Installation

1. Install from VS Code Marketplace (coming soon)
2. Or install from VSIX:
   ```bash
   code --install-extension concept-design-tools-0.1.0.vsix
   ```

## Quick Start

1. **Configure the extension**:
   - Open VS Code settings (`Ctrl+,`)
   - Search for "Concept Design"
   - Set your OpenAI API key for AI validation (optional)
   - Configure directory paths for your project

2. **Create a concept**:
   - Create a new `.concept` file
   - Use auto-completion to scaffold the structure:
   ```
   <concept_spec>
   concept User

   purpose
       to associate identifying information with individuals

   state
       User
           name: String
           email: String

   actions
       register (name: String, email: String) : (user: String)
           create a new user with the given name and email
   </concept_spec>
   ```

3. **Generate implementation**:
   - Right-click in the explorer or use Command Palette
   - Run "Concept Design: Generate TypeScript Code"
   - Generated TypeScript files will appear in your configured directories

4. **Validate alignment**:
   - Use "Concept Design: Validate Concept Alignment"
   - For AI-powered analysis: "Concept Design: Validate Concept Alignment (with AI)"

## Configuration

### Basic Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `conceptDesign.directories.specs` | `specs` | Directory containing `.concept` files |
| `conceptDesign.directories.concepts` | `concepts` | Directory for TypeScript implementations |
| `conceptDesign.directories.syncs` | `syncs` | Directory for synchronization files |
| `conceptDesign.directories.schema` | `prisma/schema.prisma` | Path to Prisma schema file |

### AI Features

| Setting | Default | Description |
|---------|---------|-------------|
| `conceptDesign.openaiApiKey` | `""` | OpenAI API key for AI analysis |
| `conceptDesign.validation.includeAIAnalysis` | `false` | Enable AI-powered validation |

### Code Generation

| Setting | Default | Description |
|---------|---------|-------------|
| `conceptDesign.codeGeneration.overwriteExisting` | `false` | Allow overwriting existing files |
| `conceptDesign.codeGeneration.useMongoDb` | `false` | Generate MongoDB code instead of Prisma |

## Commands

| Command | Description |
|---------|-------------|
| `Concept Design: Generate Schema` | Generate Prisma schema from concept specs |
| `Concept Design: Validate Concepts` | Validate concept-implementation alignment |
| `Concept Design: Validate Concepts (with AI)` | AI-powered validation analysis |
| `Concept Design: Generate Code` | Generate TypeScript implementations |
| `Concept Design: Open Validation Report` | Open the last validation report |

## File Types

### `.concept` Files
Concept specifications using Simple State Form (SSF):

```
<concept_spec>
concept ConceptName

purpose
    description of what this concept does

state
    EntityName
        field: Type
        optional: Type?
        array: [Type]

actions
    actionName (input: Type) : (output: Type)
        description of what this action does

queries
    _queryName (input: Type) : [output: Type]
        description of what this query returns
</concept_spec>
```

### `.sync` Files
Synchronization specifications connecting concepts:

```
<sync_spec>
sync SyncName

when
    Concept.action (input: "pattern") : (output: variable)

where
    condition on variable

then
    OtherConcept.action (input: variable)
</sync_spec>
```

## Validation Features

### Error Detection
- Missing concept declarations
- Invalid naming conventions
- Type mismatches
- Missing required sections

### Warning Detection
- Missing implementations
- Unconventional patterns
- Potential design issues

### AI Analysis
- Purpose alignment assessment
- Implementation quality review
- Specific improvement suggestions
- Design pattern recommendations

## Integration

### With Existing Projects
The extension automatically detects:
- `generate-schema.js` scripts in your project
- Validation engines in `validation/` directories
- Concept design framework patterns

### With CI/CD
Configure validation in your pipeline:
```yaml
- name: Validate Concepts
  run: |
    npm install -g concept-design-tools
    concept-design validate --format json --output ./reports
```

## Troubleshooting

### Common Issues

**Extension not activating**
- Ensure you have `.concept` or `.sync` files in your workspace
- Check the Output panel for error messages

**AI validation not working**
- Verify your OpenAI API key is set correctly
- Check your internet connection
- Ensure you have API credits available

**Code generation fails**
- Check directory permissions
- Verify your concept specifications are valid
- Look at the Output panel for detailed error messages

### Getting Help

1. Check the [GitHub issues](https://github.com/concept-design/vscode-extension/issues)
2. Join our [Discord community](https://discord.gg/concept-design)
3. Read the [Concept Design documentation](https://concept-design.org/docs)

## Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Changelog

### 0.1.0
- Initial release
- Basic linting and validation
- Code generation support
- AI-powered analysis
- Schema generation
