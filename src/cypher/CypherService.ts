// Merkle DAG: cypher_service_v1 -> runQuery, runQuerySingle, QueryError
// Direct query execution with result decoding
// Dependencies: Codec

import * as Schema from "effect/Schema";
import type { QueryResult, Session } from "neo4j-driver";
import { QueryError, ValidationError } from "../errors/DomainError";

/**
 * Executes a Cypher query and decodes the results using the provided schema
 * Returns an array of decoded results
 *
 * @param session - Neo4j session to execute the query
 * @param cypher - The Cypher query string
 * @param params - Query parameters (must be serializable)
 * @param decoder - Schema decoder for result validation
 * @returns Promise that resolves to decoded results
 */
export const runQuery = async <A>(
	session: Session,
	cypher: string,
	params: Record<string, unknown>,
	decoder: Schema.Schema<A>,
): Promise<readonly A[]> => {
	try {
		const result: QueryResult = await session.run(cypher, params);
		return result.records.map((record) => {
			try {
				// Assume the query returns a single object per record
				// This matches common patterns like RETURN {id: n.id, name: n.name, ...}
				const rawData = record.get(0);
				if (rawData === null || rawData === undefined) {
					throw new ValidationError(
						"Query returned null or undefined value",
						undefined,
						"decoder",
						rawData,
					);
				}
				// For now, call decoder but cast result since Schema integration is complex
				// TODO: Properly integrate effect/Schema when needed
				return decoder(rawData) as A;
			} catch (decodeError) {
				if (decodeError instanceof ValidationError) {
					throw decodeError;
				}
				throw new ValidationError(
					"Failed to decode query result",
					decodeError,
					"decoder",
					record.get(0),
				);
			}
		});
	} catch (error) {
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new QueryError(
			"Cypher query execution failed",
			error,
			cypher,
			params,
		);
	}
};

/**
 * Executes a Cypher query expecting exactly one result
 * Returns the single decoded result or fails if no results or multiple results
 *
 * @param session - Neo4j session to execute the query
 * @param cypher - The Cypher query string
 * @param params - Query parameters
 * @param decoder - Schema decoder for result validation
 * @returns Promise that resolves to a single decoded result
 */
export const runQuerySingle = async <A>(
	session: Session,
	cypher: string,
	params: Record<string, unknown>,
	decoder: Schema.Schema<A>,
): Promise<A | undefined> => {
	const results = await runQuery(session, cypher, params, decoder);
	if (results.length === 0) {
		throw new QueryError(
			"Query returned no results",
			undefined,
			cypher,
			params,
		);
	}
	if (results.length > 1) {
		throw new QueryError(
			"Query returned multiple results, expected one",
			undefined,
			cypher,
			params,
		);
	}
	// We know results[0] exists because we checked length > 0 above
	return results[0];
};

/**
 * Executes a Cypher query and returns raw Neo4j records
 * Useful when you need access to Neo4j-specific features or metadata
 *
 * @param session - Neo4j session to execute the query
 * @param cypher - The Cypher query string
 * @param params - Query parameters
 * @returns Promise that resolves to raw QueryResult
 */
export const runQueryRaw = (
	session: Session,
	cypher: string,
	params: Record<string, unknown>,
): Promise<QueryResult> => {
	return session.run(cypher, params);
};

/**
 * Executes a write query and returns the summary
 * Useful for mutations where you need to know affected records
 *
 * @param session - Neo4j session to execute the query
 * @param cypher - The Cypher write query string
 * @param params - Query parameters
 * @returns Promise that resolves to QueryResult
 */
export const runWriteQuery = (
	session: Session,
	cypher: string,
	params: Record<string, unknown>,
): Promise<QueryResult> => runQueryRaw(session, cypher, params); // Write queries use the same execution path

/**
 * Executes multiple queries in batch within a single session
 * Useful for complex operations that need to be executed together
 *
 * @param session - Neo4j session to execute the queries
 * @param queries - Array of {cypher, params} objects
 * @returns Promise that resolves to array of QueryResult
 */
export const runBatchQueries = async (
	session: Session,
	queries: Array<{ cypher: string; params: Record<string, unknown> }>,
): Promise<readonly QueryResult[]> => {
	const results: QueryResult[] = [];
	for (const query of queries) {
		const result = await session.run(query.cypher, query.params);
		results.push(result);
	}
	return results;
};
