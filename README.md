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
