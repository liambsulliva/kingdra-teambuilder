import { act, createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/core';
import type { DragData, DropTarget } from '@/lib/drag';
import { emptyLibrary, newSet, newTeam, type Library } from '@/lib/model';
import { useStore } from '@/lib/store';
import { seedLocalLibrary, setViewport } from '../helpers/env';
import { allByLabel, button, byLabel, click, flush, hasText, key, queryByLabel, renderApp, waitFor } from '../helpers/render';

// Mobile interaction patterns agreed in docs/redesign/spec.md section 10. jsdom has no
// layout, so drops drive the real DragLayer's handlers directly, as in flows-drag.
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
const nav = () => document.querySelector('nav')!;
const navTab = (name: string) => button(name, nav());
const current = () => nav().querySelector('[aria-current="true"]')!.textContent;
const partyIcons = () => [...document.querySelectorAll<HTMLElement>('[data-party-member]')];
const caption = () => document.querySelector('[data-party] [aria-live]')!.textContent;
const editorOpen = () => !!queryByLabel('Editor');

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

const trio = newTeam({
	name: 'Trio',
	format: 'gen9ou',
	members: [newSet('Garchomp', { ability: 'Rough Skin' }), newSet('Pikachu', { ability: 'Static' }), newSet('Corviknight', { ability: 'Pressure' })],
});
const blank = newTeam({ name: 'Blank', format: 'gen9ou' });
const stored = newSet('Gholdengo', { ability: 'Good as Gold' });

let lib: Library;
async function start(mobile = true, teams = [trio, blank]) {
	setViewport({ mobile });
	lib = { ...emptyLibrary(), teams: structuredClone(teams) };
	lib.boxes[0].slots[0] = structuredClone(stored);
	seedLocalLibrary(lib);
	await renderApp();
}

describe('phone: party and card', () => {
	beforeEach(() => start());

	it('opens a team with its first member on the card and no sheet over it', () => {
		expect(s().selectedUid).toBe(trio.members[0].uid);
		expect(byLabel('Garchomp set')).toBeTruthy();
		// Neither the editor nor the team analysis opens on its own.
		expect(editorOpen()).toBe(false);
		expect(s().inspector).toBe('team');
	});

	it('hops a tapped member onto the card: no sheet, no selection tile, and its icon leaves the row', async () => {
		await click(document.querySelector('[data-party-member][data-index="1"]')!);
		await flush(2);
		expect(s().selectedUid).toBe(trio.members[1].uid);
		expect(byLabel('Pikachu set')).toBeTruthy();
		expect(editorOpen()).toBe(false);
		expect(partyIcons().map((el) => el.dataset.species)).toEqual(['Garchomp', 'Corviknight']);
		expect(partyIcons().some((el) => el.className.includes('bg-accent-soft'))).toBe(false);
	});

	it('opens the editor sheet only from a key row, move or Stats', async () => {
		await click(document.querySelector('[data-key-row="item"]')!);
		await flush();
		expect(editorOpen()).toBe(true);
	});

	it('captions the member on the card, never the last one touched', async () => {
		expect(caption()).toContain('Garchomp');
		await click(document.querySelector('[data-party-member][data-index="2"]')!);
		await flush(2);
		expect(caption()).toContain('Corviknight');
		act(() => s().removeMember(trio.members[2].uid));
		await flush();
		// The removed member is gone from the caption; its neighbor took the card.
		expect(caption()).not.toContain('Corviknight');
		expect(caption()).toContain('Pikachu');
	});

	it('keeps a member on the card through Escape', async () => {
		await key(window, 'Escape');
		expect(s().selectedUid).toBe(trio.members[0].uid);
	});

	it('remembers the last member on each team’s card', async () => {
		await click(document.querySelector('[data-party-member][data-index="2"]')!);
		await flush(2);
		act(() => s().openTeam(blank.id));
		act(() => s().openTeam(trio.id));
		expect(s().selectedUid).toBe(trio.members[2].uid);
		expect(JSON.parse(localStorage.getItem('kingdra.lastSelected')!)[trio.id]).toBe(trio.members[2].uid);
	});

	it('shows a support badge’s moves on tap and hides them on the next tap elsewhere', async () => {
		const badge = await waitFor(() => document.querySelector<HTMLElement>('[data-support]')!);
		const tip = () => badge.querySelector('[role="tooltip"]')!;
		expect(tip().className).toContain('hidden');
		await click(badge);
		expect(badge.getAttribute('aria-expanded')).toBe('true');
		expect(tip().className).toContain('opacity-100');
		act(() => void document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
		await flush();
		expect(badge.getAttribute('aria-expanded')).toBe('false');
	});
});

describe('phone: Browse party row', () => {
	beforeEach(async () => {
		await start();
		await click(navTab('Browse'));
	});

	it('pins the whole party under the Suggestions and Box tabs, card member included', async () => {
		expect(partyIcons()).toHaveLength(3);
		await click(button('Box'));
		expect(partyIcons()).toHaveLength(3);
		expect(partyIcons().some((el) => el.className.includes('bg-accent-soft'))).toBe(false);
	});

	it('in Suggestions, a tapped member goes on the card and Party opens', async () => {
		await click(document.querySelector('[data-party-member][data-index="1"]')!);
		await flush(2);
		expect(current()).toBe('Party');
		expect(s().selectedUid).toBe(trio.members[1].uid);
		expect(editorOpen()).toBe(false);
	});

	it('in Box, a tapped member is boxed and a tapped Box Pokémon joins the party', async () => {
		await click(button('Box'));
		await click(document.querySelector('[data-party-member][data-index="1"]')!);
		expect(open().members.map((m) => m.species)).toEqual(['Garchomp', 'Corviknight']);
		expect(s().library.boxes[0].slots.some((x) => x?.species === 'Pikachu')).toBe(true);
		await click(byLabel('Gholdengo, box slot 1'));
		expect(open().members.at(-1)!.species).toBe('Gholdengo');
		expect(current()).toBe('Browse');
	});

	it('takes drags both ways between the party row and the Box', async () => {
		await click(button('Box'));
		drop({ kind: 'member', uid: trio.members[0].uid, species: 'Garchomp', teamId: trio.id }, { kind: 'boxcell', box: 0, slot: 5 });
		expect(s().library.boxes[0].slots[5]?.species).toBe('Garchomp');
		// The member on the card was boxed: its neighbor takes the card.
		expect(s().selectedUid).toBe(trio.members[1].uid);
		drop({ kind: 'boxset', box: 0, slot: 0, species: 'Gholdengo' }, { kind: 'party', index: 0 });
		expect(open().members[0].species).toBe('Gholdengo');
		drop({ kind: 'candidate', species: 'Kingambit' }, { kind: 'party', index: 3 });
		expect(open().members.map((m) => m.species)).toContain('Kingambit');
	});
});

describe('phone: empty team', () => {
	beforeEach(() => start(true, [blank, trio]));

	it('offers four suggestions and a way into Browse, with tap wording', async () => {
		expect(hasText('Drag a suggestion onto the party, or tap one to add it.')).toBe(true);
		expect(allByLabel(/^Add .+ to the team$/)).toHaveLength(4);
		await click(button('See all suggestions'));
		expect(current()).toBe('Browse');
	});

	it('puts the first add on the card and drops the starters', async () => {
		const first = allByLabel(/^Add .+ to the team$/)[0];
		const species = first.getAttribute('aria-label')!.replace(/^Add | to the team$/g, '');
		await click(first);
		await flush(2);
		expect(open().members).toHaveLength(1);
		expect(s().selectedUid).toBe(open().members[0].uid);
		expect(byLabel(`${species} set`)).toBeTruthy();
		expect(queryByLabel('See all suggestions')).toBeNull();
		expect(editorOpen()).toBe(false);
	});
});

describe('desktop is unchanged where the phone changed', () => {
	beforeEach(() => start(false));

	it('keeps the card member out of the workspace party row, with hover captions', () => {
		expect(partyIcons().map((el) => el.dataset.species)).toEqual(['Pikachu', 'Corviknight']);
	});

	it('shows all six in the Box drawer so the card member can be boxed', async () => {
		await click(button('Box'));
		const drawer = byLabel('Box');
		expect(drawer.querySelectorAll('[data-party-member]')).toHaveLength(3);
	});

	it('keeps support tooltips on hover only', async () => {
		const badge = await waitFor(() => document.querySelector<HTMLElement>('[data-support]')!);
		await click(badge);
		expect(badge.hasAttribute('aria-expanded')).toBe(false);
		expect(badge.querySelector('[role="tooltip"]')!.className).toContain('max-md:hidden');
	});

	it('uses click wording and no starter grid on an empty team', async () => {
		act(() => s().openTeam(blank.id));
		await flush();
		expect(hasText('Drag a suggestion onto the party, or click one to add it.')).toBe(true);
		expect(queryByLabel('See all suggestions')).toBeNull();
	});
});
