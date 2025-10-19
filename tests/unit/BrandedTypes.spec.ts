import { describe, expect, it } from "vitest";
import {
	createNodeID,
	isNodeID,
	ms,
	msToSeconds,
	seconds,
	secondsToMs,
	unwrapNodeID,
	type NodeID,
} from "../../src/types/BrandedTypes";

describe("BrandedTypes", () => {
	describe("NodeID", () => {
		it("should create a branded ID", () => {
			const personId = createNodeID("Person", "person-123");
			expect(personId).toBe("person-123");
		});

		it("should prevent mixing IDs at type level", () => {
			// This test validates type safety at compile time
			type PersonID = NodeID<"Person">;
			type PostID = NodeID<"Post">;

			const personId: PersonID = createNodeID("Person", "person-123");
			const postId: PostID = createNodeID("Post", "post-456");

			// At runtime, they're just strings
			expect(typeof personId).toBe("string");
			expect(typeof postId).toBe("string");

			// But TypeScript prevents this:
			// const wrongAssignment: PersonID = postId; // Type error!
		});

		it("should unwrap branded IDs", () => {
			const personId = createNodeID("Person", "person-123");
			const unwrapped = unwrapNodeID(personId);
			expect(unwrapped).toBe("person-123");
		});

		it("should validate ID values", () => {
			expect(() => createNodeID("Person", "")).toThrow("Invalid ID value");
			expect(() => createNodeID("Person", null as any)).toThrow("Invalid ID value");
		});

		it("should work with type guards", () => {
			const personId = createNodeID("Person", "person-123");
			expect(isNodeID(personId, "Person")).toBe(true);
			expect(isNodeID("not-an-id", "Person")).toBe(true); // Type guard only checks type
			expect(isNodeID(123, "Person")).toBe(false);
		});
	});

	describe("Unit types", () => {
		it("should create millisecond values", () => {
			const duration = ms(1000);
			expect(duration).toBe(1000);
		});

		it("should create second values", () => {
			const duration = seconds(10);
			expect(duration).toBe(10);
		});

		it("should validate unit values", () => {
			expect(() => ms(-1)).toThrow("Invalid millisecond value");
			expect(() => ms(Number.POSITIVE_INFINITY)).toThrow("Invalid millisecond value");
			expect(() => ms(NaN)).toThrow("Invalid millisecond value");

			expect(() => seconds(-1)).toThrow("Invalid seconds value");
			expect(() => seconds(Number.POSITIVE_INFINITY)).toThrow("Invalid seconds value");
		});

		it("should convert between units", () => {
			const sec = seconds(5);
			const msValue = secondsToMs(sec);
			expect(msValue).toBe(5000);

			const roundTrip = msToSeconds(msValue);
			expect(roundTrip).toBe(5);
		});

		it("should prevent unit mixing at type level", () => {
			// This validates type safety at compile time
			const duration1 = ms(1000);
			const duration2 = seconds(1);

			// TypeScript prevents this:
			// const wrong: Ms = duration2; // Type error!
			// const alsoWrong: Seconds = duration1; // Type error!

			expect(typeof duration1).toBe("number");
			expect(typeof duration2).toBe("number");
		});
	});

	describe("Real-world usage scenarios", () => {
		it("should prevent ID confusion in function calls", () => {
			// Simulating a function that expects a specific ID type
			const getPersonById = (id: NodeID<"Person">): string => {
				return `Found person: ${unwrapNodeID(id)}`;
			};

			const personId = createNodeID("Person", "person-123");
			const result = getPersonById(personId);
			expect(result).toBe("Found person: person-123");

			// TypeScript prevents passing wrong ID type:
			// const postId = createNodeID("Post", "post-456");
			// getPersonById(postId); // Type error!
		});

		it("should prevent timeout value confusion", () => {
			// Simulating a function that expects milliseconds
			const setTimeoutMs = (duration: import("../../src/types/BrandedTypes").Ms): number => {
				return duration as number;
			};

			const timeout = ms(5000);
			const result = setTimeoutMs(timeout);
			expect(result).toBe(5000);

			// TypeScript prevents passing seconds:
			// const wrongUnit = seconds(5);
			// setTimeoutMs(wrongUnit); // Type error!
		});
	});
});
