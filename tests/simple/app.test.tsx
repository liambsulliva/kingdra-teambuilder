import { describe, expect, it } from 'vitest';
import { useStore } from '@/lib/store';
import { emptyLibrary, newSet, newTeam } from '@/lib/model';
import { clipboard, seedLocalLibrary, setViewport } from '../helpers/env';
import { allByLabel, button, byLabel, click, flush, hasText, key, openDialog, queryByLabel, renderApp, type, waitFor } from '../helpers/render';

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;

describe('desktop app, everyday flows', () => {
	it('renders the header, team list, inspector, suggestions and save status', async () => {
		await renderApp();
		expect(byLabel('Kingdra home')).toBeTruthy();
		expect(byLabel('Teams')).toBeTruthy();
		expect(byLabel('Inspector')).toBeTruthy();
		expect(byLabel('Suggestions')).toBeTruthy();
		expect(hasText('Saved in this browser')).toBe(true);
		expect(allByLabel(/^Add .+ to the team$/).length).toBeGreaterThan(10);
	});

	it('restores a guest library saved in this browser', async () => {
		seedLocalLibrary({ ...emptyLibrary(), teams: [newTeam({ name: 'Saved Rain', members: [newSet('Kingdra')] })] });
		await renderApp();
		expect((document.querySelector('input[aria-label="Team name"]') as HTMLInputElement | null)?.value).toBe('Saved Rain');
		expect(open().members[0].species).toBe('Kingdra');
		// The returning team opens with a member on the card.
		expect(byLabel('Kingdra set')).toBeTruthy();
	});

	it('creates a team from the dialog', async () => {
		await renderApp();
		await click(byLabel('New team'));
		expect(openDialog()).toBeTruthy();
		type(openDialog()!.querySelector('input')!, 'Hail Squad');
		await click(button('Create team'));
		expect(open().name).toBe('Hail Squad');
		expect(openDialog()).toBeNull();
	});

	it('adds a suggestion, puts it on the card and fills a move', async () => {
		await renderApp();
		await click(byLabel('Add Garchomp to the team'));
		expect(open().members.map((m) => m.species)).toEqual(['Garchomp']);
		// The first member goes straight onto the card.
		expect(byLabel('Garchomp set')).toBeTruthy();
		await click(byLabel('Move 1: empty. Add a move'));
		const eq = await waitFor(() => button(/^GroundEarthquake/));
		await click(eq);
		expect(open().members[0].moves[0]).toBe('Earthquake');
		expect(byLabel('Move 1: Earthquake. Change')).toBeTruthy();
	});

	it('deletes a member after confirming', async () => {
		await renderApp();
		await click(byLabel('Add Garchomp to the team'));
		await click(byLabel('Delete Garchomp'));
		expect(hasText('Delete Garchomp?', openDialog()!)).toBe(true);
		await click(button('Delete', openDialog()!));
		expect(open().members).toHaveLength(0);
	});

	it('imports a pasted Showdown team as a new team', async () => {
		await renderApp();
		await click(byLabel('Import a Showdown team'));
		type(openDialog()!.querySelector('textarea')!, 'Pikachu @ Light Ball\nAbility: Static\n- Thunderbolt');
		await click(button('Import', openDialog()!));
		expect(s().library.teams).toHaveLength(2);
		expect(open().members[0]).toMatchObject({ species: 'Pikachu', item: 'Light Ball', moves: ['Thunderbolt'] });
	});

	it('copies the open team as Showdown text', async () => {
		await renderApp();
		await click(byLabel('Add Garchomp to the team'));
		await click(byLabel('Copy as Showdown text'));
		await flush();
		expect(clipboard.text).toContain('Garchomp');
		expect(s().toasts.at(-1)?.message).toBe('Team 1 copied as Showdown text');
	});

	it('toggles dark mode and the card sprite set', async () => {
		await renderApp();
		await click(byLabel('Dark mode'));
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(localStorage.getItem('kingdra.theme')).toBe('dark');
		await click(button('X/Y'));
		expect(s().spriteSet).toBe('xy');
	});

	it('keeps a member on the card: Escape does not clear it', async () => {
		await renderApp();
		await click(byLabel('Add Garchomp to the team'));
		await key(window, 'Escape');
		expect(s().selectedUid).toBe(open().members[0].uid);
		expect(byLabel('Garchomp set')).toBeTruthy();
	});
});

describe('other layouts', () => {
	it('renders the mobile app with its three tabs', async () => {
		setViewport({ mobile: true });
		await renderApp();
		expect(button('Teams')).toBeTruthy();
		expect(button('Party')).toBeTruthy();
		expect(button('Browse')).toBeTruthy();
		expect(queryByLabel('Inspector')).toBeNull();
	});

	it('merges the workspace into the right panel at tablet width', async () => {
		setViewport({ merged: true });
		await renderApp();
		expect(s().merged).toBe(true);
		expect(byLabel('Party and card')).toBeTruthy();
	});
});
