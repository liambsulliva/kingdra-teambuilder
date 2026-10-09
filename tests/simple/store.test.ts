import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOX_SIZE, emptyLibrary, newBox, newSet, newTeam, type Library } from '@/lib/model';
import { useStore } from '@/lib/store';
import { resetStore } from '../helpers/env';

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
const named = (name: string) => s().library.teams.find((t) => t.name === name)!;
const lastToast = () => s().toasts.at(-1);
const SIX = ['Pikachu', 'Charizard', 'Lapras', 'Snorlax', 'Gengar', 'Dragonite'];

function library(partial: Partial<Library> = {}): Library {
	return { ...emptyLibrary(), ...partial };
}

beforeEach(() => resetStore());

describe('team lifecycle', () => {
	it('creates a team, opens it and closes the dialog', () => {
		s().setDialog('newTeam');
		s().createTeam({ name: 'Rain', gen: 8, format: 'gen8ou' });
		expect(open()).toMatchObject({ name: 'Rain', gen: 8, format: 'gen8ou' });
		expect(s().dialog).toBeNull();
		expect(s().library.teams).toHaveLength(2);
	});

	it('opening a team clears the card, preview and comparison, and resets the carousel to its tier', () => {
		s().addMember('Pikachu');
		s().selectMember(open().members[0].uid);
		s().setCarousel({ carouselRole: 'Pivot', carouselGen: 3 });
		s().createTeam({ name: 'UU', format: 'gen9uu' });
		expect(s()).toMatchObject({ selectedUid: null, previewSpecies: null, compareSpecies: null, carouselTab: 'UU', carouselRole: 'All roles', carouselGen: null, inspector: 'team' });
		s().createTeam({ name: 'Casual', mode: 'casual', format: 'casual' });
		expect(s().carouselTab).toBe('All');
	});

	it('renames with trimming, and ignores a blank name', () => {
		const id = open().id;
		s().renameTeam(id, '  Sun  ');
		expect(open().name).toBe('Sun');
		s().renameTeam(id, '   ');
		expect(open().name).toBe('Sun');
	});

	it('duplicates a team right after the original, with new member ids', () => {
		s().addMember('Pikachu');
		s().createTeam({ name: 'Second' });
		const src = named('Team 1');
		s().duplicateTeam(src.id);
		const names = s().library.teams.map((t) => t.name);
		expect(names).toEqual(['Team 1', 'Team 1 copy', 'Second']);
		const copy = named('Team 1 copy');
		expect(copy.id).not.toBe(src.id);
		expect(copy.members[0].species).toBe('Pikachu');
		expect(copy.members[0].uid).not.toBe(src.members[0].uid);
		expect(lastToast()?.message).toBe('Duplicated Team 1');
	});

	it('ignores duplicating a team that does not exist', () => {
		s().duplicateTeam('nope');
		expect(s().library.teams).toHaveLength(1);
	});

	it('deletes a team and opens its neighbour, but never the last team', () => {
		s().createTeam({ name: 'B' });
		s().createTeam({ name: 'C' });
		s().deleteTeam(named('C').id);
		expect(open().name).toBe('B');
		s().deleteTeam(named('Team 1').id);
		expect(open().name).toBe('B');
		s().deleteTeam(named('B').id);
		expect(s().library.teams.map((t) => t.name)).toEqual(['B']);
		expect(lastToast()).toMatchObject({ kind: 'error', message: "You can't delete the last team" });
	});

	it('deleting a closed team leaves the open one open', () => {
		s().createTeam({ name: 'B' });
		s().deleteTeam(named('Team 1').id);
		expect(open().name).toBe('B');
	});

	it('appends imported teams and opens the last one', () => {
		s().addTeams([newTeam({ name: 'I1' }), newTeam({ name: 'I2' })]);
		expect(s().library.teams.map((t) => t.name)).toEqual(['Team 1', 'I1', 'I2']);
		expect(open().name).toBe('I2');
		s().addTeams([]);
		expect(s().library.teams).toHaveLength(3);
	});

	it('keeps the format valid when the generation changes', () => {
		const id = open().id;
		s().setTeamContext(id, { gen: 2 });
		expect(open().format).toBe('gen2ou');
		s().setTeamContext(id, { gen: 9, format: 'gen9vgc2025regi' });
		expect(open().format).toBe('gen9vgc2025regi');
		expect(s().carouselTab).toBe('All');
		s().setTeamContext(id, { mode: 'casual' });
		expect(open()).toMatchObject({ mode: 'casual', format: 'gen9vgc2025regi' });
		expect(s().carouselTab).toBe('All');
	});

	it('keeps sets untouched when the context changes', () => {
		s().addMember('Garchomp');
		const before = open().members[0];
		s().setTeamContext(open().id, { mode: 'casual', gen: 3 });
		expect(open().members[0]).toEqual(before);
	});

	it('hydrate keeps the open team when it still exists', () => {
		s().createTeam({ name: 'B' });
		const lib = s().library;
		s().hydrate(lib);
		expect(open().name).toBe('B');
		s().hydrate(library({ teams: [newTeam({ name: 'Other' })] }));
		expect(open().name).toBe('Other');
		expect(s().hydrated).toBe(true);
	});
});

