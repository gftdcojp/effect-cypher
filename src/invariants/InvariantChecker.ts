// Merkle DAG: invariant_checker_v1 -> Invariant checking framework
// Provides ∀∃ constraint validation for graph data
// Dependencies: [Effect]

import * as Effect from "effect/Effect";
import type { Session } from "neo4j-driver";

/**
 * Result of an invariant check
 */
export interface InvariantResult {
	readonly name: string;
	readonly passed: boolean;
	readonly message: string;
	readonly details?: unknown;
}

/**
 * Invariant check function
 */
export type InvariantCheck = (session: Session) => Effect.Effect<InvariantResult, Error, never>;

/**
 * Creates an invariant that checks if all nodes of a type have a unique relationship
 * Example: ∀p ∃! u. (u)-[:AUTHORED]->(p)
 */
export const forAllExistsUnique = (
	name: string,
	nodeLabel: string,
	relationshipType: string,
	targetLabel: string,
): InvariantCheck => {
	return (session: Session) =>
		Effect.tryPromise({
			try: async () => {
				const query = `
					MATCH (n:${nodeLabel})
					OPTIONAL MATCH (n)<-[r:${relationshipType}]-(t:${targetLabel})
					WITH n, count(r) as relCount
					WHERE relCount <> 1
					RETURN count(n) as violationCount, collect(n.id)[..5] as sampleIds
				`;
				const result = await session.run(query);
				const record = result.records[0];
				const violationCount = record?.get("violationCount").toNumber() || 0;
				const sampleIds = record?.get("sampleIds") || [];

				return {
					name,
					passed: violationCount === 0,
					message:
						violationCount === 0
							? `All ${nodeLabel} nodes have exactly one ${relationshipType} relationship`
							: `Found ${violationCount} ${nodeLabel} nodes without exactly one ${relationshipType} relationship`,
					details: violationCount > 0 ? { sampleIds } : undefined,
				};
			},
			catch: (error) => error as Error,
		});
};

/**
 * Creates an invariant that checks if all nodes have a required property
 */
export const allNodesHaveProperty = (
	name: string,
	nodeLabel: string,
	propertyName: string,
): InvariantCheck => {
	return (session: Session) =>
		Effect.tryPromise({
			try: async () => {
				const query = `
					MATCH (n:${nodeLabel})
					WHERE n.${propertyName} IS NULL
					RETURN count(n) as missingCount, collect(n.id)[..5] as sampleIds
				`;
				const result = await session.run(query);
				const record = result.records[0];
				const missingCount = record?.get("missingCount").toNumber() || 0;
				const sampleIds = record?.get("sampleIds") || [];

				return {
					name,
					passed: missingCount === 0,
					message:
						missingCount === 0
							? `All ${nodeLabel} nodes have required property ${propertyName}`
							: `Found ${missingCount} ${nodeLabel} nodes missing property ${propertyName}`,
					details: missingCount > 0 ? { sampleIds } : undefined,
				};
			},
			catch: (error) => error as Error,
		});
};

/**
 * Creates an invariant that checks for property uniqueness
 */
export const propertyIsUnique = (
	name: string,
	nodeLabel: string,
	propertyName: string,
): InvariantCheck => {
	return (session: Session) =>
		Effect.tryPromise({
			try: async () => {
				const query = `
					MATCH (n:${nodeLabel})
					WHERE n.${propertyName} IS NOT NULL
					WITH n.${propertyName} as value, count(*) as cnt
					WHERE cnt > 1
					RETURN count(*) as duplicateCount, collect(value)[..5] as sampleValues
				`;
				const result = await session.run(query);
				const record = result.records[0];
				const duplicateCount = record?.get("duplicateCount").toNumber() || 0;
				const sampleValues = record?.get("sampleValues") || [];

				return {
					name,
					passed: duplicateCount === 0,
					message:
						duplicateCount === 0
							? `Property ${propertyName} is unique across all ${nodeLabel} nodes`
							: `Found ${duplicateCount} duplicate values for property ${propertyName}`,
					details: duplicateCount > 0 ? { sampleValues } : undefined,
				};
			},
			catch: (error) => error as Error,
		});
};

/**
 * Runs multiple invariant checks and returns results
 */
export const checkInvariants = (
	session: Session,
	checks: InvariantCheck[],
): Effect.Effect<InvariantResult[], Error, never> => {
	return Effect.all(checks.map((check) => check(session)));
};

/**
 * Runs invariant checks and exits with error if any fail
 */
export const runInvariantsOrFail = async (
	session: Session,
	checks: InvariantCheck[],
): Promise<void> => {
	const results = await Effect.runPromise(checkInvariants(session, checks));

	const failures = results.filter((r) => !r.passed);

	if (failures.length > 0) {
		console.error("❌ Invariant checks failed:");
		for (const failure of failures) {
			console.error(`  - ${failure.name}: ${failure.message}`);
			if (failure.details) {
				console.error(`    Details:`, failure.details);
			}
		}
		process.exit(1);
	}

	console.log("✅ All invariant checks passed");
	for (const result of results) {
		console.log(`  ✓ ${result.name}`);
	}
};

/**
 * Example invariants for common patterns
 */
export const exampleInvariants = {
	/**
	 * Each Post has exactly one author
	 */
	postHasUniqueAuthor: forAllExistsUnique(
		"Post has unique author",
		"Post",
		"AUTHORED",
		"Person",
	),

	/**
	 * All Person nodes have a name property
	 */
	personHasName: allNodesHaveProperty("Person has name", "Person", "name"),

	/**
	 * Person IDs are unique
	 */
	personIdUnique: propertyIsUnique("Person ID is unique", "Person", "id"),
};
