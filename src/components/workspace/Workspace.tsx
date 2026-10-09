'use client';

import { useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/controls';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { PokemonIcon, PokemonSprite } from '@/components/pokemon/PokemonIcon';
import { formatLabel, getSpecies } from '@/lib/dex';
import { MAX_TEAM_SIZE, STATS, STAT_LABELS, type Team } from '@/lib/model';
import { useOpenTeam, useSelectedMember, useStore } from '@/lib/store';
import { ExpandedCard } from './ExpandedCard';
import { PartyRow } from './PartyRow';
import { hopInto } from '@/components/motion/choreography';

const STAT_COLOR: Record<string, string> = { hp: 'bg-stat-hp', atk: 'bg-stat-atk', def: 'bg-stat-def', spa: 'bg-stat-spa', spd: 'bg-stat-spd', spe: 'bg-stat-spe' };

export function Workspace() {
	const team = useOpenTeam();
	const member = useSelectedMember();
	const preview = useStore((s) => s.previewSpecies);
	const compare = useStore((s) => s.compareSpecies);
	const selectMember = useStore((s) => s.selectMember);
	const closePreview = useStore((s) => s.preview);
	const boxOpen = useStore((s) => s.boxOpen);
	const { setNodeRef, isOver, active } = useDroppable({ id: 'card', data: { kind: 'card' } });
	const candidateOver = isOver && active?.data.current?.kind === 'candidate';

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
			if (compare || preview) closePreview(null);
			else if (member) selectMember(null);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [compare, preview, member, closePreview, selectMember]);

	return (
		<div className='flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-4 pt-5 md:px-10 md:pb-6 md:pt-6'>
			<div
				ref={setNodeRef}
				className={`-m-2 min-h-0 flex-1 overflow-y-auto rounded-lg p-2 transition-colors ${candidateOver ? 'bg-accent-soft' : ''}`}
				onClick={(e) => e.target === e.currentTarget && member && !preview && !compare && selectMember(null)}
			>
				{compare ? (
					<CompareScene team={team} candidate={compare} />
				) : preview ? (
					<Preview team={team} species={preview} />
				) : member ? (
					<ExpandedCard key={member.uid} team={team} member={member} />
				) : (
					<EmptyState team={team} />
				)}
			</div>
			{/* While the Box is open the party rides on the drawer instead. */}
			<div className='pt-4'>{boxOpen ? <div className='h-14' /> : <PartyRow />}</div>
		</div>
	);
}

function EmptyState({ team }: { team: Team }) {
	const issues = useStore((s) => s.validation[team.id]?.count ?? 0);
	return (
		<div className='flex flex-col gap-2'>
			<h2 className='font-head text-[32px] font-semibold leading-9 tracking-[-0.02em]'>{team.name}</h2>
			<p className='text-base text-muted'>
				{formatLabel(team)} - {team.members.length}/{MAX_TEAM_SIZE}
				{team.mode === 'competitive' && (issues ? <> - <span className='text-danger'>{issues} {issues === 1 ? 'Issue' : 'Issues'}</span></> : ' - No Issues')}
			</p>
			<p className='max-w-[360px] text-base text-muted'>
				{team.members.length
					? 'Pick a party member to put it on the card. Drag a suggestion onto the party to add it.'
					: 'Drag a suggestion onto the party, or pick one to preview it first.'}
			</p>
		</div>
	);
}

function BaseStatBars({ team, species }: { team: Team; species: string }) {
	const s = getSpecies(team, species);
	if (!s) return null;
	return (
		<div className='flex flex-col gap-2'>
			{STATS.map((k) => (
				<div key={k} className='flex items-center gap-3'>
					<span className='w-8 text-base font-semibold'>{STAT_LABELS[k]}</span>
					<span className='w-7 text-right text-sm tabular-nums text-muted'>{s.baseStats[k]}</span>
					<span className='h-2 flex-1 overflow-hidden rounded-full bg-track'>
						<span className={`block h-full rounded-full ${STAT_COLOR[k]}`} style={{ width: `${Math.min(100, (s.baseStats[k] / 180) * 100)}%` }} />
					</span>
				</div>
			))}
		</div>
	);
}

