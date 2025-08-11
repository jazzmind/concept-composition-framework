/**
 * Parser for .concept specification files
 */
export class ConceptSpecParser {
    
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
     * Parse a concept specification from text content
     */
    parseConceptSpec(content: string): ConceptSpec {
        // Extract content from <concept_spec> wrapper
        const specMatch = content.match(/<concept_spec>([\s\S]*?)<\/concept_spec>/);
        const specContent = specMatch ? specMatch[1] : content;
        
        const lines = specContent.split('\n').map(line => line.trim());
        
        const spec: ConceptSpec = {
            name: '',
            purpose: '',
            state: {},
            actions: [],
            queries: [],
            operationalPrinciple: ''
        };

        let currentSection = '';
        let currentEntity = '';
        
        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = this.stripInlineComments(rawLine);
            
            // Skip empty lines and full-line comments
            if (!line || line.startsWith('//')) continue;
            
            if (line.startsWith('concept ')) {
                spec.name = line.substring(8).trim();
                continue;
            }

            // Section headers
            if (line === 'purpose') {
                currentSection = 'purpose';
                continue;
            }
            if (line === 'state') {
                currentSection = 'state';
                continue;
            }
            if (line === 'actions') {
                currentSection = 'actions';
                continue;
            }
            if (line === 'queries') {
                currentSection = 'queries';
                continue;
            }
            if (line === 'operational principle') {
                currentSection = 'operational';
                continue;
            }

            // Process section content
            if (currentSection === 'purpose' && line && !line.startsWith(' ')) {
                spec.purpose = line;
            }

            if (currentSection === 'state') {
                currentEntity = this.parseStateSection(line, spec, currentEntity);
            }

            if (currentSection === 'actions') {
                this.parseActionSection(line, spec, i);
            }

            if (currentSection === 'queries') {
                this.parseQuerySection(line, spec, i);
            }

            if (currentSection === 'operational') {
                if (line) {
                    spec.operationalPrinciple += (spec.operationalPrinciple ? ' ' : '') + line;
                }
            }
        }

        return spec;
    }

    private parseStateSection(line: string, spec: ConceptSpec, currentEntity: string): string {
        // Entity definition (not indented, no colon)
        if (line && !line.includes(':') && /^[A-Z][A-Za-z0-9_]*$/.test(line)) {
            currentEntity = line;
            spec.state[currentEntity] = {};
        }
        
        // Field definition (contains colon)
        if (line.includes(':') && currentEntity) {
            const [fieldName, fieldType] = line.split(':').map(s => s.trim());
            // fieldType already has inline comments stripped by caller
            spec.state[currentEntity][fieldName] = fieldType;
        }
        
        return currentEntity;
    }

    private parseActionSection(line: string, spec: ConceptSpec, lineNumber: number): void {
        if (line.includes('(') && line.includes(')')) {
            const action = this.parseMethodSignature(line, lineNumber, false);
            if (action) {
                spec.actions.push(action);
            }
        }
    }

    private parseQuerySection(line: string, spec: ConceptSpec, lineNumber: number): void {
        if (line.includes('(') && line.includes(')')) {
            const query = this.parseMethodSignature(line, lineNumber, true);
            if (query) {
                spec.queries.push(query);
            }
        }
    }

    private parseMethodSignature(line: string, lineNumber: number, isQuery: boolean): ConceptAction | null {
        // Parse method signature: methodName (input: Type) : (output: Type)
        const match = line.match(/^(\w+)\s*\(([^)]*)\)\s*:\s*(.+)$/);
        if (!match) return null;

        const [, name, inputsStr, outputsStr] = match;
        
        return {
            name,
            signature: line,
            inputs: this.parseParameters(inputsStr),
            outputs: this.parseParameters(outputsStr.replace(/[\[\]()]/g, '')),
            description: '',
            lineNumber
        };
    }

    private parseParameters(params: string): Record<string, string> {
        const result: Record<string, string> = {};
        
        if (!params.trim()) return result;
        
        const pairs = params.split(',').map(p => p.trim());
        for (const pair of pairs) {
            const [name, type] = pair.split(':').map(s => s.trim());
            if (name && type) {
                result[name] = type;
            }
        }
        
        return result;
    }
}

export interface ConceptSpec {
    name: string;
    purpose: string;
    state: Record<string, Record<string, string>>;
    actions: ConceptAction[];
    queries: ConceptAction[];
    operationalPrinciple: string;
}

export interface ConceptAction {
    name: string;
    signature: string;
    inputs: Record<string, string>;
    outputs: Record<string, string>;
    description: string;
    lineNumber?: number;
}
