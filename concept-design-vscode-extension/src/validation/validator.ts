/**
 * Basic validation for concept and sync specifications
 */
export class ConceptValidator {
    
    /**
     * Validate a concept specification
     */
    validateConcept(content: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const lines = content.split('\n');
        
        let hasConceptDeclaration = false;
        let hasPurpose = false;
        let hasState = false;
        let hasActions = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('concept ')) {
                hasConceptDeclaration = true;
                
                // Validate concept name
                const conceptName = line.substring(8).trim();
                if (!/^[A-Z][A-Za-z0-9_]*$/.test(conceptName)) {
                    issues.push({
                        type: 'error',
                        message: 'Invalid concept name format',
                        line: i + 1,
                        column: 8,
                        description: 'Concept names must start with uppercase letter'
                    });
                }
            }
            
            if (line === 'purpose') hasPurpose = true;
            if (line === 'state') hasState = true;
            if (line === 'actions') hasActions = true;
            
            // Validate query naming
            if (line.includes('(') && line.includes(')')) {
                const methodMatch = line.match(/^(\w+)\s*\(/);
                if (methodMatch) {
                    const methodName = methodMatch[1];
                    const currentSection = this.getCurrentSection(i, lines);
                    
                    if (currentSection === 'queries' && !methodName.startsWith('_')) {
                        issues.push({
                            type: 'error',
                            message: 'Query methods must start with underscore',
                            line: i + 1,
                            column: 0,
                            description: 'All query methods must be prefixed with underscore (_)'
                        });
                    }
                }
            }
            
            // Validate field types in state section
            if (line.includes(':')) {
                const currentSection = this.getCurrentSection(i, lines);
                if (currentSection === 'state') {
                    const [fieldName, fieldType] = line.split(':').map(s => s.trim());
                    
                    if (!/^[a-z][A-Za-z0-9_]*$/.test(fieldName)) {
                        issues.push({
                            type: 'warning',
                            message: 'Field name should start with lowercase letter',
                            line: i + 1,
                            column: 0,
                            description: 'Follow camelCase convention for field names'
                        });
                    }
                    
                    const validTypes = ['String', 'Number', 'Boolean', 'Date', 'DateTime', 'Flag', 'ObjectId', 'Object'];
                    const cleanType = fieldType.replace(/[\[\]?]/g, '').trim();
                    
                    if (!validTypes.includes(cleanType) && !/^[A-Z][A-Za-z0-9_]*$/.test(cleanType)) {
                        issues.push({
                            type: 'info',
                            message: 'Consider using standard types',
                            line: i + 1,
                            column: line.indexOf(fieldType),
                            description: `Standard types: ${validTypes.join(', ')}`
                        });
                    }
                }
            }
        }
        
        // Check required sections
        if (!hasConceptDeclaration) {
            issues.push({
                type: 'error',
                message: 'Missing concept declaration',
                line: 1,
                column: 0,
                description: 'Every concept file must start with "concept ConceptName"'
            });
        }
        
        if (!hasPurpose) {
            issues.push({
                type: 'warning',
                message: 'Missing purpose section',
                line: 1,
                column: 0,
                description: 'Consider adding a purpose section to document the concept\'s intent'
            });
        }
        
        if (!hasState) {
            issues.push({
                type: 'warning',
                message: 'Missing state section',
                line: 1,
                column: 0,
                description: 'Most concepts should define their state structure'
            });
        }
        
        if (!hasActions) {
            issues.push({
                type: 'warning',
                message: 'Missing actions section',
                line: 1,
                column: 0,
                description: 'Concepts typically need actions to modify state'
            });
        }
        
        return issues;
    }
    
    /**
     * Validate a sync specification
     */
    validateSync(content: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const lines = content.split('\n');
        
        let hasExport = false;
        let hasWhen = false;
        let hasThen = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.includes('export')) hasExport = true;
            if (line.includes('when:')) hasWhen = true;
            if (line.includes('then:')) hasThen = true;
            
            // Validate concept action references
            const conceptActionMatch = line.match(/([A-Z]\w*)\.(\w+)/);
            if (conceptActionMatch) {
                const [, conceptName, actionName] = conceptActionMatch;
                
                if (!/^[A-Z][A-Za-z0-9_]*$/.test(conceptName)) {
                    issues.push({
                        type: 'warning',
                        message: 'Concept name should start with uppercase letter',
                        line: i + 1,
                        column: line.indexOf(conceptName),
                        description: 'Follow PascalCase convention for concept names'
                    });
                }
                
                if (actionName.startsWith('_') && !/^_[a-z][A-Za-z0-9_]*$/.test(actionName)) {
                    issues.push({
                        type: 'warning',
                        message: 'Query method naming convention',
                        line: i + 1,
                        column: line.indexOf(actionName),
                        description: 'Query methods should start with underscore followed by lowercase letter'
                    });
                }
            }
        }
        
        if (!hasExport) {
            issues.push({
                type: 'warning',
                message: 'Sync should export a function',
                line: 1,
                column: 0,
                description: 'Synchronizations should be exported for registration'
            });
        }
        
        if (!hasWhen) {
            issues.push({
                type: 'warning',
                message: 'Missing when clause',
                line: 1,
                column: 0,
                description: 'Synchronizations should specify triggering conditions'
            });
        }
        
        if (!hasThen) {
            issues.push({
                type: 'warning',
                message: 'Missing then clause',
                line: 1,
                column: 0,
                description: 'Synchronizations should specify consequent actions'
            });
        }
        
        return issues;
    }
    
    private getCurrentSection(lineIndex: number, lines: string[]): string {
        for (let i = lineIndex; i >= 0; i--) {
            const line = lines[i].trim();
            if (line === 'purpose') return 'purpose';
            if (line === 'state') return 'state';
            if (line === 'actions') return 'actions';
            if (line === 'queries') return 'queries';
            if (line === 'operational principle') return 'operational';
        }
        return 'unknown';
    }
}

export interface ValidationIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    line: number;
    column: number;
    description: string;
}
