import { describe, expect, it } from 'vitest';
import { exportSet, importSet, importTeams } from '../showdown';

const KINGDRA = `Seahorse (Kingdra) (F) @ Choice Specs
Ability: Swift Swim
Level: 99
Shiny: Yes
Tera Type: Water
EVs: 4 HP / 252 SpA / 252 Spe
Modest Nature
IVs: 0 Atk
- Draco Meteor
- Surf
- Hurricane
- Flip Turn`;

describe('Showdown text', () => {
	it('round-trips a set without losing fields', () => {
		const set = importSet(KINGDRA)!;
		expect(set).toMatchObject({ species: 'Kingdra', name: 'Seahorse', gender: 'F', level: 99, shiny: true, teraType: 'Water', nature: 'Modest' });
		expect(set.evs).toEqual({ hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 });
		expect(set.ivs.atk).toBe(0);
		const again = importSet(exportSet(set))!;
		expect({ ...again, uid: '' }).toEqual({ ...set, uid: '' });
	});

	it('creates new teams and reports unknown species instead of keeping them', () => {
		const { teams, skipped } = importTeams(`=== [gen9ou] Rain ===\n\n${KINGDRA}\n\nNotAPokemon\n- Tackle`, { mode: 'competitive', gen: 9, format: 'gen9ou' });
		expect(teams).toHaveLength(1);
		expect(teams[0]).toMatchObject({ name: 'Rain', format: 'gen9ou', gen: 9 });
		expect(teams[0].members.map((m) => m.species)).toEqual(['Kingdra']);
		expect(skipped).toEqual(['NotAPokemon']);
	});

	it('caps an imported team at six members', () => {
		const seven = Array.from({ length: 7 }, () => 'Pikachu\n- Thunderbolt').join('\n\n');
		const { teams, skipped } = importTeams(seven, { mode: 'competitive', gen: 9, format: 'gen9ou' });
		expect(teams[0].members).toHaveLength(6);
		expect(skipped).toHaveLength(1);
	});
});
