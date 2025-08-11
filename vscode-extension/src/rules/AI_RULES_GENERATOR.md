# AI Rules Generator - Updated System

## Overview

The AI rules generator has been refactored to be more flexible and support multiple AI tools and technology stacks. Instead of being hardcoded for Cursor rules only, it now supports various AI development tools and can be customized for different target directories.

## Changes Made

### 1. Abstracted Rules Generator (`rulesGenerator.ts`)

**New Features:**
- **Multi-tool Support**: Now supports Cursor, Claude for VSCode, Windsurf, GitHub Copilot, Codeium, and custom targets
- **Stack Selection**: Comprehensive list of technology stacks (Next.js 15+, SvelteKit, Node.js + Express, etc.)
- **OpenAI Integration**: Direct OpenAI API integration with configurable models
- **Flexible Output**: Automatically handles single-file vs multi-file output based on target tool
- **Smart Prompts**: Generated prompts are specific to the selected tool and stack combination

**Core Methods:**
- `generateRules()`: Main method that orchestrates the entire generation process
- `generateRulesPrompt()`: Creates comprehensive prompts tailored to tool/stack combination
- `callOpenAI()`: Handles OpenAI API communication
- `writeRulesFiles()`: Manages file output based on tool requirements
- `getAvailableTools()`: Static method returning supported AI tools
- `getAvailableStacks()`: Static method returning supported technology stacks

### 2. Updated VS Code Command (`commands.ts`)

**Enhanced User Experience:**
- **Interactive Selection**: Step-by-step UI for tool, stack, and directory selection
- **Smart Defaults**: Recommends appropriate directories based on selected tool
- **Custom Targets**: Support for custom directories and file formats
- **Progress Feedback**: Detailed logging and user feedback throughout the process
- **File Opening**: Automatically opens generated rules for immediate review

**Selection Flow:**
1. Tool Selection (Cursor, Claude, Windsurf, etc.)
2. Stack Selection (Next.js, SvelteKit, Node.js, etc.)
3. Target Directory (with smart defaults)
4. Generation Source (Framework specs vs Documentation)
5. Generation and file creation

## Supported Tools

### Cursor IDE
- **Location**: `.cursor/rules/`
- **Format**: Multiple `.md` files
- **Files**: `concept-design.md`, `{stack}-integration.md`, `development-workflow.md`, `examples.md`, `testing.md`

### Claude for VSCode
- **Location**: Workspace root
- **Format**: Single `CLAUDE.md` file
- **Content**: Comprehensive workspace instructions

### Windsurf AI IDE
- **Location**: `.windsurf/rules/`
- **Format**: Single `rules.md` file
- **Content**: Integrated development rules

### GitHub Copilot
- **Location**: `.github/`
- **Format**: Single `copilot-instructions.md` file
- **Content**: Copilot-specific guidance

### Codeium AI
- **Location**: `.codeium/`
- **Format**: Single `instructions.md` file
- **Content**: Codeium development guidance

### Custom Target
- **Location**: User-specified
- **Format**: Configurable
- **Content**: Flexible format for other AI tools

## Supported Stacks

### Web Frameworks
- **Next.js 15+**: Latest features with App Router, Server Actions, React 19
- **Next.js 14**: App Router patterns with established practices
- **Next.js (General)**: Framework-agnostic Next.js patterns
- **SvelteKit**: Full-stack SvelteKit with load functions and form actions

### Backend Frameworks
- **Node.js + Express**: Traditional Express.js server patterns
- **Deno + Fresh**: Modern Deno runtime with Fresh framework
- **Bun + Hono**: High-performance Bun runtime with Hono framework

## Generated Content Features

### Comprehensive Coverage
- **Concept Design Principles**: Core methodology explanation
- **Stack Integration**: Specific patterns for chosen technology
- **Development Workflow**: Step-by-step development process
- **Code Examples**: Practical implementation examples
- **Testing Strategies**: Testing approaches for concepts and syncs
- **Error Handling**: Standardized error patterns
- **Best Practices**: Tool and stack-specific recommendations

### Concept Design Integration
- **Single Purpose**: Each concept serves one clear purpose
- **Independence**: No direct concept-to-concept dependencies
- **Actions**: Single input/output with error handling
- **Queries**: Pure functions returning arrays with underscore prefix
- **Synchronizations**: Coordinate concepts through the sync engine

### Stack-Specific Patterns
- **API Routes**: How to expose concept actions/queries as endpoints
- **Database Integration**: Patterns for Prisma, MongoDB, etc.
- **Authentication**: Security patterns for the chosen stack
- **Frontend Components**: UI patterns that work with concept queries
- **File Organization**: Recommended project structure

## Usage

### Command Palette
1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Search for "Generate AI Rules"
3. Follow the interactive prompts:
   - Select target AI tool
   - Choose technology stack
   - Specify target directory
   - Select generation source
4. Rules are generated and opened automatically

### Configuration
```json
{
  "conceptDesign.openai.apiKey": "your-api-key",
  "conceptDesign.openai.model": "gpt-4"
}
```

### Output
- Rules files are created in the appropriate location for the selected tool
- Progress is logged in the "Concept Design Tools" output channel
- Main rules file opens automatically for review
- Success notification shows number of files created

## Benefits

### For Developers
- **Tool Flexibility**: Not locked into any specific AI tool
- **Stack Awareness**: Rules are tailored to your technology choices
- **Consistent Patterns**: Standardized approach across projects
- **Quick Setup**: Automated rule generation saves time

### For Teams
- **Standardization**: Everyone uses the same concept design patterns
- **Onboarding**: New team members get clear development guidelines
- **Quality**: AI assistance follows established best practices
- **Flexibility**: Support for different tools and preferences

### For Projects
- **Architecture Consistency**: Maintains concept design principles
- **Documentation**: Self-documenting development patterns
- **Maintainability**: Clear rules for future development
- **Scalability**: Patterns that work from small to large projects

## Technical Implementation

### Error Handling
- Graceful fallback when API calls fail
- Clear error messages with actionable suggestions
- Validation of inputs and configurations
- Rollback capabilities for failed generations

### Performance
- Efficient OpenAI API usage with appropriate token limits
- Caching of tool and stack information
- Minimal file system operations
- Progress feedback for long-running operations

### Extensibility
- Easy to add new AI tools by updating the tool registry
- Stack additions require minimal code changes
- Customizable prompt templates for different use cases
- Pluggable output formatters for new file formats

## Future Enhancements

### Planned Features
- **Template Customization**: User-defined prompt templates
- **Batch Generation**: Generate rules for multiple projects
- **Version Management**: Track and update rules over time
- **Integration Testing**: Validate generated rules against real projects

### Potential Integrations
- **CI/CD Integration**: Generate rules as part of build process
- **Project Templates**: Include rules in project scaffolding
- **Team Sharing**: Share and synchronize rules across team members
- **Analytics**: Track rule effectiveness and usage patterns

This updated system provides a much more flexible and powerful way to generate AI development rules that are specifically tailored to your tool choices and technology stack while maintaining the core principles of Concept Design methodology.
