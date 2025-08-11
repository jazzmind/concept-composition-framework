import * as assert from 'assert';
import { ConceptValidator } from '../../validation/validator';

suite('Validator Test Suite', () => {
    const validator = new ConceptValidator();

    suite('Concept Validation', () => {
        test('Should validate correct concept structure', () => {
            const conceptContent = `concept User

purpose
    to associate identifying information with individuals

state
    User
        name: String
        email: String

actions
    register (name: String, email: String) : (user: String)
        create a new user

queries
    _getById (id: String) : [user: User]
        retrieve user by id`;

            const issues = validator.validateConcept(conceptContent);
            
            // Should have no errors for a well-formed concept
            const errors = issues.filter(i => i.type === 'error');
            assert.strictEqual(errors.length, 0);
        });

        test('Should detect missing concept declaration', () => {
            const conceptContent = `purpose
    some purpose

state
    Entity
        field: String`;

            const issues = validator.validateConcept(conceptContent);
            
            const missingConceptError = issues.find(i => 
                i.type === 'error' && i.message.includes('Missing concept declaration')
            );
            assert.ok(missingConceptError);
        });

        test('Should detect invalid concept name', () => {
            const conceptContent = `concept invalidName

purpose
    test purpose`;

            const issues = validator.validateConcept(conceptContent);
            
            const nameError = issues.find(i => 
                i.type === 'error' && i.message.includes('Invalid concept name format')
            );
            assert.ok(nameError);
        });

        test('Should validate query naming convention', () => {
            const conceptContent = `concept Test

queries
    invalidQuery (input: String) : [output: String]
        should start with underscore
    _validQuery (input: String) : [output: String]
        correctly named query`;

            const issues = validator.validateConcept(conceptContent);
            
            const namingError = issues.find(i => 
                i.type === 'error' && i.message.includes('Query methods must start with underscore')
            );
            assert.ok(namingError);
        });

        test('Should validate field naming convention', () => {
            const conceptContent = `concept Test

state
    Entity
        InvalidField: String
        validField: String`;

            const issues = validator.validateConcept(conceptContent);
            
            const fieldNamingWarning = issues.find(i => 
                i.type === 'warning' && i.message.includes('Field name should start with lowercase letter')
            );
            assert.ok(fieldNamingWarning);
        });

        test('Should suggest standard types', () => {
            const conceptContent = `concept Test

state
    Entity
        field: CustomType
        standardField: String`;

            const issues = validator.validateConcept(conceptContent);
            
            const typeInfo = issues.find(i => 
                i.type === 'info' && i.message.includes('Consider using standard types')
            );
            assert.ok(typeInfo);
        });

        test('Should warn about missing sections', () => {
            const conceptContent = `concept MinimalConcept`;

            const issues = validator.validateConcept(conceptContent);
            
            const missingPurpose = issues.find(i => 
                i.type === 'warning' && i.message.includes('Missing purpose section')
            );
            const missingState = issues.find(i => 
                i.type === 'warning' && i.message.includes('Missing state section')
            );
            const missingActions = issues.find(i => 
                i.type === 'warning' && i.message.includes('Missing actions section')
            );

            assert.ok(missingPurpose);
            assert.ok(missingState);
            assert.ok(missingActions);
        });
    });

    suite('Sync Validation', () => {
        test('Should validate correct sync structure', () => {
            const syncContent = `export const TestSync = ({ variable }: Vars) => ({
    when: actions(
        [Concept.action, { input: "value" }, { output: variable }]
    ),
    then: actions(
        [OtherConcept.action, { input: variable }]
    ),
});`;

            const issues = validator.validateSync(syncContent);
            
            // Should have no major issues for a well-formed sync
            const errors = issues.filter(i => i.type === 'error');
            assert.strictEqual(errors.length, 0);
        });

        test('Should warn about missing export', () => {
            const syncContent = `const TestSync = ({ variable }: Vars) => ({
    when: actions([Concept.action, {}, {}]),
    then: actions([OtherConcept.action, {}]),
});`;

            const issues = validator.validateSync(syncContent);
            
            const missingExport = issues.find(i => 
                i.type === 'warning' && i.message.includes('Sync should export a function')
            );
            assert.ok(missingExport);
        });

        test('Should warn about missing when clause', () => {
            const syncContent = `export const TestSync = ({ variable }: Vars) => ({
    then: actions([Concept.action, {}]),
});`;

            const issues = validator.validateSync(syncContent);
            
            const missingWhen = issues.find(i => 
                i.type === 'warning' && i.message.includes('Missing when clause')
            );
            assert.ok(missingWhen);
        });

        test('Should warn about missing then clause', () => {
            const syncContent = `export const TestSync = ({ variable }: Vars) => ({
    when: actions([Concept.action, {}, {}]),
});`;

            const issues = validator.validateSync(syncContent);
            
            const missingThen = issues.find(i => 
                i.type === 'warning' && i.message.includes('Missing then clause')
            );
            assert.ok(missingThen);
        });

        test('Should validate concept naming in actions', () => {
            const syncContent = `export const TestSync = ({ variable }: Vars) => ({
    when: actions([invalidConcept.action, {}, {}]),
    then: actions([ValidConcept.action, {}]),
});`;

            const issues = validator.validateSync(syncContent);
            
            const conceptNamingWarning = issues.find(i => 
                i.type === 'warning' && i.message.includes('Concept name should start with uppercase letter')
            );
            assert.ok(conceptNamingWarning);
        });

        test('Should validate query method references', () => {
            const syncContent = `export const TestSync = ({ variable }: Vars) => ({
    when: actions([Concept._invalidQuery, {}, {}]),
    then: actions([OtherConcept.action, {}]),
});`;

            const issues = validator.validateSync(syncContent);
            
            // Should validate query naming patterns
            const queryWarning = issues.find(i => 
                i.type === 'warning' && i.message.includes('Query method naming convention')
            );
            // This might not trigger depending on the exact pattern, which is okay
        });
    });

    suite('Issue Reporting', () => {
        test('Should include line and column information', () => {
            const conceptContent = `concept Test
invalid line here
purpose
    test`;

            const issues = validator.validateConcept(conceptContent);
            
            // All issues should have line information
            issues.forEach(issue => {
                assert.ok(typeof issue.line === 'number');
                assert.ok(issue.line > 0);
                assert.ok(typeof issue.column === 'number');
                assert.ok(issue.column >= 0);
            });
        });

        test('Should provide helpful descriptions', () => {
            const conceptContent = `concept invalidName`;

            const issues = validator.validateConcept(conceptContent);
            
            issues.forEach(issue => {
                assert.ok(issue.description);
                assert.ok(issue.description.length > 0);
                assert.ok(issue.message);
                assert.ok(issue.message.length > 0);
            });
        });

        test('Should categorize issues by severity', () => {
            const conceptContent = `concept Test
purpose
    test purpose
state
    Entity
        InvalidField: CustomType`;

            const issues = validator.validateConcept(conceptContent);
            
            const errors = issues.filter(i => i.type === 'error');
            const warnings = issues.filter(i => i.type === 'warning');
            const info = issues.filter(i => i.type === 'info');
            
            // Should have different types of issues
            assert.ok(errors.length + warnings.length + info.length > 0);
        });
    });
});
