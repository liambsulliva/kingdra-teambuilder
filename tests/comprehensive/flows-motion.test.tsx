import { act } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { flyValue, hopAndSwap, liftToCard, openTeamWithMotion, poof, pop } from '@/components/motion/choreography';
import { newSet, newTeam, type Library } from '@/lib/model';
import { useStore } from '@/lib/store';
import { seedLocalLibrary, setViewport } from '../helpers/env';
import { button, byLabel, click, flush, renderApp, wait } from '../helpers/render';
import { buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
/** Animated clones are fixed, pointer-transparent and appended to <body>. */
const clones = () => [...document.body.children].filter((el) => (el as HTMLElement).style.position === 'fixed');
const hiddenMembers = () => [...document.querySelectorAll<HTMLElement>('[data-party-member], [data-team-icon]')].filter((el) => el.style.opacity === '0');

let stress: StressLibrary;
let lib: Library;
let animations: number;

beforeAll(async () => {
	stress = await buildStressLibrary();
});

beforeEach(async () => {
	// Real-looking boxes so the choreography measures, flies and lands things.
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(40, 40, 32, 32));
	animations = 0;
	const animate = Element.prototype.animate;
	vi.spyOn(Element.prototype, 'animate').mockImplementation(function (this: Element, ...args) {
		animations++;
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

	it('switches at once without animating on a phone or with reduced motion', async () => {
		setViewport({ reducedMotion: true });
		const before = animations;
		await act(async () => openTeamWithMotion(lib.teams[4].id));
		expect(open().id).toBe(lib.teams[4].id);
		expect(animations).toBe(before);
	});
});

describe('the smaller moments', () => {
	it('lifts a party member onto the card and shows the card sprite afterwards', async () => {
		await click(document.querySelector('[data-party-member][data-index="0"]')!);
		await flush();
		expect(s().selectedUid).toBe(open().members[0].uid);
		expect(document.querySelector<HTMLElement>('[data-card-sprite]')!.style.opacity).toBe('');
		expect(clones()).toHaveLength(0);
	});

	it('hops the sprite when evolving and swaps species mid-air', async () => {
		await click(document.querySelector('[data-party-member][data-index="0"]')!);
		await flush();
		await click(button('Charmeleon'));
		await flush();
		expect(open().members[0].species).toBe('Charmeleon');
	});

	it('flies a picked value to its row and cleans up the chip', async () => {
		await click(document.querySelector('[data-party-member][data-index="1"]')!);
		await flush();
		await click(document.querySelector('[data-key-row="item"]')!);
		await click(button(/^Light Ball/, byLabel('Inspector')));
		await wait(20);
		await flush();
		expect(open().members[1].item).toBe('Light Ball');
		expect(clones()).toHaveLength(0);
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
		await flyValue(document.body, 'body', 'x');
		await liftToCard('Pikachu', new DOMRect(0, 0, 32, 32), new DOMRect(0, 0, 96, 96));
		let swapped = false;
		await hopAndSwap(document.body, () => (swapped = true));
		expect(swapped).toBe(true);
		expect(clones()).toHaveLength(0);
		expect(animations).toBe(before);
	});

	it('tolerates missing elements', async () => {
		await expect(flyValue(null, '[data-nothing]', 'x')).resolves.toBeUndefined();
		let swapped = false;
		await hopAndSwap(null, () => (swapped = true));
		expect(swapped).toBe(true);
		expect(() => pop(null)).not.toThrow();
	});
});
