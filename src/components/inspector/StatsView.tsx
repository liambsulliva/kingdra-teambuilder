'use client';

import { Icon } from '@/components/ui/Icon';
import { NumberBox } from '@/components/ui/controls';
import { ElasticSlider, TickNumber } from '@/components/ui/motion-ui';
import { EV_LIMIT, EV_PER_STAT, calcStats, evTotal, fieldsFor, getNature, getSpecies, smogonUrl } from '@/lib/dex';
import { STATS, STAT_LABELS, type PokemonSet, type StatID, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';

export const STAT_BAR: Record<StatID, string> = {
	hp: 'bg-stat-hp',
	atk: 'bg-stat-atk',
	def: 'bg-stat-def',
	spa: 'bg-stat-spa',
	spd: 'bg-stat-spd',
	spe: 'bg-stat-spe',
};

/** The reference stat row: label · base · 8 px full-radius bar · final. */
export function StatRow({ stat, base, final, marker }: { stat: StatID; base: number; final?: number; marker?: '+' | '−' }) {
	return (
		<div className='flex items-center gap-3'>
			<span className='flex w-9 shrink-0 items-baseline gap-0.5 text-base font-semibold'>
				{STAT_LABELS[stat]}
				{marker && <span className={`text-xs ${marker === '+' ? 'text-nature-up' : 'text-nature-down'}`}>{marker}</span>}
			</span>
			<span className='w-7 shrink-0 text-right text-sm tabular-nums text-muted'>{base}</span>
			<span className='h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-track'>
				<span className={`block h-full rounded-full transition-[width] duration-500 ease-out ${STAT_BAR[stat]}`} style={{ width: `${Math.min(100, (base / 180) * 100)}%` }} />
			</span>
			{final !== undefined && <TickNumber value={final} className='w-9 shrink-0 text-right text-[14px] font-semibold' />}
		</div>
	);
}

/** Nature with game colors: raised stat red, lowered stat blue. */
export function NatureText({ name, plus, minus }: { name: string; plus?: StatID; minus?: StatID }) {
	return (
		<span>
			{name}
			{plus && minus && plus !== minus ? (
				<>
					{' '}
					<span className='text-nature-up'>+{STAT_LABELS[plus]}</span> <span className='text-nature-down'>−{STAT_LABELS[minus]}</span>
				</>
			) : (
				<span className='text-muted'>, neutral</span>
			)}
		</span>
	);
}

export function StatsView({ team, member }: { team: Team; member: PokemonSet }) {
	const updateSet = useStore((s) => s.updateSet);
	const setInspector = useStore((s) => s.setInspector);
	const species = getSpecies(team, member.species);
	const stats = calcStats(team, member);
	const fields = fieldsFor(team);
	const nature = getNature(team, member.nature);
	const total = evTotal(member);
	const dv = fields.dv;
	if (!species || !stats) return <p className='text-base text-muted'>No stat data for {member.species} in gen {team.gen}.</p>;

	const setEv = (s: StatID, v: number) => {
		const others = total - member.evs[s];
		const capped = dv ? v : Math.min(v, Math.max(0, EV_LIMIT - others));
		updateSet(member.uid, { evs: { ...member.evs, [s]: Math.min(EV_PER_STAT, Math.max(0, capped)) } });
	};
	const setIv = (s: StatID, v: number) => updateSet(member.uid, { ivs: { ...member.ivs, [s]: v } });
	const spe = stats.spe;

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-end'>
				<div className='flex flex-col'>
					<span className='text-base font-semibold'>{member.name || member.species}</span>
					<span className='text-xs text-muted'>Base / final at level {member.level}</span>
				</div>
				<span className='flex-1' />
				{!dv && (
					<span className={`text-xs tabular-nums ${total > EV_LIMIT ? 'text-danger' : 'text-muted'}`} title='510 is the legal total; 508 is the most that changes stats'>
						EVs {total} / {EV_LIMIT}
					</span>
				)}
			</div>
			{STATS.map((s) => {
				const marker = nature?.plus === s && nature.minus !== s ? '+' : nature?.minus === s && nature.plus !== s ? '−' : undefined;
				const ivMax = dv ? 15 : 31;
				const iv = dv ? Math.floor(member.ivs[s] / 2) : member.ivs[s];
				return (
					<div key={s} className='flex flex-col gap-1.5'>
						<StatRow stat={s} base={species.baseStats[s]} final={stats[s]} marker={marker} />
						<div className='flex items-center gap-2 pl-[52px]'>
							<button type='button' className='text-xs text-muted hover:text-fg' title='Double-click to reset' onDoubleClick={() => setEv(s, 0)}>
								{dv ? 'Exp' : 'EV'}
							</button>
							<ElasticSlider label={`${STAT_LABELS[s]} EVs`} value={member.evs[s]} max={EV_PER_STAT} step={4} onChange={(v) => setEv(s, v)} />
							<NumberBox label={`${STAT_LABELS[s]} EVs`} value={member.evs[s]} min={0} max={EV_PER_STAT} onCommit={(v) => setEv(s, v)} />
							{!(dv && s === 'hp') && (
								<>
									<button type='button' className='text-xs text-muted hover:text-fg' title='Double-click to reset' onDoubleClick={() => setIv(s, 31)}>
										{dv ? 'DV' : 'IV'}
									</button>
									<NumberBox
										label={`${STAT_LABELS[s]} ${dv ? 'DVs' : 'IVs'}`}
										value={iv}
										min={0}
										max={ivMax}
										width='w-9'
										onCommit={(v) => setIv(s, dv ? v * 2 + 1 : v)}
									/>
								</>
							)}
						</div>
					</div>
				);
			})}
			<div className='flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted'>
				{fields.nature && (
					<button type='button' className='hover:text-fg' onClick={() => setInspector('nature')}>
						{nature ? <NatureText name={nature.name} plus={nature.plus} minus={nature.minus} /> : 'Choose a nature'}
					</button>
				)}
				<span className='flex-1' />
				<span className='tabular-nums' title='Speed at +1 (also Choice Scarf), +2 and +3'>
					Spe +1 {Math.floor(spe * 1.5)} · +2 {spe * 2} · +3 {Math.floor(spe * 2.5)}
				</span>
			</div>
			{!dv && (
				<div className='flex flex-wrap gap-x-4 gap-y-1 text-xs'>
					<button type='button' className='text-muted hover:text-fg' onClick={() => updateSet(member.uid, { evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } })}>
						Reset EVs
					</button>
					<button type='button' className='text-muted hover:text-fg' onClick={() => setIv('atk', member.ivs.atk === 0 ? 31 : 0)}>
						{member.ivs.atk === 0 ? 'Max Attack IVs' : '0 Attack IVs (special attackers)'}
					</button>
					<button type='button' className='text-muted hover:text-fg' onClick={() => setIv('spe', member.ivs.spe === 0 ? 31 : 0)}>
						{member.ivs.spe === 0 ? 'Max Speed IVs' : '0 Speed IVs (Trick Room)'}
					</button>
				</div>
			)}
			<a href={smogonUrl(team.gen, member.species)} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1.5 self-start text-xs font-medium hover:text-accent'>
				Smogon analysis, gen {team.gen}
				<Icon name='external' className='text-muted' />
			</a>
		</div>
	);
}
