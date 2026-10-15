import type { Specie } from '@pkmn/data';
import { generationFor, typesForGen } from './dex';
import type { Team } from './model';
import { ROLES } from './roles';
import { SUPPORT } from './support';

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** What a carousel search asks for besides species names. */
export interface SearchTerms {
	roles: string[];
	types: string[];
	/** Ability ids. */
	abilities: ReadonlySet<string>;
	/** Move ids, from move names and support categories ("hazards" finds every hazard move). */
	moves: ReadonlySet<string>;
}

export const NO_TERMS: SearchTerms = { roles: [], types: [], abilities: new Set(), moves: new Set() };

/** Shorter queries match names only, so two letters do not pull in every move that starts with them. */
const MIN_TERM = 3;

/** The query starts the name or one of its words: "spikes" finds Toxic Spikes, "uturn" finds U-turn. */
const startsWord = (name: string, q: string) => toId(name).startsWith(toId(q)) || name.toLowerCase().split(/[\s-]+/).some((w) => w.startsWith(q));

/** Roles, types, abilities and moves the query names in the team's context. Roles exist only in Competitive. */
export function searchTerms(team: Pick<Team, 'mode' | 'gen' | 'format'>, query: string): SearchTerms {
	const q = query.trim().toLowerCase();
	if (toId(q).length < MIN_TERM) return NO_TERMS;
	const gen = generationFor(team);
	const moves = new Set([...gen.moves].filter((m) => startsWord(m.name, q)).map((m) => m.id as string));
	for (const g of SUPPORT) if (startsWord(g.name, q)) for (const m of g.moves) moves.add(toId(m));
	return {
		roles: team.mode === 'competitive' ? ROLES.filter((r) => startsWord(r, q)) : [],
		types: typesForGen(team.gen).filter((t) => startsWord(t, q)),
		abilities: new Set([...gen.abilities].filter((a) => startsWord(a.name, q)).map((a) => a.id as string)),
		moves,
	};
}

/** Does the species match a term? `roles` are its Smogon roles; `learns` its move ids, once the move index is ready. */
export function matchesTerms(s: Specie, terms: SearchTerms, roles: readonly string[] | undefined, learns: ReadonlySet<string> | undefined) {
	return (
		terms.types.some((t) => (s.types as readonly string[]).includes(t)) ||
		Object.values(s.abilities).some((a) => a && terms.abilities.has(toId(a))) ||
		terms.roles.some((r) => roles?.includes(r)) ||
		(!!learns && [...terms.moves].some((m) => learns.has(m)))
	);
}

/** Move ids for a support category, empty for 'All support'. */
export const supportMoveIds = (category: string) => SUPPORT.find((g) => g.name === category)?.moves.map(toId) ?? [];
