/**
 * Parser for .sync specification files
 */
export class SyncSpecParser {
    
    /**
     * Strip inline comments from a line
     * @param line The line to process
     * @returns The line with inline comments removed
     */
    private stripInlineComments(line: string): string {
        const commentIndex = line.indexOf('#');
        if (commentIndex >= 0) {
            return line.substring(0, commentIndex).trim();
        }
        return line;
    }
    
    /**
     * Parse a synchronization specification from text content
     */
    parseSyncSpec(content: string): SyncSpec {
        // Extract content from <sync_spec> wrapper
        const specMatch = content.match(/<sync_spec>([\s\S]*?)<\/sync_spec>/);
        const specContent = specMatch ? specMatch[1] : content;
        
        const lines = specContent.split('\n').map(line => line.trim());
        
        const spec: SyncSpec = {
            name: '',
            when: [],
            where: [],
            then: []
        };

        let currentSection = '';
        
        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = this.stripInlineComments(rawLine);
            
            // Skip empty lines and comments
            if (!line || line.startsWith('//') || line.startsWith('#')) continue;

            // Extract sync name from sync declaration
            if (line.startsWith('sync ')) {
                spec.name = line.substring(5).trim();
                continue;
            }

            // Section detection
            if (line === 'when') {
                currentSection = 'when';
                continue;
            }
            if (line === 'where') {
                currentSection = 'where';
                continue;
            }
            if (line === 'then') {
                currentSection = 'then';
                continue;
            }

            // Parse action patterns in when/then sections
            if ((currentSection === 'when' || currentSection === 'then') && line.includes('.')) {
                const action = this.parseActionPattern(line);
                if (action) {
                    if (currentSection === 'when') {
                        spec.when.push(action);
                    } else {
                        spec.then.push(action);
                    }
                }
            }

            // Parse where conditions
            if (currentSection === 'where' && line) {
                const condition = this.parseWhereCondition(line);
                if (condition) {
                    spec.where.push(condition);
                }
            }
        }

        return spec;
    }

    private parseActionPattern(line: string): SyncAction | null {
        // Parse patterns like: Concept.action (input: "pattern") : (output: variable)
        const actionMatch = line.match(/([A-Z]\w*)\.(\w+)\s*\(([^)]*)\)\s*:\s*\(([^)]*)\)/);
        if (actionMatch) {
            const [, concept, action, inputsStr, outputsStr] = actionMatch;
            return {
                concept,
                action,
                inputs: this.parseParameters(inputsStr),
                outputs: this.parseParameters(outputsStr)
            };
        }

        // Simple pattern: Concept.action (input: value)
        const simpleMatch = line.match(/([A-Z]\w*)\.(\w+)\s*\(([^)]*)\)/);
        if (simpleMatch) {
            const [, concept, action, inputsStr] = simpleMatch;
            return {
                concept,
                action,
                inputs: this.parseParameters(inputsStr),
                outputs: {}
            };
        }

        return null;
    }

    private parseWhereCondition(line: string): SyncCondition | null {
        // Parse condition expressions
        return {
            expression: line,
            variables: this.extractVariables(line)
        };
    }

    private parseParameters(params: string): Record<string, any> {
        const result: Record<string, any> = {};
        
        if (!params.trim()) return result;
        
        const pairs = params.split(',').map(p => p.trim());
        for (const pair of pairs) {
            const colonIndex = pair.indexOf(':');
            if (colonIndex > 0) {
                const name = pair.substring(0, colonIndex).trim();
                const value = pair.substring(colonIndex + 1).trim();
                result[name] = value.replace(/['"]/g, ''); // Remove quotes
            }
        }
        
        return result;
    }

    private extractVariables(expression: string): string[] {
        // Extract variable names from expressions
        const variables = expression.match(/\b[a-z][A-Za-z0-9_]*\b/g) || [];
        return [...new Set(variables)]; // Remove duplicates
    }
}

export interface SyncSpec {
    name: string;
    when: SyncAction[];
    where: SyncCondition[];
    then: SyncAction[];
}

export interface SyncAction {
    concept: string;
    action: string;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
}

export interface SyncCondition {
    expression: string;
    variables: string[];
}
