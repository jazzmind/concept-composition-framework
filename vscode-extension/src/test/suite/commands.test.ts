import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

suite('Commands Test Suite', () => {
    let testWorkspace: string;

    suiteSetup(async () => {
        // Create a temporary workspace for testing
        testWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'concept-design-test-'));
        
        // Create test directories
        fs.mkdirSync(path.join(testWorkspace, 'specs'), { recursive: true });
        fs.mkdirSync(path.join(testWorkspace, 'concepts'), { recursive: true });
        fs.mkdirSync(path.join(testWorkspace, 'syncs'), { recursive: true });
        
        // Create test concept file
        const conceptContent = `concept User

purpose
    to manage user information

state
    User
        name: String
        email: String

actions
    register (name: String, email: String) : (user: String)
        create a new user

queries
    _getById (id: String) : [user: User]
        get user by id`;

        fs.writeFileSync(path.join(testWorkspace, 'specs', 'User.concept'), conceptContent);
        
        // Create test sync file
        const syncContent = `export const UserRegistration = ({ name, email, user }: Vars) => ({
    when: actions(
        [API.request, { method: "POST", path: "/users", name, email }, { request }],
    ),
    then: actions(
        [User.register, { name, email }],
    ),
});`;

        fs.writeFileSync(path.join(testWorkspace, 'specs', 'UserRegistration.sync'), syncContent);
    });

    suiteTeardown(() => {
        // Clean up test workspace
        if (fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });

    test('Generate Schema command should be available', async () => {
        // Wait for extension to fully register and retry if needed
        let attempts = 0;
        let commands: string[] = [];
        
        while (attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            commands = await vscode.commands.getCommands(true);
            if (commands.includes('concept-design.generateSchema')) {
                break;
            }
            attempts++;
        }
        
        assert.ok(commands.includes('concept-design.generateSchema'), 
            `Command not found after ${attempts} attempts. Available commands: ${commands.filter(c => c.startsWith('concept-design')).join(', ')}`);
    });

    test('Validate Concepts command should be available', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('concept-design.validateConcepts'));
    });

    test('Generate Code command should be available', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('concept-design.generateCode'));
    });

    test('AI Validation command should be available', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('concept-design.validateConceptsWithAI'));
    });

    test('Open Validation Report command should be available', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('concept-design.openValidationReport'));
    });

    // Note: Testing actual command execution would require mocking the workspace
    // and file system operations, which is complex in this environment.
    // In a real test suite, you would:
    // 1. Mock vscode.workspace.workspaceFolders
    // 2. Mock file system operations
    // 3. Test command execution results
    
    test('Configuration should have expected properties', () => {
        const config = vscode.workspace.getConfiguration('conceptDesign');
        
        // Test that configuration properties exist (they will have default values)
        assert.ok(config.has('openaiApiKey'));
        assert.ok(config.has('directories.specs'));
        assert.ok(config.has('directories.concepts'));
        assert.ok(config.has('directories.syncs'));
        assert.ok(config.has('validation.strictMode'));
        assert.ok(config.has('codeGeneration.overwriteExisting'));
        assert.ok(config.has('linting.enableRealTime'));
    });

    test('Configuration should have correct default values', () => {
        const config = vscode.workspace.getConfiguration('conceptDesign');
        
        // Test default values
        assert.strictEqual(config.get('directories.specs'), 'specs');
        assert.strictEqual(config.get('directories.concepts'), 'concepts');
        assert.strictEqual(config.get('directories.syncs'), 'syncs');
        assert.strictEqual(config.get('validation.strictMode'), false);
        assert.strictEqual(config.get('codeGeneration.overwriteExisting'), false);
        assert.strictEqual(config.get('linting.enableRealTime'), true);
    });
});
