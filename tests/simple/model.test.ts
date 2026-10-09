import { describe, expect, it } from 'vitest';
import { BOX_SIZE, MAX_TEAM_SIZE, emptyLibrary, newBox, newSet, newTeam, normalizeLibrary, normalizeSet, statTable } from '@/lib/model';

describe('new sets and teams', () => {
	it('starts a set at level 100 with 31 IVs, no EVs and no moves', () => {
		const set = newSet('Pikachu');
		expect(set).toMatchObject({ species: 'Pikachu', name: '', level: 100, happiness: 255, dynamaxLevel: 10, moves: [], shiny: false });
		expect(set.ivs).toEqual(statTable(31));
		expect(set.evs).toEqual(statTable(0));
		expect(set.uid).toBeTruthy();
	});

	it('gives every set and team its own id', () => {
		expect(newSet('Pikachu').uid).not.toBe(newSet('Pikachu').uid);
		expect(newTeam().id).not.toBe(newTeam().id);
	});

	it('defaults a team to Gen 9 OU competitive', () => {
		expect(newTeam()).toMatchObject({ name: 'Untitled team', mode: 'competitive', gen: 9, format: 'gen9ou', members: [] });
	});

	it('gives a box thirty empty slots', () => {
		const box = newBox('Box 1');
		expect(box.slots).toHaveLength(BOX_SIZE);
		expect(box.slots.every((s) => s === null)).toBe(true);
	});

	it('starts a library with one team and one box', () => {
		const lib = emptyLibrary();
		expect(lib.version).toBe(2);
		expect(lib.teams.map((t) => t.name)).toEqual(['Team 1']);
		expect(lib.boxes.map((b) => b.name)).toEqual(['Box 1']);
	});
});

describe('normalizing sets', () => {
	it('clamps level, happiness, Dynamax level, EVs and IVs to their ranges', () => {
		const set = normalizeSet({
			species: 'Pikachu',
			level: 900,
			happiness: -4,
			dynamaxLevel: 40,
			evs: { hp: 999, atk: -1, def: 4.4, spa: 0, spd: 0, spe: 0 },
			ivs: { hp: 99, atk: -3, def: 31, spa: 31, spd: 31, spe: 31 },
		});
		expect(set.level).toBe(100);
		expect(set.happiness).toBe(0);
		expect(set.dynamaxLevel).toBe(10);
		expect(set.evs).toMatchObject({ hp: 255, atk: 0, def: 4 });
		expect(set.ivs).toMatchObject({ hp: 31, atk: 0 });
	});

	it('fills missing or non-numeric stats with the defaults', () => {
		const set = normalizeSet({ species: 'Pikachu', evs: { hp: NaN } as never, ivs: undefined });
		expect(set.evs).toEqual(statTable(0));
		expect(set.ivs).toEqual(statTable(31));
	});

	it('drops blank moves and keeps at most four', () => {
		expect(normalizeSet({ species: 'Mew', moves: ['A', '', 'B', 'C', 'D', 'E'] }).moves).toEqual(['A', 'B', 'C', 'D']);
	});

	it('keeps an existing uid and makes one when missing', () => {
		expect(normalizeSet({ species: 'Mew', uid: 'keep-me' }).uid).toBe('keep-me');
		expect(normalizeSet({ species: 'Mew', uid: '' }).uid).toBeTruthy();
	});

	it('treats a level of zero as the default 100', () => {
		expect(normalizeSet({ species: 'Mew', level: 0 }).level).toBe(100);
	});
});

describe('normalizing libraries', () => {
	it('replaces anything that is not a library with an empty one', () => {
		for (const junk of [null, undefined, 42, 'x', {}, { teams: 'no' }]) {
			const lib = normalizeLibrary(junk);
			expect(lib.teams).toHaveLength(1);
			expect(lib.boxes).toHaveLength(1);
		}
	});

	it('caps teams at six members and drops non-object teams', () => {
		const members = Array.from({ length: 9 }, () => newSet('Pikachu'));
		const lib = normalizeLibrary({ teams: [null, 'x', { name: 'Big', members }], boxes: [] });
		expect(lib.teams).toHaveLength(1);
		expect(lib.teams[0].members).toHaveLength(MAX_TEAM_SIZE);
	});

	it('pads and trims boxes to thirty slots', () => {
		const lib = normalizeLibrary({ teams: [newTeam()], boxes: [{ id: 'b', name: 'Short', slots: [newSet('Mew')] }] });
		expect(lib.boxes[0].slots).toHaveLength(BOX_SIZE);
		expect(lib.boxes[0].slots[0]?.species).toBe('Mew');
		expect(lib.boxes[0].slots[1]).toBeNull();
	});

	it('fills team fields a stored team is missing', () => {
		const lib = normalizeLibrary({ teams: [{ name: 'Old' }] });
		expect(lib.teams[0]).toMatchObject({ name: 'Old', mode: 'competitive', gen: 9, format: 'gen9ou', members: [] });
	});

	it('gives an empty team list one team back', () => {
		expect(normalizeLibrary({ teams: [] }).teams.map((t) => t.name)).toEqual(['Team 1']);
	});
});
