# effect-cypher

**Type-safe, monadic Neo4j client using Effect and Cypher Builder**

[![npm version](https://badge.fury.io/js/effect-cypher.svg)](https://badge.fury.io/js/effect-cypher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, type-safe Neo4j client that leverages the power of [Effect](https://effect.website/) for composable, observable side effects and [@neo4j/cypher-builder](https://github.com/neo4j/cypher-builder) for safe Cypher query construction.

## ✨ Features

- **Type Safety**: Full TypeScript support with compile-time guarantees
- **Effect Integration**: Monadic error handling and composable side effects
- **Schema Validation**: Runtime type validation using effect/Schema
- **Safe Query Building**: Parameterized Cypher queries with @neo4j/cypher-builder
- **Resource Management**: Automatic connection and session lifecycle management
- **Observability**: OpenTelemetry integration for distributed tracing
- **Resilience**: Built-in retry, timeout, and circuit breaker patterns
- **Hexagonal Architecture**: Clean separation of concerns with ports and adapters

## 🚀 Quick Start

```bash
pnpm add effect-cypher
# or
npm install effect-cypher
```

```typescript
import * as Effect from "effect/Effect";
import {
  DriverLayer,
  SessionLayer,
  runQuery,
  matchAdults,
  Person
} from "effect-cypher";

// Define your schema
const Person = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  age: Schema.Number
});

// Create configuration
const config = createConfig("neo4j://localhost:7687", "neo4j", "password");

// Build query
const query = matchAdults(20);

// Execute query with manual session management
const driver = neo4j.driver(config.url, neo4j.auth.basic(config.user, config.password));
const session = driver.session();

try {
  const adults = await runQuery(session, query.cypher, query.params, Person);
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
- [Schema Validation](#schema-validation)
- [Transaction Management](#transaction-management)
- [Error Handling](#error-handling)
- [Observability](#observability)
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

### Peer Dependencies

```bash
pnpm add effect @neo4j/cypher-builder neo4j-driver
```

## ⚙️ Configuration

```typescript
import { createConfig } from "effect-cypher";

const config = createConfig(
  "neo4j://localhost:7687",  // Neo4j server URL
  "neo4j",                   // Username
  "password",                // Password
  {
    database: "neo4j",       // Target database (optional)
    defaultTimeoutMs: 30000, // Query timeout (optional)
    connectionPoolSize: 10,  // Connection pool size (optional)
  }
);
```

## 🔍 Query Building

Use the fluent query builder for type-safe Cypher construction:

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
const findByIdQuery = findNodeById("Person", "id", "person-123");

// Create new person
const createQuery = createNode("Person", {
  id: "person-456",
  name: "Jane Doe",
  age: 28
});

// Domain-specific query
const adultsQuery = matchAdults(21);

console.log(adultsQuery.cypher);
// MATCH (person:Person)
// WHERE person.age >= $param0
// RETURN {id: person.id, name: person.name, age: person.age}

console.log(adultsQuery.params);
// { param0: 21 }
```

## 📋 Schema Validation

Define and validate your domain models:

```typescript
import * as Schema from "effect/Schema";
import { runQuery } from "effect-cypher";

// Define schema
const PersonSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  age: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
  email: Schema.optional(Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+$/))),
});

// Execute query with validation
const result = await Effect.runPromise(
  runQuery(cypher, params, PersonSchema).pipe(
    Effect.provide(DriverLayer(config)),
    Effect.provide(SessionLayer())
  )
);
// result: readonly Person[] - fully typed and validated
```

## 🔄 Transaction Management

```typescript
import { withReadTx, withWriteTx } from "effect-cypher";

const readOperation = withReadTx(async (tx) => {
  // Read operations
  const result = await tx.run("MATCH (n) RETURN count(n)");
  return result.records[0].get(0);
});

const writeOperation = withWriteTx(async (tx) => {
  // Write operations with automatic commit/rollback
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
  isDomainErrorOf
} from "effect-cypher";

const program = Effect.gen(function* (_) {
  try {
    const result = yield* _(runQuery(cypher, params, schema));
    return result;
  } catch (error) {
    if (isDomainErrorOf(error, "QueryError")) {
      console.error("Query failed:", error.query, error.params);
    } else if (isDomainErrorOf(error, "ConnectionError")) {
      console.error("Connection failed:", error.url);
    }
    throw error;
  }
});
```

## 📊 Observability

Enable OpenTelemetry integration:

```typescript
import { setTracer, setMeter, ObservabilityLayer } from "effect-cypher";

// Initialize (usually during app startup)
setTracer(opentelemetryTracer);
setMeter(opentelemetryMeter);

// Queries are automatically instrumented
const result = await Effect.runPromise(
  ObservabilityLayer.instrument(
    "findPersons",
    cypher,
    params,
    runQuery(cypher, params, schema)
  )
);
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run integration tests (requires Neo4j)
pnpm test:integration
```

Example unit test:

```typescript
import { describe, it, expect } from "vitest";
import { matchAdults } from "effect-cypher";

describe("matchAdults", () => {
  it("should build correct query", () => {
    const result = matchAdults(20);

    expect(result.cypher).toContain("MATCH");
    expect(result.cypher).toContain("Person");
    expect(result.cypher).toContain("age >=");
    expect(result.params).toEqual({ param0: 20 });
  });
});
```

## 🏗️ Architecture

This library follows Hexagonal Architecture principles:

```
effect-cypher/
├── config/          # Configuration schemas
├── core/           # Infrastructure layers (Driver, Session, Tx)
├── cypher/         # Query building and execution
├── schema/         # Domain schemas and codecs
├── metrics/        # Observability adapters
├── errors/         # Domain error types
├── util/           # Utilities (retry, timeout, etc.)
└── index.ts        # Public API
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

- [Effect](https://effect.website/) - For the amazing functional programming framework
- [@neo4j/cypher-builder](https://github.com/neo4j/cypher-builder) - For safe Cypher query building
- [Neo4j](https://neo4j.com/) - For the world's leading graph database

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-org/effect-cypher/issues)
- Discussions: [GitHub Discussions](https://github.com/your-org/effect-cypher/discussions)

---

Made with ❤️ and TypeScript
