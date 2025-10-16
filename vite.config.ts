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
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true
			}
		}
	},

	resolve: process.env.VITEST
		? {
				conditions: ['browser']
			}
		: undefined
});
