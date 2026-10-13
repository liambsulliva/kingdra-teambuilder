import { act, createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/core';
import type { DragData, DropTarget } from '@/lib/drag';
import { emptyLibrary, newSet, newTeam, type Library } from '@/lib/model';
import { useStore } from '@/lib/store';
import { seedLocalLibrary, setViewport } from '../helpers/env';
import { allByName, button, byLabel, byName, click, flush, hasText, hover, key, queryByLabel, renderApp, type, wait, waitFor } from '../helpers/render';

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

	it('hops a tapped member onto the card: no sheet, no selection tile, and its icon stays in the row', async () => {
		await click(document.querySelector('[data-party-member][data-index="1"]')!);
		await flush(2);
		expect(s().selectedUid).toBe(trio.members[1].uid);
		expect(byLabel('Pikachu set')).toBeTruthy();
		expect(editorOpen()).toBe(false);
		expect(partyIcons().map((el) => el.dataset.species)).toEqual(trio.members.map((m) => m.species));
		expect(partyIcons().some((el) => el.className.includes('bg-accent-soft'))).toBe(false);
	});

	it('opens the editor sheet from a key row, a move slot or a type badge', async () => {
		await click(document.querySelector('[data-key-row="item"]')!);
		await flush();
		expect(editorOpen()).toBe(true);
		act(() => s().setInspector('team'));
		act(() => useStore.setState({ chosen: s().chosen + 1 }));
		await flush();
		expect(editorOpen()).toBe(false);
		await click(document.querySelector('[data-move-slot="1"]')!);
		await flush();
		expect(editorOpen()).toBe(true);
		expect(s()).toMatchObject({ inspector: 'moves', activeMoveSlot: 1 });
		act(() => useStore.setState({ chosen: s().chosen + 1 }));
		await flush();
		await click(byLabel('Garchomp set').querySelector('button[title$="matchups"]')!);
		await flush();
		expect(editorOpen()).toBe(true);
		expect(s().inspector).toBe('matchups');
	});

	it('closes the sheet once a move is picked with no slot chosen', async () => {
		act(() => s().setInspector('moves'));
		await flush();
		expect(editorOpen()).toBe(true);
		const eq = await waitFor(() => button(/^GroundEarthquake/, byLabel('Editor')));
		await click(eq);
		await flush();
		expect(open().members[0].moves[0]).toBe('Earthquake');
		expect(editorOpen()).toBe(false);
		expect(byName('Move 1: Earthquake')).toBeTruthy();
	});

	// Known issue: picking clears the active slot, which the sheet reads as a new view and reopens itself in the
	// same render the pick closed it. Reproduced in Chrome at 375 px: the sheet stays up on “Moves”.
	it.fails('closes the sheet once a move is picked for a tapped slot', async () => {
		await click(document.querySelector('[data-move-slot="0"]')!);
		await flush();
		const eq = await waitFor(() => button(/^GroundEarthquake/, byLabel('Editor')));
		await click(eq);
		await flush();
		expect(open().members[0].moves[0]).toBe('Earthquake');
		expect(editorOpen()).toBe(false);
	});

	it('closes the sheet on a level preset, but not while a level is typed', async () => {
		await click(document.querySelector('[data-key-row="level"]')!);
		await flush();
		const box = byLabel('Editor').querySelector<HTMLInputElement>('input[aria-label="Level"]')!;
		type(box, '7');
		await flush();
		expect(editorOpen()).toBe(true);
		await click(button('50', byLabel('Editor')));
		await flush();
		expect(open().members[0].level).toBe(50);
		expect(editorOpen()).toBe(false);
	});

	it('opens the action sheet on a long press that never moves, and acts from it', async () => {
		drop({ kind: 'member', uid: trio.members[1].uid, species: 'Pikachu', teamId: trio.id }, undefined, 2);
		await flush();
		const sheet = byLabel('Pokémon actions');
		expect(hasText('Pikachu', sheet)).toBe(true);
		expect(hasText('Electric', sheet)).toBe(true);
		await click(button('Move to Box', sheet));
		await flush();
		expect(open().members.map((m) => m.species)).toEqual(['Garchomp', 'Corviknight']);
		expect(s().mobileActionUid).toBeNull();
	});

	it('never opens the action sheet for another team’s member', async () => {
		const other = newTeam({ name: 'Other', members: [newSet('Mew')] });
		act(() => s().addTeams([other]));
		act(() => s().openTeam(trio.id));
		drop({ kind: 'member', uid: other.members[0].uid, species: 'Mew', teamId: other.id }, undefined, 2);
		await flush();
		expect(s().mobileActionUid).toBeNull();
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

	// docs/redesign/spec.md §10: nothing animates across tabs.
	it('flies nothing across tabs when a tapped member switches to Party', async () => {
		setViewport({ reducedMotion: false });
		const animate = vi.spyOn(Element.prototype, 'animate');
		try {
			await click(document.querySelector('[data-party-member][data-index="2"]')!);
			await flush(2);
			await wait(400);
			expect(current()).toBe('Party');
			expect(s().selectedUid).toBe(trio.members[2].uid);
			const flown = animate.mock.contexts.filter((el) => (el as HTMLElement).style.position === 'fixed');
			expect(flown).toHaveLength(0);
		} finally {
			animate.mockRestore();
			setViewport({ reducedMotion: true });
		}
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
		expect(allByName(/^Add .+ to the team$/)).toHaveLength(4);
		await click(button('See all suggestions'));
		expect(current()).toBe('Browse');
	});

	it('puts the first add on the card and drops the starters', async () => {
		const first = allByName(/^Add .+ to the team$/)[0];
		const species = first.querySelector('.font-semibold')!.textContent!;
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

	it('shows the card member in the workspace party row too, with hover captions', async () => {
		expect(partyIcons().map((el) => el.dataset.species)).toEqual(trio.members.map((m) => m.species));
		await hover(partyIcons()[1]);
		expect(caption()).toContain('Pikachu');
		expect(caption()).toContain('Electric');
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

describe('phone: editor and teams', () => {
	beforeEach(() => start());

	it('has the fancy animations toggle in the header, with no tooltip', async () => {
		const toggle = byLabel('Enable fancy animations', document.querySelector('header')!);
		expect(toggle.parentElement!.querySelector('[role="tooltip"]')).toBeNull();
		await click(toggle);
		expect(s().fancyMotion).toBe(false);
		expect(toggle.getAttribute('aria-pressed')).toBe('false');
	});

	it('closes the editor after an ability is picked, and the same row opens it again', async () => {
		await click(document.querySelector('[data-key-row="ability"]')!);
		await flush();
		expect(editorOpen()).toBe(true);
		await click(button(/^Sand Veil/, byLabel('Editor')));
		await flush();
		expect(open().members[0].ability).toBe('Sand Veil');
		expect(editorOpen()).toBe(false);
		await click(document.querySelector('[data-key-row="ability"]')!);
		await flush();
		expect(editorOpen()).toBe(true);
	});

	it('gives the editor one height on every tab, so it does not jump between them', async () => {
		await click(document.querySelector('[data-key-row="level"]')!);
		await flush();
		const sheet = byLabel('Editor');
		expect(sheet.classList.contains('h-[80dvh]')).toBe(true);
		expect(sheet.classList.contains('max-h-[80dvh]')).toBe(false);
	});

	it('keeps every icon of the open team on the team list on a phone', async () => {
		await click(navTab('Teams'));
		await flush();
		for (let i = 0; i < trio.members.length; i++) {
			expect(document.querySelector(`[data-team-icon="${trio.id}:${i}"] [aria-hidden="true"]`)).not.toBeNull();
		}
		expect(document.querySelector(`[data-team-icon="${trio.id}:3"]`)!.className).toContain('border-dashed');
	});

	it('shows every icon on the open card in card view, and opens a team with no hinge, fall or shatter', async () => {
		setViewport({ reducedMotion: false });
		await click(navTab('Teams'));
		await flush();
		await click(byLabel('Card view'));
		const card = document.querySelector<HTMLElement>(`[data-team-tile="${trio.id}"]`)!;
		for (let i = 0; i < trio.members.length; i++) {
			expect(card.querySelector(`[data-team-icon="${trio.id}:${i}"] [aria-hidden="true"]`)).not.toBeNull();
		}
		const animate = vi.spyOn(Element.prototype, 'animate');
		await click(byName(`Open ${blank.name}`));
		await flush();
		expect(open().id).toBe(blank.id);
		const flown = animate.mock.contexts.filter((el) => (el as HTMLElement).style.position === 'fixed' || (el as HTMLElement).style.clipPath);
		expect(flown).toHaveLength(0);
		animate.mockRestore();
		setViewport({ reducedMotion: true });
	});

	it('keeps the number on the name’s line on a phone, with the name truncating', () => {
		const name = byLabel('Garchomp set').querySelector('h2')!;
		expect(name.className).toContain('truncate');
		expect(name.className).not.toContain('break-words');
		const number = [...name.parentElement!.querySelectorAll('span')].find((s) => s.textContent!.startsWith('#'))!;
		expect(number.parentElement).toBe(name.parentElement);
		expect(name.parentElement!.className).not.toContain('flex-wrap');
		// The number and species sit on the name's bottom edge: bottom-aligned, with no padding lifting them.
		expect(name.parentElement!.className).toContain('items-end');
		expect(number.className).not.toContain('pb-1');
	});

	it('marks every draggable party icon so a long press drags instead of selecting', () => {
		// Every member is in the row, the one on the card included, so all three are draggable here.
		const sources = partyIcons();
		expect(sources.length).toBe(trio.members.length);
		expect(sources.every((el) => el.classList.contains('drag-source'))).toBe(true);
	});
});

describe('phone: legality issues', () => {
	beforeEach(() => start());

	it('lists a member’s legality issues under the move grid, with no flag beside its rows or moves', async () => {
		const garchomp = trio.members[0];
		act(() => s().setValidation(trio.id, { byMember: { [garchomp.uid]: ['Garchomp item Rocky Helmet is banned'] }, team: [], count: 1 }));
		await flush();
		const card = byLabel('Garchomp set');
		expect(card.querySelector('[data-key-row="item"] .text-danger')).toBeNull();
		expect(card.querySelector('[data-move-slot="0"] .text-danger')).toBeNull();
		const grid = card.querySelector('[data-move-slot="3"]')!.closest('.grid')!;
		expect(grid.nextElementSibling!.textContent).toContain('Legality');
		expect(grid.nextElementSibling!.textContent).toContain('Garchomp item Rocky Helmet is banned');
	});
});
