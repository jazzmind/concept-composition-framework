/**
 * @concept-design/engine - Concept Design Engine for Next.js
 * 
 * Export the complete engine for use in Next.js applications
 */

// Core engine exports
export { SyncConcept } from './sync';
export { actions, Frames, Vars } from './mod';

// Types exports
export type {
    Action,
    ActionFunc,
    ConceptInterface,
    SyncInterface,
    Frame,
    Vars as EngineVars,
    ConceptMethods,
    SyncMethods
} from './types';

// Utility exports
export { uuid } from './util';

// Next.js specific utilities
export { createNextJSEngine, type NextJSEngineConfig } from './nextjs';

// MongoDB integration
export { 
    createMongoDBConcept, 
    BaseMongoDBConcept,
    MongoDBQueryHelpers,
    ExampleMongoDBConcept,
    type MongoDBConceptConfig,
    type MongoDBConcept 
} from './mongodb';

// Prisma integration
export { 
    createPrismaConcept, 
    BasePrismaConcept,
    PrismaQueryHelpers,
    PrismaTransactionHelpers,
    ExamplePrismaConcept,
    type PrismaConceptConfig,
    type PrismaConcept 
} from './prisma';
