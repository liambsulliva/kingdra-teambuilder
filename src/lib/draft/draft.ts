import { Dex } from '@pkmn/dex';
import { newTeam, uid, type PokemonSet, type Team } from '../model';
import type { Draft, DraftSettings, League, RosterEntry, TierEntry } from './types';

/** Draft Mode supports Pokémon Champions formats only for now; the other draft formats stay in the dex for later. */
export const isSupported = (format: unknown): format is string => typeof format === 'string' && format.startsWith('gen9champions');
export const DEFAULT_FORMAT = 'gen9championsdraft';

/** The first value the sheet gives for a figure, preferring cells over prose. */
export const firstFound = (found: { value: number }[], fallback: number) => found[0]?.value ?? fallback;

/** The settings the dialog starts from for a freshly read league. */
export function defaultSettings(league: League, previous?: DraftSettings): DraftSettings {
	return {
		format: [previous?.format, league.rules.format].find(isSupported) ?? DEFAULT_FORMAT,
		points: firstFound(league.budget.points, 100),
		picks: firstFound(league.budget.picks, 11),
		coach: previous?.coach && league.coaches.some((c) => c.name === previous.coach) ? previous.coach : null,
	};
}

export const priceOf = (league: League, species: string): TierEntry | undefined => league.tiers.find((t) => t.species === species);

/**
 * Every Pokémon other coaches have drafted, with the coach. A sheet can list one Pokémon under two coaches;
 * when the user's own coach is one of them, the sheet says it is theirs, so it isn't taken.
 * Someone who isn't a coach in the league is only planning, so nothing is taken for them.
 */
export function takenBy(draft: Pick<Draft, 'league' | 'settings'>): Map<string, string> {
	if (!draft.settings.coach) return new Map();
	const mine = new Set(draft.league.coaches.find((c) => c.name === draft.settings.coach)?.picks.map((p) => p.species));
	const out = new Map<string, string>();
	for (const coach of draft.league.coaches) {
		if (coach.name === draft.settings.coach) continue;
		for (const pick of coach.picks) if (!mine.has(pick.species) && !out.has(pick.species)) out.set(pick.species, coach.name);
	}
	return out;
}

/** What a pick costs: its points on the board, or nothing once the board no longer lists it. */
export const costOf = (league: League, entry: Pick<RosterEntry, 'species'>) => priceOf(league, entry.species)?.points ?? 0;

export function balance(draft: Pick<Draft, 'league' | 'settings' | 'roster'>) {
	const points = draft.roster.reduce((sum, entry) => sum + costOf(draft.league, entry), 0);
	return {
		points,
		pointsLeft: draft.settings.points - points,
		picks: draft.roster.length,
		picksLeft: draft.settings.picks - draft.roster.length,
	};
}

export type PickState =
	| { ok: true; price: TierEntry }
	| { ok: false; reason: 'drafted' | 'banned' | 'unlisted' | 'taken' | 'full' | 'budget'; message: string; price?: TierEntry };

/** Whether the user can draft a species now, and if not, why. */
export function pickState(draft: Pick<Draft, 'league' | 'settings' | 'roster'>, species: string, taken = takenBy(draft)): PickState {
	const price = priceOf(draft.league, species);
	if (draft.roster.some((r) => r.species === species)) return { ok: false, reason: 'drafted', message: `${species} is on your roster`, price };
	if (draft.league.banned.includes(species)) return { ok: false, reason: 'banned', message: `${species} is banned in this league` };
	if (!price) return { ok: false, reason: 'unlisted', message: `${species} isn't on the draft board` };
	const coach = taken.get(species);
	if (coach) return { ok: false, reason: 'taken', message: `${coach} drafted ${species}`, price };
	const b = balance(draft);
	if (b.picksLeft <= 0) return { ok: false, reason: 'full', message: `Your roster is full at ${draft.settings.picks} picks`, price };
	if (price.points > b.pointsLeft) return { ok: false, reason: 'budget', message: `${species} costs ${price.points} pts and you have ${b.pointsLeft} left`, price };
	return { ok: true, price };
}

const species = (name: string) => Dex.species.get(name);

/** The species a pick puts on a team: a Mega goes on as its base form, holding its stone. */
export function teamSpecies(name: string) {
	const s = species(name);
	return s.isMega ? (s.battleOnly as string | undefined) ?? s.baseSpecies : s.name;
}

export const megaStone = (name: string) => {
	const s = species(name);
	return s.isMega ? (s.requiredItem ?? null) : null;
};

