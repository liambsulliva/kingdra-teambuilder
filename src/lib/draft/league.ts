import { Dex } from '@pkmn/dex';
import { cellAt, readWorkbook, type CellValue, type Sheet, type Workbook } from './xlsx';
import type { Coach, ComplexBan, Found, League, LeagueSource, TierEntry } from './types';

const SHEETS = ['Rules', 'Tiers', 'Drafts', 'Dex', 'Data'];

const colName = (c: number) => {
	let s = '';
	for (let n = c; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
	return s;
};
const where = (sheet: Sheet, r: number, c: number) => `${sheet.name}!${colName(c)}${r}`;
const text = (v: CellValue | undefined) => (typeof v === 'string' ? v.trim() : '');
const num = (v: CellValue | undefined) => (typeof v === 'number' ? v : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : null);

// Names league sheets use that Showdown spells differently.
const ALIASES: Record<string, string> = {
	'tauros-aqua': 'Tauros-Paldea-Aqua',
	'tauros-blaze': 'Tauros-Paldea-Blaze',
	'tauros-combat': 'Tauros-Paldea-Combat',
	'tauros-paldea': 'Tauros-Paldea-Combat',
	'basculegion-m': 'Basculegion',
	'indeedee-m': 'Indeedee',
	'meowstic-m': 'Meowstic',
	'oinkologne-m': 'Oinkologne',
};

let speciesNames: string[] | null = null;

/** Optimal string alignment distance, so a swapped pair of letters counts as one edit. */
function distance(a: string, b: string) {
	const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
	for (let j = 1; j <= b.length; j++) d[0][j] = j;
	for (let i = 1; i <= a.length; i++)
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
		}
	return d[a.length][b.length];
}

/** The Showdown name for a species as a league sheet writes it, or null. Typos within one edit resolve when only one species is that close. */
export function resolveSpecies(raw: string): string | null {
	const name = raw.trim();
	if (!name) return null;
	const alias = ALIASES[name.toLowerCase()];
	const direct = Dex.species.get(alias ?? name);
	if (direct.exists) return direct.name;
	speciesNames ??= Dex.species.all().filter((s) => s.exists).map((s) => s.name);
	const lower = name.toLowerCase();
	const close = speciesNames.filter((s) => Math.abs(s.length - name.length) <= 1 && distance(s.toLowerCase(), lower) <= 1);
	return close.length === 1 ? close[0] : null;
}

/** The row whose cells label the tier blocks ("Pokemon" twice or more). */
function headerRow(sheet: Sheet, label: RegExp) {
	for (const [r, row] of sheet.rows) {
		let n = 0;
		for (const v of row.values()) if (label.test(text(v))) n++;
		if (n >= 2) return r;
	}
	return null;
}

interface TierBlocks {
	tiers: TierEntry[];
	banned: string[];
	complexBans: ComplexBan[];
	unmatched: Set<string>;
}

/** Reads the Tiers tab: a row of tier labels (points, Banned, Complex Bans) over a row of "Pokemon" headers. */
function readTiers(sheet: Sheet): TierBlocks | null {
	const h = headerRow(sheet, /^pok[eé]mon$/i);
	if (!h) return null;
	const header = sheet.rows.get(h)!;
	const starts = [...header.entries()].filter(([, v]) => /^pok[eé]mon$/i.test(text(v))).map(([c]) => c).sort((a, b) => a - b);
	const out: TierBlocks = { tiers: [], banned: [], complexBans: [], unmatched: new Set() };
	const seen = new Set<string>();
	starts.forEach((start, i) => {
		const end = (starts[i + 1] ?? sheet.maxCol + 1) - 1;
		const label = cellAt(sheet, h - 1, start);
		// The names sit in whichever column of the block holds the most Pokémon; a merged header can sit over a sprite column.
		let nameCol = start;
		let best = -1;
		for (let c = start; c <= end; c++) {
			let n = 0;
			for (let r = h + 1; r <= sheet.maxRow; r++) if (text(cellAt(sheet, r, c)) && resolveSpecies(text(cellAt(sheet, r, c)))) n++;
			if (n > best) [best, nameCol] = [n, c];
		}
		const points = num(label);
		const kind = points !== null ? 'tier' : /complex/i.test(text(label)) ? 'complex' : /ban/i.test(text(label)) ? 'banned' : null;
		if (!kind) return;
		for (let r = h + 1; r <= sheet.maxRow; r++) {
			const raw = text(cellAt(sheet, r, nameCol));
			if (!raw) continue;
			const species = resolveSpecies(raw);
			if (!species) {
				out.unmatched.add(raw);
				continue;
			}
			if (kind === 'banned') out.banned.push(species);
			else if (kind === 'complex') {
				const what = text(cellAt(sheet, r, nameCol + 1));
				if (what) out.complexBans.push({ species, with: what.replace(/\b\w/g, (m) => m.toUpperCase()) });
			} else if (!seen.has(species)) {
				seen.add(species);
				out.tiers.push({ species, points: points! });
			}
		}
	});
	return out;
}

