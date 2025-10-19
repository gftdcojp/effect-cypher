import { describe, expect, it } from "vitest";
import {
	binaryOp,
	matchClause,
	node,
	param,
	property,
	query,
	returnClause,
	whereClause,
} from "../../src/ast/CypherAST";
import {
	LatencyTracker,
	astHash,
	createQueryMetrics,
} from "../../src/observability/ASTHash";

describe("ASTHash", () => {
	describe("astHash", () => {
		it("should generate a stable hash for a query", () => {
			const q = query(
				[
					matchClause(node("p", ["Person"])),
					whereClause(binaryOp(">=", property("p", "age"), param("minAge"))),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{ minAge: 18 },
			);

			const hash1 = astHash(q);
			const hash2 = astHash(q);

			expect(hash1).toBe(hash2);
			expect(hash1).toMatch(/^[0-9a-f]{8}$/);
		});

		it("should produce the same hash for equivalent queries", () => {
			const q1 = query(
				[
					matchClause(node("p", ["Person"])),
					whereClause(binaryOp(">=", property("p", "age"), param("minAge"))),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{ minAge: 18, active: true },
			);

			const q2 = query(
				[
					matchClause(node("p", ["Person"])),
					whereClause(binaryOp(">=", property("p", "age"), param("minAge"))),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{ active: true, minAge: 18 }, // Different param order
			);

			const hash1 = astHash(q1);
			const hash2 = astHash(q2);

			// After normalization, should have the same hash
			expect(hash1).toBe(hash2);
		});

		it("should produce different hashes for different queries", () => {
			const q1 = query(
				[
					matchClause(node("p", ["Person"])),
					whereClause(binaryOp(">=", property("p", "age"), param("minAge"))),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{ minAge: 18 },
			);

			const q2 = query(
				[
					matchClause(node("p", ["Person"])),
					whereClause(binaryOp(">", property("p", "age"), param("minAge"))), // Different operator
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{ minAge: 18 },
			);

			const hash1 = astHash(q1);
			const hash2 = astHash(q2);

			expect(hash1).not.toBe(hash2);
		});
	});

	describe("createQueryMetrics", () => {
		it("should create query metrics with all fields", () => {
			const q = query(
				[
					matchClause(node("p", ["Person"])),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{},
			);

			const metrics = createQueryMetrics(
				q,
				"MATCH (p:Person) RETURN p",
				123,
				2,
				"plan-digest-123",
			);

			expect(metrics.astHash).toMatch(/^[0-9a-f]{8}$/);
			expect(metrics.cypher).toBe("MATCH (p:Person) RETURN p");
			expect(metrics.durationMs).toBe(123);
			expect(metrics.retries).toBe(2);
			expect(metrics.planDigest).toBe("plan-digest-123");
			expect(metrics.timestamp).toBeInstanceOf(Date);
		});

		it("should create metrics without optional fields", () => {
			const q = query(
				[
					matchClause(node("p", ["Person"])),
					returnClause([{ _tag: "Variable", name: "p" }]),
				],
				{},
			);

			const metrics = createQueryMetrics(q, "MATCH (p:Person) RETURN p", 50);

			expect(metrics.retries).toBe(0);
			expect(metrics.planDigest).toBeUndefined();
		});
	});

	describe("LatencyTracker", () => {
		it("should record and calculate percentiles", () => {
			const tracker = new LatencyTracker();

			// Record some measurements
			tracker.record(100);
			tracker.record(200);
			tracker.record(300);
			tracker.record(400);
			tracker.record(500);

			const p50 = tracker.getP50();
			const p95 = tracker.getP95();
			const p99 = tracker.getP99();

			expect(p50).toBeGreaterThan(0);
			expect(p95).toBeGreaterThanOrEqual(p50);
			expect(p99).toBeGreaterThanOrEqual(p95);
		});

		it("should provide stats summary", () => {
			const tracker = new LatencyTracker();

			tracker.record(100);
			tracker.record(200);
			tracker.record(300);

			const stats = tracker.getStats();

			expect(stats.count).toBe(3);
			expect(stats.p50).toBeGreaterThan(0);
			expect(stats.p95).toBeGreaterThan(0);
			expect(stats.p99).toBeGreaterThan(0);
		});

		it("should handle empty measurements", () => {
			const tracker = new LatencyTracker();

			const stats = tracker.getStats();

			expect(stats.count).toBe(0);
			expect(stats.p50).toBe(0);
			expect(stats.p95).toBe(0);
			expect(stats.p99).toBe(0);
		});

		it("should limit stored measurements to 1000", () => {
			const tracker = new LatencyTracker();

			// Record more than 1000 measurements
			for (let i = 0; i < 1500; i++) {
				tracker.record(i);
			}

			const stats = tracker.getStats();
			expect(stats.count).toBe(1000);
		});

		it("should reset measurements", () => {
			const tracker = new LatencyTracker();

			tracker.record(100);
			tracker.record(200);
			expect(tracker.getStats().count).toBe(2);

			tracker.reset();
			expect(tracker.getStats().count).toBe(0);
		});
	});
});