/** Roster entries that can go on a team as this species, leaving out any another coach has taken. */
export function entriesFor(draft: Pick<Draft, 'league' | 'settings' | 'roster'>, name: string, taken = takenBy(draft)) {
	return draft.roster.filter((r) => teamSpecies(r.species) === name && !taken.has(r.species));
}

/** Why a species can't join a draft team, or null when it can. */
export function teamRefusal(draft: Pick<Draft, 'league' | 'settings' | 'roster'>, name: string) {
	const taken = takenBy(draft);
	const resolved = species(name).exists ? species(name).name : name;
	if (entriesFor(draft, resolved, taken).length) return null;
	const own = draft.roster.find((r) => teamSpecies(r.species) === resolved);
	if (own) return `${taken.get(own.species)} drafted ${own.species}, so it can't go on a team`;
	return `${resolved} isn't on your roster. Draft it first`;
}

/** A new member for a rostered species. A Mega pick (with no base-form pick) holds its stone. */
export function rosterSet(draft: Pick<Draft, 'league' | 'settings' | 'roster'>, set: PokemonSet): PokemonSet {
	const entries = entriesFor(draft, set.species);
	if (!entries.length) return set;
	const base = entries.find((e) => !species(e.species).isMega);
	const mega = entries.find((e) => species(e.species).isMega);
	return { ...set, item: !base && mega ? (megaStone(mega.species) ?? set.item) : set.item };
}

/** Draft rules Showdown can't check, as legality problems by member. */
export function draftIssues(draft: Pick<Draft, 'league' | 'settings' | 'roster'>, team: Team): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	const taken = takenBy(draft);
	const add = (m: PokemonSet, problem: string) => (out[m.uid] ||= []).push(problem);
	for (const m of team.members) {
		const name = m.name || m.species;
		const entries = entriesFor(draft, m.species, taken);
		if (!entries.length) {
			add(m, teamRefusal(draft, m.species) ?? `${name} isn't on your roster`);
			continue;
		}
		const megaPick = entries.find((e) => species(e.species).isMega);
		const basePick = entries.find((e) => !species(e.species).isMega);
		const stone = Dex.items.get(m.item);
		// A base-form pick can't Mega Evolve unless the Mega was drafted too.
		if (stone.exists && stone.megaStone && !megaPick) {
			const megaName = Object.values(stone.megaStone as Record<string, string>)[0];
			if (megaName && teamSpecies(megaName) === m.species) add(m, `${name} holds ${stone.name}, but ${megaName} isn't on your roster`);
		}
		if (megaPick && !basePick && megaStone(megaPick.species) !== m.item)
			add(m, `${name} was drafted as ${megaPick.species}, so it must hold ${megaStone(megaPick.species)}`);
	}
	return out;
}

export interface Suggestion {
	/** Stable per line of the sheet, so a dismissal outlives a sync that doesn't change it. */
	key: string;
	/** The sheet's value for that line; a dismissal holds only while it matches. */
	value: string;
	kind: 'add' | 'release';
	species: string;
	message: string;
}

/** Where the user's roster differs from the sheet, as changes they can accept or dismiss. */
export function suggestions(draft: Draft): Suggestion[] {
	const out: Suggestion[] = [];
	const taken = takenBy(draft);
	const mine = draft.league.coaches.find((c) => c.name === draft.settings.coach);
	for (const entry of draft.roster) {
		const coach = taken.get(entry.species);
		if (coach) out.push({ key: `release:${entry.species}`, value: coach, kind: 'release', species: entry.species, message: `${coach} drafted ${entry.species}. Release it from your roster?` });
	}
	for (const pick of mine?.picks ?? []) {
		if (!draft.roster.some((r) => r.species === pick.species))
			out.push({ key: `add:${pick.species}`, value: '', kind: 'add', species: pick.species, message: `The sheet has ${pick.species} on your team. Add it to your roster?` });
	}
	return out.filter((s) => draft.dismissed[s.key] !== s.value);
}

/** The draft a confirmed setup starts, or the existing one re-read against a new sheet. Picks and teams are kept. */
export function startDraft(league: League, settings: DraftSettings, previous?: Draft): Draft {
	const format = settings.format;
	const teams = previous?.teams.length
		? previous.teams.map((t) => ({ ...t, mode: 'competitive' as const, gen: 9, format }))
		: [newTeam({ name: 'Week 1', format, gen: 9, mode: 'competitive' })];
	return {
		league,
		settings,
		roster: previous?.roster ?? [],
		teams,
		openTeamId: previous && teams.some((t) => t.id === previous.openTeamId) ? previous.openTeamId : teams[0].id,
		dismissed: previous?.dismissed ?? {},
	};
}

export const newRosterEntry = (species: string): RosterEntry => ({ uid: uid(), species });
