/**
 * Concept Specification Parser
 * 
 * Parses .concept files to extract structured specifications including
 * purpose, state, actions, queries, and operational principles.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConceptSpec, ConceptAction, ConceptQuery } from './types';

export class ConceptSpecParser {
  
  /**
   * Parse a single .concept file
   */
  async parseConceptFile(filePath: string): Promise<ConceptSpec> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const spec: ConceptSpec = {
      name: '',
      purpose: '',
      state: {},
      actions: [],
      queries: [],
      operationalPrinciple: '',
      file: filePath
    };

    let currentSection: string | null = null;
    let currentContent: string[] = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Check for section headers
      if (trimmed.startsWith('concept ')) {
        spec.name = trimmed.substring(8).trim();
        continue;
      }
      
      if (trimmed === 'purpose') {
        // Process previous section if exists
        if (currentSection && currentContent.length > 0) {
          await this.processSection(spec, currentSection, currentContent);
        }
        currentSection = 'purpose';
        currentContent = [];
        continue;
      }
      
      if (trimmed === 'state') {
        // Process previous section if exists
        if (currentSection && currentContent.length > 0) {
          await this.processSection(spec, currentSection, currentContent);
        }
        currentSection = 'state';
        currentContent = [];
        continue;
      }
      
      if (trimmed === 'actions') {
        // Process previous section if exists
        if (currentSection && currentContent.length > 0) {
          await this.processSection(spec, currentSection, currentContent);
        }
        currentSection = 'actions';
        currentContent = [];
        continue;
      }
      
      if (trimmed === 'queries') {
        // Process previous section if exists
        if (currentSection && currentContent.length > 0) {
          await this.processSection(spec, currentSection, currentContent);
        }
        currentSection = 'queries';
        currentContent = [];
        continue;
      }
      
      if (trimmed === 'operational principle') {
        // Process previous section if exists
        if (currentSection && currentContent.length > 0) {
          await this.processSection(spec, currentSection, currentContent);
        }
        currentSection = 'operational_principle';
        currentContent = [];
        continue;
      }
      
      // Collect content for current section
      if (currentSection) {
        currentContent.push(line);
      }
    }
    
    // Process the last section
    if (currentSection && currentContent.length > 0) {
      await this.processSection(spec, currentSection, currentContent);
    }
    
    return spec;
  }

  /**
   * Parse all .concept files in a directory
   */
  async parseConceptDirectory(dirPath: string): Promise<ConceptSpec[]> {
    const files = await fs.promises.readdir(dirPath);
    const conceptFiles = files.filter(f => f.endsWith('.concept'));
    
    const specs: ConceptSpec[] = [];
    for (const file of conceptFiles) {
      const fullPath = path.join(dirPath, file);
      try {
        const spec = await this.parseConceptFile(fullPath);
        specs.push(spec);
      } catch (error) {
        console.error(`Error parsing ${fullPath}:`, error);
      }
    }
    
    return specs;
  }

  private async processSection(spec: ConceptSpec, section: string, content: string[]): Promise<void> {
    const text = content.join('\n');
    
    switch (section) {
      case 'purpose':
        spec.purpose = this.cleanText(text);
        break;
        
      case 'state':
        spec.state = this.parseState(text);
        break;
        
      case 'actions':
        spec.actions = this.parseActions(text);
        break;
        
      case 'queries':
        spec.queries = this.parseQueries(text);
        break;
        
      case 'operational_principle':
        spec.operationalPrinciple = this.cleanText(text);
        break;
    }
  }

  private cleanText(text: string): string {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(' ');
  }

  private parseState(text: string): Record<string, any> {
    const state: Record<string, any> = {};
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let currentEntity: string | null = null;
    
    for (const line of lines) {
      if (!line.includes(':') && !line.startsWith('#')) {
        // This might be an entity name
        currentEntity = line;
        state[currentEntity] = {};
      } else if (line.includes(':') && currentEntity) {
        // This is a property
        const [prop, type] = line.split(':').map(s => s.trim());
        const cleanProp = prop.replace(/^#\s*/, ''); // Remove comment markers
        state[currentEntity][cleanProp] = type;
      }
    }
    
    return state;
  }

  private parseActions(text: string): ConceptAction[] {
    return this.parseMethodsGeneric(text, false);
  }

  private parseQueries(text: string): ConceptQuery[] {
    return this.parseMethodsGeneric(text, true);
  }

  private parseMethodsGeneric(text: string, isQuery: boolean): ConceptAction[] {
    const methods: ConceptAction[] = [];
    const lines = text.split('\n');
    
    let currentMethod: ConceptAction | null = null;
    let currentDescription: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed) continue;
      
      // Check if this line looks like a method signature
      if (this.isMethodSignature(trimmed)) {
        // Save previous method if exists
        if (currentMethod) {
          currentMethod.description = currentDescription.join(' ').trim();
          methods.push(currentMethod);
        }
        
        // Parse new method
        currentMethod = this.parseMethodSignature(trimmed, i + 1);
        currentDescription = [];
      } else if (currentMethod && trimmed.startsWith('-')) {
        // This is part of the description
        currentDescription.push(trimmed.substring(1).trim());
      }
    }
    
    // Add the last method
    if (currentMethod) {
      currentMethod.description = currentDescription.join(' ').trim();
      methods.push(currentMethod);
    }
    
    return methods;
  }

  private isMethodSignature(line: string): boolean {
    // Look for pattern: methodName(params) -> returnType
    return line.includes('(') && line.includes(')') && (line.includes('->') || line.includes(':'));
  }

  private parseMethodSignature(signature: string, lineNumber: number): ConceptAction {
    const method: ConceptAction = {
      name: '',
      signature,
      inputs: {},
      outputs: {},
      description: '',
      lineNumber
    };

    // Extract method name
    const nameMatch = signature.match(/^(\w+)/);
    if (nameMatch) {
      method.name = nameMatch[1];
    }

    // Extract inputs (parameters in parentheses)
    const inputMatch = signature.match(/\(([^)]*)\)/);
    if (inputMatch) {
      const params = inputMatch[1];
      if (params.trim()) {
        const paramPairs = params.split(',').map(p => p.trim());
        for (const pair of paramPairs) {
          const [name, type] = pair.split(':').map(s => s.trim());
          if (name && type) {
            method.inputs[name] = type;
          }
        }
      }
    }

    // Extract outputs (after -> or |)
    const outputMatch = signature.match(/(?:->|:)\s*(.+)$/);
    if (outputMatch) {
      const outputs = outputMatch[1].trim();
      // Handle multiple return types separated by |
      const returnTypes = outputs.split('|').map(t => t.trim());
      
      for (let i = 0; i < returnTypes.length; i++) {
        const returnType = returnTypes[i];
        if (returnType.includes('{') && returnType.includes('}')) {
          // Parse object return type
          const objMatch = returnType.match(/\{([^}]*)\}/);
          if (objMatch) {
            const key = objMatch[1].trim() || `output${i}`;
            method.outputs[key] = returnType;
          }
        } else {
          method.outputs[`output${i}`] = returnType;
        }
      }
    }

    return method;
  }

  /**
   * Validate that a parsed spec has required components
   */
  validateSpec(spec: ConceptSpec): string[] {
    const errors: string[] = [];
    
    if (!spec.name) {
      errors.push('Concept name is missing');
    }
    
    if (!spec.purpose) {
      errors.push('Purpose is missing');
    }
    
    if (Object.keys(spec.state).length === 0) {
      errors.push('State specification is missing');
    }
    
    if (spec.actions.length === 0) {
      errors.push('No actions defined');
    }
    
    // Validate query naming convention
    for (const query of spec.queries) {
      if (!query.name.startsWith('_')) {
        errors.push(`Query '${query.name}' should start with underscore`);
      }
    }
    
    return errors;
  }
}
