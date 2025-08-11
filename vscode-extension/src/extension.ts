import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

import { ConceptDesignCommands } from './commands';
import { ConceptDesignProvider } from './providers';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
    console.log('Concept Design Tools extension activated');

    // Initialize language server
    initializeLanguageServer(context);

    // Initialize command handlers
    const commands = new ConceptDesignCommands(context);
    const providers = new ConceptDesignProvider(context);

    // Register commands
    const disposables = [
        vscode.commands.registerCommand('concept-design.generateSchema', 
            () => commands.generateSchema()),
        vscode.commands.registerCommand('concept-design.validateConcepts', 
            () => commands.validateConcepts(false)),
        vscode.commands.registerCommand('concept-design.validateConceptsWithAI', 
            () => commands.validateConcepts(true)),
        vscode.commands.registerCommand('concept-design.generateCode', 
            () => commands.generateCode()),
        vscode.commands.registerCommand('concept-design.openValidationReport', 
            () => commands.openValidationReport()),
        vscode.commands.registerCommand('concept-design.generateCursorRules', 
            () => commands.generateCursorRules()),
    ];

    // Register providers
    disposables.push(
        vscode.languages.registerDocumentFormattingEditProvider('concept', providers),
        vscode.languages.registerDocumentFormattingEditProvider('sync', providers),
        vscode.languages.registerHoverProvider('concept', providers),
        vscode.languages.registerHoverProvider('sync', providers),
        vscode.languages.registerCompletionItemProvider('concept', providers, '.', ':', ' '),
        vscode.languages.registerCompletionItemProvider('sync', providers, '.', ':', ' ', '(', ')'),
    );

    context.subscriptions.push(...disposables);

    // Set up configuration change handler
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('conceptDesign')) {
                vscode.window.showInformationMessage(
                    'Concept Design configuration changed. Some changes may require restarting VS Code.'
                );
            }
        })
    );

    // Set up file watchers for .concept and .sync files
    const conceptWatcher = vscode.workspace.createFileSystemWatcher('**/*.concept');
    const syncWatcher = vscode.workspace.createFileSystemWatcher('**/*.sync');

    conceptWatcher.onDidChange(() => {
        if (vscode.workspace.getConfiguration('conceptDesign').get('linting.enableRealTime')) {
            commands.validateConcepts(false, true); // silent validation
        }
    });

    syncWatcher.onDidChange(() => {
        if (vscode.workspace.getConfiguration('conceptDesign').get('linting.enableRealTime')) {
            commands.validateConcepts(false, true); // silent validation
        }
    });

    context.subscriptions.push(conceptWatcher, syncWatcher);
}

function initializeLanguageServer(context: vscode.ExtensionContext) {
    // Language server module path
    const serverModule = context.asAbsolutePath(path.join('out', 'server.js'));
    
    // Debug options for the server
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    // Server options
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    // Client options
    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'concept' },
            { scheme: 'file', language: 'sync' }
        ],
        synchronize: {
            fileEvents: [
                vscode.workspace.createFileSystemWatcher('**/*.concept'),
                vscode.workspace.createFileSystemWatcher('**/*.sync')
            ]
        }
    };

    // Create and start the language client
    client = new LanguageClient(
        'conceptDesignLanguageServer',
        'Concept Design Language Server',
        serverOptions,
        clientOptions
    );

    // Start the client
    client.start();
    context.subscriptions.push(client);
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
