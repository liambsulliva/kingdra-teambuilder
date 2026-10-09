'use client';

import { Icon } from '@/components/ui/Icon';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { effectiveness, getMove, getSpecies, typesForGen } from '@/lib/dex';
import { useRoles } from '@/lib/hooks';
import { STATS, STAT_LABELS, type PokemonSet, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';
import { STAT_BAR } from './StatsView';

function Section({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
	return (
		<section className='flex flex-col gap-2.5'>
			<div className='flex items-end'>
				<h3 className='text-base font-semibold'>{title}</h3>
				<span className='flex-1' />
				{sub && <span className='text-xs text-muted'>{sub}</span>}
			</div>
			{children}
		</section>
	);
}

function TypeCountGrid({ counts, bad }: { counts: [string, number][]; bad: (n: number) => boolean }) {
	return (
		<div className='grid grid-cols-3 gap-x-4 gap-y-1.5'>
			{counts.map(([t, n]) => (
				<div key={t} className='flex items-center'>
					<TypeBadge type={t} />
					<span className='flex-1' />
					<span className={`text-sm tabular-nums ${bad(n) ? 'font-semibold text-danger' : n ? 'text-fg' : 'text-muted'}`}>{n}</span>
				</div>
			))}
		</div>
	);
}

export function TeamView({ team }: { team: Team }) {
	const validation = useStore((s) => s.validation[team.id]);
	const types = typesForGen(team.gen);
	const members = team.members.map((m) => ({ m, s: getSpecies(team, m.species) })).filter((x) => x.s);
	const weak = types.map((t) => [t, members.filter(({ s }) => effectiveness(team, t, s!.types) > 1).length] as [string, number]);
	const hits = types.map(
		(t) =>
			[
				t,
				members.filter(({ m }) =>
					m.moves.some((name) => {
						const mv = getMove(team, name);
						return mv && mv.category !== 'Status' && mv.basePower > 0 && effectiveness(team, mv.type, [t]) > 1;
					})
				).length,
			] as [string, number]
	);
	if (!members.length) return <p className='text-base text-muted'>Add Pokémon to see the team&apos;s weaknesses and coverage.</p>;
	return (
		<div className='flex flex-col gap-6'>
			<Section title='Weak to' sub='Members weak, after immunities'>
				<TypeCountGrid counts={weak} bad={(n) => n >= 3} />
			</Section>
			<Section title='Hits super effectively' sub='Members with a damaging move'>
				<TypeCountGrid counts={hits} bad={(n) => n === 0} />
			</Section>
			{team.mode === 'competitive' && (
				<Section title='Legality' sub={validation ? <span className={validation.count ? 'text-danger' : ''}>{validation.count ? `${validation.count} Issue${validation.count === 1 ? '' : 's'}` : 'No Issues'}</span> : 'Checking'}>
					<ul className='flex flex-col gap-1.5'>
						{Object.entries(validation?.byMember ?? {}).flatMap(([uid, problems]) => {
							const m = team.members.find((x) => x.uid === uid);
							return problems.map((p, i) => (
								<li key={uid + i} className='flex items-start gap-2 text-xs'>
									<Icon name='warning' className='mt-0.5 text-danger' />
									<span>
										<span className='font-medium'>{m?.name || m?.species}</span> <span className='text-muted'>{p.replace(`${m?.name || m?.species}`, '').replace(/^[\s:'s]+/, '')}</span>
									</span>
								</li>
							));
						})}
						{validation?.team.map((p, i) => (
							<li key={i} className='flex items-start gap-2 text-xs'>
								<Icon name='warning' className='mt-0.5 text-danger' />
								<span className='text-muted'>{p}</span>
							</li>
						))}
					</ul>
				</Section>
			)}
		</div>
	);
}

const GROUPS: [string, (x: number) => boolean][] = [
	['Weak ×4', (x) => x >= 4],
	['Weak ×2', (x) => x === 2],
	['Resists ×½', (x) => x === 0.5],
	['Resists ×¼', (x) => x > 0 && x <= 0.25],
	['Immune', (x) => x === 0],
];

function matchups(team: Team, defend: string[]) {
	return typesForGen(team.gen).map((t) => [t, effectiveness(team, t, defend)] as [string, number]);
}

export function MatchupsView({ team, member }: { team: Team; member: PokemonSet }) {
	const species = getSpecies(team, member.species);
	const focus = useStore((s) => s.matchupType);
	if (!species) return null;
	const list = matchups(team, species.types);
	return (
		<div className='flex flex-col gap-5'>
			<div className='flex flex-col gap-1.5'>
				<span className='text-base font-semibold'>{member.name || member.species}</span>
				<span className='flex items-center gap-1.5 text-xs text-muted'>
					Taking hits as {species.types.map((t) => <TypeBadge key={t} type={t} />)}
				</span>
			</div>
			{GROUPS.map(([label, test]) => {
				const types = list.filter(([, x]) => test(x)).map(([t]) => t);
				if (!types.length) return null;
				return (
					<Section key={label} title={label}>
						<div className='flex flex-wrap gap-1.5'>
							{types.map((t) => (
								<span key={t} className={focus === t ? 'rounded ring-[1.5px] ring-accent ring-offset-1 ring-offset-bg' : ''}>
									<TypeBadge type={t} />
								</span>
							))}
						</div>
					</Section>
				);
			})}
			<p className='text-xs text-muted'>Type chart only. Abilities, items and Tera are not counted.</p>
		</div>
	);
}

function Badges({ types, align }: { types: string[]; align: 'left' | 'right' }) {
	if (!types.length) return <span className={`text-base text-muted ${align === 'right' ? 'text-right' : ''}`}>None</span>;
	return <span className={`flex flex-wrap gap-1 ${align === 'right' ? 'justify-end' : ''}`}>{types.map((t) => <TypeBadge key={t} type={t} />)}</span>;
}

export function CompareView({ team, candidate }: { team: Team; candidate: string }) {
	const selected = useStore((s) => s.selectedUid);
	const target = useStore((s) => s.compareTarget);
	const roles = useRoles(team.mode === 'competitive' ? team.format : null);
	const mine = team.members.find((m) => m.uid === (selected ?? target)) ?? team.members[0];
	const a = getSpecies(team, candidate);
	const b = mine ? getSpecies(team, mine.species) : null;
	if (!a) return null;
	const side = (types: string[], test: (x: number) => boolean) => matchups(team, types).filter(([, x]) => test(x)).map(([t]) => t);
	const rows: [string, (x: number) => boolean][] = [
		['Weak to', (x) => x > 1],
		['Resists', (x) => x > 0 && x < 1],
		['Immune to', (x) => x === 0],
	];
	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-end'>
				<span className='text-base font-semibold'>{a.name}</span>
				<span className='flex-1' />
				<span className='text-base font-semibold'>{b?.name ?? 'Your team'}</span>
			</div>
			<span className='-mt-2 text-xs text-muted'>Base stats, not trained values</span>
			{STATS.map((k) => {
				const x = a.baseStats[k];
				const y = b?.baseStats[k] ?? 0;
				return (
					<div key={k} className='flex items-center gap-2'>
						<span className={`w-8 text-sm tabular-nums ${x >= y ? 'font-semibold' : 'text-muted'}`}>{x}</span>
						<span className='flex h-2 flex-1 justify-end overflow-hidden rounded-full bg-track'>
							<span className={`h-full rounded-full ${STAT_BAR[k]} ${x >= y ? '' : 'opacity-35'}`} style={{ width: `${Math.min(100, (x / 150) * 100)}%` }} />
						</span>
						<span className='w-8 text-center text-base font-semibold'>{STAT_LABELS[k]}</span>
						<span className='h-2 flex-1 overflow-hidden rounded-full bg-track'>
							<span className={`block h-full rounded-full ${STAT_BAR[k]} ${y >= x ? '' : 'opacity-35'}`} style={{ width: `${Math.min(100, (y / 150) * 100)}%` }} />
						</span>
						<span className={`w-8 text-right text-sm tabular-nums ${y >= x ? 'font-semibold' : 'text-muted'}`}>{b ? y : '—'}</span>
					</div>
				);
			})}
			<div className='h-px bg-line' />
			{rows.map(([label, test]) => (
				<div key={label} className='grid grid-cols-[1fr_auto_1fr] items-start gap-3'>
					<Badges types={side(a.types, test)} align='left' />
					<span className='pt-0.5 text-xs text-muted'>{label}</span>
					{b ? <Badges types={side(b.types, test)} align='right' /> : <span />}
				</div>
			))}
			{team.mode === 'competitive' && (
				<div className='grid grid-cols-[1fr_auto_1fr] items-start gap-3'>
					<span className='text-base'>{(roles[a.name] ?? []).join(', ') || '—'}</span>
					<span className='pt-0.5 text-xs text-muted'>Roles</span>
					<span className='text-right text-base'>{b ? (roles[b.name] ?? []).join(', ') || '—' : ''}</span>
				</div>
			)}
			<p className='text-xs text-muted'>Swapping gives {a.name} a fresh set: legal default ability, no moves or item, default stats.</p>
		</div>
	);
}
