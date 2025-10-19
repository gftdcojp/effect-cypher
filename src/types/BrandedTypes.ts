// Merkle DAG: branded_types_v1 -> Branded IDs and unit types
// Prevents cross-domain value confusion at compile time
// Dependencies: []

/**
 * Branded ID type to prevent mixing IDs from different domains
 */
export type NodeID<L extends string> = string & { readonly __brand: L };

/**
 * Unit-typed numbers to prevent mixing different units
 */
export type Ms = number & { readonly __unit: "ms" };
export type Seconds = number & { readonly __unit: "seconds" };
export type Meters = number & { readonly __unit: "meters" };
export type Kilograms = number & { readonly __unit: "kg" };

/**
 * Creates a branded ID with runtime validation
 */
export const createNodeID = <L extends string>(
	label: L,
	value: string,
): NodeID<L> => {
	if (!value || typeof value !== "string") {
		throw new Error(`Invalid ID value for label ${label}: ${value}`);
	}
	return value as NodeID<L>;
};

/**
 * Unwraps a branded ID to its string value
 */
export const unwrapNodeID = <L extends string>(id: NodeID<L>): string => {
	return id as string;
};

/**
 * Creates a millisecond value
 */
export const ms = (value: number): Ms => {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		throw new Error(`Invalid millisecond value: ${value}`);
	}
	return value as Ms;
};

/**
 * Creates a seconds value
 */
export const seconds = (value: number): Seconds => {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		throw new Error(`Invalid seconds value: ${value}`);
	}
	return value as Seconds;
};

/**
 * Converts seconds to milliseconds
 */
export const secondsToMs = (s: Seconds): Ms => {
	return ms((s as number) * 1000);
};

/**
 * Converts milliseconds to seconds
 */
export const msToSeconds = (m: Ms): Seconds => {
	return seconds((m as number) / 1000);
};

/**
 * Type guard for branded IDs
 */
export const isNodeID = <L extends string>(
	value: unknown,
	_label: L,
): value is NodeID<L> => {
	return typeof value === "string";
};
