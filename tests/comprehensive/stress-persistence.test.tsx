import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { usePersistence } from '@/lib/hooks';
import { emptyLibrary, newSet, newTeam, normalizeLibrary, type Library } from '@/lib/model';
import { useStore } from '@/lib/store';
import { auth, fetchCalls, mockApi, seedLocalLibrary, setViewport } from '../helpers/env';
import { flush, hasText, render, renderApp, wait, waitFor } from '../helpers/render';
import { buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';

// The account library lives in this fake MongoDB document; /api/library is the real route.
const db = vi.hoisted(() => ({ doc: null as { library?: unknown } | null, puts: 0 }));
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }));
vi.mock('@/lib/db', () => ({
	default: async () => undefined,
	User: {
		findOne: () => ({ lean: async () => db.doc }),
		updateOne: async (_q: unknown, update: { $set: { library: unknown } }) => {
			db.puts++;
			db.doc = { ...(db.doc ?? {}), ...update.$set };
		},
	},
}));
import * as route from '@/app/api/library/route';

const LOCAL_KEY = 'kingdra.library.v2';
const GUEST_KEY = 'kingdra.guest-unsynced';
const s = () => useStore.getState();
const stored = () => JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null') as Library | null;
const cloud = () => (db.doc?.library ?? null) as Library | null;
const names = (lib: Library | null) => lib?.teams.map((t) => t.name) ?? [];
const puts = () => fetchCalls.filter((c) => c.method === 'PUT');

function Probe() {
	usePersistence();
	return null;
}
const mount = async () => {
	const m = render(<Probe />);
	await flush();
	return m;
};

let stress: StressLibrary;
beforeAll(async () => {
	stress = await buildStressLibrary();
});

beforeEach(() => {
	db.doc = null;
	db.puts = 0;
	useStore.setState({ hydrated: false });
	mockApi({
		'/api/library': (_url, init) =>
			init?.method === 'PUT'
				? route.PUT(new Request('http://localhost/api/library', { method: 'PUT', body: init.body as string }))
				: route.GET(),
	});
});

describe('guest library in this browser', () => {
	it('loads all 32 teams and 100 boxed Pokémon exactly as saved', async () => {
		seedLocalLibrary(stress.library);
		await mount();
		expect(s().hydrated).toBe(true);
		expect(s().save).toBe('local');
		expect(s().library).toEqual(stress.library);
	});

	it('autosaves every edit to this browser and marks it as unsynced guest work', async () => {
		seedLocalLibrary(stress.library);
		await mount();
		s().renameTeam(s().library.teams[5].id, 'Edited offline');
		s().storeInBox(s().library.teams[0].members[0].uid);
		await wait(300);
		expect(stored()!.teams[5].name).toBe('Edited offline');
		expect(stored()!.boxes.flatMap((b) => b.slots).filter(Boolean)).toHaveLength(101);
		expect(localStorage.getItem(GUEST_KEY)).toBe('1');
		expect(puts()).toHaveLength(0);
	});

	it('survives a reload with every change', async () => {
		seedLocalLibrary(stress.library);
		const first = await mount();
		s().duplicateTeam(s().library.teams[3].id);
		await flush();
		const before = s().library;
		first.unmount();
		useStore.setState({ hydrated: false, library: emptyLibrary() });
		await mount();
		expect(s().library).toEqual(normalizeLibrary(before));
		expect(s().library.teams).toHaveLength(33);
	});

	it('loads before Clerk has, and Clerk arriving does not reload it', async () => {
		seedLocalLibrary(stress.library);
		auth.isLoaded = false;
		const m = await mount();
		expect(s().hydrated).toBe(true);
		expect(s().library).toEqual(stress.library);
		const loaded = s().library;
		auth.isLoaded = true;
		m.rerender(<Probe />);
		await flush();
		expect(s().library).toBe(loaded);
		expect(fetchCalls).toHaveLength(0);
	});

	it('writes a burst of edits to storage once', async () => {
		seedLocalLibrary(stress.library);
		await mount();
		const setItem = vi.spyOn(Storage.prototype, 'setItem');
		try {
			for (let i = 0; i < 20; i++) s().renameTeam(s().library.teams[0].id, `Rename ${i}`);
			await wait(300);
			expect(setItem.mock.calls.filter(([k]) => k === LOCAL_KEY)).toHaveLength(1);
			expect(stored()!.teams[0].name).toBe('Rename 19');
		} finally {
			setItem.mockRestore();
		}
	});

	it('writes a waiting save when the page is hidden', async () => {
		seedLocalLibrary(stress.library);
		await mount();
		s().renameTeam(s().library.teams[0].id, 'Before close');
		window.dispatchEvent(new Event('pagehide'));
		expect(stored()!.teams[0].name).toBe('Before close');
	});

	it('starts fresh when the saved copy is corrupt', async () => {
		localStorage.setItem(LOCAL_KEY, '{"teams": [ broken');
		await mount();
		expect(names(s().library)).toEqual(['Team 1']);
	});

	it('keeps working in memory when browser storage is full', async () => {
		await mount();
		const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		});
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			s().createTeam({ name: 'No room' });
			await wait(300);
			expect(names(s().library)).toContain('No room');
			expect(s().save).toBe('error');
		} finally {
			setItem.mockRestore();
			errors.mockRestore();
		}
	});
});

