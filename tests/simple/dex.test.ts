import { describe, expect, it } from 'vitest';
import {
	abilitiesFor,
	calcStats,
	canUseSpecies,
	defaultAbility,
	effectiveness,
	evolutionLine,
	fieldsFor,
	formatLabel,
	formatsForGen,
	naturesFor,
	serebiiUrl,
	smogonUrl,
	speciesFor,
	speciesInTier,
	trainingLimits,
	typesForGen,
} from '@/lib/dex';
import { newSet, newTeam } from '@/lib/model';

describe('formats', () => {
	it('offers Smogon singles in every generation and OU everywhere', () => {
		for (let g = 1; g <= 9; g++) expect(formatsForGen(g).some((f) => f.id === `gen${g}ou`)).toBe(true);
	});

	it('has no RU before Gen 3 or in Gen 4, and no LC in Gen 2', () => {
		expect(formatsForGen(2).map((f) => f.name)).not.toContain('RU');
		expect(formatsForGen(4).map((f) => f.name)).not.toContain('RU');
		expect(formatsForGen(2).map((f) => f.name)).not.toContain('LC');
	});

	it('adds Doubles from Gen 3, VGC from Gen 5, National Dex from Gen 8 and Champions in Gen 9', () => {
		expect(formatsForGen(2).some((f) => f.group === 'Doubles')).toBe(false);
		expect(formatsForGen(3).some((f) => f.id === 'gen3doublesou')).toBe(true);
		expect(formatsForGen(4).some((f) => f.id.includes('vgc'))).toBe(false);
		expect(formatsForGen(5).some((f) => f.id === 'gen5vgc2013')).toBe(true);
		expect(formatsForGen(7).some((f) => f.id.includes('nationaldex'))).toBe(false);
		expect(formatsForGen(8).some((f) => f.id === 'gen8nationaldex')).toBe(true);
		expect(formatsForGen(8).some((f) => f.group === 'Champions')).toBe(false);
		expect(formatsForGen(9).filter((f) => f.group === 'Champions')).toHaveLength(4);
	});

	it('includes lower tiers under a higher one, and LC only alone', () => {
		const ou = formatsForGen(9).find((f) => f.id === 'gen9ou')!;
		expect(ou.tiers).toEqual(['OU', 'UU', 'RU', 'NU', 'PU', 'ZU']);
		expect(formatsForGen(9).find((f) => f.id === 'gen9lc')!.tiers).toEqual(['LC']);
	});

	it('labels teams by mode, generation and format', () => {
		expect(formatLabel({ mode: 'competitive', gen: 9, format: 'gen9ou' })).toBe('Gen 9 - OU');
		expect(formatLabel({ mode: 'casual', gen: 4, format: 'casual' })).toBe('Gen 4 - casual');
		expect(formatLabel({ mode: 'competitive', gen: 9, format: 'gen9mystery' })).toBe('Gen 9 - gen9mystery');
	});
});

describe('species availability', () => {
	it('only lets a casual team browse species introduced by its generation', () => {
		const gen1 = speciesFor(newTeam({ mode: 'casual', gen: 1, format: 'casual' }));
		expect(gen1.every((s) => s.gen <= 1)).toBe(true);
		expect(gen1.map((s) => s.name)).toContain('Mew');
		expect(gen1.map((s) => s.name)).not.toContain('Chikorita');
	});

	it('never offers Mega, Primal or Gigantamax formes', () => {
		const names = speciesFor(newTeam({ format: 'gen9nationaldex' })).map((s) => s.name);
		expect(names.some((n) => /-Mega|-Primal|-Gmax/.test(n))).toBe(false);
	});

	it('checks a species against the team generation', () => {
		expect(canUseSpecies(newTeam({ gen: 3, format: 'gen3ou' }), 'Garchomp')).toBe(false);
		expect(canUseSpecies(newTeam({ gen: 4, format: 'gen4ou' }), 'Garchomp')).toBe(true);
		expect(canUseSpecies(newTeam(), 'NotAPokemon')).toBe(false);
	});

	it('splits casual tabs by introduction generation', () => {
		const team = newTeam({ mode: 'casual', gen: 3, format: 'casual' });
		expect(speciesInTier(team, 'Gen 2').every((s) => s.gen === 2)).toBe(true);
		expect(speciesInTier(team, 'All').length).toBe(speciesFor(team).length);
	});

	it('walks the whole evolution line from the base form', () => {
		expect(evolutionLine(newTeam(), 'Charmeleon')).toEqual(['Charmander', 'Charmeleon', 'Charizard']);
		expect(evolutionLine(newTeam(), 'NotAPokemon')).toEqual(['NotAPokemon']);
	});
});

