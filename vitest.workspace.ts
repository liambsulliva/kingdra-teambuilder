import { defineWorkspace } from 'vitest/config';

/**
 * Three projects:
 * - unit: the colocated tests in src.
 * - simple: fast component and flow checks for everyday edits (`npm run test:simple`).
 * - comprehensive: the stress suite over 30+ seeded teams and 100+ boxed Pokémon,
 *   run before production builds (`npm run test:comprehensive`).
 */
export default defineWorkspace([
	{
		extends: './vitest.config.ts',
		test: { name: 'unit', include: ['src/**/*.test.{ts,tsx}'] },
	},
	{
		extends: './vitest.config.ts',
		test: {
			name: 'simple',
			include: ['tests/simple/**/*.test.{ts,tsx}'],
			setupFiles: ['tests/setup/dom.tsx'],
		},
	},
	{
		extends: './vitest.config.ts',
		test: {
			name: 'comprehensive',
			include: ['tests/comprehensive/**/*.test.{ts,tsx}'],
			setupFiles: ['tests/setup/dom.tsx'],
			testTimeout: 120_000,
			hookTimeout: 120_000,
		},
	},
]);