describe('party members', () => {
	it('adds with the format level and a legal default ability', () => {
		s().addMember('Garchomp');
		expect(open().members[0]).toMatchObject({ species: 'Garchomp', level: 100, ability: 'Rough Skin' });
		s().createTeam({ name: 'VGC', format: 'gen9vgc2025regi' });
		s().addMember('Garchomp');
		expect(open().members[0].level).toBe(50);
		s().createTeam({ name: 'LC', format: 'gen9lc' });
		s().addMember('Gible');
		expect(open().members[0].level).toBe(5);
		s().createTeam({ name: 'Champions', format: 'gen9championsou' });
		s().addMember('Garchomp');
		expect(open().members[0].level).toBe(50);
	});

	it('inserts at an index', () => {
		s().addMember('Pikachu');
		s().addMember('Mew');
		s().addMember('Eevee', 1);
		expect(open().members.map((m) => m.species)).toEqual(['Pikachu', 'Eevee', 'Mew']);
	});

	it('rejects a seventh member with a toast and a shake', () => {
		SIX.forEach((p) => s().addMember(p));
		const before = s().rejectedAt;
		expect(s().addMember('Mew')).toBe(false);
		expect(open().members).toHaveLength(6);
		expect(s().rejectedAt).toBeGreaterThan(before);
		expect(lastToast()).toMatchObject({ kind: 'error', message: 'Team 1 is full: remove a member first' });
	});

	it('replaces the member under a drop on a full team, keeping its slot uid', () => {
		SIX.forEach((p) => s().addMember(p));
		const old = open().members[2];
		expect(s().addMember('Mew', 2)).toBe(true);
		expect(open().members[2]).toMatchObject({ species: 'Mew', uid: old.uid, moves: [] });
	});

	it('clears the preview when a member is added', () => {
		s().preview('Mew');
		s().addMember('Mew');
		expect(s().previewSpecies).toBeNull();
	});

	it('removes a member and takes it off the card', () => {
		s().addMember('Pikachu');
		const uid = open().members[0].uid;
		s().selectMember(uid);
		s().removeMember(uid);
		expect(open().members).toHaveLength(0);
		expect(s().selectedUid).toBeNull();
	});

	it('reorders members, clamping the index', () => {
		['Pikachu', 'Mew', 'Eevee'].forEach((p) => s().addMember(p));
		const pikachu = open().members[0].uid;
		s().reorderMember(pikachu, 2);
		expect(open().members.map((m) => m.species)).toEqual(['Mew', 'Eevee', 'Pikachu']);
		s().reorderMember(pikachu, 99);
		expect(open().members.map((m) => m.species)).toEqual(['Mew', 'Eevee', 'Pikachu']);
		s().reorderMember('missing', 0);
		expect(open().members.map((m) => m.species)).toEqual(['Mew', 'Eevee', 'Pikachu']);
	});

	it('edits, replaces and re-species a set', () => {
		s().addMember('Charmander');
		const uid = open().members[0].uid;
		s().updateSet(uid, { item: 'Life Orb', ability: 'Blaze' });
		expect(open().members[0]).toMatchObject({ item: 'Life Orb' });
		s().changeSpecies(uid, 'Charizard');
		expect(open().members[0]).toMatchObject({ species: 'Charizard', ability: 'Blaze', item: 'Life Orb' });
		s().updateSet(uid, { ability: 'Solar Power' });
		s().changeSpecies(uid, 'Charmander');
		expect(open().members[0].ability).toBe('Solar Power');
		s().replaceSet(uid, newSet('Squirtle', { uid: 'ignored' }));
		expect(open().members[0]).toMatchObject({ species: 'Squirtle', uid });
	});

	it('drops an ability the new species cannot have', () => {
		s().addMember('Pikachu');
		const uid = open().members[0].uid;
		s().changeSpecies(uid, 'Garchomp');
		expect(open().members[0].ability).toBe('Rough Skin');
	});

	it('swaps a candidate in as a fresh set in the same slot', () => {
		s().addMember('Pikachu');
		const old = open().members[0];
		s().updateSet(old.uid, { moves: ['Thunderbolt'], item: 'Light Ball' });
		s().compare('Garchomp');
		s().swapIn(old.uid, 'Garchomp');
		expect(open().members[0]).toMatchObject({ uid: old.uid, species: 'Garchomp', moves: [], item: '', ability: 'Rough Skin' });
		expect(s()).toMatchObject({ compareSpecies: null, previewSpecies: null, inspector: 'stats' });
	});

	it('selecting a member without an ability gives it the default', () => {
		s().addMember('Garchomp');
		const uid = open().members[0].uid;
		s().updateSet(uid, { ability: '' });
		s().selectMember(uid);
		expect(open().members[0].ability).toBe('Rough Skin');
	});
});

