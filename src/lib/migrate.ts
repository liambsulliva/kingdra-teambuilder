import { Dex } from '@pkmn/dex';
import { STATS, emptyLibrary, newBox, newTeam, normalizeSet, type Library, type PokemonSet } from './model';

/** Shape of a member in the pre-redesign MongoDB documents. */
export interface LegacyPokemon {
	name: string;
	id: number;
	level?: number;
	ability?: string;
	nature?: string;
	item?: string;
	tera_type?: string;
	moves?: string[];
	iv?: number[];
	ev?: number[];
}

const named = <T extends { exists: boolean; name: string }>(get: (id: string) => T, raw?: string) => {
	if (!raw) return '';
	const found = get(raw);
	return found.exists ? found.name : '';
};

export function migrateLegacySet(old: LegacyPokemon): PokemonSet | null {
	const species = Dex.species.get(old.name);
	if (!species.exists) return null;
	const table = (arr: number[] | undefined, fallback: number) =>
		Object.fromEntries(STATS.map((s, i) => [s, Number.isFinite(arr?.[i]) ? arr![i] : fallback])) as PokemonSet['evs'];
	const tera = old.tera_type ? old.tera_type.charAt(0).toUpperCase() + old.tera_type.slice(1).toLowerCase() : '';
	return normalizeSet({
		species: species.name,
		level: old.level || 100,
		ability: named((id) => Dex.abilities.get(id), old.ability),
		nature: named((id) => Dex.natures.get(id), old.nature),
		item: named((id) => Dex.items.get(id), old.item),
		teraType: tera,
		moves: (old.moves || []).map((m) => named((id) => Dex.moves.get(id), m)).filter(Boolean),
		ivs: table(old.iv, 31),
		evs: table(old.ev, 0),
	});
}

/** Convert the old parallel teamNames/pokemonParty arrays into a Library. */
export function migrateLegacy(teamNames: string[] = [], party: LegacyPokemon[][] = []): Library {
	if (!party.length) return emptyLibrary();
	const teams = party.map((members, i) =>
		newTeam({
			name: teamNames[i] || `Team ${i + 1}`,
			members: members.map(migrateLegacySet).filter((s): s is PokemonSet => !!s),
		})
	);
	return { version: 2, teams, boxes: [newBox('Box 1')], updatedAt: Date.now() };
}
