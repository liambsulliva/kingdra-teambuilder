import { readFileSync } from 'node:fs';
import { readWorkbook, cellAt } from '../src/lib/draft/xlsx';
const t0 = performance.now();
const wb = readWorkbook(readFileSync('/tmp/live.xlsx'), ['Rules', 'Tiers', 'Drafts', 'Dex', 'Data']);
console.log('ms', Math.round(performance.now() - t0), [...wb.keys()]);
const tiers = wb.get('Tiers')!;
console.log(cellAt(tiers, 3, 9), cellAt(tiers, 4, 9), cellAt(tiers, 5, 75), cellAt(tiers, 5, 3), tiers.maxRow, tiers.maxCol);
console.log(cellAt(wb.get('Rules'), 5, 2), cellAt(wb.get('Drafts'), 16, 75), cellAt(wb.get('Data'), 26, 5));
