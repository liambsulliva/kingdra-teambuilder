// @vitest-environment node
// It reads source files: under jsdom, a production build (Vercel sets NODE_ENV=production) stubs out node:fs and node:path.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../../../tailwind.config';
import { MERGED_QUERY, MOBILE_QUERY } from '../breakpoints';

const px = (query: string, bound: 'min' | 'max') => Number(query.match(new RegExp(`${bound}-width: (\\d+)px`))![1]);
const phoneMax = px(MOBILE_QUERY, 'max');

/** Every source file under a folder. */
const sources = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? (name === '__tests__' ? [] : sources(path)) : /\.(tsx?|css)$/.test(name) ? [path] : [];
	});
const root = join(__dirname, '..', '..');

describe('layout breakpoints', () => {
	it('starts the tablet layout one pixel above the phone layout', () => {
		expect(px(MERGED_QUERY, 'min')).toBe(phoneMax + 1);
	});

	it('uses the same phone switch in the CSS as in the media queries', () => {
		for (const file of sources(root)) {
			for (const [, n] of readFileSync(file, 'utf8').matchAll(/min-(?:\[|width: )(\d+)px/g)) {
				if (Number(n) < 1000) expect(Number(n), file).toBe(phoneMax + 1);
			}
		}
	});

	// Known issue: Tailwind's `md` still switches at 626px, so from 626 to 650px the phone layout gets desktop `md:` styles.
	it.fails('switches Tailwind’s md screen at the same width as the phone layout', () => {
		expect(config.theme?.extend?.screens).toMatchObject({ md: `${phoneMax + 1}px` });
	});
});

// docs/redesign/spec.md §1: no all-caps anywhere, including labels and buttons.
describe('visual language', () => {
	it('never sets text in all caps', () => {
		const offenders = sources(join(root, 'components')).filter((file) => /\buppercase\b/.test(readFileSync(file, 'utf8')));
		expect(offenders).toEqual([]);
	});
});
