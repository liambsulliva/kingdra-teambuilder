import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

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
	},
});
