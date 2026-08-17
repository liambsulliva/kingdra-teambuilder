import type { Config } from 'tailwindcss';
import flowbiteReact from 'flowbite-react/plugin/tailwindcss';

const config: Config = {
	content: [
		'./pages/**/*.{ts,tsx}',
		'./public/**/*.html',
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
		'.flowbite-react/class-list.json',
	],
	theme: {
		extend: {
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic':
					'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
			},
		},
		fontFamily: {
			sans: ['Montserrat', 'Helvetica', 'Arial', 'sans-serif'],
		},
	},
	plugins: [flowbiteReact],
};
export default config;
