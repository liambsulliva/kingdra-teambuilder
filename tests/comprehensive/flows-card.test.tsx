import { act } from 'react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { exportSet } from '@/lib/showdown';
import { fieldsFor, getSpecies } from '@/lib/dex';
import { newSet, newTeam, type Library, type PokemonSet, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';
import { clipboard, mockApi, seedLocalLibrary } from '../helpers/env';
import { allButtons, button, byLabel, byName, click, flush, hasText, key, openDialog, queryButton, queryByLabel, queryByName, renderApp, type, wait, waitFor } from '../helpers/render';
import { buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
const member = () => open().members.find((m) => m.uid === s().selectedUid)!;
const lastToast = () => s().toasts.at(-1);
const label = (m: PokemonSet) => m.name || m.species;
const keyRows = () => [...document.querySelectorAll('[data-key-row]')].map((el) => el.getAttribute('data-key-row'));

let stress: StressLibrary;
let lib: Library;
beforeAll(async () => {
	stress = await buildStressLibrary();
});

async function start(extra: Team[] = []) {
	lib = clone(stress.library);
	lib.teams.push(...extra);
	seedLocalLibrary(lib);
	await renderApp();
}

async function openTeam(t: Team) {
	if (open().id !== t.id) await click(byName(`Open ${t.name}`));
}

/** Click the member's party cell by position: two members can share a nickname. */
async function putOnCard(t: Team, m: PokemonSet) {
	await openTeam(t);
	const index = open().members.findIndex((x) => x.uid === m.uid);
	// Opening a team puts a member on the card already; its party icon is hidden on desktop.
	if (s().selectedUid !== m.uid) await click(document.querySelector(`[data-party-member][data-index="${index}"]`)!);
	await flush(2);
	expect(s().selectedUid).toBe(m.uid);
}

describe('the card for every member of every team', () => {
	beforeEach(() => start());

	it('shows name, dex number, types, key rows for the format, and all four move slots', async () => {
		for (const t of lib.teams) {
			for (const m of t.members) {
				await putOnCard(t, m);
				const section = byLabel(`${label(m)} set`);
				const species = getSpecies(t, m.species)!;
				expect(section.querySelector('h2')!.textContent, `${t.name}: ${m.species}`).toBe(label(m));
				expect(section.textContent, `${t.name}: ${m.species}`).toContain(`#${species.num}`);
				if (m.name) expect(hasText(m.species, section)).toBe(true);
				for (const type of species.types) expect(queryButton(type, section), `${m.species} ${type}`).toBeTruthy();
				const f = fieldsFor(t);
				const expected = (['level', 'ability', 'item', 'nature', 'tera'] as const).filter((k) => f[k]);
				expect(keyRows(), `${t.name}`).toEqual(expected);
				for (let i = 0; i < 4; i++) {
					const move = m.moves[i];
					expect(queryByName(move ? `Move ${i + 1}: ${move}` : `Move ${i + 1}: empty. Add move`), `${m.species} slot ${i}`).toBeTruthy();
				}
				await key(window, 'Escape');
			}
		}
	});

	it('shows the stored value or a hint on each key row', async () => {
		const t = lib.teams[0];
		const m = t.members[0];
		await putOnCard(t, m);
		const row = (k: string) => document.querySelector(`[data-key-row="${k}"]`)!.textContent!;
		expect(row('level')).toContain(String(m.level));
		expect(row('ability')).toContain(m.ability || 'Choose an ability');
		expect(row('item')).toContain(m.item || 'No item');
		expect(row('tera')).toContain(m.teraType || getSpecies(t, m.species)!.types[0]);
	});

	it('opens the matching editor from every key row and move slot', async () => {
		const t = lib.teams[0];
		await putOnCard(t, t.members[0]);
		for (const k of keyRows()) {
			await click(document.querySelector(`[data-key-row="${k}"]`)!);
			expect(s().inspector).toBe(k);
		}
		for (let i = 0; i < 4; i++) {
			await click(document.querySelector(`[data-move-slot="${i}"]`)!);
			expect(s()).toMatchObject({ inspector: 'moves', activeMoveSlot: i });
		}
	});

	it('opens matchups for a clicked type', async () => {
		const t = lib.teams[0];
		const m = t.members[0];
		await putOnCard(t, m);
		const type = getSpecies(t, m.species)!.types[0];
		await click(button(type, byLabel(`${label(m)} set`)));
		expect(s()).toMatchObject({ inspector: 'matchups', matchupType: type });
	});

	it('toggles shiny where the generation has it', async () => {
		const t = lib.teams[0];
		const m = t.members[0];
		await putOnCard(t, m);
		const before = member().shiny;
		await click(byLabel(before ? 'Shiny' : 'Not shiny'));
		expect(member().shiny).toBe(!before);
		const gen1 = lib.teams.find((x) => x.format === 'gen1ou')!;
		await putOnCard(gen1, gen1.members[0]);
		expect(queryByLabel('Shiny') ?? queryByLabel('Not shiny')).toBeNull();
	});

	it('copies the set as Showdown text, and reports a blocked clipboard', async () => {
		const t = lib.teams[3];
		await putOnCard(t, t.members[2]);
		await click(byLabel('Copy set as Showdown text'));
		await flush();
		expect(clipboard.text).toBe(exportSet(t.members[2]));
		expect(lastToast()?.message).toBe(`${label(t.members[2])} copied as Showdown text`);
		clipboard.fail = true;
		await click(byLabel('Copy set as Showdown text'));
		await flush();
		expect(lastToast()).toMatchObject({ kind: 'error', message: "Couldn't copy to the clipboard" });
	});

	it('replaces the whole set from pasted text, and explains unreadable text', async () => {
		const t = lib.teams[0];
		const m = t.members[1];
		await putOnCard(t, m);
		await click(byLabel('Paste a Showdown set'));
		expect(openDialog()!.querySelector('h2')!.textContent).toBe(`Paste a set for ${label(m)}`);
		type(openDialog()!.querySelector('textarea')!, '');
		expect(button('Import', openDialog()!).disabled).toBe(true);
		type(openDialog()!.querySelector('textarea')!, '???');
		await click(button('Import', openDialog()!));
		expect(hasText("Couldn't read a Pokémon from that text.", openDialog()!)).toBe(true);
		type(openDialog()!.querySelector('textarea')!, 'Kingdra @ Choice Specs\nAbility: Swift Swim\nModest Nature\n- Surf\n- Draco Meteor');
		await click(button('Import', openDialog()!));
		expect(open().members[1]).toMatchObject({ uid: m.uid, species: 'Kingdra', item: 'Choice Specs', moves: ['Surf', 'Draco Meteor'] });
		expect(lastToast()?.message).toBe(`Replaced ${label(m)} with the pasted set`);
	});

	it('deletes the member only after confirming', async () => {
		const t = lib.teams[0];
		const m = t.members[0];
		await putOnCard(t, m);
		await click(byLabel(`Delete ${label(m)}`));
		expect(hasText('This cannot be undone.', openDialog()!)).toBe(true);
		await click(button('Cancel', openDialog()!));
		await flush();
		expect(open().members).toHaveLength(t.members.length);
		await click(byLabel(`Delete ${label(m)}`));
		await click(button('Delete', openDialog()!));
		expect(open().members.map((x) => x.uid)).not.toContain(m.uid);
		// Its neighbor takes the card.
		expect(s().selectedUid).toBe(t.members[1].uid);
	});

	it('keeps a member on the card through Escape and clicks on the empty desk', async () => {
		const t = lib.teams[0];
		await putOnCard(t, t.members[0]);
		await key(window, 'Escape');
		expect(s().selectedUid).toBe(t.members[0].uid);
		const desk = byLabel(`${label(t.members[0])} set`).parentElement!.parentElement!;
		await click(desk);
		expect(s().selectedUid).toBe(t.members[0].uid);
	});

	it('shows every party member in its cell, the one on the card included', () => {
		const team = open();
		const onCard = team.members.find((m) => m.uid === s().selectedUid);
		expect(onCard, 'a member is on the card').toBeTruthy();
		expect(document.querySelectorAll('[data-party-member]')).toHaveLength(team.members.length);
		expect(document.querySelector(`[data-party-member][data-species="${onCard!.species}"]`)).toBeTruthy();
	});

	it('lets Escape close a dialog without closing the card', async () => {
		const t = lib.teams[0];
		await putOnCard(t, t.members[0]);
		await click(byLabel('Paste a Showdown set'));
		await key(window, 'Escape');
		expect(s().selectedUid).toBe(t.members[0].uid);
	});

	it('shows the team summary only while the team is empty', async () => {
		await act(() => s().createTeam({ name: 'Blank Slate' }));
		expect(s().selectedUid).toBeNull();
		expect(hasText('Blank Slate')).toBe(true);
		expect(hasText('0/6')).toBe(true);
		expect(hasText('Drag a suggestion onto the party, or click one to add it.')).toBe(true);
		expect(hasText('preview')).toBe(false);
	});
});

describe('evolution and details', () => {
	const evo = newTeam({ name: 'Evolutions', format: 'gen9ou', members: [newSet('Charmander', { ability: 'Blaze', moves: ['Ember'] }), newSet('Eevee', { ability: 'Run Away' })] });
	beforeEach(() => start([evo]));

	it('lists the whole line and switches species on click, keeping the set', async () => {
		await putOnCard(evo, evo.members[0]);
		const stages = allButtons(/^(Charmander|Charmeleon|Charizard)$/).map((b) => b.textContent);
		expect(stages).toEqual(['Charmander', 'Charmeleon', 'Charizard']);
		await click(button('Charizard'));
		await flush();
		expect(member()).toMatchObject({ species: 'Charizard', ability: 'Blaze', moves: ['Ember'], uid: evo.members[0].uid });
	});

	it('lists branching evolutions', async () => {
		await putOnCard(evo, evo.members[1]);
		for (const e of ['Vaporeon', 'Jolteon', 'Flareon', 'Espeon', 'Umbreon', 'Leafeon', 'Glaceon', 'Sylveon']) expect(queryButton(e), e).toBeTruthy();
	});

	it('opens Details for competitive teams only', async () => {
		await putOnCard(evo, evo.members[0]);
		await click(byLabel('More details'));
		expect(s().inspector).toBe('details');
		const casual = lib.teams.find((t) => t.mode === 'casual')!;
		await putOnCard(casual, casual.members[0]);
		expect(queryByLabel('More details')).toBeNull();
	});
});

describe('Smogon sets on the card', () => {
	const solo = newTeam({ name: 'Smogon', format: 'gen9ou', members: [newSet('Garchomp', { ability: 'Rough Skin' })] });
	beforeEach(() => start([solo]));

	it('loads the only set straight away', async () => {
		mockApi({ '/api/sets': () => ({ sets: { 'Stealth Rock': { item: 'Rocky Helmet', nature: 'Jolly', moves: ['Stealth Rock', ['Earthquake', 'Spikes']], evs: { hp: 252, spe: 252 }, teratypes: ['Steel', 'Fairy'] } } }) });
		await putOnCard(solo, solo.members[0]);
		await click(button('Load Smogon Set'));
		await flush();
		expect(member()).toMatchObject({ item: 'Rocky Helmet', nature: 'Jolly', ability: 'Rough Skin', moves: ['Stealth Rock', 'Earthquake'], teraType: 'Steel' });
		expect(member().evs).toEqual({ hp: 252, atk: 0, def: 0, spa: 0, spd: 0, spe: 252 });
		expect(lastToast()?.message).toBe('Loaded the Smogon Stealth Rock set');
	});

	it('offers a choice when there are several sets', async () => {
		mockApi({ '/api/sets': () => ({ sets: { 'Swords Dance': { moves: ['Swords Dance'] }, Scarf: { item: 'Choice Scarf', moves: ['Outrage'] } } }) });
		await putOnCard(solo, solo.members[0]);
		await click(button('Load Smogon Set'));
		await flush();
		await click(button('Scarf'));
		expect(member()).toMatchObject({ item: 'Choice Scarf', moves: ['Outrage'] });
		expect(queryButton('Swords Dance')).toBeNull();
	});

	it('explains when there is no set or the request fails', async () => {
		await putOnCard(solo, solo.members[0]);
		await click(button('Load Smogon Set'));
		await flush();
		expect(lastToast()?.message).toBe('No Smogon set for Garchomp in this format');
		mockApi({ '/api/sets': () => new Response('not json', { status: 500 }) });
		await click(button('Load Smogon Set'));
		await flush();
		expect(lastToast()?.message).toBe("Couldn't load Smogon sets");
	});

	it('asks casual teams for their generation’s OU sets', async () => {
		const casual = lib.teams.find((t) => t.mode === 'casual')!;
		await putOnCard(casual, casual.members[0]);
		await click(button('Load Smogon Set'));
		await flush();
		const call = (await import('../helpers/env')).fetchCalls.find((c) => c.url.includes('/api/sets'))!;
		expect(new URL(call.url).searchParams.get('format')).toBe(`gen${casual.gen}ou`);
	});

	it('lists the support moves the species can learn', async () => {
		await putOnCard(solo, solo.members[0]);
		await waitFor(() => expect(hasText('Hazards', byLabel('Garchomp set'))).toBe(true));
	});
});

describe('preview and comparison', () => {
	beforeEach(() => start());

	it('previews a candidate with base stats and can add it', async () => {
		const t = lib.teams.find((x) => x.members.length < 6)!;
		await openTeam(t);
		await key(window, 'Escape');
		act(() => s().preview('Mew'));
		const preview = byLabel('Preview Mew');
		expect(hasText('#151', preview)).toBe(true);
		await click(button('Add to team', preview));
		expect(open().members.at(-1)!.species).toBe('Mew');
		expect(queryByLabel('Preview Mew')).toBeNull();
	});

	it('disables adding to a full team and points at Compare; Escape and the close button leave', async () => {
		const full = lib.teams[0];
		act(() => s().preview('Mew'));
		expect(button('Add to team', byLabel('Preview Mew')).disabled).toBe(true);
		expect(hasText(`${full.name} is full. Compare to swap someone out.`)).toBe(true);
		await key(window, 'Escape');
		expect(s().previewSpecies).toBeNull();
		act(() => s().preview('Mew'));
		await click(byLabel('Close preview'));
		expect(s().previewSpecies).toBeNull();
		act(() => s().preview('Mew'));
		await click(button('Compare', byLabel('Preview Mew')));
		expect(s().compareSpecies).toBe('Mew');
	});

	it('swaps the candidate in for the member on the card as a fresh set, and keeps it on the card', async () => {
		const t = lib.teams[0];
		await putOnCard(t, t.members[3]);
		act(() => s().compare('Mew'));
		const scene = byLabel('Compare Mew');
		expect(hasText('Candidate', scene)).toBe(true);
		expect(hasText('On your card', scene)).toBe(true);
		await click(button(`Swap ${label(t.members[3])} for Mew`));
		await flush(4);
		expect(open().members[3]).toMatchObject({ uid: t.members[3].uid, species: 'Mew', moves: [], item: '' });
		expect(s().compareSpecies).toBeNull();
		expect(s().selectedUid).toBe(t.members[3].uid);
	});

	it('compares against the member on the card, and returns to it on close', async () => {
		const t = lib.teams[0];
		await putOnCard(t, t.members[2]);
		act(() => s().compare('Mew'));
		expect(hasText('On your card', byLabel('Compare Mew'))).toBe(true);
		expect(queryByLabel(/^Compare with /)).toBeNull();
		await click(byLabel('Close comparison'));
		expect(s()).toMatchObject({ compareSpecies: null, selectedUid: t.members[2].uid });
	});

	it('adds the candidate from the comparison when the team has room', async () => {
		const t = lib.teams.find((x) => x.members.length < 6)!;
		await openTeam(t);
		act(() => s().compare('Mew'));
		await click(button('Add to team', byLabel('Compare Mew')));
		expect(open().members.at(-1)!.species).toBe('Mew');
	});

	it('shows base stats, matchups and roles side by side in the inspector', async () => {
		// Roles are cached per format for the session, so this uses a format no other test opens.
		const t = newTeam({ name: 'Roles', format: 'gen6uu', gen: 6, members: [newSet('Garchomp', { ability: 'Rough Skin' })] });
		lib.teams.push(t);
		s().addTeams([t]);
		mockApi({ '/api/roles': () => ({ roles: { Mew: ['Support', 'Pivot'] } }) });
		await putOnCard(t, t.members[0]);
		act(() => s().compare('Mew'));
		await wait(20);
		const inspector = byLabel('Inspector');
		expect(hasText('Base stats, not trained values', inspector)).toBe(true);
		for (const row of ['Weak to', 'Resists', 'Immune to', 'Roles']) expect(hasText(row, inspector), row).toBe(true);
		await waitFor(() => expect(hasText('Support, Pivot', inspector)).toBe(true));
	});
});
