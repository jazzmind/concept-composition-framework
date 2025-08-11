import * as assert from 'assert';
import { SyncSpecParser } from '../../parsers/syncParser';

suite('Sync Parser Test Suite', () => {
    const parser = new SyncSpecParser();

    test('Should parse basic sync structure', () => {
        const syncContent = `<sync_spec>
sync UserRegistration

when
    API.request (method: "POST", path: "/users", name: name, email: email) : (request: request)

then
    User.register (name: name, email: email)
</sync_spec>`;

        const spec = parser.parseSyncSpec(syncContent);

        assert.strictEqual(spec.name, 'UserRegistration');
        assert.ok(spec.when.length > 0);
        assert.ok(spec.then.length > 0);
    });

    test('Should parse sync with where clause', () => {
        const syncContent = `<sync_spec>
sync ConditionalSync

when
    Counter.increment () : (count: count)

where
    count > threshold

then
    Notification.notify (message: "Threshold exceeded")
</sync_spec>`;

        const spec = parser.parseSyncSpec(syncContent);

        assert.strictEqual(spec.name, 'ConditionalSync');
        assert.ok(spec.when.length > 0);
        assert.ok(spec.where.length > 0);
        assert.ok(spec.then.length > 0);
    });

    test('Should extract concept actions', () => {
        const syncContent = `<sync_spec>
sync MultiConceptSync

when
    User.register (name: "test") : (user: user)
    Profile.create (user: user, bio: "test") : (profile: profile)

then
    Email.send (to: user, subject: "Welcome")
    Analytics.track (event: "user_registered", user: user)
</sync_spec>`;

        const spec = parser.parseSyncSpec(syncContent);

        assert.strictEqual(spec.name, 'MultiConceptSync');
        
        // Should detect multiple concept actions
        const concepts = [...new Set([...spec.when, ...spec.then].map(a => a.concept))];
        assert.ok(concepts.includes('User'));
        assert.ok(concepts.includes('Profile'));
        assert.ok(concepts.includes('Email'));
        assert.ok(concepts.includes('Analytics'));
    });

    test('Should handle complex sync patterns', () => {
        const syncContent = `<sync_spec>
sync ComplexSync

when
    API.request (method: "POST", path: "/api/complex") : (request: request)
    Auth.validate (request: request) : (user: user)

where
    User._getById (id: user) : (userInfo: data)
    data.active === true

then
    Data.process (user: user, input: data)
    API.response (request: request, output: { success: true })
</sync_spec>`;

        const spec = parser.parseSyncSpec(syncContent);

        assert.strictEqual(spec.name, 'ComplexSync');
        assert.ok(spec.when.length >= 2);
        assert.ok(spec.where.length > 0);
        assert.ok(spec.then.length >= 2);
    });

    test('Should handle malformed sync gracefully', () => {
        const syncContent = `<sync_spec>
sync IncompleteSync

then
    SomeConcept.action ()
</sync_spec>`;

        const spec = parser.parseSyncSpec(syncContent);

        assert.strictEqual(spec.name, 'IncompleteSync');
        assert.strictEqual(spec.when.length, 0);
        assert.ok(spec.then.length > 0);
    });

    test('Should parse query method calls', () => {
        const syncContent = `<sync_spec>
sync QuerySync

when
    SomeConcept.action (id: id) : (result: result)

where
    User._getById (id: id) : (user: data)

then
    OtherConcept.update (data: data)
</sync_spec>`;

        const spec = parser.parseSyncSpec(syncContent);

        assert.strictEqual(spec.name, 'QuerySync');
        
        // Should detect the query method call
        const hasQueryCall = spec.where.some(condition => 
            condition.expression.includes('User._getById')
        );
        assert.ok(hasQueryCall);
    });

    test('Should handle inline comments in sync actions', () => {
        const syncContent = `<sync_spec>
sync UserRegistration

when
    API.request (method: "POST", path: "/users") : (request: request) # incoming API request

then
    User.register (name: name, email: email) # create the user
    Email.send (to: email, subject: "Welcome") # send welcome email
</sync_spec>`;

        const spec = parser.parseSyncSpec(syncContent);

        assert.strictEqual(spec.name, 'UserRegistration');
        assert.ok(spec.when.length > 0);
        assert.ok(spec.then.length > 0);
        
        // Verify that actions are parsed correctly despite inline comments
        const whenAction = spec.when[0];
        assert.strictEqual(whenAction.concept, 'API');
        assert.strictEqual(whenAction.action, 'request');
    });

    test('Should handle inline comments in where clauses', () => {
        const syncContent = `<sync_spec>
sync ConditionalSync

when
    Counter.increment () : (count: count)

where
    count > 5 # only when count exceeds threshold

then
    Notification.notify (message: "High count") # alert the user
</sync_spec>`;

        const spec = parser.parseSyncSpec(syncContent);

        assert.strictEqual(spec.name, 'ConditionalSync');
        assert.ok(spec.where.length > 0);
        
        // Verify that the condition is parsed without the comment
        const whereCondition = spec.where[0];
        assert.strictEqual(whereCondition.expression, 'count > 5');
    });
});
