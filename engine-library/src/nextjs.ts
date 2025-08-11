/**
 * Next.js Integration Utilities for Concept Design Engine
 */

import { SyncConcept } from './sync';
import { ConceptInterface } from './types';

export interface NextJSEngineConfig {
    concepts: Record<string, ConceptInterface>;
    syncs?: Record<string, any>;
    enableTracing?: boolean;
    apiPrefix?: string;
}

export interface NextJSEngine {
    sync: SyncConcept;
    concepts: Record<string, ConceptInterface>;
    handleAPIRequest: (request: {
        method: string;
        path: string;
        body?: any;
        query?: Record<string, string>;
    }) => Promise<Response>;
}

/**
 * Create a concept engine configured for Next.js applications
 */
export function createNextJSEngine(config: NextJSEngineConfig): NextJSEngine {
    const sync = new SyncConcept();
    
    // Enable tracing if requested
    if (config.enableTracing) {
        // Set up tracing configuration
        process.env.CONCEPT_TRACE = 'true';
    }

    // Instrument concepts for reactivity
    const instrumentedConcepts = sync.instrument(config.concepts);

    // Register synchronizations if provided
    if (config.syncs) {
        sync.register(config.syncs);
    }

    return {
        sync,
        concepts: instrumentedConcepts,
        handleAPIRequest: createAPIHandler(instrumentedConcepts, config.apiPrefix || '/api')
    };
}

/**
 * Create an API request handler for Next.js API routes
 */
function createAPIHandler(
    concepts: Record<string, ConceptInterface>,
    prefix: string
) {
    return async function handleAPIRequest(request: {
        method: string;
        path: string;
        body?: any;
        query?: Record<string, string>;
    }): Promise<Response> {
        try {
            // Extract concept and action from path
            const pathWithoutPrefix = request.path.replace(prefix, '');
            const [conceptName, actionName] = pathWithoutPrefix.split('/').filter(Boolean);

            if (!conceptName || !actionName) {
                return new Response(
                    JSON.stringify({ error: 'Invalid API path. Expected /{concept}/{action}' }),
                    { 
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            const concept = concepts[conceptName];
            if (!concept) {
                return new Response(
                    JSON.stringify({ error: `Concept '${conceptName}' not found` }),
                    { 
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            // Check if the action exists on the concept
            const actionFunc = (concept as any)[actionName];
            if (typeof actionFunc !== 'function') {
                return new Response(
                    JSON.stringify({ error: `Action '${actionName}' not found on concept '${conceptName}'` }),
                    { 
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            // Prepare input based on HTTP method
            let input: any = {};
            if (request.method === 'GET') {
                input = request.query || {};
            } else if (request.method === 'POST' || request.method === 'PUT') {
                input = request.body || {};
            }

            // Call the concept action
            const result = await actionFunc.call(concept, input);

            return new Response(
                JSON.stringify(result),
                { 
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );

        } catch (error) {
            console.error('API request error:', error);
            return new Response(
                JSON.stringify({ 
                    error: 'Internal server error',
                    details: error instanceof Error ? error.message : 'Unknown error'
                }),
                { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    };
}

/**
 * Create a Next.js API route handler
 */
export function createAPIRoute(engine: NextJSEngine) {
    return async function handler(request: Request) {
        const url = new URL(request.url);
        
        const requestData = {
            method: request.method,
            path: url.pathname,
            query: Object.fromEntries(url.searchParams.entries()),
            body: request.method !== 'GET' ? await request.json().catch(() => ({})) : undefined
        };

        return engine.handleAPIRequest(requestData);
    };
}

/**
 * Utility to generate Next.js API routes for all concept actions
 */
export function generateAPIRoutes(concepts: Record<string, ConceptInterface>): string {
    const routes: string[] = [];

    for (const [conceptName, concept] of Object.entries(concepts)) {
        const prototype = Object.getPrototypeOf(concept);
        const methodNames = Object.getOwnPropertyNames(prototype)
            .filter(name => name !== 'constructor' && typeof (concept as any)[name] === 'function');

        for (const methodName of methodNames) {
            if (!methodName.startsWith('_')) { // Actions (not queries)
                routes.push(`/api/${conceptName}/${methodName}`);
            }
        }
    }

    return `// Generated API Routes for Concept Design Engine
// Place this in your Next.js app/api/[...path]/route.ts file

import { createAPIRoute } from '@concept-design/engine';
import { engine } from '@/lib/engine'; // Your engine configuration

const handler = createAPIRoute(engine);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;

// Available routes:
${routes.map(route => `// ${route}`).join('\n')}
`;
}
