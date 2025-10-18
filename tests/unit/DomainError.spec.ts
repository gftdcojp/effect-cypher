import { describe, expect, it } from "vitest";
import {
	ConnectionError,
	ConstraintError,
	QueryError,
	ValidationError,
	isDomainError,
	isDomainErrorOf,
} from "../../src/errors/DomainError";

describe("DomainError", () => {
	describe("QueryError", () => {
		it("should create a QueryError with basic information", () => {
			const error = new QueryError(
				"Query failed",
				new Error("Underlying error"),
			);

			expect(error._tag).toBe("QueryError");
			expect(error.message).toBe("Query failed");
			expect(error.cause).toBeInstanceOf(Error);
			expect(error.name).toBe("QueryError");
		});

		it("should create a QueryError with query context", () => {
			const cypher = "MATCH (n) RETURN n";
			const params = { id: "test" };
			const error = new QueryError("Query failed", undefined, cypher, params);

			expect(error.query).toBe(cypher);
			expect(error.params).toBe(params);
			expect(error.context).toEqual({ query: cypher, params });
		});
	});

	describe("ConnectionError", () => {
		it("should create a ConnectionError with connection details", () => {
			const error = new ConnectionError(
				"Connection failed",
				new Error("Network error"),
				"neo4j://localhost:7687",
				"neo4j",
			);

			expect(error._tag).toBe("ConnectionError");
			expect(error.url).toBe("neo4j://localhost:7687");
			expect(error.database).toBe("neo4j");
			expect(error.context).toEqual({
				url: "neo4j://localhost:7687",
				database: "neo4j",
			});
		});
	});

	describe("ValidationError", () => {
		it("should create a ValidationError with schema information", () => {
			const schema = "PersonSchema";
			const rawData = { invalid: "data" };
			const error = new ValidationError(
				"Validation failed",
				new Error("Schema error"),
				schema,
				rawData,
			);

			expect(error._tag).toBe("ValidationError");
			expect(error.schema).toBe(schema);
			expect(error.rawData).toBe(rawData);
			expect(error.context).toEqual({ schema, rawData });
		});
	});


	describe("ConstraintError", () => {
		it("should create a ConstraintError with constraint details", () => {
			const constraint = "unique_person_id";
			const values = { id: "duplicate-id" };
			const error = new ConstraintError(
				"Constraint violation",
				new Error("Constraint error"),
				constraint,
				values,
			);

			expect(error._tag).toBe("ConstraintError");
			expect(error.constraint).toBe(constraint);
			expect(error.values).toBe(values);
			expect(error.context).toEqual({ constraint, values });
		});
	});

	describe("isDomainError", () => {
		it("should return true for DomainError instances", () => {
			const queryError = new QueryError("test");
			const connectionError = new ConnectionError("test");

			expect(isDomainError(queryError)).toBe(true);
			expect(isDomainError(connectionError)).toBe(true);
		});

		it("should return false for regular errors", () => {
			const regularError = new Error("regular error");
			const stringError = "string error";

			expect(isDomainError(regularError)).toBe(false);
			expect(isDomainError(stringError)).toBe(false);
		});
	});

	describe("isDomainErrorOf", () => {
		it("should return true for matching error types", () => {
			const queryError = new QueryError("test");
			const connectionError = new ConnectionError("test");

			expect(isDomainErrorOf(queryError, "QueryError")).toBe(true);
			expect(isDomainErrorOf(connectionError, "ConnectionError")).toBe(true);
		});

		it("should return false for non-matching error types", () => {
			const queryError = new QueryError("test");

			expect(isDomainErrorOf(queryError, "ConnectionError")).toBe(false);
			expect(isDomainErrorOf(queryError, "ValidationError")).toBe(false);
		});

		it("should return false for non-domain errors", () => {
			const regularError = new Error("regular");

			expect(isDomainErrorOf(regularError, "QueryError")).toBe(false);
		});
	});

	describe("Error inheritance", () => {
		it("should extend the base Error class", () => {
			const error = new QueryError("test message");

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(QueryError);
			expect(error.message).toBe("test message");
			expect(error.stack).toBeDefined();
		});

		it("should have proper prototype chain", () => {
			const error = new ValidationError("test");

			expect(Object.getPrototypeOf(error)).toBe(ValidationError.prototype);
			expect(Object.getPrototypeOf(ValidationError.prototype)).toEqual(
				Error.prototype,
			);
		});
	});

	describe("Context handling", () => {
		it("should merge context with specific properties", () => {
			const error = new QueryError("test", undefined, "MATCH (n) RETURN n", {
				id: "test",
			});

			expect(error.context).toEqual({
				query: "MATCH (n) RETURN n",
				params: { id: "test" },
			});
		});

		it("should handle undefined context gracefully", () => {
			const error = new QueryError("test");

			expect(error.context).toEqual({
				query: undefined,
				params: undefined,
			});
		});
	});
});
