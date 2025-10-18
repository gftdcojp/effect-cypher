import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		watch: false,
		env: {
			NEO4J_URL: "neo4j://localhost:7687",
			NEO4J_USER: "neo4j",
			NEO4J_PASSWORD: "testpassword",
			NEO4J_DATABASE: "neo4j",
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"tests/",
				"**/*.d.ts",
				"**/*.config.ts",
				"src/index.ts",
			],
			thresholds: {
				branches: 95,
				functions: 100,
				lines: 98,
				statements: 98,
			},
		},
	},
});
