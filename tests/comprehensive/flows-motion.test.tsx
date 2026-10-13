import { act } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hopAndSwap, landOn, liftToCard, openTeamWithMotion, poof, pop } from '@/components/motion/choreography';
import { newSet, newTeam, type Library } from '@/lib/model';
import { useStore } from '@/lib/store';
import { seedLocalLibrary, setViewport } from '../helpers/env';
import { allByName, button, byLabel, click, flush, renderApp, wait } from '../helpers/render';
import { buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
/** Animated clones are fixed, pointer-transparent and appended to <body>. */
const clones = () => [...document.body.children].filter((el) => (el as HTMLElement).style.position === 'fixed');
const hiddenMembers = () => [...document.querySelectorAll<HTMLElement>('[data-party-member], [data-team-icon]')].filter((el) => el.style.opacity === '0');

let stress: StressLibrary;
let lib: Library;
let animations: number;
/** Every element that was animated, in order. */
let animated: Element[];

beforeAll(async () => {
	stress = await buildStressLibrary();
});

beforeEach(async () => {
	// Real-looking boxes so the choreography measures, flies and lands things.
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(40, 40, 32, 32));
	animations = 0;
	animated = [];
	const animate = Element.prototype.animate;
	vi.spyOn(Element.prototype, 'animate').mockImplementation(function (this: Element, ...args) {
		animations++;
		animated.push(this);
		return animate.apply(this, args as never);
	});
	setViewport({ reducedMotion: false });
	lib = clone(stress.library);
	lib.teams.unshift(newTeam({ name: 'Evolve', members: [newSet('Charmander', { ability: 'Blaze' }), newSet('Pikachu', { ability: 'Static' })] }));
	seedLocalLibrary(lib);
	await renderApp();
});

afterEach(() => vi.restoreAllMocks());

describe('switching teams with the walk', () => {
	it('walks the old party home and the new one in, then shows everyone', async () => {
		const target = lib.teams[3];
		await act(async () => openTeamWithMotion(target.id));
		await flush();
		expect(open().id).toBe(target.id);
		expect(animations).toBeGreaterThan(0);
		expect(clones()).toHaveLength(0);
		expect(hiddenMembers()).toHaveLength(0);
	});

	it('walks the old party home while the new team walks off, both in the air at once', async () => {
		const target = lib.teams[3];
		const leaving = document.querySelectorAll('[data-party-member]').length;
		let switching!: Promise<void>;
		// Every flight starts before the first await: count the clones before any of them lands.
		act(() => {
			switching = openTeamWithMotion(target.id);
		});
		const arriving = document.querySelectorAll('[data-party-member]').length;
		expect(leaving).toBeGreaterThan(0);
		expect(arriving).toBeGreaterThan(0);
		expect(clones()).toHaveLength(leaving + arriving);
		await act(async () => switching);
		await flush();
		expect(clones()).toHaveLength(0);
		expect(hiddenMembers()).toHaveLength(0);
	});

	it('lands on the last team when switched rapidly', async () => {
		const ids = lib.teams.slice(1, 8).map((t) => t.id);
		await act(async () => {
			await Promise.all(ids.map((id) => openTeamWithMotion(id)));
		});
		await flush();
		expect(open().id).toBe(ids.at(-1));
		expect(clones()).toHaveLength(0);
		expect(hiddenMembers()).toHaveLength(0);
	});

	it('opens straight onto a member when one was picked', async () => {
		const target = lib.teams[2];
		await act(async () => openTeamWithMotion(target.id, target.members[1].uid));
		expect(s().selectedUid).toBe(target.members[1].uid);
	});

	it('does nothing for the team already open', async () => {
		const before = animations;
		await act(async () => openTeamWithMotion(open().id));
		expect(animations).toBe(before);
	});

	it('pops the whole new party in at once when the team card is off screen', async () => {
		const target = lib.teams[3];
		// The card sits below the window: nothing can walk over it.
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
			return this.matches(`[data-team-card="${target.id}"]`) ? new DOMRect(40, 5000, 260, 80) : new DOMRect(40, 40, 32, 32);
		});
		await act(async () => openTeamWithMotion(target.id));
		await flush();
		expect(open().id).toBe(target.id);
		const party = [...document.querySelectorAll('[data-party-member]')];
		// The team opens with a member on the card, so its party icon is not in the row.
		expect(s().selectedUid).toBe(open().members[0].uid);
		expect(party).toHaveLength(open().members.length - 1);
		// Each member pops where it stands. Nothing is flown, so no clone is left in the body.
		expect(party.every((el) => animated.includes(el))).toBe(true);
		expect(clones()).toHaveLength(0);
		expect(hiddenMembers()).toHaveLength(0);
	});

	it('switches at once without animating on a phone or with reduced motion', async () => {
		setViewport({ reducedMotion: true });
		const before = animations;
		await act(async () => openTeamWithMotion(lib.teams[4].id));
		expect(open().id).toBe(lib.teams[4].id);
		expect(animations).toBe(before);
	});
});

