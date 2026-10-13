import { beforeEach, describe, expect, it } from 'vitest';
import { accepts, type DragData } from '@/lib/drag';
import { useStore } from '@/lib/store';
import { resetStore } from '../helpers/env';

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
const named = (name: string) => s().library.teams.find((t) => t.name === name)!;
const SIX = ['Pikachu', 'Charizard', 'Lapras', 'Snorlax', 'Gengar', 'Dragonite'];

beforeEach(() => resetStore());

describe('which drops are accepted', () => {
	it('lets a suggestion onto a party cell while there is room or a member to replace', () => {
		const cand: DragData = { kind: 'candidate', species: 'Mew' };
		expect(accepts(cand, { kind: 'party', index: 0 })).toBe(true);
		SIX.forEach((p) => s().addMember(p));
		expect(accepts(cand, { kind: 'party', index: 6 })).toBe(false);
		expect(accepts(cand, { kind: 'party', index: 3 })).toBe(true);
		expect(accepts(cand, { kind: 'boxcell', box: 0, slot: 0 })).toBe(false);
		expect(accepts(cand, undefined)).toBe(false);
	});

	it('lets a suggestion onto another team only if it has room (or a member to replace) and can use the species', () => {
		s().createTeam({ name: 'Old', gen: 1, format: 'gen1ou' });
		s().openTeam(named('Team 1').id);
		const old = named('Old').id;
		expect(accepts({ kind: 'candidate', species: 'Mew' }, { kind: 'teamslot', teamId: old, index: 0 })).toBe(true);
		expect(accepts({ kind: 'candidate', species: 'Garchomp' }, { kind: 'teamslot', teamId: old, index: 0 })).toBe(false);
		expect(accepts({ kind: 'candidate', species: 'Mew' }, { kind: 'teamslot', teamId: 'missing', index: 0 })).toBe(false);
	});

	it('removes an own member released outside any target, but not another team’s', () => {
		s().addMember('Pikachu');
		const own: DragData = { kind: 'member', uid: open().members[0].uid, teamId: open().id };
		expect(accepts(own, undefined)).toBe(true);
		expect(accepts({ ...own, teamId: 'other' }, undefined)).toBe(false);
	});

	it('lets a member move to another team’s card, never its own', () => {
		s().createTeam({ name: 'B' });
		s().openTeam(named('Team 1').id);
		s().addMember('Pikachu');
		const drag: DragData = { kind: 'member', uid: open().members[0].uid, teamId: open().id };
		expect(accepts(drag, { kind: 'teamslot', teamId: named('B').id, index: 0 })).toBe(true);
		expect(accepts(drag, { kind: 'teamslot', teamId: open().id, index: 0 })).toBe(false);
		expect(accepts(drag, { kind: 'teamslot', teamId: 'missing', index: 0 })).toBe(false);
	});

	it('lets an own member reorder and go to the Box; another team’s member needs room in the party', () => {
		s().addMember('Pikachu');
		const own: DragData = { kind: 'member', uid: open().members[0].uid, teamId: open().id };
		expect(accepts(own, { kind: 'party', index: 4 })).toBe(true);
		expect(accepts(own, { kind: 'boxcell', box: 0, slot: 0 })).toBe(true);
		const foreign: DragData = { kind: 'member', uid: 'x', teamId: 'other' };
		expect(accepts(foreign, { kind: 'boxcell', box: 0, slot: 0 })).toBe(false);
		expect(accepts(foreign, { kind: 'party', index: 3 })).toBe(true);
		SIX.slice(1).forEach((p) => s().addMember(p));
		expect(accepts(foreign, { kind: 'party', index: 6 })).toBe(false);
		expect(accepts(foreign, { kind: 'party', index: 2 })).toBe(true);
	});

	it('lets an evolution stage onto another team that can use it', () => {
		s().createTeam({ name: 'Old', gen: 3, format: 'gen3ou' });
		s().openTeam(named('Team 1').id);
		s().addMember('Gible');
		const m = open().members[0];
		const old = named('Old').id;
		expect(accepts({ kind: 'evolution', uid: m.uid, teamId: open().id, species: 'Garchomp' }, { kind: 'teamslot', teamId: old, index: 0 })).toBe(false);
		// Its own stage moves unchanged, so only the generation of the stage itself is checked by the store.
		expect(accepts({ kind: 'evolution', uid: m.uid, teamId: open().id, species: 'Gible' }, { kind: 'teamslot', teamId: old, index: 0 })).toBe(true);
		expect(accepts({ kind: 'evolution', uid: m.uid, teamId: open().id, species: 'Gabite' }, { kind: 'party', index: 0 })).toBe(false);
		expect(accepts({ kind: 'evolution', uid: m.uid, teamId: open().id, species: 'Gabite' }, { kind: 'teamslot', teamId: open().id, index: 0 })).toBe(false);
	});

	it('lets a boxed set into the party or another box cell', () => {
		const drag: DragData = { kind: 'boxset', box: 0, slot: 0 };
		expect(accepts(drag, { kind: 'party', index: 0 })).toBe(true);
		expect(accepts(drag, { kind: 'boxcell', box: 0, slot: 1 })).toBe(true);
		SIX.forEach((p) => s().addMember(p));
		expect(accepts(drag, { kind: 'party', index: 6 })).toBe(false);
		expect(accepts(drag, { kind: 'party', index: 0 })).toBe(true);
	});

	// Any Pokémon dropped on the card goes onto the card; one that isn't in the party needs room in it.
	it('lets any Pokémon onto the card or its move slots while it has a place in the party', () => {
		s().addMember('Pikachu');
		const own: DragData = { kind: 'member', uid: open().members[0].uid, teamId: open().id };
		const others: DragData[] = [{ kind: 'candidate', species: 'Mew' }, { kind: 'boxset', box: 0, slot: 0 }, { kind: 'member', uid: 'x', teamId: 'other' }];
		for (const target of [{ kind: 'card' as const }, { kind: 'moveslot' as const, slot: 2 }]) {
			expect(accepts(own, target)).toBe(true);
			for (const drag of others) expect(accepts(drag, target), `${drag.kind} on ${target.kind}`).toBe(true);
		}
		SIX.slice(1).forEach((p) => s().addMember(p));
		expect(accepts(own, { kind: 'card' })).toBe(true);
		for (const drag of others) expect(accepts(drag, { kind: 'card' }), `${drag.kind} on a full team`).toBe(false);
		expect(accepts({ kind: 'evolution', uid: own.uid, teamId: open().id, species: 'Raichu' }, { kind: 'card' })).toBe(false);
	});

	it('lets a move from the list onto a slot only, and a move off its slot anywhere', () => {
		expect(accepts({ kind: 'move', move: 'Surf' }, { kind: 'moveslot', slot: 0 })).toBe(true);
		expect(accepts({ kind: 'move', move: 'Surf' }, undefined)).toBe(false);
		expect(accepts({ kind: 'move', move: 'Surf' }, { kind: 'card' })).toBe(false);
		expect(accepts({ kind: 'move', move: 'Surf', slot: 1 }, undefined)).toBe(true);
		expect(accepts({ kind: 'move', move: 'Surf', slot: 1 }, { kind: 'party', index: 0 })).toBe(true);
	});
});
