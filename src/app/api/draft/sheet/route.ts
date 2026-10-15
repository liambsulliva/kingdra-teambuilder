import { NextResponse } from 'next/server';
import { googleSheetId, parseLeague } from '@/lib/draft/league';
import type { League } from '@/lib/draft/types';

/** A sheet is fetched from Google at most once a minute, however many viewers sync it. */
const FRESH_MS = 60_000;
const MAX_BYTES = 10 * 1024 * 1024;
const cache = new Map<string, { at: number; league: League }>();

const NOT_SHARED =
	"Kingdra can't open this sheet. In Google Sheets, open Share and set General access to Anyone with the link, then try again.";

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** The file name Google gives the export, which is the sheet's title. */
function titleFrom(disposition: string | null) {
	const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition ?? '')?.[1];
	const plain = /filename="([^"]+)"/i.exec(disposition ?? '')?.[1];
	const name = star ? decodeURIComponent(star) : (plain ?? '');
	return name.replace(/\.xlsx$/i, '').trim();
}

/** GET ?sheet=<Google Sheets link or id>: the league in that sheet, read live. */
export async function GET(request: Request) {
	const link = new URL(request.url).searchParams.get('sheet') ?? '';
	const id = googleSheetId(link);
	if (!id) return fail("That isn't a Google Sheets link. Copy the link from the sheet's address bar or its Share dialog.");
	const hit = cache.get(id);
	if (hit && Date.now() - hit.at < FRESH_MS) return NextResponse.json({ league: hit.league });
	let res: Response;
	try {
		res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`, { redirect: 'follow', cache: 'no-store' });
	} catch {
		return fail("Kingdra couldn't reach Google Sheets. Check your connection and try again.", 502);
	}
	// A private sheet answers with a sign-in page, not an error status.
	if (!res.ok || !(res.headers.get('content-type') ?? '').includes('spreadsheetml')) return fail(NOT_SHARED, res.status === 404 ? 404 : 403);
	const buf = Buffer.from(await res.arrayBuffer());
	if (buf.length > MAX_BYTES) return fail('This sheet is over 10 MB, which is more than Kingdra reads.', 413);
	try {
		const league = parseLeague(buf, { kind: 'google', sheetId: id, url: `https://docs.google.com/spreadsheets/d/${id}` }, titleFrom(res.headers.get('content-disposition')));
		cache.set(id, { at: Date.now(), league });
		return NextResponse.json({ league });
	} catch (error) {
		return fail(error instanceof Error ? error.message : "Kingdra couldn't read this sheet.", 422);
	}
}

/** POST a form with an .xlsx `file`: the league in that file, read once. */
export async function POST(request: Request) {
	let file: FormDataEntryValue | null;
	try {
		file = (await request.formData()).get('file');
	} catch {
		return fail('Choose an .xlsx file to upload.');
	}
	if (!file || typeof file === 'string') return fail('Choose an .xlsx file to upload.');
	if (file.size > MAX_BYTES) return fail('This file is over 10 MB, which is more than Kingdra reads.', 413);
	try {
		const name = file.name || 'league.xlsx';
		const league = parseLeague(Buffer.from(await file.arrayBuffer()), { kind: 'file', name }, name.replace(/\.xlsx$/i, '').trim());
		return NextResponse.json({ league });
	} catch (error) {
		return fail(error instanceof Error ? error.message : "Kingdra couldn't read this file.", 422);
	}
}
