import { NextResponse } from 'next/server';

// Smogon's curated sets for one species, mirrored by pkmn.
const SETS_URL = (format: string) => `https://pkmn.github.io/smogon/data/sets/${format}.json`;

export async function GET(request: Request) {
	const params = new URL(request.url).searchParams;
	const format = params.get('format') || 'gen9ou';
	const species = params.get('species') || '';
	if (!/^gen\d[a-z0-9]+$/.test(format) || !species) {
		return NextResponse.json({ error: 'Unknown format or species' }, { status: 400 });
	}
	const res = await fetch(SETS_URL(format), { next: { revalidate: 60 * 60 * 24 } });
	if (!res.ok) return NextResponse.json({ sets: {} });
	const all = (await res.json()) as Record<string, Record<string, unknown>>;
	return NextResponse.json({ sets: all[species] ?? {} });
}
