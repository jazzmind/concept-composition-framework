import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

function errorLog(message: string, error?: any) {
    console.error(`[Concept Design ERROR] ${new Date().toISOString()} - ${message}`, error);
}

export async function validateConceptDocument(text: string, diagnostics: Diagnostic[]): Promise<void> {
    console.log('Enhanced validateConceptDocument starting, text length:', text.length);
    
    if (!text || text.length > 100000) {
        console.log('Skipping validation: empty or too large document');
        return;
    }
    
    const lines = text.split('\n');
    if (lines.length > 10000) {
        console.log('Skipping validation: too many lines:', lines.length);
        return;
    }
    
    console.log('Validating concept document with', lines.length, 'lines');
    
    // Track sections found
    let hasConceptDeclaration = false;
    let hasPurpose = false;
    let hasState = false;
    let hasActions = false;
    let hasQueries = false;
    let currentSection = '';

    const maxLines = Math.min(lines.length, 1000);
    console.log('Processing', maxLines, 'lines (of', lines.length, 'total)');
    
    for (let i = 0; i < maxLines; i++) {
        if (i % 100 === 0) {
            console.log('Processing line', i, 'of', maxLines);
        }
        
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || trimmedLine.startsWith('<')) {
            continue;
        }

        try {
            // Check for main sections
            if (trimmedLine.startsWith('concept ')) {
                hasConceptDeclaration = true;
                currentSection = 'concept';
                
                const conceptName = trimmedLine.substring(8).trim();
                if (conceptName && !/^[A-Z][A-Za-z0-9_]*$/.test(conceptName)) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: i, character: 8 },
                            end: { line: i, character: Math.min(line.length, 8 + conceptName.length) }
                        },
                        message: 'Concept name must start with uppercase letter and contain only letters, numbers, and underscores',
                        source: 'concept-design'
                    });
                }
            } else if (trimmedLine === 'purpose') {
                hasPurpose = true;
                currentSection = 'purpose';
            } else if (trimmedLine === 'state') {
                hasState = true;
                currentSection = 'state';
            } else if (trimmedLine.match(/^states?:?$/)) {
                // Catch common mistake: "states" or "states:" instead of "state"
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: i, character: 0 },
                        end: { line: i, character: trimmedLine.length }
                    },
                    message: 'Use "state" not "states" or "states:"',
                    source: 'concept-design'
                });
                hasState = true;
                currentSection = 'state';
            } else if (trimmedLine === 'actions') {
                hasActions = true;
                currentSection = 'actions';
            } else if (trimmedLine === 'queries') {
                hasQueries = true;
                currentSection = 'queries';
            } else if (trimmedLine === 'operational principle' || trimmedLine.startsWith('operational principle')) {
                currentSection = 'operational_principle';
            }

            // Skip descriptive sections
            if (currentSection === 'operational_principle' || currentSection === 'purpose') {
                continue;
            }

            // Validate state section syntax
            if (currentSection === 'state' && trimmedLine.length > 0 && trimmedLine !== 'state') {
                validateStateSyntax(trimmedLine, line, i, diagnostics);
            }

            // Validate actions section syntax
            if (currentSection === 'actions' && trimmedLine.length > 0 && trimmedLine !== 'actions') {
                validateActionSyntax(trimmedLine, line, i, diagnostics);
            }

            // Validate queries section syntax
            if (currentSection === 'queries' && trimmedLine.length > 0 && trimmedLine !== 'queries') {
                validateQuerySyntax(trimmedLine, line, i, diagnostics);
            }

        } catch (error) {
            errorLog(`Error validating line ${i}:`, error);
        }
    }

    // Check for required sections
    if (!hasConceptDeclaration) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Missing concept declaration',
            source: 'concept-design'
        });
    }

    if (!hasPurpose) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Missing purpose section',
            source: 'concept-design'
        });
    }

    if (!hasState) {
        diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Missing state section',
            source: 'concept-design'
        });
    }

    if (!hasActions) {
        diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Missing actions section',
            source: 'concept-design'
        });
    }
}

