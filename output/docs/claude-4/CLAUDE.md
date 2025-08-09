# Concept Design Framework with Next.js

You are building software using **Concept Design**, a modular approach where applications are built from independent concepts connected by synchronizations. This project uses Next.js 15+ with TypeScript and the concept design framework.

## Tech Stack
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (strict mode)
- **Runtime**: Deno (preferred for simplified imports)
- **Database**: MongoDB with TypeScript driver
- **State**: Concept-based state management via synchronizations
- **Testing**: Real data/integrations only (no mocks unless explicitly requested)

## Project Structure
```
├── specs/                  # Concept specifications (.concept files)
├── concepts/               # TypeScript concept implementations
├── syncs/                  # Synchronization definitions
├── app/                    # Next.js application
│   ├── api/*/route.ts     # API routes proxying to concepts
│   ├── (ui)/page.tsx      # Main UI entry point
│   └── [dynamic]/         # Dynamic routes for domain entities
├── lib/sync/engine.ts     # Concept engine initialization
├── rules/docs/            # Framework documentation
└── tests/                 # Test suites
```

## Core Concept Design Principles

### Concepts
- **Single Purpose**: Each concept serves exactly one purpose and solves one problem
- **Independence**: Concepts cannot import or reference other concepts
- **Reusability**: Concepts should be highly reusable across different applications
- **State Isolation**: Each concept manages its own state independently

### Actions
- **Single Input/Output**: All actions take exactly one input object and return one output object
- **Error Handling**: Errors are not special - they're just another output pattern with an `error` key
- **Complete Specification**: Actions must specify all possible outcomes and transitions
- **Side-Effect Isolation**: Only actions can modify state or perform side-effects

### Queries
- **Pure Functions**: Queries must be side-effect free and return arrays
- **Underscore Prefix**: All query functions must start with `_` to distinguish from actions
- **Array Returns**: Queries always return arrays of objects to enable declarative composition
- **State Access**: Queries provide the only way to read concept state in synchronizations

## Implementation Patterns

### Concept Class Structure
```typescript
// concepts/user.ts
export class UserConcept {
    async register(input: { name: string, email: string }): Promise<{ user: string } | { error: string }> {
        // Implementation that either succeeds or returns error
    }
    
    async _findByEmail(input: { email: string }): Promise<Array<{ user: string, name: string }>> {
        // Pure function that returns array of results
    }
}
```

### Synchronization Pattern
```typescript
// syncs/userRegistration.ts
const UserRegistration = ({ user, email }: Vars) => ({
    when: actions(
        [API.request, { method: "POST", path: "/users" }, { request }],
    ),
    where: (frames: Frames): Frames => {
        return frames
            .query(User._validateEmail, { email }, { valid })
            .filter(($) => $[valid]);
    },
    then: actions(
        [User.register, { name, email }],
        [API.response, { request, user }],
    ),
});
```

### Next.js API Route Pattern
```typescript
// app/api/[...path]/route.ts
import { API } from '@/lib/sync/engine';

export async function POST(request: Request) {
    const body = await request.json();
    const url = new URL(request.url);
    
    const result = await API.request({
        method: 'POST',
        path: url.pathname,
        ...body
    });
    
    const response = await API._waitForResponse({ request: result.request });
    return Response.json(response);
}
```

### Engine Setup
```typescript
// lib/sync/engine.ts
import { SyncConcept } from '@/engine/mod';
import { APIConcept } from '@/concepts/api';
import { UserConcept } from '@/concepts/user';

const Sync = new SyncConcept();
const concepts = {
    API: new APIConcept(),
    User: new UserConcept(),
};

const { API, User } = Sync.instrument(concepts);

import * as syncs from '@/syncs';
Sync.register(syncs);

export { API, User };
```

## State Specification (SSF)

Use Simple State Form (SSF) for data modeling:

```
// Basic set declaration
a set of Users with
    a name String
    an email String
    an optional bio String
    a followers set of Users
    a status of ACTIVE or INACTIVE

// Subset with additional fields
a VerifiedUsers set of Users with
    a verifiedAt DateTime
    a verificationMethod String
```

### MongoDB Translation
- Each set/subset becomes a MongoDB collection
- `set of Type` becomes arrays: `fieldName: ObjectId[]`
- `optional` fields can be `null` or `undefined`
- Enumerations become string fields with validation

## Development Commands
- `npm run api`: Start development server with auth bypass for testing
- `npm run dev`: Start full development server
- `npm run build`: Production build
- `npm test`: Run test suite

## Critical Rules to Follow

### Database Operations
- **NEVER use `npx prisma db push --force-reset`** - This flag will terminate the process
- Use `npx prisma db push` for schema updates (without --force-reset)
- When updating DB schema, ignore linter errors initially as they take time to catch up

### Development Server
- Check for existing dev servers before starting new ones
- Use `npm run api` instead of `npm run dev` for API endpoint testing (enables auth bypass)
- Kill existing dev servers before running `npm run dev` or `npm run build`

### Testing Standards
- **Never mock AI calls** - Always use real AI integrations
- **Never create fake/mock data** unless explicitly requested
- Test concepts individually before integration
- Use engine TRACE logging to verify sync execution

### Communication Style
- No celebration language - Avoid "mission accomplished" type statements
- No production claims - Don't say you have a "production system"
- Focus on functionality - Describe what actually works, not aspirational claims

## Anti-Patterns to Avoid
- **Concept Dependencies**: Never import one concept from another
- **Shared State**: Each concept manages its own state independently
- **Direct Database Access**: Always go through concept actions/queries
- **Synchronous Syncs**: Use async patterns for all concept operations
- **Mock Data**: Never create fake or mock data unless explicitly requested

## File Management
- Always prefer editing existing files over creating new ones
- Never proactively create .md or README files
- Use absolute paths over relative paths when possible

## Development Workflow

### 1. Design Phase
1. Define Purpose: Start with a clear, single-purpose statement
2. Specify State: Use SSF to define data structure
3. Design Actions: Define all input/output patterns and error cases
4. Add Queries: Create pure functions for state access
5. Write Operational Principle: Demonstrate how the concept fulfills its purpose

### 2. Implementation Phase
1. Create Concept Class: Implement in TypeScript following patterns
2. Set Up Database: Configure MongoDB collections and indexes
3. Implement Actions: Handle all specified input/output cases
4. Implement Queries: Create pure, side-effect-free functions
5. Add Validation: Validate inputs and handle edge cases

### 3. Integration Phase
1. Design Synchronizations: Define how concepts interact
2. Implement Syncs: Use TypeScript sync patterns
3. Register Engine: Set up concept registration and instrumentation
4. Create API Routes: Generate Next.js routes for external access
5. Build UI Components: Create React components that use the APIs

## Reference Documentation
- [Concept Design Guide](rules/docs/concept-design.md)
- [Concept Implementation](rules/docs/concept-implementation.md)
- [State Specification](rules/docs/concept-state-specification.md)
- [Synchronization Implementation](rules/docs/synchronization-implementation.md)
- [Next.js Stack Specification](rules/specs/stacks/nextjs/README.md)

## Instructions for Claude
- Always follow concept design principles when architecting solutions
- Use TypeScript strict mode and provide proper type definitions
- Implement error handling as return values, not exceptions
- Prefer server components and server actions in Next.js
- Use the concept engine for all state management and business logic
- Reference existing documentation rather than duplicating information
- Test with real data and integrations, never mocks
- Focus on single-purpose, reusable, independent concepts
- Use SSF for all state modeling and MongoDB for persistence
- Follow the established synchronization patterns for concept composition