describe('signed-in account library', () => {
	it('loads the account library and saves it back unchanged', async () => {
		db.doc = { library: clone(stress.library) };
		auth.isSignedIn = true;
		await mount();
		expect(s().save).toBe('saved');
		expect(s().library.teams).toEqual(stress.library.teams);
		expect(s().library.boxes).toEqual(stress.library.boxes);
		expect(cloud()!.teams).toEqual(stress.library.teams);
	});

	it('appends guest teams with Pokémon on sign-in, then clears this browser', async () => {
		db.doc = { library: clone(stress.library) };
		const guest = { ...emptyLibrary(), teams: [newTeam({ name: 'Guest party', members: [newSet('Pikachu')] }), newTeam({ name: 'Guest empty' })] };
		seedLocalLibrary(guest);
		localStorage.setItem(GUEST_KEY, '1');
		auth.isSignedIn = true;
		await mount();
		expect(names(s().library)).toEqual([...names(stress.library), 'Guest party']);
		expect(names(cloud())).toEqual([...names(stress.library), 'Guest party']);
		expect(localStorage.getItem(LOCAL_KEY)).toBeNull();
		expect(localStorage.getItem(GUEST_KEY)).toBeNull();
	});

	it('does not append a local copy that was never guest work', async () => {
		db.doc = { library: clone(stress.library) };
		seedLocalLibrary({ ...emptyLibrary(), teams: [newTeam({ name: 'Stale', members: [newSet('Mew')] })] });
		auth.isSignedIn = true;
		await mount();
		expect(names(s().library)).not.toContain('Stale');
	});

	it('gives a new account the guest library', async () => {
		seedLocalLibrary(stress.library);
		auth.isSignedIn = true;
		await mount();
		expect(names(cloud())).toEqual(names(stress.library));
	});

	it('does not write an unchanged account library back on load', async () => {
		db.doc = { library: clone(stress.library) };
		auth.isSignedIn = true;
		await mount();
		expect(s().save).toBe('saved');
		expect(puts()).toHaveLength(0);
	});

	it('loads a returning account before Clerk has', async () => {
		db.doc = { library: clone(stress.library) };
		localStorage.setItem('kingdra.account', '1');
		auth.isLoaded = false;
		auth.isSignedIn = false;
		await mount();
		expect(s().library.teams).toEqual(stress.library.teams);
		expect(s().save).toBe('saved');
	});

	it('forgets the account hint when Clerk reports signed out', async () => {
		db.doc = { library: clone(stress.library) };
		localStorage.setItem('kingdra.account', '1');
		await mount();
		expect(localStorage.getItem('kingdra.account')).toBeNull();
		expect(names(s().library)).toEqual(['Team 1']);
	});

	it('debounces edits into one save of the latest library', async () => {
		db.doc = { library: clone(stress.library) };
		auth.isSignedIn = true;
		await mount();
		const before = puts().length;
		await act(async () => {
			for (let i = 0; i < 10; i++) s().renameTeam(s().library.teams[0].id, `Rename ${i}`);
		});
		expect(s().save).toBe('saving');
		await wait(300);
		expect(puts().length).toBe(before);
		await wait(700);
		expect(puts().length).toBe(before + 1);
		expect(cloud()!.teams[0].name).toBe('Rename 9');
		expect(s().save).toBe('saved');
		expect(localStorage.getItem(LOCAL_KEY)).toBeNull();
	});

	it('reports a failed save', async () => {
		db.doc = { library: clone(stress.library) };
		auth.isSignedIn = true;
		await mount();
		mockApi({ '/api/library': (_u, init) => (init?.method === 'PUT' ? new Response('', { status: 500 }) : route.GET()) });
		s().createTeam({ name: 'Will fail' });
		await wait(900);
		expect(s().save).toBe('error');
	});

	it('never saves over the account when it could not be loaded', async () => {
		db.doc = { library: clone(stress.library) };
		mockApi({ '/api/library': (_u, init) => (init?.method === 'PUT' ? route.PUT(new Request('http://x', { method: 'PUT', body: init.body as string })) : new Response('', { status: 503 })) });
		auth.isSignedIn = true;
		await mount();
		expect(s().save).toBe('error');
		s().createTeam({ name: 'Offline edit' });
		await wait(900);
		expect(puts()).toHaveLength(0);
		expect(names(cloud())).toEqual(names(stress.library));
	});

	it('shows the save status in the header', async () => {
		db.doc = { library: clone(stress.library) };
		auth.isSignedIn = true;
		await renderApp();
		expect(hasText('Saved')).toBe(true);
		expect(document.querySelector('[data-testid="user-button"]')).toBeTruthy();
		s().createTeam({ name: 'Pending' });
		await flush(1);
		expect(hasText('Saving')).toBe(true);
		mockApi({ '/api/library': () => new Response('', { status: 500 }) });
		await wait(900);
		expect(hasText('Not saved')).toBe(true);
	});

	it('signing out shows the guest library, never the account', async () => {
		db.doc = { library: clone(stress.library) };
		auth.isSignedIn = true;
		const m = await mount();
		m.unmount();
		auth.isSignedIn = false;
		await mount();
		expect(names(s().library)).toEqual(['Team 1']);
		expect(stored()?.teams.map((t) => t.name) ?? []).not.toContain(stress.library.teams[0].name);
	});
});

