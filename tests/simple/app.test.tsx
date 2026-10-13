import { describe, expect, it } from 'vitest';
import { useStore } from '@/lib/store';
import { emptyLibrary, newSet, newTeam } from '@/lib/model';
import { clipboard, reloadPreferences, seedLocalLibrary, setViewport } from '../helpers/env';
import { allByName, button, byLabel, byName, click, flush, hasText, hover, key, openDialog, queryByLabel, renderApp, type, waitFor } from '../helpers/render';

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
		expect(allByName(/^Add .+ to the team$/).length).toBeGreaterThan(10);
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
		await click(byName('Add Garchomp'));
		expect(open().members.map((m) => m.species)).toEqual(['Garchomp']);
		// The first member goes straight onto the card.
		expect(byLabel('Garchomp set')).toBeTruthy();
		await click(byName('Move 1: empty. Add move'));
		const eq = await waitFor(() => button(/^GroundEarthquake/));
		await click(eq);
		expect(open().members[0].moves[0]).toBe('Earthquake');
		expect(byName('Move 1: Earthquake')).toBeTruthy();
	});

	it('deletes a member after confirming', async () => {
		await renderApp();
		await click(byName('Add Garchomp'));
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
		await click(byName('Add Garchomp'));
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

	it('says where the library is saved, in the header', async () => {
		await renderApp();
		expect(document.querySelector('header [aria-live]')!.textContent).toBe('Saved in this browser');
	});

	it('captions the party row with a hovered member’s name and types', async () => {
		seedLocalLibrary({ ...emptyLibrary(), teams: [newTeam({ name: 'Duo', members: [newSet('Garchomp'), newSet('Pikachu')] })] });
		await renderApp();
		const caption = () => document.querySelector('[data-party] [aria-live]')!.textContent!;
		await hover(document.querySelector('[data-party-member][data-index="1"]')!);
		expect(caption()).toContain('Pikachu');
		expect(caption()).toContain('Electric');
	});

	it('refuses to delete the last team', async () => {
		await renderApp();
		await click(byLabel('Delete team'));
		await click(button('Delete?'));
		expect(s().library.teams).toHaveLength(1);
		expect(s().toasts.at(-1)?.message).toBe("You can't delete the last team");
	});

	it('closes a dialog on Escape', async () => {
		await renderApp();
		await click(byLabel('New team'));
		const dialog = openDialog()!;
		// The browser closes the dialog itself and fires `close`.
		await flush(1);
		dialog.removeAttribute('open');
		dialog.dispatchEvent(new Event('close'));
		await flush(1);
		expect(s().dialog).toBeNull();
	});

	it('restores the team view, card sprites and fancy animations saved in this browser', async () => {
		localStorage.setItem('kingdra.teamView', 'cards');
		localStorage.setItem('kingdra.sprites', 'xy');
		localStorage.setItem('kingdra.fancyMotion', 'off');
		reloadPreferences();
		await renderApp();
		expect(byLabel('Card view').getAttribute('aria-pressed')).toBe('true');
		expect(document.querySelector('[data-team-tile]')).toBeTruthy();
		expect(button('X/Y').getAttribute('aria-checked')).toBe('true');
		expect(byLabel('Enable fancy animations').getAttribute('aria-pressed')).toBe('false');
	});

	it('turns fancy animations on for a new viewer', async () => {
		await renderApp();
		expect(s().fancyMotion).toBe(true);
		expect(byLabel('Enable fancy animations').getAttribute('aria-pressed')).toBe('true');
	});

	it('keeps a member on the card: Escape does not clear it', async () => {
		await renderApp();
		await click(byName('Add Garchomp'));
		await key(window, 'Escape');
		expect(s().selectedUid).toBe(open().members[0].uid);
		expect(byLabel('Garchomp set')).toBeTruthy();
	});
});

// Preview and compare were removed from every layout: dropping a Pokémon on the card puts it on the card.
describe('no preview or comparison', () => {
	const leftovers = () => [...document.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label')!).filter((l) => /\b(compare|preview)\b/i.test(l));

	it.each([
		['desktop', {}],
		['tablet', { merged: true }],
		['phone', { mobile: true }],
	])('shows no Preview or Compare control on %s', async (_, viewport) => {
		setViewport(viewport);
		seedLocalLibrary({ ...emptyLibrary(), teams: [newTeam({ name: 'Duo', members: [newSet('Garchomp'), newSet('Pikachu')] })] });
		await renderApp();
		expect(leftovers()).toEqual([]);
		expect(hasText('Compare')).toBe(false);
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

	it('phone: taps a member onto the card, edits from a key row in a sheet, and a pick closes it', async () => {
		setViewport({ mobile: true });
		seedLocalLibrary({ ...emptyLibrary(), teams: [newTeam({ name: 'Duo', members: [newSet('Garchomp', { ability: 'Rough Skin' }), newSet('Pikachu', { ability: 'Static' })] })] });
		await renderApp();
		await click(document.querySelector('[data-party-member][data-index="1"]')!);
		await flush(2);
		expect(byLabel('Pikachu set')).toBeTruthy();
		expect(queryByLabel('Editor')).toBeNull();
		await click(document.querySelector('[data-key-row="ability"]')!);
		await flush();
		expect(byLabel('Editor')).toBeTruthy();
		await click(button(/^Lightning Rod/, byLabel('Editor')));
		await flush();
		expect(open().members[1].ability).toBe('Lightning Rod');
		expect(queryByLabel('Editor')).toBeNull();
	});

	it('tablet: opens an editor as a tab and comes back to the card', async () => {
		setViewport({ merged: true });
		seedLocalLibrary({ ...emptyLibrary(), teams: [newTeam({ name: 'Solo', members: [newSet('Garchomp', { ability: 'Rough Skin' })] })] });
		await renderApp();
		await click(document.querySelector('[data-key-row="item"]')!);
		expect(s().inspector).toBe('item');
		expect(queryByLabel('Garchomp set')).toBeNull();
		await click(byLabel('Party and card'));
		expect(byLabel('Garchomp set')).toBeTruthy();
	});
});
