import { describe, it } from "vitest";
import * as fc from "fast-check";
import {
	and,
	binaryOp,
	literal,
	matchClause,
	node,
	not,
	or,
	param,
	property,
	query,
	returnClause,
	whereClause,
	type Clause,
	type Expr,
} from "../../src/ast/CypherAST";
import { compile } from "../../src/ast/Compile";
import { normalize } from "../../src/ast/Normalize";

// Arbitraries for generating AST elements

const arbLiteral = (): fc.Arbitrary<Expr> =>
	fc.oneof(
		fc.integer().map((v) => literal(v)),
		fc.string().map((v) => literal(v)),
		fc.boolean().map((v) => literal(v)),
	);

const arbProperty = (): fc.Arbitrary<Expr> =>
	fc.tuple(fc.constantFrom("n", "p", "x", "y"), fc.constantFrom("id", "name", "age", "active")).map(([node, key]) =>
		property(node, key),
	);

const arbParam = (): fc.Arbitrary<Expr> =>
	fc.constantFrom("param1", "param2", "minValue", "maxValue").map((name) => param(name));

const arbSimpleExpr = (): fc.Arbitrary<Expr> =>
	fc.oneof(arbLiteral(), arbProperty(), arbParam());

const arbBinaryOp = (depth = 0): fc.Arbitrary<Expr> => {
	if (depth > 2) {
		return arbSimpleExpr();
	}
	return fc
		.tuple(
			fc.constantFrom("=", "!=", "<", "<=", ">", ">=", "AND", "OR"),
			arbExpr(depth + 1),
			arbExpr(depth + 1),
		)
		.map(([op, left, right]) => binaryOp(op as any, left, right));
};

const arbExpr = (depth = 0): fc.Arbitrary<Expr> => {
	if (depth > 2) {
		return arbSimpleExpr();
	}
	return fc.oneof(arbSimpleExpr(), arbBinaryOp(depth));
};

const arbNode = (): fc.Arbitrary<Parameters<typeof node>[0]> =>
	fc.constantFrom("n", "p", "person", "post");

const arbLabels = (): fc.Arbitrary<readonly string[]> =>
	fc.constantFrom(["Person"], ["Post"], ["User"], ["Person", "Active"]);

const arbMatchClause = (): fc.Arbitrary<Clause> =>
	fc.tuple(arbNode(), arbLabels()).map(([variable, labels]) => matchClause(node(variable, labels)));

const arbWhereClause = (): fc.Arbitrary<Clause> =>
	arbExpr().map((expr) => whereClause(expr));

const arbReturnClause = (): fc.Arbitrary<Clause> =>
	arbNode().map((variable) => returnClause([{ _tag: "Variable", name: variable }]));

const arbQuery = (): fc.Arbitrary<ReturnType<typeof query>> =>
	fc
		.tuple(arbMatchClause(), arbWhereClause(), arbReturnClause())
		.map(([match, where, ret]) =>
			query([match, where, ret], { param1: 1, param2: 2 }),
		);

describe("Property-Based Tests", () => {
	describe("Normalization stability", () => {
		it("should produce identical output when normalizing twice (idempotence)", () => {
			fc.assert(
				fc.property(arbQuery(), (q) => {
					const n1 = normalize(q);
					const n2 = normalize(n1);

					// Normalizing an already normalized query should be idempotent
					// Note: This is a weaker guarantee - we just check n1 = normalize(n1)
					return JSON.stringify(n1) === JSON.stringify(n2);
				}),
				{ numRuns: 100 },
			);
		});

		it("should produce identical output for simple commutative operations", () => {
			fc.assert(
				fc.property(
					arbSimpleExpr(),
					arbSimpleExpr(),
					(left, right) => {
						const q1 = query([whereClause(and(left, right))]);
						const q2 = query([whereClause(and(right, left))]);

						const n1 = normalize(q1);
						const n2 = normalize(q2);

						// Simple AND is commutative
						return JSON.stringify(n1) === JSON.stringify(n2);
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should eliminate double negation for simple expressions", () => {
			fc.assert(
				fc.property(arbSimpleExpr(), (expr) => {
					const q1 = query([whereClause(expr)]);
					const q2 = query([whereClause(not(not(expr)))]);

					const n1 = normalize(q1);
					const n2 = normalize(q2);

					// Double negation should be eliminated
					return JSON.stringify(n1) === JSON.stringify(n2);
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe("Compilation determinism", () => {
		it("should produce identical Cypher for normalized queries", () => {
			fc.assert(
				fc.property(arbQuery(), (q) => {
					const normalized = normalize(q);

					// Compile multiple times
					const c1 = compile(normalized);
					const c2 = compile(normalized);
					const c3 = compile(normalized);

					// All compilations should produce identical output
					return (
						c1.cypher === c2.cypher &&
						c2.cypher === c3.cypher &&
						JSON.stringify(c1.params) === JSON.stringify(c2.params)
					);
				}),
				{ numRuns: 100 },
			);
		});

		it("should produce valid Cypher strings", () => {
			fc.assert(
				fc.property(arbQuery(), (q) => {
					const result = compile(normalize(q));

					// Basic validation: should contain essential keywords
					return (
						typeof result.cypher === "string" &&
						result.cypher.includes("MATCH") &&
						result.cypher.includes("RETURN") &&
						typeof result.params === "object"
					);
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe("Normalization + Compilation stability", () => {
		it("should produce identical output across normalize -> compile -> normalize -> compile", () => {
			fc.assert(
				fc.property(arbQuery(), (q) => {
					const n1 = normalize(q);
					const c1 = compile(n1);

					// Re-normalize and compile
					const n2 = normalize(n1);
					const c2 = compile(n2);

					// Should produce identical results
					return c1.cypher === c2.cypher && JSON.stringify(c1.params) === JSON.stringify(c2.params);
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe("Parameter ordering stability", () => {
		it("should sort parameters consistently", () => {
			fc.assert(
				fc.property(
					fc.record({
						param1: fc.integer(),
						param2: fc.integer(),
						param3: fc.string(),
					}),
					(params) => {
						const q = query([matchClause(node("n", ["Node"]))], params);
						const normalized = normalize(q);

						const keys = Object.keys(normalized.params);
						const sortedKeys = [...keys].sort();

						// Keys should already be sorted
						return JSON.stringify(keys) === JSON.stringify(sortedKeys);
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
