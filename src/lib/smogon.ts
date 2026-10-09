// Smogon data mirrored by pkmn: curated sets and usage stats per format.
export const SETS_URL = (format: string) => `https://pkmn.github.io/smogon/data/sets/${format}.json`;
export const STATS_URL = (format: string) => `https://pkmn.github.io/smogon/data/stats/${format}.json`;

export const FORMAT_ID = /^gen\d[a-z0-9]+$/;

/** Browsers keep an answer for an hour; the CDN for a day, serving a stale one for a week while it refreshes. */
export const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' };

// Parsed copies stay in memory for a few hours, so a warm server parses each
// file once instead of on every request. Usage files are several MB, over
// Next's fetch-cache limit, so they are not fetched through it.
export const TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: Promise<unknown> }>();

/** The parsed JSON at `url`, or null when it is missing. A failure is not remembered. */
export function smogonJson<T>(url: string): Promise<T | null> {
	const hit = cache.get(url);
	if (hit && Date.now() - hit.at < TTL) return hit.data as Promise<T | null>;
	const data = fetch(url, { cache: 'no-store' }).then((r) => {
		if (r.ok) return r.json();
		if (r.status === 404) return null;
		throw new Error(`${url}: ${r.status}`);
	});
	const entry = { at: Date.now(), data };
	cache.set(url, entry);
	return data.catch(() => {
		if (cache.get(url) === entry) cache.delete(url);
		return null;
	}) as Promise<T | null>;
}


const rolesCache = new Map<string, { at: number; roles: Record<string, string[]> }>();

/** Roles per species in a format, worked out once per format while the server is warm. */
export async function rolesByFormat(format: string, derive: (sets: Record<string, Record<string, never>>) => Record<string, string[]>) {
	const hit = rolesCache.get(format);
	if (hit && Date.now() - hit.at < TTL) return hit.roles;
	const sets = await smogonJson<Record<string, Record<string, never>>>(SETS_URL(format));
	if (!sets) return null;
	const roles = derive(sets);
	rolesCache.set(format, { at: Date.now(), roles });
	return roles;
}

/** Forget every cached file and derived answer. Tests start each case cold. */
export function clearSmogonCache() {
	cache.clear();
	rolesCache.clear();
}
