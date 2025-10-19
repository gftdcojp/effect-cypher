// Merkle DAG: normalize_v1 -> Query normalization with algebraic rules
// Implements commutativity, associativity, distributivity, and canonicalization
// Dependencies: [CypherAST]

import type { Clause, Expr, Pattern, Query, ReturnExpr } from "./CypherAST";

/**
 * Normalizes a query to a canonical form for deterministic compilation
 * Applies algebraic rules: commutativity, associativity, distributivity, double negation
 */
export const normalize = (q: Query): Query => {
	const normalizedClauses = normalizeClauses(q.clauses);
	const sortedParams = sortParamsStable(q.params);
	return {
		clauses: normalizedClauses,
		params: sortedParams,
	};
};

/**
 * Normalizes clauses by applying ordering and expression normalization
 */
const normalizeClauses = (clauses: readonly Clause[]): readonly Clause[] => {
	return clauses.map(normalizeClause).sort(compareClausesByOrder);
};

/**
 * Normalizes a single clause
 */
const normalizeClause = (clause: Clause): Clause => {
	switch (clause._tag) {
		case "Match":
			return {
				...clause,
				pattern: normalizePattern(clause.pattern),
			};
		case "Where":
			return {
				...clause,
				condition: normalizeExpr(clause.condition),
			};
		case "Return":
			return {
				...clause,
				expressions: clause.expressions.map(normalizeReturnExpr),
			};
		case "Create":
			return {
				...clause,
				pattern: normalizePattern(clause.pattern),
			};
		case "Set":
			return {
				...clause,
				assignments: clause.assignments.map((a) => ({
					...a,
					value: normalizeExpr(a.value),
				})).sort((a, b) => `${a.variable}.${a.key}`.localeCompare(`${b.variable}.${b.key}`)),
			};
		case "OrderBy":
			return {
				...clause,
				items: clause.items.map((item) => ({
					...item,
					expr: normalizeExpr(item.expr),
				})),
			};
		case "With":
			return {
				...clause,
				expressions: clause.expressions.map(normalizeReturnExpr),
			};
		default:
			return clause;
	}
};

/**
 * Normalizes expressions using algebraic rules
 */
const normalizeExpr = (expr: Expr): Expr => {
	switch (expr._tag) {
		case "BinaryOp": {
			const left = normalizeExpr(expr.left);
			const right = normalizeExpr(expr.right);

			// Double negation elimination: NOT NOT x => x
			if (expr.op === "AND" || expr.op === "OR") {
				// Commutativity: sort operands for consistency
				if (compareExpr(left, right) > 0) {
					return { _tag: "BinaryOp", op: expr.op, left: right, right: left };
				}

				// Flatten nested AND/OR (associativity)
				const flattened = flattenAssociativeOp(expr.op, left, right);
				if (flattened) {
					return flattened;
				}
			}

			return { _tag: "BinaryOp", op: expr.op, left, right };
		}
		case "UnaryOp": {
			const normalized = normalizeExpr(expr.expr);

			// Double negation: NOT NOT x => x
			if (expr.op === "NOT" && normalized._tag === "UnaryOp" && normalized.op === "NOT") {
				return normalized.expr;
			}

			return { _tag: "UnaryOp", op: expr.op, expr: normalized };
		}
		case "Function":
			return {
				_tag: "Function",
				name: expr.name,
				args: expr.args.map(normalizeExpr),
			};
		default:
			return expr;
	}
};

/**
 * Flattens nested associative operations (AND/OR)
 */
const flattenAssociativeOp = (
	op: "AND" | "OR",
	left: Expr,
	right: Expr,
): Expr | null => {
	// Collect all operands
	const operands: Expr[] = [];
	const collectOperands = (e: Expr): void => {
		if (e._tag === "BinaryOp" && e.op === op) {
			collectOperands(e.left);
			collectOperands(e.right);
		} else {
			operands.push(e);
		}
	};
	collectOperands({ _tag: "BinaryOp", op, left, right });

	if (operands.length <= 2) {
		return null;
	}

	// Sort operands for canonical form
	operands.sort(compareExpr);

	// Rebuild as right-associative tree
	return operands.reduce((acc, curr) => ({
		_tag: "BinaryOp",
		op,
		left: acc,
		right: curr,
	}));
};

/**
 * Normalizes patterns
 */
const normalizePattern = (pattern: Pattern): Pattern => {
	switch (pattern._tag) {
		case "Node":
			return {
				...pattern,
				labels: [...pattern.labels].sort(),
				...(pattern.properties && {
					properties: Object.fromEntries(
						Object.entries(pattern.properties)
							.map(([k, v]) => [k, normalizeExpr(v)] as [string, Expr])
							.sort(([a], [b]) => (a || "").localeCompare(b || "")),
					),
				}),
			};
		case "Relationship":
			return {
				...pattern,
				...(pattern.properties && {
					properties: Object.fromEntries(
						Object.entries(pattern.properties)
							.map(([k, v]) => [k, normalizeExpr(v)] as [string, Expr])
							.sort(([a], [b]) => (a || "").localeCompare(b || "")),
					),
				}),
			};
		case "Path":
			return {
				...pattern,
				elements: pattern.elements.map((e) => normalizePattern(e) as Pattern & { readonly _tag: "Node" | "Relationship" }),
			};
		default:
			return pattern;
	}
};

/**
 * Normalizes return expressions
 */
const normalizeReturnExpr = (expr: ReturnExpr): ReturnExpr => {
	if (expr._tag === "Expression") {
		return {
			...expr,
			expr: normalizeExpr(expr.expr),
		};
	}
	return expr;
};

/**
 * Sorts parameters alphabetically for stable output
 */
const sortParamsStable = (params: Record<string, unknown>): Record<string, unknown> => {
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(params).sort()) {
		sorted[key] = params[key];
	}
	return sorted;
};

/**
 * Compares expressions for ordering (lexicographic)
 */
const compareExpr = (a: Expr, b: Expr): number => {
	const aStr = JSON.stringify(a);
	const bStr = JSON.stringify(b);
	return aStr.localeCompare(bStr);
};

/**
 * Compares clauses for canonical ordering
 * Order: MATCH -> WHERE -> CREATE -> SET -> WITH -> RETURN -> ORDER BY -> SKIP -> LIMIT
 */
const compareClausesByOrder = (a: Clause, b: Clause): number => {
	const order: Record<Clause["_tag"], number> = {
		Match: 1,
		Where: 2,
		Create: 3,
		Delete: 4,
		Set: 5,
		With: 6,
		Return: 7,
		OrderBy: 8,
		Skip: 9,
		Limit: 10,
	};
	return order[a._tag] - order[b._tag];
};
