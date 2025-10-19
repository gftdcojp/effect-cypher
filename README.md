# effect-cypher

**Type-safe Neo4j client with Effect integration**

[![npm version](https://badge.fury.io/js/effect-cypher.svg)](https://badge.fury.io/js/effect-cypher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, type-safe Neo4j client that provides composable query building and execution with comprehensive error handling and resource management.

## ✨ Features

- **Type Safety**: Full TypeScript support with compile-time guarantees
- **Promise-based API**: Simple, modern async/await interface
- **Safe Query Building**: Parameterized Cypher queries with type-safe construction
- **Resource Management**: Automatic connection and session lifecycle management
- **Comprehensive Error Handling**: Structured error types with detailed context
- **Transaction Support**: Read and write transaction management
- **Hexagonal Architecture**: Clean separation of concerns with ports and adapters

## 🚀 Quick Start

```bash
pnpm add effect-cypher
# or
npm install effect-cypher
```

```typescript
import neo4j from "neo4j-driver";
import {
  createConfig,
  makeDriver,
  makeSession,
  runQuery,
  matchAdults
} from "effect-cypher";

// Create configuration
const config = createConfig("neo4j://localhost:7687", "neo4j", "password");

// Create driver and session
const driver = makeDriver(config);
const session = makeSession(driver);

try {
  // Build and execute query
  const query = matchAdults(20);
  const adults = await runQuery(session, query.cypher, query.params);
  console.log(adults);
} finally {
  await session.close();
  await driver.close();
}
```

## 📚 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Query Building](#query-building)
- [Transaction Management](#transaction-management)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## 📦 Installation

```bash
# Using pnpm (recommended)
pnpm add effect-cypher

# Using npm
npm install effect-cypher

# Using yarn
yarn add effect-cypher
```

### Install from GitHub Packages

```bash
# Using pnpm
pnpm add @gftdcojp/effect-cypher

# Using npm (requires auth setup)
npm install @gftdcojp/effect-cypher

# Using yarn (requires auth setup)
yarn add @gftdcojp/effect-cypher
```

For npm/yarn with GitHub Packages, you'll need to authenticate:

```bash
# Create a .npmrc file or run:
npm config set @gftdcojp:registry https://npm.pkg.github.com
# Then authenticate with your GitHub token
npm login --registry=https://npm.pkg.github.com
```

### Dependencies

```bash
pnpm add neo4j-driver
```

### Peer Dependencies

```bash
pnpm add effect
```

## ⚙️ Configuration

```typescript
import { createConfig } from "effect-cypher";

const config = createConfig(
  "neo4j://localhost:7687",  // Neo4j server URL
  "neo4j",                   // Username
  "password"                 // Password
);

// With additional options
const configWithOptions = createConfig(
  "neo4j://localhost:7687",
  "neo4j",
  "password",
  {
    database: "neo4j",       // Target database (optional)
    defaultTimeoutMs: 30000, // Query timeout (optional)
    connectionPoolSize: 10   // Connection pool size (optional)
  }
);
```

## 🔍 Query Building

Use the query builder for type-safe Cypher construction:

```typescript
import {
  findNodesByLabel,
  findNodeById,
  createNode,
  matchAdults
} from "effect-cypher";

// Find all Person nodes
const findAllQuery = findNodesByLabel("Person");

// Find specific person
const findByIdQuery = findNodeById("Person", "person-123");

// Create new person
const createQuery = createNode("Person", {
  id: "person-456",
  name: "Jane Doe",
  age: 28
});

// Domain-specific query
const adultsQuery = matchAdults(21);

console.log(adultsQuery.cypher);
// MATCH (person:Person) WHERE person.age >= $minAge RETURN {id: person.id, name: person.name, age: person.age}

console.log(adultsQuery.params);
// { minAge: 21 }
```

## 🔄 Transaction Management

```typescript
import { withReadTx, withWriteTx, makeSession } from "effect-cypher";

const session = makeSession(driver);

// Read transaction
const readResult = await withReadTx(session, async (tx) => {
  const result = await tx.run("MATCH (n) RETURN count(n)");
  return result.records[0].get(0);
});

// Write transaction
const writeResult = await withWriteTx(session, async (tx) => {
  await tx.run("CREATE (n:Node {prop: $value})", { value: "test" });
  return "created";
});
```

## 🚨 Error Handling

Comprehensive error handling with typed errors:

```typescript
import {
  QueryError,
  ConnectionError,
  ValidationError,
  isDomainErrorOf,
  runQuery
} from "effect-cypher";

try {
  const result = await runQuery(session, cypher, params);
  console.log(result);
} catch (error) {
  if (isDomainErrorOf(error, "QueryError")) {
    console.error("Query failed:", error.query, error.params);
  } else if (isDomainErrorOf(error, "ConnectionError")) {
    console.error("Connection failed:", error.url);
  }
  throw error;
}
```

## 🔬 AST IR and Deterministic Compilation

effect-cypher now provides a first-class AST (Abstract Syntax Tree) IR for building and normalizing queries:

```typescript
import {
  query,
  matchClause,
  whereClause,
  returnClause,
  node,
  binaryOp,
  property,
  param,
  normalize,
  compile,
  astHash
} from "effect-cypher";

// Build query using AST
const q = query(
  [
    matchClause(node("person", ["Person"])),
    whereClause(binaryOp(">=", property("person", "age"), param("minAge"))),
    returnClause([{ _tag: "Variable", name: "person" }])
  ],
  { minAge: 18 }
);

// Normalize for deterministic output
const normalized = normalize(q);

// Compile to Cypher (always produces same output for same normalized AST)
const result = compile(normalized);
console.log(result.cypher);
// MATCH (person:Person) WHERE person.age >= $minAge RETURN person

// Generate stable hash for caching/monitoring
const hash = astHash(normalized);
console.log(hash); // "a3f2b91c"
```

### Benefits

- **Deterministic**: Same normalized AST always produces identical Cypher
- **Algebraic Normalization**: Applies commutativity, associativity, double negation elimination
- **Cacheable**: Use AST hash as cache key
- **Testable**: Snapshot tests guarantee stable output

## 🏷️ Branded Types for Type Safety

Prevent value confusion with branded IDs and unit types:

```typescript
import { createNodeID, ms, seconds, secondsToMs, type NodeID } from "effect-cypher";

// Branded node IDs prevent mixing IDs from different domains
type PersonID = NodeID<"Person">;
type PostID = NodeID<"Post">;

const personId = createNodeID("Person", "person-123");
const postId = createNodeID("Post", "post-456");

// TypeScript prevents this:
// const wrong: PersonID = postId; // ❌ Type error!

// Unit-typed numbers prevent confusion
const timeout = ms(5000);
const delay = seconds(3);

// TypeScript prevents this:
// const mixed: Ms = delay; // ❌ Type error!

// Safe conversions
const timeoutInSeconds = msToSeconds(timeout);
```

## 📊 Observability and Monitoring

Track query performance with structured logging and metrics:

```typescript
import {
  LatencyTracker,
  createQueryMetrics,
  ConsoleQueryLogger
} from "effect-cypher";

// Track latency percentiles
const tracker = new LatencyTracker();
tracker.record(120);
tracker.record(145);
tracker.record(98);

const stats = tracker.getStats();
console.log(`P50: ${stats.p50}ms, P95: ${stats.p95}ms, P99: ${stats.p99}ms`);

// Log query execution with metrics
const logger = new ConsoleQueryLogger();
const metrics = createQueryMetrics(
  query,
  "MATCH (n) RETURN n",
  123,
  0,
  "plan-digest-abc"
);
logger.log(metrics);
// [Query] { astHash: "a3f2b91c", durationMs: 123, retries: 0, ... }
```

## 🔄 Effect Policies

Execute queries with retry, timeout, and circuit breaker policies:

```typescript
import * as Effect from "effect/Effect";
import {
  executeWithPolicies,
  retrySchedules,
  withCircuitBreaker,
  withIdempotency
} from "effect-cypher";

// Execute with timeout and retry
const program = executeWithPolicies(
  session,
  query,
  async (s, q) => runQuery(s, q.cypher, q.params),
  {
    timeoutMs: 5000,
    retrySchedule: retrySchedules.exponential(3),
    circuitBreakerName: "neo4j-queries",
    idempotencyKey: "unique-operation-id"
  }
);

// Run with Effect
Effect.runPromise(program).then(results => {
  console.log("Query succeeded:", results);
});

// Use circuit breaker for fault tolerance
const protectedQuery = withCircuitBreaker(
  Effect.promise(() => session.run("MATCH (n) RETURN n")),
  "neo4j-main"
);
```

## ✅ Invariant Checking

Define and validate graph invariants (∀∃ constraints):

```typescript
import {
  forAllExistsUnique,
  allNodesHaveProperty,
  propertyIsUnique,
  runInvariantsOrFail,
  exampleInvariants
} from "effect-cypher";

// Define custom invariants
const postHasAuthor = forAllExistsUnique(
  "Post has unique author",
  "Post",
  "AUTHORED",
  "Person"
);

const personHasName = allNodesHaveProperty(
  "Person has name",
  "Person",
  "name"
);

const personIdUnique = propertyIsUnique(
  "Person ID is unique",
  "Person",
  "id"
);

// Run invariants (exits with error if any fail)
await runInvariantsOrFail(session, [
  postHasAuthor,
  personHasName,
  personIdUnique
]);
// ✅ All invariant checks passed
//   ✓ Post has unique author
//   ✓ Person has name
//   ✓ Person ID is unique
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests only (requires Neo4j)
pnpm test:integration

# Run with coverage
pnpm test:coverage

# Run all tests with Docker Neo4j (auto-setup)
pnpm test:with-db
```

### Integration Testing with Docker

For integration tests that require a real Neo4j database:

```bash
# Start Neo4j with Docker Compose
pnpm run docker:up

# Wait for Neo4j to be ready (about 30 seconds)
# Then run integration tests
pnpm run test:integration

# Stop and clean up
pnpm run docker:down
```

The docker-compose setup provides:
- Neo4j 5.23 with authentication (neo4j/testpassword)
- Health checks to ensure database readiness
- Persistent data volumes for test data
- Automatic cleanup between test runs

Example integration test:

```typescript
import { describe, it, expect } from "vitest";
import { matchAdults } from "effect-cypher";

describe("matchAdults", () => {
  it("should build correct query", () => {
    const result = matchAdults(20);

    expect(result.cypher).toContain("MATCH");
    expect(result.cypher).toContain("Person");
    expect(result.cypher).toContain("age >=");
    expect(result.params).toEqual({ minAge: 20 });
  });
});
```

## 🏗️ Architecture

This library follows Hexagonal Architecture principles:

```
effect-cypher/
├── src/
│   ├── config/          # Configuration management
│   ├── core/           # Infrastructure (Driver, Session, Tx)
│   ├── cypher/         # Query building and execution
│   ├── errors/         # Domain error types
│   └── index.ts        # Public API
├── tests/              # Test files
└── package.json        # Package configuration
```

### Dependency Flow

```
UI/Controller
    ↓
Application Services (Use Cases)
    ↓
Ports (Interfaces)
    ↓
Adapters (Neo4j, Observability, etc.)
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone and install
git clone https://github.com/your-org/effect-cypher.git
cd effect-cypher
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Lint
pnpm lint
```

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Effect](https://effect.website/) - For the functional programming framework
- [Neo4j Driver](https://github.com/neo4j/neo4j-javascript-driver) - For the official Neo4j JavaScript driver
- [Neo4j](https://neo4j.com/) - For the world's leading graph database

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-org/effect-cypher/issues)
- Discussions: [GitHub Discussions](https://github.com/your-org/effect-cypher/discussions)

---

Made with ❤️ and TypeScript
