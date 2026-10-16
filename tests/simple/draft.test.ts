import { describe, expect, it } from 'vitest';
import { balance, defaultSettings, isSupported, newRosterEntry, pickState, suggestions, teamRefusal } from '@/lib/draft/draft';
import { normalizeDraft } from '@/lib/draft/normalize';
import type { Draft, League } from '@/lib/draft/types';

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

describe('draft mode supports Pokémon Champions only', () => {
	it('recognises Champions formats and nothing else', () => {
		expect(isSupported('gen9championsdraft')).toBe(true);
		expect(isSupported('gen9championsnatdexdraft')).toBe(true);
		expect(isSupported('gen9draft')).toBe(false);
		expect(isSupported('gen9ou')).toBe(false);
		expect(isSupported(undefined)).toBe(false);
	});

	it('takes the Rules tab format when it is Champions, else falls back to Champions Draft', () => {
		expect(defaultSettings(league()).format).toBe('gen9championsou');
		expect(defaultSettings(league({ rules: { ...league().rules, format: 'gen9natdexdraft' } })).format).toBe('gen9championsdraft');
		expect(defaultSettings(league({ rules: { ...league().rules, format: null } })).format).toBe('gen9championsdraft');
	});

	it('moves a saved draft in another format onto Champions Draft', () => {
		const saved = normalizeDraft({ ...draft(), settings: { ...draft().settings, format: 'gen9ou' }, teams: [{ id: 't', name: 'Week 1', members: [] }] });
		expect(saved?.settings.format).toBe('gen9championsdraft');
		expect(saved?.teams[0].format).toBe('gen9championsdraft');
	});
});

describe('draft mode has no Tera Captains or Tera Points', () => {
	it('drops captain fields and Tera Points from a saved draft', () => {
		const saved = normalizeDraft({
			...draft(),
			settings: { ...draft().settings, teraPoints: 30 },
			roster: [{ uid: 'a', species: 'Kingdra', captain: true, teraType: 'Water' }],
		});
		expect(saved?.settings).toEqual({ format: 'gen9championsdraft', points: 95, picks: 11, coach: 'Me' });
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
