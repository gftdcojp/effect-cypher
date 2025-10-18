// Merkle DAG: test_config_v1 -> TestNeo4jConfig, createTestDriver, createTestSession
// Test configuration utilities for integration tests
// Dependencies: []

import neo4j, { type Driver, type Session } from "neo4j-driver";
import { createConfig, type Neo4jConfig } from "../../src/config/Neo4jConfig";

/**
 * Test configuration for Neo4j integration tests
 * Uses docker-compose environment variables
 */
export const testConfig: Neo4jConfig = createConfig(
  process.env.NEO4J_URL || "neo4j://localhost:7687",
  process.env.NEO4J_USER || "neo4j",
  process.env.NEO4J_PASSWORD || "testpassword",
  {
    database: process.env.NEO4J_DATABASE || "neo4j",
    defaultTimeoutMs: 10000, // Shorter timeout for tests
    connectionPoolSize: 5,   // Smaller pool for tests
  },
);

/**
 * Creates a test driver instance
 * Caller is responsible for closing the driver
 */
export const createTestDriver = (): Driver => {
  return neo4j.driver(
    testConfig.url,
    neo4j.auth.basic(testConfig.user, testConfig.password),
    {
      maxConnectionPoolSize: testConfig.connectionPoolSize ?? 5,
      maxConnectionLifetime: testConfig.maxConnectionLifetimeMs ?? 3600000,
    },
  );
};

/**
 * Creates a test session instance
 * Caller is responsible for closing the session
 */
export const createTestSession = (driver: Driver, write: boolean = false): Session => {
  return driver.session({
    ...(testConfig.database && { database: testConfig.database }),
    defaultAccessMode: write ? neo4j.session.WRITE : neo4j.session.READ,
  });
};

/**
 * Waits for Neo4j to be ready by checking health
 * @param maxAttempts - Maximum number of connection attempts
 * @param delayMs - Delay between attempts in milliseconds
 */
export const waitForNeo4j = async (
  maxAttempts: number = 30,
  delayMs: number = 1000,
): Promise<void> => {
  const neo4j = await import("neo4j-driver");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const neo4jDriver = neo4j.driver(
        testConfig.url,
        neo4j.auth.basic(testConfig.user, testConfig.password),
      );

      const session = neo4jDriver.session({ database: testConfig.database });
      await session.run("RETURN 1 as test");
      await session.close();
      await neo4jDriver.close();

      console.log(`Neo4j is ready after ${attempt} attempts`);
      return;
    } catch (error) {
      console.log(`Neo4j not ready, attempt ${attempt}/${maxAttempts}:`, error.message);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Neo4j failed to become ready after ${maxAttempts} attempts`);
};

/**
 * Cleans up test data between test runs
 * Removes all nodes and relationships
 */
export const cleanupTestData = async (): Promise<void> => {
  const neo4j = await import("neo4j-driver");

  const neo4jDriver = neo4j.driver(
    testConfig.url,
    neo4j.auth.basic(testConfig.user, testConfig.password),
  );

  try {
    const session = neo4jDriver.session({ database: testConfig.database });
    await session.run("MATCH (n) DETACH DELETE n");
    await session.close();
  } finally {
    await neo4jDriver.close();
  }
};
