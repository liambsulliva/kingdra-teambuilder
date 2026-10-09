import { describe, expect, it } from 'vitest';
import { migrateLegacy } from '../migrate';
import { rolesForSet } from '../roles';

describe('legacy MongoDB data', () => {
	it('converts PokeAPI-style names into Showdown sets', () => {
		const lib = migrateLegacy(['Rain'], [[{ name: 'kingdra', id: 230, level: 100, ability: 'swift-swim', nature: 'Modest', item: 'choice-specs', tera_type: 'water', moves: ['draco-meteor', 'surf', '', ''], iv: [31, 0, 31, 31, 31, 31], ev: [0, 0, 4, 252, 0, 252] }]]);
		expect(lib.teams[0].name).toBe('Rain');
		expect(lib.teams[0].members[0]).toMatchObject({ species: 'Kingdra', ability: 'Swift Swim', item: 'Choice Specs', teraType: 'Water', moves: ['Draco Meteor', 'Surf'] });
		expect(lib.teams[0].members[0].ivs.atk).toBe(0);
	});
});

describe('roles', () => {
	it('derives broad roles from a Smogon set', () => {
		expect(rolesForSet('Choice Scarf', { item: 'Choice Scarf', moves: ['U-turn'] })).toEqual(expect.arrayContaining(['Revenge killer', 'Pivot']));
	});
});
