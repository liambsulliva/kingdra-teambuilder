import { inflateRawSync } from 'node:zlib';

/** A cell's cached value. Formulas are read through the value the spreadsheet last computed. */
export type CellValue = string | number | boolean;

/** One worksheet as a sparse grid, 1-based rows and columns as in the spreadsheet. */
export interface Sheet {
	name: string;
	rows: Map<number, Map<number, CellValue>>;
	maxRow: number;
	maxCol: number;
}

export type Workbook = Map<string, Sheet>;

/** Reads the entries of a zip archive by name. Only stored and deflated entries, which is all .xlsx uses. */
function unzip(buf: Buffer, wanted: (name: string) => boolean): Map<string, Buffer> {
	let eocd = -1;
	for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
		if (buf.readUInt32LE(i) === 0x06054b50) {
			eocd = i;
			break;
		}
	}
	if (eocd < 0) throw new Error('This file is not an Excel workbook.');
	const count = buf.readUInt16LE(eocd + 10);
	let at = buf.readUInt32LE(eocd + 16);
	const out = new Map<string, Buffer>();
	for (let n = 0; n < count; n++) {
		if (buf.readUInt32LE(at) !== 0x02014b50) throw new Error('This workbook is damaged.');
		const method = buf.readUInt16LE(at + 10);
		const size = buf.readUInt32LE(at + 20);
		const nameLen = buf.readUInt16LE(at + 28);
		const extraLen = buf.readUInt16LE(at + 30);
		const commentLen = buf.readUInt16LE(at + 32);
		const local = buf.readUInt32LE(at + 42);
		const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
		at += 46 + nameLen + extraLen + commentLen;
		if (!wanted(name)) continue;
		const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
		const data = buf.subarray(start, start + size);
		if (method === 0) out.set(name, data);
		else if (method === 8) out.set(name, inflateRawSync(data));
		else throw new Error("This workbook uses a compression Kingdra can't read.");
	}
	return out;
}

const decode = (s: string) =>
	s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
		if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
		return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()]!;
	});

/** The text of every <t> in a string item, leaving out phonetic hints. */
const textOf = (xml: string) =>
	[...xml.replace(/<rPh[\s\S]*?<\/rPh>/g, '').matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');

const attr = (attrs: string, name: string) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1];

/** "AB12" → [12, 28] */
export function parseRef(ref: string): [number, number] {
	const m = /^([A-Z]+)(\d+)$/.exec(ref);
	if (!m) return [0, 0];
	let col = 0;
	for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
	return [Number(m[2]), col];
}

function parseSheet(name: string, xml: string, shared: string[]): Sheet {
	const rows = new Map<number, Map<number, CellValue>>();
	let maxRow = 0;
	let maxCol = 0;
	for (const m of xml.matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
		const inner = m[2];
		if (!inner) continue;
		const ref = attr(m[1], 'r');
		if (!ref) continue;
		const type = attr(m[1], 't');
		let value: CellValue | undefined;
		if (type === 'inlineStr') value = textOf(/<is>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? '');
		else {
			const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
			if (v === undefined) continue;
			if (type === 's') value = shared[Number(v)] ?? '';
			else if (type === 'str' || type === 'e') value = decode(v);
			else if (type === 'b') value = v === '1';
			else value = Number(v);
		}
		if (value === '' || value === undefined || (typeof value === 'number' && Number.isNaN(value))) continue;
		const [r, c] = parseRef(ref);
		if (!rows.has(r)) rows.set(r, new Map());
		rows.get(r)!.set(c, value);
		maxRow = Math.max(maxRow, r);
		maxCol = Math.max(maxCol, c);
	}
	return { name, rows, maxRow, maxCol };
}

/** Reads the named worksheets (or all of them) from an .xlsx file. */
export function readWorkbook(buf: Buffer, only?: string[]): Workbook {
	const meta = unzip(buf, (n) => n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' || n === 'xl/sharedStrings.xml');
	const workbook = meta.get('xl/workbook.xml')?.toString('utf8');
	const rels = meta.get('xl/_rels/workbook.xml.rels')?.toString('utf8');
	if (!workbook || !rels) throw new Error('This file is not an Excel workbook.');
	const targets = new Map<string, string>();
	for (const m of rels.matchAll(/<Relationship\s([^>]*?)\/?>/g)) {
		const id = attr(m[1], 'Id');
		const target = attr(m[1], 'Target');
		if (id && target) targets.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`);
	}
	const paths = new Map<string, string>();
	for (const m of workbook.matchAll(/<sheet\s([^>]*?)\/?>/g)) {
		const name = attr(m[1], 'name');
		const id = attr(m[1], 'r:id');
		if (!name || !id || !targets.has(id)) continue;
		const decoded = decode(name);
		if (!only || only.includes(decoded)) paths.set(targets.get(id)!, decoded);
	}
	const sharedXml = meta.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
	const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
	const files = unzip(buf, (n) => paths.has(n));
	const out: Workbook = new Map();
	for (const [path, name] of paths) {
		const xml = files.get(path);
		if (xml) out.set(name, parseSheet(name, xml.toString('utf8'), shared));
	}
	return out;
}

export const cellAt = (sheet: Sheet | undefined, r: number, c: number) => sheet?.rows.get(r)?.get(c);
