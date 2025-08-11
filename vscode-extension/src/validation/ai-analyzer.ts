/**
 * AI-Powered Analysis Engine
 * 
 * Uses OpenAI GPT-4 to perform intelligent comparison between concept
 * specifications and their TypeScript implementations.
 */

import OpenAI from 'openai/index.mjs';
import { AIAnalysisPrompt, AIAnalysisResponse, ConceptSpec, ConceptImplementation } from './types';

export class AIAnalyzer {
  private openai: OpenAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gpt-4') {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    this.modelName = modelName;
  }

  /**
   * Perform comprehensive AI analysis of concept alignment
   */
  async analyzeConceptAlignment(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    syncCode?: string
  ): Promise<AIAnalysisResponse> {
    
    const prompt = this.buildAnalysisPrompt(spec, implementation, syncCode);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI model');
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Analyze specific aspects of concept design
   */
  async analyzeSpecificAspect(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    aspect: 'purpose' | 'actions' | 'queries' | 'state' | 'independence'
  ): Promise<string> {
    
    const prompt = this.buildAspectPrompt(spec, implementation, aspect);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content: this.getAspectSystemPrompt(aspect)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      return response.choices[0]?.message?.content || 'Analysis failed';
    } catch (error) {
      console.error(`AI analysis failed for aspect ${aspect}:`, error);
      return `Failed to analyze ${aspect}`;
    }
  }

  private buildAnalysisPrompt(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    syncCode?: string
  ): string {
    return `
Please analyze the alignment between this concept specification and its TypeScript implementation:

## CONCEPT SPECIFICATION:
File: ${spec.file}
Name: ${spec.name}

Purpose: ${spec.purpose}

State:
${JSON.stringify(spec.state, null, 2)}

Actions:
${spec.actions.map(a => `- ${a.name}: ${a.signature}\n  Description: ${a.description}`).join('\n')}

Queries:
${spec.queries.map(q => `- ${q.name}: ${q.signature}\n  Description: ${q.description}`).join('\n')}

Operational Principle: ${spec.operationalPrinciple}

## TYPESCRIPT IMPLEMENTATION:
File: ${implementation.file}
Class: ${implementation.className}

Methods:
${implementation.methods.map(m => `- ${m.name}(${m.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): ${m.returnType}\n  Async: ${m.isAsync}, Query: ${m.isQuery}`).join('\n')}

Dependencies: ${implementation.dependencies.length > 0 ? implementation.dependencies.join(', ') : 'None'}

${syncCode ? `\n## SYNCHRONIZATION CODE:\n${syncCode}` : ''}

Please provide a detailed analysis in the following JSON format:
{
  "alignment": "excellent|good|fair|poor",
  "score": 0-100,
  "purposeAlignment": "description of how well the implementation serves the stated purpose",
  "implementationQuality": "assessment of code quality and concept design adherence",
  "issues": [
    {
      "type": "critical|major|minor",
      "description": "description of the issue",
      "suggestion": "how to fix it"
    }
  ],
  "suggestions": ["list of improvement suggestions"]
}
`;
  }

  private buildAspectPrompt(
    spec: ConceptSpec,
    implementation: ConceptImplementation,
    aspect: string
  ): string {
    switch (aspect) {
      case 'purpose':
        return `
Concept Purpose: ${spec.purpose}
Implementation Methods: ${implementation.methods.map(m => m.name).join(', ')}

Does the implementation effectively serve the stated purpose? Explain how each method contributes to or detracts from the purpose.
`;

      case 'actions':
        return `
Specified Actions:
${spec.actions.map(a => `- ${a.name}: ${a.signature}`).join('\n')}

Implemented Methods (non-queries):
${implementation.methods.filter(m => !m.isQuery).map(m => `- ${m.name}: ${m.returnType}`).join('\n')}

Are all specified actions implemented? Are there extra actions not in the spec? Do the signatures match?
`;

      case 'queries':
        return `
Specified Queries:
${spec.queries.map(q => `- ${q.name}: ${q.signature}`).join('\n')}

Implemented Queries:
${implementation.methods.filter(m => m.isQuery).map(m => `- ${m.name}: ${m.returnType}`).join('\n')}

Are all queries implemented with proper naming (underscore prefix)? Do they return arrays as required?
`;

      case 'state':
        return `
Specified State:
${JSON.stringify(spec.state, null, 2)}

Implementation Dependencies: ${implementation.dependencies.join(', ') || 'None'}

Does the implementation properly manage the specified state? Are there state dependencies that violate concept independence?
`;

      case 'independence':
        return `
Concept Dependencies: ${implementation.dependencies.join(', ') || 'None'}
Imports: ${implementation.imports.join(', ')}

Does this concept maintain independence? Are there violations of the concept design rule that concepts cannot import other concepts?
`;

      default:
        return 'Invalid aspect specified';
    }
  }

  private getSystemPrompt(): string {
    return `
You are an expert in Concept Design, a modular software architecture approach where applications are built from independent concepts connected by synchronizations.

Key Concept Design Principles:
1. Single Purpose: Each concept serves exactly one purpose
2. Independence: Concepts cannot import or reference other concepts
3. Reusability: Concepts should be highly reusable across applications
4. State Isolation: Each concept manages its own state independently

Action Rules:
- Take exactly one input object and return one output object
- Errors are not special - they're just another output pattern with an 'error' key
- Must specify all possible outcomes and transitions
- Only actions can modify state or perform side-effects

Query Rules:
- Must be side-effect free and return arrays
- Must start with underscore '_' to distinguish from actions
- Always return arrays of objects to enable declarative composition
- Provide the only way to read concept state in synchronizations

Your task is to analyze how well a TypeScript implementation aligns with its concept specification, identifying violations of these principles and suggesting improvements.
`;
  }

  private getAspectSystemPrompt(aspect: string): string {
    const basePrompt = 'You are an expert in Concept Design. ';
    
    switch (aspect) {
      case 'purpose':
        return basePrompt + 'Focus on whether the implementation effectively serves the stated concept purpose.';
      case 'actions':
        return basePrompt + 'Focus on action implementation completeness and signature correctness.';
      case 'queries':
        return basePrompt + 'Focus on query naming conventions and return type compliance.';
      case 'state':
        return basePrompt + 'Focus on state management and independence violations.';
      case 'independence':
        return basePrompt + 'Focus on concept independence and dependency violations.';
      default:
        return basePrompt;
    }
  }

  private parseAIResponse(content: string): AIAnalysisResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          alignment: parsed.alignment || 'fair',
          score: parsed.score || 50,
          purposeAlignment: parsed.purposeAlignment || 'No analysis provided',
          implementationQuality: parsed.implementationQuality || 'No analysis provided',
          issues: parsed.issues || [],
          suggestions: parsed.suggestions || []
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Fallback: parse as plain text
    return {
      alignment: 'fair',
      score: 50,
      purposeAlignment: content.substring(0, 200),
      implementationQuality: 'Unable to parse detailed analysis',
      issues: [],
      suggestions: []
    };
  }

  private getFallbackResponse(): AIAnalysisResponse {
    return {
      alignment: 'fair',
      score: 50,
      purposeAlignment: 'AI analysis unavailable',
      implementationQuality: 'AI analysis unavailable',
      issues: [],
      suggestions: ['Enable AI analysis by providing a valid OpenAI API key']
    };
  }

  /**
   * Generate improvement suggestions based on common patterns
   */
  generateImprovementSuggestions(
    spec: ConceptSpec,
    implementation: ConceptImplementation
  ): string[] {
    const suggestions: string[] = [];

    // Check for missing actions
    const implementedActions = implementation.methods.filter(m => !m.isQuery).map(m => m.name);
    const specActions = spec.actions.map(a => a.name);
    
    for (const action of specActions) {
      if (!implementedActions.includes(action)) {
        suggestions.push(`Implement missing action: ${action}`);
      }
    }

    // Check for missing queries
    const implementedQueries = implementation.methods.filter(m => m.isQuery).map(m => m.name);
    const specQueries = spec.queries.map(q => q.name);
    
    for (const query of specQueries) {
      if (!implementedQueries.includes(query)) {
        suggestions.push(`Implement missing query: ${query}`);
      }
    }

    // Check for proper error handling
    const actionsWithoutErrorReturns = implementation.methods.filter(m => 
      !m.isQuery && !m.returnType.includes('error')
    );
    
    if (actionsWithoutErrorReturns.length > 0) {
      suggestions.push('Consider adding error return types to actions for better error handling');
    }

    // Check for concept independence
    if (implementation.dependencies.length > 0) {
      suggestions.push('Remove dependencies on other concepts to maintain independence');
    }

    return suggestions;
  }
}
