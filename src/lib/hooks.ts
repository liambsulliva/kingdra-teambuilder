'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@clerk/nextjs';
import { emptyLibrary, normalizeLibrary, type Library, type Team } from './model';
import { savedLibrary, useOpenTeam, useStore, type Validation } from './store';
import { MERGED_QUERY, MOBILE_QUERY } from './breakpoints';
import { cachedMoveIndex, moveIndex } from './dex';
import { draftIssues } from './draft/draft';

const LOCAL_KEY = 'kingdra.library.v2';
const GUEST_KEY = 'kingdra.guest-unsynced';
/** Set while Clerk last reported a signed-in user, so a reload can start loading the account before Clerk's script arrives. */
const ACCOUNT_KEY = 'kingdra.account';
/** Guest saves wait for a pause in editing (a slider drag is dozens of changes), then write once. */
const LOCAL_SAVE_DELAY = 250;
const CLOUD_SAVE_DELAY = 800;

const storage = {
	get: (key: string) => {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	set: (key: string, value: string) => {
		try {
			localStorage.setItem(key, value);
			return true;
		} catch {
			// Storage can be full or blocked.
			return false;
		}
	},
	remove: (key: string) => {
		try {
			localStorage.removeItem(key);
		} catch {}
	},
};

const readLocal = (): Library | null => {
	const raw = storage.get(LOCAL_KEY);
	if (!raw) return null;
	try {
		return normalizeLibrary(JSON.parse(raw));
	} catch {
		return null;
	}
};

const writeLocal = (library: Library) => storage.set(LOCAL_KEY, JSON.stringify(library)) && storage.set(GUEST_KEY, '1');

const putCloud = async (library: Library) => {
	const res = await fetch('/api/library', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ library }),
	});
	if (!res.ok) throw new Error(`Save failed (${res.status})`);
};

type Loaded = { ok: true; library: Library | null } | { ok: false; status: number };
const getCloud = (): Promise<Loaded> =>
	fetch('/api/library')
		.then(async (res) => (res.ok ? { ok: true as const, library: ((await res.json()) as { library: Library | null }).library } : { ok: false as const, status: res.status }))
		.catch(() => ({ ok: false as const, status: 0 }));

/**
 * Loads the library, merges guest work into the account on sign-in, and
 * autosaves every change.
 *
 * Guests never wait for Clerk: their library is in this browser and hydrates
 * on mount. A returning signed-in user (remembered in ACCOUNT_KEY) starts the
 * account fetch at once too; it only waits for Clerk when that early request
 * is turned away, as it is once the short-lived session cookie has expired.
 */