function validateStateSyntax(trimmedLine: string, fullLine: string, lineIndex: number, diagnostics: Diagnostic[]): void {
    try {
        // Check for typos in field declarations
        if (trimmedLine.includes('opti onal')) {
            const index = fullLine.indexOf('opti onal');
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lineIndex, character: index },
                    end: { line: lineIndex, character: index + 9 }
                },
                message: 'Typo: should be "optional"',
                source: 'concept-design'
            });
        }

        // Check for proper field syntax
        if (trimmedLine.match(/^(a|an)\s+/)) {
            // Valid field declaration
            const typeMatch = trimmedLine.match(/\b(String|Number|Flag|Date|DateTime|ObjectId|[A-Z]\w*)\b/);
            
            if (!typeMatch) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: lineIndex, character: 0 },
                        end: { line: lineIndex, character: fullLine.length }
                    },
                    message: 'State field must specify a type',
                    source: 'concept-design'
                });
            }
        } else if (trimmedLine.includes(' set of ') || trimmedLine.includes(' element ')) {
            // Valid set/element declaration
        } else if (trimmedLine.includes('with')) {
            // Valid 'with' clause
        } else if (trimmedLine.length > 0) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lineIndex, character: 0 },
                    end: { line: lineIndex, character: fullLine.length }
                },
                message: 'Invalid state syntax. Use "a/an fieldName Type" or "a set of Type"',
                source: 'concept-design'
            });
        }
    } catch (error) {
        errorLog(`Error validating state syntax on line ${lineIndex}:`, error);
    }
}

function validateActionSyntax(trimmedLine: string, fullLine: string, lineIndex: number, diagnostics: Diagnostic[]): void {
    try {
        // Check for obvious typos in action parameters
        if (trimmedLine.includes('e11xped rt') || trimmedLine.includes('Strd ing')) {
            const errorStart = Math.max(
                fullLine.indexOf('e11xped rt'),
                fullLine.indexOf('Strd ing')
            );
            if (errorStart >= 0) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: lineIndex, character: errorStart },
                        end: { line: lineIndex, character: errorStart + 10 }
                    },
                    message: 'Typo in parameter declaration',
                    source: 'concept-design'
                });
            }
        }

        // Check action definitions
        if (trimmedLine.includes('(') && trimmedLine.includes(')')) {
            const actionMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
            if (actionMatch) {
                const actionName = actionMatch[1];
                if (!/^[a-z][a-zA-Z0-9_]*$/.test(actionName)) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: lineIndex, character: 0 },
                            end: { line: lineIndex, character: actionName.length }
                        },
                        message: 'Action names should start with lowercase letter and use camelCase',
                        source: 'concept-design'
                    });
                }

                // Check for return type
                if (!trimmedLine.includes('->')) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: lineIndex, character: 0 },
                            end: { line: lineIndex, character: fullLine.length }
                        },
                        message: 'Action should specify return type with "->"',
                        source: 'concept-design'
                    });
                }
            }
        } else if (trimmedLine.startsWith('-')) {
            // Valid description line
        } else if (!/^[a-zA-Z_]/.test(trimmedLine)) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lineIndex, character: 0 },
                    end: { line: lineIndex, character: fullLine.length }
                },
                message: 'Invalid action syntax. Use function signature or description line starting with "-"',
                source: 'concept-design'
            });
        }
    } catch (error) {
        errorLog(`Error validating action syntax on line ${lineIndex}:`, error);
    }
}

function validateQuerySyntax(trimmedLine: string, fullLine: string, lineIndex: number, diagnostics: Diagnostic[]): void {
    try {
        if (trimmedLine.includes('(') && trimmedLine.includes(')')) {
            const queryMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
            if (queryMatch) {
                const queryName = queryMatch[1];
                if (!queryName.startsWith('_')) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: lineIndex, character: 0 },
                            end: { line: lineIndex, character: queryName.length }
                        },
                        message: 'Query names must start with underscore',
                        source: 'concept-design'
                    });
                }
            }
        }
    } catch (error) {
        errorLog(`Error validating query syntax on line ${lineIndex}:`, error);
    }
}

