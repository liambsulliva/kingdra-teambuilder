'use client';

import { useEffect, useRef, useState } from 'react';
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
				className={`relative -m-2 min-h-0 flex-1 ${compare ? 'overflow-hidden' : 'overflow-y-auto'} rounded-lg p-2 transition-colors ${candidateOver ? 'bg-accent-soft' : ''}`}
				onClick={(e) => e.target === e.currentTarget && member && !preview && !compare && selectMember(null)}
			>
				{candidateOver && team.members.length > 0 && (
					<span className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-md font-semibold uppercase tracking-[0.2em] text-accent'>Compare</span>
				)}
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

function Plate({ team, species, label, total, align = 'left' }: { team: Team; species: string; label: string; total?: number; align?: 'left' | 'right' }) {
	const s = getSpecies(team, species);
	const bst = s ? STATS.reduce((n, k) => n + s.baseStats[k], 0) : 0;
	const end = align === 'right';
	return (
		<div className={`flex flex-col gap-1.5 ${end ? 'items-end text-right' : 'items-start text-left'}`}>
			<span className='text-xs text-muted'>{label}</span>
			<div className={`flex items-end gap-2 ${end ? 'flex-row-reverse' : ''}`}>
				<span className='font-head text-[24px] font-semibold leading-7 tracking-[-0.02em]'>{species}</span>
				<span className='pb-0.5 text-xs tabular-nums text-muted'>Base {total ?? bst}</span>
			</div>
			<div className='flex gap-1'>{s?.types.map((t) => <TypeBadge key={t} type={t} />)}</div>
		</div>
	);
}

/** A sprite standing on a filled grey platform. */
function Stage({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
	return (
		<div className={`relative flex shrink-0 items-end justify-center ${wide ? 'h-[190px] w-[270px]' : 'h-[165px] w-[236px]'}`}>
			<span className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] bg-line shadow-[inset_0_-4px_10px_rgba(0,0,0,0.06)] ${wide ? 'h-[72px] w-[270px]' : 'h-[60px] w-[236px]'}`} />
			<span className={`relative ${wide ? 'mb-9' : 'mb-7'}`}>{children}</span>
		</div>
	);
}

const SCENE_W = 560;
const SCENE_H = 360;

/** Scales the arena down to whatever room the panel has, so it never scrolls. */
function FitScene({ children }: { children: React.ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const fit = () => setScale(Math.min(1, el.clientWidth / SCENE_W, el.clientHeight / SCENE_H));
		fit();
		const ro = new ResizeObserver(fit);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return (
		<div ref={ref} className='relative min-h-0 flex-1'>
			<div className='absolute left-1/2 top-0' style={{ width: SCENE_W, height: SCENE_H, marginLeft: -SCENE_W / 2, transform: `scale(${scale})`, transformOrigin: 'top center' }}>
				{children}
			</div>
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
		<section aria-label={`Compare ${candidate}`} className='flex h-full min-h-0 w-full max-w-[700px] flex-col gap-3'>
			<FitScene>
					<div className='absolute right-0 top-0 flex items-start gap-4'>
						<div className='pt-8'>
							<Plate team={team} species={candidate} label='Candidate' align='right' />
						</div>
						<Stage>
							<PokemonSprite species={candidate} size={128} />
						</Stage>
					</div>
					{mine && (
						<div className='absolute bottom-0 left-0 flex items-end gap-4'>
							<Stage wide>
								<PokemonSprite species={mine.species} back size={160} />
							</Stage>
							<div className='pb-12'>
								<Plate team={team} species={mine.species} label={member ? 'On your card' : 'From your party'} align='left' />
							</div>
						</div>
					)}
				</FitScene>
				<div className='flex shrink-0 flex-wrap items-center gap-2'>
				{mine && (
					<Button
						variant='accent'
						icon='swap'
						className='min-w-0 max-w-full'
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
						<span className='truncate'>Swap {mine.name || mine.species} for {candidate}</span>
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
						tooltip='above'
					onClick={() => {
						compare(null);
						if (member) selectMember(member.uid);
					}}
				/>
			</div>
		</section>
	);
}
