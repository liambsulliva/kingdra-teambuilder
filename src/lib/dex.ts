import { Dex } from '@pkmn/dex';
import { Generations, type Generation, type Specie, type Move, type GenerationNum } from '@pkmn/data';
import type { PokemonSet, StatID, Team } from './model';
import { STATS } from './model';

type Existable = { exists?: boolean; isNonstandard?: string | null; tier?: string; kind?: string };

// Standard formats only see what exists in the game. National Dex and casual
// teams can also use Pokémon, moves and items that were cut ("Past").
const standard = new Generations(Dex);
const extended = new Generations(Dex, (d: Existable) => {
	if (!d.exists) return false;
	if (d.kind === 'Ability' && (d as { num?: number }).num === 0) return false;
	return !d.isNonstandard || d.isNonstandard === 'Past';
});

export interface FormatInfo {
	id: string;
	name: string;
	group: 'Smogon singles' | 'Doubles' | 'Other';
	/** Tier tabs offered in the carousel, highest first. */
	tiers: string[];
	tierField: 'tier' | 'doublesTier' | 'natDexTier' | 'all';
	level?: number;
}

const SINGLES = ['Ubers', 'OU', 'UU', 'RU', 'NU', 'PU', 'ZU', 'LC'];
const SINGLES_BY_GEN: Record<number, string[]> = {
	1: ['Ubers', 'OU', 'UU', 'NU', 'PU', 'ZU', 'LC'],
	2: ['Ubers', 'OU', 'UU', 'NU', 'PU', 'ZU'],
	3: SINGLES,
	4: ['Ubers', 'OU', 'UU', 'NU', 'PU', 'ZU', 'LC'],
	5: SINGLES,
	6: SINGLES,
	7: SINGLES,
	8: SINGLES,
	9: SINGLES,
};
const VGC: Record<number, [string, string]> = {
	5: ['gen5vgc2013', 'VGC 2013'],
	6: ['gen6vgc2016', 'VGC 2016'],
	7: ['gen7vgc2019', 'VGC 2019'],
	8: ['gen8vgc2022', 'VGC 2022'],
	9: ['gen9vgc2025regi', 'VGC 2025'],
};

export function formatsForGen(gen: number): FormatInfo[] {
	const tiers = SINGLES_BY_GEN[gen] || SINGLES;
	const out: FormatInfo[] = tiers.map((t, i) => ({
		id: `gen${gen}${t === 'Ubers' ? 'ubers' : t.toLowerCase()}`,
		name: t,
		group: 'Smogon singles',
		tiers: t === 'LC' ? ['LC'] : tiers.slice(i).filter((x) => x !== 'LC'),
		tierField: 'tier',
		level: t === 'LC' ? 5 : undefined,
	}));
	if (gen >= 3)
		out.push({ id: `gen${gen}doublesou`, name: 'Doubles OU', group: 'Doubles', tiers: ['DUber', 'DOU', 'DUU'], tierField: 'doublesTier' });
	if (VGC[gen])
		out.push({ id: VGC[gen][0], name: VGC[gen][1], group: 'Doubles', tiers: ['All'], tierField: 'all', level: 50 });
	if (gen >= 8)
		out.push({ id: `gen${gen}nationaldex`, name: 'National Dex', group: 'Other', tiers: ['Ubers', 'OU', 'UU', 'RU', 'NU'], tierField: 'natDexTier' });
	return out;
}

export function formatInfo(id: string, gen: number): FormatInfo | undefined {
	return formatsForGen(gen).find((f) => f.id === id);
}

export function formatLabel(team: Pick<Team, 'mode' | 'gen' | 'format'>) {
	if (team.mode === 'casual') return `gen ${team.gen} · casual`;
	const f = formatInfo(team.format, team.gen);
	return `gen ${team.gen} · ${f?.name ?? team.format}`;
}

export function generationFor(team: Pick<Team, 'mode' | 'gen' | 'format'>): Generation {
	const wide = team.mode === 'casual' || team.format.includes('nationaldex');
	return (wide ? extended : standard).get(team.gen as GenerationNum);
}

/** Species a team can browse: casual = introduced through its generation. */
export function speciesFor(team: Pick<Team, 'mode' | 'gen' | 'format'>): Specie[] {
	const gen = generationFor(team);
	return [...gen.species].filter((s) => s.gen <= team.gen && !s.battleOnly && !s.isMega && !s.isPrimal && s.forme !== 'Gmax');
}

const tierRank = (tier: string) => {
	const t = tier.replace(/[()]/g, '');
	if (t === 'AG' || t === 'Uber' || t === 'Ubers') return 'Ubers';
	if (t === 'DUber') return 'DUber';
	if (t.endsWith('BL')) {
		// A BL Pokémon is legal one tier up; show it with that tier.
		const below = t.slice(0, -2);
		const order = ['OU', 'UU', 'RU', 'NU', 'PU', 'ZU'];
		const i = order.indexOf(below);
		return i > 0 ? order[i - 1] : below;
	}
	if (t === 'NFE') return 'ZU';
	return t;
};

export function speciesInTier(team: Team, tab: string): Specie[] {
	const all = speciesFor(team);
	if (team.mode === 'casual') {
		if (tab === 'All') return all;
		const g = Number(tab.replace(/\D/g, ''));
		return all.filter((s) => s.gen === g);
	}
	const f = formatInfo(team.format, team.gen);
	if (!f || f.tierField === 'all') return all.filter((s) => s.nfe === false || !s.evos?.length);
	return all.filter((s) => {
		const raw = (s as unknown as Record<string, string>)[f.tierField] || s.tier;
		if (tab === 'LC') return raw === 'LC';
		return tierRank(raw) === tab;
	});
}

