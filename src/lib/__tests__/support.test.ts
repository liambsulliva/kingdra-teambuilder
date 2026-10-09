import { describe, expect, it } from 'vitest';
import { newTeam } from '../model';
import { supportFor } from '../support';

const team = newTeam({ name: 'Test', gen: 9, format: 'gen9ou' });
const group = (groups: { name: string; moves: string[] }[], name: string) =>
	groups.find((g) => g.name === name)?.moves ?? [];

describe('support moves', () => {
	it('lists the setup moves a species can learn, by category', async () => {
		const groups = await supportFor(team, 'Dragonite');
		expect(group(groups, 'Setup')).toContain('Dragon Dance');
	});

	it('counts an ability as available for weather and terrain categories', async () => {
		const groups = await supportFor(team, 'Pelipper');
		expect(group(groups, 'Weather')).toContain('Drizzle');
	});

	it('drops empty categories and keeps only the entries a species can use', async () => {
		const groups = await supportFor(team, 'Pikachu');
		expect(groups.every((g) => g.moves.length > 0)).toBe(true);
		expect(group(groups, 'Terrain')).toContain('Electric Terrain');
		expect(group(groups, 'Terrain')).not.toContain('Psychic Terrain');
	});
});
