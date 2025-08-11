# Implementing Concepts

## Core Implementation Principles

Concept implementations must maintain the independence and modularity that makes them effective for both human developers and AI systems.

### Class Structure
- **Language**: Use TypeScript for type safety and better tooling
- **Naming**: Each concept is a single class named `${name}Concept`
- **Location**: Store in `./concepts/${name}.ts` for clear organization
- **Independence**: No imports from other concepts - only external libraries and utilities

### Action Implementation
- **Single Input/Output**: All actions take exactly one input object and return one output object
- **Type Safety**: Input and output shapes must match the concept specification exactly
- **Naming**: Action method names must match specification names precisely
- **Error Handling**: Errors are just another output pattern with an `error` key
- **Side Effects**: Only actions can modify state or perform side effects

### Query Functions
- **Naming Convention**: MUST start with underscore `_` to distinguish from actions
- **Purity**: MUST NOT update state or perform side effects
- **Input**: Single argument with named keys like actions
- **Output**: Always return arrays to enable declarative composition
- **Purpose**: Enable synchronizations to filter and process state

### State Management
- **Isolation**: Each concept manages its own state independently
- **Persistence**: Use MongoDB with concept-specific collections
- **Schema**: Follow Simple State Form (SSF) translation rules
- **Validation**: Validate inputs at concept boundaries

## Implementation Example

```typescript
export class UrlShorteningConcept {
  private collection: Collection;

  constructor() {
    // Initialize MongoDB collection
    this.collection = db.collection('urlShortenings');
  }

  // Action: Create short URL
  async register(input: {
    shortUrlSuffix: string;
    shortUrlBase: string;
    targetUrl: string;
  }): Promise<{ shortUrl: string } | { error: string }> {
    try {
      const shortUrl = `${input.shortUrlBase}/${input.shortUrlSuffix}`;
      
      // Check if already exists
      const existing = await this.collection.findOne({ shortUrl });
      if (existing) {
        return { error: "Short URL already exists" };
      }

      // Create new shortening
      await this.collection.insertOne({
        shortUrl,
        targetUrl: input.targetUrl,
        createdAt: new Date()
      });

      return { shortUrl };
    } catch (e) {
      return { error: "Failed to create short URL" };
    }
  }

  // Query: Get all shortenings for analytics
  async _getAllShortenings(input: {}): Promise<Array<{
    shortUrl: string;
    targetUrl: string;
    createdAt: Date;
  }>> {
    const results = await this.collection.find({}).toArray();
    return results.map(doc => ({
      shortUrl: doc.shortUrl,
      targetUrl: doc.targetUrl,
      createdAt: doc.createdAt
    }));
  }
}
```

## Best Practices

### Maintainability
- **Stable Interface**: Well-designed concepts rarely need changes except new queries
- **Clear Purpose**: Each concept should solve exactly one problem
- **Complete Specification**: Handle all possible input/output cases explicitly

### Performance
- **Efficient Queries**: Design query functions for synchronization performance
- **Proper Indexing**: Index MongoDB fields used in queries
- **Lazy Loading**: Only load state when needed

### Testing
- **Unit Tests**: Test each action and query independently
- **Isolation**: Test concepts without dependencies on other concepts
- **Edge Cases**: Test all error conditions and boundary cases

## Database Integration

### MongoDB Setup
- **Driver**: Use TypeScript MongoDB driver for type safety
- **Configuration**: Store all config in environment variables
- **Database**: Share single database between concepts
- **Collections**: Use separate collections per concept for isolation
- **Schema**: Follow SSF to MongoDB translation rules

### Environment Configuration
```typescript
// Environment variables for database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'concept_app';
```

### Runtime Considerations
- **Deno Support**: Use generic import names without version numbers
- **Node.js Support**: Standard npm package imports work seamlessly
- **Error Handling**: Return structured error objects, never throw exceptions
- **Async/Await**: All database operations should be asynchronous

## LLM-Friendly Implementation

Concept implementations should be especially clear for AI systems:

### Clear Structure
- **Predictable Patterns**: Consistent action and query signatures
- **Explicit Types**: Full TypeScript type annotations
- **Self-Documenting**: Code that explains its purpose clearly

### Modular Design
- **Single Responsibility**: Each concept does one thing well
- **No Hidden Dependencies**: All requirements explicit
- **Clean Interfaces**: Simple input/output contracts

This structure enables AI coding assistants to:
- Understand concept purpose immediately
- Modify individual concepts safely
- Generate new concepts following established patterns
- Debug issues without understanding the entire system
