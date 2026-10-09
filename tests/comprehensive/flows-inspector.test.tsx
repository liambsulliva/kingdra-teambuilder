import { act } from 'react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { abilitiesFor, calcStats, fieldsFor, getSpecies, itemsFor, learnableMoves, trainingLimits } from '@/lib/dex';
import { STATS, STAT_LABELS, newSet, newTeam, statTable, type Library, type StatID, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';
import { mockApi, seedLocalLibrary } from '../helpers/env';
import {
	allButtons,
	blur,
	button,
	byLabel,
	click,
	dblclick,
	flush,
	hasText,
	key,
	openDialog,
	queryButton,
	queryByLabel,
	renderApp,
	select,
	type,
	wait,
	waitFor,
} from '../helpers/render';
import { buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';

const s = () => useStore.getState();
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
const member = () => open().members.find((m) => m.uid === s().selectedUid)!;
const inspector = () => byLabel('Inspector');
const tabs = () => [...inspector().querySelectorAll(':scope > div:first-child button')].map((b) => [b.getAttribute('aria-label'), (b as HTMLButtonElement).disabled] as const);

let stress: StressLibrary;
let lib: Library;
beforeAll(async () => {
	stress = await buildStressLibrary();
});

async function start(extra: Team[] = []) {
	lib = clone(stress.library);
	lib.teams.push(...extra);
	seedLocalLibrary(lib);
	await renderApp();
}

async function putOnCard(t: Team, index: number) {
	if (open().id !== t.id) await click(byLabel(`Open ${t.name}`));
	if (s().selectedUid) await key(window, 'Escape');
	await click(document.querySelector(`[data-party-member][data-index="${index}"]`)!);
	await flush(2);
}

const view = async (label: string) => click(byLabel(label, inspector()));

// A known team for exact checks: Garchomp (Gen 9 OU), Snorlax (Gen 2 OU), Garchomp (Champions), Charizard (Gen 8 OU).
const ou = newTeam({ name: 'Known OU', format: 'gen9ou', members: [newSet('Garchomp', { ability: 'Rough Skin', nature: 'Jolly' }), newSet('Pikachu', { ability: 'Static' })] });
const gsc = newTeam({ name: 'Known GSC', gen: 2, format: 'gen2ou', members: [newSet('Snorlax')] });
const champs = newTeam({ name: 'Known Champions', format: 'gen9championsou', members: [newSet('Garchomp', { ability: 'Rough Skin', level: 50, nature: 'Jolly' })] });
const swsh = newTeam({ name: 'Known SwSh', gen: 8, format: 'gen8ou', members: [newSet('Charizard', { ability: 'Blaze' })] });
const casual = newTeam({ name: 'Known Casual', mode: 'casual', gen: 4, format: 'casual', members: [newSet('Pikachu', { ability: 'Static' }), newSet('Eevee', { ability: 'Run Away' })] });
const KNOWN = [ou, gsc, champs, swsh, casual];

describe('stats for every competitive member in the library', () => {
	beforeEach(() => start());

	it('shows each member’s calculated stats and its stored EVs and IVs', async () => {
		for (const t of lib.teams.filter((x) => x.mode === 'competitive')) {
			const f = fieldsFor(t);
			const limits = trainingLimits(t);
			for (const [i, m] of t.members.entries()) {
				await putOnCard(t, i);
				expect(s().inspector, t.name).toBe('stats');
				const stats = calcStats(t, m)!;
				for (const stat of STATS) {
					const ev = inspector().querySelector<HTMLInputElement>(`input[aria-label="${STAT_LABELS[stat]} ${limits.name}"]`)!;
					expect(ev.value, `${t.name} ${m.species} ${stat} EV`).toBe(String(m.evs[stat]));
					const row = ev.closest('.flex-col')!.firstElementChild!;
					expect(row.lastElementChild!.textContent, `${t.name} ${m.species} ${stat}`).toBe(String(stats[stat]));
					if (f.ivs && !(f.dv && stat === 'hp')) {
						const iv = inspector().querySelector<HTMLInputElement>(`input[aria-label="${STAT_LABELS[stat]} ${f.dv ? 'DVs' : 'IVs'}"]`)!;
						expect(iv.value).toBe(String(f.dv ? Math.floor(m.ivs[stat] / 2) : m.ivs[stat]));
					}
				}
				expect(hasText(`${limits.name} ${STATS.reduce((n, x) => n + m.evs[x], 0)} / ${limits.total}`, inspector()) || f.dv).toBe(true);
			}
		}
	});
});

describe('stats editing', () => {
	beforeEach(() => start(KNOWN));
	const ev = (stat: StatID, name = 'EVs') => inspector().querySelector<HTMLInputElement>(`input[aria-label="${STAT_LABELS[stat]} ${name}"]`)!;
	const slider = (stat: StatID, name = 'EVs') => inspector().querySelector<HTMLElement>(`[role="slider"][aria-label="${STAT_LABELS[stat]} ${name}"]`)!;
	const setEv = async (stat: StatID, v: number, name = 'EVs') => {
		type(ev(stat, name), String(v));
		await blur(ev(stat, name));
	};

	it('caps EVs at 252 per stat and 510 in total', async () => {
		await putOnCard(ou, 0);
		await setEv('hp', 300);
		expect(member().evs.hp).toBe(252);
		await setEv('atk', 252);
		await setEv('def', 252);
		expect(member().evs.def).toBe(6);
		expect(hasText('EVs 510 / 510', inspector())).toBe(true);
	});

	it('steps the slider by 4 (32 with Shift) and jumps with Home and End', async () => {
		await putOnCard(ou, 0);
		await key(slider('spe'), 'ArrowRight');
		expect(member().evs.spe).toBe(4);
		await key(slider('spe'), 'ArrowUp', { shiftKey: true });
		expect(member().evs.spe).toBe(36);
		await key(slider('spe'), 'ArrowLeft');
		expect(member().evs.spe).toBe(32);
		await key(slider('spe'), 'End');
		expect(member().evs.spe).toBe(252);
		await key(slider('spe'), 'Home');
		expect(member().evs.spe).toBe(0);
	});

	it('resets one stat on double-click, all EVs with Reset, and toggles the 0 Atk and 0 Spe IV presets', async () => {
		await putOnCard(ou, 0);
		await setEv('atk', 100);
		await dblclick(allButtons('EV', inspector())[1]);
		expect(member().evs.atk).toBe(0);
		await setEv('spa', 40);
		await click(button('Reset EVs', inspector()));
		expect(member().evs).toEqual(statTable(0));
		await click(button('0 Attack IVs (special attackers)'));
		expect(member().ivs.atk).toBe(0);
		await click(button('Max Attack IVs'));
		expect(member().ivs.atk).toBe(31);
		await click(button('0 Speed IVs (Trick Room)'));
		expect(member().ivs.spe).toBe(0);
		type(ev('def', 'IVs'), '12');
		await blur(ev('def', 'IVs'));
		expect(member().ivs.def).toBe(12);
		await dblclick(allButtons('IV', inspector())[2]);
		expect(member().ivs.def).toBe(31);
	});

	it('shows speed tiers and links the Smogon analysis for the generation', async () => {
		await putOnCard(ou, 0);
		const spe = calcStats(ou, ou.members[0])!.spe;
		expect(hasText(`Spe +1 ${Math.floor(spe * 1.5)} / +2 ${spe * 2} / +3 ${Math.floor(spe * 2.5)}`, inspector())).toBe(true);
		expect(inspector().querySelector('a')!.getAttribute('href')).toBe('https://www.smogon.com/dex/sv/pokemon/garchomp/');
		await click(button(/^Jolly/, inspector()));
		expect(s().inspector).toBe('nature');
	});

	it('uses DVs out of 15 in Gen 2, with no HP DV or EV total', async () => {
		await putOnCard(gsc, 0);
		expect(inspector().querySelector('input[aria-label="HP DVs"]')).toBeNull();
		type(ev('atk', 'DVs'), '7');
		await blur(ev('atk', 'DVs'));
		expect(member().ivs.atk).toBe(15);
		type(ev('atk', 'DVs'), '20');
		await blur(ev('atk', 'DVs'));
		expect(member().ivs.atk).toBe(31);
		expect(hasText('/ 510', inspector())).toBe(false);
	});

	it('uses Stat Points in Champions: 32 per stat, 66 in total, no IVs', async () => {
		await putOnCard(champs, 0);
		expect(hasText('Base / final at level 50, IVs 31', inspector())).toBe(true);
		expect(inspector().querySelector('input[aria-label="HP IVs"]')).toBeNull();
		await setEv('atk', 40, 'Stat Points');
		expect(member().evs.atk).toBe(32);
		await setEv('spe', 32, 'Stat Points');
		await setEv('hp', 32, 'Stat Points');
		expect(member().evs.hp).toBe(2);
		expect(hasText('Stat Points 66 / 66', inspector())).toBe(true);
	});
});

describe('the tab strip', () => {
	beforeEach(() => start(KNOWN));

	it('disables member tabs until a member is on the card', async () => {
		await click(byLabel(`Open ${ou.name}`));
		expect(tabs()).toEqual([
			['Team analysis', false],
			['Stats', true],
			['Level', true],
			['Ability', true],
			['Item', true],
			['Nature', true],
			['Tera', true],
			['Moves', true],
			['Matchups', true],
			['Details', true],
		]);
		await putOnCard(ou, 0);
		expect(tabs().every(([, disabled]) => !disabled)).toBe(true);
	});

	it('shows only the tabs a format has', async () => {
		await putOnCard(gsc, 0);
		expect(tabs().map(([l]) => l)).toEqual(['Team analysis', 'Stats', 'Level', 'Item', 'Moves', 'Matchups', 'Details']);
		await putOnCard(champs, 0);
		expect(tabs().map(([l]) => l)).toEqual(['Team analysis', 'Stats', 'Ability', 'Item', 'Nature', 'Moves', 'Matchups', 'Details']);
		await putOnCard(casual, 0);
		expect(tabs().map(([l]) => l)).toEqual(['Team analysis', 'Pokédex', 'Locations', 'Ability', 'Item', 'Moves', 'Matchups']);
		expect(s().inspector).toBe('pokedex');
	});

	it('switches views from the strip', async () => {
		await putOnCard(ou, 0);
		for (const label of ['Level', 'Ability', 'Item', 'Nature', 'Tera', 'Moves', 'Matchups', 'Details', 'Team analysis', 'Stats']) {
			await view(label);
			expect(byLabel(label, inspector()).getAttribute('aria-pressed'), label).toBe('true');
		}
	});
});

describe('moves', () => {
	beforeEach(() => start(KNOWN));
	const search = () => inspector().querySelector<HTMLInputElement>('input[type="search"]')!;
	const rows = () => [...inspector().querySelectorAll<HTMLButtonElement>('button[title]')].filter((b) => b.querySelector('.truncate'));
	const moveNames = () => rows().map((b) => b.querySelector('.truncate')!.childNodes[0].textContent);

	it('lists every learnable move, filters by name, type and category', async () => {
		await putOnCard(ou, 0);
		await view('Moves');
		const learnable = await learnableMoves(ou, 'Garchomp', 100);
		await waitFor(() => expect(moveNames()).toHaveLength(learnable.length));
		expect(search().placeholder).toBe(`Search ${learnable.length} learnable moves`);
		type(search(), 'quake');
		expect(moveNames()).toEqual(['Earthquake']);
		type(search(), 'fire');
		expect(moveNames().length).toBe(learnable.filter((m) => m.type === 'Fire' || m.name.toLowerCase().includes('fire')).length);
		type(search(), '');
		await click(button('Status', inspector()));
		expect(moveNames().length).toBe(learnable.filter((m) => m.category === 'Status').length);
		type(search(), 'zzzz');
		expect(hasText('No learnable moves match.', inspector())).toBe(true);
	});

	it('fills empty slots in order, marks used moves, and takes a used move off', async () => {
		await putOnCard(ou, 0);
		await view('Moves');
		await waitFor(() => expect(moveNames().length).toBeGreaterThan(10));
		type(search(), 'Earthquake');
		await click(rows()[0]);
		type(search(), 'Dragon Claw');
		await click(rows()[0]);
		expect(member().moves.slice(0, 2)).toEqual(['Earthquake', 'Dragon Claw']);
		expect(rows()[0].querySelector('svg')).toBeTruthy();
		await click(rows()[0]);
		expect(member().moves[1]).toBe('');
	});

	it('replaces the slot that was clicked on the card', async () => {
		await putOnCard(ou, 0);
		s().updateSet(member().uid, { moves: ['Earthquake', 'Dragon Claw', 'Swords Dance', 'Fire Fang'] });
		await click(document.querySelector('[data-move-slot="2"]')!);
		expect(hasText('Replacing Swords Dance', inspector())).toBe(true);
		await waitFor(() => expect(moveNames().length).toBeGreaterThan(10));
		type(search(), 'Stone Edge');
		await click(rows()[0]);
		expect(member().moves).toEqual(['Earthquake', 'Dragon Claw', 'Stone Edge', 'Fire Fang']);
	});

	it('ranks suggested moves first with their usage', async () => {
		mockApi({ '/api/suggestions': () => ({ moves: [{ name: 'Stealth Rock', usage: 71.2 }, { name: 'Earthquake', usage: 90 }], source: 'usage' }) });
		await putOnCard(ou, 0);
		await view('Moves');
		await waitFor(() => expect(hasText('Suggested', inspector())).toBe(true));
		expect(moveNames().slice(0, 2)).toEqual(['Earthquake', 'Stealth Rock']);
		expect(hasText('90%', inspector())).toBe(true);
		expect(hasText('All Moves', inspector())).toBe(true);
	});

	it('limits a Little Cup member to moves known by level 5', async () => {
		const lc = lib.teams.find((t) => t.format === 'gen9lc')!;
		await putOnCard(lc, 0);
		await view('Moves');
		const learnable = await learnableMoves(lc, lc.members[0].species, 5);
		await waitFor(() => expect(moveNames()).toHaveLength(learnable.length));
	});
});

describe('pickers', () => {
	beforeEach(() => start(KNOWN));

	it('picks every ability the species can have, marking the hidden one', async () => {
		await putOnCard(ou, 0);
		await view('Ability');
		const all = abilitiesFor(ou, 'Garchomp');
		for (const { ability } of all) {
			await click(button(new RegExp(`^${ability.name}`), inspector()));
			expect(member().ability).toBe(ability.name);
		}
		expect(hasText('Hidden', inspector())).toBe(true);
		await putOnCard(gsc, 0);
		expect(queryByLabel('Ability', inspector())).toBeNull();
	});

	it('searches items by name and effect, picks one and removes it', async () => {
		await putOnCard(ou, 0);
		await view('Item');
		expect(hasText(`${itemsFor(ou).length} held items in Gen 9`, inspector())).toBe(true);
		type(inspector().querySelector('input[type="search"]')!, 'loses 1/10');
		await click(button(/^Life Orb/, inspector()));
		expect(member().item).toBe('Life Orb');
		await click(button('Remove Life Orb', inspector()));
		expect(member().item).toBe('');
	});

	it('picks a nature from all 25', async () => {
		await putOnCard(ou, 0);
		await view('Nature');
		expect(inspector().querySelectorAll('.grid button')).toHaveLength(25);
		await click(button(/^Modest/, inspector()));
		expect(member().nature).toBe('Modest');
	});

	it('picks a Tera type, including Stellar', async () => {
		await putOnCard(ou, 0);
		await view('Tera');
		expect(inspector().querySelectorAll('button[aria-pressed]').length).toBeGreaterThanOrEqual(19);
		await click(button('Stellar', inspector()));
		expect(member().teraType).toBe('Stellar');
		await click(button('Fairy', inspector()));
		expect(member().teraType).toBe('Fairy');
	});

	it('sets the level by typing or with the presets', async () => {
		await putOnCard(ou, 0);
		await view('Level');
		const input = inspector().querySelector<HTMLInputElement>('input[aria-label="Level"]')!;
		type(input, '77');
		await blur(input);
		expect(member().level).toBe(77);
		await click(button('50', inspector()));
		expect(member().level).toBe(50);
		await click(button('5', inspector()));
		expect(member().level).toBe(5);
		type(input, '0');
		await blur(input);
		expect(member().level).toBe(1);
	});

	it('edits nickname, gender, happiness, Poké Ball and Hidden Power in Details', async () => {
		const gen7 = lib.teams.find((t) => t.format === 'gen7ou')!;
		const idx = gen7.members.findIndex((m) => m.species !== 'Shedinja');
		await putOnCard(gen7, idx);
		await view('Details');
		const nick = inspector().querySelector<HTMLInputElement>('input[placeholder]')!;
		type(nick, '  Sparky  ');
		await blur(nick);
		expect(member().name).toBe('Sparky');
		const genders = allButtons(/Male|Female|Random/, inspector());
		if (genders.length) {
			await click(genders.at(-1)!);
			expect(['M', 'F', '']).toContain(member().gender);
		}
		const happy = inspector().querySelector<HTMLInputElement>('input[aria-label="Happiness"]')!;
		type(happy, '0');
		await blur(happy);
		expect(member().happiness).toBe(0);
		select(inspector().querySelector('select[aria-label="Poké Ball"]')!, 'Ultra Ball');
		expect(member().pokeball).toBe('Ultra Ball');
		select(inspector().querySelector('select[aria-label="Poké Ball"]')!, 'Poke Ball');
		expect(member().pokeball).toBe('');
		select(inspector().querySelector('select[aria-label="Hidden Power type"]')!, 'Ice');
		expect(member().hpType).toBe('Ice');
	});

	it('edits Dynamax level and Gigantamax in Gen 8', async () => {
		await putOnCard(swsh, 0);
		await view('Details');
		const dmax = inspector().querySelector<HTMLInputElement>('input[aria-label="Dynamax level"]')!;
		type(dmax, '3');
		await blur(dmax);
		expect(member().dynamaxLevel).toBe(3);
		await click(inspector().querySelector('[role="switch"]')!);
		expect(member().gigantamax).toBe(true);
		// Hidden Power left the games in Gen 8.
		expect(inspector().querySelector('select[aria-label="Hidden Power type"]')).toBeNull();
	});

	it('shows a genderless species as genderless', async () => {
		const t = newTeam({ name: 'Genderless', format: 'gen9ou', members: [newSet('Magnezone', { ability: 'Sturdy' })] });
		s().addTeams([t]);
		await flush();
		await putOnCard(t, 0);
		await view('Details');
		expect(hasText('Genderless', inspector())).toBe(true);
	});
});

describe('analysis', () => {
	beforeEach(() => start(KNOWN));

	it('groups a member’s matchups by multiplier and highlights the clicked type', async () => {
		await putOnCard(ou, 0);
		await click(button('Dragon', byLabel('Garchomp set')));
		for (const g of ['Weak ×4', 'Weak ×2', 'Resists ×½', 'Immune']) expect(hasText(g, inspector()), g).toBe(true);
		const weak4 = [...inspector().querySelectorAll('section')].find((x) => x.textContent!.startsWith('Weak ×4'))!;
		expect(weak4.textContent).toContain('Ice');
		// Dragon hits Garchomp ×2, so it is highlighted in that group.
		expect(inspector().querySelector('.ring-accent')!.textContent).toBe('Dragon');
	});

	it('counts team weaknesses and coverage for every team in the library', async () => {
		for (const t of lib.teams.slice(0, 12)) {
			if (open().id !== t.id) await click(byLabel(`Open ${t.name}`));
			if (s().selectedUid) await key(window, 'Escape');
			expect(s().inspector).toBe('team');
			expect(hasText('Weak to', inspector()), t.name).toBe(true);
			expect(hasText('Hits super effectively', inspector()), t.name).toBe(true);
			expect(inspector().querySelectorAll('.grid.grid-cols-3 > div').length).toBe(2 * (t.gen === 1 ? 15 : t.gen < 6 ? 17 : 18));
		}
	});

	it('lists legality problems, fixes one after confirmation, and leaves decisions alone', async () => {
		const g = ou.members[0];
		mockApi({
			'/api/validate': () => ({
				byMember: { [g.uid]: ["Garchomp can't learn Spore.", 'Garchomp is tagged Uber, which is banned.'] },
				team: ['Your team has a problem.'],
				count: 3,
			}),
		});
		await click(byLabel(`Open ${ou.name}`));
		expect(hasText('Checking', inspector())).toBe(true);
		// updateSet edits members of the open team.
		act(() => s().updateSet(g.uid, { moves: ['Earthquake', 'Spore'] }));
		await wait(700);
		expect(hasText('3 Issues', inspector())).toBe(true);
		expect(hasText('Your team has a problem.', inspector())).toBe(true);
		expect(allButtons('Fix', inspector())).toHaveLength(1);
		await click(button('Fix', inspector()));
		await flush();
		expect(openDialog()!.textContent).toContain('Move 2: Spore → empty');
		await click(button('Cancel', openDialog()!));
		await flush();
		expect(open().members[0].moves).toContain('Spore');
		await click(button('Fix', inspector()));
		await flush();
		await click(button('Apply fix', openDialog()!));
		expect(open().members[0].moves).toEqual(['Earthquake', '']);
		expect(s().toasts.at(-1)?.message).toBe('Applied the fix to Garchomp');
	});

	it('flags the member and its rows on the card', async () => {
		const g = ou.members[0];
		mockApi({ '/api/validate': () => ({ byMember: { [g.uid]: ['Garchomp item Rocky Helmet is banned'] }, team: [], count: 1 }) });
		await click(byLabel(`Open ${ou.name}`));
		act(() => s().updateSet(g.uid, { item: 'Rocky Helmet' }));
		await wait(700);
		expect(document.querySelector('[data-party-member][data-index="0"] [aria-label="Has legality issues"]')).toBeTruthy();
		await putOnCard(ou, 0);
		expect(document.querySelector('[data-key-row="item"] .text-danger')).toBeTruthy();
	});

	it('does not validate casual teams', async () => {
		await click(byLabel(`Open ${casual.name}`));
		await wait(700);
		expect(s().validation[casual.id]).toEqual({ byMember: {}, team: [], count: 0 });
		expect(hasText('Legality', inspector())).toBe(false);
	});
});

describe('Pokédex and locations', () => {
	beforeEach(() => start(KNOWN));

	it('shows the Pokédex entry for a casual member', async () => {
		mockApi({
			'pokemon-species/25/': () => ({
				flavor_text_entries: [{ flavor_text: 'It keeps its tail raised\nto monitor its surroundings.', language: { name: 'en' }, version: { name: 'x' } }],
				genera: [{ genus: 'Mouse Pokémon', language: { name: 'en' } }],
				generation: { name: 'generation-i' },
				capture_rate: 190,
				gender_rate: 4,
				base_happiness: 50,
				is_baby: false,
				is_legendary: false,
				is_mythical: false,
				hatch_counter: 10,
				growth_rate: { name: 'medium-fast' },
				egg_groups: [{ name: 'ground' }, { name: 'fairy' }],
				evolves_from_species: { name: 'pichu' },
				varieties: [{ pokemon: { name: 'pikachu' } }, { pokemon: { name: 'pikachu-rock-star' } }],
			}),
		});
		await putOnCard(casual, 0);
		await waitFor(() => expect(hasText('Mouse Pokémon', inspector())).toBe(true));
		for (const text of ['It keeps its tail raised to monitor its surroundings.', 'Gen 1', '190', '50% ♀', 'Ground, Fairy', '10 Cycles', 'Medium Fast', 'Pichu', 'Pikachu Rock Star', `Total ${STATS.reduce((n, k) => n + getSpecies(casual, 'Pikachu')!.baseStats[k], 0)}`])
			expect(hasText(text, inspector()), text).toBe(true);
		expect(inspector().querySelector('a')!.getAttribute('href')).toBe('https://www.serebii.net/pokedex-dp/025.shtml');
	});

	it('explains when PokeAPI is unreachable', async () => {
		// Entries are cached per URL for the session, so this uses a species no other test fetched.
		await putOnCard(casual, 1);
		await waitFor(() => expect(hasText("Couldn't reach PokeAPI. Try again later.", inspector())).toBe(true));
	});

	it('lists encounters only from the team’s generation, or explains there are none', async () => {
		mockApi({
			'pokemon/25/encounters': () => [
				{ location_area: { name: 'viridian-forest' }, version_details: [{ version: { name: 'red' }, max_chance: 5 }] },
				{ location_area: { name: 'trophy-garden' }, version_details: [{ version: { name: 'platinum' }, max_chance: 10 }, { version: { name: 'diamond' }, max_chance: 8 }] },
			],
		});
		await putOnCard(casual, 0);
		await view('Locations');
		await waitFor(() => expect(hasText('Trophy Garden', inspector())).toBe(true));
		expect(hasText('Platinum 10%', inspector())).toBe(true);
		expect(hasText('Viridian Forest', inspector())).toBe(false);
		act(() => s().setTeamContext(casual.id, { gen: 6 }));
		await flush();
		expect(hasText('No wild encounters in Gen 6.', inspector())).toBe(true);
		expect(queryButton('Trophy Garden')).toBeNull();
	});
});
