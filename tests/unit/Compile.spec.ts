import { describe, expect, it } from "vitest";
import {
	binaryOp,
	literal,
	matchClause,
	node,
	param,
	property,
	query,
	returnClause,
	whereClause,
} from "../../src/ast/CypherAST";
import { compile } from "../../src/ast/Compile";
import { normalize } from "../../src/ast/Normalize";

describe("Compile", () => {
	describe("Basic compilation", () => {
		it("should compile a simple MATCH query", () => {
			const q = query([
				matchClause(node("p", ["Person"])),
				returnClause([{ _tag: "Variable", name: "p" }]),
			]);

			const result = compile(q);

			expect(result.cypher).toBe("MATCH (p:Person) RETURN p");
			expect(result.params).toEqual({});
		});

		it("should compile a query with WHERE clause", () => {
			const q = query(
				[
					matchClause(node("p", ["Person"])),
					whereClause(binaryOp(">=", property("p", "age"), param("minAge"))),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{ minAge: 18 },
			);

			const result = compile(q);

			expect(result.cypher).toContain("MATCH (p:Person)");
			expect(result.cypher).toContain("WHERE");
			expect(result.cypher).toContain("p.age >= $minAge");
			expect(result.cypher).toContain("RETURN p");
			expect(result.params).toEqual({ minAge: 18 });
		});

		it("should compile node with properties", () => {
			const q = query(
				[
					matchClause(
						node("p", ["Person"], {
							id: param("personId"),
						}),
					),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{ personId: "123" },
			);

			const result = compile(q);

			expect(result.cypher).toContain("(p:Person {id: $personId})");
			expect(result.params).toEqual({ personId: "123" });
		});
	});

	describe("Deterministic compilation", () => {
		it("should produce identical Cypher for normalized queries", () => {
			const q1 = query(
				[
					matchClause(node("p", ["Person", "User"])),
					whereClause(binaryOp(">=", property("p", "age"), param("minAge"))),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{ minAge: 18, active: true },
			);

			const q2 = query(
				[
					matchClause(node("p", ["User", "Person"])),
					whereClause(binaryOp(">=", property("p", "age"), param("minAge"))),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{ active: true, minAge: 18 },
			);

			const n1 = normalize(q1);
			const n2 = normalize(q2);

			const c1 = compile(n1);
			const c2 = compile(n2);

			expect(c1.cypher).toBe(c2.cypher);
			expect(JSON.stringify(c1.params)).toBe(JSON.stringify(c2.params));
		});

		it("should produce stable output across multiple compilations", () => {
			const q = query(
				[
					matchClause(node("p", ["Person"])),
					whereClause(binaryOp(">=", property("p", "age"), param("minAge"))),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{ minAge: 20 },
			);

			const results = Array.from({ length: 10 }, () =>
				compile(normalize(q)),
			);

			// All compilations should produce identical output
			for (let i = 1; i < results.length; i++) {
				expect(results[i].cypher).toBe(results[0].cypher);
				expect(results[i].params).toEqual(results[0].params);
			}
		});
	});

	describe("Complex queries", () => {
		it("should compile CREATE queries", () => {
			const q = query([
				{
					_tag: "Create",
					pattern: node("p", ["Person"], {
						name: param("name"),
						age: param("age"),
					}),
				},
				returnClause([{ _tag: "Variable", name: "p" }]),
			]);

			const result = compile(q);

			expect(result.cypher).toContain("CREATE");
			expect(result.cypher).toContain("(p:Person");
			expect(result.cypher).toContain("name: $name");
			expect(result.cypher).toContain("age: $age");
		});

		it("should compile multiple labels", () => {
			const q = query([
				matchClause(node("p", ["Person", "User", "Active"])),
				returnClause([{ _tag: "Variable", name: "p" }]),
			]);

			const result = compile(q);

			expect(result.cypher).toContain(":Person:User:Active");
		});

		it("should compile literal values in expressions", () => {
			const q = query([
				matchClause(node("p", ["Person"])),
				whereClause(binaryOp("=", property("p", "role"), literal("admin"))),
				returnClause([{ _tag: "Variable", name: "p" }]),
			]);

			const result = compile(q);

			expect(result.cypher).toContain('p.role = "admin"');
		});
	});
});
