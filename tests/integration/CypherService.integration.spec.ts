// Merkle DAG: integration_test_v1 -> CypherServiceIntegration
// Integration tests for CypherService with real Neo4j database
// Dependencies: [test-config, CypherService]

import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { waitForNeo4j, cleanupTestData, createTestDriver, createTestSession } from "./test-config";
import { runQuery, runQueryRaw } from "../../src/cypher/CypherService";
import * as Schema from "effect/Schema";
import neo4j from "neo4j-driver";

describe("CypherService Integration Tests", () => {
  let driver: neo4j.Driver;
  let session: neo4j.Session;

  beforeAll(async () => {
    // Wait for Neo4j to be ready
    await waitForNeo4j();
    // Create driver and session
    driver = createTestDriver();
    session = createTestSession(driver, true); // Write session for tests
  }, 60000); // 60 second timeout

  afterAll(async () => {
    // Close session and driver
    if (session) await session.close();
    if (driver) await driver.close();
    // Clean up test data
    await cleanupTestData();
  });

  describe("Basic CRUD Operations", () => {
    it("should create and query nodes", async () => {
      // Define result schema
      const personSchema = Schema.Struct({
        name: Schema.String,
        age: Schema.Number,
      });

      // Create a test node
      const createCypher = "CREATE (p:Person {name: $name, age: $age})";
      const createParams = { name: "Alice", age: 30 };

      await runQueryRaw(session, createCypher, createParams);

      // Query the created node
      const queryCypher = "MATCH (p:Person {name: $name}) RETURN {name: p.name, age: p.age}";
      const queryParams = { name: "Alice" };

      const results = await runQuery(session, queryCypher, queryParams, personSchema);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Alice");
      expect(results[0].age).toBe(30);
    });

    it("should create and query relationships", async () => {
      // Define result schema
      const relationshipSchema = Schema.Struct({
        person: Schema.Struct({
          name: Schema.String,
        }),
        company: Schema.Struct({
          name: Schema.String,
        }),
        since: Schema.Number,
      });

      // Create nodes and relationship
      const createCypher = `
        CREATE (p:Person {name: $personName}),
               (c:Company {name: $companyName}),
               (p)-[r:WORKS_AT {since: $since}]->(c)
      `;
      const createParams = { personName: "Bob", companyName: "TechCorp", since: 2020 };

      await runQueryRaw(session, createCypher, createParams);

      // Query the relationship
      const queryCypher = `
        MATCH (p:Person {name: $personName})-[r:WORKS_AT]->(c:Company {name: $companyName})
        RETURN {person: {name: p.name}, company: {name: c.name}, since: r.since}
      `;
      const queryParams = { personName: "Bob", companyName: "TechCorp" };

      const results = await runQuery(session, queryCypher, queryParams, relationshipSchema);

      expect(results).toHaveLength(1);
      expect(results[0].person.name).toBe("Bob");
      expect(results[0].company.name).toBe("TechCorp");
      expect(results[0].since).toBe(2020);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid Cypher syntax", async () => {
      const dummySchema = Schema.Struct({ dummy: Schema.String });

      await expect(
        runQuery(session, "INVALID CYPHER SYNTAX", {}, dummySchema)
      ).rejects.toThrow();
    });
  });
});
