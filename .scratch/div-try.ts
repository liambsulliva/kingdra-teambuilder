import { readFileSync } from 'node:fs';
import { readWorkbook } from '../src/lib/draft/xlsx';
const wb = readWorkbook(readFileSync('/tmp/league.xlsx'));
const rules = wb.get('Rules')!;
for (const [r, row] of rules.rows) for (const [c, v] of row) if (typeof v === 'string' && v.trim()) console.log('Rules', r, c, v.slice(0, 220));
const drafts = wb.get('Drafts')!;
for (const r of [1, 2, 3, 4, 17, 18, 19, 20]) {
	const row = drafts.rows.get(r);
	if (row) console.log('Drafts', r, [...row].filter(([, v]) => v !== '' && v != null).map(([c, v]) => `${c}=${String(v).slice(0, 20)}`).join(' | '));
}
const ml = wb.get('Match List');
if (ml) for (const r of [1, 2, 3, 4, 5, 6]) console.log('Match', r, [...(ml.rows.get(r) ?? [])].map(([c, v]) => `${c}=${String(v).slice(0, 18)}`).join(' | '));
