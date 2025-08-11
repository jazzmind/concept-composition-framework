# Testing Guide for Concept Design Tools Extension

## Running Tests

### Prerequisites
1. Install dependencies: `npm install`
2. Compile TypeScript: `npm run compile`

### Test Commands
```bash
# Run all tests
npm test

# Run tests with watch mode
npm run test:watch

# Run linting
npm run lint

# Run both linting and tests
npm run check
```

### Manual Testing

#### 1. Extension Activation
1. Open VS Code
2. Create a `.concept` file
3. Verify extension activates (check Output panel)
4. Verify syntax highlighting works

#### 2. Language Features
1. Create a concept file with this content:
```
concept User

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
        get user by id
```

2. Test features:
   - Auto-completion (type `pur` and press Ctrl+Space)
   - Hover documentation (hover over keywords)
   - Formatting (right-click and select Format Document)
   - Error highlighting (save file and check for red squiggles)

#### 3. Commands Testing
1. Open Command Palette (Ctrl+Shift+P)
2. Type "Concept Design" to see available commands
3. Test each command:
   - **Generate Schema**: Should create/update Prisma schema
   - **Validate Concepts**: Should show validation results
   - **Generate Code**: Should create TypeScript files
   - **Open Validation Report**: Should open HTML report if available

#### 4. Configuration Testing
1. Open Settings (Ctrl+,)
2. Search for "Concept Design"
3. Verify all configuration options are present:
   - OpenAI API Key
   - Directory paths
   - Validation options
   - Code generation options

#### 5. Sync File Testing
1. Create a `.sync` file with this content:
```typescript
export const UserRegistration = ({ name, email, user }: Vars) => ({
    when: actions(
        [API.request, { method: "POST", path: "/users", name, email }, { request }]
    ),
    then: actions(
        [User.register, { name, email }]
    ),
});
```

2. Test sync-specific features:
   - Syntax highlighting
   - Auto-completion for sync keywords
   - Error detection

### Test Coverage

#### Unit Tests
- **Parser Tests**: Verify concept and sync file parsing
- **Validator Tests**: Check linting and validation rules
- **Code Generator Tests**: Verify TypeScript code generation
- **Provider Tests**: Test language service features

#### Integration Tests
- **Extension Tests**: Verify extension activation and command registration
- **Command Tests**: Test command execution (mocked)
- **Configuration Tests**: Verify settings integration

#### Manual Test Scenarios
- **Real File Operations**: Test with actual workspace files
- **Error Conditions**: Test with malformed concept files
- **Performance**: Test with large concept specifications
- **Cross-Platform**: Test on Windows, macOS, Linux

### Debugging Tests
1. Open VS Code debugger
2. Set breakpoints in test files
3. Run "Extension Tests" launch configuration
4. Step through test execution

### Performance Testing
1. Create large concept files (100+ lines)
2. Test responsiveness of:
   - Syntax highlighting
   - Auto-completion
   - Validation
   - Code generation

### Expected Test Results
- All unit tests should pass
- No TypeScript compilation errors
- No ESLint violations
- Extension should activate without errors
- All commands should be registered
- Language features should work for both file types

### Troubleshooting
- **Tests fail to run**: Check TypeScript compilation
- **Extension not loading**: Check for activation events
- **Commands not working**: Verify command registration
- **Linting errors**: Run `npm run lint` to see details