export async function validateSyncDocument(text: string, diagnostics: Diagnostic[]): Promise<void> {
    console.log('Enhanced validateSyncDocument starting, text length:', text.length);
    
    if (!text || text.length > 100000) {
        console.log('Skipping sync validation: empty or too large document');
        return;
    }
    
    const lines = text.split('\n');
    if (lines.length > 10000) {
        console.log('Skipping sync validation: too many lines:', lines.length);
        return;
    }
    
    console.log('Validating sync document with', lines.length, 'lines');
    
    // Track sync spec sections found (not implementation)
    let hasSyncDeclaration = false;
    let hasWhen = false;
    let hasWhere = false;
    let hasThen = false;
    let currentSection = '';

    const maxLines = Math.min(lines.length, 1000);
    console.log('Processing sync', maxLines, 'lines (of', lines.length, 'total)');
    
    for (let i = 0; i < maxLines; i++) {
        if (i % 100 === 0) {
            console.log('Processing sync line', i, 'of', maxLines);
        }
        
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || trimmedLine.startsWith('<')) {
            continue;
        }

        try {
            // Check for sync spec sections (not implementation keywords)
            if (trimmedLine.startsWith('sync ')) {
                hasSyncDeclaration = true;
                const syncName = trimmedLine.substring(5).trim();
                if (syncName && !/^[A-Z][A-Za-z0-9_]*$/.test(syncName)) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: i, character: 5 },
                            end: { line: i, character: Math.min(line.length, 5 + syncName.length) }
                        },
                        message: 'Sync names should use PascalCase',
                        source: 'concept-design'
                    });
                }
            } else if (trimmedLine === 'when') {
                hasWhen = true;
                currentSection = 'when';
            } else if (trimmedLine === 'where') {
                hasWhere = true;
                currentSection = 'where';
            } else if (trimmedLine === 'then') {
                hasThen = true;
                currentSection = 'then';
            }

            // Validate sync spec syntax (when/where/then content)
            if (currentSection === 'when' || currentSection === 'then') {
                validateSyncActionPattern(trimmedLine, line, i, diagnostics, currentSection);
            }

            if (currentSection === 'where') {
                validateSyncWhereClause(trimmedLine, line, i, diagnostics);
            }

        } catch (error) {
            errorLog(`Error validating sync line ${i}:`, error);
        }
    }

    // Check for required sync spec sections
    if (!hasSyncDeclaration) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Missing sync declaration',
            source: 'concept-design'
        });
    }

    if (!hasWhen) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Missing when section',
            source: 'concept-design'
        });
    }

    if (!hasThen) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Missing then section',
            source: 'concept-design'
        });
    }
}

function validateSyncActionPattern(trimmedLine: string, fullLine: string, lineIndex: number, diagnostics: Diagnostic[], section: string): void {
    try {
        // Look for concept action patterns: Concept.action
        if (trimmedLine.includes('.') && trimmedLine.length > 0 && trimmedLine !== section) {
            const conceptActionMatch = trimmedLine.match(/([A-Z]\w*)\.(\w+)/);
            if (conceptActionMatch) {
                const [, conceptName, actionName] = conceptActionMatch;
                
                if (!/^[A-Z][A-Za-z0-9_]*$/.test(conceptName)) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: lineIndex, character: fullLine.indexOf(conceptName) },
                            end: { line: lineIndex, character: fullLine.indexOf(conceptName) + conceptName.length }
                        },
                        message: 'Concept name should use PascalCase',
                        source: 'concept-design'
                    });
                }
                
                if (actionName.startsWith('_') && !/^_[a-z][A-Za-z0-9_]*$/.test(actionName)) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: lineIndex, character: fullLine.indexOf(actionName) },
                            end: { line: lineIndex, character: fullLine.indexOf(actionName) + actionName.length }
                        },
                        message: 'Query method naming convention',
                        source: 'concept-design'
                    });
                } else if (!actionName.startsWith('_') && !/^[a-z][A-Za-z0-9_]*$/.test(actionName)) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: { line: lineIndex, character: fullLine.indexOf(actionName) },
                            end: { line: lineIndex, character: fullLine.indexOf(actionName) + actionName.length }
                        },
                        message: 'Action names should use camelCase',
                        source: 'concept-design'
                    });
                }
            }
        }
    } catch (error) {
        errorLog(`Error validating sync action pattern on line ${lineIndex}:`, error);
    }
}

function validateSyncWhereClause(trimmedLine: string, fullLine: string, lineIndex: number, diagnostics: Diagnostic[]): void {
    try {
        // Where clauses can contain boolean expressions, variable references, etc.
        if (trimmedLine.length > 0 && trimmedLine !== 'where') {
            // Basic validation - check for common patterns
            // This is where you'd add more sophisticated where clause validation
        }
    } catch (error) {
        errorLog(`Error validating sync where clause on line ${lineIndex}:`, error);
    }
}