describe('moves', () => {
	beforeEach(() => {
		s().addMember('Garchomp');
		s().selectMember(open().members[0].uid);
	});
	const moves = () => open().members[0].moves;

	it('fills the next empty slot', () => {
		s().pickMove('Earthquake');
		s().pickMove('Outrage');
		expect(moves().slice(0, 2)).toEqual(['Earthquake', 'Outrage']);
	});

	it('takes a move off when it is picked again', () => {
		s().pickMove('Earthquake');
		s().pickMove('Earthquake');
		expect(moves()[0]).toBe('');
	});

	it('replaces the active slot and clears it', () => {
		['Earthquake', 'Outrage', 'Swords Dance', 'Fire Fang'].forEach((m) => s().pickMove(m));
		s().setInspector('moves', 3);
		s().pickMove('Stone Edge');
		expect(moves()).toEqual(['Earthquake', 'Outrage', 'Swords Dance', 'Stone Edge']);
		expect(s().activeMoveSlot).toBeNull();
	});

	it('refuses a fifth move with a hint', () => {
		['Earthquake', 'Outrage', 'Swords Dance', 'Fire Fang'].forEach((m) => s().pickMove(m));
		s().pickMove('Stone Edge');
		expect(moves()).not.toContain('Stone Edge');
		expect(lastToast()?.message).toBe('All four moves are set. Click a move slot to replace it');
	});

	it('swaps two slots when a set move is placed in another slot', () => {
		s().setMove(open().members[0].uid, 0, 'Earthquake');
		s().setMove(open().members[0].uid, 1, 'Outrage');
		s().setMove(open().members[0].uid, 1, 'Earthquake');
		expect(moves().slice(0, 2)).toEqual(['Outrage', 'Earthquake']);
	});

	it('does nothing without a member on the card', () => {
		s().selectMember(null);
		s().pickMove('Earthquake');
		expect(moves()).toEqual([]);
	});
});

