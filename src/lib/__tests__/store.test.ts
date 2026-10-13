import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFancyMotion, readLastSelected, readSpriteSet, readTeamView, useStore } from '../store';
import { emptyLibrary } from '../model';

const team = () => useStore.getState().library.teams[0];

describe('store rules', () => {
	beforeEach(() => useStore.getState().hydrate(emptyLibrary()));

	it('rejects a seventh member', () => {
		const s = useStore.getState();
		for (const p of ['Pikachu', 'Charizard', 'Lapras', 'Snorlax', 'Gengar', 'Dragonite']) expect(s.addMember(p)).toBe(true);
		expect(s.addMember('Mew')).toBe(false);
		expect(team().members).toHaveLength(6);
	});

	it('fills the next empty move slot, and replaces the active one', () => {
		const s = useStore.getState();
		s.addMember('Garchomp');
		const uid = team().members[0].uid;
		s.selectMember(uid);
		s.pickMove('Earthquake');
		s.pickMove('Dragon Claw');
		expect(team().members[0].moves.slice(0, 2)).toEqual(['Earthquake', 'Dragon Claw']);
		s.setInspector('moves', 0);
		useStore.getState().pickMove('Stone Edge');
		expect(team().members[0].moves.slice(0, 2)).toEqual(['Stone Edge', 'Dragon Claw']);
	});

	it('never defaults to an ability Smogon bans', () => {
		useStore.getState().addMember('Garchomp');
		expect(team().members[0].ability).toBe('Rough Skin');
	});

	it('blocks deleting the last team', () => {
		useStore.getState().deleteTeam(team().id);
		expect(useStore.getState().library.teams).toHaveLength(1);
	});
});

describe('moving members between teams', () => {
	beforeEach(() => useStore.getState().hydrate(emptyLibrary()));
	const teamNamed = (name: string) => useStore.getState().library.teams.find((t) => t.name === name)!;

	it('moves a member with its set, and leaves the source team', () => {
		const s = useStore.getState();
		s.addMember('Garchomp');
		const source = team();
		const garchomp = source.members[0];
		s.setMove(garchomp.uid, 0, 'Earthquake');
		s.createTeam({ name: 'Second' });
		s.openTeam(source.id);

		expect(useStore.getState().moveMemberToTeam(garchomp.uid, source.id, teamNamed('Second').id, 0)).toBe(true);
		expect(teamNamed('Team 1').members).toHaveLength(0);
		expect(teamNamed('Second').members).toEqual([{ ...garchomp, moves: ['Earthquake', '', '', ''] }]);
	});

	it('refuses a full team and leaves both teams alone', () => {
		const s = useStore.getState();
		s.addMember('Garchomp');
		const source = team();
		s.createTeam({ name: 'Second' });
		for (const p of ['Pikachu', 'Charizard', 'Lapras', 'Snorlax', 'Gengar', 'Dragonite']) s.addMemberToTeam(teamNamed('Second').id, p);
		s.openTeam(source.id);

		expect(useStore.getState().moveMemberToTeam(source.members[0].uid, source.id, teamNamed('Second').id)).toBe(false);
		expect(teamNamed('Team 1').members).toHaveLength(1);
		expect(teamNamed('Second').members).toHaveLength(6);
	});

	it('swaps with the member on the slot it lands on, even when the target is full', () => {
		const s = useStore.getState();
		s.addMember('Garchomp');
		const source = team();
		const garchomp = source.members[0];
		s.createTeam({ name: 'Second' });
		for (const p of ['Pikachu', 'Charizard', 'Lapras', 'Snorlax', 'Gengar', 'Dragonite']) s.addMemberToTeam(teamNamed('Second').id, p);
		const displaced = teamNamed('Second').members[2];
		s.openTeam(source.id);

		expect(useStore.getState().moveMemberToTeam(garchomp.uid, source.id, teamNamed('Second').id, 2)).toBe(true);
		expect(teamNamed('Second').members).toHaveLength(6);
		expect(teamNamed('Second').members[2]).toEqual(garchomp);
		expect(teamNamed('Team 1').members).toEqual([displaced]);
	});

	it('swaps with a member on a team that still has room', () => {
		const s = useStore.getState();
		s.addMember('Garchomp');
		const source = team();
		const garchomp = source.members[0];
		s.createTeam({ name: 'Second' });
		s.addMemberToTeam(teamNamed('Second').id, 'Pikachu');
		const pikachu = teamNamed('Second').members[0];
		s.openTeam(source.id);

		expect(useStore.getState().moveMemberToTeam(garchomp.uid, source.id, teamNamed('Second').id, 0)).toBe(true);
		expect(teamNamed('Second').members).toEqual([garchomp]);
		expect(teamNamed('Team 1').members).toEqual([pikachu]);
	});

	it('does nothing when the target is the member’s own team', () => {
		useStore.getState().addMember('Garchomp');
		const source = team();
		expect(useStore.getState().moveMemberToTeam(source.members[0].uid, source.id, source.id)).toBe(false);
		expect(team().members).toHaveLength(1);
	});
});

