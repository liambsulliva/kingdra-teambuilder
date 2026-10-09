import { evTotal, learnableMoves } from './dex';
import { MAX_MOVES, type PokemonSet, type Team } from './model';

/** A one-field edit that clears a legality problem, with the lines that describe it. */
export interface PlannedFix {
	changes: string[];
	patch: Partial<PokemonSet>;
}

/**
 * Which kind of fix a validator message can take, or null when the problem
 * needs a decision (a species, an ability, a clause). Problems that share a
 * key share one fix. The validator attributes problems by species, so a
 * Pokémon of the same species can be named in one; each check confirms the
 * set really has the problem before a fix is offered.
 */
export function fixKeyFor(problem: string, member: PokemonSet): string | null {
	if (/has exactly 0 EVs/.test(problem) && evTotal(member) === 0) return 'evs';
	if (/has no moves/.test(problem) && member.moves.every((m) => !m))
		return 'moves';
	const learn = problem.match(/can't learn (.+)\.$/);
	if (learn && member.moves.includes(learn[1])) return `move:${learn[1]}`;
	if (
		member.item &&
		problem.includes(member.item) &&
		/\bitem\b/.test(problem) &&
		/does not exist|invalid item|is banned/.test(problem)
	)
		return 'item';
	return null;
}

/** The edit a fix would make, or null when there is nothing safe to change. */
export async function planFix(
	team: Team,
	member: PokemonSet,
	problem: string
): Promise<PlannedFix | null> {
	const key = fixKeyFor(problem, member);
	if (key === 'evs')
		return {
			changes: [`HP EVs: ${member.evs.hp} → 1`],
			patch: { evs: { ...member.evs, hp: 1 } },
		};
	if (key === 'moves') {
		const first = (await learnableMoves(team, member.species))[0];
		if (!first) return null;
		const moves = Array.from({ length: MAX_MOVES }, (_, i) =>
			i === 0 ? first.name : ''
		);
		return { changes: [`Move 1: empty → ${first.name}`], patch: { moves } };
	}
	if (key?.startsWith('move:')) {
		const move = key.slice('move:'.length);
		const slot = member.moves.indexOf(move);
		return {
			changes: [`Move ${slot + 1}: ${move} → empty`],
			patch: { moves: member.moves.map((m) => (m === move ? '' : m)) },
		};
	}
	if (key === 'item')
		return { changes: [`Item: ${member.item} → none`], patch: { item: '' } };
	return null;
}
