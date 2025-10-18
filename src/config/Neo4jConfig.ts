// Merkle DAG: config_schema_v1 -> Neo4jConfig, ValidationRules
// Type-safe configuration for Neo4j connection parameters
// Dependencies: []

/**
 * Neo4j connection configuration
 * Provides type-safe validation for Neo4j driver configuration
 */
export interface Neo4jConfig {
  /** Neo4j server URL (e.g., "neo4j://localhost:7687") */
  url: string;

  /** Database username */
  user: string;

  /** Database password */
  password: string;

  /** Target database name (optional, defaults to "neo4j") */
  database: string | undefined;

  /** Default query timeout in milliseconds */
  defaultTimeoutMs: number | undefined;

  /** Connection pool configuration */
  connectionPoolSize: number | undefined;

  /** Maximum connection lifetime in milliseconds */
  maxConnectionLifetimeMs: number | undefined;
}

/**
 * Validates a Neo4j configuration object
 * @param config - Configuration object to validate
 * @returns Validated Neo4jConfig
 */
export const validateConfig = (config: unknown): Neo4jConfig => {
	if (!config || typeof config !== "object") {
		throw new Error("config must be an object");
	}
	const obj = config as Record<string, unknown>;
	if (!obj.url || typeof obj.url !== "string") {
		throw new Error("url is required and must be a string");
	}
	if (!obj.user || typeof obj.user !== "string") {
		throw new Error("user is required and must be a string");
	}
	if (!obj.password || typeof obj.password !== "string") {
		throw new Error("password is required and must be a string");
	}
	return {
		url: obj.url,
		user: obj.user,
		password: obj.password,
		database: typeof obj.database === "string" ? obj.database : undefined,
		defaultTimeoutMs: typeof obj.defaultTimeoutMs === "number" ? obj.defaultTimeoutMs : undefined,
		connectionPoolSize: typeof obj.connectionPoolSize === "number" ? obj.connectionPoolSize : undefined,
		maxConnectionLifetimeMs: typeof obj.maxConnectionLifetimeMs === "number" ? obj.maxConnectionLifetimeMs : undefined,
	};
};

/**
 * Creates a Neo4j configuration with sensible defaults
 * @param url - Neo4j server URL
 * @param user - Database username
 * @param password - Database password
 * @param options - Additional configuration options
 * @returns Validated Neo4jConfig
 */
export const createConfig = (
	url: string,
	user: string,
	password: string,
	options: Partial<Omit<Neo4jConfig, "url" | "user" | "password">> = {},
): Neo4jConfig => {
	return validateConfig({
		url,
		user,
		password,
		database: "neo4j",
		defaultTimeoutMs: 30000,
		connectionPoolSize: 10,
		maxConnectionLifetimeMs: 3600000,
		...options,
	});
};
