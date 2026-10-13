import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyLibrary, newSet, newTeam } from '@/lib/model';
import { mockApi } from '../helpers/env';

const server = vi.hoisted(() => ({
	userId: 'user_1' as string | null,
	doc: null as Record<string, unknown> | null,
	updates: [] as unknown[],
	connects: 0,
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: server.userId }) }));
vi.mock('@/lib/db', () => ({
	default: async () => {
		server.connects++;
	},
	User: {
		findOne: () => ({ lean: async () => server.doc }),
		updateOne: async (_q: unknown, update: { $set: Record<string, unknown> }) => {
			server.updates.push(update.$set.library);
			server.doc = { ...(server.doc ?? {}), ...update.$set };
		},
	},
}));

import * as library from '@/app/api/library/route';
import * as roles from '@/app/api/roles/route';
import * as sets from '@/app/api/sets/route';
import * as suggestions from '@/app/api/suggestions/route';
import * as validate from '@/app/api/validate/route';

const req = (url: string, init?: RequestInit) => new Request(`http://localhost${url}`, init);
const put = (body: unknown) => library.PUT(req('/api/library', { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body) }));

beforeEach(() => {
	server.userId = 'user_1';
	server.doc = null;
	server.updates = [];
	server.connects = 0;
});

describe('/api/library', () => {
	it('refuses signed-out requests before touching the database', async () => {
		server.userId = null;
		expect((await library.GET()).status).toBe(401);
		expect((await put({ library: emptyLibrary() })).status).toBe(401);
		expect(server.connects).toBe(0);
	});

	it('returns null for a new account', async () => {
		expect(await (await library.GET()).json()).toEqual({ library: null });
		server.doc = { clerkUserId: 'user_1' };
		expect(await (await library.GET()).json()).toEqual({ library: null });
	});

	it('returns a stored library normalized', async () => {
		server.doc = { library: { teams: [{ name: 'Stored', members: [{ species: 'Mew', level: 400 }] }] } };
		const { library: lib } = await (await library.GET()).json();
		expect(lib.teams[0].name).toBe('Stored');
		expect(lib.teams[0].members[0].level).toBe(100);
		expect(lib.boxes).toHaveLength(1);
	});

	it('migrates a pre-redesign account once', async () => {
		server.doc = { teamNames: ['Old'], pokemonParty: [[{ name: 'kingdra', id: 230, ability: 'swift-swim', moves: ['surf'] }]] };
		const body = await (await library.GET()).json();
		expect(body.migrated).toBe(true);
		expect(body.library.teams[0]).toMatchObject({ name: 'Old' });
		expect(body.library.teams[0].members[0]).toMatchObject({ species: 'Kingdra', ability: 'Swift Swim', moves: ['Surf'] });
	});

	it('saves a normalized library with a fresh timestamp', async () => {
		const lib = { ...emptyLibrary(), updatedAt: 1, teams: [newTeam({ name: 'Saved', members: [newSet('Mew', { level: 0 })] })] };
		const res = await put({ library: lib });
		expect(res.status).toBe(200);
		const { updatedAt } = await res.json();
		expect(updatedAt).toBeGreaterThan(1);
		expect(server.updates).toHaveLength(1);
		expect((server.doc!.library as typeof lib).teams[0].members[0].level).toBe(100);
	});

	it('rejects bad JSON and a missing library', async () => {
		expect((await put('{not json')).status).toBe(400);
		expect((await put({})).status).toBe(400);
		expect(server.updates).toHaveLength(0);
	});

	it('prefers the new library over leftover pre-redesign fields, and treats an empty old party as a new account', async () => {
		server.doc = { library: { teams: [{ name: 'New' }] }, teamNames: ['Old'], pokemonParty: [[{ name: 'mew', id: 151 }]] };
		const body = await (await library.GET()).json();
		expect(body.library.teams[0].name).toBe('New');
		expect(body.migrated).toBeUndefined();
		server.doc = { pokemonParty: [] };
		expect(await (await library.GET()).json()).toEqual({ library: null });
	});

	// Known issue: `body.library` is read off a null body, so the route throws instead of answering 400.
	it.fails('rejects a JSON null body', async () => {
		expect((await put('null')).status).toBe(400);
	});
});

describe('/api/roles', () => {
	it('rejects an unknown format', async () => {
		expect((await roles.GET(req('/api/roles?format=../../etc'))).status).toBe(400);
	});

	it('derives the two most common roles per species from Smogon sets', async () => {
		mockApi({
			'sets/gen9ou.json': () => ({
				Garchomp: {
					'Swords Dance': { moves: ['Swords Dance', 'Earthquake'] },
					'Stealth Rock': { moves: ['Stealth Rock', 'Earthquake'] },
					'Choice Scarf': { item: 'Choice Scarf', moves: ['Earthquake'] },
				},
			}),
		});
		const { roles: out } = await (await roles.GET(req('/api/roles?format=gen9ou'))).json();
		expect(out.Garchomp).toHaveLength(2);
		expect(out.Garchomp).toEqual(expect.arrayContaining(['Setup Sweeper']));
	});

	it('returns no roles when the upstream is down', async () => {
		mockApi({ 'sets/gen9uu.json': () => new Response('', { status: 503 }) });
		expect(await (await roles.GET(req('/api/roles?format=gen9uu'))).json()).toEqual({ roles: {} });
	});
});

