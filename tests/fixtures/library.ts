import {
	abilitiesFor,
	canUseSpecies,
	formatInfo,
	generationFor,
	getSpecies,
	isChampions,
	itemsFor,
	learnableMoves,
	naturesFor,
	speciesFor,
	speciesInTier,
	trainingLimits,
	typesForGen,
} from '@/lib/dex';
import { BOX_SIZE, STATS, newBox, newSet, newTeam, statTable, type Box, type Library, type PokemonSet, type StatTable, type Team } from '@/lib/model';
import { rng, seedFromEnv, type Rng } from './random';

export type Context = Pick<Team, 'mode' | 'gen' | 'format'>;

const comp = (format: string): Context => ({ mode: 'competitive', gen: Number(format.match(/^gen(\d)/)![1]), format });
const casual = (gen: number): Context => ({ mode: 'casual', gen, format: 'casual' });

/** One team per context: every generation, every format family, and casual teams. 32 in all. */
export const STRESS_CONTEXTS: Context[] = [
	comp('gen9ou'),
	comp('gen9uu'),
	comp('gen9ru'),
	comp('gen9nu'),
	comp('gen9ubers'),
	comp('gen9lc'),
	comp('gen9doublesou'),
	comp('gen9vgc2025regi'),
	comp('gen9championsou'),
	comp('gen9championsbssregmb'),
	comp('gen9nationaldex'),
	comp('gen8ou'),
	comp('gen8nationaldex'),
	comp('gen8vgc2022'),
	comp('gen8doublesou'),
	comp('gen7ou'),
	comp('gen7uu'),
	comp('gen7vgc2019'),
	comp('gen6ou'),
	comp('gen6vgc2016'),
	comp('gen5ou'),
	comp('gen4ou'),
	comp('gen3ou'),
	comp('gen2ou'),
	comp('gen1ou'),
	casual(9),
	casual(8),
	casual(7),
	casual(5),
	casual(4),
	casual(3),
	casual(1),
];

export const BOXED_POKEMON = 100;
export const BOX_COUNT = 4;

const NICKNAMES = ['Ace', 'Bolt', 'Captain', 'Dusk', 'Echo', 'Flint', 'Gale', 'Haze', 'Ivy', 'Jinx', 'Koda', 'Lumen', 'Mochi', 'Nova', 'Onyx', 'Pip'];

/** The set level a new member gets in this context, as the store gives it. */
export function levelFor(ctx: Context, r: Rng) {
	if (ctx.mode === 'casual') return r.int(5, 100);
	if (ctx.format.endsWith('lc')) return 5;
	if (ctx.format.includes('vgc') || isChampions(ctx)) return 50;
	return 100;
}

function randomEvs(ctx: Context, r: Rng): StatTable {
	const limits = trainingLimits(ctx);
	const evs = statTable(0);
	if (ctx.mode === 'casual') return evs;
	let left = limits.total;
	for (const s of r.sample(STATS, STATS.length)) {
		const max = Math.min(limits.perStat, left);
		const v = r.chance(0.5) ? max : Math.floor(r.int(0, max) / limits.step) * limits.step;
		evs[s] = v;
		left -= v;
	}
	return evs;
}

function randomIvs(ctx: Context, r: Rng): StatTable {
	const ivs = statTable(31);
	if (ctx.mode === 'casual' || isChampions(ctx)) return ivs;
	for (const s of STATS) {
		if (r.chance(0.6)) continue;
		// Gen 1-2 store DVs as odd IVs: DV n is IV 2n + 1.
		ivs[s] = ctx.gen <= 2 ? r.int(0, 15) * 2 + 1 : r.int(0, 31);
	}
	if (ctx.gen <= 2) ivs.hp = 31;
	return ivs;
}

