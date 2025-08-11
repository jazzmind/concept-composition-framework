
# Debugging Concept Design Applications

The modular nature of concept design provides powerful debugging advantages. Since concepts are independent and synchronizations are declarative, you can isolate and debug issues systematically.

## Debugging Strategy

### 1. Isolate the Problem Domain

When something goes wrong, first identify which layer has the issue:

- **Concept Level**: Is a single concept not behaving correctly?
- **Synchronization Level**: Are concepts working individually but not composing properly?
- **Integration Level**: Are external systems (API, UI) not interfacing correctly?

### 2. Test Concepts in Isolation

The independence principle means you can test each concept separately:

```typescript
// Test a concept directly without synchronizations
const urlShortening = new UrlShorteningConcept();
const result = await urlShortening.register({
  shortUrlSuffix: "test123",
  shortUrlBase: "https://short.ly", 
  targetUrl: "https://example.com"
});
console.log(result); // Should show {shortUrl: "..."} or {error: "..."}
```

### 3. Verify Synchronization Logic

Test synchronizations independently by manually triggering the `when` conditions and observing the `then` results.

## Engine Logging

The sync engine provides detailed logging to trace action flows:

```typescript
const Sync = new SyncConcept();
Sync.logging = Logging.TRACE; // Options: OFF, TRACE, VERBOSE
```

### Logging Levels

- **TRACE**: Simple summary of actions with inputs/outputs
- **VERBOSE**: Complete provenance tracking and synchronization matching
- **OFF**: No logging (production mode)

### Reading Trace Output

Trace logs show the flow of actions through your system:

```
[TRACE] Button.clicked({kind: "increment_counter"}) -> {}
[TRACE] -> Sync ButtonIncrement triggered
[TRACE] Counter.increment({}) -> {count: 5}
[TRACE] -> Sync NotifyWhenReachTen triggered  
[TRACE] Counter._getCount({}) -> [{count: 5}]
[TRACE] -> Sync NotifyWhenReachTen filtered out (count <= 10)
```

## Common Debugging Scenarios

### Concept Not Responding

**Symptoms**: Actions return unexpected results or errors

**Debug Steps**:
1. Test concept in isolation
2. Check input validation
3. Verify database connection and schema
4. Review action implementation logic

```typescript
// Debug concept directly
const concept = new MyConcept();
console.log(await concept.myAction({input: "test"}));
```

### Synchronizations Not Triggering

**Symptoms**: Actions occur but expected side effects don't happen

**Debug Steps**:
1. Enable TRACE logging
2. Verify `when` conditions match exactly
3. Check that concepts are instrumented
4. Validate variable bindings in `where` clauses

```typescript
// Check if concepts are instrumented
const {Button, Counter} = Sync.instrument({Button: new ButtonConcept(), Counter: new CounterConcept()});
// Use instrumented versions, not raw concepts
Button.clicked({kind: "test"});
```

### Flow Token Issues

**Symptoms**: Related actions don't group together in synchronizations

**Debug Steps**:
1. Trace flow tokens in VERBOSE mode
2. Ensure actions are triggered through synchronizations, not directly
3. Verify that external triggers create new flows properly

### Query Function Problems

**Symptoms**: `where` clauses don't filter correctly

**Debug Steps**:
1. Test query functions independently
2. Verify they return arrays
3. Check variable binding names match
4. Ensure queries are pure (no side effects)

```typescript
// Test query function directly
const results = await concept._myQuery({param: "value"});
console.log(results); // Should be an array
```

## Advanced Debugging Techniques

### Custom Logging

Create custom logging for specific debugging needs:

```typescript
// Custom action wrapper for debugging
const debugAction = (concept, actionName, input) => {
  console.log(`[DEBUG] ${actionName} input:`, input);
  const result = concept[actionName](input);
  console.log(`[DEBUG] ${actionName} output:`, result);
  return result;
};
```

### State Inspection

Use query functions to inspect concept state:

```typescript
// Check current state of a concept
const allUsers = await User._getAllUsers({});
console.log('Current users:', allUsers);
```

### Synchronization Testing

Test synchronizations in isolation:

```typescript
// Manually test synchronization logic
const frames = new Frames([{/* mock frame data */}]);
const result = await mySyncWhereClause(frames);
console.log('Filtered frames:', result);
```

## Performance Debugging

### Slow Queries

1. Profile MongoDB queries
2. Add appropriate indexes
3. Optimize query functions

### Memory Issues

1. Check for concept state accumulation
2. Verify proper cleanup in actions
3. Monitor frame processing in synchronizations

## Best Practices

1. **Start Simple**: Test the smallest possible case first
2. **Isolate Components**: Test concepts before synchronizations
3. **Use Logging**: Enable appropriate logging level for your issue
4. **Check Types**: TypeScript helps catch many issues at compile time
5. **Verify Independence**: Ensure concepts don't accidentally depend on each other

The modular architecture means debugging is systematic - you can always isolate the problem to a specific concept or synchronization, making complex systems much more manageable.
