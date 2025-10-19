import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	TransactionError,
	withReadTx,
	withReadTxBatch,
	withWriteTx,
	withWriteTxBatch,
} from "../../src/core/TxManager";

describe("TxManager", () => {
	const mockTx = {
		run: vi.fn(),
	};

	const mockSession = {
		executeRead: vi.fn(),
		executeWrite: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("withReadTx", () => {
		it("should execute read transaction successfully", async () => {
			const expectedResult = { count: 42 };
			mockSession.executeRead.mockImplementation(async (txFn) => {
				return await txFn(mockTx);
			});

			const txFn = vi.fn().mockResolvedValue(expectedResult);
			const result = await withReadTx(mockSession, txFn);

			expect(mockSession.executeRead).toHaveBeenCalledWith(txFn);
			expect(result).toBe(expectedResult);
			expect(txFn).toHaveBeenCalledWith(mockTx);
		});

		it("should handle transaction errors", async () => {
			const error = new Error("Transaction failed");
			mockSession.executeRead.mockRejectedValue(error);

			const txFn = vi.fn();
			await expect(withReadTx(mockSession, txFn)).rejects.toThrow(
				"Transaction failed",
			);
		});
	});

	describe("withWriteTx", () => {
		it("should execute write transaction successfully", async () => {
			const expectedResult = { success: true };
			mockSession.executeWrite.mockImplementation(async (txFn) => {
				return await txFn(mockTx);
			});

			const txFn = vi.fn().mockResolvedValue(expectedResult);
			const result = await withWriteTx(mockSession, txFn);

			expect(mockSession.executeWrite).toHaveBeenCalledWith(txFn);
			expect(result).toBe(expectedResult);
			expect(txFn).toHaveBeenCalledWith(mockTx);
		});

		it("should handle transaction errors", async () => {
			const error = new Error("Write transaction failed");
			mockSession.executeWrite.mockRejectedValue(error);

			const txFn = vi.fn();
			await expect(withWriteTx(mockSession, txFn)).rejects.toThrow(
				"Write transaction failed",
			);
		});
	});

	describe("withReadTxBatch", () => {
		it("should execute batch read operations", async () => {
			const results = ["result1", "result2", "result3"];
			mockSession.executeRead.mockImplementation(async (txFn) => {
				return await txFn(mockTx);
			});

			const operations = [
				vi.fn().mockResolvedValue("result1"),
				vi.fn().mockResolvedValue("result2"),
				vi.fn().mockResolvedValue("result3"),
			];

			const batchResult = await withReadTxBatch(mockSession, operations);

			expect(mockSession.executeRead).toHaveBeenCalledTimes(1);
			expect(batchResult).toEqual(results);
			expect(operations[0]).toHaveBeenCalledWith(mockTx);
			expect(operations[1]).toHaveBeenCalledWith(mockTx);
			expect(operations[2]).toHaveBeenCalledWith(mockTx);
		});

		it("should handle empty operations array", async () => {
			mockSession.executeRead.mockResolvedValue([]);

			const batchResult = await withReadTxBatch(mockSession, []);

			expect(mockSession.executeRead).toHaveBeenCalledTimes(1);
			expect(batchResult).toEqual([]);
		});
	});

	describe("withWriteTxBatch", () => {
		it("should execute batch write operations", async () => {
			const results = ["write1", "write2"];
			mockSession.executeWrite.mockImplementation(async (txFn) => {
				return await txFn(mockTx);
			});

			const operations = [
				vi.fn().mockResolvedValue("write1"),
				vi.fn().mockResolvedValue("write2"),
			];

			const batchResult = await withWriteTxBatch(mockSession, operations);

			expect(mockSession.executeWrite).toHaveBeenCalledTimes(1);
			expect(batchResult).toEqual(results);
			expect(operations[0]).toHaveBeenCalledWith(mockTx);
			expect(operations[1]).toHaveBeenCalledWith(mockTx);
		});

		it("should handle batch operation errors", async () => {
			const error = new Error("Batch write failed");
			mockSession.executeWrite.mockRejectedValue(error);

			const operations = [vi.fn().mockRejectedValue(error)];

			await expect(withWriteTxBatch(mockSession, operations)).rejects.toThrow(
				"Batch write failed",
			);
		});
	});

	describe("TransactionError", () => {
		it("should create TransactionError with message and cause", () => {
			const cause = new Error("Original error");
			const error = new TransactionError("Transaction failed", cause);

			expect(error.message).toBe("Transaction failed");
			expect(error.cause).toBe(cause);
			expect(error.name).toBe("TransactionError");
			expect(error._tag).toBe("TransactionError");
		});

		it("should create TransactionError without cause", () => {
			const error = new TransactionError("Transaction failed");

			expect(error.message).toBe("Transaction failed");
			expect(error.cause).toBeUndefined();
			expect(error.name).toBe("TransactionError");
			expect(error._tag).toBe("TransactionError");
		});
	});
});
