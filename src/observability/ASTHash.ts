// Merkle DAG: ast_hash_v1 -> AST hashing for observability
// Generates stable hashes for query ASTs for logging and monitoring
// Dependencies: [CypherAST, Normalize]

import type { Query } from "../ast/CypherAST";
import { normalize } from "../ast/Normalize";

/**
 * Generates a stable hash for a query AST
 * Uses normalized AST to ensure equivalent queries have the same hash
 */
export const astHash = (q: Query): string => {
	const normalized = normalize(q);
	const serialized = JSON.stringify(normalized);
	return simpleHash(serialized);
};

/**
 * Simple but stable hash function (DJB2)
 * For production, consider using crypto.createHash('sha256')
 */
const simpleHash = (str: string): string => {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
};

/**
 * Query execution metrics for structured logging
 */
export interface QueryMetrics {
	readonly astHash: string;
	readonly cypher: string;
	readonly durationMs: number;
	readonly retries: number;
	readonly timestamp: Date;
	readonly planDigest?: string;
}

/**
 * Creates a query metrics object
 */
export const createQueryMetrics = (
	q: Query,
	cypher: string,
	durationMs: number,
	retries = 0,
	planDigest?: string,
): QueryMetrics => ({
	astHash: astHash(q),
	cypher,
	durationMs,
	retries,
	timestamp: new Date(),
	...(planDigest !== undefined && { planDigest }),
});

/**
 * Latency percentiles tracker (simple in-memory implementation)
 */
export class LatencyTracker {
	private measurements: number[] = [];

	record(latencyMs: number): void {
		this.measurements.push(latencyMs);
		// Keep only last 1000 measurements
		if (this.measurements.length > 1000) {
			this.measurements.shift();
		}
	}

	getPercentile(p: number): number {
		if (this.measurements.length === 0) {
			return 0;
		}
		const sorted = [...this.measurements].sort((a, b) => a - b);
		const index = Math.ceil((p / 100) * sorted.length) - 1;
		return sorted[Math.max(0, index)] || 0;
	}

	getP50(): number {
		return this.getPercentile(50);
	}

	getP95(): number {
		return this.getPercentile(95);
	}

	getP99(): number {
		return this.getPercentile(99);
	}

	getStats(): { p50: number; p95: number; p99: number; count: number } {
		return {
			p50: this.getP50(),
			p95: this.getP95(),
			p99: this.getP99(),
			count: this.measurements.length,
		};
	}

	reset(): void {
		this.measurements = [];
	}
}

/**
 * Query logger interface
 */
export interface QueryLogger {
	log(metrics: QueryMetrics): void;
	logError(metrics: Partial<QueryMetrics>, error: Error): void;
}

/**
 * Console-based query logger
 */
export class ConsoleQueryLogger implements QueryLogger {
	log(metrics: QueryMetrics): void {
		console.log("[Query]", {
			astHash: metrics.astHash,
			durationMs: metrics.durationMs,
			retries: metrics.retries,
			timestamp: metrics.timestamp.toISOString(),
			planDigest: metrics.planDigest,
		});
	}

	logError(metrics: Partial<QueryMetrics>, error: Error): void {
		console.error("[Query Error]", {
			astHash: metrics.astHash,
			error: error.message,
			timestamp: metrics.timestamp?.toISOString() || new Date().toISOString(),
		});
	}
}
