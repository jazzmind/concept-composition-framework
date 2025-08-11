import { SyncSpec, SyncAction, SyncCondition } from '../parsers/syncParser';

export class SyncCodeGenerator {
    
    /**
     * Generate TypeScript sync implementation from sync specification
     */
    generateSyncImplementation(syncSpec: SyncSpec, outputPath: string): string {
        let code = this.generateSyncImports(syncSpec);
        code += '\n\n';
        code += this.generateSyncFunction(syncSpec);
        
        return code;
    }

    /**
     * Generate sync implementation from sync name only (template mode)
     */
    generateSyncTemplate(syncName: string, outputPath: string): string {
        let code = this.generateSyncImports();
        code += '\n\n';
        code += this.generateSyncFunctionTemplate(syncName);
        
        return code;
    }

    private generateSyncImports(syncSpec?: SyncSpec): string {
        let imports = `import { actions, Frames, Vars } from '../engine/mod';`;
        
        if (syncSpec) {
            // Extract concept names from when/then actions
            const concepts = new Set<string>();
            [...syncSpec.when, ...syncSpec.then].forEach((action: SyncAction) => {
                if (action.concept) {
                    concepts.add(action.concept);
                }
            });
            
            if (concepts.size > 0) {
                imports += '\n// Import concept classes';
                for (const concept of concepts) {
                    imports += `\n// import { ${concept} } from '../concepts/${concept.toLowerCase()}';`;
                }
            }
        } else {
            imports += `
// Import concept classes as needed
// import { ConceptName } from '../concepts/conceptName';`;
        }
        
        return imports;
    }

    private generateSyncFunction(syncSpec: SyncSpec): string {
        const variables = this.extractVariables(syncSpec);
        const varsDestructure = variables.length > 0 ? `{ ${variables.join(', ')} }` : '{}';
        
        let code = `export const ${syncSpec.name} = (${varsDestructure}: Vars) => ({\n`;
        
        // Generate when clause
        code += '    when: actions(\n';
        for (const action of syncSpec.when) {
            code += `        [${action.concept}.${action.action}`;
            if (Object.keys(action.inputs).length > 0 || Object.keys(action.outputs).length > 0) {
                code += `, ${this.generateActionParams(action.inputs)}`;
                if (Object.keys(action.outputs).length > 0) {
                    code += `, ${this.generateActionParams(action.outputs)}`;
                }
            }
            code += '],\n';
        }
        code += '    ),\n';
        
        // Generate where clause if conditions exist
        if (syncSpec.where && syncSpec.where.length > 0) {
            code += '    where: (frames: Frames): Frames => {\n';
            code += '        return frames.filter(($) => {\n';
            for (const condition of syncSpec.where) {
                code += `            // ${condition.expression}\n`;
                code += '            return true; // TODO: Implement condition\n';
            }
            code += '        });\n';
            code += '    },\n';
        }
        
        // Generate then clause
        code += '    then: actions(\n';
        for (const action of syncSpec.then) {
            code += `        [${action.concept}.${action.action}`;
            if (Object.keys(action.inputs).length > 0) {
                code += `, ${this.generateActionParams(action.inputs)}`;
            }
            code += '],\n';
        }
        code += '    ),\n';
        
        code += '});';
        
        return code;
    }

    private generateSyncFunctionTemplate(syncName: string): string {
        return `export const ${syncName} = ({ input, output, variable }: Vars) => ({
    when: actions(
        // Define triggering action patterns
        // [Concept.action, { input: "pattern" }, { output: variable }],
    ),
    where: (frames: Frames): Frames => {
        // Add filtering and query logic
        return frames.filter(($) => {
            // Add your conditions here
            return true;
        });
    },
    then: actions(
        // Define consequent actions
        // [Concept.action, { input: variable }],
    ),
});`;
    }

    private extractVariables(syncSpec: SyncSpec): string[] {
        const variables = new Set<string>();
        
        // Extract from when/then action parameters
        [...syncSpec.when, ...syncSpec.then].forEach((action: SyncAction) => {
            Object.values(action.inputs).forEach(value => {
                if (typeof value === 'string' && /^[a-z][A-Za-z0-9_]*$/.test(value)) {
                    variables.add(value);
                }
            });
            Object.values(action.outputs).forEach(value => {
                if (typeof value === 'string' && /^[a-z][A-Za-z0-9_]*$/.test(value)) {
                    variables.add(value);
                }
            });
        });
        
        // Extract from where conditions
        if (syncSpec.where) {
            syncSpec.where.forEach((condition: SyncCondition) => {
                condition.variables.forEach((variable: string) => {
                    variables.add(variable);
                });
            });
        }
        
        return Array.from(variables);
    }

    private generateActionParams(params: Record<string, any>): string {
        if (Object.keys(params).length === 0) {
            return '{}';
        }
        
        const paramPairs = Object.entries(params).map(([key, value]) => {
            if (typeof value === 'string' && /^[a-z][A-Za-z0-9_]*$/.test(value)) {
                // Variable reference
                return `${key}: ${value}`;
            } else {
                // Literal value
                return `${key}: ${JSON.stringify(value)}`;
            }
        });
        
        return `{ ${paramPairs.join(', ')} }`;
    }

    /**
     * Generate a complete sync specification template
     */
    generateSyncSpecTemplate(syncName: string): string {
        return `<sync_spec>
sync ${syncName}

when
    Concept.action (input: value) : (output: variable)

where
    condition on variable

then
    OtherConcept.action (input: variable)
</sync_spec>`;
    }

    /**
     * Parse sync specification and generate TypeScript code
     */
    async generateFromSpec(specContent: string, outputPath: string): Promise<string> {
        const { SyncSpecParser } = await import('../parsers/syncParser');
        const parser = new SyncSpecParser();
        
        const syncSpec = parser.parseSyncSpec(specContent);
        
        if (syncSpec.name && (syncSpec.when.length > 0 || syncSpec.then.length > 0)) {
            return this.generateSyncImplementation(syncSpec, outputPath);
        } else {
            // If spec is incomplete, generate template
            const syncName = this.extractSyncNameFromSpec(specContent) || 'UnnamedSync';
            return this.generateSyncTemplate(syncName, outputPath);
        }
    }

    private extractSyncNameFromSpec(content: string): string | null {
        const match = content.match(/sync\s+(\w+)/);
        return match ? match[1] : null;
    }
}
