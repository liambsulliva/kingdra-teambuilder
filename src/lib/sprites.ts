import { Icons } from '@pkmn/img';
import data from './data/sprite-data.json';

const POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const SHOWDOWN_SHEET = 'https://play.pokemonshowdown.com/sprites/pokemonicons-sheet.png';

const gen8 = data.gen8 as unknown as Record<string, [number, number, number, number]>;
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
 * PokeAPI Gen VIII box icon, cropped to the Pokémon's own outline. Gen 9 and
 * alternate formes fall back to the matching cell of Showdown's icon sheet.
 */
export function iconSprite(species: SpeciesRef): IconSprite | null {
	if (!species.forme && gen8[species.num]) {
		return {
			url: `${POKEAPI}/versions/generation-viii/icons/${species.num}.png`,
			size: [68, 56],
			box: gen8[species.num],
		};
	}
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
