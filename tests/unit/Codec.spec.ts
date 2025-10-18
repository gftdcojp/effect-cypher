import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import {
	Neo4jNode,
	Neo4jRelationship,
	PersonNode,
	createDecoder,
	createSafeDecoder,
} from "../../src/schema/Codec";

describe("Codec", () => {
	describe("PersonNode schema", () => {
		it("should validate valid person data", () => {
			const validPerson = {
				id: "person-123",
				name: "John Doe",
				age: 30,
				email: "john@example.com",
				createdAt: new Date("2023-01-01"),
			};

			const result = Schema.decodeSync(PersonNode)(validPerson);
			expect(result).toEqual(validPerson);
		});

		it("should validate person data with optional fields", () => {
			const minimalPerson = {
				id: "person-123",
				name: "John Doe",
				age: 30,
			};

			const result = Schema.decodeSync(PersonNode)(minimalPerson);
			expect(result).toEqual(minimalPerson);
			expect(result.email).toBeUndefined();
			expect(result.createdAt).toBeUndefined();
		});

		it("should reject invalid person data", () => {
			const invalidPerson = {
				id: "person-123",
				name: "John Doe",
				age: -5, // Invalid age
				email: "invalid-email", // Invalid email format
			};

			expect(() => Schema.decodeSync(PersonNode)(invalidPerson)).toThrow();
		});

		it("should reject missing required fields", () => {
			const incompletePerson = {
				id: "person-123",
				// Missing name and age
			};

			expect(() => Schema.decodeSync(PersonNode)(incompletePerson)).toThrow();
		});
	});

	describe("Neo4jNode schema", () => {
		it("should validate Neo4j node data", () => {
			const nodeData = {
				identity: 123,
				labels: ["Person", "User"],
				properties: {
					id: "person-123",
					name: "John Doe",
					age: 30,
				},
			};

			const result = Schema.decodeSync(Neo4jNode)(nodeData);
			expect(result).toEqual(nodeData);
		});

		it("should reject invalid node data", () => {
			const invalidNode = {
				identity: "not-a-number", // Should be number
				labels: "Person", // Should be array
				properties: "invalid", // Should be object
			};

			expect(() => Schema.decodeSync(Neo4jNode)(invalidNode)).toThrow();
		});
	});

	describe("Neo4jRelationship schema", () => {
		it("should validate Neo4j relationship data", () => {
			const relationshipData = {
				identity: 456,
				type: "FOLLOWS",
				properties: {
					since: "2023-01-01",
					strength: 0.8,
				},
				start: 123,
				end: 789,
			};

			const result = Schema.decodeSync(Neo4jRelationship)(relationshipData);
			expect(result).toEqual(relationshipData);
		});
	});

	describe("createDecoder", () => {
		it("should create a decoder function", () => {
			const decoder = createDecoder(PersonNode);

			const validData = {
				id: "person-123",
				name: "John Doe",
				age: 30,
			};

			const result = decoder(validData);
			expect(result).toEqual(validData);
		});

		it("should throw on invalid data", () => {
			const decoder = createDecoder(PersonNode);

			const invalidData = {
				id: "person-123",
				name: "John Doe",
				age: "not-a-number", // Invalid type
			};

			expect(() => decoder(invalidData)).toThrow();
		});
	});

	describe("createSafeDecoder", () => {
		it("should create a safe decoder that returns Either", async () => {
			const safeDecoder = createSafeDecoder(PersonNode);

			const validData = {
				id: "person-123",
				name: "John Doe",
				age: 30,
			};

			const result = await safeDecoder(validData);

			expect(result._tag).toBe("Right");
			if (result._tag === "Right") {
				expect(result.right).toEqual(validData);
			}
		});

		it("should return Left on invalid data", async () => {
			const safeDecoder = createSafeDecoder(PersonNode);

			const invalidData = {
				id: "person-123",
				name: "John Doe",
				age: -10, // Invalid age
			};

			const result = await safeDecoder(invalidData);

			expect(result._tag).toBe("Left");
		});
	});

	describe("Type inference", () => {
		it("should maintain type safety", () => {
			const decoder = createDecoder(PersonNode);

			const input = {
				id: "person-123" as const,
				name: "John Doe" as const,
				age: 30 as const,
			};

			const result = decoder(input);

			// TypeScript should infer the correct type
			const _: typeof result = {
				id: "person-123",
				name: "John Doe",
				age: 30,
				email: undefined,
				createdAt: undefined,
			};

			expect(result.id).toBe("person-123");
			expect(result.name).toBe("John Doe");
			expect(result.age).toBe(30);
		});
	});
});