export function usePersistence() {
	const { isLoaded, isSignedIn } = useAuth();
	const hydrate = useStore((s) => s.hydrate);
	const setSave = useStore((s) => s.setSave);
	/** Whose library is loaded and autosaving. Null until one is loaded and safe to save over. */
	const mode = useRef<'guest' | 'account' | null>(null);
	/** Bumped by every load, so a slower, older one cannot land over it. */
	const attempt = useRef(0);
	const early = useRef<Promise<Loaded> | null>(null);
	/** Writes a save still waiting out its delay. */
	const flushSave = useRef(() => {});

	const loadGuest = () => {
		flushSave.current();
		attempt.current++;
		mode.current = null;
		hydrate(readLocal() ?? emptyLibrary());
		setSave('local');
		mode.current = 'guest';
	};

	const loadAccount = async (request: Promise<Loaded>) => {
		// Guest edits still waiting to be written must reach storage before the merge reads it.
		flushSave.current();
		const mine = ++attempt.current;
		mode.current = null;
		setSave('saving');
		const result = await request;
		if (mine !== attempt.current) return 'stale';
		if (!result.ok) return result.status;
		const local = readLocal();
		let library = result.library ?? local ?? emptyLibrary();
		// Guest teams made before signing in are appended, never overwritten.
		let changed = !result.library;
		if (result.library && local && storage.get(GUEST_KEY) === '1') {
			const ids = new Set(library.teams.map((t) => t.id));
			const extra = local.teams.filter((t) => !ids.has(t.id) && t.members.length);
			if (extra.length) {
				library = { ...library, teams: [...library.teams, ...extra] };
				changed = true;
			}
			// A draft set up as a guest joins an account that has none.
			if (!library.draft && local.draft) {
				library = { ...library, draft: local.draft };
				changed = true;
			}
		}
		hydrate(library);
		try {
			// Only write back what the account does not already hold.
			if (changed) await putCloud(library);
		} catch {
			if (mine === attempt.current) setSave('error');
			return 'stale';
		}
		if (mine !== attempt.current) return 'stale';
		// The guest work is in the account now; keep none of it on this device.
		storage.remove(GUEST_KEY);
		storage.remove(LOCAL_KEY);
		mode.current = 'account';
		// Edits made while the merge was saving still need saving.
		// Resuming Draft Mode rebuilds the object but changes nothing saved; only an edit moves updatedAt.
		const latest = savedLibrary(useStore.getState());
		if (latest === library || latest.updatedAt === library.updatedAt) setSave('saved');
		else
			putCloud(latest)
				.then(() => setSave('saved'))
				.catch(() => setSave('error'));
		return 'ok';
	};

	// Before Clerk: load whatever this browser can show without it.
	useEffect(() => {
		if (storage.get(ACCOUNT_KEY) === '1') {
			early.current = getCloud();
			void loadAccount(early.current);
		} else loadGuest();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Once Clerk knows who this is, correct course if the guess was wrong.
	useEffect(() => {
		if (!isLoaded) return;
		if (!isSignedIn) {
			storage.remove(ACCOUNT_KEY);
			if (mode.current !== 'guest') loadGuest();
			return;
		}
		storage.set(ACCOUNT_KEY, '1');
		if (mode.current === 'account') return;
		let cancelled = false;
		(async () => {
			// Reuse the early request while it is still on its way; ask again if it was refused.
			const wasEarly = !!early.current;
			const request = early.current ?? getCloud();
			early.current = null;
			let status = await loadAccount(request);
			if (wasEarly && status !== 'ok' && status !== 'stale' && !cancelled) status = await loadAccount(getCloud());
			if (cancelled || status === 'ok' || status === 'stale') return;
			// Until the account loads, nothing is saved: an autosave now would overwrite the account.
			hydrate(readLocal() ?? emptyLibrary());
			setSave('error');
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoaded, isSignedIn]);

	// Autosave outside React: subscribing to `library` here would re-render the whole app on every edit.
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		let pending: (() => void) | null = null;
		const flush = () => {
			clearTimeout(timer);
			const run = pending;
			pending = null;
			run?.();
		};
		const unsubscribe = useStore.subscribe((s, prev) => {
			if (s.library === prev.library || !s.hydrated || !mode.current) return;
			// Turning Draft Mode on or off swaps what is on screen without changing anything saved.
			if (s.draftMode !== prev.draftMode && s.library.updatedAt === prev.library.updatedAt) return;
			const library = savedLibrary(s);
			clearTimeout(timer);
			if (mode.current === 'guest') {
				// Only guest libraries live on this device. An account's library is never mirrored here, so signing out cannot show it.
				pending = () => {
					if (!writeLocal(library)) setSave('error');
					else {
						if (useStore.getState().save === 'error') setSave('local');
						useStore.getState().noteLocalWrite();
					}
				};
				timer = setTimeout(flush, LOCAL_SAVE_DELAY);
			} else {
				setSave('saving');
				pending = () =>
					putCloud(library)
						.then(() => setSave('saved'))
						.catch(() => setSave('error'));
				timer = setTimeout(flush, CLOUD_SAVE_DELAY);
			}
		});
		// A closing tab gets no more timers; write what is waiting now.
		flushSave.current = flush;
		const onHide = () => document.visibilityState === 'hidden' && flush();
		document.addEventListener('visibilitychange', onHide);
		window.addEventListener('pagehide', flush);
		return () => {
			unsubscribe();
			document.removeEventListener('visibilitychange', onHide);
			window.removeEventListener('pagehide', flush);
			flush();
		};
	}, [setSave]);
}

/** What a casual or empty team shows: one shared object, so the validation selector keeps its reference. */
export const NO_VALIDATION: Validation = Object.freeze({ byMember: Object.freeze({}), team: [], count: 0 }) as Validation;

/** Results by team contents, so switching back to a team or undoing an edit does not ask the server again. */
const validationCache = new Map<string, Validation>();
const VALIDATION_CACHE_SIZE = 64;

/** Adds the draft's own problems (roster, Mega Stones) to Showdown's. */
function withDraft(result: Validation, issues: Record<string, string[]> | null): Validation {
	if (!issues || !Object.keys(issues).length) return result;
	const byMember = { ...result.byMember };
	let count = result.count;
	for (const [id, problems] of Object.entries(issues)) {
		byMember[id] = [...(byMember[id] ?? []), ...problems];
		count += problems.length;
	}
	return { ...result, byMember, count };
}

/** Debounced Showdown validation for competitive teams. In Draft Mode it adds the league's rules and the draft's checks. */
export function useValidation(team: Team) {
	const setValidation = useStore((s) => s.setValidation);
	const draft = useStore((s) => (s.draftMode ? s.library.draft : undefined));
	const rules = draft?.league.rules.custom;
	const key = team.mode === 'competitive' && team.members.length ? JSON.stringify([team.format, team.members, rules ?? null]) : '';
	const issues = draft && key ? draftIssues(draft, team) : null;
	const issuesKey = issues ? JSON.stringify(issues) : '';
	useEffect(() => {
		const current = () => useStore.getState().validation[team.id];
		if (!key) {
			if (current() !== NO_VALIDATION) setValidation(team.id, NO_VALIDATION);
			return;
		}
		const cached = validationCache.get(key);
		if (cached) {
			const merged = withDraft(cached, issues);
			if (current() !== merged) setValidation(team.id, merged);
			return;
		}
		const controller = new AbortController();
		const t = setTimeout(async () => {
			try {
				const res = await fetch('/api/validate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(rules ? { format: team.format, members: team.members, rules } : { format: team.format, members: team.members }),
					signal: controller.signal,
				});
				if (!res.ok) return;
				const result = (await res.json()) as Validation;
				validationCache.delete(key);
				validationCache.set(key, result);
				if (validationCache.size > VALIDATION_CACHE_SIZE) validationCache.delete(validationCache.keys().next().value!);
				setValidation(team.id, withDraft(result, issues));
			} catch {
				// Validation is advisory; a network failure leaves the last result.
			}
		}, 600);
		return () => {
			clearTimeout(t);
			controller.abort();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, issuesKey, team.id, setValidation]);
}

/** Validates the open team. Its own leaf, so an edit re-renders this and not the app around it. */
export function OpenTeamValidation() {
	useValidation(useOpenTeam());
	return null;
}

/** Loads and autosaves the library. Its own leaf for the same reason. */
export function Persistence() {
	usePersistence();
	return null;
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

/** Every browsable species' move ids for the team's context, built on first use (null until then). */
export function useMoveIndex(team: Pick<Team, 'mode' | 'gen' | 'format'>, enabled: boolean) {
	const { mode, gen, format } = team;
	const ready = cachedMoveIndex({ mode, gen, format });
	const [, setLoaded] = useState(0);
	useEffect(() => {
		if (!enabled || ready) return;
		let live = true;
		moveIndex({ mode, gen, format })
			.then(() => live && setLoaded((n) => n + 1))
			.catch(() => undefined);
		return () => {
			live = false;
		};
	}, [enabled, ready, mode, gen, format]);
	return enabled ? ready : null;
}

/** Smogon suggestions by format and species, kept for the visit like the roles. */
const suggestionCache = new Map<string, Promise<ReadonlyMap<string, number>>>();
const suggestionDone = new Map<string, ReadonlyMap<string, number>>();
export const NO_SUGGESTIONS: ReadonlyMap<string, number> = new Map();

export const cachedSuggestions = (format: string, species: string) => suggestionDone.get(`${format}:${species}`) ?? null;

export function suggestionsFor(format: string, species: string) {
	const key = `${format}:${species}`;
	let pending = suggestionCache.get(key);
	if (!pending) {
		pending = fetch(`/api/suggestions?format=${format}&species=${encodeURIComponent(species)}`)
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
			.then((j: { moves: { name: string; usage: number }[] }) => {
				const map = new Map(j.moves.map((m) => [m.name, m.usage]));
				suggestionDone.set(key, map);
				return map;
			});
		// A failed request is not remembered, so the next visit asks again.
		pending.catch(() => suggestionCache.delete(key));
		suggestionCache.set(key, pending);
	}
	return pending;
}

/** Forget every remembered server answer. Tests start each case from a cold cache. */
export function clearRequestCaches() {
	roleCache.clear();
	suggestionCache.clear();
	suggestionDone.clear();
	validationCache.clear();
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

export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);
export const useIsMerged = () => useMediaQuery(MERGED_QUERY);
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
