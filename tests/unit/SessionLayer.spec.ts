import { describe, it, expect, vi, beforeEach } from "vitest";
import neo4j from "neo4j-driver";
import { makeSession, makeWriteSession, SessionError } from "../../src/core/SessionLayer";

// Mock neo4j driver
vi.mock("neo4j-driver", () => ({
	default: {
		session: {
			READ: "READ",
			WRITE: "WRITE",
		},
	},
}));

describe("SessionLayer", () => {
	const mockSession = {
		close: vi.fn(),
		run: vi.fn(),
	};

	const mockDriver = {
		session: vi.fn().mockReturnValue(mockSession),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("makeSession", () => {
		it("should create a read session with default access mode", () => {
			const session = makeSession(mockDriver);

			expect(mockDriver.session).toHaveBeenCalledWith({
				defaultAccessMode: "READ",
			});
			expect(session).toBe(mockSession);
		});

		it("should create a read session with database parameter", () => {
			const session = makeSession(mockDriver, "testdb");

			expect(mockDriver.session).toHaveBeenCalledWith({
				database: "testdb",
				defaultAccessMode: "READ",
			});
			expect(session).toBe(mockSession);
		});

		it("should handle undefined database parameter", () => {
			const session = makeSession(mockDriver, undefined);

			expect(mockDriver.session).toHaveBeenCalledWith({
				defaultAccessMode: "READ",
			});
			expect(session).toBe(mockSession);
		});
	});

	describe("makeWriteSession", () => {
		it("should create a write session with write access mode", () => {
			const session = makeWriteSession(mockDriver);

			expect(mockDriver.session).toHaveBeenCalledWith({
				defaultAccessMode: "WRITE",
			});
			expect(session).toBe(mockSession);
		});

		it("should create a write session with database parameter", () => {
			const session = makeWriteSession(mockDriver, "testdb");

			expect(mockDriver.session).toHaveBeenCalledWith({
				database: "testdb",
				defaultAccessMode: "WRITE",
			});
			expect(session).toBe(mockSession);
		});

		it("should handle undefined database parameter", () => {
			const session = makeWriteSession(mockDriver, undefined);

			expect(mockDriver.session).toHaveBeenCalledWith({
				defaultAccessMode: "WRITE",
			});
			expect(session).toBe(mockSession);
		});
	});

	describe("SessionError", () => {
		it("should create SessionError with message and cause", () => {
			const cause = new Error("Original error");
			const error = new SessionError("Session failed", cause);

			expect(error.message).toBe("Session failed");
			expect(error.cause).toBe(cause);
			expect(error.name).toBe("SessionError");
			expect(error._tag).toBe("SessionError");
		});

		it("should create SessionError without cause", () => {
			const error = new SessionError("Session failed");

			expect(error.message).toBe("Session failed");
			expect(error.cause).toBeUndefined();
			expect(error.name).toBe("SessionError");
			expect(error._tag).toBe("SessionError");
		});
	});
});
