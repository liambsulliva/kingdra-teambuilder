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
