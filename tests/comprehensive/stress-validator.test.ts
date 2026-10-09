import { beforeAll, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/validate/route';
import { fixKeyFor, planFix } from '@/lib/fixes';
import { newSet, newTeam, type PokemonSet, type Team } from '@/lib/model';
import type { Validation } from '@/lib/store';
import { buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';

async function validate(team: Pick<Team, 'format' | 'members'>): Promise<Validation> {
	const res = await POST(new Request('http://localhost/api/validate', { method: 'POST', body: JSON.stringify({ format: team.format, members: team.members }) }));
	expect(res.status, team.format).toBe(200);
	return res.json();
}

let stress: StressLibrary;
let competitive: Team[];
const results = new Map<string, Validation>();

beforeAll(async () => {
	stress = await buildStressLibrary();
	competitive = stress.library.teams.filter((t) => t.mode === 'competitive');
	for (const t of competitive) results.set(t.id, await validate(t));
});

describe('Showdown validation of every competitive stress team', () => {
	it('answers for every format in the library', () => {
		expect(results.size).toBe(competitive.length);
		expect(competitive.length).toBeGreaterThanOrEqual(20);
	});

	it('counts every problem exactly once', () => {
		for (const t of competitive) {
			const v = results.get(t.id)!;
			const total = Object.values(v.byMember).reduce((n, p) => n + p.length, 0) + v.team.length;
			expect(v.count, t.name).toBe(total);
		}
	});

	it('only attributes problems to members of the team, naming that member', () => {
		for (const t of competitive) {
			const v = results.get(t.id)!;
			for (const [uid, problems] of Object.entries(v.byMember)) {
				const m = t.members.find((x) => x.uid === uid);
				expect(m, `${t.name}: ${uid}`).toBeTruthy();
				for (const p of problems) expect(p.startsWith(m!.name || m!.species) || p.includes(m!.species), p).toBe(true);
			}
		}
	});

	it('finds the problems random sets are bound to have', () => {
		// Random items, abilities and moves break some rule in nearly every format.
		const flagged = competitive.filter((t) => results.get(t.id)!.count > 0);
		expect(flagged.length).toBeGreaterThan(competitive.length / 2);
	});

	it('is deterministic: the same team gives the same problems', async () => {
		for (const t of competitive.slice(0, 5)) expect(await validate(t)).toEqual(results.get(t.id));
	});
});

describe('one-click fixes', () => {
	it('only offers a fix for a problem the set really has', () => {
		for (const t of competitive) {
			const v = results.get(t.id)!;
			for (const [uid, problems] of Object.entries(v.byMember)) {
				const m = t.members.find((x) => x.uid === uid)!;
				for (const p of problems) {
					const key = fixKeyFor(p, m);
					if (key === 'evs') expect(Object.values(m.evs).every((x) => x === 0)).toBe(true);
					if (key === 'moves') expect(m.moves.every((x) => !x)).toBe(true);
					if (key?.startsWith('move:')) expect(m.moves).toContain(key.slice(5));
					if (key === 'item') expect(m.item).toBeTruthy();
				}
			}
		}
	});

	it('clears the exact problem it was offered for, across the whole library', async () => {
		let applied = 0;
		for (const original of competitive) {
			const t = clone(original);
			const v = results.get(t.id)!;
			for (const [uid, problems] of Object.entries(v.byMember)) {
				for (const p of problems) {
					const m = t.members.find((x) => x.uid === uid)!;
					if (!fixKeyFor(p, m)) continue;
					const plan = await planFix(t, m, p);
					if (!plan) continue;
					expect(plan.changes.length, p).toBeGreaterThan(0);
					Object.assign(m, plan.patch);
					applied++;
					const after = await validate(t);
					expect(after.byMember[uid] ?? [], `${t.name}: ${p}`).not.toContain(p);
				}
			}
		}
		expect(applied).toBeGreaterThan(0);
	});
});

describe('pinned legality cases', () => {
	const garchomp = (patch: Partial<PokemonSet> = {}) =>
		newSet('Garchomp', {
			ability: 'Rough Skin',
			item: 'Rocky Helmet',
			nature: 'Jolly',
			teraType: 'Steel',
			evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 0, spe: 252 },
			moves: ['Earthquake', 'Dragon Tail', 'Stealth Rock', 'Spikes'],
			...patch,
		});

	it('accepts a clean Gen 9 OU set', async () => {
		expect((await validate({ format: 'gen9ou', members: [garchomp()] })).count).toBe(0);
	});

	it('flags an unlearnable move (Spore) and fixes it by clearing that slot', async () => {
		const set = garchomp({ moves: ['Earthquake', 'Spore'] });
		const v = await validate({ format: 'gen9ou', members: [set] });
		const problem = v.byMember[set.uid].find((p) => p.includes("can't learn Spore"))!;
		expect(problem).toBeTruthy();
		expect(fixKeyFor(problem, set)).toBe('move:Spore');
		const plan = (await planFix(newTeam(), set, problem))!;
		expect(plan.patch.moves).toEqual(['Earthquake', '']);
	});

	it('flags a set with no moves and fills one learnable move', async () => {
		const set = garchomp({ moves: [] });
		const v = await validate({ format: 'gen9ou', members: [set] });
		const problem = v.byMember[set.uid].find((p) => /no moves/.test(p))!;
		const plan = (await planFix(newTeam(), set, problem))!;
		const after = await validate({ format: 'gen9ou', members: [{ ...set, ...plan.patch }] });
		expect(after.byMember[set.uid] ?? []).not.toContain(problem);
	});

	it('flags a set with no EVs and fixes it with 1 HP EV', async () => {
		const set = garchomp({ evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });
		const v = await validate({ format: 'gen9ou', members: [set] });
		const problem = v.byMember[set.uid].find((p) => /exactly 0 EVs/.test(p))!;
		expect(fixKeyFor(problem, set)).toBe('evs');
		const after = await validate({ format: 'gen9ou', members: [{ ...set, evs: { ...set.evs, hp: 1 } }] });
		expect(after.count).toBe(0);
	});

	it('flags a banned Pokémon without offering a fix', async () => {
		const mewtwo = newSet('Mewtwo', { ability: 'Pressure', moves: ['Psystrike'], evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });
		const v = await validate({ format: 'gen9ou', members: [mewtwo] });
		expect(v.byMember[mewtwo.uid].some((p) => /Mewtwo/.test(p))).toBe(true);
		for (const p of v.byMember[mewtwo.uid]) expect(fixKeyFor(p, mewtwo)).toBeNull();
	});

	it('flags two of the same species under Species Clause', async () => {
		const v = await validate({ format: 'gen9ou', members: [garchomp(), garchomp()] });
		expect(v.count).toBeGreaterThan(0);
	});
});