describe('inspector routing', () => {
	it('opens Stats for a competitive member and the Pokédex for a casual one', () => {
		s().addMember('Pikachu');
		s().selectMember(open().members[0].uid);
		expect(s().inspector).toBe('stats');
		s().createTeam({ name: 'C', mode: 'casual', format: 'casual' });
		s().addMember('Pikachu');
		s().selectMember(open().members[0].uid);
		expect(s().inspector).toBe('pokedex');
		s().selectMember(null);
		expect(s().inspector).toBe('team');
	});

	it('keeps an editor view open when switching members', () => {
		s().addMember('Pikachu');
		s().addMember('Mew');
		s().selectMember(open().members[0].uid);
		s().setInspector('item');
		s().selectMember(open().members[1].uid);
		expect(s().inspector).toBe('item');
	});

	it('only remembers a move slot for the moves view', () => {
		s().setInspector('moves', 2);
		expect(s().activeMoveSlot).toBe(2);
		s().setInspector('stats', 2);
		expect(s().activeMoveSlot).toBeNull();
	});

	it('opens matchups for a type', () => {
		s().setMatchupType('Fire');
		expect(s()).toMatchObject({ matchupType: 'Fire', inspector: 'matchups' });
	});

	it('previews and compares candidates', () => {
		s().preview('Mew');
		expect(s()).toMatchObject({ previewSpecies: 'Mew', inspector: 'team' });
		s().addMember('Pikachu');
		s().selectMember(open().members[0].uid);
		s().preview('Mew');
		expect(s().inspector).toBe('compare');
		s().preview(null);
		expect(s().inspector).toBe('stats');
		s().compare('Mew');
		expect(s()).toMatchObject({ compareSpecies: 'Mew', compareTarget: open().members[0].uid, inspector: 'compare' });
		s().compare(null);
		expect(s().inspector).toBe('stats');
	});

	it('compares against the first member when nothing is on the card', () => {
		s().addMember('Pikachu');
		s().compare('Mew');
		expect(s().compareTarget).toBe(open().members[0].uid);
		s().setCompareTarget('other');
		expect(s().compareTarget).toBe('other');
	});

	it('the merged layout rests on the card instead of the team view', () => {
		s().setMerged(true);
		expect(s().inspector).toBe('card');
		s().addMember('Pikachu');
		s().selectMember(open().members[0].uid);
		expect(s().inspector).toBe('card');
		s().setMerged(false);
		expect(s().inspector).toBe('team');
	});
});

describe('moving members between teams', () => {
	it('adds a candidate to a closed team, or replaces the member under the drop when full', () => {
		s().createTeam({ name: 'Other' });
		s().openTeam(named('Team 1').id);
		const other = () => named('Other');
		expect(s().addMemberToTeam(other().id, 'Pikachu')).toBe(true);
		expect(lastToast()?.message).toBe('Pikachu added to Other');
		SIX.slice(1).forEach((p) => s().addMemberToTeam(other().id, p));
		expect(s().addMemberToTeam(other().id, 'Mew')).toBe(false);
		expect(lastToast()?.message).toBe('Other is full');
		expect(s().addMemberToTeam(other().id, 'Mew', 0)).toBe(true);
		expect(other().members[0].species).toBe('Mew');
		expect(s().addMemberToTeam('nope', 'Mew')).toBe(false);
	});

	it('refuses a species the target generation cannot use', () => {
		s().createTeam({ name: 'Old', gen: 1, format: 'gen1ou' });
		s().openTeam(named('Team 1').id);
		expect(s().addMemberToTeam(named('Old').id, 'Garchomp')).toBe(false);
		expect(lastToast()?.message).toBe("Garchomp can't be used in Old (Gen 1 - OU)");
	});

	it('routes an add to the open team through addMember', () => {
		expect(s().addMemberToTeam(open().id, 'Pikachu')).toBe(true);
		expect(open().members[0].species).toBe('Pikachu');
	});
});

