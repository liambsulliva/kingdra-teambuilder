import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { exportTeam } from '@/lib/showdown';
import { newSet, type Library } from '@/lib/model';
import { useStore } from '@/lib/store';
import { auth, clipboard, mockApi, seedLocalLibrary } from '../helpers/env';
import { allByLabel, blur, button, byLabel, byName, click, flush, hasText, key, openDialog, queryButton, queryByLabel, renderApp, select, type, wait } from '../helpers/render';
import { buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
const named = (name: string) => s().library.teams.find((t) => t.name === name);
const lastToast = () => s().toasts.at(-1);
const teamList = () => byLabel('Teams').querySelector('ol')!;
const shownTeams = () => [...teamList().querySelectorAll('[data-team-card]')].map((el) => el.getAttribute('data-team-card'));
const card = (id: string) => document.querySelector<HTMLElement>(`[data-team-card="${id}"]`)!;

let stress: StressLibrary;
let lib: Library;
beforeAll(async () => {
	stress = await buildStressLibrary();
});
beforeEach(async () => {
	lib = clone(stress.library);
	seedLocalLibrary(lib);
	await renderApp();
});

describe('team list', () => {
	it('lists every one of the 32 teams with its format and size', () => {
		expect(shownTeams()).toEqual(lib.teams.map((t) => t.id));
		expect(byLabel('Teams').querySelector('h2 + span')!.textContent).toBe(String(lib.teams.length));
		const closed = lib.teams[1];
		expect(hasText(`${closed.members.length}/6`, card(closed.id))).toBe(true);
	});

	it('opens every team by clicking its card, showing its party', async () => {
		for (const t of lib.teams.slice(1)) {
			await click(byName(`Open ${t.name}`));
			expect(open().id).toBe(t.id);
			// It opens with its first member on the card and the rest in the party.
			const [first, ...rest] = t.members;
			if (first) expect(s().selectedUid, t.name).toBe(first.uid);
			for (const m of rest) expect(queryByLabel(`${m.name || m.species}. Put on the card`), `${t.name}: ${m.species}`).toBeTruthy();
		}
	});

	it('opens a team from the keyboard', async () => {
		const t = lib.teams[4];
		await key(byName(`Open ${t.name}`), 'Enter');
		expect(open().id).toBe(t.id);
		const u = lib.teams[7];
		await key(byName(`Open ${u.name}`), ' ');
		expect(open().id).toBe(u.id);
	});

	it('opens a team straight onto the member whose icon was clicked', async () => {
		const t = lib.teams[2];
		await click(document.querySelector(`[data-team-icon="${t.id}:1"]`)!);
		expect(open().id).toBe(t.id);
		expect(s().selectedUid).toBe(t.members[1].uid);
	});

	it('shows the open team’s members in its slots, and only the empty slots are dashed', async () => {
		const t = lib.teams[4];
		await click(byName(`Open ${t.name}`));
		expect(open().id).toBe(t.id);
		const slots = [...document.querySelectorAll<HTMLElement>(`[data-team-icon^="${t.id}:"]`)];
		expect(slots).toHaveLength(6);
		expect(slots.filter((el) => el.children.length > 0)).toHaveLength(t.members.length);
		expect(slots.filter((el) => el.className.includes('border-dashed'))).toHaveLength(6 - t.members.length);
	});

	it('selects a member by clicking its icon on the open team, as the party does', async () => {
		const t = lib.teams[4];
		await click(byName(`Open ${t.name}`));
		const icon = document.querySelector<HTMLElement>(`[data-team-icon="${t.id}:2"]`)!;
		await click(icon);
		await flush();
		expect(s().selectedUid).toBe(t.members[2].uid);
	});

	it('searches teams by name, species and nickname', async () => {
		await click(byLabel('Search teams'));
		const input = byLabel('Teams').querySelector<HTMLInputElement>('input[type="search"]')!;
		type(input, 'gen9');
		expect(shownTeams()).toEqual(lib.teams.filter((t) => t.name.toLowerCase().includes('gen9')).map((t) => t.id));
		const species = lib.teams[10].members[0].species;
		type(input, species.toUpperCase());
		expect(shownTeams()).toContain(lib.teams[10].id);
		expect(shownTeams().every((id) => lib.teams.find((t) => t.id === id)!.members.some((m) => m.species.toLowerCase().includes(species.toLowerCase()) || m.name.toLowerCase().includes(species.toLowerCase())) || lib.teams.find((t) => t.id === id)!.name.toLowerCase().includes(species.toLowerCase()))).toBe(true);
		const nick = stress.library.teams.flatMap((t) => t.members).find((m) => m.name);
		if (nick) {
			type(input, nick.name);
			expect(shownTeams()).toContain(lib.teams.find((t) => t.members.some((m) => m.uid === nick.uid))!.id);
		}
		type(input, 'zzzz-nothing');
		expect(shownTeams()).toEqual([]);
		expect(hasText('No teams match “zzzz-nothing”.')).toBe(true);
		await click(byLabel('Clear search'));
		expect(shownTeams()).toHaveLength(lib.teams.length);
		await key(input, 'Escape');
		expect(byLabel('Teams').querySelector('input[type="search"]')).toBeNull();
	});
});

describe('team list, more', () => {
	const searchInput = () => byLabel('Teams').querySelector<HTMLInputElement>('input[type="search"]');

	it('closes the search from its icon, forgetting the query', async () => {
		await click(byLabel('Search teams'));
		expect(byLabel('Search teams').getAttribute('aria-pressed')).toBe('true');
		type(searchInput()!, 'zzzz-nothing');
		expect(shownTeams()).toEqual([]);
		await click(byLabel('Search teams'));
		expect(searchInput()).toBeNull();
		expect(shownTeams()).toHaveLength(lib.teams.length);
		await click(byLabel('Search teams'));
		expect(searchInput()!.value).toBe('');
		type(searchInput()!, '   ');
		expect(shownTeams()).toHaveLength(lib.teams.length);
	});

	it('leaves the open team out of the “Open” buttons, and clicking it changes nothing', async () => {
		const t = open();
		expect(byName(`Open ${lib.teams[1].name}`)).toBeTruthy();
		expect(card(t.id).getAttribute('role')).toBeNull();
		await click(card(t.id));
		expect(open().id).toBe(t.id);
	});

	it('opens a closed team only when Enter lands on the card itself, not on one of its icons', async () => {
		const t = lib.teams[6];
		await key(document.querySelector(`[data-team-icon="${t.id}:0"]`)!, 'Enter');
		expect(open().id).toBe(lib.teams[0].id);
		await key(card(t.id), 'Enter');
		expect(open().id).toBe(t.id);
	});

	it('labels the open team’s format select with its generation and format, in the list and in card view', async () => {
		select(card(open().id).querySelector('select')!, 'gen7uu');
		const label = () => card(open().id).querySelector('select')!.closest('label')!;
		expect(label().querySelector('[aria-hidden="true"]')!.textContent).toBe('Gen 7 UU');
		// The list shows a chevron; the narrow card drops it.
		expect(label().querySelector('svg')).not.toBeNull();
		await click(byLabel('Card view'));
		expect(label().querySelector('[aria-hidden="true"]')!.textContent).toBe('Gen 7 UU');
		expect(label().querySelector('svg')).toBeNull();
		// In card view the mode toggle sits on the name row.
		const nameRow = card(open().id).querySelector('input[aria-label="Team name"]')!.parentElement!;
		expect(nameRow.contains(byLabel('Competitive. Switch to casual', card(open().id)))).toBe(true);
		await click(byLabel('Competitive. Switch to casual', card(open().id)));
		expect(label().querySelector('[aria-hidden="true"]')!.textContent).toBe('Gen 7');
	});

	it('counts one legality issue in the singular, and never badges a casual team', async () => {
		const id = open().id;
		act(() => s().setValidation(id, { byMember: {}, team: ['x'], count: 1 }));
		expect(card(id).querySelector('[title="1 legality issue"]')?.textContent).toBe('1');
		await click(byLabel('Competitive. Switch to casual'));
		act(() => s().setValidation(id, { byMember: {}, team: ['x'], count: 1 }));
		expect(card(id).querySelector('[title*="legality"]')).toBeNull();
	});
});

describe('the open team', () => {
	const nameInput = () => byLabel<HTMLInputElement>('Team name');

	it('renames on blur and on Enter, keeps the old name when blank, and reverts on Escape', async () => {
		type(nameInput(), 'Renamed on blur');
		await blur(nameInput());
		expect(open().name).toBe('Renamed on blur');
		type(nameInput(), '   ');
		await blur(nameInput());
		expect(open().name).toBe('Renamed on blur');
		type(nameInput(), 'Abandoned');
		await key(nameInput(), 'Escape');
		expect(open().name).toBe('Renamed on blur');
	});

	it('switches between competitive and casual, restoring an OU format', async () => {
		await click(byLabel('Competitive. Switch to casual'));
		expect(open().mode).toBe('casual');
		await click(byLabel('Casual. Switch to competitive'));
		expect(open()).toMatchObject({ mode: 'competitive', format: lib.teams[0].format });
		// A casual team from the library goes back to its generation's OU.
		await click(byName(`Open ${lib.teams[25].name}`));
		await click(byLabel('Casual. Switch to competitive'));
		expect(open()).toMatchObject({ mode: 'competitive', format: `gen${lib.teams[25].gen}ou` });
	});

	it('changes generation and format from the select, for competitive and casual teams', async () => {
		const sel = () => card(open().id).querySelector('select')!;
		expect(sel().querySelectorAll('optgroup')).toHaveLength(9);
		select(sel(), 'gen7uu');
		expect(open()).toMatchObject({ gen: 7, format: 'gen7uu', mode: 'competitive' });
		select(sel(), 'gen9championsou');
		expect(open()).toMatchObject({ gen: 9, format: 'gen9championsou' });
		await click(byName(`Open ${lib.teams[26].name}`));
		expect([...sel().options].map((o) => o.value)).toEqual(['casual:9', 'casual:8', 'casual:7', 'casual:6', 'casual:5', 'casual:4', 'casual:3', 'casual:2', 'casual:1']);
		select(sel(), 'casual:2');
		expect(open()).toMatchObject({ mode: 'casual', gen: 2 });
	});

	it('duplicates the team right below it', async () => {
		await click(byLabel('Duplicate team'));
		expect(s().library.teams[1].name).toBe(`${lib.teams[0].name} copy`);
		expect(shownTeams()).toHaveLength(lib.teams.length + 1);
		expect(lastToast()?.message).toBe(`Duplicated ${lib.teams[0].name}`);
	});

	it('copies the team as Showdown text, and explains an empty team or a blocked clipboard', async () => {
		await click(byLabel('Copy as Showdown text'));
		await flush();
		expect(clipboard.text).toBe(exportTeam(lib.teams[0]));
		clipboard.fail = true;
		await click(byLabel('Copy as Showdown text'));
		await flush();
		expect(lastToast()).toMatchObject({ kind: 'error', message: "Couldn't copy to the clipboard" });
		for (const m of [...open().members]) s().removeMember(m.uid);
		await flush();
		await click(byLabel('Copy as Showdown text'));
		await flush();
		expect(lastToast()?.message).toBe('This team has no Pokémon to export');
	});

	it('asks before deleting, and cancels when focus leaves the confirm button', async () => {
		await click(byLabel('Delete team'));
		const confirm = button('Delete?');
		await blur(confirm);
		expect(queryButton('Delete?')).toBeNull();
		expect(s().library.teams).toHaveLength(lib.teams.length);
		await click(byLabel('Delete team'));
		await click(button('Delete?'));
		expect(s().library.teams).toHaveLength(lib.teams.length - 1);
		expect(named(lib.teams[0].name)).toBeUndefined();
		expect(open().id).toBe(lib.teams[1].id);
	});

	it('keeps its controls inside its card, in place of the format line, in the list and in card view', async () => {
		for (const view of ['list', 'cards']) {
			if (view === 'cards') await click(byLabel('Card view'));
			const c = card(open().id);
			for (const label of ['Competitive. Switch to casual', 'Duplicate team', 'Copy as Showdown text', 'Delete team']) {
				expect(c.contains(byLabel(label)), `${view}: ${label}`).toBe(true);
			}
			expect(c.querySelector('select'), view).not.toBeNull();
			expect(hasText(`${open().members.length}/6`, c), view).toBe(false);
			// A closed team shows its format line instead.
			expect(hasText(`${lib.teams[1].members.length}/6`, card(lib.teams[1].id)), view).toBe(true);
		}
	});

	it('shows the legality issue count on the team card', async () => {
		const first = lib.teams[0].members[0];
		mockApi({ '/api/validate': () => ({ byMember: { [first.uid]: ['a', 'b'] }, team: ['c'], count: 3 }) });
		s().updateSet(first.uid, { level: 99 });
		await wait(700);
		const badge = card(open().id).querySelector('[title="3 legality issues"]');
		expect(badge?.textContent).toBe('3');
	});
});

describe('card view', () => {
	const toggle = () => byLabel<HTMLButtonElement>('Card view');
	const tiles = () => [...teamList().querySelectorAll<HTMLElement>('[data-team-tile]')];

	it('turns the list into cards two to a row and back, keeping the open team and saving the choice', async () => {
		const openId = open().id;
		await click(toggle());
		expect(toggle().getAttribute('aria-pressed')).toBe('true');
		expect(teamList().className).toContain('grid-cols-2');
		expect(tiles().map((el) => el.dataset.teamTile)).toEqual(lib.teams.map((t) => t.id));
		expect(open().id).toBe(openId);
		expect(card(openId).querySelector<HTMLInputElement>('input[aria-label="Team name"]')!.value).toBe(lib.teams[0].name);
		expect(localStorage.getItem('kingdra.teamView')).toBe('cards');
		await click(toggle());
		expect(tiles()).toHaveLength(0);
		expect(shownTeams()).toEqual(lib.teams.map((t) => t.id));
		expect(open().id).toBe(openId);
		expect(localStorage.getItem('kingdra.teamView')).toBe('list');
	});

	it('lays out each card’s six slots in a 2×3 grid, and hinges only the closed cards', async () => {
		await click(toggle());
		const closed = lib.teams[1];
		const grid = card(closed.id).querySelector(`[data-team-icon="${closed.id}:0"]`)!.parentElement!;
		expect(grid.className).toContain('grid-cols-3');
		expect(grid.children).toHaveLength(6);
		expect(card(closed.id).classList.contains('hinge')).toBe(true);
		expect(card(open().id).classList.contains('hinge')).toBe(false);
	});

	it('stops the cards swinging when fancy animations are off, and swings them again when back on', async () => {
		await click(toggle());
		const closed = lib.teams[1];
		expect(card(closed.id).hasAttribute('data-still')).toBe(false);
		await click(byLabel('Enable fancy animations'));
		expect(card(closed.id).hasAttribute('data-still')).toBe(true);
		await click(byLabel('Enable fancy animations'));
		expect(card(closed.id).hasAttribute('data-still')).toBe(false);
	});

	it('opens a team from its card or from one of its icons', async () => {
		await click(toggle());
		await click(byName(`Open ${lib.teams[2].name}`));
		expect(open().id).toBe(lib.teams[2].id);
		const t = lib.teams[3];
		await click(document.querySelector(`[data-team-icon="${t.id}:1"]`)!);
		expect(open().id).toBe(t.id);
		expect(s().selectedUid).toBe(t.members[1].uid);
	});

	it('filters the cards with the team search', async () => {
		await click(toggle());
		await click(byLabel('Search teams'));
		type(byLabel('Teams').querySelector<HTMLInputElement>('input[type="search"]')!, lib.teams[5].name);
		expect(tiles().map((el) => el.dataset.teamTile)).toContain(lib.teams[5].id);
		expect(tiles().length).toBeLessThan(lib.teams.length);
	});
});

describe('new team dialog', () => {
	const dialog = () => openDialog()!;

	it('creates a competitive team with a chosen name, generation and format', async () => {
		await click(byLabel('New team'));
		expect(dialog().querySelector('h2')!.textContent).toBe('New team');
		type(dialog().querySelector('input')!, '  Trick Room  ');
		select(dialog().querySelector<HTMLSelectElement>('select[aria-label="Generation"]')!, '7');
		const format = dialog().querySelector<HTMLSelectElement>('select[aria-label="Format"]')!;
		expect(format.value).toBe('gen7ou');
		select(format, 'gen7vgc2019');
		await click(button('Create team'));
		expect(open()).toMatchObject({ name: 'Trick Room', gen: 7, format: 'gen7vgc2019', mode: 'competitive' });
		expect(openDialog()).toBeNull();
	});

	it('names an unnamed team after the next number and submits with Enter', async () => {
		await click(byLabel('New team'));
		const input = dialog().querySelector('input')!;
		expect(input.placeholder).toBe(`Team ${lib.teams.length + 1}`);
		act(() => void dialog().querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
		expect(open().name).toBe(`Team ${lib.teams.length + 1}`);
	});

	it('creates a casual team without a format choice', async () => {
		await click(byLabel('New team'));
		await click(button('Casual', dialog()));
		expect(dialog().querySelector('select[aria-label="Format"]')).toBeNull();
		await click(button('Create team'));
		expect(open()).toMatchObject({ mode: 'casual', format: 'casual' });
	});

	it('cancels and closes with the X without creating a team', async () => {
		await click(byLabel('New team'));
		await click(button('Cancel', dialog()));
		await flush();
		expect(openDialog()).toBeNull();
		await click(byLabel('New team'));
		await click(byLabel('Close', dialog()));
		await flush();
		expect(openDialog()).toBeNull();
		expect(s().library.teams).toHaveLength(lib.teams.length);
	});

	it('closes on Escape and on a click on the backdrop', async () => {
		await click(byLabel('New team'));
		// Escape makes the browser close the dialog and fire `close`.
		const d = dialog();
		act(() => {
			d.removeAttribute('open');
			d.dispatchEvent(new Event('close'));
		});
		expect(s().dialog).toBeNull();
		await click(byLabel('New team'));
		await click(dialog());
		await flush();
		expect(openDialog()).toBeNull();
		expect(s().library.teams).toHaveLength(lib.teams.length);
	});

	it('switches to the import dialog', async () => {
		await click(byLabel('New team'));
		await click(button('Paste a Showdown team instead'));
		expect(dialog().querySelector('h2')!.textContent).toBe('Import a team');
	});

	// Regression: the New team dialog's late close event used to shut the import dialog.
	it('keeps the import dialog open after switching to it', async () => {
		await click(byLabel('New team'));
		await click(button('Paste a Showdown team instead'));
		await flush();
		expect(openDialog()?.querySelector('h2')?.textContent).toBe('Import a team');
	});
});

describe('import team dialog', () => {
	const dialog = () => openDialog()!;
	const paste = (text: string) => type(dialog().querySelector('textarea')!, text);

	it('keeps Import disabled until there is text, and explains text with no Pokémon', async () => {
		await click(byLabel('Import a Showdown team'));
		expect(button('Import', dialog()).disabled).toBe(true);
		paste('just some words');
		await click(button('Import', dialog()));
		expect(hasText("Couldn't find any Pokémon in that text.", dialog())).toBe(true);
		expect(s().library.teams).toHaveLength(lib.teams.length);
	});

	it('imports a full backup of all 32 teams as new teams, overwriting nothing', async () => {
		const backup = lib.teams.map((t) => `=== [${t.mode === 'casual' ? `gen${t.gen}ou` : t.format}] ${t.name} (import) ===\n\n${exportTeam(t)}`).join('\n\n');
		await click(byLabel('Import a Showdown team'));
		paste(backup);
		await click(button('Import', dialog()));
		expect(s().library.teams).toHaveLength(lib.teams.length * 2);
		expect(s().library.teams.slice(0, lib.teams.length)).toEqual(lib.teams);
		expect(open().name).toBe(`${lib.teams.at(-1)!.name} (import)`);
		expect(openDialog()).toBeNull();
	});

	it('reports Pokémon it skipped', async () => {
		await click(byLabel('Import a Showdown team'));
		paste('Pikachu\n- Thunderbolt\n\nFakemon\n- Tackle');
		await click(button('Import', dialog()));
		expect(s().toasts.map((t) => t.message)).toEqual(expect.arrayContaining(['Skipped Fakemon']));
		expect(open().members.map((m) => m.species)).toEqual(['Pikachu']);
	});

	it('gives headerless text the open team’s format, and names every imported team in one toast', async () => {
		await click(byName(`Open ${lib.teams[1].name}`));
		await click(byLabel('Import a Showdown team'));
		paste('Pikachu\n- Thunderbolt');
		await click(button('Import', dialog()));
		expect(open()).toMatchObject({ format: lib.teams[1].format, mode: 'competitive' });
		await click(byLabel('Import a Showdown team'));
		// The textarea is empty again after an import.
		expect(dialog().querySelector('textarea')!.value).toBe('');
		paste('=== [gen9ou] Alpha ===\n\nPikachu\n- Thunderbolt\n\n=== [gen9ou] Beta ===\n\nMew\n- Psychic');
		await click(button('Import', dialog()));
		expect(lastToast()?.message).toBe('Imported Alpha, Beta');
	});

	it('clears the error once a retry imports', async () => {
		await click(byLabel('Import a Showdown team'));
		paste('just some words');
		await click(button('Import', dialog()));
		expect(hasText("Couldn't find any Pokémon", dialog())).toBe(true);
		paste('Pikachu\n- Thunderbolt');
		await click(button('Import', dialog()));
		expect(openDialog()).toBeNull();
		await click(byLabel('Import a Showdown team'));
		expect(hasText("Couldn't find any Pokémon", dialog())).toBe(false);
	});

	it('gives a casual team’s import its generation’s OU', async () => {
		await click(byName(`Open ${lib.teams[27].name}`));
		await click(byLabel('Import a Showdown team'));
		paste('Pikachu\n- Thunderbolt');
		await click(button('Import', dialog()));
		expect(open()).toMatchObject({ format: `gen${lib.teams[27].gen}ou`, mode: 'casual' });
	});
});

describe('header', () => {
	it('toggles the theme both ways and remembers it', async () => {
		await click(byLabel('Dark mode'));
		expect(document.documentElement.dataset.theme).toBe('dark');
		await click(byLabel('Light mode'));
		expect(document.documentElement.dataset.theme).toBe('light');
		expect(localStorage.getItem('kingdra.theme')).toBe('light');
	});

	it('switches card sprites and marks the choice', async () => {
		const radios = allByLabel('Card sprites')[0].querySelectorAll('[role="radio"]');
		expect(radios[0].getAttribute('aria-checked')).toBe('true');
		await click(radios[1]);
		expect(radios[1].getAttribute('aria-checked')).toBe('true');
		expect(localStorage.getItem('kingdra.sprites')).toBe('xy');
	});

	it('offers sign in to guests', () => {
		expect(byLabel('Sign in to sync your teams')).toBeTruthy();
	});

	it('says sign-in is unavailable when Clerk cannot load, instead of leaving the corner empty', async () => {
		auth.failed = true;
		await renderApp();
		// The suite already rendered one app; check the header of the one rendered with Clerk failing.
		const header = [...document.querySelectorAll('header')].at(-1)!;
		const unavailable = byLabel<HTMLButtonElement>("Sign-in isn't available on this deployment", header);
		expect(unavailable.disabled).toBe(true);
		expect(queryByLabel('Sign in to sync your teams', header)).toBeNull();
	});

	it('dismisses a toast on click', async () => {
		s().toast('success', 'Hello trainer');
		await flush(1);
		await click(button('Hello trainer'));
		expect(s().toasts).toEqual([]);
	});

	it('keeps member ids unique when a set is added in a closed team', () => {
		s().addMemberToTeam(lib.teams[4].id, 'Pikachu');
		const uids = s().library.teams.flatMap((t) => t.members.map((m) => m.uid));
		expect(new Set(uids).size).toBe(uids.length);
		expect(newSet('Pikachu').uid).toBeTruthy();
	});
});