describe('/api/sets', () => {
	it('needs a valid format and a species', async () => {
		expect((await sets.GET(req('/api/sets?format=gen9ou'))).status).toBe(400);
		expect((await sets.GET(req('/api/sets?format=bad&species=Mew'))).status).toBe(400);
	});

	it('returns one species’ sets, or none', async () => {
		mockApi({ 'sets/gen9ou.json': () => ({ Mew: { Utility: { moves: ['Will-O-Wisp'] } } }) });
		expect(await (await sets.GET(req('/api/sets?format=gen9ou&species=Mew'))).json()).toEqual({ sets: { Utility: { moves: ['Will-O-Wisp'] } } });
		expect(await (await sets.GET(req('/api/sets?format=gen9ou&species=Pikachu'))).json()).toEqual({ sets: {} });
	});

	it('returns no sets when the upstream is down', async () => {
		mockApi({ 'sets/gen8ou.json': () => new Response('', { status: 500 }) });
		expect(await (await sets.GET(req('/api/sets?format=gen8ou&species=Mew'))).json()).toEqual({ sets: {} });
	});
});

describe('/api/suggestions', () => {
	it('needs a valid format and a species', async () => {
		expect((await suggestions.GET(req('/api/suggestions?species=Mew&format=x'))).status).toBe(400);
		expect((await suggestions.GET(req('/api/suggestions?format=gen9ou'))).status).toBe(400);
	});

	it('ranks moves by usage, keeps set moves, and drops rare and "Nothing" moves', async () => {
		mockApi({
			'stats/gen7ou.json': () => ({ pokemon: { Mew: { moves: { 'Will-O-Wisp': 0.6, Nothing: 0.9, Rare: 0.01, Taunt: 0.2 } } } }),
			'sets/gen7ou.json': () => ({ Mew: { Set: { moves: [['Psychic', 'Rare']] } } }),
		});
		const body = await (await suggestions.GET(req('/api/suggestions?format=gen7ou&species=Mew'))).json();
		expect(body.source).toBe('usage');
		expect(body.moves).toEqual([
			{ name: 'Will-O-Wisp', usage: 60 },
			{ name: 'Taunt', usage: 20 },
			{ name: 'Rare', usage: 1 },
			{ name: 'Psychic', usage: 0 },
		]);
	});

	it('defaults to Gen 9 OU and lets the CDN cache an answer', async () => {
		mockApi({ 'stats/gen9ou.json': () => ({ pokemon: { Mew: { moves: { Psychic: 0.5 } } } }) });
		const res = await suggestions.GET(req('/api/suggestions?species=Mew'));
		expect((await res.json()).moves).toEqual([{ name: 'Psychic', usage: 50 }]);
		expect(res.headers.get('Cache-Control')).toBeTruthy();
	});

	it('falls back to set moves, then to nothing', async () => {
		mockApi({
			'stats/gen6ou.json': () => new Response('', { status: 404 }),
			'sets/gen6ou.json': () => ({ Mew: { Set: { moves: ['Psychic'] } } }),
		});
		expect(await (await suggestions.GET(req('/api/suggestions?format=gen6ou&species=Mew'))).json()).toMatchObject({ source: 'sets', moves: [{ name: 'Psychic', usage: 0 }] });
		expect(await (await suggestions.GET(req('/api/suggestions?format=gen6ou&species=Pikachu'))).json()).toMatchObject({ source: 'none', moves: [] });
	});
});

describe('/api/validate', () => {
	const post = (body: unknown) => validate.POST(req('/api/validate', { method: 'POST', body: JSON.stringify(body) }));

	it('rejects a bad format or member list', async () => {
		expect((await post({ format: 'nope', members: [] })).status).toBe(400);
		expect((await post({ format: 'gen9ou', members: 'x' })).status).toBe(400);
		expect((await post({ format: 'gen9doesnotexist', members: [] })).status).toBe(400);
	});

	it('passes a legal team', async () => {
		const garchomp = newSet('Garchomp', {
			ability: 'Rough Skin',
			item: 'Rocky Helmet',
			nature: 'Jolly',
			teraType: 'Steel',
			evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 0, spe: 252 },
			moves: ['Earthquake', 'Dragon Tail', 'Stealth Rock', 'Spikes'],
		});
		const body = await (await post({ format: 'gen9ou', members: [garchomp] })).json();
		expect(body).toEqual({ byMember: {}, team: [], count: 0 });
	});

	// Known issue: the body is parsed outside a try, so bad JSON throws instead of answering 400.
	it.fails('rejects a body that is not JSON', async () => {
		expect((await validate.POST(req('/api/validate', { method: 'POST', body: '{not json' }))).status).toBe(400);
	});

	// Known issue: `m.moves.filter` throws on a member without a move list.
	it.fails('rejects a member without a move list', async () => {
		expect((await post({ format: 'gen9ou', members: [{ species: 'Mew', uid: 'x' }] })).status).toBe(400);
	});

	it('attributes problems to the member they are about', async () => {
		const mewtwo = newSet('Mewtwo', { ability: 'Pressure', moves: ['Psystrike'], evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });
		const body = await (await post({ format: 'gen9ou', members: [mewtwo] })).json();
		expect(body.count).toBeGreaterThan(0);
		expect(body.byMember[mewtwo.uid].join(' ')).toMatch(/Mewtwo/);
	});
});
