import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('concept-design.concept-design-tools'));
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('concept-design.concept-design-tools');
        if (extension) {
            await extension.activate();
            assert.ok(extension.isActive);
        }
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        
        const expectedCommands = [
            'concept-design.generateSchema',
            'concept-design.validateConcepts',
            'concept-design.validateConceptsWithAI',
            'concept-design.generateCode',
            'concept-design.openValidationReport'
        ];

        for (const cmd of expectedCommands) {
            assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
        }
    });

    test('Language support should be available', () => {
        const conceptLanguage = vscode.languages.getLanguages();
        conceptLanguage.then(languages => {
            assert.ok(languages.includes('concept'), 'Concept language should be supported');
            assert.ok(languages.includes('sync'), 'Sync language should be supported');
        });
    });
});
