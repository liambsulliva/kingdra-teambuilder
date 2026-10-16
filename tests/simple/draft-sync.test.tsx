import { describe, expect, it } from 'vitest';
import { DraftSyncView } from '@/components/draft/DraftSyncView';
import { newRosterEntry } from '@/lib/draft/draft';
import type { Draft, League } from '@/lib/draft/types';
import { emptyLibrary } from '@/lib/model';
import { useStore } from '@/lib/store';
import { resetStore } from '../helpers/env';
import { flush, hasText, render } from '../helpers/render';

const league = (): League => ({
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
});

const draft = (over: Partial<Draft> = {}): Draft => ({
	league: league(),
	settings: { format: 'gen9championsou', points: 95, picks: 11, coach: 'Me' },
	roster: [],
	teams: [],
	openTeamId: '',
	dismissed: {},
	...over,
});

/** Opens the sync view on a draft, with Draft Mode on as it is for the user. */
function openSync(d: Draft) {
	resetStore({ ...emptyLibrary(), draft: d });
	useStore.setState({ draftMode: true });
	render(<DraftSyncView />);
	return flush();
}

const NOTHING_TO_REPORT = /matches the sheet/i;

describe('draft sync empty state', () => {
	it('says the changes are dismissed when every one has been dismissed, instead of claiming a match', async () => {
		await openSync(
			draft({
				dismissed: { 'add:Kingdra': '', 'add:Pelipper': '' },
			}),
		);
		expect(hasText('All changes are dismissed. They stay hidden until their lines change on the sheet.')).toBe(true);
		expect(hasText(NOTHING_TO_REPORT)).toBe(false);
	});

	it('says nothing is waiting when the roster has no sheet changes to show', async () => {
		await openSync(draft({ roster: [newRosterEntry('Kingdra'), newRosterEntry('Pelipper')] }));
		expect(hasText('No changes waiting from the sheet.')).toBe(true);
		expect(hasText(NOTHING_TO_REPORT)).toBe(false);
	});

	it('shows no sync claim at all when the user is not a coach, since there is no sheet to compare', async () => {
		await openSync(draft({ settings: { format: 'gen9championsou', points: 95, picks: 11, coach: null } }));
		expect(hasText('All changes are dismissed')).toBe(false);
		expect(hasText('No changes waiting')).toBe(false);
		expect(hasText(NOTHING_TO_REPORT)).toBe(false);
	});

	it('lists the waiting changes and no empty-state line while any are still waiting', async () => {
		await openSync(draft({ dismissed: { 'add:Kingdra': '' } }));
		expect(hasText('Changes between your current roster and the sheet.')).toBe(true);
		expect(hasText('The sheet has Pelipper on your team.')).toBe(true);
		expect(hasText('The sheet has Kingdra on your team.')).toBe(false);
		expect(hasText('All changes are dismissed')).toBe(false);
		expect(hasText('No changes waiting')).toBe(false);
	});
});