describe('the save swim in the header', () => {
	const status = () => document.querySelector<HTMLElement>('header [aria-live]')!;
	const swim = () => document.querySelector<HTMLElement>('[data-save-swim]');
	const frame = () => Number(swim()!.dataset.saveSwim);
	const kingdraLeft = () => Number(/translate\((-?[\d.]+)px/.exec(document.querySelector<HTMLElement>('[data-kingdra]')!.style.transform)![1]);
	const bubbleRights = () => [...document.querySelectorAll<HTMLElement>('[data-bubble]')].map((b) => parseFloat(b.style.left) + parseFloat(b.style.width));

	beforeEach(() => setViewport({ reducedMotion: false }));

	it('swims two still frames after a guest save, bubbles only behind, then stops with no visible label', async () => {
		seedLocalLibrary(stress.library);
		await renderApp();
		expect(swim()).toBeNull();
		s().renameTeam(s().library.teams[1].id, 'Swim');
		await waitFor(() => expect(swim()).not.toBeNull());
		expect(frame()).toBe(0);
		// The label is only for screen readers while Kingdra swims.
		expect(status().querySelector('.sr-only')!.textContent).toBe('Saving');
		expect([...status().childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)).toHaveLength(0);
		const seen: number[] = [];
		while (swim()) {
			const f = frame();
			if (!seen.includes(f)) {
				seen.push(f);
				expect(document.querySelectorAll('[data-bubble]')).toHaveLength(Math.min(3, f + 1));
				for (const right of bubbleRights()) expect(right).toBeLessThan(kingdraLeft());
			}
			await wait(40);
		}
		// One frame at a time, no in-betweens, and it stops early: two frames for an instant save.
		expect(seen).toEqual([0, 1]);
		expect(hasText('Saved in this browser', status())).toBe(true);
	});

	it('keeps swimming while an account save is in flight, and stops at once on an error', async () => {
		db.doc = { library: clone(stress.library) };
		auth.isSignedIn = true;
		await renderApp();
		await waitFor(() => expect(swim()).toBeNull(), 4000);
		mockApi({ '/api/library': () => new Promise<Response>(() => {}) });
		s().createTeam({ name: 'Slow save' });
		await waitFor(() => expect(swim()).not.toBeNull());
		await wait(1300);
		// Past the two-frame minimum, and still saving: it swims on.
		expect(s().save).toBe('saving');
		expect(swim()).not.toBeNull();
		act(() => s().setSave('error'));
		await flush();
		expect(swim()).toBeNull();
		expect(hasText('Not saved', status())).toBe(true);
	});

	it('never swims with reduced motion', async () => {
		setViewport({ reducedMotion: true });
		seedLocalLibrary(stress.library);
		await renderApp();
		s().renameTeam(s().library.teams[1].id, 'Still');
		await wait(400);
		expect(stored()!.teams[1].name).toBe('Still');
		expect(swim()).toBeNull();
		expect(hasText('Saved in this browser', status())).toBe(true);
	});
});
