import { afterEach, describe, expect, it, vi } from 'vitest';
import { POKEBALL, prefetchPokeballs } from '../sprites';

afterEach(() => vi.unstubAllGlobals());

describe('fallback Poké Ball', () => {
	it('uses the Gen V (Black/White) item sprite for Black/White', () => {
		expect(POKEBALL.bw).toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/gen5/poke-ball.png');
	});

	it('uses the Showdown item icon, the source of the X/Y art, for X/Y', () => {
		expect(POKEBALL.xy).toBe('https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png');
	});

	it('prefetches both balls once, however often it is asked', () => {
		const loaded: string[] = [];
		vi.stubGlobal(
			'Image',
			class {
				set src(url: string) {
					loaded.push(url);
				}
			}
		);
		prefetchPokeballs();
		prefetchPokeballs();
		expect(loaded.sort()).toEqual([POKEBALL.bw, POKEBALL.xy].sort());
	});
});
