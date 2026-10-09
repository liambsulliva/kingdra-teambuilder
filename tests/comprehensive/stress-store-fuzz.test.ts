import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BOX_SIZE, MAX_MOVES, MAX_TEAM_SIZE, type Library, type PokemonSet } from '@/lib/model';
import { useStore } from '@/lib/store';
import { resetStore } from '../helpers/env';
import { buildStressLibrary, clone, poolFor, type StressLibrary } from '../fixtures/library';
import { rng, type Rng } from '../fixtures/random';

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
const census = (lib: Library) => lib.teams.reduce((n, t) => n + t.members.length, 0) + lib.boxes.reduce((n, b) => n + b.slots.filter(Boolean).length, 0);
const everySet = (lib: Library): PokemonSet[] => [...lib.teams.flatMap((t) => t.members), ...lib.boxes.flatMap((b) => b.slots.filter((x): x is PokemonSet => !!x))];

/** Holds after every single action, whatever the action was. */
function checkInvariants(step: string) {
	const st = s();
	const lib = st.library;
	expect(lib.teams.length, step).toBeGreaterThan(0);
	expect(lib.boxes.length, step).toBeGreaterThan(0);
	expect(lib.teams.some((t) => t.id === st.openTeamId), `${step}: open team exists`).toBe(true);
	for (const t of lib.teams) {
		expect(t.members.length, `${step}: ${t.name} size`).toBeLessThanOrEqual(MAX_TEAM_SIZE);
		for (const m of t.members) expect(m.moves.length, `${step}: ${m.species} moves`).toBeLessThanOrEqual(MAX_MOVES);
	}
	for (const b of lib.boxes) expect(b.slots.length, `${step}: ${b.name}`).toBe(BOX_SIZE);
	const uids = everySet(lib).map((m) => m.uid);
	expect(new Set(uids).size, `${step}: unique uids`).toBe(uids.length);
	expect(new Set(lib.teams.map((t) => t.id)).size, `${step}: unique team ids`).toBe(lib.teams.length);
	if (st.selectedUid) expect(open().members.some((m) => m.uid === st.selectedUid), `${step}: selected member is in the open team`).toBe(true);
	expect(st.boxIndex, step).toBeLessThan(lib.boxes.length);
}

type Action = { name: string; conserves?: boolean; run: (r: Rng) => void };

function actions(): Action[] {
	const anyTeam = (r: Rng) => r.pick(s().library.teams);
	const anyMember = (r: Rng) => (open().members.length ? r.pick(open().members) : null);
	const species = (r: Rng) => r.pick(poolFor(open()));
	return [
		{ name: 'openTeam', conserves: true, run: (r) => s().openTeam(anyTeam(r).id) },
		{ name: 'selectMember', conserves: true, run: (r) => s().selectMember(anyMember(r)?.uid ?? null) },
		{ name: 'addMember', run: (r) => s().addMember(species(r), r.chance(0.3) ? r.int(0, 6) : undefined) },
		{ name: 'addMemberToTeam', run: (r) => s().addMemberToTeam(anyTeam(r).id, species(r), r.chance(0.5) ? r.int(0, 5) : undefined) },
		{ name: 'removeMember', run: (r) => { const m = anyMember(r); if (m) s().removeMember(m.uid); } },
		{ name: 'reorderMember', conserves: true, run: (r) => { const m = anyMember(r); if (m) s().reorderMember(m.uid, r.int(0, 6)); } },
		{
			name: 'moveMemberToTeam',
			conserves: true,
			run: (r) => {
				const m = anyMember(r);
				if (m) s().moveMemberToTeam(m.uid, open().id, anyTeam(r).id, r.chance(0.5) ? r.int(0, 5) : undefined);
			},
		},
		{ name: 'storeInBox', conserves: true, run: (r) => { const m = anyMember(r); if (m) s().storeInBox(m.uid, r.int(0, s().library.boxes.length - 1), r.chance(0.5) ? r.int(0, BOX_SIZE - 1) : undefined); } },
		{ name: 'takeFromBox', conserves: true, run: (r) => s().takeFromBox(r.int(0, s().library.boxes.length - 1), r.int(0, BOX_SIZE - 1), r.chance(0.5) ? r.int(0, 5) : undefined) },
		{
			name: 'moveInBox',
			conserves: true,
			run: (r) => {
				const n = s().library.boxes.length - 1;
				s().moveInBox(r.int(0, n), r.int(0, BOX_SIZE - 1), r.int(0, n), r.int(0, BOX_SIZE - 1));
			},
		},
		{ name: 'swapIn', conserves: true, run: (r) => { const m = anyMember(r); if (m) s().swapIn(m.uid, species(r)); } },
		{ name: 'changeSpecies', conserves: true, run: (r) => { const m = anyMember(r); if (m) s().changeSpecies(m.uid, species(r)); } },
		{ name: 'setMove', conserves: true, run: (r) => { const m = anyMember(r); if (m) s().setMove(m.uid, r.int(0, 3), r.pick(['Protect', 'Rest', 'Substitute', ''])); } },
		{ name: 'pickMove', conserves: true, run: (r) => { if (r.chance(0.3)) s().setInspector('moves', r.int(0, 3)); s().pickMove(r.pick(['Protect', 'Rest', 'Substitute', 'Toxic', 'Facade'])); } },
		{ name: 'updateSet', conserves: true, run: (r) => { const m = anyMember(r); if (m) s().updateSet(m.uid, { level: r.int(1, 100), shiny: r.chance(0.5) }); } },
		{ name: 'renameTeam', conserves: true, run: (r) => s().renameTeam(anyTeam(r).id, r.chance(0.2) ? '  ' : `Renamed ${r.int(0, 999)}`) },
		{ name: 'setTeamContext', conserves: true, run: (r) => s().setTeamContext(open().id, r.chance(0.3) ? { mode: r.pick(['casual', 'competitive'] as const) } : { gen: r.int(1, 9) }) },
		{ name: 'preview', conserves: true, run: (r) => s().preview(r.chance(0.5) ? species(r) : null) },
		{ name: 'compare', conserves: true, run: (r) => s().compare(r.chance(0.5) ? species(r) : null) },
		{ name: 'duplicateTeam', run: (r) => s().duplicateTeam(anyTeam(r).id) },
		{ name: 'deleteTeam', run: (r) => s().deleteTeam(anyTeam(r).id) },
		{ name: 'createTeam', run: (r) => s().createTeam({ name: `New ${r.int(0, 99)}`, gen: r.int(1, 9) }) },
		{ name: 'addBox', conserves: true, run: () => s().addBox() },
		{ name: 'deleteBox', run: (r) => s().deleteBox(r.int(0, s().library.boxes.length - 1)) },
		{ name: 'setMerged', conserves: true, run: (r) => s().setMerged(r.chance(0.5)) },
	];
}

