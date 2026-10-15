import type { League } from './types';

async function read(res: Promise<Response>): Promise<League> {
	let reply: Response;
	try {
		reply = await res;
	} catch {
		throw new Error("Kingdra couldn't reach its server. Check your connection and try again.");
	}
	const body = (await reply.json().catch(() => ({}))) as { league?: League; error?: string };
	if (!reply.ok || !body.league) throw new Error(body.error ?? "Kingdra couldn't read this sheet.");
	return body.league;
}

/** The league in a shared Google Sheet, read through Kingdra's server (Google allows no browser reads). */
export const fetchLeague = (sheet: string) => read(fetch(`/api/draft/sheet?sheet=${encodeURIComponent(sheet)}`, { cache: 'no-store' }));

/** The league in an uploaded .xlsx file. It is read once and never changes. */
export function uploadLeague(file: File) {
	const form = new FormData();
	form.append('file', file);
	return read(fetch('/api/draft/sheet', { method: 'POST', body: form }));
}
