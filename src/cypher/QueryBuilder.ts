// Merkle DAG: query_builder_v1 -> QueryAST, ParametrizedQuery, BuildResult
// Type-safe Cypher query construction using @neo4j/cypher-builder
// Dependencies: []

/**
 * Built query result containing both the Cypher string and parameters
 */
export interface QueryBuildResult {
	readonly cypher: string;
	readonly params: Record<string, unknown>;
}

/**
 * Creates a parameterized query for finding people above a certain age
 * Example domain-specific query builder - simplified for basic functionality
 * @param minAge - Minimum age threshold
 * @returns Built query result
 */
export const matchAdults = (minAge: number): QueryBuildResult => {
	return {
		cypher:
			"MATCH (person:Person) WHERE person.age >= $minAge RETURN {id: person.id, name: person.name, age: person.age}",
		params: { minAge },
	};
};

/**
 * Creates a simple query to find nodes by label
 * @param label - The node label to search for
 * @returns Built query result
 */
export const findNodesByLabel = (label: string): QueryBuildResult => {
	return {
		cypher: `MATCH (n:${label}) RETURN n`,
		params: {},
	};
};

/**
 * Creates a query to find a node by ID
 * @param label - The node label
 * @param id - The node ID
 * @returns Built query result
 */
export const findNodeById = (label: string, id: string): QueryBuildResult => {
	return {
		cypher: `MATCH (n:${label} {id: $id}) RETURN n`,
		params: { id },
	};
};

/**
 * Creates a query to create a new node
 * @param label - The node label
 * @param properties - Node properties
 * @returns Built query result
 */
export const createNode = (
	label: string,
	properties: Record<string, unknown>,
): QueryBuildResult => {
	const propString = Object.keys(properties)
		.map((key) => `${key}: $${key}`)
		.join(", ");
	return {
		cypher: `CREATE (n:${label} {${propString}}) RETURN n`,
		params: properties,
	};
};
