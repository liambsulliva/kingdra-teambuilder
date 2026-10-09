import { act, createElement } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/core';
import type { DragData, DropTarget } from '@/lib/drag';
import { BOX_SIZE, newSet, newTeam, type Library, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';
import { seedLocalLibrary, setViewport } from '../helpers/env';
import { flush, renderApp } from '../helpers/render';
import { buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';

// jsdom has no layout, so dnd-kit cannot detect collisions. The real DragLayer is
// rendered, and its DndContext handlers are driven directly with each drop.
const dnd = vi.hoisted(() => ({ props: null as null | Record<string, (e: unknown) => void> }));
vi.mock('@dnd-kit/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@dnd-kit/core')>();
	return {
		...actual,
		DndContext: (props: Record<string, unknown>) => {
			dnd.props = props as never;
			return createElement(actual.DndContext, props as never);
		},
	};
});

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
const team = (id: string) => s().library.teams.find((t) => t.id === id)!;
const lastToast = () => s().toasts.at(-1);

/** Start a drag, pass over the target, and release there. `moved` is how far the pointer travelled. */
function drop(drag: DragData, over: DropTarget, moved = 40) {
	const active = { id: 'drag', data: { current: drag } };
	const target = over ? { id: 'over', data: { current: over } } : null;
	act(() => dnd.props!.onDragStart({ active }));
	act(() => dnd.props!.onDragOver({ active, over: target }));
	act(() =>
		dnd.props!.onDragEnd({
			active,
			over: target,
			delta: { x: moved, y: 0 },
			activatorEvent: new MouseEvent('pointerdown', { clientX: 100, clientY: 100 }),
		} as unknown as DragEndEvent)
	);
}

let stress: StressLibrary;
let lib: Library;
const roomy = newTeam({ name: 'Roomy', format: 'gen9ou', members: [newSet('Pikachu', { ability: 'Static' }), newSet('Eevee', { ability: 'Run Away' })] });
const old = newTeam({ name: 'Gen 3', gen: 3, format: 'gen3ou', members: [newSet('Gible', { ability: 'Sand Veil' })] });

beforeAll(async () => {
	stress = await buildStressLibrary();
});

beforeEach(async () => {
	lib = clone(stress.library);
	lib.teams.unshift(clone(roomy), clone(old));
	seedLocalLibrary(lib);
	await renderApp();
	expect(dnd.props).toBeTruthy();
});

const full = () => lib.teams.find((t) => t.members.length === 6 && t.mode === 'competitive' && t.gen === 9)!;
async function openTeam(t: Team) {
	act(() => s().openTeam(t.id));
	await flush(1);
}

describe('dragging a suggestion', () => {
	it('onto the card of an empty team adds it and puts it on the card', async () => {
		const empty = newTeam({ name: 'Empty' });
		act(() => s().addTeams([empty]));
		drop({ kind: 'candidate', species: 'Garchomp' }, { kind: 'card' });
		await flush();
		expect(open().members.map((m) => m.species)).toEqual(['Garchomp']);
		expect(s().selectedUid).toBe(open().members[0].uid);
	});

	it('onto the card of a team with members compares it', () => {
		drop({ kind: 'candidate', species: 'Garchomp' }, { kind: 'card' });
		expect(s().compareSpecies).toBe('Garchomp');
		expect(open().members).toHaveLength(2);
	});

	it('onto a party cell inserts it there', () => {
		drop({ kind: 'candidate', species: 'Garchomp' }, { kind: 'party', index: 1 });
		expect(open().members.map((m) => m.species)).toEqual(['Pikachu', 'Garchomp', 'Eevee']);
	});

	it('onto a full party is rejected with a shake, unless it lands on a member', async () => {
		await openTeam(full());
		const before = open().members.map((m) => m.uid);
		const shake = s().rejectedAt;
		drop({ kind: 'candidate', species: 'Mew' }, { kind: 'party', index: 6 });
		expect(open().members.map((m) => m.uid)).toEqual(before);
		expect(s().rejectedAt).toBeGreaterThan(shake);
		drop({ kind: 'candidate', species: 'Mew' }, { kind: 'party', index: 2 });
		expect(open().members[2]).toMatchObject({ uid: before[2], species: 'Mew' });
	});

	it('onto another team’s card adds it there without opening that team', () => {
		const target = lib.teams.find((t) => t.members.length < 6 && t.id !== roomy.id && t.gen === 9 && t.mode === 'competitive')!;
		drop({ kind: 'candidate', species: 'Mew' }, { kind: 'teamslot', teamId: target.id, index: 5 });
		expect(team(target.id).members.at(-1)!.species).toBe('Mew');
		expect(open().id).toBe(roomy.id);
	});

	it('onto a generation that lacks it is refused', () => {
		drop({ kind: 'candidate', species: 'Garchomp' }, { kind: 'teamslot', teamId: old.id, index: 0 });
		expect(team(old.id).members.map((m) => m.species)).toEqual(['Gible']);
		expect(lastToast()?.message).toBe("Garchomp can't be used in Gen 3 (Gen 3 - OU)");
	});

	it('released nowhere does nothing', () => {
		drop({ kind: 'candidate', species: 'Mew' }, undefined);
		expect(open().members).toHaveLength(2);
	});
});