let stress: StressLibrary;

beforeAll(async () => {
	stress = await buildStressLibrary();
});

beforeEach(() => resetStore(clone(stress.library)));

describe('thousands of random actions on the stress library', () => {
	it('never breaks a library invariant, and moves never create or lose a Pokémon', () => {
		const r = rng(stress.seed ^ 0x5eed);
		const list = actions();
		let previous = census(s().library);
		for (let i = 0; i < 3000; i++) {
			const action = r.pick(list);
			action.run(r);
			const step = `#${i} ${action.name}`;
			checkInvariants(step);
			const now = census(s().library);
			if (action.conserves) expect(now, `${step}: Pokémon count`).toBe(previous);
			previous = now;
		}
	});

	it('keeps every set intact when it only travels between teams and boxes', () => {
		const r = rng(stress.seed ^ 0xb0c5);
		const before = new Map(everySet(s().library).map((m) => [m.uid, JSON.stringify(m)]));
		const travel = actions().filter((a) => ['openTeam', 'reorderMember', 'storeInBox', 'takeFromBox', 'moveInBox'].includes(a.name));
		for (let i = 0; i < 1500; i++) r.pick(travel).run(r);
		// moveMemberToTeam without an evolution also keeps sets intact.
		for (let i = 0; i < 300; i++) {
			const m = open().members[0];
			const to = r.pick(s().library.teams);
			if (m) s().moveMemberToTeam(m.uid, open().id, to.id, r.chance(0.5) ? r.int(0, 5) : undefined);
			s().openTeam(r.pick(s().library.teams).id);
		}
		const after = everySet(s().library);
		expect(after).toHaveLength(before.size);
		for (const m of after) expect(JSON.stringify(m), m.species).toBe(before.get(m.uid));
	});

	it('fills and empties every team without exceeding six', () => {
		for (const t of s().library.teams) {
			s().openTeam(t.id);
			const pool = poolFor(open());
			for (let i = 0; i < 10; i++) s().addMember(pool[i % pool.length]);
			expect(open().members).toHaveLength(MAX_TEAM_SIZE);
			for (const m of [...open().members]) s().removeMember(m.uid);
			expect(open().members).toHaveLength(0);
		}
	});

	it('packs all 275 Pokémon into boxes, adding boxes as needed, then unpacks them', () => {
		const total = census(s().library);
		for (const t of [...s().library.teams]) {
			s().openTeam(t.id);
			for (const m of [...open().members]) s().storeInBox(m.uid);
		}
		expect(s().library.teams.every((t) => t.members.length === 0)).toBe(true);
		expect(census(s().library)).toBe(total);
		expect(s().library.boxes.length).toBeGreaterThanOrEqual(Math.ceil(total / BOX_SIZE));
		const teams = s().library.teams;
		let ti = 0;
		for (const [bi, b] of s().library.boxes.entries()) {
			for (let slot = 0; slot < BOX_SIZE; slot++) {
				if (!b.slots[slot]) continue;
				while (ti < teams.length && s().library.teams[ti].members.length >= MAX_TEAM_SIZE) ti++;
				if (ti >= teams.length) break;
				s().openTeam(s().library.teams[ti].id);
				s().takeFromBox(bi, slot);
			}
		}
		expect(census(s().library)).toBe(total);
		checkInvariants('unpack');
	});

	it('duplicates every team, then deletes every team down to one', () => {
		const n = s().library.teams.length;
		for (const t of [...s().library.teams]) s().duplicateTeam(t.id);
		expect(s().library.teams).toHaveLength(n * 2);
		checkInvariants('duplicate all');
		for (const t of [...s().library.teams]) s().deleteTeam(t.id);
		expect(s().library.teams).toHaveLength(1);
		checkInvariants('delete all');
	});
});
