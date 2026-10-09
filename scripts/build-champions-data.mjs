// Extracts Pokémon Champions data from upstream Pokémon Showdown (the @pkmn
// packages don't ship the Champions mod yet) into src/lib/data/champions.json:
//   species:   legal species → Champions tier
//   items:     legal held items, Mega Stones included
// and the (large) learnsets into champions-learnsets.json, loaded on demand:
//   species → learnable move ids (prevo moves included)
// Run with: node scripts/build-champions-data.mjs (after updating pokemon-showdown)
import fs from 'node:fs';
import path from 'node:path';
import ps from 'pokemon-showdown';
import { Dex as PkmnDex } from '@pkmn/dex';

const OUT = path.resolve('src/lib/data/champions.json');
const OUT_LEARNSETS = path.resolve('src/lib/data/champions-learnsets.json');
const dex = ps.Dex.mod('champions');

const legal = dex.species.all().filter((s) => s.exists && !s.isNonstandard && s.tier !== 'Illegal');
const species = {};
const learnsets = {};
const missing = new Set();

const movesOf = (id) => Object.keys(dex.data.Learnsets[id]?.learnset ?? {});
for (const s of legal) {
	species[s.name] = s.tier;
	if (s.battleOnly || s.isMega) continue;
	const ids = new Set();
	// Formes without their own learnset use the base species'; evolutions
	// also keep everything their pre-evolutions learn.
	let cur = s;
	while (cur) {
		const own = movesOf(cur.id);
		(own.length ? own : movesOf(dex.species.get(cur.baseSpecies).id)).forEach((m) => ids.add(m));
		cur = cur.prevo ? dex.species.get(cur.prevo) : null;
	}
	for (const m of ids) if (!PkmnDex.moves.get(m).exists) missing.add(m);
	learnsets[s.name] = [...ids].sort();
}

const items = dex.items
	.all()
	.filter((i) => i.exists && !i.isNonstandard)
	.map((i) => i.name)
	.sort();

const version = JSON.parse(fs.readFileSync('node_modules/pokemon-showdown/package.json', 'utf8')).version;
fs.writeFileSync(OUT, JSON.stringify({ source: `pokemon-showdown ${version}`, species, items }));
fs.writeFileSync(OUT_LEARNSETS, JSON.stringify(learnsets));
console.log(`species ${Object.keys(species).length}, learnsets ${Object.keys(learnsets).length}, items ${items.length}`);
if (missing.size) console.log(`moves unknown to @pkmn/dex: ${[...missing].join(', ')}`);
console.log(`wrote ${OUT} (${fs.statSync(OUT).size} bytes) and ${OUT_LEARNSETS} (${fs.statSync(OUT_LEARNSETS).size} bytes)`);
