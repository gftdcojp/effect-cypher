import { describe, expect, it } from "vitest";
import {
	and,
	binaryOp,
	literal,
	not,
	or,
	property,
	query,
} from "../../src/ast/CypherAST";
import { normalize } from "../../src/ast/Normalize";

describe("Normalize", () => {
	describe("Expression normalization", () => {
		it("should normalize AND operations with commutative ordering", () => {
			const q1 = query([
				{
					_tag: "Where",
					condition: and(
						binaryOp("=", property("a", "x"), literal(1)),
						binaryOp("=", property("b", "y"), literal(2)),
					),
				},
			]);
			const q2 = query([
				{
					_tag: "Where",
					condition: and(
						binaryOp("=", property("b", "y"), literal(2)),
						binaryOp("=", property("a", "x"), literal(1)),
					),
				},
			]);

			const n1 = normalize(q1);
			const n2 = normalize(q2);

			// Both should normalize to the same form
			expect(JSON.stringify(n1)).toBe(JSON.stringify(n2));
		});

		it("should normalize OR operations with commutative ordering", () => {
			const q1 = query([
				{
					_tag: "Where",
					condition: or(
						binaryOp("=", property("a", "x"), literal(1)),
						binaryOp("=", property("b", "y"), literal(2)),
					),
				},
			]);
			const q2 = query([
				{
					_tag: "Where",
					condition: or(
						binaryOp("=", property("b", "y"), literal(2)),
						binaryOp("=", property("a", "x"), literal(1)),
					),
				},
			]);

			const n1 = normalize(q1);
			const n2 = normalize(q2);

			expect(JSON.stringify(n1)).toBe(JSON.stringify(n2));
		});

		it("should eliminate double negation", () => {
			const q = query([
				{
					_tag: "Where",
					condition: not(not(binaryOp("=", property("a", "x"), literal(1)))),
				},
			]);

			const normalized = normalize(q);
			const condition = (normalized.clauses[0] as any).condition;

			// Double NOT should be eliminated
			expect(condition._tag).toBe("BinaryOp");
		});
	});

	describe("Parameter normalization", () => {
		it("should sort parameters alphabetically", () => {
			const q = query([], {
				z: 3,
				a: 1,
				m: 2,
			});

			const normalized = normalize(q);

			expect(Object.keys(normalized.params)).toEqual(["a", "m", "z"]);
		});
	});

	describe("Clause ordering", () => {
		it("should order clauses in canonical order", () => {
			const q = query([
				{ _tag: "Return", expressions: [] },
				{ _tag: "Where", condition: literal(true) },
				{ _tag: "Match", pattern: { _tag: "Node", variable: "n", labels: [] }, optional: false },
			]);

			const normalized = normalize(q);

			expect(normalized.clauses[0]._tag).toBe("Match");
			expect(normalized.clauses[1]._tag).toBe("Where");
			expect(normalized.clauses[2]._tag).toBe("Return");
		});
	});

	describe("Deterministic normalization", () => {
		it("should produce identical output for equivalent queries", () => {
			const q1 = query(
				[
					{
						_tag: "Match",
						pattern: { _tag: "Node", variable: "p", labels: ["Person", "User"] },
						optional: false,
					},
					{
						_tag: "Where",
						condition: and(
							binaryOp("=", property("p", "active"), literal(true)),
							binaryOp(">=", property("p", "age"), literal(18)),
						),
					},
				],
				{ minAge: 18, active: true },
			);

			const q2 = query(
				[
					{
						_tag: "Match",
						pattern: { _tag: "Node", variable: "p", labels: ["User", "Person"] },
						optional: false,
					},
					{
						_tag: "Where",
						condition: and(
							binaryOp(">=", property("p", "age"), literal(18)),
							binaryOp("=", property("p", "active"), literal(true)),
						),
					},
				],
				{ active: true, minAge: 18 },
			);

			const n1 = normalize(q1);
			const n2 = normalize(q2);

			// Should normalize to the same structure
			expect(JSON.stringify(n1)).toBe(JSON.stringify(n2));
		});
	});
});
