import { describe, expect, it } from 'vitest';
import { itemsFor, searchItems } from '../dex';
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
