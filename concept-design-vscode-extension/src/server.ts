import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
    DocumentDiagnosticReportKind,
    type DocumentDiagnosticReport
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { ConceptSpecParser } from './parsers/conceptParser';
import { SyncSpecParser } from './parsers/syncParser';
import { ConceptValidator } from './validation/validator';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

// Initialize parsers and validators
const conceptParser = new ConceptSpecParser();
const syncParser = new SyncSpecParser();
const validator = new ConceptValidator();

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.', ':', ' ', '(', ')']
            },
            diagnosticProvider: {
                interFileDependencies: false,
                workspaceDiagnostics: false
            }
        }
    };

    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }

    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// Document change handler
documents.onDidChangeContent(change => {
    // Add safety check to prevent crashes
    if (change.document && change.document.uri) {
        validateTextDocument(change.document);
    }
});

// Handle diagnostic requests
connection.languages.diagnostics.on(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (document !== undefined) {
        return {
            kind: DocumentDiagnosticReportKind.Full,
            items: await getDiagnostics(document)
        } satisfies DocumentDiagnosticReport;
    } else {
        return {
            kind: DocumentDiagnosticReportKind.Full,
            items: []
        } satisfies DocumentDiagnosticReport;
    }
});

async function getDiagnostics(textDocument: TextDocument): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    
    try {
        // Add timeout protection to prevent infinite loops
        const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error('Validation timeout')), 5000); // 5 second timeout
        });
        
        const validationPromise = (async () => {
            if (textDocument.languageId === 'concept') {
                await validateConceptDocument(textDocument.getText(), diagnostics);
            } else if (textDocument.languageId === 'sync') {
                await validateSyncDocument(textDocument.getText(), diagnostics);
            }
        })();
        
        // Race the validation against the timeout
        await Promise.race([validationPromise, timeoutPromise]);
        
    } catch (error) {
        // Log error but don't crash
        connection.console.error(`Diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Clear any partial diagnostics that might cause issues
        diagnostics.length = 0;
        
        // Add a diagnostic about the error instead of crashing
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 1 }
            },
            message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            source: 'concept-design'
        });
    }
    
    return diagnostics;
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    try {
        const diagnostics = await getDiagnostics(textDocument);
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    } catch (error) {
        // Log the error but don't crash VS Code
        connection.console.error(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Send empty diagnostics to clear any previous ones
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
    }
}

async function validateConceptDocument(text: string, diagnostics: Diagnostic[]): Promise<void> {
    if (!text || text.length > 100000) {
        return; // Don't validate empty documents or extremely large ones
    }
    
    const lines = text.split('\n');
    if (lines.length > 10000) {
        return; // Don't validate files with too many lines
    }
    
    // Basic validation rules for .concept files
    let hasConceptDeclaration = false;
    let hasPurpose = false;
    let hasState = false;
    let hasActions = false;
    let currentSection = '';
    let indentLevel = 0;

    for (let i = 0; i < lines.length && i < 5000; i++) { // Add upper bound to prevent infinite loops
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
            continue;
        }

        // Check for main sections
        if (trimmedLine.startsWith('concept ')) {
            hasConceptDeclaration = true;
            currentSection = 'concept';
            // Validate concept name format
            try {
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
            } catch (error) {
                // Skip validation if there's an error parsing the concept name
                connection.console.warn(`Error validating concept name on line ${i}: ${error}`);
            }
        } else if (trimmedLine === 'purpose') {
            hasPurpose = true;
            currentSection = 'purpose';
        } else if (trimmedLine === 'state') {
            hasState = true;
            currentSection = 'state';
        } else if (trimmedLine === 'actions') {
            hasActions = true;
            currentSection = 'actions';
        } else if (trimmedLine === 'queries') {
            currentSection = 'queries';
        } else if (trimmedLine === 'operational principle') {
            currentSection = 'operational';
            continue; // Skip validation for the header itself and subsequent content
        }

        // Skip validation for descriptive sections (they contain free-form text)
        if (currentSection === 'operational' || currentSection === 'purpose') {
            continue; // Skip all validation for descriptive content
        }

        // Validate indentation in state section
        if (currentSection === 'state' && line.length > 0) {
            const lineIndent = line.length - line.trimStart().length;
            
            // Entity definitions should not be indented
            if (lineIndent === 0 && trimmedLine !== 'state' && !trimmedLine.includes(':')) {
                // Check if it's a valid entity name
                try {
                    if (trimmedLine && !/^[A-Z][A-Za-z0-9_]*$/.test(trimmedLine)) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Warning,
                            range: {
                                start: { line: i, character: 0 },
                                end: { line: i, character: Math.min(line.length, trimmedLine.length) }
                            },
                            message: 'Entity names should start with uppercase letter',
                            source: 'concept-design'
                        });
                    }
                } catch (error) {
                    // Skip validation if there's an error
                    connection.console.warn(`Error validating entity name on line ${i}: ${error}`);
                }
            }
            
            // Field definitions should be indented
            if (lineIndent > 0 && trimmedLine.includes(':')) {
                try {
                    const fieldMatch = trimmedLine.match(/^(\w+):\s*(.+)/);
                    if (fieldMatch) {
                        const [, fieldName, fieldType] = fieldMatch;
                        
                        // Only validate if we have valid field name and type
                        if (!fieldName || !fieldType) {
                            continue;
                        }
                        
                        // Validate field name format
                        try {
                            if (!/^[a-z][A-Za-z0-9_]*$/.test(fieldName)) {
                                diagnostics.push({
                                    severity: DiagnosticSeverity.Warning,
                                    range: {
                                        start: { line: i, character: lineIndent },
                                        end: { line: i, character: lineIndent + fieldName.length }
                                    },
                                    message: 'Field names should start with lowercase letter',
                                    source: 'concept-design'
                                });
                            }
                        } catch (error) {
                            connection.console.warn(`Error validating field name on line ${i}: ${error}`);
                        }
                        
                        // Validate field type - but skip if original line had comments
                        const originalLine = lines[i];
                        const hasComment = originalLine.includes('#');
                        
                        if (!hasComment) {
                            try {
                                // Calculate field type position safely
                                const colonIndex = trimmedLine.indexOf(':');
                                const afterColon = colonIndex >= 0 ? trimmedLine.substring(colonIndex + 1).trimStart() : '';
                                const fieldTypeStartOffset = colonIndex >= 0 ? colonIndex + 1 + (trimmedLine.substring(colonIndex + 1).length - afterColon.length) : 0;
                                
                                // Check for common issues first
                                if (fieldType.startsWith('[') && fieldType.endsWith(']')) {
                                    const innerType = fieldType.slice(1, -1);
                                    if (innerType) { // Prevent empty inner types
                                        diagnostics.push({
                                            severity: DiagnosticSeverity.Warning,
                                            range: {
                                                start: { line: i, character: fieldTypeStartOffset },
                                                end: { line: i, character: fieldTypeStartOffset + fieldType.length }
                                            },
                                            message: `Use array syntax: ${innerType}[] instead of [${innerType}]`,
                                            source: 'concept-design'
                                        });
                                    }
                                } else if (fieldType.endsWith('?') && fieldType.length > 1) {
                                    const baseType = fieldType.slice(0, -1);
                                    if (baseType) { // Prevent empty base types
                                        diagnostics.push({
                                            severity: DiagnosticSeverity.Warning,
                                            range: {
                                                start: { line: i, character: fieldTypeStartOffset },
                                                end: { line: i, character: fieldTypeStartOffset + fieldType.length }
                                            },
                                            message: `Use optional syntax: ${baseType} | null instead of ${baseType}?`,
                                            source: 'concept-design'
                                        });
                                    }
                                } else {
                                    // Standard type validation - fix the problematic regex
                                    const validTypes = ['String', 'Number', 'Boolean', 'Date', 'DateTime', 'Flag', 'ObjectId', 'Object'];
                                    // Use safer regex replacement
                                    const typeCheck = fieldType.replace(/[\[\]]/g, '').replace(/\?$/, '').trim();
                                    if (typeCheck && !validTypes.includes(typeCheck) && !/^[A-Z][A-Za-z0-9_]*$/.test(typeCheck)) {
                                        diagnostics.push({
                                            severity: DiagnosticSeverity.Information,
                                            range: {
                                                start: { line: i, character: fieldTypeStartOffset },
                                                end: { line: i, character: fieldTypeStartOffset + fieldType.length }
                                            },
                                            message: `Consider using standard types: ${validTypes.join(', ')}`,
                                            source: 'concept-design'
                                        });
                                    }
                                }
                            } catch (error) {
                                connection.console.warn(`Error validating field type on line ${i}: ${error}`);
                            }
                        }
                    }
                } catch (error) {
                    connection.console.warn(`Error parsing field definition on line ${i}: ${error}`);
                }
            }
        }

        // Validate query naming convention
        if (currentSection === 'queries' && trimmedLine.includes('(')) {
            try {
                const methodMatch = trimmedLine.match(/^(\w+)\s*\(/);
                if (methodMatch) {
                    const methodName = methodMatch[1];
                    if (methodName && !methodName.startsWith('_')) {
                        const methodStart = line.indexOf(methodName);
                        if (methodStart >= 0) {
                            diagnostics.push({
                                severity: DiagnosticSeverity.Error,
                                range: {
                                    start: { line: i, character: methodStart },
                                    end: { line: i, character: methodStart + methodName.length }
                                },
                                message: 'Query methods must start with underscore (_)',
                                source: 'concept-design'
                            });
                        }
                    }
                }
            } catch (error) {
                connection.console.warn(`Error validating query method on line ${i}: ${error}`);
            }
        }
    }

    // Check required sections
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
            severity: DiagnosticSeverity.Warning,
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

async function validateSyncDocument(text: string, diagnostics: Diagnostic[]): Promise<void> {
    if (!text || text.length > 100000) {
        return; // Don't validate empty documents or extremely large ones
    }
    
    const lines = text.split('\n');
    if (lines.length > 10000) {
        return; // Don't validate files with too many lines
    }
    
    // Basic validation for .sync files
    let hasExport = false;
    let hasWhen = false;
    let hasThen = false;

    for (let i = 0; i < lines.length && i < 5000; i++) { // Add upper bound to prevent infinite loops
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine.startsWith('//')) {
            continue;
        }

        if (trimmedLine.includes('export')) {
            hasExport = true;
        }

        if (trimmedLine.includes('when:')) {
            hasWhen = true;
        }

        if (trimmedLine.includes('then:')) {
            hasThen = true;
        }

        // Check for concept action patterns
        try {
            const conceptActionMatch = trimmedLine.match(/([A-Z]\w*)\.(\w+)/);
            if (conceptActionMatch) {
                const [, conceptName, actionName] = conceptActionMatch;
                
                // Validate concept naming
                if (conceptName && !/^[A-Z][A-Za-z0-9_]*$/.test(conceptName)) {
                    const conceptStart = line.indexOf(conceptName);
                    if (conceptStart >= 0) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Warning,
                            range: {
                                start: { line: i, character: conceptStart },
                                end: { line: i, character: conceptStart + conceptName.length }
                            },
                            message: 'Concept names should start with uppercase letter',
                            source: 'concept-design'
                        });
                    }
                }

                // Check query naming convention
                if (actionName && actionName.startsWith('_') && !/^_[a-z][A-Za-z0-9_]*$/.test(actionName)) {
                    const actionStart = line.indexOf(actionName);
                    if (actionStart >= 0) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Warning,
                            range: {
                                start: { line: i, character: actionStart },
                                end: { line: i, character: actionStart + actionName.length }
                            },
                            message: 'Query methods should start with underscore followed by lowercase letter',
                            source: 'concept-design'
                        });
                    }
                }
            }
        } catch (error) {
            connection.console.warn(`Error validating concept action on line ${i}: ${error}`);
        }
    }

    if (!hasExport) {
        diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Sync should export a function',
            source: 'concept-design'
        });
    }

    if (!hasWhen) {
        diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Sync should have a when clause',
            source: 'concept-design'
        });
    }

    if (!hasThen) {
        diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Sync should have a then clause',
            source: 'concept-design'
        });
    }
}

// Auto-completion provider
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    return [
        {
            label: 'concept',
            kind: CompletionItemKind.Keyword,
            detail: 'Concept declaration',
            insertText: 'concept ${1:ConceptName}\n\npurpose\n    ${2:description}\n\nstate\n    ${3:EntityName}\n        ${4:field}: ${5:Type}\n\nactions\n    ${6:actionName} (${7:input}: ${8:Type}) : (${9:output}: ${10:Type})\n        ${11:description}'
        },
        {
            label: 'purpose',
            kind: CompletionItemKind.Keyword,
            detail: 'Purpose section',
            insertText: 'purpose\n    ${1:description}'
        },
        {
            label: 'state',
            kind: CompletionItemKind.Keyword,
            detail: 'State section',
            insertText: 'state\n    ${1:EntityName}\n        ${2:field}: ${3:Type}'
        },
        {
            label: 'actions',
            kind: CompletionItemKind.Keyword,
            detail: 'Actions section',
            insertText: 'actions\n    ${1:actionName} (${2:input}: ${3:Type}) : (${4:output}: ${5:Type})\n        ${6:description}'
        },
        {
            label: 'queries',
            kind: CompletionItemKind.Keyword,
            detail: 'Queries section',
            insertText: 'queries\n    _${1:queryName} (${2:input}: ${3:Type}) : [${4:output}: ${5:Type}]\n        ${6:description}'
        },
        {
            label: 'String',
            kind: CompletionItemKind.TypeParameter,
            detail: 'String type'
        },
        {
            label: 'Number',
            kind: CompletionItemKind.TypeParameter,
            detail: 'Number type'
        },
        {
            label: 'Boolean',
            kind: CompletionItemKind.TypeParameter,
            detail: 'Boolean type'
        },
        {
            label: 'Date',
            kind: CompletionItemKind.TypeParameter,
            detail: 'Date type'
        },
        {
            label: 'ObjectId',
            kind: CompletionItemKind.TypeParameter,
            detail: 'ObjectId type'
        }
    ];
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    return item;
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
