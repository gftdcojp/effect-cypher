import { describe, expect, it } from "vitest";
import {
	createNode,
	createRelationship,
	deleteNode,
	findNodeById,
	findNodesByLabel,
	findRelatedNodes,
	matchAdults,
	updateNode,
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

		it("should build a query with limit", () => {
			const result = findNodesByLabel("Person", 10);

			expect(result.cypher).toContain("LIMIT");
			expect(result.cypher).toContain("$param0");
			expect(result.params).toHaveProperty("param0", 10);
		});
	});

	describe("findNodeById", () => {
		it("should build a query to find node by ID", () => {
			const result = findNodeById("Person", "id", "person-123");

			expect(result.cypher).toContain("MATCH (");
			expect(result.cypher).toContain(":Person");
			expect(result.cypher).toContain("WHERE");
			expect(result.cypher).toContain("RETURN");
			expect(result.params).toHaveProperty("param0", "person-123");
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
			expect(result.cypher).toContain("SET");
			expect(result.cypher).toContain("RETURN");

			// Check that all properties are parameterized
			expect(Object.keys(result.params)).toHaveLength(3);
			expect(result.params).toHaveProperty("param0", "person-123");
			expect(result.params).toHaveProperty("param1", "John Doe");
			expect(result.params).toHaveProperty("param2", 30);
		});
	});

	describe("updateNode", () => {
		it("should build an UPDATE query", () => {
			const properties = {
				name: "Jane Doe",
				age: 31,
			};

			const result = updateNode("Person", "id", "person-123", properties);

			expect(result.cypher).toContain("MATCH (");
			expect(result.cypher).toContain(":Person");
			expect(result.cypher).toContain("WHERE");
			expect(result.cypher).toContain("SET");
			expect(result.cypher).toContain("RETURN");

			expect(result.params).toHaveProperty("param0", "person-123");
			expect(result.params).toHaveProperty("param1", "Jane Doe");
			expect(result.params).toHaveProperty("param2", 31);
		});
	});

	describe("deleteNode", () => {
		it("should build a DELETE query", () => {
			const result = deleteNode("Person", "id", "person-123");

			expect(result.cypher).toContain("MATCH (");
			expect(result.cypher).toContain(":Person");
			expect(result.cypher).toContain("WHERE");
			expect(result.cypher).toContain("DELETE");

			expect(result.params).toHaveProperty("param0", "person-123");
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
			expect(result.params).toHaveProperty("param0", 20);
		});
	});

	describe("findRelatedNodes", () => {
		it("should build a query for outgoing relationships", () => {
			const result = findRelatedNodes(
				"Person",
				"id",
				"person-123",
				"FOLLOWS",
				"Person",
				"outgoing",
			);

			expect(result.cypher).toContain("MATCH");
			expect(result.cypher).toContain("FOLLOWS");
			expect(result.cypher).toContain("RETURN");

			expect(result.params).toHaveProperty("param0", "person-123");
		});

		it("should build a query for incoming relationships", () => {
			const result = findRelatedNodes(
				"Person",
				"id",
				"person-123",
				"FOLLOWS",
				"Person",
				"incoming",
			);

			expect(result.cypher).toContain("MATCH");
			expect(result.cypher).toContain("FOLLOWS");
			expect(result.cypher).toContain("RETURN");

			expect(result.params).toHaveProperty("param0", "person-123");
		});
	});

	describe("createRelationship", () => {
		it("should build a query to create relationships", () => {
			const result = createRelationship(
				"Person",
				"id",
				"person-123",
				"FOLLOWS",
				{ since: new Date("2023-01-01") },
				"Person",
				"id",
				"person-456",
			);

			expect(result.cypher).toContain("MATCH");
			expect(result.cypher).toContain("FOLLOWS");
			expect(result.cypher).toContain("SET");
			expect(result.cypher).toContain("RETURN");

			expect(result.params).toHaveProperty("param0", "person-123");
			expect(result.params).toHaveProperty("param1", "person-456");
			expect(result.params).toHaveProperty("param2", new Date("2023-01-01"));
		});
	});

	describe("Query structure", () => {
		it("should generate valid Cypher syntax", () => {
			const queries = [
				findNodesByLabel("Person"),
				findNodeById("Person", "id", "test"),
				createNode("Person", { name: "Test" }),
				matchAdults(18),
			];

			for (const query of queries) {
				// Basic Cypher validation - should contain essential keywords
				expect(query.cypher).toMatch(/MATCH|CREATE|MERGE/);
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
