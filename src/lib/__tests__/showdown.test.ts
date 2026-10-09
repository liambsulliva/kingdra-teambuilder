import { describe, expect, it } from 'vitest';
import { exportSet, importSet, importTeams, smogonPatch } from '../showdown';

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

describe('Smogon set loading', () => {
	it('keeps the ability a set names, or the species default when the set leaves it out', () => {
		expect(smogonPatch({ ability: ['Rough Skin', 'Iron Barbs'] }, 'Sand Stream').ability).toBe('Rough Skin');
		expect(smogonPatch({ moves: ['Earthquake'] }, 'Sand Stream').ability).toBe('Sand Stream');
	});

	it('takes the first EV and IV spread when a set lists alternatives', () => {
		const patch = smogonPatch({ evs: [{ atk: 252, spe: 252 }, { hp: 252, spd: 4 }] }, 'Defiant');
		expect(patch.evs).toEqual({ hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 });
	});
});
