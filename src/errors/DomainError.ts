// Merkle DAG: domain_error_v1 -> QueryError, ConnectionError, ValidationError
// Domain-specific error types with structured context
// Dependencies: []

/**
 * Base class for all domain errors in the effect-cypher package
 * Provides structured error context and categorization
 */
export abstract class DomainError extends Error {
	abstract readonly _tag: string;

	constructor(
		message: string,
		readonly cause?: unknown,
		readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

/**
 * Error thrown when Cypher query execution fails
 * Includes query context and parameters for debugging
 */
export class QueryError extends DomainError {
	readonly _tag = "QueryError";

	constructor(
		message: string,
		readonly cause?: unknown,
		readonly query?: string,
		readonly params?: Record<string, unknown>,
	) {
		super(message, cause, { query, params });
	}
}

/**
 * Error thrown when Neo4j connection or session fails
 * Includes connection details for debugging
 */
export class ConnectionError extends DomainError {
	readonly _tag = "ConnectionError";

	constructor(
		message: string,
		readonly cause?: unknown,
		readonly url?: string,
		readonly database?: string,
	) {
		super(message, cause, { url, database });
	}
}

/**
 * Error thrown when schema validation fails
 * Includes validation details and raw data
 */
export class ValidationError extends DomainError {
	readonly _tag = "ValidationError";

	constructor(
		message: string,
		readonly cause?: unknown,
		readonly schema?: string,
		readonly rawData?: unknown,
	) {
		super(message, cause, { schema, rawData });
	}
}

/**
 * Error thrown when constraint violations occur
 * Includes constraint details and attempted values
 */
export class ConstraintError extends DomainError {
	readonly _tag = "ConstraintError";

	constructor(
		message: string,
		readonly cause?: unknown,
		readonly constraint?: string,
		readonly values?: Record<string, unknown>,
	) {
		super(message, cause, { constraint, values });
	}
}

/**
 * Type guard to check if an error is a DomainError
 */
export const isDomainError = (error: unknown): error is DomainError => {
	return error instanceof Error && "_tag" in error;
};

/**
 * Type guard to check if an error is a specific domain error type
 */
export const isDomainErrorOf = <T extends DomainError>(
	error: unknown,
	tag: T["_tag"],
): error is T => {
	return isDomainError(error) && error._tag === tag;
};
