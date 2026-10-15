import { Dex } from '@pkmn/dex';
import {
	Generations,
	type Generation,
	type Specie,
	type Move,
	type Item,
	type GenerationNum,
} from '@pkmn/data';
import type { PokemonSet, StatID, Team } from './model';
import { STATS } from './model';
import champions from './data/champions.json';

/** Pokémon Champions formats (Showdown's `champions` mod, built on gen 9). */
export const isChampions = (team: Pick<Team, 'format'>) =>
	team.format.startsWith('gen9champions');
const CHAMPIONS_TIER = champions.species as Record<string, string>;
const CHAMPIONS_ITEMS = new Set(champions.items);

type Existable = {
	exists?: boolean;
	isNonstandard?: string | null;
	tier?: string;
	kind?: string;
};

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
	group: 'Smogon singles' | 'Doubles' | 'Champions' | 'Other';
	/** Tier tabs offered in the carousel, highest first. */
	tiers: string[];
	tierField: 'tier' | 'doublesTier' | 'natDexTier' | 'champions' | 'all';
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
		out.push({
			id: `gen${gen}doublesou`,
			name: 'Doubles OU',
			group: 'Doubles',
			tiers: ['DUber', 'DOU', 'DUU'],
			tierField: 'doublesTier',
		});
	if (VGC[gen])
		out.push({
			id: VGC[gen][0],
			name: VGC[gen][1],
			group: 'Doubles',
			tiers: ['All'],
			tierField: 'all',
			level: 50,
		});
	if (gen === 9)
		out.push(
			{
				id: 'gen9championsou',
				name: 'Champions OU',
				group: 'Champions',
				tiers: ['OU', 'UU'],
				tierField: 'champions',
				level: 50,
			},
			{
				id: 'gen9championsuu',
				name: 'Champions UU',
				group: 'Champions',
				tiers: ['UU'],
				tierField: 'champions',
				level: 50,
			},
			{
				id: 'gen9championsbssregmb',
				name: 'Champions BSS',
				group: 'Champions',
				tiers: ['All'],
				tierField: 'champions',
				level: 50,
			},
			{
				id: 'gen9championsvgc2026regmb',
				name: 'Champions VGC 2026',
				group: 'Champions',
				tiers: ['All'],
				tierField: 'champions',
				level: 50,
			}
		);
	if (gen >= 8)
		out.push({
			id: `gen${gen}nationaldex`,
			name: 'National Dex',
			group: 'Other',
			tiers: ['Ubers', 'OU', 'UU', 'RU', 'NU'],
			tierField: 'natDexTier',
		});
	return out;
}

/** Formats only Draft Mode offers. They stay out of formatsForGen, so the stock format select never lists them. */
export const DRAFT_FORMATS: FormatInfo[] = [
	{ id: 'gen9championsdraft', name: 'Champions Draft', group: 'Champions', tiers: ['All'], tierField: 'champions', level: 50 },
	{ id: 'gen9championsou', name: 'Champions OU', group: 'Champions', tiers: ['OU', 'UU'], tierField: 'champions', level: 50 },
	{ id: 'gen9championsnatdexdraft', name: 'Champions NatDex Draft', group: 'Champions', tiers: ['All'], tierField: 'champions', level: 50 },
	{ id: 'gen9draft', name: 'Gen 9 Draft', group: 'Other', tiers: ['All'], tierField: 'all' },
	{ id: 'gen9natdexdraft', name: 'Gen 9 NatDex Draft', group: 'Other', tiers: ['All'], tierField: 'all' },
	{ id: 'gen9ou', name: 'Gen 9 OU', group: 'Smogon singles', tiers: ['OU'], tierField: 'tier' },
	{ id: 'gen9nationaldex', name: 'Gen 9 National Dex', group: 'Other', tiers: ['All'], tierField: 'all' },
];

export function formatInfo(id: string, gen: number): FormatInfo | undefined {
	return formatsForGen(gen).find((f) => f.id === id) ?? (gen === 9 ? DRAFT_FORMATS.find((f) => f.id === id) : undefined);
}

