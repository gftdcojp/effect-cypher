// Merkle DAG: session_layer_v1 -> makeSession, makeWriteSession
// Direct session lifecycle management
// Dependencies: DriverLayer

import neo4j, { type Driver, type Session } from "neo4j-driver";

/**
 * Creates a read-only Neo4j session
 * The caller is responsible for closing the session
 *
 * @param driver - Neo4j driver instance
 * @param database - Target database name (optional, uses default if not specified)
 * @returns Neo4j session instance
 */
export const makeSession = (driver: Driver, database?: string): Session =>
	driver.session({
		...(database && { database }),
		defaultAccessMode: neo4j.session.READ, // Default to read-only for safety
	});

/**
 * Creates a write-enabled Neo4j session
 * Use this when you need to perform mutations
 *
 * @param driver - Neo4j driver instance
 * @param database - Target database name (optional)
 * @returns Neo4j write session instance
 */
export const makeWriteSession = (driver: Driver, database?: string): Session =>
	driver.session({
		...(database && { database }),
		defaultAccessMode: neo4j.session.WRITE,
	});

/**
 * Error thrown when session creation or cleanup fails
 */
export class SessionError extends Error {
	readonly _tag = "SessionError";

	constructor(
		message: string,
		readonly cause?: unknown,
	) {
		super(message);
		this.name = "SessionError";
	}
}
