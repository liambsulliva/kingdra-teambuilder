import { NextResponse } from 'next/server';
import { rolesForSpecies } from '@/lib/roles';

// Smogon's curated sets, mirrored by pkmn. Roles are derived from set names
// and contents, so they are broad labels rather than recommended sets.
const SETS_URL = (format: string) => `https://pkmn.github.io/smogon/data/sets/${format}.json`;

export async function GET(request: Request) {
	const format = new URL(request.url).searchParams.get('format') || 'gen9ou';
	if (!/^gen\d[a-z0-9]+$/.test(format)) {
		return NextResponse.json({ error: 'Unknown format' }, { status: 400 });
	}
	const res = await fetch(SETS_URL(format), { next: { revalidate: 60 * 60 * 24 } });
	if (!res.ok) return NextResponse.json({ roles: {} });
	const sets = (await res.json()) as Record<string, Record<string, never>>;
	const roles: Record<string, string[]> = {};
	for (const [species, bySet] of Object.entries(sets)) roles[species] = rolesForSpecies(bySet);
	return NextResponse.json(
		{ roles },
		{ headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } }
	);
}
