#!/usr/bin/env ts-node
/**
 * CLI tool for running invariant checks
 * Usage: ts-node tools/invariants-cli.ts --url neo4j://localhost:7687 --user neo4j --password password
 */

import neo4j from "neo4j-driver";
import {
	type InvariantCheck,
	allNodesHaveProperty,
	exampleInvariants,
	forAllExistsUnique,
	propertyIsUnique,
	runInvariantsOrFail,
} from "../src/invariants/InvariantChecker";

interface CliArgs {
	url: string;
	user: string;
	password: string;
	database?: string;
}

/**
 * Parse command line arguments
 */
const parseArgs = (): CliArgs => {
	const args = process.argv.slice(2);
	const result: Partial<CliArgs> = {};

	for (let i = 0; i < args.length; i += 2) {
		const key = args[i].replace(/^--/, "");
		const value = args[i + 1];
		result[key as keyof CliArgs] = value;
	}

	if (!result.url || !result.user || !result.password) {
		console.error(
			"Usage: ts-node tools/invariants-cli.ts --url <url> --user <user> --password <password> [--database <db>]",
		);
		console.error("");
		console.error("Example:");
		console.error(
			"  ts-node tools/invariants-cli.ts --url neo4j://localhost:7687 --user neo4j --password password",
		);
		process.exit(1);
	}

	return result as CliArgs;
};

/**
 * Define your custom invariants here
 */
const defineInvariants = (): InvariantCheck[] => {
	return [
		// Example: Each Post has exactly one author
		forAllExistsUnique("Post has unique author", "Post", "AUTHORED", "Person"),

		// Example: All Person nodes have required properties
		allNodesHaveProperty("Person has name", "Person", "name"),
		allNodesHaveProperty("Person has id", "Person", "id"),

		// Example: IDs are unique
		propertyIsUnique("Person ID is unique", "Person", "id"),

		// Add more custom invariants here...
	];
};

/**
 * Main function
 */
const main = async (): Promise<void> => {
	const args = parseArgs();

	console.log("🔍 Connecting to Neo4j...");
	console.log(`   URL: ${args.url}`);
	console.log(`   User: ${args.user}`);
	console.log(`   Database: ${args.database || "default"}`);
	console.log("");

	const driver = neo4j.driver(
		args.url,
		neo4j.auth.basic(args.user, args.password),
	);

	try {
		// Test connection
		await driver.verifyConnectivity();
		console.log("✅ Connected successfully");
		console.log("");

		const session = driver.session({
			database: args.database,
		});

		try {
			console.log("🔍 Running invariant checks...");
			console.log("");

			const invariants = defineInvariants();

			// Run all invariants (will exit with code 1 if any fail)
			await runInvariantsOrFail(session, invariants);

			console.log("");
			console.log("✅ All invariants passed!");
		} finally {
			await session.close();
		}
	} catch (error) {
		console.error("");
		console.error(
			"❌ Error:",
			error instanceof Error ? error.message : String(error),
		);
		process.exit(1);
	} finally {
		await driver.close();
	}
};

// Run if executed directly
if (require.main === module) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}

export { main };
