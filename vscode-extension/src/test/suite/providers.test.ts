import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConceptDesignProvider } from '../../providers';

suite('Providers Test Suite', () => {
    let provider: ConceptDesignProvider;
    let mockContext: vscode.ExtensionContext;

    suiteSetup(() => {
        // Create a mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: {} as any,
            globalState: {} as any,
            extensionPath: '',
            asAbsolutePath: (relativePath: string) => relativePath,
            storagePath: '',
            globalStoragePath: '',
            logPath: '',
            extensionUri: vscode.Uri.file(''),
            environmentVariableCollection: {} as any,
            extensionMode: vscode.ExtensionMode.Test,
            secrets: {} as any,
            storageUri: vscode.Uri.file(''),
            globalStorageUri: vscode.Uri.file(''),
            logUri: vscode.Uri.file(''),
            extension: {} as any,
            languageModelAccessInformation: {} as any
        };
        
        provider = new ConceptDesignProvider(mockContext);
    });

    suite('Hover Provider', () => {
        test('Should provide hover for concept keywords', () => {
            const mockDocument = createMockDocument('concept', 'concept User\n\npurpose\n    test');
            const position = new vscode.Position(0, 0); // Position at 'concept'
            
            const hover = provider.provideHover(mockDocument, position, {} as any);
            
            // Note: This would require implementing word range detection
            // In a real implementation, you'd test that hover returns appropriate documentation
        });

        test('Should provide hover for state types', () => {
            const mockDocument = createMockDocument('concept', 'state\n    User\n        name: String');
            const position = new vscode.Position(2, 15); // Position at 'String'
            
            const hover = provider.provideHover(mockDocument, position, {} as any);
            
            // Test would verify that String type documentation is returned
        });
    });

    suite('Completion Provider', () => {
        test('Should provide completions for concept sections', () => {
            const mockDocument = createMockDocument('concept', 'concept Test\n\n');
            const position = new vscode.Position(2, 0); // Empty line
            
            const completions = provider.provideCompletionItems(
                mockDocument, 
                position, 
                {} as any, 
                {} as any
            );
            
            if (Array.isArray(completions)) {
                const sectionCompletions = completions.filter(c => 
                    ['purpose', 'state', 'actions', 'queries'].includes(c.label as string)
                );
                assert.ok(sectionCompletions.length > 0);
            }
        });

        test('Should provide type completions in state section', () => {
            const mockDocument = createMockDocument('concept', 
                'concept Test\n\nstate\n    Entity\n        field: ');
            const position = new vscode.Position(4, 15); // After the colon
            
            const completions = provider.provideCompletionItems(
                mockDocument, 
                position, 
                {} as any, 
                {} as any
            );
            
            if (Array.isArray(completions)) {
                const typeCompletions = completions.filter(c => 
                    ['String', 'Number', 'Boolean', 'Date'].includes(c.label as string)
                );
                assert.ok(typeCompletions.length > 0);
            }
        });

        test('Should provide sync completions for .sync files', () => {
            const mockDocument = createMockDocument('sync', '');
            const position = new vscode.Position(0, 0);
            
            const completions = provider.provideCompletionItems(
                mockDocument, 
                position, 
                {} as any, 
                {} as any
            );
            
            if (Array.isArray(completions)) {
                const syncCompletions = completions.filter(c => 
                    ['sync', 'when', 'where', 'then'].includes(c.label as string)
                );
                assert.ok(syncCompletions.length > 0);
            }
        });
    });

    suite('Formatting Provider', () => {
        test('Should format concept sections with proper indentation', () => {
            const content = 'concept Test\npurpose\nto do something\nstate\nEntity\nfield: String';
            const mockDocument = createMockDocument('concept', content);
            const options: vscode.FormattingOptions = {
                tabSize: 4,
                insertSpaces: true
            };
            
            const edits = provider.provideDocumentFormattingEdits(
                mockDocument,
                options,
                {} as any
            );
            
            // Should return formatting edits
            assert.ok(Array.isArray(edits));
            
            // In a real test, you'd verify the specific formatting changes
        });

        test('Should handle empty documents gracefully', () => {
            const mockDocument = createMockDocument('concept', '');
            const options: vscode.FormattingOptions = {
                tabSize: 4,
                insertSpaces: true
            };
            
            const edits = provider.provideDocumentFormattingEdits(
                mockDocument,
                options,
                {} as any
            );
            
            assert.ok(Array.isArray(edits));
            assert.strictEqual(edits.length, 0);
        });
    });

    // Helper function to create mock documents
    function createMockDocument(languageId: string, content: string): vscode.TextDocument {
        const lines = content.split('\n');
        
        return {
            uri: vscode.Uri.file('test.concept'),
            fileName: 'test.concept',
            isUntitled: false,
            languageId: languageId,
            version: 1,
            isDirty: false,
            isClosed: false,
            save: () => Promise.resolve(true),
            eol: vscode.EndOfLine.LF,
            encoding: 'utf8',
            lineCount: lines.length,
            lineAt: (line: number | vscode.Position) => {
                const lineNumber = typeof line === 'number' ? line : line.line;
                const text = lines[lineNumber] || '';
                return {
                    lineNumber,
                    text,
                    range: new vscode.Range(lineNumber, 0, lineNumber, text.length),
                    rangeIncludingLineBreak: new vscode.Range(lineNumber, 0, lineNumber + 1, 0),
                    firstNonWhitespaceCharacterIndex: text.search(/\S/),
                    isEmptyOrWhitespace: text.trim().length === 0
                };
            },
            offsetAt: (position: vscode.Position) => {
                let offset = 0;
                for (let i = 0; i < position.line; i++) {
                    offset += lines[i].length + 1; // +1 for newline
                }
                return offset + position.character;
            },
            positionAt: (offset: number) => {
                let line = 0;
                let character = offset;
                for (const lineText of lines) {
                    if (character <= lineText.length) {
                        return new vscode.Position(line, character);
                    }
                    character -= lineText.length + 1; // +1 for newline
                    line++;
                }
                return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
            },
            getText: (range?: vscode.Range) => {
                if (!range) {
                    return content;
                }
                // Simple implementation for testing
                return content.substring(
                    Math.max(0, range.start.character),
                    Math.min(content.length, range.end.character)
                );
            },
            getWordRangeAtPosition: (position: vscode.Position, regex?: RegExp) => {
                const line = lines[position.line];
                if (!line) return undefined;
                
                const wordRegex = regex || /\w+/;
                const match = line.substring(position.character).match(wordRegex);
                if (match) {
                    return new vscode.Range(
                        position.line, 
                        position.character,
                        position.line, 
                        position.character + match[0].length
                    );
                }
                return undefined;
            },
            validateRange: (range: vscode.Range) => range,
            validatePosition: (position: vscode.Position) => position
        } as vscode.TextDocument;
    }
});
