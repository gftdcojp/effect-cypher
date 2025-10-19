import neo4j from "neo4j-driver";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig } from "../../src/config/Neo4jConfig";
import {
	DriverError,
	makeDriver,
	verifyConnectivity,
} from "../../src/core/DriverLayer";

// Mock neo4j driver
vi.mock("neo4j-driver", () => ({
	default: {
		driver: vi.fn(),
		auth: {
			basic: vi.fn(),
		},
		session: {
			READ: "READ",
			WRITE: "WRITE",
		},
	},
}));

describe("DriverLayer", () => {
	const mockDriver = {
		close: vi.fn(),
		verifyConnectivity: vi.fn(),
		session: vi.fn(),
	};

	const mockConfig = createConfig(
		"neo4j://localhost:7687",
		"neo4j",
		"password",
	);

	beforeEach(() => {
		vi.clearAllMocks();
		(neo4j.driver as any).mockReturnValue(mockDriver);
		(neo4j.auth.basic as any).mockReturnValue("mock-auth");
	});

	describe("makeDriver", () => {
		it("should create a driver with correct parameters", () => {
			const config = createConfig(
				"neo4j://localhost:7687",
				"neo4j",
				"password",
				{
					database: "testdb",
					connectionPoolSize: 5,
				},
			);

			const driver = makeDriver(config);

			expect(neo4j.driver).toHaveBeenCalledWith(
				"neo4j://localhost:7687",
				"mock-auth",
				{
					maxConnectionPoolSize: 5,
					maxConnectionLifetime: 3600000,
				},
			);
			expect(neo4j.auth.basic).toHaveBeenCalledWith("neo4j", "password");
			expect(driver).toBe(mockDriver);
		});

		it("should create driver with default connection pool size", () => {
			const driver = makeDriver(mockConfig);

			expect(neo4j.driver).toHaveBeenCalledWith(
				"neo4j://localhost:7687",
				"mock-auth",
				{
					maxConnectionPoolSize: 10,
					maxConnectionLifetime: 3600000,
				},
			);
		});

		it("should handle undefined database parameter", () => {
			const driver = makeDriver(mockConfig);

			expect(driver).toBe(mockDriver);
		});

		it("should use default values when config properties are undefined", () => {
			const config = createConfig(
				"neo4j://localhost:7687",
				"neo4j",
				"password",
			);

			const driver = makeDriver(config);

			expect(neo4j.driver).toHaveBeenCalledWith(
				"neo4j://localhost:7687",
				"mock-auth",
				{
					maxConnectionPoolSize: 10, // default value
					maxConnectionLifetime: 3600000, // default value
				},
			);
		});
	});

	describe("verifyConnectivity", () => {
		it("should verify connectivity successfully", async () => {
			mockDriver.verifyConnectivity.mockResolvedValue({});

			const result = await verifyConnectivity(mockDriver);

			expect(mockDriver.verifyConnectivity).toHaveBeenCalled();
		});

		it("should handle connectivity verification errors", async () => {
			const error = new Error("Connection failed");
			mockDriver.verifyConnectivity.mockRejectedValue(error);

			await expect(verifyConnectivity(mockDriver)).rejects.toThrow(error);
		});
	});

	describe("DriverError", () => {
		it("should create DriverError with message and cause", () => {
			const cause = new Error("Original error");
			const error = new DriverError("Driver failed", cause);

			expect(error.message).toBe("Driver failed");
			expect(error.cause).toBe(cause);
			expect(error.name).toBe("DriverError");
			expect(error._tag).toBe("DriverError");
		});

		it("should create DriverError without cause", () => {
			const error = new DriverError("Driver failed");

			expect(error.message).toBe("Driver failed");
			expect(error.cause).toBeUndefined();
			expect(error.name).toBe("DriverError");
			expect(error._tag).toBe("DriverError");
		});
	});
});
