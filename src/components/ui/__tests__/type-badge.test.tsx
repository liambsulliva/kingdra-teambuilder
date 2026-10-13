import { describe, expect, it } from 'vitest';
import { TYPE_COLORS, typeText } from '../TypeBadge';

const luminance = (hex: string) => {
	const c = [1, 3, 5]
		.map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
		.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
	return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
	const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
};

// The badge text is 11–12 px, so WCAG AA asks for 4.5:1 on every type color.
describe('type badge contrast', () => {
	it.each(Object.keys(TYPE_COLORS))('%s badge text clears 4.5:1', (type) => {
		expect(contrast(TYPE_COLORS[type], typeText(type))).toBeGreaterThanOrEqual(4.5);
	});
});