export function formatLabel(team: Pick<Team, 'mode' | 'gen' | 'format'>) {
	if (team.mode === 'casual') return `Gen ${team.gen} - casual`;
	const f = formatInfo(team.format, team.gen);
	return `Gen ${team.gen} - ${f?.name ?? team.format}`;
}

export function generationFor(
	team: Pick<Team, 'mode' | 'gen' | 'format'>
): Generation {
	const wide =
		team.mode === 'casual' ||
		team.format.includes('nationaldex') ||
		team.format.includes('natdex') ||
		isChampions(team);
	return (wide ? extended : standard).get(team.gen as GenerationNum);
}

const speciesCache = new Map<string, readonly Specie[]>();

/** Species a team can browse: casual = introduced through its generation. Shared per context, so callers copy before sorting. */
export function speciesFor(
	team: Pick<Team, 'mode' | 'gen' | 'format'>
): readonly Specie[] {
	const key = `${team.mode}:${team.gen}:${team.mode === 'casual' ? '' : team.format}`;
	let list = speciesCache.get(key);
	if (!list) speciesCache.set(key, (list = Object.freeze(listSpecies(team))));
	return list;
}

function listSpecies(team: Pick<Team, 'mode' | 'gen' | 'format'>): Specie[] {
	const gen = generationFor(team);
	const usable = (s: Specie) =>
		s.gen <= team.gen &&
		!s.battleOnly &&
		!s.isMega &&
		!s.isPrimal &&
		s.forme !== 'Gmax';
	if (team.mode === 'competitive' && isChampions(team))
		return [...gen.species].filter(
			(s) => usable(s) && s.name in CHAMPIONS_TIER
		);
	return [...gen.species].filter(usable);
}

/** Can this team's generation and format field the species at all? Legality beyond that is flagged, not blocked. */
export function canUseSpecies(
	team: Pick<Team, 'mode' | 'gen' | 'format'>,
	species: string
) {
	const s = generationFor(team).species.get(species);
	return (
		!!s &&
		s.gen <= team.gen &&
		!s.battleOnly &&
		!s.isMega &&
		!s.isPrimal &&
		s.forme !== 'Gmax'
	);
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
		if (tab === 'All') return [...all];
		const g = Number(tab.replace(/\D/g, ''));
		return all.filter((s) => s.gen === g);
	}
	const f = formatInfo(team.format, team.gen);
	if (!f || f.tierField === 'all' || tab === 'All')
		return all.filter((s) => s.nfe === false || !s.evos?.length);
	return all.filter((s) => {
		const raw =
			f.tierField === 'champions'
				? CHAMPIONS_TIER[s.name]
				: (s as unknown as Record<string, string>)[f.tierField] || s.tier;
		if (tab === 'LC') return raw === 'LC';
		return tierRank(raw) === tab;
	});
}

export function getSpecies(
	team: Pick<Team, 'mode' | 'gen' | 'format'>,
	name: string
) {
	return (
		generationFor(team).species.get(name) ?? extended.get(9).species.get(name)
	);
}

