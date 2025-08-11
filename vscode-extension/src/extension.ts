import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

import { ConceptDesignCommands } from './commands';
import { ConceptDesignProvider } from './providers';
import { ValidationCommands } from './validation/validation-commands';

let client: LanguageClient;

function applySyntaxHighlighting(enableHighlighting: boolean, useSafeMode: boolean) {
    // Since we can't dynamically change grammars at runtime, this function
    // serves as a placeholder for future implementation
    // The actual grammar switching happens through the no-highlighting default
    
    console.log(`Concept Design: Syntax highlighting ${enableHighlighting ? 'enabled' : 'disabled'} (safe mode: ${useSafeMode})`);
    
    // For now, we rely on the package.json setting the default to no-highlighting
    // Users will need to reload VS Code when changing this setting
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Concept Design Tools extension activated');

    // Check master extension toggle first
    const config = vscode.workspace.getConfiguration('conceptDesign');
    const extensionEnabled = config.get('extension.enabled', false);
    const enableDebugLogging = config.get('debug.enableLogging', false);
    
    if (enableDebugLogging) {
        console.log('Concept Design Debug: Extension enabled:', extensionEnabled);
    }

    // Register basic info commands
    const basicDisposables: vscode.Disposable[] = [];

    context.subscriptions.push(...basicDisposables);

    // Extension is now always enabled (no disable functionality)
    if (!extensionEnabled) {
        console.log('Concept Design: Extension is disabled in settings');
        return;
    }

    // Check individual feature toggles (using the actual defaults from package.json)
    const languagesEnabled = config.get('languages.enabled', true);
    const commandsEnabled = config.get('commands.enabled', true);
    const menusEnabled = config.get('menus.enabled', true);
    const lintingEnabled = config.get('linting.enabled', true);
    const enableLanguageServer = lintingEnabled && config.get('linting.enableLanguageServer', true);
    const syntaxEnabled = config.get('syntax.enabled', false);
    const enableSyntaxHighlighting = syntaxEnabled && config.get('syntax.enableHighlighting', false);
    
    if (enableDebugLogging) {
        console.log('Concept Design Debug: Languages enabled:', languagesEnabled);
        console.log('Concept Design Debug: Commands enabled:', commandsEnabled);
        console.log('Concept Design Debug: Menus enabled:', menusEnabled);
        console.log('Concept Design Debug: Linting enabled:', lintingEnabled);
        console.log('Concept Design Debug: Language server enabled:', enableLanguageServer);
        console.log('Concept Design Debug: Syntax enabled:', syntaxEnabled);
        console.log('Concept Design Debug: Syntax highlighting enabled:', enableSyntaxHighlighting);
    }

    const disposables: vscode.Disposable[] = [];

    // Initialize language server only if linting is enabled
    if (enableLanguageServer) {
        if (enableDebugLogging) {
            console.log('Concept Design Debug: Initializing language server...');
        }
        initializeLanguageServer(context);
    } else if (lintingEnabled) {
        console.log('Concept Design: Linting enabled but language server disabled');
    } else {
        console.log('Concept Design: Linting disabled - no language server');
    }

    // Initialize command handlers and providers only if needed
    let commands: ConceptDesignCommands | undefined;
    let validationCommands: ValidationCommands | undefined;
    let providers: ConceptDesignProvider | undefined;

    if (commandsEnabled) {
        commands = new ConceptDesignCommands(context);
        validationCommands = new ValidationCommands(context);
        validationCommands.registerCommands();
        
        // Register feature toggle commands
        // Note: Toggle commands removed as requested by user

        // Register main commands
        disposables.push(
            vscode.commands.registerCommand('concept-design.syncSchema', 
                () => commands!.syncSchema()),
            vscode.commands.registerCommand('concept-design.generateSchema', 
                () => commands!.generateSchema()),
            vscode.commands.registerCommand('concept-design.validateConcepts', 
                () => commands!.validateConcepts(false)),
            vscode.commands.registerCommand('concept-design.validateConceptsWithAI', 
                () => commands!.validateConcepts(true)),
            vscode.commands.registerCommand('concept-design.generateCode', 
                () => commands!.generateCode()),
            vscode.commands.registerCommand('concept-design.openValidationReport', 
                () => commands!.openValidationReport()),
            vscode.commands.registerCommand('concept-design.generateCursorRules', 
                () => commands!.generateCursorRules()),
            vscode.commands.registerCommand('concept-design.toggleLinting', 
                () => commands!.toggleLinting()),
            vscode.commands.registerCommand('concept-design.testExtension', 
                () => commands!.testExtension()),
            vscode.commands.registerCommand('concept-design.toggleSyntaxHighlighting', 
                () => commands!.toggleSyntaxHighlighting()),
            vscode.commands.registerCommand('concept-design.toggleSyntaxSafeMode', 
                () => commands!.toggleSyntaxSafeMode()),
        );
    } else {
        console.log('Concept Design: Commands disabled');
    }

    // Register language definitions and providers only if languages are enabled
    if (languagesEnabled) {
        // Dynamically register language configurations
        // Note: VS Code doesn't support fully dynamic language registration,
        // but we can at least register providers conditionally
        console.log('Concept Design: Registering language providers (language definitions are static in package.json)');
        
        providers = new ConceptDesignProvider(context);
        disposables.push(
            vscode.languages.registerDocumentFormattingEditProvider('concept', providers),
            vscode.languages.registerDocumentFormattingEditProvider('sync', providers),
            vscode.languages.registerHoverProvider('concept', providers),
            vscode.languages.registerHoverProvider('sync', providers),
            vscode.languages.registerCompletionItemProvider('concept', providers, '.', ':', ' '),
            vscode.languages.registerCompletionItemProvider('sync', providers, '.', ':', ' ', '(', ')'),
        );
    } else {
        console.log('Concept Design: Language definitions and providers disabled');
    }

    context.subscriptions.push(...disposables);

    // Apply syntax highlighting based on configuration
    if (syntaxEnabled) {
        applySyntaxHighlighting(enableSyntaxHighlighting, config.get('syntax.useSafeMode', true));
    }

    // Set up configuration change handler
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('conceptDesign.extension.enabled')) {
                vscode.window.showInformationMessage(
                    'Concept Design master toggle changed. Please reload VS Code to apply changes.',
                    'Reload Now'
                ).then(selection => {
                    if (selection === 'Reload Now') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
            } else if (e.affectsConfiguration('conceptDesign.syntax') && syntaxEnabled) {
                const newConfig = vscode.workspace.getConfiguration('conceptDesign');
                const newEnableHighlighting = newConfig.get('syntax.enableHighlighting', false);
                const newUseSafeMode = newConfig.get('syntax.useSafeMode', true);
                
                if (enableDebugLogging) {
                    console.log('Concept Design Debug: Syntax config changed - highlighting:', newEnableHighlighting, 'safe mode:', newUseSafeMode);
                }
                
                applySyntaxHighlighting(newEnableHighlighting, newUseSafeMode);
            } else if (e.affectsConfiguration('conceptDesign')) {
                vscode.window.showInformationMessage(
                    'Concept Design configuration changed. Some changes may require restarting VS Code.'
                );
            }
        })
    );

    // Set up file watchers only if linting is enabled
    if (lintingEnabled && commands) {
        const conceptWatcher = vscode.workspace.createFileSystemWatcher('**/*.concept');
        const syncWatcher = vscode.workspace.createFileSystemWatcher('**/*.sync');

        conceptWatcher.onDidChange(() => {
            const config = vscode.workspace.getConfiguration('conceptDesign');
            if (config.get('linting.enableRealTime')) {
                if (config.get('debug.enableLogging')) {
                    console.log('Concept Design Debug: File changed, running validation');
                }
                commands!.validateConcepts(false, true); // silent validation
            }
        });

        syncWatcher.onDidChange(() => {
            const config = vscode.workspace.getConfiguration('conceptDesign');
            if (config.get('linting.enableRealTime')) {
                if (config.get('debug.enableLogging')) {
                    console.log('Concept Design Debug: Sync file changed, running validation');
                }
                commands!.validateConcepts(false, true); // silent validation
            }
        });

        context.subscriptions.push(conceptWatcher, syncWatcher);
    } else {
        console.log('Concept Design: File watchers disabled');
    }
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
