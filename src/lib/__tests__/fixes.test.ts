import { beforeEach, describe, expect, it } from 'vitest';
import { learnableMoves } from '../dex';
import { fixKeyFor, planFix } from '../fixes';
import { emptyLibrary, newSet, newTeam } from '../model';
import { useStore } from '../store';

const team = newTeam({ gen: 9, format: 'gen9ou' });
const kingambit = newSet('Kingambit', {
	moves: ['Kowtow Cleave', 'Sucker Punch'],
	item: 'Black Glasses',
	ability: 'Defiant',
});

describe('fix matching', () => {
	it('matches the trivial problems Showdown reports', () => {
		const empty = newSet('Kingambit', {
			item: 'Black Glasses',
			ability: 'Defiant',
		});
		expect(
			fixKeyFor(
				'Kingambit has exactly 0 EVs - did you forget to EV it? (If this was intentional...).',
				empty
			)
		).toBe('evs');
		expect(
			fixKeyFor(
				'Kingambit has no moves (it must have at least one to be usable).',
				empty
			)
		).toBe('moves');
		expect(fixKeyFor("Kingambit can't learn Sucker Punch.", kingambit)).toBe(
			'move:Sucker Punch'
		);
		expect(
			fixKeyFor(
				"Kingambit's item Black Glasses does not exist in Gen 9.",
				kingambit
			)
		).toBe('item');
	});

	it('does not offer a fix when the set does not have the problem', () => {
		// Another Kingambit in the team can be the one the validator means.
		expect(
			fixKeyFor(
				'Kingambit has no moves (it must have at least one to be usable).',
				kingambit
			)
		).toBeNull();
		const trained = newSet('Kingambit', {
			evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 },
		});
		expect(
			fixKeyFor(
				'Kingambit has exactly 0 EVs - did you forget to EV it?',
				trained
			)
		).toBeNull();
	});

	it('offers no fix for problems that need a decision', () => {
		expect(fixKeyFor("Kingambit can't have Moody.", kingambit)).toBeNull();
		expect(
			fixKeyFor('Mewtwo is tagged Uber, which is banned.', kingambit)
		).toBeNull();
		expect(
			fixKeyFor("Kingambit can't learn Hyperspace Fury.", kingambit)
		).toBeNull();
	});
});

describe('fix plans', () => {
	it('sets HP EVs to 1 for a set with no EVs', async () => {
		const plan = await planFix(team, kingambit, 'Kingambit has exactly 0 EVs');
		expect(plan?.patch.evs?.hp).toBe(1);
		expect(plan?.changes).toEqual(['HP EVs: 0 → 1']);
	});

	it('fills the first move with the first move in the pool', async () => {
		const set = newSet('Zamazenta');
		const pool = await learnableMoves(team, 'Zamazenta', 100);
		const plan = await planFix(team, set, 'Zamazenta has no moves');
		expect(plan?.patch.moves?.[0]).toBe(pool[0].name);
		expect(plan?.patch.moves?.slice(1)).toEqual(['', '', '']);
	});

	it('removes a move that cannot be learned', async () => {
		const plan = await planFix(
			team,
			kingambit,
			"Kingambit can't learn Sucker Punch."
		);
		expect(plan?.patch.moves).toEqual(['Kowtow Cleave', '']);
		expect(plan?.changes).toEqual(['Move 2: Sucker Punch → empty']);
	});
});

describe('applying a fix', () => {
	beforeEach(() => useStore.getState().hydrate(emptyLibrary()));

	it('waits for confirmation, then edits only the chosen set', () => {
		const s = useStore.getState();
		s.addMember('Kingambit');
		const member = useStore.getState().library.teams[0].members[0];
		s.proposeFix({
			uid: member.uid,
			name: 'Kingambit',
			changes: ['HP EVs: 0 → 1'],
			patch: { evs: { ...member.evs, hp: 1 } },
		});
		expect(useStore.getState().dialog).toBe('fix');
		expect(useStore.getState().library.teams[0].members[0].evs.hp).toBe(0);

		useStore.getState().applyFix();
		const after = useStore.getState();
		expect(after.library.teams[0].members[0].evs.hp).toBe(1);
		expect(after.dialog).toBeNull();
		expect(after.pendingFix).toBeNull();
	});
});
