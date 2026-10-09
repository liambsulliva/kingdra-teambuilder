import { vi } from 'vitest';
import { emptyLibrary, type Library } from '@/lib/model';
import { useStore, type Store } from '@/lib/store';

/** What Clerk's useAuth reports. Flip `isSignedIn` and remount to sign in or out. */
export const auth = { isLoaded: true, isSignedIn: false };
(globalThis as unknown as { __auth: typeof auth }).__auth = auth;

/** Which media queries match. Defaults to a desktop that prefers reduced motion, so choreography resolves at once. */
export const viewport = { mobile: false, merged: false, reducedMotion: true };

const listeners = new Set<() => void>();

function matchMedia(query: string): MediaQueryList {
	const matches = () =>
		query.includes('prefers-reduced-motion')
			? viewport.reducedMotion
			: query.includes('max-width: 625px')
				? viewport.mobile
				: query.includes('min-width: 626px')
					? viewport.merged
					: false;
	return {
		get matches() {
			return matches();
		},
		media: query,
		onchange: null,
		addEventListener: (_: string, cb: () => void) => listeners.add(cb),
		removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
		addListener: (cb: () => void) => listeners.add(cb),
		removeListener: (cb: () => void) => listeners.delete(cb),
		dispatchEvent: () => true,
	} as unknown as MediaQueryList;
}

/** Change the viewport and tell every media-query subscriber. */
export function setViewport(next: Partial<typeof viewport>) {
	Object.assign(viewport, next);
	listeners.forEach((cb) => cb());
}

export type Handler = (url: URL, init?: RequestInit) => unknown | Promise<unknown>;
export interface FetchCall {
	url: string;
	method: string;
	body: unknown;
}

/** Every request the app made in this test, in order. */
export const fetchCalls: FetchCall[] = [];
let routes: [string, Handler][] = [];

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/** Answer requests whose URL contains a key with that handler. Return a Response for full control. */
export function mockApi(next: Record<string, Handler>) {
	routes = [...Object.entries(next), ...routes];
}

const DEFAULT_ROUTES: [string, Handler][] = [
	['/api/library', () => ({ library: null })],
	['/api/validate', () => ({ byMember: {}, team: [], count: 0 })],
	['/api/roles', () => ({ roles: {} })],
	['/api/sets', () => ({ sets: {} })],
	['/api/suggestions', () => ({ moves: [], source: 'none' })],
	['pokeapi.co', () => new Response('Not found', { status: 404 })],
];

async function fakeFetch(input: string | URL | Request, init?: RequestInit) {
	const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	const url = new URL(raw, 'http://localhost');
	const body = typeof init?.body === 'string' ? safeParse(init.body) : undefined;
	fetchCalls.push({ url: url.href, method: init?.method ?? 'GET', body });
	const route = [...routes, ...DEFAULT_ROUTES].find(([key]) => url.href.includes(key));
	if (!route) return new Response('No route', { status: 404 });
	const out = await route[1](url, init);
	return out instanceof Response ? out : json(out);
}

const safeParse = (s: string) => {
	try {
		return JSON.parse(s);
	} catch {
		return s;
	}
};

/** Clipboard writes land here; set `clipboard.fail` to make the next writes throw. */
export const clipboard = { text: '', fail: false };

const initialStore = useStore.getState();

/** Restore the store's first state, optionally with a library already loaded. */
export function resetStore(library: Library = emptyLibrary()) {
	useStore.setState({ ...initialStore, toasts: [], validation: {} } as Store, true);
	useStore.getState().hydrate(library);
}

/** Put a library in this browser's storage, as a returning guest would have it. */
export function seedLocalLibrary(library: Library) {
	localStorage.setItem('kingdra.library.v2', JSON.stringify(library));
}

export function resetEnv() {
	auth.isLoaded = true;
	auth.isSignedIn = false;
	Object.assign(viewport, { mobile: false, merged: false, reducedMotion: true });
	listeners.clear();
	routes = [];
	fetchCalls.length = 0;
	clipboard.text = '';
	clipboard.fail = false;
	localStorage.clear();
	delete document.documentElement.dataset.theme;
	vi.stubGlobal('matchMedia', matchMedia);
	vi.stubGlobal('fetch', vi.fn(fakeFetch));
	Object.defineProperty(navigator, 'clipboard', {
		configurable: true,
		value: {
			writeText: async (text: string) => {
				if (clipboard.fail) throw new Error('Clipboard blocked');
				clipboard.text = text;
			},
		},
	});
	resetStore();
}