export function getSpecies(team: Pick<Team, 'mode' | 'gen' | 'format'>, name: string) {
	return generationFor(team).species.get(name) ?? extended.get(9).species.get(name);
}

export function evolutionLine(team: Team, name: string): string[] {
	const gen = generationFor(team);
	let root = gen.species.get(name);
	if (!root) return [name];
	while (root.prevo && gen.species.get(root.prevo)) root = gen.species.get(root.prevo)!;
	const out: string[] = [];
	const walk = (s: Specie) => {
		out.push(s.name);
		for (const e of s.evos ?? []) {
			const next = gen.species.get(e);
			if (next) walk(next);
		}
	};
	walk(root);
	return out;
}

export async function learnableMoves(team: Team, species: string): Promise<Move[]> {
	const gen = generationFor(team);
	const learnable = await gen.learnsets.learnable(species);
	if (!learnable) return [];
	return Object.keys(learnable)
		.map((id) => gen.moves.get(id))
		.filter((m): m is Move => !!m)
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function allMoves(team: Team): Move[] {
	return [...generationFor(team).moves];
}

export function getMove(team: Team, name: string) {
	return generationFor(team).moves.get(name);
}

export function itemsFor(team: Team) {
	return [...generationFor(team).items].sort((a, b) => a.name.localeCompare(b.name));
}

export function getItem(team: Team, name: string) {
	return generationFor(team).items.get(name);
}

export function abilitiesFor(team: Team, species: string) {
	const s = getSpecies(team, species);
	const gen = generationFor(team);
	if (!s || team.gen < 3) return [];
	return Object.entries(s.abilities)
		.map(([slot, name]) => ({ slot, ability: gen.abilities.get(name as string) }))
		.filter((a) => a.ability)
		.map((a) => ({ hidden: a.slot === 'H', special: a.slot === 'S', ability: a.ability! }));
}

export function naturesFor(team: Team) {
	if (team.gen < 3) return [];
	return [...generationFor(team).natures].sort((a, b) => a.name.localeCompare(b.name));
}

export function getNature(team: Team, name: string) {
	return name ? generationFor(team).natures.get(name) : undefined;
}

export const TYPES = [
	'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground',
	'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
] as const;

export function typesForGen(gen: number): string[] {
	return TYPES.filter((t) => !((t === 'Dark' || t === 'Steel') && gen < 2) && !(t === 'Fairy' && gen < 6));
}

export function effectiveness(team: Pick<Team, 'mode' | 'gen' | 'format'>, attack: string, defend: string[]) {
	const gen = generationFor(team);
	return gen.types.totalEffectiveness(attack as never, defend as never);
}

/** Which fields a generation actually has; drives which editors appear. */
export function fieldsFor(team: Pick<Team, 'gen' | 'mode'>) {
	const g = team.gen;
	const casual = team.mode === 'casual';
	return {
		ability: g >= 3,
		item: g >= 2,
		nature: g >= 3 && !casual,
		evs: !casual,
		ivs: !casual,
		level: !casual,
		dv: g <= 2,
		tera: g === 9 && !casual,
		gender: g >= 2 && !casual,
		shiny: g >= 2 && !casual,
		happiness: g >= 2 && !casual,
		pokeball: g >= 3 && !casual,
		hiddenPower: g >= 2 && g <= 7 && !casual,
		dynamax: g === 8 && !casual,
	};
}

export function calcStats(team: Team, set: PokemonSet): Record<StatID, number> | null {
	const species = getSpecies(team, set.species);
	if (!species) return null;
	const gen = generationFor(team);
	const nature = getNature(team, set.nature);
	const out = {} as Record<StatID, number>;
	for (const s of STATS) {
		out[s] = gen.stats.calc(s, species.baseStats[s], set.ivs[s], set.evs[s], set.level, nature);
	}
	return out;
}

export const EV_LIMIT = 510;
export const EV_PER_STAT = 252;

export function evTotal(set: PokemonSet) {
	return STATS.reduce((sum, s) => sum + set.evs[s], 0);
}

// Abilities Smogon's standard rulesets ban; never pick these as a default.
const BANNED_ABILITIES = new Set(['Sand Veil', 'Snow Cloak', 'Moody', 'Shadow Tag', 'Arena Trap', 'Power Construct']);

export function defaultAbility(team: Team, species: string) {
	const options = abilitiesFor(team, species);
	const legal = team.mode === 'competitive' ? options.find((a) => !BANNED_ABILITIES.has(a.ability.name)) : undefined;
	return (legal ?? options[0])?.ability.name ?? '';
}

const SMOGON_GENS = ['', 'rb', 'gs', 'rs', 'dp', 'bw', 'xy', 'sm', 'ss', 'sv'];
export function smogonUrl(gen: number, species: string) {
	return `https://www.smogon.com/dex/${SMOGON_GENS[gen]}/pokemon/${species.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`;
}

const SEREBII_DEX = ['', 'pokedex', 'pokedex-gs', 'pokedex-rs', 'pokedex-dp', 'pokedex-bw', 'pokedex-xy', 'pokedex-sm', 'pokedex-swsh', 'pokedex-sv'];
export function serebiiUrl(gen: number, num: number, name: string) {
	if (gen >= 8) return `https://www.serebii.net/${SEREBII_DEX[gen]}/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}/`;
	return `https://www.serebii.net/${SEREBII_DEX[gen]}/${String(num).padStart(3, '0')}.shtml`;
}
