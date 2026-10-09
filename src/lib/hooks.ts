'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@clerk/nextjs';
import { emptyLibrary, normalizeLibrary, type Library, type Team } from './model';
import { useStore } from './store';

const LOCAL_KEY = 'kingdra.library.v2';
const GUEST_KEY = 'kingdra.guest-unsynced';

const readLocal = (): Library | null => {
	try {
		const raw = localStorage.getItem(LOCAL_KEY);
		return raw ? normalizeLibrary(JSON.parse(raw)) : null;
	} catch {
		return null;
	}
};

const writeLocal = (library: Library) => {
	try {
		localStorage.setItem(LOCAL_KEY, JSON.stringify(library));
	} catch {
		// Storage can be full or blocked; the cloud copy (if any) still saves.
	}
};

const putCloud = async (library: Library) => {
	const res = await fetch('/api/library', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ library }),
	});
	if (!res.ok) throw new Error(`Save failed (${res.status})`);
};

/**
 * Loads the library (local first, then the account), merges guest work into
 * the account on sign-in, and autosaves every change.
 */
export function usePersistence() {
	const { isLoaded, isSignedIn } = useAuth();
	const hydrate = useStore((s) => s.hydrate);
	const setSave = useStore((s) => s.setSave);
	const library = useStore((s) => s.library);
	const hydrated = useStore((s) => s.hydrated);
	const ready = useRef(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		if (!isLoaded) return;
		let cancelled = false;
		ready.current = false;
		(async () => {
			const local = readLocal();
			if (!isSignedIn) {
				hydrate(local ?? emptyLibrary());
				setSave('local');
				ready.current = true;
				return;
			}
			setSave('saving');
			try {
				const res = await fetch('/api/library');
				// A failed request must not read as "no library yet", or the local copy would be saved over the account.
				if (!res.ok) throw new Error(`Load failed (${res.status})`);
				const { library: cloud } = (await res.json()) as { library: Library | null };
				let merged = cloud ? normalizeLibrary(cloud) : (local ?? emptyLibrary());
				// Guest teams made before signing in are appended, never overwritten.
				if (cloud && local && localStorage.getItem(GUEST_KEY) === '1') {
					const ids = new Set(merged.teams.map((t) => t.id));
					const extra = local.teams.filter((t) => !ids.has(t.id) && t.members.length);
					merged = { ...merged, teams: [...merged.teams, ...extra] };
				}
				if (cancelled) return;
				hydrate(merged);
				await putCloud(merged);
				// The guest work is in the account now; keep none of it on this device.
				localStorage.removeItem(GUEST_KEY);
				localStorage.removeItem(LOCAL_KEY);
				setSave('saved');
			} catch {
				// Until the account loads, nothing is saved: an autosave now would overwrite the account.
				hydrate(local ?? emptyLibrary());
				setSave('error');
				return;
			}
			ready.current = true;
		})();
		return () => {
			cancelled = true;
		};
	}, [isLoaded, isSignedIn, hydrate, setSave]);

	useEffect(() => {
		if (!hydrated || !ready.current) return;
		// Only guest libraries live on this device. An account's library is never mirrored here, so signing out cannot show it.
		if (!isSignedIn) {
			writeLocal(library);
			localStorage.setItem(GUEST_KEY, '1');
			return;
		}
		clearTimeout(timer.current);
		setSave('saving');
		timer.current = setTimeout(() => {
			putCloud(library)
				.then(() => setSave('saved'))
				.catch(() => setSave('error'));
		}, 800);
		return () => clearTimeout(timer.current);
	}, [library, hydrated, isSignedIn, setSave]);
}

/** Debounced Showdown validation for competitive teams. */
export function useValidation(team: Team) {
	const setValidation = useStore((s) => s.setValidation);
	const key = JSON.stringify([team.format, team.mode, team.members]);
	useEffect(() => {
		if (team.mode !== 'competitive' || !team.members.length) {
			setValidation(team.id, { byMember: {}, team: [], count: 0 });
			return;
		}
		const controller = new AbortController();
		const t = setTimeout(async () => {
			try {
				const res = await fetch('/api/validate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ format: team.format, members: team.members }),
					signal: controller.signal,
				});
				if (res.ok) setValidation(team.id, await res.json());
			} catch {
				// Validation is advisory; a network failure leaves the last result.
			}
		}, 600);
		return () => {
			clearTimeout(t);
			controller.abort();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, team.id, setValidation]);
}

const roleCache = new Map<string, Promise<Record<string, string[]>>>();

export function useRoles(format: string | null) {
	const [roles, setRoles] = useState<Record<string, string[]>>({});
	useEffect(() => {
		if (!format) return setRoles({});
		if (!roleCache.has(format))
			roleCache.set(
				format,
				fetch(`/api/roles?format=${format}`)
					.then((r) => r.json())
					.then((j) => j.roles ?? {})
					.catch(() => ({}))
			);
		let live = true;
		roleCache.get(format)!.then((r) => live && setRoles(r));
		return () => {
			live = false;
		};
	}, [format]);
	return roles;
}

const queries = new Map<string, { subscribe: (cb: () => void) => () => void; get: () => boolean }>();
const mq = (query: string) => {
	if (!queries.has(query))
		queries.set(query, {
			subscribe: (cb) => {
				const m = window.matchMedia(query);
				m.addEventListener('change', cb);
				return () => m.removeEventListener('change', cb);
			},
			get: () => window.matchMedia(query).matches,
		});
	return queries.get(query)!;
};

export function useMediaQuery(query: string, server = false) {
	const { subscribe, get } = mq(query);
	return useSyncExternalStore(subscribe, get, () => server);
}

export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