/** Reads the Dex tab (Pokémon and Points columns; 99 points bans) when there is no usable Tiers tab. */
function readDex(sheet: Sheet): TierBlocks | null {
	for (const [r, row] of sheet.rows) {
		const cols = new Map([...row.entries()].map(([c, v]) => [text(v).toLowerCase(), c]));
		const nameCol = cols.get('pokémon') ?? cols.get('pokemon');
		const pointsCol = cols.get('points');
		if (!nameCol || !pointsCol) continue;
		const out: TierBlocks = { tiers: [], banned: [], complexBans: [], unmatched: new Set() };
		for (let i = r + 1; i <= sheet.maxRow; i++) {
			const raw = text(cellAt(sheet, i, nameCol));
			const points = num(cellAt(sheet, i, pointsCol));
			if (!raw || points === null) continue;
			const species = resolveSpecies(raw);
			if (!species) out.unmatched.add(raw);
			else if (points >= 99) out.banned.push(species);
			else out.tiers.push({ species, points });
		}
		return out;
	}
	return null;
}

/** Reads each coach's picks from the Drafts tab: a "Coach Info" row of names over "Pick n" rows. */
function readDrafts(sheet: Sheet, unmatched: Set<string>): { coaches: Coach[]; pickRows: number } {
	const coaches = new Map<string, Coach>();
	let pickRows = 0;
	const infoRows = [...sheet.rows.entries()]
		.map(([r, row]) => [r, [...row.entries()].find(([, v]) => /^coach info$/i.test(text(v)))?.[0]] as const)
		.filter((x): x is readonly [number, number] => x[1] !== undefined)
		.sort((a, b) => a[0] - b[0]);
	infoRows.forEach(([r, labelCol], i) => {
		const next = infoRows[i + 1]?.[0] ?? sheet.maxRow + 1;
		const names = [...sheet.rows.get(r)!.entries()].filter(([c, v]) => c > labelCol && text(v)).sort((a, b) => a[0] - b[0]);
		const rows: number[] = [];
		for (let p = r + 1; p < next; p++) if (/^pick\s*\d+$/i.test(text(cellAt(sheet, p, labelCol)))) rows.push(p);
		pickRows = Math.max(pickRows, rows.length);
		names.forEach(([col, value]) => {
			const name = text(value);
			const coach = coaches.get(name) ?? { name, picks: [] };
			coaches.set(name, coach);
			for (const p of rows) {
				const raw = text(cellAt(sheet, p, col));
				if (!raw) continue;
				const species = resolveSpecies(raw);
				if (!species) {
					unmatched.add(raw);
					continue;
				}
				coach.picks.push({ species });
			}
		});
	});
	return { coaches: [...coaches.values()], pickRows };
}

/** Numbers labelled like "Total Points:", read from the cell to the right, else below. */
function labelled(sheet: Sheet | undefined, label: RegExp): Found[] {
	if (!sheet) return [];
	const out: Found[] = [];
	for (const [r, row] of sheet.rows)
		for (const [c, v] of row) {
			if (!label.test(text(v))) continue;
			const look = (dr: number, dc: number) => {
				for (let k = 1; k <= 3; k++) {
					const x = cellAt(sheet, r + dr * k, c + dc * k);
					if (x === undefined) continue;
					return num(x) !== null ? { value: num(x)!, where: where(sheet, r + dr * k, c + dc * k) } : null;
				}
				return null;
			};
			const hit = look(0, 1) ?? look(1, 0);
			if (hit && !out.some((f) => f.value === hit.value && f.where.split('!')[0] === sheet.name)) out.push(hit);
		}
	return out;
}

const FORMAT_HINTS: [RegExp, string][] = [
	[/champions.*natdex.*draft|champions.*national dex.*draft/i, 'gen9championsnatdexdraft'],
	[/champions.*draft/i, 'gen9championsdraft'],
	[/champions\s*ou/i, 'gen9championsou'],
	[/champions\s*uu/i, 'gen9championsuu'],
	[/champions/i, 'gen9championsdraft'],
	[/(natdex|national dex).*draft/i, 'gen9natdexdraft'],
	[/(natdex|national dex)/i, 'gen9nationaldex'],
	[/draft/i, 'gen9draft'],
	[/\bou\b/i, 'gen9ou'],
];

/** The clauses league rules name, as Showdown rules. Sleep Clause turned off comes first so "not" wins. */
const CLAUSES: [RegExp, string][] = [
	[/sleep clause is not|no sleep clause|sleep clause.*not in effect/i, '!Sleep Clause Mod'],
	[/sleep clause/i, 'Sleep Clause Mod'],
	[/ohko clause/i, 'OHKO Clause'],
	[/species clause/i, 'Species Clause'],
	[/evasion clause/i, 'Evasion Clause'],
	[/moody clause|moody is banned/i, '-Moody'],
	[/endless battle clause/i, 'Endless Battle Clause'],
];