describe('moving a member as an evolution', () => {
	beforeEach(() => useStore.getState().hydrate(emptyLibrary()));
	const teamNamed = (name: string) => useStore.getState().library.teams.find((t) => t.name === name)!;

	it('moves the member as that evolution, with the same set', () => {
		const s = useStore.getState();
		s.addMember('Charmander');
		const source = team();
		s.updateSet(source.members[0].uid, { name: 'Sparky', level: 80 });
		s.setMove(source.members[0].uid, 0, 'Ember');
		s.createTeam({ name: 'Second' });
		s.openTeam(source.id);
		const before = team().members[0];

		expect(useStore.getState().moveMemberToTeam(before.uid, source.id, teamNamed('Second').id, 0, 'Charmeleon')).toBe(true);
		expect(teamNamed('Team 1').members).toHaveLength(0);
		expect(teamNamed('Second').members).toEqual([{ ...before, species: 'Charmeleon' }]);
	});

	it("moves the card's own stage unchanged, as its party sprite would", () => {
		const s = useStore.getState();
		s.addMember('Charmander');
		const source = team();
		s.createTeam({ name: 'Second' });
		s.openTeam(source.id);
		const before = team().members[0];

		expect(useStore.getState().moveMemberToTeam(before.uid, source.id, teamNamed('Second').id, undefined, 'Charmander')).toBe(true);
		expect(teamNamed('Second').members).toEqual([before]);
	});

	it('refuses an evolution the target generation does not have', () => {
		const s = useStore.getState();
		s.addMember('Gabite');
		const source = team();
		s.createTeam({ name: 'Old', gen: 3, format: 'gen3ou' });
		s.openTeam(source.id);

		expect(useStore.getState().moveMemberToTeam(source.members[0].uid, source.id, teamNamed('Old').id, undefined, 'Garchomp')).toBe(false);
		expect(team().members).toHaveLength(1);
		expect(teamNamed('Old').members).toHaveLength(0);
	});
});

describe('card sprite set', () => {
	beforeEach(() => localStorage.clear());

	it('defaults to Black/White, then remembers the X/Y choice', () => {
		expect(readSpriteSet()).toBe('bw');
		useStore.getState().setSpriteSet('xy');
		expect(useStore.getState().spriteSet).toBe('xy');
		expect(readSpriteSet()).toBe('xy');
		useStore.getState().setSpriteSet('bw');
		expect(readSpriteSet()).toBe('bw');
	});
});

describe('team list view', () => {
	beforeEach(() => localStorage.clear());

	it('defaults to the list, then remembers cards for this viewer', () => {
		expect(readTeamView()).toBe('list');
		useStore.getState().setTeamView('cards');
		expect(useStore.getState().teamView).toBe('cards');
		expect(readTeamView()).toBe('cards');
		useStore.getState().setTeamView('list');
		expect(readTeamView()).toBe('list');
	});
});

describe('fancy animations', () => {
	beforeEach(() => localStorage.clear());

	it('defaults to on, then remembers turning them off for this viewer', () => {
		expect(readFancyMotion()).toBe(true);
		useStore.getState().setFancyMotion(false);
		expect(useStore.getState().fancyMotion).toBe(false);
		expect(readFancyMotion()).toBe(false);
		useStore.getState().setFancyMotion(true);
		expect(readFancyMotion()).toBe(true);
	});
});

describe('per-viewer preferences with blocked storage', () => {
	it('fall back to their defaults when storage cannot be read', () => {
		const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('SecurityError');
		});
		try {
			expect(readSpriteSet()).toBe('bw');
			expect(readTeamView()).toBe('list');
			expect(readFancyMotion()).toBe(true);
			expect(readLastSelected()).toEqual({});
		} finally {
			spy.mockRestore();
		}
	});

	it('ignore a damaged last-selected record', () => {
		for (const bad of ['null', '5', '{bad']) {
			localStorage.setItem('kingdra.lastSelected', bad);
			expect(readLastSelected(), bad).toEqual({});
		}
	});
});
