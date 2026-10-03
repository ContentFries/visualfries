import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } }
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: { extraFileExtensions: ['.svelte'], parser: ts.parser, svelteConfig }
		}
	},
	{
		// The engine predates linting; these rules report style, not defects.
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'no-empty': ['error', { allowEmptyCatch: true }],
			'no-useless-escape': 'off',
			'no-misleading-character-class': 'off',
			'svelte/no-dom-manipulating': 'off',
			'svelte/no-at-html-tags': 'off',
			'svelte/require-each-key': 'off',
			'svelte/prefer-svelte-reactivity': 'off',
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		files: ['tailwind.config.js'],
		rules: { '@typescript-eslint/no-require-imports': 'off' }
	},
	{
		ignores: ['build/', '.svelte-kit/', 'dist/', 'static/', 'node_modules/', '**/.visualfries/']
	}
);
