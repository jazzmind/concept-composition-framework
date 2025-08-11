import * as assert from 'assert';
import { ConceptSpecParser } from '../../parsers/conceptParser';

suite('Concept Parser Test Suite', () => {
    const parser = new ConceptSpecParser();

    test('Should parse basic concept structure', () => {
        const conceptContent = `<concept_spec>
concept User

purpose
    to associate identifying information with individuals

state
    User
        name: String
        email: String

actions
    register (name: String, email: String) : (user: String)
        create a new user with the given name and email

queries
    _getById (id: String) : [user: User]
        retrieve user by id
</concept_spec>`;

        const spec = parser.parseConceptSpec(conceptContent);
        
        assert.strictEqual(spec.name, 'User');
        assert.strictEqual(spec.purpose, 'to associate identifying information with individuals');
        assert.ok(spec.state.User);
        assert.strictEqual(spec.state.User.name, 'String');
        assert.strictEqual(spec.state.User.email, 'String');
        assert.strictEqual(spec.actions.length, 1);
        assert.strictEqual(spec.actions[0].name, 'register');
        assert.strictEqual(spec.queries.length, 1);
        assert.strictEqual(spec.queries[0].name, '_getById');
    });

    test('Should handle empty sections', () => {
        const conceptContent = `concept Empty

purpose
    minimal concept`;

        const spec = parser.parseConceptSpec(conceptContent);

        assert.strictEqual(spec.name, 'Empty');
        assert.strictEqual(spec.purpose, 'minimal concept');
        assert.strictEqual(Object.keys(spec.state).length, 0);
        assert.strictEqual(spec.actions.length, 0);
        assert.strictEqual(spec.queries.length, 0);
    });

    test('Should parse complex state with multiple entities', () => {
        const conceptContent = `<concept_spec>
concept Library

state
    Book
        title: String
        isbn: String
        published: Date
    Author
        name: String
        bio: String?
    BookAuthor
        book: ObjectId
        author: ObjectId
</concept_spec>`;

        const spec = parser.parseConceptSpec(conceptContent);

        assert.ok(spec.state.Book);
        assert.ok(spec.state.Author);
        assert.ok(spec.state.BookAuthor);
        assert.strictEqual(spec.state.Book.title, 'String');
        assert.strictEqual(spec.state.Author.bio, 'String?');
        assert.strictEqual(spec.state.BookAuthor.book, 'ObjectId');
    });

    test('Should parse action signatures correctly', () => {
        const conceptContent = `concept Test

actions
    simpleAction (input: String) : (output: String)
        description
    complexAction (id: ObjectId, data: Object, flag: Boolean) : (result: Number, success: Boolean)
        another description`;

        const spec = parser.parseConceptSpec(conceptContent);

        assert.strictEqual(spec.actions.length, 2);
        
        const simpleAction = spec.actions[0];
        assert.strictEqual(simpleAction.name, 'simpleAction');
        assert.strictEqual(simpleAction.inputs.input, 'String');
        assert.strictEqual(simpleAction.outputs.output, 'String');

        const complexAction = spec.actions[1];
        assert.strictEqual(complexAction.name, 'complexAction');
        assert.strictEqual(complexAction.inputs.id, 'ObjectId');
        assert.strictEqual(complexAction.inputs.data, 'Object');
        assert.strictEqual(complexAction.inputs.flag, 'Boolean');
        assert.strictEqual(complexAction.outputs.result, 'Number');
        assert.strictEqual(complexAction.outputs.success, 'Boolean');
    });

    test('Should validate query naming convention', () => {
        const conceptContent = `concept Test

queries
    _validQuery (input: String) : [output: String]
        valid query
    invalidQuery (input: String) : [output: String]
        invalid query without underscore`;

        const spec = parser.parseConceptSpec(conceptContent);

        assert.strictEqual(spec.queries.length, 2);
        assert.strictEqual(spec.queries[0].name, '_validQuery');
        assert.strictEqual(spec.queries[1].name, 'invalidQuery');
    });

    test('Should handle operational principle', () => {
        const conceptContent = `concept User

operational principle
    after register (name: "alice") : (user: u)
    then _getById (id: u) : [user: alice]
    user alice should be retrievable`;

        const spec = parser.parseConceptSpec(conceptContent);

        assert.ok(spec.operationalPrinciple.includes('after register'));
        assert.ok(spec.operationalPrinciple.includes('then _getById'));
        assert.ok(spec.operationalPrinciple.includes('user alice should be retrievable'));
    });

    test('Should handle inline comments in fields', () => {
        const conceptContent = `<concept_spec>
concept User

state
    User
        name: String # user's display name
        email: String # primary email address
        age: Number # age in years
</concept_spec>`;

        const spec = parser.parseConceptSpec(conceptContent);

        assert.strictEqual(spec.name, 'User');
        assert.ok(spec.state.User);
        assert.strictEqual(spec.state.User.name, 'String');
        assert.strictEqual(spec.state.User.email, 'String');
        assert.strictEqual(spec.state.User.age, 'Number');
    });

    test('Should handle inline comments in actions', () => {
        const conceptContent = `<concept_spec>
concept User

actions
    register (name: String, email: String) : (user: User) # create new user
        create a new user account
</concept_spec>`;

        const spec = parser.parseConceptSpec(conceptContent);

        assert.strictEqual(spec.actions.length, 1);
        assert.strictEqual(spec.actions[0].name, 'register');
        assert.strictEqual(spec.actions[0].inputs.name, 'String');
        assert.strictEqual(spec.actions[0].inputs.email, 'String');
        assert.strictEqual(spec.actions[0].outputs.user, 'User');
    });

    test('Should parse array and optional types correctly', () => {
        const conceptContent = `<concept_spec>
concept User

state
    User
        tags: String[]
        score: Number | null
        metadata: Object[]
</concept_spec>`;

        const spec = parser.parseConceptSpec(conceptContent);

        assert.strictEqual(spec.name, 'User');
        assert.ok(spec.state.User);
        assert.strictEqual(spec.state.User.tags, 'String[]');
        assert.strictEqual(spec.state.User.score, 'Number | null');
        assert.strictEqual(spec.state.User.metadata, 'Object[]');
    });

    it('Should handle operational principle with complex text', () => {
        const conceptContent = `<concept_spec>
concept User

purpose
    Manages user accounts and profiles

state
    User
        name: String
        email: String

actions
    register(name: String, email: String): User | {error: String}

queries
    _getUser(id: String): User[]

operational principle
    After a user registers with register(name, email), they can be retrieved 
    using _getUser(id). The system maintains user data integrity by validating 
    email formats and ensuring unique usernames. Users can update their profiles
    through various actions, and the system tracks all changes for audit purposes.
    
    The registration process involves:
    1. Validating input parameters
    2. Checking for duplicate emails  
    3. Creating a new user record
    4. Returning the created user or an error
    
    Complex scenarios like password resets, email verification, and account 
    suspension are handled through additional actions that maintain the core
    principle of user data integrity.
</concept_spec>`;

        // This should not crash the parser
        const spec = parser.parseConceptSpec(conceptContent);
        
        assert.strictEqual(spec.name, 'User');
        assert.ok(spec.purpose);
        assert.ok(spec.state.User);
        assert.ok(spec.actions.length > 0);
        assert.ok(spec.queries.length > 0);
    });
});
