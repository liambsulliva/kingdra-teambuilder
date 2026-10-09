import { beforeAll, describe, expect, it } from 'vitest';
import { Dex } from '@pkmn/dex';
import {
	abilitiesFor,
	calcStats,
	canUseSpecies,
	effectiveness,
	evolutionLine,
	fieldsFor,
	formatInfo,
	getMove,
	getSpecies,
	itemsFor,
	learnableMoves,
	speciesInTier,
	trainingLimits,
	typesForGen,
	evTotal,
} from '@/lib/dex';
import { BOX_SIZE, MAX_MOVES, MAX_TEAM_SIZE, STATS, newSet, normalizeLibrary, type Library, type PokemonSet, type Team } from '@/lib/model';
import { exportSet, exportTeam, importSet, importTeams } from '@/lib/showdown';
import { tierTabs } from '@/components/browse/BottomPanel';
import { BOXED_POKEMON, STRESS_CONTEXTS, buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';

let stress: StressLibrary;
let lib: Library;
const withoutUid = (s: PokemonSet) => ({ ...s, uid: '' });

beforeAll(async () => {
	stress = await buildStressLibrary();
	lib = stress.library;
	console.info(`[stress] seed ${stress.seed}: ${lib.teams.length} teams, ${stress.allSets.length} Pokémon (replay with STRESS_SEED=${stress.seed})`);
});

describe('the stress library', () => {
	it('has at least 30 teams covering every generation and both modes', () => {
		expect(lib.teams.length).toBeGreaterThanOrEqual(30);
		expect(new Set(lib.teams.map((t) => t.gen))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
		expect(lib.teams.some((t) => t.mode === 'casual')).toBe(true);
		expect(new Set(lib.teams.map((t) => t.format)).size).toBe(STRESS_CONTEXTS.filter((c) => c.mode === 'competitive').length + 1);
	});

	it('has at least 100 Pokémon spread across several PC boxes', () => {
		const boxed = lib.boxes.flatMap((b) => b.slots).filter(Boolean);
		expect(boxed).toHaveLength(BOXED_POKEMON);
		expect(lib.boxes.length).toBeGreaterThan(1);
		expect(lib.boxes.every((b) => b.slots.length === BOX_SIZE)).toBe(true);
		expect(lib.boxes.filter((b) => b.slots.some(Boolean)).length).toBe(lib.boxes.length);
	});

	it('gives every team one to six members, each with one to four distinct moves', () => {
		for (const t of lib.teams) {
			expect(t.members.length, t.name).toBeGreaterThan(0);
			expect(t.members.length, t.name).toBeLessThanOrEqual(MAX_TEAM_SIZE);
		}
		for (const set of stress.allSets) {
			expect(set.moves.length).toBeGreaterThan(0);
			expect(set.moves.length).toBeLessThanOrEqual(MAX_MOVES);
			expect(new Set(set.moves).size).toBe(set.moves.length);
			for (const m of set.moves) expect(Dex.moves.get(m).exists, m).toBe(true);
		}
	});

	it('uses a unique id for every team and Pokémon', () => {
		const uids = stress.allSets.map((s) => s.uid);
		expect(new Set(uids).size).toBe(uids.length);
		expect(new Set(lib.teams.map((t) => t.id)).size).toBe(lib.teams.length);
	});

	it('is already normalized: loading it changes nothing', () => {
		expect(normalizeLibrary(clone(lib))).toEqual(lib);
	});

	it('is reproducible from its seed', async () => {
		const again = await buildStressLibrary(stress.seed + 1);
		expect(again.library.teams.map((t) => t.members.map((m) => m.species))).not.toEqual(lib.teams.map((t) => t.members.map((m) => m.species)));
	});
});

describe('every team member is valid for its team', () => {
	it('is a species the team can use, in its evolution line', () => {
		for (const t of lib.teams)
			for (const m of t.members) {
				expect(canUseSpecies(t, m.species), `${t.name}: ${m.species}`).toBe(true);
				expect(evolutionLine(t, m.species)).toContain(m.species);
			}
	});

	it('only knows moves it can learn at its level', async () => {
		for (const t of lib.teams)
			for (const m of t.members) {
				const pool = new Set<string>((await learnableMoves(t, m.species, m.level)).map((x) => x.name));
				for (const move of m.moves) expect(pool.has(move), `${t.name}: ${m.species} - ${move}`).toBe(true);
			}
	});

	it('has an ability, item and training the generation allows', () => {
		for (const t of lib.teams) {
			const f = fieldsFor(t);
			const limits = trainingLimits(t);
			const items = new Set<string>(itemsFor(t).map((i) => i.name));
			for (const m of t.members) {
				const label = `${t.name}: ${m.species}`;
				if (f.ability) expect(abilitiesFor(t, m.species).map((a) => a.ability.name), label).toContain(m.ability);
				else expect(m.ability, label).toBe('');
				if (m.item) expect(items.has(m.item), `${label} @ ${m.item}`).toBe(true);
				if (t.mode === 'competitive') {
					expect(evTotal(m), label).toBeLessThanOrEqual(limits.total);
					for (const s of STATS) expect(m.evs[s], label).toBeLessThanOrEqual(limits.perStat);
				}
				if (!f.tera) expect(m.teraType, label).toBe('');
			}
		}
	});

	it('has whole, positive stats', () => {
		for (const t of lib.teams)
			for (const m of t.members) {
				const stats = calcStats(t, m)!;
				expect(stats, `${t.name}: ${m.species}`).not.toBeNull();
				for (const s of STATS) {
					expect(Number.isInteger(stats[s])).toBe(true);
					expect(stats[s]).toBeGreaterThan(0);
				}
				if (m.species === 'Shedinja') expect(stats.hp).toBe(1);
			}
	});

	it('raises the stat its nature raises', () => {
		for (const t of lib.teams.filter((x) => fieldsFor(x).nature))
			for (const m of t.members) {
				const n = Dex.natures.get(m.nature);
				if (!n.plus || !n.minus) continue;
				const neutral = calcStats(t, { ...m, nature: 'Hardy' })!;
				const natured = calcStats(t, m)!;
				expect(natured[n.plus], `${m.species} ${m.nature}`).toBeGreaterThanOrEqual(neutral[n.plus]);
				expect(natured[n.minus], `${m.species} ${m.nature}`).toBeLessThanOrEqual(neutral[n.minus]);
			}
	});
});

describe('formats and the carousel', () => {
	it('lists species for every tier tab of every team without throwing, and fills the top tab', () => {
		for (const t of lib.teams) {
			const tabs = tierTabs(t);
			expect(tabs.length, t.name).toBeGreaterThan(0);
			for (const tab of tabs) {
				const key = tab === 'Ubers' && t.format.includes('doubles') ? 'DUber' : tab;
				expect(() => speciesInTier(t, key)).not.toThrow();
			}
			expect(speciesInTier(t, tabs[0] === 'Ubers' && t.format.includes('doubles') ? 'DUber' : tabs[0]).length, `${t.name} ${tabs[0]}`).toBeGreaterThan(0);
		}
	});

	it('knows every competitive format in the library', () => {
		for (const t of lib.teams.filter((x) => x.mode === 'competitive')) expect(formatInfo(t.format, t.gen), t.format).toBeTruthy();
	});

	it('only produces real type multipliers for every pairing in every generation', () => {
		const allowed = new Set([0, 0.25, 0.5, 1, 2, 4]);
		for (let gen = 1; gen <= 9; gen++) {
			const team = { mode: 'competitive' as const, gen, format: `gen${gen}ou` };
			const types = typesForGen(gen);
			for (const a of types) for (const d1 of types) for (const d2 of types) {
				const x = effectiveness(team, a, d1 === d2 ? [d1] : [d1, d2]);
				expect(allowed.has(x), `gen${gen} ${a} vs ${d1}/${d2} = ${x}`).toBe(true);
			}
		}
	});

	it('resolves every move a member knows in the team generation', () => {
		for (const t of lib.teams) for (const m of t.members) for (const move of m.moves) expect(getMove(t, move), `${t.name}: ${move}`).toBeTruthy();
	});
});

describe('Showdown text round-trips the whole library', () => {
	it('exports and re-imports every one of the Pokémon without losing a field', () => {
		const lost: string[] = [];
		for (const set of stress.allSets) {
			const text = exportSet(set);
			const again = importSet(text);
			if (!again) lost.push(`${set.species}: did not import\n${text}`);
			else if (JSON.stringify(withoutUid(again)) !== JSON.stringify(withoutUid(set))) lost.push(`${set.species}:\n${text}\n${JSON.stringify(withoutUid(set))}\n${JSON.stringify(withoutUid(again))}`);
		}
		expect(lost, lost.join('\n\n')).toEqual([]);
	});

	it('imports every exported team as a new team with the same members in order', () => {
		for (const t of lib.teams) {
			const { teams, skipped } = importTeams(exportTeam(t), t);
			expect(skipped, t.name).toEqual([]);
			expect(teams, t.name).toHaveLength(1);
			expect(teams[0].members.map(withoutUid), t.name).toEqual(t.members.map(withoutUid));
			expect(teams[0].id).not.toBe(t.id);
		}
	});

	it('restores a full backup of every team, keeping names and formats', () => {
		const backup = lib.teams.map((t) => `=== [${t.mode === 'casual' ? `gen${t.gen}` : t.format}] ${t.name} ===\n\n${exportTeam(t)}`).join('\n\n\n');
		const { teams, skipped } = importTeams(backup, { mode: 'competitive', gen: 9, format: 'gen9ou' });
		expect(skipped).toEqual([]);
		expect(teams.map((t) => t.name)).toEqual(lib.teams.map((t) => t.name));
		for (const [i, t] of teams.entries()) {
			const src = lib.teams[i];
			if (src.mode === 'competitive') expect(t.format, src.name).toBe(src.format);
			expect(t.gen, src.name).toBe(src.gen);
			expect(t.members.map(withoutUid)).toEqual(src.members.map(withoutUid));
		}
	});

	it('never throws on damaged text, and never invents a Pokémon', () => {
		const text = lib.teams.map(exportTeam).join('\n\n');
		const lines = text.split('\n');
		for (let i = 0; i < 200; i++) {
			const start = (i * 37) % lines.length;
			const chunk = lines.slice(start, start + ((i * 13) % 40)).join('\n');
			const mangled = i % 2 ? chunk.replace(/[aeiou]/g, '') : chunk.split('').reverse().join('');
			expect(() => importTeams(mangled, { mode: 'competitive', gen: 9, format: 'gen9ou' })).not.toThrow();
			expect(() => importSet(mangled)).not.toThrow();
			for (const t of importTeams(mangled, { mode: 'competitive', gen: 9, format: 'gen9ou' }).teams)
				for (const m of t.members) expect(Dex.species.get(m.species).exists).toBe(true);
		}
		expect(importTeams('', { mode: 'competitive', gen: 9, format: 'gen9ou' }).teams).toEqual([]);
		expect(importSet('')).toBeNull();
	});

	it('keeps happiness 255 on a Frustration set through Showdown text', () => {
		const set = newSet('Snorlax', { moves: ['Frustration', 'Rest'], happiness: 255 });
		expect(importSet(exportSet(set))!.happiness).toBe(255);
	});

	it('splits an oversized paste into six members plus skipped ones', () => {
		const all = stress.allSets.slice(0, 20);
		const { teams, skipped } = importTeams(all.map(exportSet).join('\n\n'), { mode: 'competitive', gen: 9, format: 'gen9ou' });
		expect(teams[0].members).toHaveLength(MAX_TEAM_SIZE);
		expect(skipped).toHaveLength(14);
		expect(skipped.every((x) => x.endsWith('(team already has six)'))).toBe(true);
	});
});

describe('species data for every Pokémon', () => {
	it('finds every boxed and party species in some generation', () => {
		const team = { mode: 'casual', gen: 9, format: 'casual' } as Team;
		for (const set of stress.allSets) expect(getSpecies(team, set.species), set.species).toBeTruthy();
	});
});
