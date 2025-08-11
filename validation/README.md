# Concept Validation Engine

An AI-powered system for validating alignment between concept specifications (`.concept` files) and their TypeScript implementations. This engine analyzes adherence to concept design principles and identifies implementation issues.

## Features

- **Specification Parsing**: Extracts structured data from `.concept` files
- **TypeScript Analysis**: Analyzes concept implementation classes and methods
- **AI-Powered Comparison**: Uses OpenAI GPT-4 for intelligent alignment analysis
- **Multiple Report Formats**: Console, HTML, Markdown, and JSON outputs
- **Issue Detection**: Identifies missing actions/queries, signature mismatches, and design violations
- **Synchronization Analysis**: Validates sync files for concept interactions

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Configuration

```bash
npm run validate:init
```

This creates `concept-validation.config.json` with default settings.

### 3. Run Basic Validation

```bash
npm run validate
```

### 4. Run with AI Analysis

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Run validation with AI analysis
npm run validate:ai
```

### 5. Generate HTML Report

```bash
npm run validate:html
```

## Configuration

The validation engine uses `concept-validation.config.json`:

```json
{
  "openaiApiKey": "",
  "modelName": "gpt-4", 
  "projectRoot": ".",
  "specDir": "specs",
  "conceptDir": "concepts",
  "syncDir": "syncs",
  "includeAiAnalysis": false,
  "strictMode": false
}
```

### Configuration Options

- `openaiApiKey`: OpenAI API key for AI analysis (can use environment variable)
- `modelName`: AI model to use (default: "gpt-4")
- `projectRoot`: Root directory of the project
- `specDir`: Directory containing `.concept` files
- `conceptDir`: Directory containing TypeScript implementations
- `syncDir`: Directory containing synchronization files
- `includeAiAnalysis`: Enable AI-powered analysis
- `strictMode`: Enable stricter validation rules

## CLI Usage

### Validate All Concepts

```bash
# Basic validation
npm run validate

# With AI analysis
npm run validate -- --ai --api-key YOUR_KEY

# Specific output format
npm run validate -- --format html --output ./reports

# Validate specific concept
npm run validate -- --concept Team
```

### Available Formats

- `console`: Colored terminal output (default)
- `html`: Rich HTML report with styling
- `markdown`: Markdown format for documentation
- `json`: Structured data export
- `all`: Generate all formats

### CLI Options

```bash
concept-validator validate [options]

Options:
  -c, --config <path>     Path to configuration file
  -p, --project <path>    Project root directory
  -s, --specs <path>      Specs directory relative to project root
  -i, --concepts <path>   Concepts directory relative to project root
  -y, --syncs <path>      Syncs directory relative to project root
  -o, --output <path>     Output directory for reports
  -f, --format <type>     Output format (console|html|markdown|json|all)
  --ai                    Enable AI-powered analysis
  --api-key <key>         OpenAI API key for AI analysis
  --model <name>          AI model to use
  --strict                Enable strict validation mode
  --concept <name>        Validate specific concept only
  -v, --verbose           Verbose output
```

## Validation Categories

The engine detects various types of alignment issues:

### Error Level Issues

- **missing_action**: Actions specified but not implemented
- **missing_query**: Queries specified but not implemented
- **return_type_mismatch**: Query doesn't return array as required
- **naming_convention**: Query doesn't start with underscore

### Warning Level Issues

- **signature_mismatch**: Method signature doesn't match specification
- **missing_error_handling**: Action lacks proper error handling
- **concept_independence**: Concept imports other concepts (violates independence)
- **state_mismatch**: Implementation doesn't match specified state

### Info Level Issues

- **purpose_alignment**: Implementation may not serve stated purpose effectively
- **operational_principle_violation**: Code doesn't follow operational principle

## AI Analysis

When enabled, the AI analysis provides:

- **Purpose Alignment Assessment**: How well the implementation serves the concept's purpose
- **Implementation Quality Review**: Code quality and adherence to concept design principles
- **Specific Issue Detection**: AI identifies subtle alignment issues
- **Improvement Suggestions**: Actionable recommendations

### AI Analysis Example

```typescript
// Enable AI analysis in code
import { validateProject } from './engine/validation';

