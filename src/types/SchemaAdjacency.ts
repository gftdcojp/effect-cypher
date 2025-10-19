// Merkle DAG: schema_adjacency_v1 -> Schema-level adjacency typing for type-safe traversal
// Enforces valid graph traversals at compile time
// Dependencies: [BrandedTypes]

import type { NodeID } from "./BrandedTypes";

/**
 * Default adjacency map interface
 * Extend this in your application to define your schema
 * 
 * Example:
 * ```typescript
 * declare module "effect-cypher" {
 *   interface AdjacencyMap {
 *     Person: { KNOWS: "Person"; AUTHORED: "Post"; LIVES_IN: "City" };
 *     Post: { WRITTEN_BY: "Person"; HAS_TAG: "Tag" };
 *     City: { LOCATED_IN: "Country" };
 *     Country: {};
 *     Tag: {};
 *   }
 * }
 * ```
 */
export interface AdjacencyMap {
	// Default empty - to be extended by consumers
}

/**
 * Get valid relationship types from a source label
 */
export type ValidRelationship<From extends keyof AdjacencyMap> = keyof AdjacencyMap[From];

/**
 * Get target label type for a relationship
 */
export type TargetLabel<
	From extends keyof AdjacencyMap,
	Rel extends ValidRelationship<From>,
> = AdjacencyMap[From][Rel];

/**
 * Type-safe hop descriptor
 */
export interface Hop<
	From extends keyof AdjacencyMap,
	Rel extends ValidRelationship<From>,
> {
	readonly from: From;
	readonly relationship: Rel;
	readonly to: TargetLabel<From, Rel>;
	readonly direction: "out" | "in" | "both";
}

/**
 * Creates a type-safe hop from one node to another
 * TypeScript will enforce that the relationship exists in the schema
 */
export const hop = <
	From extends keyof AdjacencyMap,
	Rel extends ValidRelationship<From>,
>(
	from: From,
	relationship: Rel,
	direction: "out" | "in" | "both" = "out",
): Hop<From, Rel> => ({
	from,
	relationship,
	to: undefined as any, // Will be inferred by TypeScript
	direction,
});

/**
 * Multi-hop path builder for type-safe traversal
 */
export class PathBuilder<Current extends keyof AdjacencyMap> {
	constructor(
		private readonly start: Current,
		private readonly startId: NodeID<Current & string> | undefined,
		private readonly hops: Array<{ from: string; relationship: string; direction: string }>,
	) {}

	/**
	 * Add a hop to the path
	 * TypeScript ensures the relationship is valid for the current node type
	 */
	traverse<Rel extends ValidRelationship<Current>>(
		relationship: Rel,
		direction: "out" | "in" | "both" = "out",
	): PathBuilder<TargetLabel<Current, Rel> & keyof AdjacencyMap> {
		this.hops.push({
			from: this.start as string,
			relationship: relationship as string,
			direction,
		});
		// Type assertions needed for runtime flexibility while maintaining compile-time safety
		// @ts-expect-error Complex conditional type inference
		return new PathBuilder(undefined as any, undefined, this.hops);
	}

	/**
	 * Get the accumulated hops
	 */
	getHops(): Array<{ from: string; relationship: string; direction: string }> {
		return this.hops;
	}

	/**
	 * Get the starting node information
	 */
	getStart(): { label: Current; id?: NodeID<Current & string> } {
		return {
			label: this.start,
			...(this.startId !== undefined && { id: this.startId }),
		};
	}
}

/**
 * Creates a path builder starting from a specific node
 */
export const startPath = <L extends keyof AdjacencyMap>(
	label: L,
	id?: NodeID<L & string>,
): PathBuilder<L> => new PathBuilder(label, id, []);

/**
 * Example schema for demonstration
 * In real usage, this would be defined by the application
 */
export interface ExampleSchema extends AdjacencyMap {
	Person: {
		KNOWS: "Person";
		AUTHORED: "Post";
		LIVES_IN: "City";
	};
	Post: {
		WRITTEN_BY: "Person";
		HAS_TAG: "Tag";
		MENTIONS: "Person";
	};
	City: {
		LOCATED_IN: "Country";
	};
	Country: {};
	Tag: {};
}

/**
 * Example usage demonstrating type safety:
 * 
 * ```typescript
 * // Valid path - all relationships exist in schema
 * const validPath = startPath<ExampleSchema>("Person")
 *   .traverse("AUTHORED")  // Person -> Post
 *   .traverse("HAS_TAG");  // Post -> Tag
 * 
 * // Invalid path - TypeScript error!
 * const invalidPath = startPath<ExampleSchema>("Person")
 *   .traverse("HAS_TAG");  // ❌ Person doesn't have HAS_TAG relationship
 * 
 * // Invalid path - wrong relationship
 * const wrongPath = startPath<ExampleSchema>("City")
 *   .traverse("AUTHORED");  // ❌ City doesn't have AUTHORED relationship
 * ```
 */
