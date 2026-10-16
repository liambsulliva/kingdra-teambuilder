import { Icons } from '@pkmn/img';
import data from './data/sprite-data.json';
import type { SpriteSet } from './model';

const POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const SHOWDOWN_SHEET = 'https://play.pokemonshowdown.com/sprites/pokemonicons-sheet.png';
const ITEMS = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';
const SHOWDOWN_ITEMS = 'https://play.pokemonshowdown.com/sprites/itemicons';

/**
 * The Poké Ball for each card-art set: Gen V's item sprite for Black/White, and
 * Showdown's for X/Y, the same source as the X/Y art. PokeAPI has no X/Y item set.
 */
export const POKEBALL: Record<SpriteSet, string> = {
	bw: `${ITEMS}/gen5/poke-ball.png`,
	xy: `${SHOWDOWN_ITEMS}/poke-ball.png`,
};

const prefetched = new Set<string>();
/** Loads both Poké Balls into the browser cache, so a fallback is ready the moment the set is switched. */
export function prefetchPokeballs() {
	if (typeof Image === 'undefined') return;
	for (const url of Object.values(POKEBALL)) {
		if (prefetched.has(url)) continue;
		prefetched.add(url);
		new Image().src = url;
	}
}

const sheet = data.sheet as unknown as Record<string, [number, number, number, number]>;
const formIds = data.formIds as Record<string, number>;

export interface SpeciesRef {
	name: string;
	num: number;
	forme?: string;
	baseSpecies?: string;
}

/** A sprite region: draw `box` of the image at `url` (whose size is `size`). */
export interface IconSprite {
	url: string;
	size: [number, number];
	box: [number, number, number, number];
}

const slug = (name: string) =>
	name
		.toLowerCase()
		.replace(/['’.:]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

/** PokeAPI numeric id; alternate formes live above 10000. */
export function pokeapiId(species: SpeciesRef): number {
	if (species.forme) {
		const id = formIds[slug(species.name)];
		if (id) return id;
	}
	return species.num;
}

/**
 * The Pokémon's cell of Showdown's icon sheet, cropped to its outline. PokeAPI removed its Gen VIII box icons
 * upstream on 2026-10-16, so every species now draws from this one sheet.
 */
export function iconSprite(species: SpeciesRef): IconSprite | null {
	const { left, top } = Icons.getPokemon(species.name);
	const cell = sheet[`${-left},${-top}`];
	if (!cell) return null;
	return {
		url: SHOWDOWN_SHEET,
		size: [480, 4110],
		box: [-left + cell[0], -top + cell[1], -left + cell[2], -top + cell[3]],
	};
}

export function frontSprite(species: SpeciesRef) {
	return `${POKEAPI}/${pokeapiId(species)}.png`;
}

/** Pokémon Black/White animated sprite (Gen 5 art, species through #649). */
export function bwSprite(species: SpeciesRef, back = false, shiny = false) {
	return `${POKEAPI}/versions/generation-v/black-white/animated/${back ? 'back/' : ''}${shiny ? 'shiny/' : ''}${pokeapiId(species)}.gif`;
}

export function animatedSprite(species: SpeciesRef, back = false, shiny = false) {
	return `${POKEAPI}/other/showdown/${back ? 'back/' : ''}${shiny ? 'shiny/' : ''}${pokeapiId(species)}.gif`;
}

export function staticSprite(species: SpeciesRef, back = false, shiny = false) {
	return `${POKEAPI}/${back ? 'back/' : ''}${shiny ? 'shiny/' : ''}${pokeapiId(species)}.png`;
}

/**
 * Card art, best first, as URLs. The chosen set leads and the other follows.
 * The pixelated 3D models (Showdown's animated sprites, from the X/Y era) are
 * the fallback when Black/White is picked, which covers Gen 9 and any species
 * past #649. The static sprite and the front sprite come last.
 */
export function cardSources(species: SpeciesRef, set: SpriteSet, back = false, shiny = false): string[] {
	const bw = bwSprite(species, back, shiny);
	const xy = animatedSprite(species, back, shiny);
	const rest = [staticSprite(species, back, shiny), ...(back ? [] : [frontSprite(species)])];
	return [...(set === 'xy' ? [xy, bw] : [bw, xy]), ...rest];
}

/** CSS for drawing an IconSprite into a square, bottom-centered, filling it. */
export function iconStyle(sprite: IconSprite, px: number): React.CSSProperties {
	const [x0, y0, x1, y1] = sprite.box;
	const w = x1 - x0;
	const h = y1 - y0;
	const scale = px / Math.max(w, h);
	return {
		backgroundImage: `url(${sprite.url})`,
		backgroundRepeat: 'no-repeat',
		backgroundSize: `${sprite.size[0] * scale}px ${sprite.size[1] * scale}px`,
		backgroundPosition: `${-x0 * scale + (px - w * scale) / 2}px ${-y0 * scale + (px - h * scale)}px`,
		imageRendering: 'pixelated',
	};
}
