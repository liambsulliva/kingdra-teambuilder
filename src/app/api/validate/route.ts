import { NextResponse } from 'next/server';
import { TeamValidator } from '@pkmn/sim';
import type { PokemonSet } from '@/lib/model';

interface Body {
	format: string;
	members: PokemonSet[];
}

/** Runs Showdown's own validator and attributes each problem to a member. */
export async function POST(request: Request) {
	const { format, members } = (await request.json()) as Body;
	if (!/^gen\d[a-z0-9]+$/.test(format) || !Array.isArray(members)) {
		return NextResponse.json({ error: 'Bad request' }, { status: 400 });
	}
	let validator: TeamValidator;
	try {
		validator = TeamValidator.get(format);
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
