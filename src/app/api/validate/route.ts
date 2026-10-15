import { NextResponse } from 'next/server';
// Upstream Pokémon Showdown: newer than @pkmn/sim and the only build with
// the Pokémon Champions formats.
import { Dex, TeamValidator } from 'pokemon-showdown';
import type { PokemonSet } from '@/lib/model';

interface Body {
	format: string;
	members: PokemonSet[];
	/** Showdown custom rules layered on the format, as a draft league sets them. */
	rules?: string[];
}

const withRules = new Map<string, ReturnType<typeof Dex.formats.get>>();

/**
 * The format with each custom rule Showdown accepts. Showdown refuses a whole rule list over one rule it
 * already has ("OHKO Clause" in a format that includes it) or doesn't know, so rules join one at a time.
 */
function formatWith(format: string, rules: string[]) {
	const key = `${format}@@@${rules.join(',')}`;
	let out = withRules.get(key);
	if (out) return out;
	const accepted: string[] = [];
	out = Dex.formats.get(format, true);
	for (const rule of rules) {
		try {
			const next = Dex.formats.get(`${format}@@@${[...accepted, rule].join(',')}`, true);
			Dex.formats.getRuleTable(next);
			accepted.push(rule);
			out = next;
		} catch {}
	}
	if (withRules.size > 50) withRules.clear();
	withRules.set(key, out);
	return out;
}

/** Runs Showdown's own validator and attributes each problem to a member. */
export async function POST(request: Request) {
	const { format, members, rules } = (await request.json()) as Body;
	if (!/^gen\d[a-z0-9]+$/.test(format) || !Array.isArray(members)) {
		return NextResponse.json({ error: 'Bad request' }, { status: 400 });
	}
	let validator: ReturnType<typeof TeamValidator.get>;
	try {
		validator = Array.isArray(rules) && rules.length
			? TeamValidator.get(formatWith(format, rules.filter((r) => typeof r === 'string' && r.length < 80 && !/@@@|,/.test(r)).slice(0, 200)))
			: TeamValidator.get(format);
	} catch {
		return NextResponse.json({ error: `Unknown format ${format}` }, { status: 400 });
	}
	const sets = members.map((m) => ({ ...m, name: m.name || m.species, moves: m.moves.filter(Boolean) }));
	const problems = validator.validateTeam(sets as never, { removeNicknames: false }) || [];
	const byMember: Record<string, string[]> = {};
	const team: string[] = [];
	for (const problem of problems) {
		const owner = members.find((m) => problem.startsWith(`${m.name || m.species}`) || problem.includes(`${m.species}`));
		if (owner) (byMember[owner.uid] ||= []).push(problem);
		else team.push(problem);
	}
	return NextResponse.json({ byMember, team, count: problems.length });
}