/** A move, ability, item or Pokémon the rules ban by name, as Showdown names it. */
function bannable(raw: string) {
	const name = raw.trim();
	for (const table of [Dex.moves, Dex.abilities, Dex.items, Dex.species] as const) {
		const hit = table.get(name);
		if (hit.exists) return hit.name;
	}
	return null;
}

function readRules(sheet: Sheet | undefined) {
	const rules: League['rules'] = { format: null, level: null, custom: [], enforced: [], notEnforced: [] };
	const budget = { points: [] as Found[], picks: [] as Found[] };
	if (!sheet) return { rules, budget };
	let section = '';
	const lines = [...sheet.rows.entries()]
		.sort((a, b) => a[0] - b[0])
		.flatMap(([r, row]) => [...row.entries()].sort((a, b) => a[0] - b[0]).map(([c, v]) => ({ r, c, line: text(v) })))
		.filter((x) => x.line);
	for (const { r, c, line } of lines) {
		const draft = /(\d+)\s*points?\s+to\s+draft\s+(\d+)(?:\s*(?:-|–|to)\s*(\d+))?/i.exec(line);
		if (draft) {
			budget.points.push({ value: Number(draft[1]), where: where(sheet, r, c) });
			budget.picks.push({ value: Number(draft[3] ?? draft[2]), where: where(sheet, r, c) });
		}
		// A short line with no sentence in it is a section heading ("Battle Clauses").
		if (line.split(/\s+/).length <= 4 && !/[.:\d]/.test(line) && !/format|banned|\b(is|are)\b/i.test(line)) {
			section = line.toLowerCase();
			continue;
		}
		if (!/battle|clause/.test(section)) continue;
		// "Champions OU format" names the format; a longer sentence that mentions one ("legal on the NatDex Draft format") doesn't.
		const format = /^[\w\s.'-]{0,40}\bformat\.?$/i.test(line) ? FORMAT_HINTS.find(([re]) => re.test(line))?.[1] : undefined;
		if (format) {
			rules.format ??= format;
			rules.enforced.push(line);
			continue;
		}
		const level = /level\s+(\d+)/i.exec(line);
		if (level) {
			rules.level = Number(level[1]);
			rules.custom.push(`Adjust Level = ${level[1]}`);
			rules.enforced.push(line);
			continue;
		}
		const clause = CLAUSES.find(([re]) => re.test(line));
		if (clause) {
			if (!rules.custom.includes(clause[1])) rules.custom.push(clause[1]);
			rules.enforced.push(line);
			continue;
		}
		const ban = /^(.+?)\s+(?:is|are)\s+banned\b/i.exec(line);
		const banned = ban && bannable(ban[1]);
		if (banned) {
			rules.custom.push(`-${banned}`);
			rules.enforced.push(line);
			continue;
		}
		rules.notEnforced.push(line);
	}
	return { rules, budget };
}

/** Turns a league workbook into the draft data Kingdra uses. Throws with a readable message when it isn't one. */
export function parseLeague(buf: Buffer, source: LeagueSource, title = ''): League {
	const wb: Workbook = readWorkbook(buf, SHEETS);
	const blocks = (wb.get('Tiers') && readTiers(wb.get('Tiers')!)) || (wb.get('Dex') && readDex(wb.get('Dex')!)) || null;
	if (!blocks || !blocks.tiers.length)
		throw new Error("Kingdra couldn't find a Tiers tab with point values. Check that the sheet has a Tiers tab with a row of point values over a row of Pokemon headers.");
	const drafts = wb.get('Drafts') ? readDrafts(wb.get('Drafts')!, blocks.unmatched) : { coaches: [], pickRows: 0 };
	const { rules, budget } = readRules(wb.get('Rules'));
	for (const ban of blocks.complexBans) rules.custom.push(`-${ban.species} + ${ban.with}`);
	for (const species of blocks.banned) rules.custom.push(`-${species}`);
	const cells = (label: RegExp) => [...labelled(wb.get('Drafts'), label), ...labelled(wb.get('Data'), label)];
	const points = [...cells(/^total points:?$/i), ...budget.points];
	const picks = [...budget.picks, ...(drafts.pickRows ? [{ value: drafts.pickRows, where: 'Drafts (pick rows)' }] : [])];
	return {
		source,
		title,
		syncedAt: Date.now(),
		tiers: blocks.tiers.sort((a, b) => b.points - a.points || a.species.localeCompare(b.species)),
		banned: [...new Set(blocks.banned)],
		complexBans: blocks.complexBans,
		coaches: drafts.coaches,
		budget: { points, picks },
		rules: { ...rules, custom: [...new Set(rules.custom)] },
		unmatched: [...blocks.unmatched],
	};
}

/** The sheet id in a Google Sheets link, or null when it isn't one. */
export function googleSheetId(link: string) {
	return /docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/.exec(link)?.[1] ?? (/^[A-Za-z0-9_-]{30,}$/.test(link.trim()) ? link.trim() : null);
}