describe('dragging a party member', () => {
	const pikachu = () => open().members.find((m) => m.species === 'Pikachu')!;
	const drag = (): DragData => ({ kind: 'member', uid: pikachu().uid, species: 'Pikachu', teamId: roomy.id });

	it('released outside the party removes it', () => {
		const uid = pikachu().uid;
		drop(drag(), undefined);
		expect(open().members.map((m) => m.uid)).not.toContain(uid);
	});

	it('released on the card or a move slot removes it too', () => {
		drop(drag(), { kind: 'card' });
		expect(open().members.map((m) => m.species)).toEqual(['Eevee']);
	});

	it('within the party reorders', () => {
		drop(drag(), { kind: 'party', index: 1 });
		expect(open().members.map((m) => m.species)).toEqual(['Eevee', 'Pikachu']);
	});

	it('onto a Box cell stores it, swapping with what is there', () => {
		const uid = pikachu().uid;
		const slot = lib.boxes[0].slots.findIndex(Boolean);
		const stored = lib.boxes[0].slots[slot]!;
		drop(drag(), { kind: 'boxcell', box: 0, slot });
		expect(s().library.boxes[0].slots[slot]!.uid).toBe(uid);
		expect(open().members.map((m) => m.uid)).toContain(stored.uid);
	});

	it('onto another team moves it there with its set', () => {
		const target = lib.teams.find((t) => t.members.length < 6 && t.gen === 9 && t.id !== roomy.id)!;
		const set = pikachu();
		drop(drag(), { kind: 'teamslot', teamId: target.id, index: 5 });
		expect(team(target.id).members.at(-1)).toEqual(set);
		expect(open().members.map((m) => m.uid)).not.toContain(set.uid);
	});

	it('onto a member of a full team swaps the two', () => {
		const target = full();
		const set = pikachu();
		const displaced = target.members[0];
		drop(drag(), { kind: 'teamslot', teamId: target.id, index: 0 });
		expect(team(target.id).members[0]).toEqual(set);
		expect(open().members[0]).toEqual(displaced);
	});

	it('onto its own team’s card does nothing', () => {
		drop(drag(), { kind: 'teamslot', teamId: roomy.id, index: 0 });
		expect(open().members.map((m) => m.species)).toEqual(['Pikachu', 'Eevee']);
	});

	it('that barely moves is a tap: nothing on desktop, the action sheet on a phone', () => {
		drop(drag(), undefined, 2);
		expect(open().members).toHaveLength(2);
		expect(s().mobileActionUid).toBeNull();
		setViewport({ mobile: true });
		drop(drag(), undefined, 2);
		expect(s().mobileActionUid).toBe(pikachu().uid);
	});

	it('from a closed team into the open party moves it in', () => {
		const from = lib.teams.find((t) => t.members.length > 1 && t.id !== roomy.id)!;
		const set = from.members[0];
		drop({ kind: 'member', uid: set.uid, species: set.species, teamId: from.id }, { kind: 'party', index: 2 });
		expect(open().members[2]).toEqual(set);
		expect(team(from.id).members.map((m) => m.uid)).not.toContain(set.uid);
	});

	it('from a closed team released anywhere else stays put', () => {
		const from = lib.teams.find((t) => t.members.length > 1 && t.id !== roomy.id)!;
		const set = from.members[0];
		for (const over of [undefined, { kind: 'card' as const }, { kind: 'boxcell' as const, box: 0, slot: 0 }]) {
			drop({ kind: 'member', uid: set.uid, species: set.species, teamId: from.id }, over);
			expect(team(from.id).members[0]).toEqual(set);
		}
	});
});

