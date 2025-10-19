// Merkle DAG: cypher_ast_v1 -> Public AST IR types
// First-class AST representation for deterministic compilation
// Dependencies: []

/**
 * Base type for all AST expressions
 */
export type Expr =
	| { readonly _tag: "Literal"; readonly value: unknown }
	| { readonly _tag: "Property"; readonly node: string; readonly key: string }
	| { readonly _tag: "Parameter"; readonly name: string }
	| { readonly _tag: "BinaryOp"; readonly op: BinaryOperator; readonly left: Expr; readonly right: Expr }
	| { readonly _tag: "UnaryOp"; readonly op: UnaryOperator; readonly expr: Expr }
	| { readonly _tag: "Function"; readonly name: string; readonly args: readonly Expr[] };

export type BinaryOperator = "=" | "!=" | "<" | "<=" | ">" | ">=" | "AND" | "OR" | "+" | "-" | "*" | "/" | "IN" | "CONTAINS" | "STARTS WITH" | "ENDS WITH";
export type UnaryOperator = "NOT" | "-" | "IS NULL" | "IS NOT NULL";

/**
 * Pattern matching for nodes and relationships
 */
export type Pattern =
	| { readonly _tag: "Node"; readonly variable: string; readonly labels: readonly string[]; readonly properties?: Record<string, Expr> }
	| { readonly _tag: "Relationship"; readonly variable?: string; readonly type?: string; readonly direction: "out" | "in" | "both"; readonly properties?: Record<string, Expr> }
	| { readonly _tag: "Path"; readonly elements: readonly (Pattern & { readonly _tag: "Node" | "Relationship" })[] };

/**
 * Query clauses
 */
export type Clause =
	| { readonly _tag: "Match"; readonly pattern: Pattern; readonly optional: boolean }
	| { readonly _tag: "Where"; readonly condition: Expr }
	| { readonly _tag: "Return"; readonly expressions: readonly ReturnExpr[] }
	| { readonly _tag: "Create"; readonly pattern: Pattern }
	| { readonly _tag: "Delete"; readonly variables: readonly string[]; readonly detach: boolean }
	| { readonly _tag: "Set"; readonly assignments: readonly { readonly variable: string; readonly key: string; readonly value: Expr }[] }
	| { readonly _tag: "OrderBy"; readonly items: readonly { readonly expr: Expr; readonly direction: "ASC" | "DESC" }[] }
	| { readonly _tag: "Limit"; readonly count: number }
	| { readonly _tag: "Skip"; readonly count: number }
	| { readonly _tag: "With"; readonly expressions: readonly ReturnExpr[] };

export type ReturnExpr =
	| { readonly _tag: "Variable"; readonly name: string; readonly alias?: string }
	| { readonly _tag: "Expression"; readonly expr: Expr; readonly alias?: string };

/**
 * Complete query AST
 */
export interface Query {
	readonly clauses: readonly Clause[];
	readonly params: Record<string, unknown>;
}

/**
 * Helper functions for AST construction
 */
export const literal = (value: unknown): Expr => ({
	_tag: "Literal",
	value,
});

export const property = (node: string, key: string): Expr => ({
	_tag: "Property",
	node,
	key,
});

export const param = (name: string): Expr => ({
	_tag: "Parameter",
	name,
});

export const binaryOp = (op: BinaryOperator, left: Expr, right: Expr): Expr => ({
	_tag: "BinaryOp",
	op,
	left,
	right,
});

export const unaryOp = (op: UnaryOperator, expr: Expr): Expr => ({
	_tag: "UnaryOp",
	op,
	expr,
});

export const and = (left: Expr, right: Expr): Expr =>
	binaryOp("AND", left, right);

export const or = (left: Expr, right: Expr): Expr =>
	binaryOp("OR", left, right);

export const not = (expr: Expr): Expr =>
	unaryOp("NOT", expr);

export const node = (
	variable: string,
	labels: readonly string[] = [],
	properties?: Record<string, Expr>,
): Pattern => ({
	_tag: "Node",
	variable,
	labels,
	...(properties !== undefined && { properties }),
});

export const relationship = (
	direction: "out" | "in" | "both",
	type?: string,
	variable?: string,
	properties?: Record<string, Expr>,
): Pattern => ({
	_tag: "Relationship",
	...(variable !== undefined && { variable }),
	...(type !== undefined && { type }),
	direction,
	...(properties !== undefined && { properties }),
});

export const matchClause = (pattern: Pattern, optional = false): Clause => ({
	_tag: "Match",
	pattern,
	optional,
});

export const whereClause = (condition: Expr): Clause => ({
	_tag: "Where",
	condition,
});

export const returnClause = (expressions: readonly ReturnExpr[]): Clause => ({
	_tag: "Return",
	expressions,
});

export const createClause = (pattern: Pattern): Clause => ({
	_tag: "Create",
	pattern,
});

export const query = (
	clauses: readonly Clause[],
	params: Record<string, unknown> = {},
): Query => ({
	clauses,
	params,
});
