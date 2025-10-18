// Merkle DAG: project_story -> process_network
// Process Network Story for Effect × Cypher Package
// This defines the computational graph for building a type-safe, monadic Neo4j client

local base = {
  // Core Principles
  principles: {
    "SOLID": "Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion",
    "Occam": "Entropic minimization - prefer simplest solution with minimal dependencies",
    "Hexagonal": "Ports/Adapters separation - decouple core from infrastructure",
    "Effect": "Algebraic effects for composable, observable side effects",
    "TypeSafety": "Types as contracts - compile-time guarantees for runtime safety"
  },

  // Process Network Nodes (Merkle DAG)
  nodes: {
    // Configuration Layer - Root of dependency tree
    config: {
      "Neo4jConfig": {
        hash: "config_schema_v1",
        deps: [],
        purpose: "Type-safe configuration for Neo4j connection parameters",
        outputs: ["Neo4jConfig", "ValidationRules"]
      }
    },

    // Core Infrastructure Layer - Driver/Session management
    core: {
      "DriverLayer": {
        hash: "driver_layer_v1",
        deps: ["Neo4jConfig"],
        purpose: "Resource-safe driver lifecycle management via Effect Layer",
        outputs: ["DriverTag", "ScopedDriver"]
      },
      "SessionLayer": {
        hash: "session_layer_v1",
        deps: ["DriverLayer"],
        purpose: "Session lifecycle with automatic cleanup",
        outputs: ["SessionTag", "ScopedSession"]
      },
      "TxManager": {
        hash: "tx_manager_v1",
        deps: ["SessionLayer"],
        purpose: "Transaction management with retry/timeout policies",
        outputs: ["withReadTx", "withWriteTx", "TxScope"]
      }
    },

    // Cypher DSL Layer - Query building and execution
    cypher: {
      "QueryBuilder": {
        hash: "query_builder_v1",
        deps: [],
        purpose: "Type-safe Cypher query construction using @neo4j/cypher-builder",
        outputs: ["QueryAST", "ParametrizedQuery", "BuildResult"]
      },
      "CypherService": {
        hash: "cypher_service_v1",
        deps: ["SessionLayer", "Codec"],
        purpose: "Effect-based query execution with result decoding",
        outputs: ["runQuery", "runQuerySingle", "QueryError"]
      }
    },

    // Schema Layer - Type-safe result decoding
    schema: {
      "Codec": {
        hash: "codec_v1",
        deps: [],
        purpose: "effect/Schema-based decoders for Neo4j results",
        outputs: ["NodeCodec", "RelationshipCodec", "PathCodec"]
      }
    },

    // Observability Layer - Monitoring and error tracking
    metrics: {
      "OtelLayer": {
        hash: "otel_layer_v1",
        deps: ["CypherService"],
        purpose: "OpenTelemetry integration for distributed tracing",
        outputs: ["QuerySpan", "MetricCounters", "ErrorReporting"]
      }
    },

    // Error Handling Layer
    errors: {
      "DomainError": {
        hash: "domain_error_v1",
        deps: [],
        purpose: "Domain-specific error types with structured context",
        outputs: ["QueryError", "ConnectionError", "ValidationError"]
      }
    },

    // Utilities Layer
    util: {
      "RetryPolicy": {
        hash: "retry_policy_v1",
        deps: [],
        purpose: "Common retry/timeout policies using Effect/Schedule",
        outputs: ["withRetry", "withTimeout", "CircuitBreaker"]
      }
    }
  },

  // Dependency Edges (Topological Order)
  edges: [
    // Config has no dependencies
    { from: "Neo4jConfig", to: "DriverLayer" },
    { from: "DriverLayer", to: "SessionLayer" },
    { from: "SessionLayer", to: "TxManager" },
    { from: "SessionLayer", to: "CypherService" },
    { from: "Codec", to: "CypherService" },
    { from: "CypherService", to: "OtelLayer" },
    // QueryBuilder and Codec are independent
    // Errors and Util are independent utilities
  ],

  // Build Process (Topological Sort)
  build_order: [
    "Neo4jConfig",     // 1. Configuration
    "DriverLayer",     // 2. Infrastructure
    "SessionLayer",    // 3. Session management
    "TxManager",       // 4. Transaction management
    "QueryBuilder",    // 5. Query DSL (parallel with config)
    "Codec",           // 6. Schema decoders (parallel)
    "CypherService",   // 7. Query execution
    "OtelLayer",       // 8. Observability
    "DomainError",     // Utilities (parallel)
    "RetryPolicy"
  ],

  // Quality Gates
  quality_gates: {
    "TypeSafety": "All public APIs must have strict TypeScript types",
    "EffectComposition": "All side effects must be Effect-based",
    "ResourceSafety": "All resources must have scoped lifecycles",
    "TestCoverage": "Minimum 80% coverage for core modules",
    "Performance": "Query execution must be observable and optimizable"
  },

  // Extension Points
  extension_points: {
    "CustomCodecs": "Add new Schema decoders for domain types",
    "QueryExtensions": "Extend QueryBuilder with domain-specific patterns",
    "Middleware": "Add Effect middleware for cross-cutting concerns",
    "Transport": "Swap Neo4j driver for testing or different backends"
  }
};

// Export the complete story
base