describe('dragging an evolution stage', () => {
	it('moves the member to another team as that stage', async () => {
		await openTeam(team(old.id));
		const gible = open().members[0];
		drop({ kind: 'evolution', uid: gible.uid, species: 'Garchomp', teamId: old.id }, { kind: 'teamslot', teamId: roomy.id, index: 2 });
		expect(team(roomy.id).members[2]).toMatchObject({ uid: gible.uid, species: 'Garchomp' });
		expect(open().members).toHaveLength(0);
	});

	it('is refused where that stage does not exist yet', () => {
		const pikachu = open().members[0];
		drop({ kind: 'evolution', uid: pikachu.uid, species: 'Raichu', teamId: roomy.id }, { kind: 'teamslot', teamId: old.id, index: 1 });
		expect(team(old.id).members.map((m) => m.species)).toEqual(['Gible', 'Raichu']);
		const eevee = open().members[0];
		drop({ kind: 'evolution', uid: eevee.uid, species: 'Sylveon', teamId: roomy.id }, { kind: 'teamslot', teamId: old.id, index: 2 });
		expect(team(old.id).members.map((m) => m.species)).toEqual(['Gible', 'Raichu']);
		expect(lastToast()?.message).toBe("Sylveon can't be used in Gen 3 (Gen 3 - OU)");
	});

	it('does nothing anywhere but another team', () => {
		const pikachu = open().members[0];
		drop({ kind: 'evolution', uid: pikachu.uid, species: 'Raichu', teamId: roomy.id }, { kind: 'party', index: 1 });
		expect(open().members[0].species).toBe('Pikachu');
	});
});

describe('dragging from the Box', () => {
	const first = () => {
		const slot = s().library.boxes[0].slots.findIndex(Boolean);
		return { slot, set: s().library.boxes[0].slots[slot]! };
	};

	it('into the party appends it, or swaps with the member it lands on', () => {
		const a = first();
		drop({ kind: 'boxset', box: 0, slot: a.slot }, { kind: 'party', index: 5 });
		expect(open().members.at(-1)!.uid).toBe(a.set.uid);
		const b = first();
		const pikachu = open().members[0];
		drop({ kind: 'boxset', box: 0, slot: b.slot }, { kind: 'party', index: 0 });
		expect(open().members[0].uid).toBe(b.set.uid);
		expect(s().library.boxes[0].slots[b.slot]!.uid).toBe(pikachu.uid);
	});

	it('to another cell moves or swaps it, across boxes too', () => {
		const a = first();
		const empty = s().library.boxes[1].slots.findIndex((x) => !x);
		drop({ kind: 'boxset', box: 0, slot: a.slot }, { kind: 'boxcell', box: 1, slot: empty });
		expect(s().library.boxes[1].slots[empty]!.uid).toBe(a.set.uid);
		expect(s().library.boxes[0].slots[a.slot]).toBeNull();
		expect(s().library.boxes.every((b) => b.slots.length === BOX_SIZE)).toBe(true);
	});

	it('anywhere else does nothing', () => {
		const a = first();
		drop({ kind: 'boxset', box: 0, slot: a.slot }, { kind: 'card' });
		drop({ kind: 'boxset', box: 0, slot: a.slot }, undefined);
		expect(s().library.boxes[0].slots[a.slot]!.uid).toBe(a.set.uid);
	});
});

describe('dragging a move', () => {
	beforeEach(() => act(() => s().selectMember(open().members[0].uid)));
	const moves = () => open().members[0].moves;

	it('from the list onto a slot sets it', () => {
		drop({ kind: 'move', move: 'Thunderbolt', type: 'Electric' }, { kind: 'moveslot', slot: 2 });
		expect(moves()[2]).toBe('Thunderbolt');
	});

	it('from one slot onto another swaps them', () => {
		drop({ kind: 'move', move: 'Thunderbolt' }, { kind: 'moveslot', slot: 0 });
		drop({ kind: 'move', move: 'Surf' }, { kind: 'moveslot', slot: 1 });
		drop({ kind: 'move', move: 'Thunderbolt', slot: 0 }, { kind: 'moveslot', slot: 1 });
		expect(moves().slice(0, 2)).toEqual(['Surf', 'Thunderbolt']);
	});

	it('off its slot and released anywhere else removes it', () => {
		drop({ kind: 'move', move: 'Thunderbolt' }, { kind: 'moveslot', slot: 3 });
		drop({ kind: 'move', move: 'Thunderbolt', slot: 3 }, undefined);
		expect(moves()[3]).toBe('');
	});

	it('from the list released anywhere else does nothing', () => {
		drop({ kind: 'move', move: 'Thunderbolt' }, undefined);
		expect(moves().filter(Boolean)).toEqual([]);
	});

	it('does nothing without a member on the card', () => {
		act(() => s().selectMember(null));
		drop({ kind: 'move', move: 'Thunderbolt' }, { kind: 'moveslot', slot: 0 });
		expect(moves().filter(Boolean)).toEqual([]);
	});
});

describe('a cancelled drag', () => {
	it('changes nothing', () => {
		const before = s().library;
		act(() => dnd.props!.onDragStart({ active: { id: 'x', data: { current: { kind: 'candidate', species: 'Mew' } } } }));
		act(() => dnd.props!.onDragCancel({}));
		expect(s().library).toBe(before);
	});
});
