import { describe, expect, it } from "vitest";
import {
	createNode,
	findNodeById,
	findNodesByLabel,
	matchAdults,
} from "../../src/cypher/QueryBuilder";

describe("QueryBuilder", () => {
	describe("findNodesByLabel", () => {
		it("should build a query to find nodes by label", () => {
			const result = findNodesByLabel("Person");

			expect(result.cypher).toContain("MATCH (");
			expect(result.cypher).toContain(":Person");
			expect(result.cypher).toContain("RETURN");
			expect(result.params).toEqual({});
		});
	});

	describe("findNodeById", () => {
		it("should build a query to find node by ID", () => {
			const result = findNodeById("Person", "person-123");

			expect(result.cypher).toContain("MATCH (");
			expect(result.cypher).toContain(":Person");
			expect(result.cypher).toContain("{id: $id}");
			expect(result.cypher).toContain("RETURN");
			expect(result.params).toHaveProperty("id", "person-123");
		});
	});

	describe("createNode", () => {
		it("should build a CREATE query", () => {
			const properties = {
				id: "person-123",
				name: "John Doe",
				age: 30,
			};

			const result = createNode("Person", properties);

			expect(result.cypher).toContain("CREATE (");
			expect(result.cypher).toContain(":Person");
			expect(result.cypher).toContain("RETURN");

			// Check that all properties are parameterized
			expect(Object.keys(result.params)).toHaveLength(3);
			expect(result.params).toHaveProperty("id", "person-123");
			expect(result.params).toHaveProperty("name", "John Doe");
			expect(result.params).toHaveProperty("age", 30);
		});
	});

	describe("matchAdults", () => {
		it("should build a query for adults above minimum age", () => {
			const result = matchAdults(20);

			expect(result.cypher).toContain("MATCH (");
			expect(result.cypher).toContain(":Person");
			expect(result.cypher).toContain("WHERE");
			expect(result.cypher).toContain("RETURN");

			// Check for parameterized age comparison
			expect(result.params).toHaveProperty("minAge", 20);
		});
	});

	describe("Query structure", () => {
		it("should generate valid Cypher syntax", () => {
			const queries = [
				findNodesByLabel("Person"),
				findNodeById("Person", "test"),
				createNode("Person", { name: "Test" }),
				matchAdults(18),
			];

			for (const query of queries) {
				// Basic Cypher validation - should contain essential keywords
				expect(query.cypher).toMatch(/MATCH|CREATE/);
				expect(typeof query.cypher).toBe("string");
				expect(query.cypher.length).toBeGreaterThan(10);
				expect(typeof query.params).toBe("object");
			}
		});

		it("should properly parameterize queries", () => {
			const result = createNode("Person", {
				name: "Test User",
				age: 25,
				active: true,
			});

			// All values should be in params, not in the cypher string
			expect(result.cypher).not.toContain('"Test User"');
			expect(result.cypher).not.toContain("25");
			expect(result.cypher).not.toContain("true");

			// Values should be in params
			expect(Object.values(result.params)).toEqual(
				expect.arrayContaining(["Test User", 25, true]),
			);
		});
	});
});
