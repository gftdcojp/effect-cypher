// Merkle DAG: query_policies_v1 -> Effect-based retry, timeout, circuit breaker
// Provides first-class Effect policies for query execution
// Dependencies: [Effect]

import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import type { Session } from "neo4j-driver";
import type { QueryBuildResult } from "../cypher/QueryBuilder";

/**
 * Policy configuration for query execution
 */
export interface QueryPolicyConfig {
	readonly timeoutMs?: number;
	readonly retrySchedule?: Schedule.Schedule<number, unknown, never>;
	readonly circuitBreakerName?: string;
	readonly idempotencyKey?: string;
}

/**
 * Execute a query with Effect-based policies
 */
export const executeWithPolicies = <A>(
	session: Session,
	query: QueryBuildResult,
	executor: (session: Session, query: QueryBuildResult) => Promise<A>,
	config: QueryPolicyConfig = {},
): Effect.Effect<A, Error, never> => {
	let effect = Effect.tryPromise({
		try: () => executor(session, query),
		catch: (error) => error as Error,
	});

	// Apply timeout if specified
	if (config.timeoutMs) {
		effect = Effect.timeout(effect, config.timeoutMs);
	}

	// Apply retry if specified
	if (config.retrySchedule) {
		effect = Effect.retry(effect, config.retrySchedule);
	}

	return effect;
};

/**
 * Common retry schedules
 */
export const retrySchedules = {
	/**
	 * Exponential backoff: 100ms, 200ms, 400ms, ...
	 */
	exponential: (maxRetries = 3): Schedule.Schedule<number, unknown, never> =>
		Schedule.exponential("100 millis").pipe(
			Schedule.compose(Schedule.recurs(maxRetries)),
		),

	/**
	 * Fixed delay: 1s, 1s, 1s, ...
	 */
	fixed: (delayMs = 1000, maxRetries = 3): Schedule.Schedule<number, unknown, never> =>
		Schedule.fixed(`${delayMs} millis`).pipe(
			Schedule.compose(Schedule.recurs(maxRetries)),
		),

	/**
	 * Fibonacci backoff: 100ms, 100ms, 200ms, 300ms, 500ms, ...
	 */
	fibonacci: (maxRetries = 5): Schedule.Schedule<number, unknown, never> =>
		Schedule.fibonacci("100 millis").pipe(
			Schedule.compose(Schedule.recurs(maxRetries)),
		),
};

/**
 * Circuit breaker state (simplified in-memory implementation)
 */
class CircuitBreaker {
	private failures = 0;
	private lastFailureTime = 0;
	private state: "closed" | "open" | "half-open" = "closed";

	constructor(
		private readonly threshold = 5,
		private readonly timeoutMs = 60000,
	) {}

	isOpen(): boolean {
		if (this.state === "open") {
			const now = Date.now();
			if (now - this.lastFailureTime >= this.timeoutMs) {
				this.state = "half-open";
				return false;
			}
			return true;
		}
		return false;
	}

	recordSuccess(): void {
		this.failures = 0;
		this.state = "closed";
	}

	recordFailure(): void {
		this.failures++;
		this.lastFailureTime = Date.now();
		if (this.failures >= this.threshold) {
			this.state = "open";
		}
	}

	getState(): "closed" | "open" | "half-open" {
		return this.state;
	}
}

/**
 * Circuit breaker registry
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker
 */
export const getCircuitBreaker = (name: string): CircuitBreaker => {
	if (!circuitBreakers.has(name)) {
		circuitBreakers.set(name, new CircuitBreaker());
	}
	return circuitBreakers.get(name)!;
};

/**
 * Execute with circuit breaker protection
 */
export const withCircuitBreaker = <A, E>(
	effect: Effect.Effect<A, E, never>,
	name: string,
): Effect.Effect<A, E | Error, never> => {
	const breaker = getCircuitBreaker(name);

	return Effect.gen(function* () {
		if (breaker.isOpen()) {
			throw new Error(`Circuit breaker ${name} is open`);
		}

		try {
			const result = yield* effect;
			breaker.recordSuccess();
			return result;
		} catch (error) {
			breaker.recordFailure();
			throw error;
		}
	});
};

/**
 * Idempotency key for preventing duplicate operations
 */
export interface IdempotencyContext {
	readonly key: string;
	readonly timestamp: Date;
}

/**
 * Track idempotency keys (simplified in-memory implementation)
 */
const idempotencyKeys = new Map<string, { timestamp: Date; result: unknown }>();

/**
 * Execute with idempotency protection
 */
export const withIdempotency = <A>(
	effect: Effect.Effect<A, Error, never>,
	key: string,
	ttlMs = 300000, // 5 minutes
): Effect.Effect<A, Error, never> => {
	return Effect.gen(function* () {
		const now = Date.now();

		// Check if we have a cached result
		const cached = idempotencyKeys.get(key);
		if (cached) {
			const age = now - cached.timestamp.getTime();
			if (age < ttlMs) {
				return cached.result as A;
			}
			idempotencyKeys.delete(key);
		}

		// Execute and cache result
		const result = yield* effect;
		idempotencyKeys.set(key, { timestamp: new Date(), result });
		return result;
	});
};