describe('switching teams in card view', () => {
	const tile = (id: string) => document.querySelector<HTMLElement>(`[data-team-tile="${id}"]`)!;
	/** Detached stand-ins that were animated: the falling card and its shards. */
	const shards = () => animated.filter((el) => (el as HTMLElement).style.clipPath?.startsWith('polygon'));

	beforeEach(async () => {
		await click(byLabel('Card view'));
		animated = [];
		animations = 0;
	});

	it('jumps the old party home while the new card falls and shatters, then pops the empty card back', async () => {
		const target = lib.teams[3];
		await act(async () => openTeamWithMotion(target.id));
		await flush();
		expect(open().id).toBe(target.id);
		expect(shards()).toHaveLength(6);
		// The card that fell was a stand-in; the real one popped back in its place and is visible.
		expect(animated).toContain(tile(target.id));
		expect(tile(target.id).style.opacity).toBe('');
		expect(clones()).toHaveLength(0);
		expect(hiddenMembers()).toHaveLength(0);
		expect(document.querySelectorAll('[data-team-tile]')).toHaveLength(lib.teams.length);
	});

	it('lands on the last team when cards are clicked rapidly, leaving nothing hidden or behind', async () => {
		const ids = lib.teams.slice(1, 8).map((t) => t.id);
		await act(async () => {
			await Promise.all(ids.map((id) => openTeamWithMotion(id)));
		});
		await flush();
		expect(open().id).toBe(ids.at(-1));
		expect(clones()).toHaveLength(0);
		expect(hiddenMembers()).toHaveLength(0);
		expect([...document.querySelectorAll<HTMLElement>('[data-team-tile]')].filter((el) => el.style.opacity === '0')).toHaveLength(0);
	});

	it('pops the party in without a fall when the card is off screen', async () => {
		const target = lib.teams[3];
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
			return this.querySelector?.(`[data-team-tile="${target.id}"]`) ? new DOMRect(40, 5000, 130, 140) : new DOMRect(40, 40, 32, 32);
		});
		await act(async () => openTeamWithMotion(target.id));
		await flush();
		expect(open().id).toBe(target.id);
		expect(shards()).toHaveLength(0);
		expect(clones()).toHaveLength(0);
	});
});