export function evolutionLine(team: Team, name: string): string[] {
	const gen = generationFor(team);
	let root = gen.species.get(name);
	if (!root) return [name];
	while (root.prevo && gen.species.get(root.prevo))
		root = gen.species.get(root.prevo)!;
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

let championsLearnsets: Promise<Record<string, string[]>> | null = null;
const loadChampionsLearnsets = () =>
	(championsLearnsets ??= import('./data/champions-learnsets.json').then(
		(m) => m.default as Record<string, string[]>
	));

/** The level a new member starts at: 5 in Little Cup, 50 in VGC and Champions, else 100. */
export const defaultLevel = (team: Pick<Team, 'format'>) =>
	team.format.endsWith('lc') ? 5 : team.format.includes('vgc') || isChampions(team) ? 50 : 100;

const LEVEL_UP = /^(\d+)L(\d+)$/;

/**
 * The lowest level each move is learned by level-up, across the species and its
 * prevos. `learnable()` keeps one source per method, so it can hide a lower
 * level that a prevo learned the move at.
 */
async function lowestLevelUp(gen: Generation, species: string) {
	const lowest = new Map<string, number>();
	const s = gen.species.get(species);
	if (!s) return lowest;
	for await (const { learnset } of gen.learnsets.all(s)) {
		for (const [id, sources] of Object.entries(learnset ?? {})) {
			for (const source of sources) {
				const m = LEVEL_UP.exec(source);
				if (m && +m[1] <= gen.num) lowest.set(id, Math.min(lowest.get(id) ?? Infinity, +m[2]));
			}
		}
	}
	return lowest;
}

/**
 * The moves a species can know at `level`, keyed by id with their learn sources.
 * A level-up move counts only when it is learned at or below the level. TM,
 * tutor, egg and event moves have no level, so they always count.
 */
/** Start loading the learnset data (a large chunk) so the first card opened does not wait on it. */
export function prefetchLearnsets() {
	void Dex.learnsets.get('pikachu').catch(() => undefined);
}

export async function learnsetAt(team: Pick<Team, 'mode' | 'gen' | 'format'>, species: string, level: number): Promise<Record<string, string[]>> {
	const gen = generationFor(team);
	const learnable = (await gen.learnsets.learnable(species)) ?? {};
	const lowest = await lowestLevelUp(gen, species);
	return Object.fromEntries(
		Object.entries(learnable).filter(
			([id, sources]) => sources.some((s) => !LEVEL_UP.test(s)) || (lowest.get(id) ?? Infinity) <= level
		)
	);
}

const learnableCache = new Map<string, Promise<readonly Move[]>>();
const learnableDone = new Map<string, readonly Move[]>();
const LEARNABLE_CACHE_SIZE = 64;
const learnableKey = (team: Pick<Team, 'mode' | 'gen' | 'format'>, species: string, level: number) =>
	`${team.mode}:${team.gen}:${team.format}:${species}:${level}`;

/** A learnable-move list already worked out, so a view can show it on its first render. */
export const cachedLearnableMoves = (team: Pick<Team, 'mode' | 'gen' | 'format'>, species: string, level: number) =>
	learnableDone.get(learnableKey(team, species, level)) ?? null;

/** Moves the species can know at this level, by name. Cached per team context; the list is shared, so copy before sorting. */
export function learnableMoves(team: Team, species: string, level: number): Promise<readonly Move[]> {
	const key = learnableKey(team, species, level);
	let pending = learnableCache.get(key);
	if (!pending) {
		pending = findLearnableMoves(team, species, level).then((list) => {
			learnableDone.set(key, list);
			return list;
		});
		pending.catch(() => learnableCache.delete(key));
		learnableCache.set(key, pending);
		if (learnableCache.size > LEARNABLE_CACHE_SIZE) {
			const oldest = learnableCache.keys().next().value!;
			learnableCache.delete(oldest);
			learnableDone.delete(oldest);
		}
	}
	return pending;
}

async function findLearnableMoves(
	team: Team,
	species: string,
	level: number
): Promise<Move[]> {
	const gen = generationFor(team);
	if (team.mode === 'competitive' && isChampions(team)) {
		const sets = await loadChampionsLearnsets();
		const ids =
			sets[species] ?? sets[gen.species.get(species)?.baseSpecies ?? ''];
		// Not in Champions (e.g. carried over from another format): fall back to
		// its gen 9 moves; the validator flags the species itself. Champions'
		// learnsets carry no levels, and Champions Pokémon are always level 50.
		if (ids)
			return ids
				.map((id) => gen.moves.get(id))
				.filter((m): m is Move => !!m)
				.sort((a, b) => a.name.localeCompare(b.name));
	}
	const learnable = await learnsetAt(team, species, level);
	return Object.keys(learnable)
		.map((id) => gen.moves.get(id))
		.filter((m): m is Move => !!m)
		.sort((a, b) => a.name.localeCompare(b.name));
}

const moveIndexCache = new Map<string, Promise<ReadonlyMap<string, ReadonlySet<string>>>>();
const moveIndexDone = new Map<string, ReadonlyMap<string, ReadonlySet<string>>>();
const moveIndexKey = (team: Pick<Team, 'mode' | 'gen' | 'format'>) => `${team.mode}:${team.gen}:${team.mode === 'casual' ? '' : team.format}`;

/** A move index already built, so the carousel can filter on its first render. */
export const cachedMoveIndex = (team: Pick<Team, 'mode' | 'gen' | 'format'>) => moveIndexDone.get(moveIndexKey(team)) ?? null;

/**
 * The move ids every browsable species can know at a new member's level, for
 * finding Pokémon by move. Built once per team context on first use.
 */
export function moveIndex(team: Pick<Team, 'mode' | 'gen' | 'format'>): Promise<ReadonlyMap<string, ReadonlySet<string>>> {
	const key = moveIndexKey(team);
	let pending = moveIndexCache.get(key);
	if (!pending) {
		pending = buildMoveIndex(team).then((index) => {
			moveIndexDone.set(key, index);
			return index;
		});
		pending.catch(() => moveIndexCache.delete(key));
		moveIndexCache.set(key, pending);
	}
	return pending;
}

async function buildMoveIndex(team: Pick<Team, 'mode' | 'gen' | 'format'>) {
	const champions = team.mode === 'competitive' && isChampions(team) ? await loadChampionsLearnsets() : null;
	const level = defaultLevel(team);
	const index = new Map<string, ReadonlySet<string>>();
	for (const [i, s] of speciesFor(team).entries()) {
		// A whole format takes a few hundred ms on a phone; give the page a frame now and then.
		if (i % 64 === 63) await new Promise((r) => setTimeout(r));
		const ids = champions?.[s.name] ?? champions?.[s.baseSpecies];
		index.set(s.name, new Set(ids ?? Object.keys(await learnsetAt(team, s.name, level))));
	}
	return index;
}

export function allMoves(team: Team): Move[] {
	return [...generationFor(team).moves];
}

export function getMove(team: Team, name: string) {
	return generationFor(team).moves.get(name);
}

export function itemsFor(team: Team) {
	const items = [...generationFor(team).items];
	return (
		isChampions(team) ? items.filter((i) => CHAMPIONS_ITEMS.has(i.name)) : items
	).sort((a, b) => a.name.localeCompare(b.name));
}

export function getItem(team: Team, name: string) {
	return generationFor(team).items.get(name);
}

/** Items whose name contains the query, then items whose effect text does. */
export function searchItems(items: Item[], query: string): Item[] {
	const q = query.trim().toLowerCase();
	if (!q) return items;
	const byName: Item[] = [];
	const byEffect: Item[] = [];
	for (const item of items) {
		if (item.name.toLowerCase().includes(q)) byName.push(item);
		else if (
			[item.shortDesc, item.desc].some((text) => text.toLowerCase().includes(q))
		)
			byEffect.push(item);
	}
	return [...byName, ...byEffect];
}

export function abilitiesFor(team: Team, species: string) {
	const s = getSpecies(team, species);
	const gen = generationFor(team);
	if (!s || team.gen < 3) return [];
	return Object.entries(s.abilities)
		.map(([slot, name]) => ({
			slot,
			ability: gen.abilities.get(name as string),
		}))
		.filter((a) => a.ability)
		.map((a) => ({
			hidden: a.slot === 'H',
			special: a.slot === 'S',
			ability: a.ability!,
		}));
}

export function naturesFor(team: Team) {
	if (team.gen < 3) return [];
	return [...generationFor(team).natures].sort((a, b) =>
		a.name.localeCompare(b.name)
	);
}

export function getNature(team: Team, name: string) {
	return name ? generationFor(team).natures.get(name) : undefined;
}

export const TYPES = [
	'Normal',
	'Fire',
	'Water',
	'Electric',
	'Grass',
	'Ice',
	'Fighting',
	'Poison',
	'Ground',
	'Flying',
	'Psychic',
	'Bug',
	'Rock',
	'Ghost',
	'Dragon',
	'Dark',
	'Steel',
	'Fairy',
] as const;

export function typesForGen(gen: number): string[] {
	return TYPES.filter(
		(t) =>
			!((t === 'Dark' || t === 'Steel') && gen < 2) &&
			!(t === 'Fairy' && gen < 6)
	);
}

export function effectiveness(
	team: Pick<Team, 'mode' | 'gen' | 'format'>,
	attack: string,
	defend: string[]
) {
	const gen = generationFor(team);
	return gen.types.totalEffectiveness(attack as never, defend as never);
}

/** Which fields a generation actually has; drives which editors appear. */
export function fieldsFor(team: Pick<Team, 'gen' | 'mode' | 'format'>) {
	const g = team.gen;
	const casual = team.mode === 'casual';
	// Champions: stat points instead of EVs, IVs fixed at 31, level 50, no Tera.
	const champ = !casual && isChampions(team);
	return {
		ability: g >= 3,
		item: g >= 2,
		nature: g >= 3 && !casual,
		evs: !casual,
		statPoints: champ,
		ivs: !casual && !champ,
		level: !casual && !champ,
		dv: g <= 2,
		tera: g === 9 && !casual && !champ,
		gender: g >= 2 && !casual,
		shiny: g >= 2 && !casual,
		happiness: g >= 2 && !casual,
		pokeball: g >= 3 && !casual,
		hiddenPower: g >= 2 && g <= 7 && !casual,
		mega: champ,
		dynamax: g === 8 && !casual,
	};
}

export function calcStats(
	team: Team,
	set: PokemonSet
): Record<StatID, number> | null {
	const species = getSpecies(team, set.species);
	if (!species) return null;
	const gen = generationFor(team);
	const nature = getNature(team, set.nature);
	const out = {} as Record<StatID, number>;
	if (team.mode === 'competitive' && isChampions(team)) {
		// Showdown's Champions statModify: base + stat points + 75 (HP) / + 20,
		// then the nature multiplier. IVs are always 31 and level always 50.
		for (const s of STATS) {
			const raw = species.baseStats[s] + set.evs[s] + (s === 'hp' ? 75 : 20);
			const pct =
				s === 'hp'
					? 100
					: nature?.plus === s
						? 110
						: nature?.minus === s
							? 90
							: 100;
			out[s] = Math.trunc((raw * pct) / 100);
		}
		return out;
	}
	for (const s of STATS) {
		out[s] = gen.stats.calc(
			s,
			species.baseStats[s],
			set.ivs[s],
			set.evs[s],
			set.level,
			nature
		);
	}
	return out;
}

export const EV_LIMIT = 510;
export const EV_PER_STAT = 252;

/** Per-stat and total caps for the team's training system. */
export function trainingLimits(team: Pick<Team, 'mode' | 'format'>) {
	return isChampions(team) && team.mode === 'competitive'
		? { perStat: 32, total: 66, step: 1, label: 'SP', name: 'Stat Points' }
		: {
				perStat: EV_PER_STAT,
				total: EV_LIMIT,
				step: 4,
				label: 'EV',
				name: 'EVs',
			};
}

export function evTotal(set: PokemonSet) {
	return STATS.reduce((sum, s) => sum + set.evs[s], 0);
}

// Abilities Smogon's standard rulesets ban; never pick these as a default.
const BANNED_ABILITIES = new Set([
	'Sand Veil',
	'Snow Cloak',
	'Moody',
	'Shadow Tag',
	'Arena Trap',
	'Power Construct',
]);

export function defaultAbility(team: Team, species: string) {
	const options = abilitiesFor(team, species);
	const legal =
		team.mode === 'competitive'
			? options.find((a) => !BANNED_ABILITIES.has(a.ability.name))
			: undefined;
	return (legal ?? options[0])?.ability.name ?? '';
}

const SMOGON_GENS = ['', 'rb', 'gs', 'rs', 'dp', 'bw', 'xy', 'sm', 'ss', 'sv'];
export function smogonUrl(gen: number, species: string) {
	return `https://www.smogon.com/dex/${SMOGON_GENS[gen]}/pokemon/${species.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`;
}

const SEREBII_DEX = [
	'',
	'pokedex',
	'pokedex-gs',
	'pokedex-rs',
	'pokedex-dp',
	'pokedex-bw',
	'pokedex-xy',
	'pokedex-sm',
	'pokedex-swsh',
	'pokedex-sv',
];
export function serebiiUrl(gen: number, num: number, name: string) {
	if (gen >= 8)
		return `https://www.serebii.net/${SEREBII_DEX[gen]}/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}/`;
	return `https://www.serebii.net/${SEREBII_DEX[gen]}/${String(num).padStart(3, '0')}.shtml`;
}
