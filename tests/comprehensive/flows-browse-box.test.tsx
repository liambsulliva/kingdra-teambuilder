import { act } from 'react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { formatsForGen, getSpecies, speciesFor, speciesInTier } from '@/lib/dex';
import { BOX_SIZE, newSet, newTeam, type Library, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';
import { mockApi, resetStore, seedLocalLibrary } from '../helpers/env';
import { allByLabel, allByName, blur, button, byLabel, byName, click, dblclick, flush, hasText, key, queryButton, queryByLabel, renderApp, select, type, waitFor } from '../helpers/render';
import { buildStressLibrary, clone, type StressLibrary } from '../fixtures/library';
import { tierTabs as tabsFor } from '@/components/browse/BottomPanel';

const s = () => useStore.getState();
const CHAMPIONS_TIERED = ['gen9championsou', 'gen9championsuu'];
const open = () => s().library.teams.find((t) => t.id === s().openTeamId)!;
const panel = () => byLabel('Suggestions');
const cards = () => allByName(/^Add .+ to the team$/, panel()).map((el) => el.querySelector('.font-semibold')!.textContent!);
const tierTabs = () => [...panel().querySelectorAll('[role="tablist"] [role="tab"]')].map((t) => t.textContent);
const search = () => panel().querySelector<HTMLInputElement>('input[type="search"]')!;
const genSelect = () => panel().querySelector<HTMLSelectElement>('select[aria-label="Generation"]')!;
const drawer = () => queryByLabel('Box');
const boxCells = () => allByLabel(/, box slot \d+$/);
/** The carousel cross-fades lists (AnimatePresence, mode wait): let the old list leave. */
const settle = () => flush(2);

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

async function openTeam(t: Team) {
	if (open().id !== t.id) await click(byName(`Open ${t.name}`));
	await settle();
}

// Store-only: rendering the app here would cache empty roles for every format.
describe('the carousel’s default tab', () => {
	beforeEach(() => resetStore());

	it('opens every standard format on one of its own tabs', () => {
		for (let g = 1; g <= 9; g++)
			for (const f of formatsForGen(g).filter((x) => !CHAMPIONS_TIERED.includes(x.id))) {
				act(() => s().createTeam({ name: f.id, gen: g, format: f.id }));
				expect(tabsFor(open()), f.id).toContain(s().carouselTab);
			}
	});

	it('opens Champions OU and UU on one of their own tabs', () => {
		for (const id of CHAMPIONS_TIERED) {
			act(() => s().createTeam({ name: id, gen: 9, format: id }));
			expect(tabsFor(open()), id).toContain(s().carouselTab);
		}
	});
});

describe('suggestions carousel', () => {
	const roomy = newTeam({ name: 'Roomy', format: 'gen9ou', members: [newSet('Pikachu', { ability: 'Static' })] });
	const gen5 = newTeam({ name: 'Unova', gen: 5, format: 'gen5uu', members: [] });
	const dbl = newTeam({ name: 'Doubles', format: 'gen9doublesou', members: [] });
	const kanto = newTeam({ name: 'Kanto trip', mode: 'casual', gen: 3, format: 'casual', members: [] });
	beforeEach(() => start([roomy, gen5, dbl, kanto]));

	it('offers the tier tabs of every team’s format, with one of them selected', async () => {
		for (const t of lib.teams.filter((x) => !CHAMPIONS_TIERED.includes(x.format))) {
			await openTeam(t);
			const tabs = tierTabs();
			expect(tabs, t.name).toEqual(tabsFor(t));
			expect(panel().querySelector('[role="tab"][aria-selected="true"]'), t.name).toBeTruthy();
			if (t.mode === 'casual') expect(tabs).toEqual(['All', ...Array.from({ length: t.gen }, (_, i) => `Gen ${i + 1}`)]);
		}
	});

	it('shows each tier’s species, 60 at a time, loading more on scroll', async () => {
		await openTeam(roomy);
		for (const tab of ['OU', 'UU', 'RU', 'NU', 'PU', 'ZU']) {
			await click(button(tab, panel()));
			await settle();
			const expected = speciesInTier(roomy, tab).map((x) => x.name);
			expect(cards().length, tab).toBe(Math.min(60, expected.length));
			for (const name of cards()) expect(expected, `${tab}: ${name}`).toContain(name);
		}
		const all = speciesInTier(roomy, 'ZU').length;
		if (all > 60) {
			const list = panel().querySelector('.overflow-x-auto:not([role="tablist"])')!;
			await act(async () => void list.dispatchEvent(new Event('scroll', { bubbles: true })));
			expect(cards().length).toBe(Math.min(120, all));
		}
	});

	it('sorts by base stat total when no roles are known', async () => {
		await openTeam(roomy);
		const bst = (name: string) => Object.values(getSpecies(roomy, name)!.baseStats).reduce((a, b) => a + b, 0);
		const shown = cards().map(bst);
		expect(shown).toEqual([...shown].sort((a, b) => b - a));
	});

	it('searches the whole generation by name, and says when nothing matches', async () => {
		await openTeam(roomy);
		type(search(), 'char');
		await settle();
		const expected = speciesFor(roomy).filter((x) => x.name.toLowerCase().includes('char')).map((x) => x.name);
		expect(cards().sort()).toEqual(expected.slice(0, 60).sort());
		expect(panel().querySelector('[role="tab"][aria-selected="true"]')).toBeNull();
		type(search(), 'zzzz');
		await settle();
		expect(hasText('No Pokémon named “zzzz” in Gen 9.', panel())).toBe(true);
		await click(byLabel('Clear search', panel()));
		await settle();
		expect(cards().length).toBeGreaterThan(0);
	});

	it('filters by role, ranking species with known roles first', async () => {
		// The two weakest species in the tab, so ranking by roles visibly moves them to the front.
		// Roles are cached per format for the session, so this team uses a format nothing else opens.
		const sinnoh = newTeam({ name: 'Sinnoh UU', gen: 4, format: 'gen4uu', members: [] });
		const tier = speciesInTier(sinnoh, 'UU').sort((a, b) => Object.values(a.baseStats).reduce((x, y) => x + y) - Object.values(b.baseStats).reduce((x, y) => x + y));
		const [wall, breaker] = [tier[0].name, tier[1].name];
		mockApi({ '/api/roles': () => ({ roles: { [breaker]: ['Hazard Removal', 'Wallbreaker'], [wall]: ['Wall'] } }) });
		act(() => s().addTeams([sinnoh]));
		await settle();
		await waitFor(() => expect(hasText('Hazard Removal/Wallbreaker', panel())).toBe(true));
		await settle();
		expect(cards().slice(0, 2).sort()).toEqual([wall, breaker].sort());
		expect(hasText('No Smogon sets', panel())).toBe(true);
		select(panel().querySelector('select[aria-label="Role"]')!, 'Wall');
		await settle();
		expect(cards()).toEqual([wall]);
		select(panel().querySelector('select[aria-label="Role"]')!, 'All roles');
		await settle();
		expect(cards().length).toBe(Math.min(60, tier.length));
	});

	it('browses a lower generation without changing the team, and moves the team up for a higher one', async () => {
		await openTeam(roomy);
		select(genSelect(), '4');
		await settle();
		expect(s().carouselGen).toBe(4);
		expect(open().gen).toBe(9);
		for (const name of cards()) expect(getSpecies(roomy, name)!.gen, name).toBe(4);
		select(genSelect(), '9');
		expect(s().carouselGen).toBeNull();
		await openTeam(gen5);
		select(genSelect(), '8');
		expect(open()).toMatchObject({ gen: 8, format: 'gen8uu' });
	});

	it('maps the Ubers tab to doubles Ubers in Doubles', async () => {
		await openTeam(dbl);
		expect(tierTabs()).toEqual(['Ubers', 'DOU', 'DUU']);
		await click(button('Ubers', panel()));
		await settle();
		for (const name of cards()) expect(speciesInTier(dbl, 'DUber').map((x) => x.name)).toContain(name);
	});

	it('shows casual teams generation tabs without roles', async () => {
		await openTeam(kanto);
		expect(panel().querySelector('select[aria-label="Role"]')).toBeNull();
		expect(hasText('No Smogon sets', panel())).toBe(false);
		await click(button('Gen 2', panel()));
		await settle();
		for (const name of cards()) expect(getSpecies(kanto, name)!.gen).toBe(2);
		select(genSelect(), '1');
		await settle();
		expect(s().carouselTab).toBe('All');
		for (const name of cards()) expect(getSpecies(kanto, name)!.gen).toBe(1);
	});

	it('adds a clicked suggestion to the party, and refuses a seventh', async () => {
		await openTeam(roomy);
		const first = cards()[0];
		await click(byName(`Add ${first}`));
		expect(open().members.at(-1)!.species).toBe(first);
		await openTeam(lib.teams[0]);
		const before = open().members.length;
		await click(byName(`Add ${cards()[0]}`));
		expect(open().members).toHaveLength(before);
		expect(s().toasts.at(-1)?.message).toBe(`${lib.teams[0].name} is full: remove a member first`);
	});
});

describe('the PC Box', () => {
	beforeEach(() => start());
	const openBox = async () => {
		await click(button('Box', panel()));
		expect(drawer()).toBeTruthy();
	};
	const count = () => drawer()!.textContent!.match(/(\d+) \/ 30/)![1];

	it('opens and closes from the Box button, the close button, Escape and the backdrop', async () => {
		await openBox();
		expect(button('Box', panel()).getAttribute('aria-expanded')).toBe('true');
		await click(byLabel('Close box'));
		await flush();
		expect(s().boxOpen).toBe(false);
		await openBox();
		await key(window, 'Escape');
		expect(s().boxOpen).toBe(false);
		await openBox();
		await click(document.querySelector('.fixed.inset-0.top-14')!);
		expect(s().boxOpen).toBe(false);
	});

	it('pages through all four boxes and finds all 100 Pokémon', async () => {
		await openBox();
		let total = 0;
		for (let i = 0; i < lib.boxes.length; i++) {
			expect(boxCells()).toHaveLength(lib.boxes[i].slots.filter(Boolean).length);
			expect(Number(count())).toBe(lib.boxes[i].slots.filter(Boolean).length);
			expect(drawer()!.querySelectorAll('.grid.grid-cols-6 > div')).toHaveLength(BOX_SIZE);
			total += boxCells().length;
			if (i < lib.boxes.length - 1) await click(byLabel('Next box'));
		}
		expect(total).toBe(100);
		expect((byLabel('Next box') as HTMLButtonElement).disabled).toBe(true);
		for (let i = 0; i < lib.boxes.length - 1; i++) await click(byLabel('Previous box'));
		expect((byLabel('Previous box') as HTMLButtonElement).disabled).toBe(true);
		await click(button('Box 3', drawer()!));
		expect(s().boxIndex).toBe(2);
	});

	it('shows a stored set and moves it into a party with room', async () => {
		const roomy = lib.teams.find((t) => t.members.length < 6)!;
		await openTeam(roomy);
		await openBox();
		const slot = lib.boxes[0].slots.findIndex(Boolean);
		const stored = lib.boxes[0].slots[slot]!;
		await click(byLabel(`${stored.name || stored.species}, box slot ${slot + 1}`));
		expect(hasText(stored.name || stored.species, drawer()!)).toBe(true);
		if (stored.moves.length) expect(hasText(stored.moves.join(', '), drawer()!)).toBe(true);
		await click(button('Move to party', drawer()!));
		expect(open().members.at(-1)!.uid).toBe(stored.uid);
		expect(s().library.boxes[0].slots[slot]).toBeNull();
	});

	it('refuses to move into a full party', async () => {
		await openBox();
		const slot = lib.boxes[0].slots.findIndex(Boolean);
		const stored = lib.boxes[0].slots[slot]!;
		await click(byLabel(`${stored.name || stored.species}, box slot ${slot + 1}`));
		await click(button('Move to party', drawer()!));
		expect(s().library.boxes[0].slots[slot]?.uid).toBe(stored.uid);
		expect(s().toasts.at(-1)?.message).toBe(`${lib.teams[0].name} is full: drop onto a member to swap`);
	});

	it('picks a party member in the drawer and moves it into the box', async () => {
		await openBox();
		const m = lib.teams[0].members[1];
		await click(drawer()!.querySelector('[data-party-member][data-index="1"]')!);
		expect(s().boxPartyUid).toBe(m.uid);
		// Picking in the drawer leaves the card alone.
		expect(s().selectedUid).toBe(lib.teams[0].members[0].uid);
		await click(button('Move to box', drawer()!));
		expect(open().members.map((x) => x.uid)).not.toContain(m.uid);
		expect(s().library.boxes[0].slots.some((x) => x?.uid === m.uid)).toBe(true);
	});

	it('adds, renames and deletes boxes', async () => {
		await openBox();
		await click(byLabel('New box'));
		expect(s().library.boxes).toHaveLength(5);
		expect(s().boxIndex).toBe(4);
		await dblclick(button('Box 5', drawer()!));
		const input = drawer()!.querySelector<HTMLInputElement>('input')!;
		type(input, 'Legends');
		await blur(input);
		expect(s().library.boxes[4].name).toBe('Legends');
		await click(byLabel('Delete box'));
		await blur(button('Delete?', drawer()!));
		expect(queryButton('Delete?')).toBeNull();
		await click(byLabel('Delete box'));
		await click(button('Delete?', drawer()!));
		expect(s().library.boxes.map((b) => b.name)).toEqual(['Box 1', 'Box 2', 'Box 3', 'Box 4']);
	});

	it('cannot delete the only box', async () => {
		for (let i = 0; i < 3; i++) act(() => s().deleteBox(0));
		await openBox();
		expect((byLabel('Delete box') as HTMLButtonElement).disabled).toBe(true);
	});

	it('hides the desk party while the box is open', async () => {
		expect(document.querySelectorAll('[data-party]')).toHaveLength(1);
		await openBox();
		expect(document.querySelectorAll('[data-party]')).toHaveLength(1);
		expect(drawer()!.querySelector('[data-party]')).toBeTruthy();
	});
});
