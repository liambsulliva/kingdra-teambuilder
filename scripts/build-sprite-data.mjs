// Precomputes sprite metadata used by src/lib/sprites.ts:
//   - alpha bounding boxes for PokeAPI Gen VIII icons (68×56 canvases)
//   - alpha bounding boxes for every 40×30 cell of Showdown's icon sheet
//   - PokeAPI ids for alternate formes (ids above 10000)
// Run with: node scripts/build-sprite-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = path.resolve('src/lib/data/sprite-data.json');
const ICON_URL = (id) =>
	`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${id}.png`;
const SHEET_URL = 'https://play.pokemonshowdown.com/sprites/pokemonicons-sheet.png';

function decodePng(buf) {
	let pos = 8;
	let w, h, bd, ct;
	let trns = null;
	const idat = [];
	while (pos < buf.length) {
		const len = buf.readUInt32BE(pos);
		const type = buf.toString('ascii', pos + 4, pos + 8);
		const data = buf.subarray(pos + 8, pos + 8 + len);
		if (type === 'IHDR') {
			w = data.readUInt32BE(0);
			h = data.readUInt32BE(4);
			bd = data[8];
			ct = data[9];
		} else if (type === 'IDAT') idat.push(data);
		else if (type === 'tRNS') trns = data;
		pos += 12 + len;
	}
	const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
	const bitsPerPixel = bd * channels;
	const stride = Math.ceil((w * bitsPerPixel) / 8);
	const bytesPerPixel = Math.max(1, bitsPerPixel >> 3);
	const raw = zlib.inflateSync(Buffer.concat(idat));
	const out = Buffer.alloc(stride * h);
	let prev = Buffer.alloc(stride);
	for (let y = 0; y < h; y++) {
		const filter = raw[y * (stride + 1)];
		const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		const cur = Buffer.alloc(stride);
		for (let x = 0; x < stride; x++) {
			const a = x >= bytesPerPixel ? cur[x - bytesPerPixel] : 0;
			const b = prev[x];
			const c = x >= bytesPerPixel ? prev[x - bytesPerPixel] : 0;
			let v = line[x];
			if (filter === 1) v += a;
			else if (filter === 2) v += b;
			else if (filter === 3) v += Math.floor((a + b) / 2);
			else if (filter === 4) {
				const p = a + b - c;
				const pa = Math.abs(p - a);
				const pb = Math.abs(p - b);
				const pc = Math.abs(p - c);
				v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
			}
			cur[x] = v & 255;
		}
		cur.copy(out, y * stride);
		prev = cur;
	}
	const sample = (y, i) => {
		if (bd === 8) return out[y * stride + i];
		if (bd === 16) return out[y * stride + i * 2];
		const bit = i * bd;
		return (out[y * stride + (bit >> 3)] >> (8 - bd - (bit & 7))) & ((1 << bd) - 1);
	};
	const alpha = (x, y) => {
		if (ct === 6) return sample(y, x * 4 + 3);
		if (ct === 4) return sample(y, x * 2 + 1);
		if (ct === 3) {
			const i = sample(y, x);
			return trns && i < trns.length ? trns[i] : 255;
		}
		if (ct === 2 && trns && trns.length >= 6) {
			const r = sample(y, x * 3);
			const g = sample(y, x * 3 + 1);
			const b = sample(y, x * 3 + 2);
			return r === trns.readUInt16BE(0) && g === trns.readUInt16BE(2) && b === trns.readUInt16BE(4) ? 0 : 255;
		}
		return 255;
	};
	return { w, h, alpha };
}

function bbox(img, x0 = 0, y0 = 0, w = img.w, h = img.h) {
	let minX = w, minY = h, maxX = -1, maxY = -1;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++)
			if (img.alpha(x0 + x, y0 + y) > 0) {
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
	return maxX < 0 ? null : [minX, minY, maxX + 1, maxY + 1];
}

async function fetchBuffer(url) {
	for (let attempt = 0; attempt < 3; attempt++) {
		const res = await fetch(url);
		if (res.status === 404) return null;
		if (res.ok) return Buffer.from(await res.arrayBuffer());
	}
	throw new Error(`Failed to fetch ${url}`);
}

async function pool(items, size, fn) {
	const results = [];
	let next = 0;
	await Promise.all(
		Array.from({ length: size }, async () => {
			while (next < items.length) {
				const i = next++;
				results[i] = await fn(items[i]);
			}
		})
	);
	return results;
}

const gen8 = {};
const nums = Array.from({ length: 905 }, (_, i) => i + 1);
await pool(nums, 16, async (num) => {
	const buf = await fetchBuffer(ICON_URL(num));
	if (!buf) return;
	const box = bbox(decodePng(buf));
	if (box) gen8[num] = box;
});
console.log(`gen8 icons: ${Object.keys(gen8).length}`);

const sheet = decodePng(await fetchBuffer(SHEET_URL));
const sheetBoxes = {};
for (let top = 0; top + 30 <= sheet.h; top += 30)
	for (let left = 0; left + 40 <= sheet.w; left += 40) {
		const box = bbox(sheet, left, top, 40, 30);
		if (box) sheetBoxes[`${left},${top}`] = box;
	}
console.log(`sheet cells: ${Object.keys(sheetBoxes).length}`);

const list = await (await fetch('https://pokeapi.co/api/v2/pokemon?limit=2000')).json();
const formIds = {};
for (const { name, url } of list.results) {
	const id = Number(url.split('/').filter(Boolean).pop());
	if (id > 10000) formIds[name] = id;
}
console.log(`pokeapi forme ids: ${Object.keys(formIds).length}`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ gen8, sheet: sheetBoxes, formIds }));
console.log(`wrote ${OUT} (${fs.statSync(OUT).size} bytes)`);
