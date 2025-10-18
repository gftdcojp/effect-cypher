import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		watch: false,
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
