import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Three projects:
 * - unit: the colocated tests in src.
 * - simple: fast component and flow checks for everyday edits (`npm run test:simple`).
 * - comprehensive: the stress suite over 30+ seeded teams and 100+ boxed Pokémon,
 *   run before production builds (`npm run test:comprehensive`).
 */
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	test: {
		environment: 'jsdom',
		passWithNoTests: true,
		// Vercel builds with NODE_ENV=production, and React's production build has no `act`, which the
		// tests render with. The tests always run in test mode, whatever the outer environment says.
		env: { NODE_ENV: 'test' },
		projects: [
			{
				extends: true,
				test: { name: 'unit', include: ['src/**/*.test.{ts,tsx}'] },
			},
			{
				extends: true,
				test: {
					name: 'simple',
					include: ['tests/simple/**/*.test.{ts,tsx}'],
					setupFiles: ['tests/setup/dom.tsx'],
				},
			},
			{
				extends: true,
				test: {
					name: 'comprehensive',
					include: ['tests/comprehensive/**/*.test.{ts,tsx}'],
					setupFiles: ['tests/setup/dom.tsx'],
					testTimeout: 120_000,
					hookTimeout: 120_000,
				},
			},
		],
	},
});
