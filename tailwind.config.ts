import type { Config } from 'tailwindcss';

// Colors mirror the Figma variables (Primitives + Color light/dark) through
// CSS custom properties defined in globals.css. Accent is blue; danger (red)
// is reserved for errors and destructive actions.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
	content: ['./src/**/*.{ts,tsx}'],
	darkMode: ['selector', '[data-theme="dark"]'],
	theme: {
		extend: {
			// `md` is the mobile switch: below it (max-md) is the phone layout, at and above it the tablet and desktop layouts. See src/lib/breakpoints.ts.
			screens: {
				md: '626px',
			},
			colors: {
				bg: token('bg'),
				fg: token('fg'),
				muted: token('muted'),
				line: token('line'),
				'line-strong': token('line-strong'),
				hover: token('hover'),
				track: token('track'),
				accent: token('accent'),
				'accent-soft': token('accent-soft'),
				'accent-solid': token('accent-solid'),
				danger: token('danger'),
				'danger-soft': token('danger-soft'),
				'skeleton-edge': token('skeleton-edge'),
				'skeleton-mid': token('skeleton-mid'),
				// In-game nature colors: raised stat red, lowered stat blue. Dark mode gets lighter values (globals.css) to clear 4.5:1.
				'nature-up': token('nature-up'),
				'nature-down': token('nature-down'),
				stat: {
					hp: '#80C743',
					atk: '#DFC847',
					def: '#DA7F3D',
					spa: '#58B7D2',
					spd: '#576DD3',
					spe: '#C84EB6',
				},
			},
			fontFamily: {
				sans: ['var(--font-text)', 'system-ui', 'sans-serif'],
				head: ['var(--font-head)', 'var(--font-text)', 'system-ui', 'sans-serif'],
				mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
			},
			fontSize: {
				'2xs': ['11px', '14px'],
				xs: ['12px', '16px'],
				sm: ['13px', '17px'],
				base: ['14px', '20px'],
				md: ['15px', '20px'],
			},
			transitionTimingFunction: {
				out: 'cubic-bezier(0.22, 1, 0.36, 1)',
				spring: 'cubic-bezier(0.34, 2.1, 0.5, 1)',
			},
		},
	},
	plugins: [],
};
export default config;
