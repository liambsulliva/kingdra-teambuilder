import { describe, expect, it } from 'vitest';
import { itemsFor, learnableMoves, searchItems } from '../dex';
import { newTeam } from '../model';

const items = itemsFor(newTeam({ gen: 9, format: 'gen9ou' }));
const names = (query: string) => searchItems(items, query).map((i) => i.name);

describe('item search', () => {
	it('finds an item by a phrase from its effect text', () => {
		expect(names('loses 1/10 its max HP')).toContain('Life Orb');
	});

	it('lists name matches before effect matches', () => {
		const hits = searchItems(items, 'orb');
		const byName = hits.filter((i) => i.name.toLowerCase().includes('orb'));
		expect(hits.slice(0, byName.length)).toEqual(byName);
	});

	it('returns every item for an empty query', () => {
		expect(searchItems(items, '   ')).toHaveLength(items.length);
	});
});

describe('moves by level', () => {
	const team = newTeam({ gen: 9, format: 'gen9ou' });
	const moves = async (species: string, level: number) => (await learnableMoves(team, species, level)).map((m) => m.name);

	it('drops a level-up move the Pokémon is below the level for', async () => {
		expect(await moves('Garchomp', 5)).not.toContain('Bite');
		expect(await moves('Garchomp', 27)).toContain('Bite');
	});

	it('keeps level-up moves at or below the level', async () => {
		expect(await moves('Garchomp', 5)).toContain('Sand Attack');
	});

	it('never limits TM, tutor or egg moves by level', async () => {
		expect(await moves('Kingdra', 5)).toContain('Draco Meteor');
	});
});
