# @sonnenreich/concept-design-engine

The official Concept Design Engine for Next.js applications. Build modular, maintainable applications using the Concept Design methodology.

## Installation

### From GitHub Packages

```bash
# Configure npm to use GitHub Package Registry for @sonnenreich packages
echo "@sonnenreich:registry=https://npm.pkg.github.com" >> .npmrc

# Install the package
npm install @sonnenreich/concept-design-engine
```

### Alternative: Download from GitHub Releases

You can also download the package directly from the [GitHub Releases](https://github.com/sonnenreich/concept/releases) page.

## Quick Start

### 1. Create Your First Concept

#### Using MongoDB

```typescript
// concepts/user.ts
import { BaseMongoDBConcept } from '@sonnenreich/concept-design-engine';

export class UserConcept extends BaseMongoDBConcept {
    constructor(config: MongoDBConceptConfig) {
        super(config, 'users');
    }

    async register(input: { 
        email: string; 
        name: string 
    }): Promise<{ user: any } | { error: string }> {
        try {
            await this.ensureConnection();
            
            // Check for existing user
            const existing = await this.collection.findOne({ email: input.email });
            if (existing) {
                return { error: 'User already exists' };
            }

            const user = this.createRecord({
                id: this.generateId(),
                email: input.email,
                name: input.name
            });

            await this.collection.insertOne(user);
            return { user };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async _getUser(input: { id: string }): Promise<Array<any>> {
        try {
            await this.ensureConnection();
            const user = await this.collection.findOne({ id: input.id });
            return user ? [user] : [];
        } catch (error) {
            return [];
        }
    }
}
```

#### Using Prisma (SQL Databases)

```typescript
// concepts/user.ts
import { BasePrismaConcept } from '@sonnenreich/concept-design-engine';

export class UserConcept extends BasePrismaConcept {
    constructor(config: PrismaConceptConfig = {}) {
        super(config, 'user'); // Assumes Prisma model named 'User'
    }

    async register(input: { 
        email: string; 
        name: string 
    }): Promise<{ user: any } | { error: string }> {
        try {
            // Check for existing user
            const existing = await this.model.findUnique({
                where: { email: input.email }
            });
            
            if (existing) {
                return { error: 'User already exists' };
            }

            const user = await this.model.create({
                data: this.createRecord({
                    id: this.generateId(),
                    email: input.email,
                    name: input.name
                })
            });

            return { user };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async _getUser(input: { id: string }): Promise<Array<any>> {
        try {
            const user = await this.model.findUnique({
                where: { id: input.id }
            });
            return user ? [user] : [];
        } catch (error) {
            return [];
        }
    }
}
```

### 2. Set Up the Engine

#### With MongoDB

```typescript
// lib/engine.ts
import { createNextJSEngine } from '@sonnenreich/concept-design-engine';
import { UserConcept } from '@/concepts/user';

const mongoConfig = {
    connectionString: process.env.MONGODB_URL!,
    databaseName: process.env.DB_NAME || 'myapp'
};

export const engine = createNextJSEngine({
    concepts: {
        User: new UserConcept(mongoConfig)
    },
    enableTracing: process.env.NODE_ENV === 'development'
});
```

#### With Prisma

```typescript
// lib/engine.ts
import { createNextJSEngine } from '@sonnenreich/concept-design-engine';
import { PrismaClient } from '@prisma/client';
import { UserConcept } from '@/concepts/user';

const prisma = new PrismaClient();

export const engine = createNextJSEngine({
    concepts: {
        User: new UserConcept({ prisma })
    },
    enableTracing: process.env.NODE_ENV === 'development'
});
```

### 3. Create API Routes

```typescript
// app/api/[...path]/route.ts
import { createAPIRoute } from '@sonnenreich/concept-design-engine';
import { engine } from '@/lib/engine';

const handler = createAPIRoute(engine);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
```

### 4. Use in Components

```typescript
// app/register/page.tsx
'use client';

import { useState } from 'react';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const response = await fetch('/api/User/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
        });

        const result = await response.json();
        
        if ('error' in result) {
            alert(result.error);
        } else {
            alert('User registered successfully!');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required 
            />
            <input 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="Name"
                required 
            />
            <button type="submit">Register</button>
        </form>
    );
}
```

## Core Concepts

### Concepts
- **Single Purpose**: Each concept serves exactly one purpose
- **Independence**: Concepts cannot import or reference other concepts
- **State Isolation**: Each concept manages its own state independently

### Actions
- Take exactly one input object and return one output object
- Handle errors by returning `{ error: string }` instead of throwing
- Perform side effects and modify state

### Queries
- Pure functions that return arrays
- Must start with underscore (`_`)
- Side-effect free and read-only

### Synchronizations
- Connect concepts without creating dependencies
- React to actions and trigger other actions
- Enable complex workflows across concepts

## Advanced Usage

### Custom Synchronizations

```typescript
// syncs/user-welcome.ts
import { actions, Frames, Vars } from '@sonnenreich/concept-design-engine';

export const userWelcome = ({ input, output }: Vars) => ({
    when: actions(
        [User.register, { email: input.email, name: input.name }, { user: output.user }]
    ),
    where: (frames: Frames): Frames => {
        return frames; // Add filtering logic if needed
    },
    then: actions(
        [Email.send, { 
            to: output.user.email, 
            subject: 'Welcome!', 
            template: 'welcome' 
        }]
    )
});
```

### MongoDB Queries with Helpers

```typescript
import { MongoDBQueryHelpers } from '@sonnenreich/concept-design-engine';

async _searchUsers(input: { 
    name_contains?: string;
    createdAt_gt?: Date;
    status_in?: string[];
    page?: number;
    limit?: number;
}): Promise<Array<any>> {
    await this.ensureConnection();
    
    const filter = MongoDBQueryHelpers.toFilter(input);
    const sort = MongoDBQueryHelpers.toSort('createdAt', 'desc');
    
    let query = this.collection.find(filter).sort(sort);
    query = MongoDBQueryHelpers.applyPagination(query, input.page, input.limit);
    
    return await query.toArray();
}
```

## Environment Variables

```env
# .env.local
MONGODB_URL=mongodb://localhost:27017
DB_NAME=myapp
CONCEPT_TRACE=true  # Enable development tracing
```

## TypeScript Support

The engine is built with TypeScript and provides full type safety:

```typescript
import type { NextJSEngine, MongoDBConcept } from '@sonnenreich/concept-design-engine';

// All concepts and actions are fully typed
const result = await engine.concepts.User.register({
    email: "user@example.com",  // TypeScript knows this is required
    name: "John Doe"            // TypeScript knows this is required
});

// Result type is inferred: { user: any } | { error: string }
if ('error' in result) {
    // Handle error
} else {
    // Use result.user
}
```

## Testing

```typescript
// __tests__/user.test.ts
import { UserConcept } from '@/concepts/user';

describe('UserConcept', () => {
    let userConcept: UserConcept;

    beforeEach(async () => {
        userConcept = new UserConcept({
            connectionString: 'mongodb://localhost:27017',
            databaseName: 'test'
        });
        await userConcept.connect();
    });

    afterEach(async () => {
        await userConcept.disconnect();
    });

    it('should register a new user', async () => {
        const result = await userConcept.register({
            email: 'test@example.com',
            name: 'Test User'
        });

        expect('user' in result).toBe(true);
    });
});
```

## License

MIT

## Contributing

Please read our contributing guidelines and submit pull requests to help improve the Concept Design Engine.
