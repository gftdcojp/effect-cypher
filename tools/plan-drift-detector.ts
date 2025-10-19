#!/usr/bin/env node
// Query plan drift detection tool for CI
// Records and compares query execution plans across versions

import * as fs from "node:fs";
import * as path from "node:path";

interface PlanRecord {
	readonly queryHash: string;
	readonly cypher: string;
	readonly planDigest: string;
	readonly timestamp: string;
	readonly version: string;
}

interface PlanDatabase {
	readonly records: PlanRecord[];
}

/**
 * Generates a simple digest from an execution plan
 */
const generatePlanDigest = (plan: unknown): string => {
	const planStr = JSON.stringify(plan);
	let hash = 5381;
	for (let i = 0; i < planStr.length; i++) {
		hash = (hash * 33) ^ planStr.charCodeAt(i);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
};

/**
 * Records query plans to a database file
 */
export const recordPlans = async (
	plans: Array<{ query: string; plan: unknown }>,
	version: string,
	dbPath = "./query-plans.json",
): Promise<void> => {
	let db: PlanDatabase = { records: [] };

	// Load existing database if it exists
	if (fs.existsSync(dbPath)) {
		const content = fs.readFileSync(dbPath, "utf-8");
		db = JSON.parse(content);
	}

	// Add new records
	for (const { query, plan } of plans) {
		const digest = generatePlanDigest(plan);
		const hash = `query-${query.length}-${digest}`;

		db.records.push({
			queryHash: hash,
			cypher: query,
			planDigest: digest,
			timestamp: new Date().toISOString(),
			version,
		});
	}

	// Save database
	fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
	console.log(`✅ Recorded ${plans.length} query plans for version ${version}`);
};

/**
 * Compares current plans against previous version
 */
export const detectDrift = (
	currentVersion: string,
	previousVersion: string,
	dbPath = "./query-plans.json",
	thresholdPercent = 10,
): { driftDetected: boolean; drifts: Array<{ query: string; change: string }> } => {
	if (!fs.existsSync(dbPath)) {
		console.log("⚠️  No plan database found. Run 'pnpm plan:record' first.");
		return { driftDetected: false, drifts: [] };
	}

	const content = fs.readFileSync(dbPath, "utf-8");
	const db: PlanDatabase = JSON.parse(content);

	// Group by version
	const currentPlans = db.records.filter((r) => r.version === currentVersion);
	const previousPlans = db.records.filter((r) => r.version === previousVersion);

	if (currentPlans.length === 0) {
		console.log(`⚠️  No plans found for current version ${currentVersion}`);
		return { driftDetected: false, drifts: [] };
	}

	if (previousPlans.length === 0) {
		console.log(`⚠️  No plans found for previous version ${previousVersion}`);
		return { driftDetected: false, drifts: [] };
	}

	// Compare plans
	const drifts: Array<{ query: string; change: string }> = [];
	const previousByHash = new Map(previousPlans.map((p) => [p.queryHash, p]));

	for (const current of currentPlans) {
		const previous = previousByHash.get(current.queryHash);
		if (!previous) {
			continue; // New query
		}

		if (current.planDigest !== previous.planDigest) {
			drifts.push({
				query: current.cypher.substring(0, 60),
				change: `${previous.planDigest} → ${current.planDigest}`,
			});
		}
	}

	const driftPercent = (drifts.length / currentPlans.length) * 100;
	const driftDetected = driftPercent > thresholdPercent;

	console.log("\n📊 Plan Drift Analysis");
	console.log("========================");
	console.log(`Current version: ${currentVersion}`);
	console.log(`Previous version: ${previousVersion}`);
	console.log(`Total queries: ${currentPlans.length}`);
	console.log(`Plans changed: ${drifts.length} (${driftPercent.toFixed(1)}%)`);
	console.log(`Threshold: ${thresholdPercent}%`);
	console.log("");

	if (drifts.length > 0) {
		console.log("Changed query plans:");
		for (const drift of drifts.slice(0, 5)) {
			console.log(`  - ${drift.query}...`);
			console.log(`    ${drift.change}`);
		}
		if (drifts.length > 5) {
			console.log(`  ... and ${drifts.length - 5} more`);
		}
	}

	if (driftDetected) {
		console.log(`\n❌ DRIFT DETECTED: ${driftPercent.toFixed(1)}% exceeds threshold of ${thresholdPercent}%`);
	} else {
		console.log(`\n✅ Drift within acceptable range (${driftPercent.toFixed(1)}% < ${thresholdPercent}%)`);
	}

	return { driftDetected, drifts };
};

/**
 * CLI interface
 */
if (require.main === module) {
	const command = process.argv[2];

	if (command === "record") {
		const version = process.argv[3] || "unknown";
		console.log(`Recording plans for version ${version}...`);
		console.log("Note: This is a sample implementation.");
		console.log("In production, integrate with EXPLAIN/PROFILE queries against your Neo4j instance.");
	} else if (command === "diff") {
		const current = process.argv[3] || "current";
		const previous = process.argv[4] || "previous";
		const threshold = Number.parseInt(process.argv[5] || "10", 10);

		const result = detectDrift(current, previous, "./query-plans.json", threshold);
		process.exit(result.driftDetected ? 1 : 0);
	} else {
		console.log("Usage:");
		console.log("  plan-drift-detector record <version>");
		console.log("  plan-drift-detector diff <current-version> <previous-version> [threshold-percent]");
		console.log("");
		console.log("Example:");
		console.log("  plan-drift-detector record v1.2.0");
		console.log("  plan-drift-detector diff v1.2.0 v1.1.0 10");
	}
}