/** A random but generation-valid set: real learnset moves, a real ability, item and nature for the context. */
export async function randomSet(ctx: Context, species: string, r: Rng): Promise<PokemonSet | null> {
	const team = newTeam(ctx);
	const s = getSpecies(team, species);
	if (!s) return null;
	const level = levelFor(ctx, r);
	const pool = await learnableMoves(team, s.name, level);
	if (!pool.length) return null;
	const moves = r.sample(pool.map((m) => m.name), r.int(1, 4));
	const abilities = abilitiesFor(team, s.name).map((a) => a.ability.name);
	const items = ctx.gen >= 2 ? itemsFor(team).map((i) => i.name) : [];
	const natures = naturesFor(team).map((n) => n.name);
	const balls = ctx.gen >= 3 ? [...generationFor(team).items].filter((i) => i.isPokeball).map((i) => i.name) : [];
	const hpTypes = typesForGen(ctx.gen).filter((t) => t !== 'Normal' && t !== 'Fairy');
	const competitive = ctx.mode === 'competitive';
	return newSet(s.name, {
		name: r.chance(0.2) ? r.pick(NICKNAMES) : '',
		level,
		moves,
		ability: abilities.length ? r.pick(abilities) : '',
		item: items.length && r.chance(0.85) ? r.pick(items) : '',
		nature: natures.length && competitive ? r.pick(natures) : '',
		evs: randomEvs(ctx, r),
		ivs: randomIvs(ctx, r),
		gender: s.gender ? '' : competitive && ctx.gen >= 2 ? r.pick(['', 'M', 'F'] as const) : '',
		shiny: ctx.gen >= 2 && r.chance(0.1),
		happiness: ctx.gen >= 2 && r.chance(0.15) ? r.int(0, 254) : 255,
		pokeball: balls.length && competitive && r.chance(0.15) ? r.pick(balls) : '',
		hpType: competitive && ctx.gen >= 2 && ctx.gen <= 7 && r.chance(0.1) ? r.pick(hpTypes) : '',
		dynamaxLevel: ctx.gen === 8 && r.chance(0.2) ? r.int(0, 9) : 10,
		gigantamax: ctx.gen === 8 && !!s.canGigantamax && r.chance(0.5),
		teraType: ctx.gen === 9 && competitive && !isChampions(ctx) && r.chance(0.7) ? r.pick([...typesForGen(9), 'Stellar']) : '',
	});
}

/** Species a context's carousel would offer first: its top tier, or everything when the tier is thin. */
export function poolFor(ctx: Context): string[] {
	const team = newTeam(ctx);
	const tier = ctx.mode === 'casual' ? 'All' : (formatInfo(ctx.format, ctx.gen)?.tiers[0] ?? 'All');
	const inTier = speciesInTier(team, tier === 'DUber' ? 'DOU' : tier).map((s) => s.name);
	const pool = inTier.length >= 12 ? inTier : speciesFor(team).map((s) => s.name);
	return pool.filter((name) => canUseSpecies(team, name));
}

async function randomTeam(ctx: Context, index: number, r: Rng): Promise<Team> {
	const pool = poolFor(ctx);
	// Most teams are full; a few are partial so the "has room" paths are covered too.
	const size = index % 5 === 4 ? r.int(1, 5) : 6;
	const members: PokemonSet[] = [];
	const bases = new Set<string>();
	for (const species of r.sample(pool, pool.length)) {
		if (members.length >= size) break;
		const base = getSpecies(newTeam(ctx), species)?.baseSpecies ?? species;
		if (bases.has(base)) continue;
		const set = await randomSet(ctx, species, r);
		if (!set) continue;
		bases.add(base);
		members.push(set);
	}
	const label = ctx.mode === 'casual' ? `Casual Gen ${ctx.gen}` : ctx.format;
	return newTeam({ ...ctx, name: `Stress ${String(index + 1).padStart(2, '0')} ${label}`, members });
}

async function randomBoxes(r: Rng): Promise<Box[]> {
	const boxes = Array.from({ length: BOX_COUNT }, (_, i) => newBox(`Box ${i + 1}`));
	const slots = r.sample(
		Array.from({ length: BOX_COUNT * BOX_SIZE }, (_, i) => i),
		BOXED_POKEMON
	);
	for (const at of slots) {
		const ctx = r.pick(STRESS_CONTEXTS);
		let set: PokemonSet | null = null;
		while (!set) set = await randomSet(ctx, r.pick(poolFor(ctx)), r);
		boxes[Math.floor(at / BOX_SIZE)].slots[at % BOX_SIZE] = set;
	}
	return boxes;
}

export interface StressLibrary {
	seed: number;
	library: Library;
	/** Every Pokémon in the library: party members then boxed sets. */
	allSets: PokemonSet[];
}

const built = new Map<number, Promise<StressLibrary>>();

/** 32 teams (one per context) and 100 boxed Pokémon over 4 boxes, all with random learnset movesets. */
export function buildStressLibrary(seed = seedFromEnv()): Promise<StressLibrary> {
	if (!built.has(seed)) {
		built.set(
			seed,
			(async () => {
				const r = rng(seed);
				const teams: Team[] = [];
				for (const [i, ctx] of STRESS_CONTEXTS.entries()) teams.push(await randomTeam(ctx, i, r));
				const boxes = await randomBoxes(r);
				const library: Library = { version: 2, teams, boxes, updatedAt: 1 };
				const allSets = [...teams.flatMap((t) => t.members), ...boxes.flatMap((b) => b.slots.filter((s): s is PokemonSet => !!s))];
				return { seed, library, allSets };
			})()
		);
	}
	return built.get(seed)!;
}

/** A deep copy, so a test can mutate it freely. */
export const clone = <T>(x: T): T => structuredClone(x);

