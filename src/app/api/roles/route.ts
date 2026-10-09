import { NextResponse } from 'next/server';
import { rolesForSpecies } from '@/lib/roles';
import { CACHE_HEADERS, FORMAT_ID, rolesByFormat } from '@/lib/smogon';

// Roles are derived from Smogon's set names and contents, so they are broad
// labels rather than recommended sets.
export async function GET(request: Request) {
	const format = new URL(request.url).searchParams.get('format') || 'gen9ou';
	if (!FORMAT_ID.test(format)) {
		return NextResponse.json({ error: 'Unknown format' }, { status: 400 });
	}
	const roles = await rolesByFormat(format, (sets) => {
		const out: Record<string, string[]> = {};
		for (const [species, bySet] of Object.entries(sets)) out[species] = rolesForSpecies(bySet);
		return out;
	});
	if (!roles) return NextResponse.json({ roles: {} });
	return NextResponse.json({ roles }, { headers: CACHE_HEADERS });
}
