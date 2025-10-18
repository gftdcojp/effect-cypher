// Merkle DAG: driver_layer_v1 -> makeDriver, verifyConnectivity
// Direct driver lifecycle management
// Dependencies: Neo4jConfig

import neo4j, { type Driver, type ServerInfo } from "neo4j-driver";
import type { Neo4jConfig } from "../config/Neo4jConfig";

/**
 * Creates a Neo4j driver instance
 * The caller is responsible for closing the driver
 *
 * @param config - Validated Neo4j configuration
 * @returns Neo4j driver instance
 */
export const makeDriver = (config: Neo4jConfig): Driver =>
	neo4j.driver(config.url, neo4j.auth.basic(config.user, config.password), {
		maxConnectionPoolSize: config.connectionPoolSize ?? 10,
		maxConnectionLifetime: config.maxConnectionLifetimeMs ?? 3600000,
	});

/**
 * Error thrown when driver operations fail
 */
export class DriverError extends Error {
	readonly _tag = "DriverError";

	constructor(
		message: string,
		readonly cause?: unknown,
	) {
		super(message);
		this.name = "DriverError";
	}
}

/**
 * Verifies driver connectivity
 * Useful for health checks and connection validation
 *
 * @param driver - Neo4j driver instance
 * @returns Promise that resolves with server info when connectivity is verified
 */
export const verifyConnectivity = (driver: Driver): Promise<ServerInfo> =>
	driver.verifyConnectivity();
