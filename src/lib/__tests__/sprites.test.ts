import { describe, expect, it } from 'vitest';
import { animatedSprite, bwSprite, cardSources } from '../sprites';

const pikachu = { name: 'Pikachu', num: 25 };
const lechonk = { name: 'Lechonk', num: 915 };

describe('card art sources', () => {
	it('leads with Black/White animated sprites when that set is picked', () => {
		expect(cardSources(pikachu, 'bw')[0]).toBe(bwSprite(pikachu));
	});

	it('leads with the X/Y pixelated 3D models when that set is picked', () => {
		const [first, second] = cardSources(pikachu, 'xy');
		expect(first).toBe(animatedSprite(pikachu));
		expect(second).toBe(bwSprite(pikachu));
	});

	it('keeps the X/Y 3D model as the fallback when Black/White is picked', () => {
		// Lechonk (#915) has no Black/White sprite, so the X/Y model is the next source.
		const urls = cardSources(lechonk, 'bw');
		expect(urls[1]).toBe(animatedSprite(lechonk));
	});

	it('uses the back and shiny variants of the chosen set', () => {
		expect(cardSources(pikachu, 'xy', true)[0]).toContain('other/showdown/back/25.gif');
		expect(cardSources(pikachu, 'bw', false, true)[0]).toContain('black-white/animated/shiny/25.gif');
	});

	it('shows no front sprite on the back view', () => {
		expect(cardSources(pikachu, 'xy', true).some((u) => u.endsWith('/pokemon/25.png'))).toBe(false);
	});
});
