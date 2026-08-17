import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	{
		rules: {
			// Pre-existing client patterns; React Compiler rules would require a UI rewrite.
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/use-memo': 'off',
		},
	},
	globalIgnores([
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts',
		'.flowbite-react/**',
	]),
]);

export default eslintConfig;
