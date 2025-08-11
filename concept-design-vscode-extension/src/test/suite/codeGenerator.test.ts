import * as assert from 'assert';
import { ConceptCodeGenerator } from '../../codegen/conceptGenerator';
import { SyncCodeGenerator } from '../../codegen/syncGenerator';
import { ConceptSpec } from '../../parsers/conceptParser';

suite('Code Generator Test Suite', () => {
    const conceptGenerator = new ConceptCodeGenerator();
    const syncGenerator = new SyncCodeGenerator();

    suite('Concept Code Generation', () => {
        test('Should generate basic concept implementation', () => {
            const spec: ConceptSpec = {
                name: 'User',
                purpose: 'to manage user information',
                state: {
                    User: {
                        name: 'String',
                        email: 'String',
                        active: 'Boolean'
                    }
                },
                actions: [
                    {
                        name: 'register',
                        signature: 'register (name: String, email: String) : (user: String)',
                        inputs: { name: 'String', email: 'String' },
                        outputs: { user: 'String' },
                        description: 'Register a new user'
                    }
                ],
                queries: [
                    {
                        name: '_getById',
                        signature: '_getById (id: String) : [user: User]',
                        inputs: { id: 'String' },
                        outputs: { user: 'User' },
                        description: 'Get user by ID'
                    }
                ],
                operationalPrinciple: 'Users can be registered and retrieved'
            };

            const code = conceptGenerator.generateConceptImplementation(spec, '/path/to/output.ts', false);

            // Should include class definition
            assert.ok(code.includes('export class UserConcept'));
            
            // Should include interface definition
            assert.ok(code.includes('export interface UserRecord'));
            
            // Should include Prisma import
            assert.ok(code.includes('import { PrismaClient }'));
            
            // Should include action method
            assert.ok(code.includes('async register('));
            
            // Should include query method
            assert.ok(code.includes('async _getById('));
            
            // Should include proper error handling
            assert.ok(code.includes('{ error: string }'));
        });

        test('Should generate MongoDB implementation when specified', () => {
            const spec: ConceptSpec = {
                name: 'Product',
                purpose: 'to manage products',
                state: {
                    Product: {
                        name: 'String',
                        price: 'Number'
                    }
                },
                actions: [],
                queries: [],
                operationalPrinciple: ''
            };

            const code = conceptGenerator.generateConceptImplementation(spec, '/path/to/output.ts', true);

            // Should include MongoDB imports
            assert.ok(code.includes('import { MongoClient, Db, Collection'));
            
            // Should use collection instead of Prisma
            assert.ok(code.includes('Collection<ProductRecord>'));
            assert.ok(code.includes('db.collection('));
        });

        test('Should handle complex types correctly', () => {
            const spec: ConceptSpec = {
                name: 'Test',
                purpose: 'testing',
                state: {
                    Entity: {
                        optionalField: 'String?',
                        arrayField: '[String]',
                        dateField: 'DateTime',
                        objectField: 'Object'
                    }
                },
                actions: [{
                    name: 'testAction',
                    signature: 'testAction (data: Object) : (result: Boolean)',
                    inputs: { data: 'Object' },
                    outputs: { result: 'Boolean' },
                    description: 'Test action'
                }],
                queries: [],
                operationalPrinciple: ''
            };

            const code = conceptGenerator.generateConceptImplementation(spec, '/path/to/output.ts', false);

            // Should map types correctly
            assert.ok(code.includes('string | null')); // optional field
            assert.ok(code.includes('string[]')); // array field
            assert.ok(code.includes('Date')); // date field
            assert.ok(code.includes('any')); // object field
        });

        test('Should generate proper input/output types', () => {
            const spec: ConceptSpec = {
                name: 'Order',
                purpose: 'manage orders',
                state: {},
                actions: [{
                    name: 'createOrder',
                    signature: 'createOrder (customerId: String, items: [Object], total: Number) : (orderId: String, success: Boolean)',
                    inputs: { customerId: 'String', items: '[Object]', total: 'Number' },
                    outputs: { orderId: 'String', success: 'Boolean' },
                    description: 'Create a new order'
                }],
                queries: [{
                    name: '_getOrders',
                    signature: '_getOrders (customerId: String) : [orders: Order]',
                    inputs: { customerId: 'String' },
                    outputs: { orders: 'Order' },
                    description: 'Get customer orders'
                }],
                operationalPrinciple: ''
            };

            const code = conceptGenerator.generateConceptImplementation(spec, '/path/to/output.ts', false);

            // Should generate correct input type
            assert.ok(code.includes('{ customerId: string; items: any[]; total: number }'));
            
            // Should generate correct output type
            assert.ok(code.includes('{ orderId: string; success: boolean }'));
        });
    });

    suite('Sync Code Generation', () => {
        test('Should generate basic sync template', () => {
            const code = syncGenerator.generateSyncTemplate('UserRegistration', '/path/to/sync.ts');

            // Should include export statement
            assert.ok(code.includes('export const UserRegistration'));
            
            // Should include required imports
            assert.ok(code.includes('import { actions, Frames, Vars }'));
            
            // Should include sync structure
            assert.ok(code.includes('when: actions('));
            assert.ok(code.includes('where: (frames: Frames)'));
            assert.ok(code.includes('then: actions('));
            
            // Should include template comments
            assert.ok(code.includes('// Define triggering action patterns'));
            assert.ok(code.includes('// Add filtering and query logic'));
            assert.ok(code.includes('// Define consequent actions'));
        });

        test('Should generate sync with proper variable destructuring', () => {
            const code = syncGenerator.generateSyncTemplate('ComplexSync', '/path/to/sync.ts');

            // Should include variable destructuring
            assert.ok(code.includes('({ input, output, variable }: Vars)'));
            
            // Should include frames filtering
            assert.ok(code.includes('frames.filter'));
        });

        test('Should generate from sync specification', () => {
            const syncSpec = {
                name: 'TestSync',
                when: [{
                    concept: 'User',
                    action: 'register',
                    inputs: { name: 'testName' },
                    outputs: { user: 'userId' }
                }],
                where: [],
                then: [{
                    concept: 'Email',
                    action: 'send',
                    inputs: { to: 'userId' },
                    outputs: {}
                }]
            };

            const code = syncGenerator.generateSyncImplementation(syncSpec, '/path/to/sync.ts');

            // Should include the sync name
            assert.ok(code.includes('export const TestSync'));
            
            // Should include concept actions
            assert.ok(code.includes('User.register'));
            assert.ok(code.includes('Email.send'));
            
            // Should include variable destructuring
            assert.ok(code.includes('testName') || code.includes('userId'));
        });
    });

    suite('Type Mapping', () => {
        test('Should map SSF types to TypeScript correctly', () => {
            const generator = new ConceptCodeGenerator();
            
            // Access private method through any cast for testing
            const mapType = (generator as any).mapToTypeScriptType.bind(generator);
            
            assert.strictEqual(mapType('String'), 'string');
            assert.strictEqual(mapType('Number'), 'number');
            assert.strictEqual(mapType('Boolean'), 'boolean');
            assert.strictEqual(mapType('Flag'), 'boolean');
            assert.strictEqual(mapType('Date'), 'Date');
            assert.strictEqual(mapType('DateTime'), 'Date');
            assert.strictEqual(mapType('ObjectId'), 'string');
            assert.strictEqual(mapType('Object'), 'any');
            
            // Test optional types
            assert.strictEqual(mapType('String?'), 'string | null');
            assert.strictEqual(mapType('Number?'), 'number | null');
            
            // Test array types
            assert.strictEqual(mapType('[String]'), 'string[]');
            assert.strictEqual(mapType('[Number]'), 'number[]');
            assert.strictEqual(mapType('[Object]'), 'any[]');
            
            // Test complex combinations
            assert.strictEqual(mapType('[String]?'), 'string[] | null');
        });
    });
});
