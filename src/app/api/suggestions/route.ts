import { NextResponse } from 'next/server';
import { CACHE_HEADERS, FORMAT_ID, SETS_URL, STATS_URL, smogonJson } from '@/lib/smogon';

// Suggested moves for one species in one format, the way Showdown's
// teambuilder surfaces viable moves first: Smogon usage stats plus the moves
// in Smogon's curated sets, both mirrored by pkmn.
interface UsageStats {
	pokemon: Record<string, { moves?: Record<string, number> }>;
}
type Sets = Record<string, Record<string, { moves?: (string | string[])[] }>>;

/** Moves used by at least this share of the species' teams count as suggested. */
const MIN_USAGE = 0.05;

export async function GET(request: Request) {
	const params = new URL(request.url).searchParams;
	const format = params.get('format') || 'gen9ou';
	const species = params.get('species') || '';
	if (!FORMAT_ID.test(format) || !species) {
		return NextResponse.json(
			{ error: 'Unknown format or species' },
			{ status: 400 }
		);
	}
	const [stats, sets] = await Promise.all([
		smogonJson<UsageStats>(STATS_URL(format)),
		smogonJson<Sets>(SETS_URL(format)),
	]);
	const usage = stats?.pokemon[species]?.moves ?? {};
	const inSets = new Set(
		Object.values(sets?.[species] ?? {}).flatMap((s) => (s.moves ?? []).flat())
	);
	const moves = new Map<string, number>();
	for (const [name, share] of Object.entries(usage))
		if (name !== 'Nothing' && (share >= MIN_USAGE || inSets.has(name)))
			moves.set(name, share);
	for (const name of inSets) if (!moves.has(name)) moves.set(name, 0);
	return NextResponse.json(
		{
			moves: [...moves.entries()]
				.sort((a, b) => b[1] - a[1])
				.map(([name, share]) => ({
					name,
					usage: Math.round(share * 1000) / 10,
				})),
			source: stats ? 'usage' : inSets.size ? 'sets' : 'none',
		},
		{ headers: CACHE_HEADERS }
	);
}
