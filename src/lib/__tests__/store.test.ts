import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';
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