await validateProject('.', {
  includeAI: true,
  apiKey: process.env.OPENAI_API_KEY,
  outputFormat: 'html',
  outputPath: './validation-report.html'
});
```

## Report Formats

### Console Output

```
🔍 Concept Validation Report
══════════════════════════════════════════════════════

📊 Overall Summary:
   Concepts analyzed: 8
   ❌ Errors: 2
   ⚠️ Warnings: 5
   ℹ️ Info: 3
   📈 Average Score: 78.5/100

📦 Team
   Score: 85/100
   Spec: Team.concept
   Impl: team.ts
   Syncs: api-teams.ts

   ❌ Errors:
     • Missing query: _getTeamStats (team.ts:617)
       💡 Implement the '_getTeamStats' method

   ⚠️ Warnings:
     • Action 'addStudent' may lack error handling (team.ts:65)
       💡 Add error handling and return {error: string} for failure cases
```

### HTML Report

Rich, interactive HTML reports with:
- Color-coded issue severity
- File navigation links
- Expandable issue details
- Summary statistics
- AI analysis sections

### JSON Export

Structured data for integration with other tools:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "conceptsAnalyzed": 8,
    "totalErrors": 2,
    "totalWarnings": 5,
    "averageScore": 78.5
  },
  "reports": [...]
}
```

## Integration

### Programmatic Usage

```typescript
import { ValidationEngine, ValidationReporter } from './engine/validation';

const config = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4',
  projectRoot: '.',
  specDir: 'specs',
  conceptDir: 'concepts',
  syncDir: 'syncs',
  includeAiAnalysis: true,
  strictMode: false
};

const engine = new ValidationEngine(config);
const reporter = new ValidationReporter();

// Validate all concepts
const reports = await engine.validateAllConcepts();

// Generate console report
reporter.generateConsoleReport(reports);

// Generate HTML report
await reporter.generateHtmlReport(reports, './report.html');
```

### CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Validate Concepts
  run: |
    npm run validate
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    
- name: Generate Validation Report
  run: |
    npm run validate:html -- --output ./reports
    
- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: validation-reports
    path: ./reports/
```

## Architecture

The validation engine consists of several components:

1. **ConceptSpecParser**: Parses `.concept` files into structured specifications
2. **TypeScriptAnalyzer**: Analyzes TypeScript implementation files
3. **AIAnalyzer**: Performs intelligent comparison using OpenAI GPT-4
4. **ValidationEngine**: Orchestrates the validation process
5. **ValidationReporter**: Generates reports in multiple formats

## Concept Design Rules

The validator enforces these concept design principles:

- **Single Purpose**: Each concept serves exactly one purpose
- **Independence**: Concepts cannot import or reference other concepts
- **Actions**: Take one input object, return one output object, handle errors
- **Queries**: Start with `_`, return arrays, are side-effect free
- **State Isolation**: Each concept manages its own state independently

## Troubleshooting

### Common Issues

1. **"No concepts found"**: Check that `specDir` and `conceptDir` paths are correct
2. **"AI analysis failed"**: Verify OpenAI API key is valid and has credits
3. **"Parse error"**: Check `.concept` file syntax matches expected format
4. **"No matching implementation"**: Ensure concept names match between spec and TypeScript files

### Debug Mode

Run with verbose output to see detailed processing:

```bash
npm run validate -- --verbose
```

### Environment Variables

```bash
# Required for AI analysis
OPENAI_API_KEY=your-openai-api-key

# Optional: Custom model
OPENAI_MODEL=gpt-4

# Optional: Debug logging
DEBUG=validation:*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all validation rules pass
5. Submit a pull request

## License

This validation engine is part of the concept design framework and follows the same licensing terms as the main project.
