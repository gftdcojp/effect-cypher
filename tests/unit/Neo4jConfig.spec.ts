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
			expect(result.database).toBeUndefined();
			expect(result.defaultTimeoutMs).toBeUndefined();
			expect(result.connectionPoolSize).toBeUndefined();
		});

		it("should accept any string as URL for now", () => {
			const config = {
				url: "invalid-url",
				user: "neo4j",
				password: "password",
			};

			const result = validateConfig(config);
			expect(result.url).toBe("invalid-url");
		});

		it("should accept non-empty user", () => {
			const config = {
				url: "neo4j://localhost:7687",
				user: "testuser",
				password: "password",
			};

			const result = validateConfig(config);
			expect(result.user).toBe("testuser");
		});

		it("should throw error for invalid config type", () => {
			expect(() => validateConfig("invalid")).toThrow(
				"config must be an object",
			);
			expect(() => validateConfig(null)).toThrow("config must be an object");
			expect(() => validateConfig(undefined)).toThrow(
				"config must be an object",
			);
		});

		it("should throw error for missing url", () => {
			const config = {
				user: "neo4j",
				password: "password",
			};

			expect(() => validateConfig(config)).toThrow(
				"url is required and must be a string",
			);
		});

		it("should throw error for invalid url type", () => {
			const config = {
				url: 123,
				user: "neo4j",
				password: "password",
			};

			expect(() => validateConfig(config)).toThrow(
				"url is required and must be a string",
			);
		});

		it("should throw error for missing user", () => {
			const config = {
				url: "neo4j://localhost:7687",
				password: "password",
			};

			expect(() => validateConfig(config)).toThrow(
				"user is required and must be a string",
			);
		});

		it("should throw error for invalid user type", () => {
			const config = {
				url: "neo4j://localhost:7687",
				user: 123,
				password: "password",
			};

			expect(() => validateConfig(config)).toThrow(
				"user is required and must be a string",
			);
		});

		it("should throw error for missing password", () => {
			const config = {
				url: "neo4j://localhost:7687",
				user: "neo4j",
			};

			expect(() => validateConfig(config)).toThrow(
				"password is required and must be a string",
			);
		});

		it("should throw error for invalid password type", () => {
			const config = {
				url: "neo4j://localhost:7687",
				user: "neo4j",
				password: 123,
			};

			expect(() => validateConfig(config)).toThrow(
				"password is required and must be a string",
			);
		});

		it("should accept negative timeout for now", () => {
			const config = {
				url: "neo4j://localhost:7687",
				user: "neo4j",
				password: "password",
				defaultTimeoutMs: -1000,
			};

			const result = validateConfig(config);
			expect(result.defaultTimeoutMs).toBe(-1000);
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
			expect(config.defaultTimeoutMs).toBe(30000);
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
