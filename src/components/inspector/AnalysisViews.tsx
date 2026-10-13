'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/controls';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { effectiveness, getMove, getSpecies, typesForGen } from '@/lib/dex';
import { fixKeyFor, planFix } from '@/lib/fixes';
import { type PokemonSet, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';

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

/** A ghost button that plans a one-field fix and asks for confirmation before it touches the set. */
function FixButton({ team, member, problem }: { team: Team; member: PokemonSet; problem: string }) {
	const proposeFix = useStore((s) => s.proposeFix);
	const toast = useStore((s) => s.toast);
	const [busy, setBusy] = useState(false);
	const name = member.name || member.species;
	return (
		<Button
			variant='ghost'
			disabled={busy}
			className='!h-6 shrink-0 !px-2 !text-xs'
			onClick={async () => {
				setBusy(true);
				const plan = await planFix(team, member, problem);
				setBusy(false);
				if (plan) proposeFix({ uid: member.uid, name, ...plan });
				else toast('error', `No safe fix for ${name}`);
			}}
		>
			Fix
		</Button>
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
							// One Fix per kind of problem: the second "ability is banned" line would only repeat the first.
							const offered = new Set<string>();
							return problems.map((p, i) => {
								const key = m ? fixKeyFor(p, m) : null;
								const fixable = !!m && !!key && !offered.has(key);
								if (fixable) offered.add(key!);
								return (
									<li key={uid + i} className='flex items-start gap-2 text-xs'>
										<Icon name='warning' className='mt-0.5 text-danger' />
										<span className='min-w-0 flex-1'>
											<span className='font-medium'>{m?.name || m?.species}</span> <span className='text-muted'>{p.replace(`${m?.name || m?.species}`, '').replace(/^[\s:'s]+/, '')}</span>
										</span>
										{fixable && <FixButton team={team} member={m!} problem={p} />}
									</li>
								);
							});
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
		</div>
	);
}
