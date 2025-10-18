import { describe, expect, it } from "vitest";
import {
	type Neo4jConfig,
	Neo4jConfigSchema,
	createConfig,
	validateConfig,
} from "../../src/config/Neo4jConfig";

describe("Neo4jConfig", () => {
	describe("Neo4jConfigSchema", () => {
		it("should validate a valid configuration", () => {
			const validConfig = {
				url: "neo4j://localhost:7687",
				user: "neo4j",
				password: "password",
				database: "neo4j",
				defaultTimeoutMs: 30000,
				connectionPoolSize: 10,
				maxConnectionLifetimeMs: 3600000,
			};

			const result = validateConfig(validConfig);
			expect(result).toEqual(validConfig);
		});

		it("should apply default values", () => {
			const minimalConfig = {
				url: "neo4j://localhost:7687",
				user: "neo4j",
				password: "password",
			};

			const result = validateConfig(minimalConfig);
			expect(result.database).toBe("neo4j");
			expect(result.defaultTimeoutMs).toBe(30000);
			expect(result.connectionPoolSize).toBe(10);
		});

		it("should reject invalid URL", () => {
			const invalidConfig = {
				url: "invalid-url",
				user: "neo4j",
				password: "password",
			};

			expect(() => validateConfig(invalidConfig)).toThrow();
		});

		it("should reject empty user", () => {
			const invalidConfig = {
				url: "neo4j://localhost:7687",
				user: "",
				password: "password",
			};

			expect(() => validateConfig(invalidConfig)).toThrow();
		});

		it("should reject negative timeout", () => {
			const invalidConfig = {
				url: "neo4j://localhost:7687",
				user: "neo4j",
				password: "password",
				defaultTimeoutMs: -1000,
			};

			expect(() => validateConfig(invalidConfig)).toThrow();
		});
	});

	describe("createConfig", () => {
		it("should create a valid config with minimal parameters", () => {
			const config = createConfig(
				"neo4j://localhost:7687",
				"neo4j",
				"password",
			);

			expect(config.url).toBe("neo4j://localhost:7687");
			expect(config.user).toBe("neo4j");
			expect(config.password).toBe("password");
			expect(config.database).toBe("neo4j");
		});

		it("should create a config with custom options", () => {
			const config = createConfig(
				"neo4j://localhost:7687",
				"neo4j",
				"password",
				{
					database: "custom",
					defaultTimeoutMs: 60000,
					connectionPoolSize: 5,
				},
			);

			expect(config.database).toBe("custom");
			expect(config.defaultTimeoutMs).toBe(60000);
			expect(config.connectionPoolSize).toBe(5);
		});
	});

	describe("TypeScript types", () => {
		it("should have correct TypeScript inference", () => {
			const config: Neo4jConfig = {
				url: "neo4j://localhost:7687",
				user: "neo4j",
				password: "password",
				database: "neo4j",
				defaultTimeoutMs: 30000,
				connectionPoolSize: 10,
				maxConnectionLifetimeMs: 3600000,
			};

			// TypeScript should catch these errors at compile time
			// @ts-expect-error - invalid URL
			const invalidUrl: Neo4jConfig = { ...config, url: "invalid" };

			// @ts-expect-error - negative timeout
			const invalidTimeout: Neo4jConfig = { ...config, defaultTimeoutMs: -1 };

			expect(config.url).toBe("neo4j://localhost:7687");
		});
	});
});
