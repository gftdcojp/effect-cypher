// Merkle DAG: compile_v1 -> Deterministic AST to Cypher compilation
// Guarantees same AST always produces same Cypher string
// Dependencies: [CypherAST]

import type { Clause, Expr, Pattern, Query, ReturnExpr } from "./CypherAST";

export interface CompileResult {
	readonly cypher: string;
	readonly params: Record<string, unknown>;
}

/**
 * Compiles a normalized Query AST to Cypher string deterministically
 * Same AST input always produces identical Cypher output
 */
export const compile = (q: Query): CompileResult => {
	const clauseStrings = q.clauses.map(compileClause);
	const cypher = clauseStrings.join(" ");
	return {
		cypher,
		params: q.params,
	};
};

/**
 * Compiles a single clause to Cypher
 */
const compileClause = (clause: Clause): string => {
	switch (clause._tag) {
		case "Match":
			return `MATCH ${compilePattern(clause.pattern)}`;
		case "Where":
			return `WHERE ${compileExpr(clause.condition)}`;
		case "Return":
			return `RETURN ${clause.expressions.map(compileReturnExpr).join(", ")}`;
		case "Create":
			return `CREATE ${compilePattern(clause.pattern)}`;
		case "Delete":
			return `${clause.detach ? "DETACH " : ""}DELETE ${clause.variables.join(", ")}`;
		case "Set":
			return `SET ${clause.assignments.map((a) => `${a.variable}.${a.key} = ${compileExpr(a.value)}`).join(", ")}`;
		case "OrderBy":
			return `ORDER BY ${clause.items.map((item) => `${compileExpr(item.expr)} ${item.direction}`).join(", ")}`;
		case "Limit":
			return `LIMIT ${clause.count}`;
		case "Skip":
			return `SKIP ${clause.count}`;
		case "With":
			return `WITH ${clause.expressions.map(compileReturnExpr).join(", ")}`;
	}
};

/**
 * Compiles a pattern to Cypher
 */
const compilePattern = (pattern: Pattern): string => {
	switch (pattern._tag) {
		case "Node": {
			const labels =
				pattern.labels.length > 0 ? `:${pattern.labels.join(":")}` : "";
			const props = pattern.properties
				? ` {${Object.entries(pattern.properties)
						.map(([k, v]) => `${k}: ${compileExpr(v)}`)
						.join(", ")}}`
				: "";
			return `(${pattern.variable}${labels}${props})`;
		}
		case "Relationship": {
			const variable = pattern.variable ? pattern.variable : "";
			const type = pattern.type ? `:${pattern.type}` : "";
			const props = pattern.properties
				? ` {${Object.entries(pattern.properties)
						.map(([k, v]) => `${k}: ${compileExpr(v)}`)
						.join(", ")}}`
				: "";
			const rel = `[${variable}${type}${props}]`;
			switch (pattern.direction) {
				case "out":
					return `-${rel}->`;
				case "in":
					return `<-${rel}-`;
				case "both":
					return `-${rel}-`;
			}
		}
		case "Path":
			return pattern.elements.map(compilePattern).join("");
	}
};

/**
 * Compiles an expression to Cypher
 */
const compileExpr = (expr: Expr): string => {
	switch (expr._tag) {
		case "Literal":
			return JSON.stringify(expr.value);
		case "Property":
			return `${expr.node}.${expr.key}`;
		case "Parameter":
			return `$${expr.name}`;
		case "BinaryOp":
			return `${compileExpr(expr.left)} ${expr.op} ${compileExpr(expr.right)}`;
		case "UnaryOp":
			if (expr.op === "NOT") {
				return `NOT ${compileExpr(expr.expr)}`;
			}
			if (expr.op === "IS NULL" || expr.op === "IS NOT NULL") {
				return `${compileExpr(expr.expr)} ${expr.op}`;
			}
			return `${expr.op}${compileExpr(expr.expr)}`;
		case "Function":
			return `${expr.name}(${expr.args.map(compileExpr).join(", ")})`;
	}
};

/**
 * Compiles a return expression to Cypher
 */
const compileReturnExpr = (expr: ReturnExpr): string => {
	switch (expr._tag) {
		case "Variable":
			return expr.alias ? `${expr.name} AS ${expr.alias}` : expr.name;
		case "Expression":
			return expr.alias
				? `${compileExpr(expr.expr)} AS ${expr.alias}`
				: compileExpr(expr.expr);
	}
};