describe('the Box', () => {
	const box = (i = 0) => s().library.boxes[i];

	it('stores a member in the first free slot and takes it back', () => {
		s().addMember('Pikachu');
		const uid = open().members[0].uid;
		s().selectMember(uid);
		s().storeInBox(uid);
		expect(open().members).toHaveLength(0);
		expect(box().slots[0]?.uid).toBe(uid);
		expect(s().selectedUid).toBeNull();
		expect(lastToast()?.message).toBe('Pikachu moved to Box 1');
		s().takeFromBox(0, 0);
		expect(open().members[0].uid).toBe(uid);
		expect(box().slots[0]).toBeNull();
	});

	it('swaps with what is stored in a chosen slot', () => {
		s().addMember('Pikachu');
		s().addMember('Mew');
		const [pikachu, mew] = open().members;
		s().storeInBox(pikachu.uid, 0, 5);
		s().storeInBox(mew.uid, 0, 5);
		expect(box().slots[5]?.species).toBe('Mew');
		expect(open().members.map((m) => m.species)).toEqual(['Pikachu']);
	});

	it('spills into the next box with room, or makes a new box', () => {
		const full = newBox('Full');
		full.slots = full.slots.map(() => newSet('Magikarp'));
		resetStore(library({ boxes: [full] }));
		s().addMember('Pikachu');
		s().storeInBox(open().members[0].uid);
		expect(s().library.boxes.map((b) => b.name)).toEqual(['Full', 'Box 2']);
		expect(box(1).slots[0]?.species).toBe('Pikachu');
	});

	it('takes into a full party only by swapping', () => {
		SIX.forEach((p) => s().addMember(p));
		const lib = s().library;
		lib.boxes[0].slots[0] = newSet('Mew');
		s().hydrate({ ...lib });
		s().takeFromBox(0, 0);
		expect(lastToast()?.message).toBe('Team 1 is full: drop onto a member to swap');
		s().takeFromBox(0, 0, 1);
		expect(open().members[1].species).toBe('Mew');
		expect(box().slots[0]?.species).toBe('Charizard');
		s().takeFromBox(0, 9);
		expect(open().members[1].species).toBe('Mew');
	});

	it('moves and swaps within and across boxes', () => {
		s().addBox();
		const lib = s().library;
		lib.boxes[0].slots[0] = newSet('Mew');
		lib.boxes[1].slots[3] = newSet('Eevee');
		s().hydrate({ ...lib });
		s().moveInBox(0, 0, 1, 3);
		expect(box(0).slots[0]?.species).toBe('Eevee');
		expect(box(1).slots[3]?.species).toBe('Mew');
		s().moveInBox(0, 0, 0, 29);
		expect(box(0).slots[0]).toBeNull();
		expect(box(0).slots[29]?.species).toBe('Eevee');
	});

	it('adds, renames and deletes boxes, but never the last one', () => {
		s().addBox();
		expect(s().boxIndex).toBe(1);
		expect(box(1).name).toBe('Box 2');
		s().renameBox(1, '  Legends ');
		expect(box(1).name).toBe('Legends');
		s().renameBox(1, '');
		expect(box(1).name).toBe('Legends');
		s().deleteBox(1);
		expect(s().library.boxes).toHaveLength(1);
		expect(s().boxIndex).toBe(0);
		expect(lastToast()?.message).toBe('Deleted Legends');
		s().deleteBox(0);
		expect(s().library.boxes).toHaveLength(1);
		expect(lastToast()?.message).toBe("You can't delete the last box");
	});

	it('keeps the box index on the same box when an earlier one is deleted', () => {
		s().addBox();
		s().addBox();
		s().setBoxIndex(2);
		s().deleteBox(0);
		expect(s().boxIndex).toBe(1);
		expect(box(s().boxIndex).name).toBe('Box 3');
	});

	it('opening or closing the box forgets the picked party member', () => {
		s().setBoxPartyUid('x');
		s().setBoxOpen(true);
		expect(s()).toMatchObject({ boxOpen: true, boxPartyUid: null });
		expect(box().slots).toHaveLength(BOX_SIZE);
	});
});

describe('feedback', () => {
	it('keeps the three newest toasts and dismisses them after four seconds', () => {
		vi.useFakeTimers();
		try {
			['a', 'b', 'c', 'd'].forEach((m) => s().toast('success', m));
			expect(s().toasts.map((t) => t.message)).toEqual(['b', 'c', 'd']);
			s().dismissToast(s().toasts[0].id);
			expect(s().toasts.map((t) => t.message)).toEqual(['c', 'd']);
			vi.advanceTimersByTime(4000);
			expect(s().toasts).toEqual([]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does nothing when applying a fix without one pending', () => {
		const before = s().library;
		s().applyFix();
		expect(s().library).toBe(before);
	});

	it('stores validation per team', () => {
		s().setValidation('t1', { byMember: {}, team: ['x'], count: 1 });
		expect(s().validation.t1.count).toBe(1);
	});

	it('remembers save status and dialogs', () => {
		s().setSave('error');
		s().setDialog('importTeam');
		expect(s()).toMatchObject({ save: 'error', dialog: 'importTeam' });
	});
});