function Preview({ team, species }: { team: Team; species: string }) {
	const s = getSpecies(team, species);
	const addMember = useStore((s) => s.addMember);
	const compare = useStore((s) => s.compare);
	const preview = useStore((s) => s.preview);
	const full = team.members.length >= MAX_TEAM_SIZE;
	return (
		<section aria-label={`Preview ${species}`} className='flex w-full max-w-[580px] flex-col gap-5'>
			<div className='flex gap-6'>
				<div className='flex size-24 shrink-0 items-end justify-center'>
					<PokemonSprite species={species} size={96} />
				</div>
				<div className='flex min-w-0 flex-1 flex-col gap-2.5'>
					<div className='flex items-end gap-2'>
						<h2 className='truncate font-head text-[32px] font-semibold leading-9 tracking-[-0.02em]'>{species}</h2>
						<span className='pb-1 font-mono text-2xs text-muted'>#{s?.num}</span>
						<span className='flex-1' />
						<IconButton icon='close' label='Close preview' onClick={() => preview(null)} />
					</div>
					<div className='flex gap-1'>{s?.types.map((t) => <TypeBadge key={t} type={t} />)}</div>
					<p className='text-xs text-muted'>
						{team.gen >= 3 && s ? Object.values(s.abilities).join(' / ') : ''}
						{s && team.mode === 'competitive' ? ` - ${s.tier}` : ''}
					</p>
				</div>
			</div>
			<BaseStatBars team={team} species={species} />
			<div className='flex flex-wrap items-center gap-2'>
				<Button variant='accent' icon='plus' disabled={full} onClick={() => addMember(species)}>
					Add to team
				</Button>
				<Button icon='compare' disabled={!team.members.length} onClick={() => compare(species)}>
					Compare
				</Button>
				{full && <span className='text-xs text-muted'>{team.name} is full. Compare to swap someone out.</span>}
			</div>
		</section>
	);
}

function Plate({ team, species, label, total }: { team: Team; species: string; label: string; total?: number }) {
	const s = getSpecies(team, species);
	const bst = s ? STATS.reduce((n, k) => n + s.baseStats[k], 0) : 0;
	return (
		<div className='flex flex-col gap-1.5'>
			<span className='text-xs text-muted'>{label}</span>
			<div className='flex items-end gap-2'>
				<span className='font-head text-[20px] font-semibold leading-6'>{species}</span>
				<span className='text-xs tabular-nums text-muted'>base {total ?? bst}</span>
			</div>
			<div className='flex gap-1'>{s?.types.map((t) => <TypeBadge key={t} type={t} />)}</div>
			<span className='mt-1 h-1 w-48 rounded-full bg-stat-hp' />
		</div>
	);
}

function CompareScene({ team, candidate }: { team: Team; candidate: string }) {
	const member = useSelectedMember();
	const selectMember = useStore((s) => s.selectMember);
	const swapIn = useStore((s) => s.swapIn);
	const addMember = useStore((s) => s.addMember);
	const compare = useStore((s) => s.compare);
	const target = useStore((s) => s.compareTarget);
	const setTarget = useStore((s) => s.setCompareTarget);
	const mine = team.members.find((m) => m.uid === (member?.uid ?? target)) ?? team.members[0];
	const full = team.members.length >= MAX_TEAM_SIZE;
	return (
		<section aria-label={`Compare ${candidate}`} className='flex w-full max-w-[700px] flex-col gap-3'>
			<div className='relative h-[420px] w-full'>
				<div className='absolute left-0 top-0'>
					<Plate team={team} species={candidate} label='candidate' />
				</div>
				<div className='absolute right-6 top-4 flex flex-col items-center'>
					<PokemonSprite species={candidate} size={144} />
					<span className='-mt-6 h-12 w-56 rounded-[50%] border border-line' />
				</div>
				{mine && (
					<>
						<div className='absolute bottom-0 left-4 flex flex-col items-center'>
							<PokemonSprite species={mine.species} back size={176} />
							<span className='-mt-8 h-14 w-64 rounded-[50%] border border-line' />
						</div>
						<div className='absolute bottom-12 right-6'>
							<Plate team={team} species={mine.species} label={member ? 'on your card' : 'from your party'} />
						</div>
					</>
				)}
			</div>
			<div className='flex flex-wrap items-center gap-2'>
				{mine && (
					<Button
						variant='accent'
						icon='swap'
						onClick={async () => {
							const index = team.members.findIndex((m) => m.uid === mine.uid);
							const wasOnCard = !!member;
							// Show the party slot so the candidate has somewhere to land.
							if (wasOnCard) selectMember(null);
							swapIn(mine.uid, candidate);
							await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
							await hopInto(candidate, `[aria-label="Preview ${candidate}"]`, `[data-party-member][data-index="${index}"]`);
						}}
					>
						Swap {mine.name || mine.species} for {candidate}
					</Button>
				)}
				<Button icon='plus' disabled={full} onClick={() => addMember(candidate)}>
					Add to team
				</Button>
				{full && <span className='text-xs text-muted'>Team is full</span>}
				<span className='flex-1' />
				{!member && team.members.length > 1 && (
					<span className='flex items-center gap-1'>
						<span className='mr-1 text-xs text-muted'>Compare with</span>
						{team.members.map((m) => (
							<button
								key={m.uid}
								type='button'
								aria-label={`Compare with ${m.species}`}
								aria-pressed={m.uid === mine?.uid}
								onClick={() => setTarget(m.uid)}
								className={`rounded-md p-0.5 ${m.uid === mine?.uid ? 'bg-accent-soft' : 'hover:bg-hover'}`}
							>
								<PokemonIcon species={m.species} />
							</button>
						))}
					</span>
				)}
				<IconButton
					icon='close'
					label='Close comparison'
					onClick={() => {
						compare(null);
						if (member) selectMember(member.uid);
					}}
				/>
			</div>
		</section>
	);
}