describe('fields by generation', () => {
	it('has no abilities, natures or Tera before their generation', () => {
		expect(fieldsFor({ gen: 2, mode: 'competitive', format: 'gen2ou' })).toMatchObject({ ability: false, nature: false, item: true, dv: true, tera: false });
		expect(fieldsFor({ gen: 1, mode: 'competitive', format: 'gen1ou' })).toMatchObject({ item: false, gender: false, shiny: false });
		expect(fieldsFor({ gen: 9, mode: 'competitive', format: 'gen9ou' })).toMatchObject({ ability: true, nature: true, tera: true, ivs: true, level: true });
		expect(fieldsFor({ gen: 8, mode: 'competitive', format: 'gen8ou' })).toMatchObject({ dynamax: true, tera: false });
	});

	it('hides training fields in casual teams', () => {
		expect(fieldsFor({ gen: 9, mode: 'casual', format: 'casual' })).toMatchObject({ evs: false, ivs: false, nature: false, level: false, tera: false, ability: true, item: true });
	});

	it('uses Stat Points in Champions and EVs elsewhere', () => {
		expect(trainingLimits({ mode: 'competitive', format: 'gen9championsou' })).toMatchObject({ perStat: 32, total: 66, label: 'SP' });
		expect(trainingLimits({ mode: 'competitive', format: 'gen9ou' })).toMatchObject({ perStat: 252, total: 510, step: 4, label: 'EV' });
	});

	it('only lists natures and abilities from Gen 3', () => {
		expect(naturesFor(newTeam({ gen: 2, format: 'gen2ou' }))).toEqual([]);
		expect(naturesFor(newTeam())).toHaveLength(25);
		expect(abilitiesFor(newTeam({ gen: 2, format: 'gen2ou' }), 'Pikachu')).toEqual([]);
	});

	it('defaults to a legal ability, and to the first one in casual', () => {
		expect(defaultAbility(newTeam(), 'Garchomp')).toBe('Rough Skin');
		expect(defaultAbility(newTeam({ mode: 'casual', format: 'casual' }), 'Garchomp')).toBe('Sand Veil');
	});
});

describe('types and stats', () => {
	it('has 15 types in Gen 1, 17 from Gen 2 and 18 from Gen 6', () => {
		expect(typesForGen(1)).toHaveLength(15);
		expect(typesForGen(5)).toHaveLength(17);
		expect(typesForGen(6)).toHaveLength(18);
	});

	it('combines dual-type effectiveness, including immunities', () => {
		expect(effectiveness(newTeam(), 'Ice', ['Dragon', 'Ground'])).toBe(4);
		expect(effectiveness(newTeam(), 'Electric', ['Ground', 'Water'])).toBe(0);
		expect(effectiveness(newTeam(), 'Fire', ['Water', 'Dragon'])).toBe(0.25);
	});

	it('calculates level 100 stats with nature', () => {
		const set = newSet('Garchomp', { nature: 'Jolly', evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 } });
		expect(calcStats(newTeam(), set)).toEqual({ hp: 357, atk: 359, def: 226, spa: 176, spd: 207, spe: 333 });
	});

	it('scales HP with level', () => {
		const at = (level: number) => calcStats(newTeam(), newSet('Garchomp', { level }))!.hp;
		expect(at(50)).toBeLessThan(at(100));
	});

	it('returns no stats for an unknown species', () => {
		expect(calcStats(newTeam(), newSet('NotAPokemon'))).toBeNull();
	});
});

describe('external links', () => {
	it('builds Smogon and Serebii URLs for the generation', () => {
		expect(smogonUrl(9, 'Iron Valiant')).toBe('https://www.smogon.com/dex/sv/pokemon/iron-valiant/');
		expect(smogonUrl(4, 'Mr. Mime')).toBe('https://www.smogon.com/dex/dp/pokemon/mr-mime/');
		expect(serebiiUrl(9, 1, 'Bulbasaur')).toBe('https://www.serebii.net/pokedex-sv/bulbasaur/');
		expect(serebiiUrl(3, 25, 'Pikachu')).toBe('https://www.serebii.net/pokedex-rs/025.shtml');
	});
});
