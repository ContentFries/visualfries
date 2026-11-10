import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		environmentOptions: {
			jsdom: {
				resources: 'usable'
			}
		},
		// Two test files at a time: nearly halves the suite. Tests and fixtures that start Chromium
		// or ffmpeg get slower when they share the machine, so they get more than vitest's 5 s and
		// 10 s defaults.
		pool: 'forks',
		poolOptions: {
			forks: {
				minForks: 1,
				maxForks: 2
			}
		},
		testTimeout: 30_000,
		hookTimeout: 60_000
	},

	resolve: process.env.VITEST
		? {
				conditions: ['browser']
			}
		: undefined
});
