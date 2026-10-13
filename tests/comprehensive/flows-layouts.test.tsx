import { act } from 'react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { formatLabel } from '@/lib/dex';
import { newSet, newTeam, type Library, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';
import { seedLocalLibrary, setViewport } from '../helpers/env';
import { allByName, button, byLabel, byName, click, flush, hasText, key, queryButton, queryByLabel, queryByName, renderApp, type, waitFor } from '../helpers/render';
import { buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
const nav = () => document.querySelector('nav')!;
const navTab = (name: string) => button(name, nav());
const current = () => nav().querySelector('[aria-current="true"]')!.textContent;
const sheet = (label: string) => queryByLabel(label);

let stress: StressLibrary;
let lib: Library;
const roomy = newTeam({ name: 'Roomy', format: 'gen9ou', members: [newSet('Pikachu', { ability: 'Static' }), newSet('Garchomp', { ability: 'Rough Skin' })] });

beforeAll(async () => {
	stress = await buildStressLibrary();
});

async function start(viewport: Parameters<typeof setViewport>[0]) {
	setViewport(viewport);
	lib = clone(stress.library);
	lib.teams.unshift(clone(roomy));
	seedLocalLibrary(lib);
	await renderApp();
}

const tapMember = async (index: number) => {
	await click(document.querySelector(`[data-party-member][data-index="${index}"]`)!);
	await flush(2);
};

describe('phone layout', () => {
	beforeEach(() => start({ mobile: true }));

	it('opens on the party with the open team’s summary, and the header controls', () => {
		expect(current()).toBe('Party');
		expect(hasText(`${formatLabel(roomy)} - 2/6`)).toBe(true);
		expect(byLabel('Dark mode')).toBeTruthy();
		expect(byLabel('Card sprites')).toBeTruthy();
		expect(byLabel('Sign in to sync your teams')).toBeTruthy();
	});

	it('jumps to Teams from the team summary, and back to Party when a team is opened', async () => {
		await click(button(new RegExp(`^${roomy.name}`)));
		expect(current()).toBe('Teams');
		expect(allByName(/^Open /)).toHaveLength(lib.teams.length - 1);
		const next = lib.teams[5];
		await click(byName(`Open ${next.name}`));
		await flush();
		expect(open().id).toBe(next.id);
		expect(current()).toBe('Party');
	});

	it('switches between all three tabs', async () => {
		for (const tab of ['Teams', 'Browse', 'Party']) {
			await click(navTab(tab));
			expect(current()).toBe(tab);
		}
	});

	it('browses suggestions with search and tiers, and adds one with a tap', async () => {
		await click(navTab('Browse'));
		expect(allByName(/^Add .+ to the team$/).length).toBeGreaterThan(10);
		expect(allByName(/^Add .+ to the team$/).length).toBeLessThanOrEqual(80);
		await click(button('UU'));
		expect(s().carouselTab).toBe('UU');
		type(document.querySelector<HTMLInputElement>('input[type="search"]')!, 'Snorlax');
		await flush();
		await click(byName('Add Snorlax'));
		expect(open().members.at(-1)!.species).toBe('Snorlax');
	});

	it('takes a Pokémon out of the Box with a tap', async () => {
		await click(navTab('Browse'));
		await click(button('Box'));
		const slot = lib.boxes[0].slots.findIndex(Boolean);
		const stored = lib.boxes[0].slots[slot]!;
		await click(byLabel(`${stored.name || stored.species}, box slot ${slot + 1}`));
		expect(open().members.at(-1)!.uid).toBe(stored.uid);
		await click(button('Box 2'));
		expect(s().boxIndex).toBe(1);
	});

	it('opens the editor sheet from a key row or move, and closes it from the backdrop', async () => {
		await tapMember(1);
		expect(byLabel('Garchomp set')).toBeTruthy();
		// Picking a member only puts it on the card: the editor waits for a row, move or Stats.
		expect(sheet('Editor')).toBeNull();
		await click(document.querySelector('[data-key-row="item"]')!);
		await flush();
		const editor = sheet('Editor')!;
		expect(editor).toBeTruthy();
		expect(byLabel('Inspector', editor)).toBeTruthy();
		type(editor.querySelector<HTMLInputElement>('input[type="search"]')!, 'Leftovers');
		await click(button(/^Leftovers/, editor));
		expect(open().members[1].item).toBe('Leftovers');
		// A pick drags the sheet back down to the card.
		await flush();
		expect(sheet('Editor')).toBeNull();
		// The same row opens the editor again after a dismiss, from the backdrop.
		await click(document.querySelector('[data-key-row="item"]')!);
		await flush();
		expect(sheet('Editor')).toBeTruthy();
		await click(document.querySelector('.fixed.inset-0.z-40')!);
		await flush();
		expect(sheet('Editor')).toBeNull();
		await click(document.querySelector('[data-move-slot="0"]')!);
		await flush();
		expect(sheet('Editor')).toBeTruthy();
		expect(s()).toMatchObject({ inspector: 'moves', activeMoveSlot: 0 });
	});

	it('offers the long-press actions: put on the card, move to the Box, remove', async () => {
		const [pikachu, garchomp] = open().members;
		act(() => useStore.setState({ mobileActionUid: pikachu.uid }));
		await flush();
		expect(hasText('Pikachu', sheet('Pokémon actions')!)).toBe(true);
		await click(button('Put on the card'));
		expect(s().selectedUid).toBe(pikachu.uid);
		expect(s().mobileActionUid).toBeNull();
		act(() => useStore.setState({ mobileActionUid: garchomp.uid }));
		await flush();
		await click(button('Move to Box'));
		expect(open().members.map((m) => m.uid)).toEqual([pikachu.uid]);
		expect(s().library.boxes.some((b) => b.slots.some((x) => x?.uid === garchomp.uid))).toBe(true);
		act(() => useStore.setState({ mobileActionUid: pikachu.uid }));
		await flush();
		await click(button('Remove from team'));
		expect(open().members).toHaveLength(0);
	});

	it('keeps a member on the card when Escape is pressed on the party tab', async () => {
		await tapMember(1);
		await key(window, 'Escape');
		expect(s().selectedUid).toBe(open().members[1].uid);
	});
});

describe('tablet layout: the workspace merges into the right panel', () => {
	beforeEach(() => start({ merged: true }));
	const strip = () => [...byLabel('Inspector').querySelectorAll(':scope > div:first-child button')].map((b) => b.getAttribute('aria-label'));

	it('rests on the party and card tab', () => {
		expect(s().inspector).toBe('card');
		expect(strip()[0]).toBe('Party and card');
		expect(document.querySelector('[data-party]')).toBeTruthy();
		expect(byLabel('Suggestions')).toBeTruthy();
	});

	it('keeps the card in view when a member is picked, and opens editors as tabs', async () => {
		await tapMember(1);
		expect(s().inspector).toBe('card');
		expect(byLabel('Garchomp set')).toBeTruthy();
		await click(document.querySelector('[data-key-row="ability"]')!);
		expect(s().inspector).toBe('ability');
		expect(queryByLabel('Garchomp set')).toBeNull();
		await click(byLabel('Party and card'));
		expect(byLabel('Garchomp set')).toBeTruthy();
	});

	it('returns to the card once a move is picked', async () => {
		await tapMember(1);
		await click(document.querySelector('[data-move-slot="0"]')!);
		expect(s().inspector).toBe('moves');
		await waitFor(() => expect(queryButton(/^GroundEarthquake/)).toBeTruthy());
		await click(button(/^GroundEarthquake/));
		expect(open().members[1].moves[0]).toBe('Earthquake');
		expect(s().inspector).toBe('card');
	});

	it('offers drop targets on the card only while the card tab is open', async () => {
		expect(document.querySelector('[data-party]')).toBeTruthy();
		expect(document.querySelector('[data-move-slot]')).toBeTruthy();
		await click(document.querySelector('[data-key-row="ability"]')!);
		expect(document.querySelector('[data-party]')).toBeNull();
		expect(document.querySelector('[data-move-slot]')).toBeNull();
	});

	it('brings the card back when a suggestion is added from another tab', async () => {
		await click(document.querySelector('[data-key-row="ability"]')!);
		expect(s().inspector).toBe('ability');
		await click(allByName(/^Add .+ to the team$/)[0]);
		expect(open().members).toHaveLength(3);
		expect(s().inspector).toBe('card');
	});

	it('offers no Compare tab, whatever is dragged or dropped', () => {
		expect(strip()).not.toContain('Compare');
		expect(strip()[0]).toBe('Party and card');
	});

	it('goes back to the team view when widened to desktop', async () => {
		act(() => setViewport({ merged: false }));
		await flush();
		expect(s()).toMatchObject({ merged: false, inspector: 'team' });
		expect(queryByLabel('Party and card')).toBeNull();
	});
});

describe('switching layouts keeps the library', () => {
	it('moves from desktop to phone without losing the open team or card', async () => {
		await start({});
		await tapMember(1);
		act(() => setViewport({ mobile: true }));
		await flush();
		expect(nav()).toBeTruthy();
		expect(open().name).toBe('Roomy');
		expect(byLabel('Garchomp set')).toBeTruthy();
	});

	it('renders every team on the phone Teams tab', async () => {
		await start({ mobile: true });
		await click(navTab('Teams'));
		for (const t of lib.teams.slice(1) as Team[]) expect(queryByName(`Open ${t.name}`), t.name).toBeTruthy();
	});
});
