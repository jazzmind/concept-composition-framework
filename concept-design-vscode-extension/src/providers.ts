import * as vscode from 'vscode';

export class ConceptDesignProvider implements 
    vscode.DocumentFormattingEditProvider,
    vscode.HoverProvider,
    vscode.CompletionItemProvider {

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Document formatting
     */
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.TextEdit[] {
        const edits: vscode.TextEdit[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
                continue;
            }

            // Format concept sections with proper indentation
            if (document.languageId === 'concept') {
                const formatted = this.formatConceptLine(line, i, lines, options);
                if (formatted !== line) {
                    const range = new vscode.Range(i, 0, i, line.length);
                    edits.push(vscode.TextEdit.replace(range, formatted));
                }
            }
        }

        return edits;
    }

    /**
     * Hover provider for documentation
     */
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return;

        const word = document.getText(range);
        
        if (document.languageId === 'concept') {
            return this.provideConceptHover(word);
        } else if (document.languageId === 'sync') {
            return this.provideSyncHover(word);
        }
    }

    /**
     * Completion item provider
     */
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        if (document.languageId === 'concept') {
            return this.provideConceptCompletions(document, position);
        } else if (document.languageId === 'sync') {
            return this.provideSyncCompletions(document, position);
        }
        return [];
    }

    private formatConceptLine(
        line: string, 
        lineIndex: number, 
        allLines: string[], 
        options: vscode.FormattingOptions
    ): string {
        const trimmedLine = line.trim();
        const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';

        // Main section headers should not be indented
        if (['concept', 'purpose', 'state', 'actions', 'queries', 'operational principle'].some(section => 
            trimmedLine.startsWith(section))) {
            return trimmedLine;
        }

        // Determine the current section
        const currentSection = this.getCurrentSection(lineIndex, allLines);

        if (currentSection === 'state') {
            // Entity definitions are not indented
            if (!trimmedLine.includes(':') && /^[A-Z][A-Za-z0-9_]*$/.test(trimmedLine)) {
                return trimmedLine;
            }
            // Field definitions are indented once
            if (trimmedLine.includes(':')) {
                return indent + trimmedLine;
            }
        }

        if (currentSection === 'purpose') {
            return indent + trimmedLine;
        }

        if (currentSection === 'actions' || currentSection === 'queries') {
            // Action/query signatures are not indented
            if (trimmedLine.includes('(') && trimmedLine.includes(')')) {
                return trimmedLine;
            }
            // Descriptions are indented once
            return indent + trimmedLine;
        }

        return line;
    }

    private getCurrentSection(lineIndex: number, allLines: string[]): string {
        for (let i = lineIndex; i >= 0; i--) {
            const line = allLines[i].trim();
            if (line === 'purpose') return 'purpose';
            if (line === 'state') return 'state';
            if (line === 'actions') return 'actions';
            if (line === 'queries') return 'queries';
            if (line === 'operational principle') return 'operational';
            if (line.startsWith('concept ')) return 'concept';
        }
        return 'unknown';
    }

    private provideConceptHover(word: string): vscode.Hover | undefined {
        const conceptDocumentation: Record<string, string> = {
            'concept': 'Declares a new concept with a unique name. Concepts are independent, reusable modules that serve a single purpose.',
            'purpose': 'Describes what problem this concept solves and its intended use.',
            'state': 'Defines the data structure this concept manages using Simple State Form (SSF).',
            'actions': 'Defines the operations that can modify the concept\'s state. Each action takes one input object and returns one output object.',
            'queries': 'Defines read-only operations that return arrays of data. Query names must start with underscore (_).',
            'String': 'A text data type for storing strings.',
            'Number': 'A numeric data type for storing integers.',
            'Boolean': 'A boolean data type for true/false values.',
            'Date': 'A date data type for storing dates.',
            'DateTime': 'A date-time data type for storing timestamps.',
            'Flag': 'A boolean data type, alias for Boolean.',
            'ObjectId': 'A reference to another object, typically stored as a string ID.',
            'Object': 'A complex object type for storing structured data.',
            'optional': 'Marks a field as optional (can be null or undefined).',
            'set': 'Declares a collection/array of the specified type.',
            'seq': 'Declares an ordered sequence/array of the specified type.'
        };

        const documentation = conceptDocumentation[word];
        if (documentation) {
            return new vscode.Hover(new vscode.MarkdownString(documentation));
        }
    }

    private provideSyncHover(word: string): vscode.Hover | undefined {
        const syncDocumentation: Record<string, string> = {
            'sync': 'Declares a synchronization that connects concepts through declarative rules.',
            'when': 'Specifies which action completions trigger this synchronization.',
            'where': 'Filters and enriches the execution context using pure query functions.',
            'then': 'Specifies which actions to invoke as a result.',
            'actions': 'Helper function for declaring action patterns in synchronizations.',
            'Frames': 'Represents execution contexts with variable bindings.',
            'Vars': 'Type for destructuring variables in synchronization parameters.',
            'export': 'Exports the synchronization function for registration.',
            'function': 'JavaScript function declaration.',
            'const': 'JavaScript constant declaration.'
        };

        const documentation = syncDocumentation[word];
        if (documentation) {
            return new vscode.Hover(new vscode.MarkdownString(documentation));
        }
    }

    private provideConceptCompletions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const lineText = document.lineAt(position).text;
        const currentSection = this.getCurrentSection(position.line, document.getText().split('\n'));

        const completions: vscode.CompletionItem[] = [];

        // Section keywords
        if (position.character === 0 || lineText.trim() === '') {
            completions.push(
                ...this.createSectionCompletions(),
                ...this.createTypeCompletions()
            );
        }

        // In state section, provide entity and field completions
        if (currentSection === 'state') {
            if (lineText.includes(':')) {
                // Field type completions
                completions.push(...this.createTypeCompletions());
            } else {
                // Entity name completion
                completions.push(this.createCompletionItem(
                    'EntityName',
                    vscode.CompletionItemKind.Class,
                    'Entity definition in state section',
                    'EntityName\n    field: Type'
                ));
            }
        }

        // In actions/queries section
        if (currentSection === 'actions' || currentSection === 'queries') {
            const prefix = currentSection === 'queries' ? '_' : '';
            completions.push(this.createCompletionItem(
                `${prefix}methodName`,
                vscode.CompletionItemKind.Method,
                `${currentSection === 'queries' ? 'Query' : 'Action'} method signature`,
                `${prefix}methodName (input: Type) : ${currentSection === 'queries' ? '[output: Type]' : '(output: Type)'}\n    description`
            ));
        }

        return completions;
    }

    private provideSyncCompletions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];

        // Basic sync structure
        completions.push(
            this.createCompletionItem(
                'sync',
                vscode.CompletionItemKind.Snippet,
                'Complete sync function template',
                'export const SyncName = ({ variable1, variable2 }: Vars) => ({\n    when: actions(\n        [Concept.action, { input: "pattern" }, { output: variable1 }]\n    ),\n    where: (frames: Frames): Frames => {\n        return frames.filter(($) => condition);\n    },\n    then: actions(\n        [Concept.action, { input: variable2 }]\n    ),\n});'
            ),
            this.createCompletionItem(
                'when',
                vscode.CompletionItemKind.Keyword,
                'When clause for action matching',
                'when: actions(\n    [Concept.action, { input: pattern }, { output: variable }]\n),'
            ),
            this.createCompletionItem(
                'where',
                vscode.CompletionItemKind.Keyword,
                'Where clause for filtering',
                'where: (frames: Frames): Frames => {\n    return frames.filter(($) => condition);\n},'
            ),
            this.createCompletionItem(
                'then',
                vscode.CompletionItemKind.Keyword,
                'Then clause for consequent actions',
                'then: actions(\n    [Concept.action, { input: variable }]\n),'
            )
        );

        return completions;
    }

    private createSectionCompletions(): vscode.CompletionItem[] {
        return [
            this.createCompletionItem(
                'concept',
                vscode.CompletionItemKind.Keyword,
                'Concept declaration',
                'concept ConceptName\n\npurpose\n    description\n\nstate\n    EntityName\n        field: Type\n\nactions\n    actionName (input: Type) : (output: Type)\n        description'
            ),
            this.createCompletionItem(
                'purpose',
                vscode.CompletionItemKind.Keyword,
                'Purpose section',
                'purpose\n    description'
            ),
            this.createCompletionItem(
                'state',
                vscode.CompletionItemKind.Keyword,
                'State section',
                'state\n    EntityName\n        field: Type'
            ),
            this.createCompletionItem(
                'actions',
                vscode.CompletionItemKind.Keyword,
                'Actions section',
                'actions\n    actionName (input: Type) : (output: Type)\n        description'
            ),
            this.createCompletionItem(
                'queries',
                vscode.CompletionItemKind.Keyword,
                'Queries section',
                'queries\n    _queryName (input: Type) : [output: Type]\n        description'
            )
        ];
    }

    private createTypeCompletions(): vscode.CompletionItem[] {
        const types = [
            { name: 'String', desc: 'Text data type' },
            { name: 'Number', desc: 'Numeric data type' },
            { name: 'Boolean', desc: 'Boolean data type' },
            { name: 'Date', desc: 'Date data type' },
            { name: 'DateTime', desc: 'Date-time data type' },
            { name: 'Flag', desc: 'Boolean flag' },
            { name: 'ObjectId', desc: 'Object reference ID' },
            { name: 'Object', desc: 'Complex object type' }
        ];

        return types.map(type => 
            this.createCompletionItem(
                type.name,
                vscode.CompletionItemKind.TypeParameter,
                type.desc
            )
        );
    }

    private createCompletionItem(
        label: string,
        kind: vscode.CompletionItemKind,
        detail: string,
        insertText?: string
    ): vscode.CompletionItem {
        const item = new vscode.CompletionItem(label, kind);
        item.detail = detail;
        if (insertText) {
            item.insertText = new vscode.SnippetString(insertText);
        }
        return item;
    }
}
