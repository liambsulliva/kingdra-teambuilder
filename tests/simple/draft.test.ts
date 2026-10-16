import { describe, expect, it } from 'vitest';
import { acceptable, addRefusal, allSuggestions, balance, defaultSettings, isSupported, newRosterEntry, pickState, suggestions, teamRefusal } from '@/lib/draft/draft';
import { normalizeDraft } from '@/lib/draft/normalize';
import type { Draft, League } from '@/lib/draft/types';
import { useStore } from '@/lib/store';

const league = (over: Partial<League> = {}): League => ({
	source: { kind: 'file', name: 'league.xlsx' },
	title: 'League',
	syncedAt: 0,
	tiers: [
		{ species: 'Garchomp', points: 17 },
		{ species: 'Kingdra', points: 9 },
		{ species: 'Pelipper', points: 5 },
	],
	banned: [],
	complexBans: [],
	coaches: [
		{ name: 'Me', picks: [{ species: 'Kingdra' }, { species: 'Pelipper' }] },
		{ name: 'Rival', picks: [{ species: 'Garchomp' }] },
	],
	budget: { points: [{ value: 95, where: 'Data!B2' }], picks: [{ value: 11, where: 'Rules!A3' }] },
	rules: { format: 'gen9championsou', level: 50, custom: [], enforced: [], notEnforced: [] },
	unmatched: [],
	...over,
});

const draft = (over: Partial<Draft> = {}): Draft => ({
	league: league(),
	settings: { format: 'gen9championsdraft', points: 95, picks: 11, coach: 'Me' },
	roster: [],
	teams: [],
	openTeamId: '',
	dismissed: {},
	...over,
});

describe('draft mode supports Pokémon Champions OU only', () => {
	it('recognises Champions OU and nothing else', () => {
		expect(isSupported('gen9championsou')).toBe(true);
		expect(isSupported('gen9championsdraft')).toBe(false);
		expect(isSupported('gen9draft')).toBe(false);
		expect(isSupported('gen9ou')).toBe(false);
		expect(isSupported(undefined)).toBe(false);
	});

	it('always sets up Champions OU, whatever the Rules tab names', () => {
		expect(defaultSettings(league()).format).toBe('gen9championsou');
		expect(defaultSettings(league({ rules: { ...league().rules, format: 'gen9natdexdraft' } })).format).toBe('gen9championsou');
		expect(defaultSettings(league({ rules: { ...league().rules, format: null } })).format).toBe('gen9championsou');
	});

	it('moves a saved draft in another format onto Champions OU', () => {
		const saved = normalizeDraft({ ...draft(), settings: { ...draft().settings, format: 'gen9ou' }, teams: [{ id: 't', name: 'Week 1', members: [] }] });
		expect(saved?.settings.format).toBe('gen9championsou');
		expect(saved?.teams[0].format).toBe('gen9championsou');
	});
});

describe('draft mode has no Tera Captains or Tera Points', () => {
	it('drops captain fields and Tera Points from a saved draft', () => {
		const saved = normalizeDraft({
			...draft(),
			settings: { ...draft().settings, teraPoints: 30 },
			roster: [{ uid: 'a', species: 'Kingdra', captain: true, teraType: 'Water' }],
		});
		expect(saved?.settings).toEqual({ format: 'gen9championsou', points: 95, picks: 11, coach: 'Me' });
		expect(saved?.roster).toEqual([{ uid: 'a', species: 'Kingdra' }]);
	});

	it('charges each pick its board points', () => {
		const b = balance(draft({ roster: [newRosterEntry('Kingdra'), newRosterEntry('Pelipper')] }));
		expect(b).toEqual({ points: 14, pointsLeft: 81, picks: 2, picksLeft: 9 });
	});

	it('suggests only adding your sheet picks and releasing ones another coach took', () => {
		const list = suggestions(draft({ roster: [newRosterEntry('Kingdra'), newRosterEntry('Garchomp')] }));
		expect(list.map((s) => [s.kind, s.species])).toEqual([
			['release', 'Garchomp'],
			['add', 'Pelipper'],
		]);
	});
});

