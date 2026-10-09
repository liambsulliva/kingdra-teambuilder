import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { emptyLibrary, newTeam, type Library } from '../model';
import { usePersistence } from '../hooks';
import { useStore } from '../store';

const auth = vi.hoisted(() => ({ isLoaded: true, isSignedIn: false }));
vi.mock('@clerk/nextjs', () => ({ useAuth: () => auth }));

const LOCAL_KEY = 'kingdra.library.v2';
const names = () => useStore.getState().library.teams.map((t) => t.name);
const stored = () => (JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null') as Library | null)?.teams.map((t) => t.name) ?? [];
const flush = async () => {
	for (let i = 0; i < 5; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
};

let container: HTMLDivElement;
let root: Root;
let cloud: Library;
let saved: Library[];

function Probe() {
	usePersistence();
	return null;
}
const mount = () => act(() => root.render(<Probe />));

beforeEach(() => {
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
	localStorage.clear();
	auth.isSignedIn = false;
	useStore.setState({ hydrated: false });
	cloud = { ...emptyLibrary(), teams: [newTeam({ name: 'Account team' })] };
	saved = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (_url: string, init?: RequestInit) => {
			if (init?.method === 'PUT') {
				saved.push(JSON.parse(String(init.body)).library);
				return new Response(JSON.stringify({ updatedAt: Date.now() }), { status: 200 });
			}
			return new Response(JSON.stringify({ library: cloud }), { status: 200 });
		})
	);
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.unstubAllGlobals();
});

describe('guest and account libraries stay apart', () => {
	it('signs in, keeps guest teams, and does not leave account teams behind on sign-out', async () => {
		mount();
		await flush();
		act(() => useStore.getState().createTeam({ name: 'Guest team' }));
		act(() => useStore.getState().addMember('Garchomp'));
		await flush();
		expect(stored()).toContain('Guest team');

		auth.isSignedIn = true;
		mount();
		await flush();
		expect(names()).toEqual(expect.arrayContaining(['Account team', 'Guest team']));

		act(() => useStore.getState().createTeam({ name: 'Signed-in team' }));
		// Cloud saves wait 800 ms after the last change.
		await act(async () => new Promise((r) => setTimeout(r, 900)));
		expect(saved.at(-1)?.teams.map((t) => t.name)).toContain('Signed-in team');
		expect(stored()).not.toContain('Signed-in team');

		auth.isSignedIn = false;
		mount();
		await flush();
		expect(names()).not.toContain('Account team');
		expect(names()).not.toContain('Signed-in team');
		expect(stored()).not.toContain('Account team');
	});

	it('does not save over the account when the account library fails to load', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url: string, init?: RequestInit) => {
				if (init?.method === 'PUT') return new Response('{}', { status: 200 });
				return new Response('{}', { status: 500 });
			})
		);
		localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...emptyLibrary(), teams: [newTeam({ name: 'Local only' })] }));
		auth.isSignedIn = true;
		mount();
		await flush();
		act(() => useStore.getState().createTeam({ name: 'Edited while offline' }));
		await act(async () => new Promise((r) => setTimeout(r, 900)));
		expect((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.some((c) => (c[1] as RequestInit | undefined)?.method === 'PUT')).toBe(false);
	});
});
