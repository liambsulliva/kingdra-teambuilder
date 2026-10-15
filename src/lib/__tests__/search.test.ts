import { describe, expect, it } from 'vitest';
import { defaultLevel, getSpecies, moveIndex } from '../dex';
import { newTeam } from '../model';
import { matchesTerms, NO_TERMS, searchTerms, supportMoveIds } from '../search';

const ou = newTeam({ name: 'OU', gen: 9, format: 'gen9ou' });
const casual = newTeam({ name: 'Casual', mode: 'casual', gen: 9, format: 'casual' });

describe('search terms', () => {
	it('matches names only below three letters', () => {
		expect(searchTerms(ou, 'to')).toBe(NO_TERMS);
		expect(searchTerms(ou, ' u-')).toBe(NO_TERMS);
	});

	it('finds moves by any word, with or without punctuation', () => {
		expect([...searchTerms(ou, 'spikes').moves]).toEqual(expect.arrayContaining(['spikes', 'toxicspikes']));
		expect([...searchTerms(ou, 'Toxic Spikes').moves]).toEqual(['toxicspikes']);
		expect(searchTerms(ou, 'uturn').moves.has('uturn')).toBe(true);
		expect(searchTerms(ou, 'u-turn').moves.has('uturn')).toBe(true);
	});

	it('turns a support category into its moves', () => {
		expect([...searchTerms(ou, 'hazards').moves].sort()).toEqual(supportMoveIds('Hazards').sort());
		expect(supportMoveIds('All support')).toEqual([]);
	});

	it('finds roles in Competitive only, plus types and abilities', () => {
		expect(searchTerms(ou, 'hazard').roles).toEqual(['Hazard Setter', 'Hazard Removal']);
		expect(searchTerms(casual, 'hazard').roles).toEqual([]);
		expect(searchTerms(ou, 'dragon').types).toEqual(['Dragon']);
		expect(searchTerms(ou, 'intim').abilities.has('intimidate')).toBe(true);
	});

	it('matches a species by type, ability, role or a learned move', async () => {
		const index = await moveIndex(ou);
		const gyarados = getSpecies(ou, 'Gyarados')!;
		expect(matchesTerms(gyarados, searchTerms(ou, 'intimidate'), undefined, undefined)).toBe(true);
		expect(matchesTerms(gyarados, searchTerms(ou, 'flying'), undefined, undefined)).toBe(true);
		expect(matchesTerms(gyarados, searchTerms(ou, 'pivot'), ['Pivot'], undefined)).toBe(true);
		expect(matchesTerms(gyarados, searchTerms(ou, 'dragon dance'), undefined, index.get('Gyarados'))).toBe(true);
		// Moves wait for the index.
		expect(matchesTerms(gyarados, searchTerms(ou, 'dragon dance'), undefined, undefined)).toBe(false);
		expect(matchesTerms(gyarados, searchTerms(ou, 'sticky web'), undefined, index.get('Gyarados'))).toBe(false);
	});
});

describe('move index', () => {
	it('lists what every species in the format can learn', async () => {
		const index = await moveIndex(ou);
		expect(index.get('Toxapex')!.has('toxicspikes')).toBe(true);
		expect(index.get('Garchomp')!.has('stealthrock')).toBe(true);
		expect(index.get('Garchomp')!.has('stickyweb')).toBe(false);
		expect(moveIndex(ou)).toBe(moveIndex({ ...ou }));
	});

	it('uses Champions learnsets in Champions', async () => {
		const champions = newTeam({ name: 'Champions', gen: 9, format: 'gen9championsou' });
		const index = await moveIndex(champions);
		expect(index.size).toBeGreaterThan(0);
		for (const set of index.values()) expect(set.size).toBeGreaterThan(0);
	});

	it('starts new members at the format’s level', () => {
		expect(defaultLevel(ou)).toBe(100);
		expect(defaultLevel({ format: 'gen9lc' })).toBe(5);
		expect(defaultLevel({ format: 'gen9vgc2025regi' })).toBe(50);
		expect(defaultLevel({ format: 'gen9championsou' })).toBe(50);
	});
});
