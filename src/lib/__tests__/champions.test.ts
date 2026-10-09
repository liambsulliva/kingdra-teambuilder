import { describe, expect, it } from 'vitest';
import { calcStats, fieldsFor, formatsForGen, speciesFor, trainingLimits } from '../dex';
import { newSet, newTeam } from '../model';

const team = newTeam({ format: 'gen9championsou', gen: 9 });

describe('Pokémon Champions', () => {
	it('offers the Champions formats in gen 9', () => {
		expect(formatsForGen(9).filter((f) => f.group === 'Champions').map((f) => f.id)).toEqual([
			'gen9championsou',
			'gen9championsuu',
			'gen9championsbssregmb',
			'gen9championsvgc2026regmb',
		]);
	});

	it('uses stat points, fixed IVs, level 50 and no Tera', () => {
		expect(trainingLimits(team)).toMatchObject({ perStat: 32, total: 66, label: 'SP' });
		expect(fieldsFor(team)).toMatchObject({ statPoints: true, ivs: false, level: false, tera: false });
	});

	it("matches Showdown's Champions stat formula", () => {
		// Garchomp 108/130/95/80/85/102, Jolly, 32 Atk / 32 Spe / 2 HP.
		const set = newSet('Garchomp', { nature: 'Jolly', level: 50, evs: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 } });
		expect(calcStats(team, set)).toEqual({ hp: 185, atk: 182, def: 115, spa: 90, spd: 105, spe: 169 });
	});

	it('only lists species legal in Champions', () => {
		const names = speciesFor(team).map((s) => s.name);
		expect(names).toContain('Garchomp');
		expect(names).not.toContain('Kyurem');
	});
});
