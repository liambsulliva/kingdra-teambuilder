import { MAX_TEAM_SIZE, newTeam, normalizeSet, uid, type Team } from '../model';
import { DEFAULT_FORMAT, isSupported } from './draft';
import type { Draft, League, RosterEntry } from './types';

/** A saved draft, checked field by field. Null when it is unusable, which leaves the stock library alone. */
export function normalizeDraft(input: unknown): Draft | null {
	const d = input as Partial<Draft> | null;
	if (!d || typeof d !== 'object' || !d.league || !d.settings || !Array.isArray(d.league.tiers)) return null;
	// Only Champions is supported; a draft saved under another format moves to Champions Draft.
	const format = isSupported(d.settings.format) ? d.settings.format : DEFAULT_FORMAT;
	const teams: Team[] = (Array.isArray(d.teams) ? d.teams : [])
		.filter((t): t is Team => !!t && typeof t === 'object')
		.map((t) => ({
			...newTeam(),
			...t,
			mode: 'competitive' as const,
			gen: 9,
			format,
			members: (t.members || []).slice(0, MAX_TEAM_SIZE).map((m) => normalizeSet(m)),
		}));
	if (!teams.length) teams.push(newTeam({ name: 'Week 1', format, gen: 9, mode: 'competitive' }));
	return {
		league: d.league as League,
		settings: {
			format,
			points: Number(d.settings.points) || 0,
			picks: Number(d.settings.picks) || 0,
			coach: typeof d.settings.coach === 'string' ? d.settings.coach : null,
		},
		roster: (Array.isArray(d.roster) ? d.roster : [])
			.filter((r): r is RosterEntry => !!r && typeof r.species === 'string')
			.map((r) => ({ uid: r.uid || uid(), species: r.species })),
		teams,
		openTeamId: teams.some((t) => t.id === d.openTeamId) ? d.openTeamId! : teams[0].id,
		dismissed: d.dismissed && typeof d.dismissed === 'object' ? { ...d.dismissed } : {},
	};
}
