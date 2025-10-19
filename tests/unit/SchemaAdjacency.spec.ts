import { describe, expect, it } from "vitest";
import {
	hop,
	startPath,
	type ExampleSchema,
} from "../../src/types/SchemaAdjacency";

describe("SchemaAdjacency", () => {
	describe("hop", () => {
		it("should create a hop descriptor", () => {
			const h = hop<ExampleSchema, "Person", "AUTHORED">("Person", "AUTHORED", "out");

			expect(h.from).toBe("Person");
			expect(h.relationship).toBe("AUTHORED");
			expect(h.direction).toBe("out");
		});

		it("should default to out direction", () => {
			const h = hop<ExampleSchema, "Person", "AUTHORED">("Person", "AUTHORED");

			expect(h.direction).toBe("out");
		});
	});

	describe("PathBuilder", () => {
		it("should create a path starting from a node", () => {
			const path = startPath<ExampleSchema, "Person">("Person");

			expect(path.getStart().label).toBe("Person");
			expect(path.getHops()).toHaveLength(0);
		});

		it("should build a single-hop path", () => {
			const path = startPath<ExampleSchema, "Person">("Person").traverse("AUTHORED");

			const hops = path.getHops();
			expect(hops).toHaveLength(1);
			expect(hops[0].from).toBe("Person");
			expect(hops[0].relationship).toBe("AUTHORED");
		});

		it("should build a multi-hop path", () => {
			const path = startPath<ExampleSchema, "Person">("Person")
				.traverse("AUTHORED")
				.traverse("HAS_TAG");

			const hops = path.getHops();
			expect(hops).toHaveLength(2);
			expect(hops[0].relationship).toBe("AUTHORED");
			expect(hops[1].relationship).toBe("HAS_TAG");
		});

		it("should support different traversal directions", () => {
			const path = startPath<ExampleSchema, "Person">("Person")
				.traverse("AUTHORED", "out")
				.traverse("WRITTEN_BY", "in");

			const hops = path.getHops();
			expect(hops[0].direction).toBe("out");
			expect(hops[1].direction).toBe("in");
		});
	});

	describe("Type safety examples", () => {
		it("should allow valid traversals", () => {
			// These should compile without errors
			const path1 = startPath<ExampleSchema, "Person">("Person")
				.traverse("AUTHORED") // Person -> Post
				.traverse("HAS_TAG"); // Post -> Tag

			const path2 = startPath<ExampleSchema, "Post">("Post")
				.traverse("WRITTEN_BY") // Post -> Person
				.traverse("LIVES_IN"); // Person -> City

			expect(path1.getHops()).toHaveLength(2);
			expect(path2.getHops()).toHaveLength(2);
		});

		// Note: The following would cause TypeScript errors at compile time:
		
		// Invalid: Person doesn't have HAS_TAG relationship
		// const invalid1 = startPath<ExampleSchema, "Person">("Person")
		//   .traverse("HAS_TAG"); // ❌ TS Error

		// Invalid: City doesn't have AUTHORED relationship
		// const invalid2 = startPath<ExampleSchema, "City">("City")
		//   .traverse("AUTHORED"); // ❌ TS Error

		// Invalid: Tag has no outgoing relationships
		// const invalid3 = startPath<ExampleSchema, "Tag">("Tag")
		//   .traverse("WRITTEN_BY"); // ❌ TS Error
	});

	describe("Path information", () => {
		it("should provide start node information", () => {
			const path = startPath<ExampleSchema, "Person">("Person");

			const start = path.getStart();
			expect(start.label).toBe("Person");
			expect(start.id).toBeUndefined();
		});

		it("should store start node ID when provided", () => {
			const mockId = "person-123" as any; // In real usage, this would be NodeID<"Person">
			const path = startPath<ExampleSchema, "Person">("Person", mockId);

			const start = path.getStart();
			expect(start.label).toBe("Person");
			expect(start.id).toBe("person-123");
		});
	});

	describe("Real-world usage patterns", () => {
		it("should support finding friends of friends", () => {
			// Person -[:KNOWS]-> Person -[:KNOWS]-> Person
			const path = startPath<ExampleSchema, "Person">("Person")
				.traverse("KNOWS")
				.traverse("KNOWS");

			const hops = path.getHops();
			expect(hops).toHaveLength(2);
			expect(hops[0].relationship).toBe("KNOWS");
			expect(hops[1].relationship).toBe("KNOWS");
		});

		it("should support finding posts by author's friends", () => {
			// Person -[:KNOWS]-> Person -[:AUTHORED]-> Post
			const path = startPath<ExampleSchema, "Person">("Person")
				.traverse("KNOWS")
				.traverse("AUTHORED");

			const hops = path.getHops();
			expect(hops).toHaveLength(2);
			expect(hops[0].relationship).toBe("KNOWS");
			expect(hops[1].relationship).toBe("AUTHORED");
		});

		it("should support bidirectional traversal", () => {
			// Post -[:WRITTEN_BY]-> Person -[:AUTHORED]-> Post
			const path = startPath<ExampleSchema, "Post">("Post")
				.traverse("WRITTEN_BY", "in")
				.traverse("AUTHORED", "out");

			const hops = path.getHops();
			expect(hops).toHaveLength(2);
			expect(hops[0].direction).toBe("in");
			expect(hops[1].direction).toBe("out");
		});
	});
});