describe('coach selection', () => {
	it("makes other coaches' picks unassignable for a coach", () => {
		expect(pickState(draft(), 'Garchomp')).toMatchObject({ ok: false, reason: 'taken' });
		expect(teamRefusal(draft({ roster: [newRosterEntry('Garchomp')] }), 'Garchomp')).toBe("Rival drafted Garchomp, so it can't go on a team");
	});

	it("leaves every Pokémon assignable for someone who isn't a coach", () => {
		const planner = (over: Partial<Draft> = {}) => draft({ settings: { ...draft().settings, coach: null }, ...over });
		expect(pickState(planner(), 'Garchomp')).toMatchObject({ ok: true });
		expect(teamRefusal(planner({ roster: [newRosterEntry('Garchomp')] }), 'Garchomp')).toBeNull();
		expect(suggestions(planner({ roster: [newRosterEntry('Garchomp')] }))).toEqual([]);
	});
});

describe('suggested adds wait for the points', () => {
	const roster = (...species: string[]) => species.map(newRosterEntry);
	const withPoints = (points: number, over: Partial<Draft> = {}) => draft({ settings: { ...draft().settings, points }, ...over });

	it('says what an add costs and what is left when the points do not cover it', () => {
		expect(addRefusal(withPoints(12, { roster: roster('Pelipper') }), 'Kingdra')).toBe('Kingdra needs 9 pts. You have 7 pts left.');
	});

	it('lets an add through when its points exactly fit', () => {
		expect(addRefusal(withPoints(9), 'Kingdra')).toBeNull();
	});

	it('does not block a species the board does not price', () => {
		expect(addRefusal(withPoints(1), 'Unlisted')).toBeNull();
	});

	it('says 0 left, not a negative count, when the roster is already over budget', () => {
		expect(addRefusal(withPoints(10, { roster: roster('Garchomp') }), 'Kingdra')).toBe('Kingdra needs 9 pts. You have 0 pts left.');
	});

	it('takes every release, which refunds its points, then the adds that still fit in order', () => {
		// Garchomp is Rival's pick, so releasing it refunds 17 points before the adds are checked.
		const d = withPoints(20, { roster: roster('Garchomp') });
		expect(acceptable(d, suggestions(d)).map((s) => [s.kind, s.species])).toEqual([
			['release', 'Garchomp'],
			['add', 'Kingdra'],
			['add', 'Pelipper'],
		]);
	});

	it('skips an add that stops fitting once earlier adds take the points', () => {
		const d = withPoints(13);
		expect(acceptable(d, suggestions(d)).map((s) => [s.kind, s.species])).toEqual([['add', 'Kingdra']]);
	});

	it('accepts nothing when no add fits and nothing is released', () => {
		const d = withPoints(4);
		expect(acceptable(d, suggestions(d))).toEqual([]);
	});

	it('refuses an add in the store, with the reason as a toast, and leaves the roster alone', () => {
		useStore.setState({ library: { ...useStore.getState().library, draft: withPoints(8) } });
		useStore.getState().acceptSuggestion({ key: 'add:Kingdra', value: '', kind: 'add', species: 'Kingdra', message: '' });
		expect(useStore.getState().library.draft?.roster).toEqual([]);
		expect(useStore.getState().toasts.at(-1)?.message).toBe('Kingdra needs 9 pts. You have 8 pts left.');
	});

	it('accept all in the store adds only the picks that fit', () => {
		const d = withPoints(13);
		useStore.setState({ library: { ...useStore.getState().library, draft: d } });
		useStore.getState().acceptAllSuggestions(suggestions(d));
		expect(useStore.getState().library.draft?.roster.map((r) => r.species)).toEqual(['Kingdra']);
	});
});

describe('dismissed changes', () => {
	it('stay in every change but leave the waiting list', () => {
		const d = draft({ dismissed: { 'add:Kingdra': '' } });
		expect(allSuggestions(d).map((s) => s.key)).toEqual(['add:Kingdra', 'add:Pelipper']);
		expect(suggestions(d).map((s) => s.key)).toEqual(['add:Pelipper']);
	});

	it('come back when the sheet changes the line again', () => {
		const d = draft({ roster: [newRosterEntry('Garchomp')], dismissed: { 'release:Garchomp': 'Rival' } });
		const reassigned = { ...d, dismissed: { 'release:Garchomp': 'Someone else' } };
		expect(suggestions(d).map((s) => s.key)).not.toContain('release:Garchomp');
		expect(suggestions(reassigned).map((s) => s.key)).toContain('release:Garchomp');
	});
});
