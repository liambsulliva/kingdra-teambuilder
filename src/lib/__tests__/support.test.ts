import { describe, expect, it } from 'vitest';
import { newTeam } from '../model';
import { SUPPORT, supportFor } from '../support';

const team = newTeam({ name: 'Test', gen: 9, format: 'gen9ou' });
const group = (groups: { name: string; moves: string[] }[], name: string) =>
	groups.find((g) => g.name === name)?.moves ?? [];

describe('support moves', () => {
	it('lists the hazards a species can set, by category', async () => {
		const groups = await supportFor(team, 'Garchomp');
		expect(group(groups, 'Hazards')).toEqual(
			expect.arrayContaining(['Stealth Rock', 'Spikes'])
		);
	});

	it('lists the status moves a species can learn', async () => {
		const groups = await supportFor(team, 'Pikachu');
		expect(group(groups, 'Status')).toContain('Thunder Wave');
		expect(group(groups, 'Momentum')).toContain('Volt Switch');
	});

	it('drops empty categories', async () => {
		const groups = await supportFor(team, 'Pikachu');
		expect(groups.find((g) => g.name === 'Hazards')).toBeUndefined();
		expect(groups.every((g) => g.moves.length > 0)).toBe(true);
	});

	it('only ever shows the listed moves', async () => {
		const listed = new Set(SUPPORT.flatMap((g) => g.moves));
		const groups = await supportFor(team, 'Dragonite');
		expect(groups.flatMap((g) => g.moves).every((m) => listed.has(m))).toBe(
			true
		);
		expect(groups.flatMap((g) => g.moves)).not.toContain('Dragon Dance');
	});
});
