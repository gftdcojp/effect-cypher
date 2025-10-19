import { describe, expect, it } from "vitest";
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
} from "../../src/ast/CypherAST";

describe("CypherAST", () => {
	describe("Expression constructors", () => {
		it("should create literal expressions", () => {
			const expr = literal(42);
			expect(expr).toEqual({
				_tag: "Literal",
				value: 42,
			});
		});

		it("should create property expressions", () => {
			const expr = property("person", "name");
			expect(expr).toEqual({
				_tag: "Property",
				node: "person",
				key: "name",
			});
		});

		it("should create parameter expressions", () => {
			const expr = param("minAge");
			expect(expr).toEqual({
				_tag: "Parameter",
				name: "minAge",
			});
		});

		it("should create binary operation expressions", () => {
			const expr = binaryOp(">=", property("person", "age"), param("minAge"));
			expect(expr).toEqual({
				_tag: "BinaryOp",
				op: ">=",
				left: {
					_tag: "Property",
					node: "person",
					key: "age",
				},
				right: {
					_tag: "Parameter",
					name: "minAge",
				},
			});
		});

		it("should create AND expressions", () => {
			const expr = and(
				binaryOp(">=", property("p", "age"), literal(18)),
				binaryOp("=", property("p", "active"), literal(true)),
			);
			expect(expr._tag).toBe("BinaryOp");
			expect(expr.op).toBe("AND");
		});

		it("should create OR expressions", () => {
			const expr = or(
				binaryOp("=", property("p", "role"), literal("admin")),
				binaryOp("=", property("p", "role"), literal("moderator")),
			);
			expect(expr._tag).toBe("BinaryOp");
			expect(expr.op).toBe("OR");
		});

		it("should create NOT expressions", () => {
			const expr = not(binaryOp("=", property("p", "deleted"), literal(true)));
			expect(expr._tag).toBe("UnaryOp");
			expect(expr.op).toBe("NOT");
		});
	});

	describe("Pattern constructors", () => {
		it("should create node patterns", () => {
			const pattern = node("person", ["Person"], {
				id: param("personId"),
			});
			expect(pattern).toEqual({
				_tag: "Node",
				variable: "person",
				labels: ["Person"],
				properties: {
					id: {
						_tag: "Parameter",
						name: "personId",
					},
				},
			});
		});

		it("should create node patterns without labels", () => {
			const pattern = node("n");
			expect(pattern).toEqual({
				_tag: "Node",
				variable: "n",
				labels: [],
				properties: undefined,
			});
		});
	});

	describe("Query construction", () => {
		it("should create a simple MATCH query", () => {
			const q = query(
				[
					matchClause(node("person", ["Person"])),
					whereClause(
						binaryOp(">=", property("person", "age"), param("minAge")),
					),
					returnClause([{ _tag: "Variable", name: "person" }]),
				],
				{ minAge: 18 },
			);

			expect(q.clauses).toHaveLength(3);
			expect(q.clauses[0]._tag).toBe("Match");
			expect(q.clauses[1]._tag).toBe("Where");
			expect(q.clauses[2]._tag).toBe("Return");
			expect(q.params).toEqual({ minAge: 18 });
		});

		it("should create a query with complex WHERE clause", () => {
			const q = query(
				[
					matchClause(node("p", ["Person"])),
					whereClause(
						and(
							binaryOp(">=", property("p", "age"), literal(18)),
							or(
								binaryOp("=", property("p", "city"), literal("NYC")),
								binaryOp("=", property("p", "city"), literal("SF")),
							),
						),
					),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{},
			);

			expect(q.clauses).toHaveLength(3);
			const whereClauseItem = q.clauses[1] as any;
			expect(whereClauseItem.condition._tag).toBe("BinaryOp");
			expect(whereClauseItem.condition.op).toBe("AND");
		});
	});
});
