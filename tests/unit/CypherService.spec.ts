import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Schema from "effect/Schema";
import {
	runQuery,
	runQuerySingle,
	runQueryRaw,
	runWriteQuery,
	runBatchQueries,
	QueryError
} from "../../src/cypher/CypherService";
import { ValidationError } from "../../src/errors/DomainError";

describe("CypherService", () => {
	const mockRecord = {
		get: vi.fn(),
	};

	const mockResult = {
		records: [mockRecord],
	};

	const mockSession = {
		run: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("runQuery", () => {
		it("should execute query and decode results", async () => {
			const rawData = { id: "test", name: "Test User" };
			mockRecord.get.mockReturnValue(rawData);
			mockSession.run.mockResolvedValue(mockResult);

			const decoder = Schema.Struct({
				id: Schema.String,
				name: Schema.String,
			});

			const result = await runQuery(mockSession, "MATCH (n) RETURN n", {}, decoder);

			expect(mockSession.run).toHaveBeenCalledWith("MATCH (n) RETURN n", {});
			expect(mockRecord.get).toHaveBeenCalledWith(0);
			expect(result).toEqual([rawData]);
			expect(result).toHaveLength(1);
		});

		it("should handle null/undefined data with validation error", async () => {
			mockRecord.get.mockReturnValue(null);
			mockSession.run.mockResolvedValue(mockResult);

			const decoder = Schema.Struct({
				id: Schema.String,
				name: Schema.String,
			});

			await expect(runQuery(mockSession, "MATCH (n) RETURN n", {}, decoder))
				.rejects.toThrow(ValidationError);
			await expect(runQuery(mockSession, "MATCH (n) RETURN n", {}, decoder))
				.rejects.toThrow("Query returned null or undefined value");
		});

		it("should handle decoder errors when ValidationError occurs", async () => {
			const rawData = { invalid: "data" };
			mockRecord.get.mockReturnValue(rawData);
			mockSession.run.mockResolvedValue(mockResult);

			// Create a decoder that will fail
			const decoder = Schema.Struct({
				id: Schema.Number, // This will fail because rawData.id is a string, not number
			});

			await expect(runQuery(mockSession, "MATCH (n) RETURN n", {}, decoder))
				.rejects.toThrow(ValidationError);
			await expect(runQuery(mockSession, "MATCH (n) RETURN n", {}, decoder))
				.rejects.toThrow("Failed to decode query result");
		});

		it("should handle session run errors", async () => {
			const error = new Error("Session run failed");
			mockSession.run.mockRejectedValue(error);

			const decoder = vi.fn();

			await expect(runQuery(mockSession, "MATCH (n) RETURN n", {}, decoder))
				.rejects.toThrow(QueryError);
			await expect(runQuery(mockSession, "MATCH (n) RETURN n", {}, decoder))
				.rejects.toThrow("Cypher query execution failed");
		});

		it("should handle empty records", async () => {
			const emptyResult = { records: [] };
			mockSession.run.mockResolvedValue(emptyResult);

			const decoder = vi.fn();

			const result = await runQuery(mockSession, "MATCH (n) RETURN n", {}, decoder);

			expect(result).toEqual([]);
		});
	});

	describe("runQuerySingle", () => {
		it("should return single result", async () => {
			const rawData = { id: "test", name: "Test User" };
			mockRecord.get.mockReturnValue(rawData);
			mockSession.run.mockResolvedValue(mockResult);

			const decoder = Schema.Struct({
				id: Schema.String,
				name: Schema.String,
			});

			const result = await runQuerySingle(mockSession, "MATCH (n) RETURN n LIMIT 1", {}, decoder);

			expect(result).toEqual(rawData);
		});

		it("should throw error for no results", async () => {
			const emptyResult = { records: [] };
			mockSession.run.mockResolvedValue(emptyResult);

			const decoder = vi.fn();

			await expect(runQuerySingle(mockSession, "MATCH (n) RETURN n LIMIT 1", {}, decoder))
				.rejects.toThrow(QueryError);
			await expect(runQuerySingle(mockSession, "MATCH (n) RETURN n LIMIT 1", {}, decoder))
				.rejects.toThrow("Query returned no results");
		});


		it("should throw error for multiple results", async () => {
			const rawData = { id: "test", name: "Test User" };
			mockRecord.get.mockReturnValue(rawData);
			const multiResult = { records: [mockRecord, mockRecord] };
			mockSession.run.mockResolvedValue(multiResult);

			const decoder = Schema.Struct({
				id: Schema.String,
				name: Schema.String,
			});

			await expect(runQuerySingle(mockSession, "MATCH (n) RETURN n", {}, decoder))
				.rejects.toThrow(QueryError);
			await expect(runQuerySingle(mockSession, "MATCH (n) RETURN n", {}, decoder))
				.rejects.toThrow("Query returned multiple results, expected one");
		});
	});

	describe("runQueryRaw", () => {
		it("should execute raw query", async () => {
			mockSession.run.mockResolvedValue(mockResult);

			const result = await runQueryRaw(mockSession, "MATCH (n) RETURN n", { param: "value" });

			expect(mockSession.run).toHaveBeenCalledWith("MATCH (n) RETURN n", { param: "value" });
			expect(result).toBe(mockResult);
		});

		it("should handle raw query errors", async () => {
			const error = new Error("Raw query failed");
			mockSession.run.mockRejectedValue(error);

			await expect(runQueryRaw(mockSession, "MATCH (n) RETURN n", {}))
				.rejects.toThrow(error);
		});
	});

	describe("runWriteQuery", () => {
		it("should delegate to runQueryRaw", async () => {
			mockSession.run.mockResolvedValue(mockResult);

			const result = await runWriteQuery(mockSession, "CREATE (n:Node)", {});

			expect(mockSession.run).toHaveBeenCalledWith("CREATE (n:Node)", {});
			expect(result).toBe(mockResult);
		});
	});

	describe("runBatchQueries", () => {
		it("should execute multiple queries", async () => {
			const queries = [
				{ cypher: "MATCH (n) RETURN n", params: {} },
				{ cypher: "CREATE (n:Node)", params: { id: "test" } },
			];

			const results = [mockResult, mockResult];
			mockSession.run
				.mockResolvedValueOnce(results[0])
				.mockResolvedValueOnce(results[1]);

			const batchResult = await runBatchQueries(mockSession, queries);

			expect(mockSession.run).toHaveBeenCalledTimes(2);
			expect(mockSession.run).toHaveBeenNthCalledWith(1, "MATCH (n) RETURN n", {});
			expect(mockSession.run).toHaveBeenNthCalledWith(2, "CREATE (n:Node)", { id: "test" });
			expect(batchResult).toEqual(results);
		});

		it("should handle batch query errors", async () => {
			const error = new Error("Batch query failed");
			mockSession.run.mockRejectedValue(error);

			const queries = [{ cypher: "MATCH (n) RETURN n", params: {} }];

			await expect(runBatchQueries(mockSession, queries)).rejects.toThrow(error);
		});

		it("should handle empty query batch", async () => {
			const batchResult = await runBatchQueries(mockSession, []);

			expect(mockSession.run).not.toHaveBeenCalled();
			expect(batchResult).toEqual([]);
		});
	});
});