describe('with fancy animations off', () => {
	const toggle = () => byLabel('Enable fancy animations');
	const shards = () => animated.filter((el) => (el as HTMLElement).style.clipPath?.startsWith('polygon'));

	beforeEach(async () => {
		await click(toggle());
		animated = [];
		animations = 0;
	});

	it('is a pressed toggle in the header, saved for this viewer', async () => {
		expect(toggle().getAttribute('aria-pressed')).toBe('false');
		expect(s().fancyMotion).toBe(false);
		expect(localStorage.getItem('kingdra.fancyMotion')).toBe('off');
		await click(toggle());
		expect(toggle().getAttribute('aria-pressed')).toBe('true');
		expect(s().fancyMotion).toBe(true);
	});

	it('pops the new party into its slots instead of walking anyone', async () => {
		const target = lib.teams[3];
		let switching!: Promise<void>;
		act(() => {
			switching = openTeamWithMotion(target.id);
		});
		// Nothing is in the air: no clone ever leaves the card.
		expect(clones()).toHaveLength(0);
		await act(async () => switching);
		await flush();
		expect(open().id).toBe(target.id);
		const party = [...document.querySelectorAll('[data-party-member]')];
		expect(party.length).toBeGreaterThan(0);
		expect(party.every((el) => animated.includes(el))).toBe(true);
		expect(hiddenMembers()).toHaveLength(0);
	});

	it('keeps every party member in its cell, including the one on the card', async () => {
		const team = open();
		const onCard = team.members.find((m) => m.uid === s().selectedUid);
		expect(onCard, 'a member is on the card').toBeTruthy();
		expect(document.querySelectorAll('[data-party-member]')).toHaveLength(team.members.length);
		expect(document.querySelector(`[data-party-member][data-species="${onCard!.species}"]`)).toBeTruthy();
	});

	it('shows the open team\'s icons in the team list too', () => {
		const team = open();
		const shown = [...document.querySelectorAll(`[data-team-icon^="${team.id}:"]`)].filter((el) => el.children.length > 0);
		expect(shown).toHaveLength(team.members.length);
	});

	it('drops no card in card view', async () => {
		await click(byLabel('Card view'));
		animated = [];
		const target = lib.teams[3];
		await act(async () => openTeamWithMotion(target.id));
		await flush();
		expect(open().id).toBe(target.id);
		expect(shards()).toHaveLength(0);
		expect(clones()).toHaveLength(0);
		expect([...document.querySelectorAll('[data-party-member]')].every((el) => animated.includes(el))).toBe(true);
	});

	it('selects a party member without the jump onto the card', async () => {
		await click(document.querySelector('[data-party-member][data-index="1"]')!);
		expect(clones()).toHaveLength(0);
		await flush();
		expect(s().selectedUid).toBe(open().members[1].uid);
		expect(document.querySelector<HTMLElement>('[data-card-sprite]')!.style.opacity).toBe('');
		const before = animations;
		await liftToCard('Pikachu', new DOMRect(0, 0, 32, 32), new DOMRect(0, 0, 96, 96));
		expect(animations).toBe(before);
	});
});

describe('the smaller moments', () => {
	it('lifts a party member onto the card and shows the card sprite afterwards', async () => {
		// The first member opens on the card; lift the second.
		await click(document.querySelector('[data-party-member][data-index="1"]')!);
		await flush();
		expect(s().selectedUid).toBe(open().members[1].uid);
		expect(document.querySelector<HTMLElement>('[data-card-sprite]')!.style.opacity).toBe('');
		expect(clones()).toHaveLength(0);
	});

	it('hops the sprite when evolving and swaps species mid-air', async () => {
		// The first member is already on the card.
		expect(s().selectedUid).toBe(open().members[0].uid);
		await click(button('Charmeleon'));
		await flush();
		expect(open().members[0].species).toBe('Charmeleon');
	});

	it('lands a picked value on its row with a pop and flies no chip', async () => {
		await click(document.querySelector('[data-party-member][data-index="1"]')!);
		await flush();
		await click(document.querySelector('[data-key-row="item"]')!);
		animated = [];
		await click(button(/^Light Ball/, byLabel('Inspector')));
		await wait(20);
		await flush();
		expect(open().members[1].item).toBe('Light Ball');
		expect(animated).toContain(document.querySelector('[data-key-row="item"]'));
		expect(clones()).toHaveLength(0);
	});

	it('pops a suggestion into its new party slot when its card is clicked', async () => {
		const before = open().members.length;
		animated = [];
		await click(allByName(/^Add .+ to the team$/)[0]);
		await wait(20);
		await flush();
		expect(open().members).toHaveLength(before + 1);
		expect(animated).toContain(document.querySelector(`[data-party-member][data-index="${before}"]`));
	});

	it('puffs six particles and clears them', async () => {
		act(() => poof(10, 10));
		expect(clones()).toHaveLength(6);
		await wait(350);
		expect(clones()).toHaveLength(0);
	});

	it('skips particles, pops and flights with reduced motion', async () => {
		setViewport({ reducedMotion: true });
		const before = animations;
		act(() => poof(10, 10));
		pop(document.body);
		landOn('body');
		await liftToCard('Pikachu', new DOMRect(0, 0, 32, 32), new DOMRect(0, 0, 96, 96));
		let swapped = false;
		await hopAndSwap(document.body, () => (swapped = true));
		expect(swapped).toBe(true);
		expect(clones()).toHaveLength(0);
		expect(animations).toBe(before);
	});

	it('tolerates missing elements', async () => {
		expect(() => landOn('[data-nothing]')).not.toThrow();
		let swapped = false;
		await hopAndSwap(null, () => (swapped = true));
		expect(swapped).toBe(true);
		expect(() => pop(null)).not.toThrow();
	});
});
