import { Sets, Teams } from '@pkmn/sets';
import { Dex } from '@pkmn/dex';
import type { PokemonSet as ShowdownSet } from '@pkmn/sets';
import { MAX_TEAM_SIZE, newTeam, normalizeSet, type PokemonSet, type Team } from './model';

const toShowdown = (set: PokemonSet): Partial<ShowdownSet> => ({
	name: set.name,
	species: set.species,
	item: set.item,
	ability: set.ability,
	moves: set.moves.filter(Boolean),
	nature: set.nature,
	gender: set.gender || undefined,
	evs: set.evs,
	ivs: set.ivs,
	level: set.level,
	shiny: set.shiny || undefined,
	happiness: set.happiness === 255 ? undefined : set.happiness,
	pokeball: set.pokeball || undefined,
	hpType: set.hpType || undefined,
	dynamaxLevel: set.dynamaxLevel === 10 ? undefined : set.dynamaxLevel,
	gigantamax: set.gigantamax || undefined,
	teraType: set.teraType || undefined,
});

export function exportSet(set: PokemonSet): string {
	return Sets.exportSet(toShowdown(set) as ShowdownSet).trim();
}

export function exportTeam(team: Team): string {
	return team.members.map(exportSet).join('\n\n');
}

const fromShowdown = (s: Partial<ShowdownSet>): PokemonSet | null => {
	const species = Dex.species.get(s.species || '');
	if (!species.exists) return null;
	return normalizeSet({
		species: species.name,
		name: s.name && s.name !== species.name ? s.name : '',
		item: s.item || '',
		ability: s.ability || '',
		nature: s.nature || '',
		gender: (s.gender as PokemonSet['gender']) || '',
		shiny: !!s.shiny,
		happiness: s.happiness ?? 255,
		pokeball: s.pokeball || '',
		level: s.level || 100,
		evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...s.evs },
		ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...s.ivs },
		moves: (s.moves || []).map((m) => Dex.moves.get(m).name || m),
		hpType: s.hpType || '',
		dynamaxLevel: s.dynamaxLevel ?? 10,
		gigantamax: !!s.gigantamax,
		teraType: s.teraType || '',
	});
};

export function importSet(text: string): PokemonSet | null {
	const parsed = Sets.importSet(text.trim());
	return parsed ? fromShowdown(parsed) : null;
}

export interface ImportResult {
	teams: Team[];
	skipped: string[];
}

/**
 * Parse Showdown text into new teams. Accepts a single pasted team or a
 * backup with `=== [format] Name ===` headers. Unknown species are reported,
 * never silently kept.
 */
export function importTeams(text: string, fallback: Pick<Team, 'mode' | 'gen' | 'format'>): ImportResult {
	const skipped: string[] = [];
	const blocks = /^===/m.test(text) ? Teams.importTeams(text) : [Teams.importTeam(text)];
	const teams: Team[] = [];
	for (const block of blocks) {
		if (!block) continue;
		const members: PokemonSet[] = [];
		for (const raw of block.team) {
			const set = fromShowdown(raw);
			if (!set) skipped.push(raw.species || raw.name || 'unknown');
			else if (members.length < MAX_TEAM_SIZE) members.push(set);
			else skipped.push(`${set.species} (team already has six)`);
		}
		if (!members.length) continue;
		const format = block.format && /^gen\d/.test(block.format) ? block.format : fallback.format;
		const gen = Number(format.match(/^gen(\d)/)?.[1]) || fallback.gen;
		teams.push(newTeam({ name: block.name || 'Imported team', mode: fallback.mode, gen, format, members }));
	}
	return { teams, skipped };
}

/** A Smogon set as served by pkmn: any field may list alternatives. */
export interface SmogonSet {
	item?: string | string[];
	ability?: string | string[];
	nature?: string | string[];
	moves?: (string | string[])[];
	teratypes?: string | string[];
	evs?: Partial<PokemonSet['evs']> | Partial<PokemonSet['evs']>[];
	ivs?: Partial<PokemonSet['ivs']> | Partial<PokemonSet['ivs']>[];
}

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * The first listed option of every field, as a patch for an existing set.
 * Many Smogon sets leave out the ability because the species has one to
 * choose from, so those take `defaultAbility`.
 */
export function smogonPatch(set: SmogonSet, defaultAbility: string): Partial<PokemonSet> {
	const pick = <T>(v: T | T[] | undefined) => (Array.isArray(v) ? v[0] : v);
	return {
		item: first(set.item),
		ability: first(set.ability) || defaultAbility,
		nature: first(set.nature),
		moves: (set.moves ?? []).map((m) => first(m)).slice(0, 4),
		teraType: first(set.teratypes),
		evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...pick(set.evs) },
		ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...pick(set.ivs) },
	};
}
