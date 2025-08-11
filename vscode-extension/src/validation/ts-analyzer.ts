/**
 * TypeScript Implementation Analyzer
 * 
 * Analyzes TypeScript concept implementation files to extract
 * class structures, methods, types, and dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConceptImplementation, ImplementationMethod, Parameter } from './types';

export class TypeScriptAnalyzer {
  
  /**
   * Analyze a TypeScript concept implementation file
   */
  async analyzeImplementationFile(filePath: string): Promise<ConceptImplementation> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const implementation: ConceptImplementation = {
      name: '',
      className: '',
      file: filePath,
      methods: [],
      imports: [],
      exports: [],
      dependencies: []
    };

    // Extract basic info
    implementation.name = this.extractConceptName(filePath);
    implementation.className = this.extractClassName(content);
    implementation.imports = this.extractImports(content);
    implementation.exports = this.extractExports(content);
    implementation.dependencies = this.extractDependencies(content);
    implementation.methods = this.extractMethods(content);

    return implementation;
  }

  /**
   * Analyze all TypeScript files in a directory
   */
  async analyzeConceptDirectory(dirPath: string): Promise<ConceptImplementation[]> {
    const files = await fs.promises.readdir(dirPath);
    const tsFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
    
    const implementations: ConceptImplementation[] = [];
    for (const file of tsFiles) {
      const fullPath = path.join(dirPath, file);
      try {
        const impl = await this.analyzeImplementationFile(fullPath);
        implementations.push(impl);
      } catch (error) {
        console.error(`Error analyzing ${fullPath}:`, error);
      }
    }
    
    return implementations;
  }

  private extractConceptName(filePath: string): string {
    const basename = path.basename(filePath, '.ts');
    // Convert kebab-case or snake_case to PascalCase
    return basename.split(/[-_]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join('');
  }

  private extractClassName(content: string): string {
    const classMatch = content.match(/export\s+class\s+(\w+)/);
    return classMatch ? classMatch[1] : '';
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))?\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    
    // Find export statements
    const exportRegex = /export\s+(?:(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)|(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+['"][^'"]+['"])/g;
    
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      if (match[1]) {
        exports.push(match[1]);
      }
    }
    
    return exports;
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Look for concept dependencies (should not exist according to concept design rules)
    const conceptImportRegex = /import\s+.*from\s+['"]\.\.?\/.*\/(\w+)['"]/g;
    
    let match;
    while ((match = conceptImportRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    
    return dependencies;
  }

  private extractMethods(content: string): ImplementationMethod[] {
    const methods: ImplementationMethod[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match method signatures
      const methodMatch = line.match(/(?:async\s+)?(\w+)\s*\(/);
      if (methodMatch && !line.includes('constructor') && !line.includes('private prisma')) {
        const method = this.parseMethod(content, i, methodMatch[1]);
        if (method) {
          methods.push(method);
        }
      }
    }
    
    return methods;
  }

  private parseMethod(content: string, startLine: number, methodName: string): ImplementationMethod | null {
    const lines = content.split('\n');
    const line = lines[startLine].trim();
    
    // Extract method signature
    const asyncMatch = line.includes('async');
    const isQuery = methodName.startsWith('_');
    
    // Parse parameters
    const parameters = this.parseParameters(line);
    
    // Parse return type
    const returnType = this.parseReturnType(line);
    
    // Extract method body
    const body = this.extractMethodBody(lines, startLine);
    
    return {
      name: methodName,
      isAsync: asyncMatch,
      parameters,
      returnType,
      body,
      isQuery,
      lineNumber: startLine + 1
    };
  }

  private parseParameters(methodSignature: string): Parameter[] {
    const parameters: Parameter[] = [];
    
    // Extract content between parentheses
    const paramMatch = methodSignature.match(/\(([^)]*)\)/);
    if (!paramMatch || !paramMatch[1].trim()) {
      return parameters;
    }
    
    const paramString = paramMatch[1];
    
    // Handle input parameter object pattern
    const inputMatch = paramString.match(/input:\s*\{([^}]*)\}/);
    if (inputMatch) {
      const inputProps = inputMatch[1];
      const props = inputProps.split(',').map(p => p.trim());
      
      for (const prop of props) {
        if (prop) {
          const [name, type] = prop.split(':').map(s => s.trim());
          if (name && type) {
            parameters.push({
              name,
              type: type.replace(/;$/, ''),
              optional: type.includes('?') || type.includes('undefined')
            });
          }
        }
      }
    } else {
      // Handle regular parameters
      const params = paramString.split(',').map(p => p.trim());
      for (const param of params) {
        if (param) {
          const [name, type] = param.split(':').map(s => s.trim());
          if (name && type) {
            parameters.push({
              name,
              type: type.replace(/;$/, ''),
              optional: name.includes('?') || type.includes('undefined')
            });
          }
        }
      }
    }
    
    return parameters;
  }

  private parseReturnType(methodSignature: string): string {
    const returnMatch = methodSignature.match(/:\s*Promise<([^>]+)>|:\s*([^{]+)(?:\s*\{|$)/);
    if (returnMatch) {
      return returnMatch[1] || returnMatch[2] || 'void';
    }
    return 'void';
  }

  private extractMethodBody(lines: string[], startLine: number): string {
    let braceCount = 0;
    let inMethod = false;
    const bodyLines: string[] = [];
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      // Count braces to find method boundaries
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          inMethod = true;
        } else if (char === '}') {
          braceCount--;
        }
      }
      
      if (inMethod) {
        bodyLines.push(line);
      }
      
      // Method ends when braces are balanced
      if (inMethod && braceCount === 0) {
        break;
      }
    }
    
    return bodyLines.join('\n');
  }

  /**
   * Check if implementation follows concept design patterns
   */
  validateImplementation(impl: ConceptImplementation): string[] {
    const issues: string[] = [];
    
    // Check for concept independence
    if (impl.dependencies.length > 0) {
      issues.push(`Concept has dependencies on other concepts: ${impl.dependencies.join(', ')}`);
    }
    
    // Check query naming convention
    const invalidQueries = impl.methods.filter(m => m.isQuery && !m.name.startsWith('_'));
    if (invalidQueries.length > 0) {
      issues.push(`Queries should start with underscore: ${invalidQueries.map(q => q.name).join(', ')}`);
    }
    
    // Check for proper error handling patterns
    const actionsWithoutErrorHandling = impl.methods.filter(m => 
      !m.isQuery && 
      !m.returnType.includes('error') && 
      !m.body.includes('try') && 
      !m.body.includes('catch')
    );
    
    if (actionsWithoutErrorHandling.length > 0) {
      issues.push(`Actions may be missing error handling: ${actionsWithoutErrorHandling.map(a => a.name).join(', ')}`);
    }
    
    // Check for async patterns
    const nonAsyncActions = impl.methods.filter(m => !m.isQuery && !m.isAsync);
    if (nonAsyncActions.length > 0) {
      issues.push(`Actions should typically be async: ${nonAsyncActions.map(a => a.name).join(', ')}`);
    }
    
    return issues;
  }

  /**
   * Extract method complexity metrics
   */
  analyzeMethodComplexity(method: ImplementationMethod): {
    lineCount: number;
    cyclomaticComplexity: number;
    dependencyCount: number;
  } {
    const lines = method.body.split('\n').filter(l => l.trim().length > 0);
    
    // Simple cyclomatic complexity - count decision points
    const decisionPoints = (method.body.match(/\b(if|else|while|for|switch|catch|&&|\|\|)\b/g) || []).length;
    
    // Count external dependencies (await calls, this.prisma, etc.)
    const dependencies = (method.body.match(/(?:await\s+|this\.)\w+/g) || []).length;
    
    return {
      lineCount: lines.length,
      cyclomaticComplexity: decisionPoints + 1, // +1 for the base path
      dependencyCount: dependencies
    };
  }
}
