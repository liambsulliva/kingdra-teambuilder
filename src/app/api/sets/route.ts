import { NextResponse } from 'next/server';
import { CACHE_HEADERS, FORMAT_ID, SETS_URL, smogonJson } from '@/lib/smogon';

// Smogon's curated sets for one species.
export async function GET(request: Request) {
	const params = new URL(request.url).searchParams;
	const format = params.get('format') || 'gen9ou';
	const species = params.get('species') || '';
	if (!FORMAT_ID.test(format) || !species) {
		return NextResponse.json({ error: 'Unknown format or species' }, { status: 400 });
	}
	const all = await smogonJson<Record<string, Record<string, unknown>>>(SETS_URL(format));
	if (!all) return NextResponse.json({ sets: {} });
	return NextResponse.json({ sets: all[species] ?? {} }, { headers: CACHE_HEADERS });
}
