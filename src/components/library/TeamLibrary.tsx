'use client';

import { memo, useEffect, useMemo, useState, useTransition } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { SearchField } from '@/components/ui/controls';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { formatLabel, formatsForGen } from '@/lib/dex';
import { accepts, type DragData } from '@/lib/drag';
import { exportTeam } from '@/lib/showdown';
import { MAX_TEAM_SIZE, type PokemonSet, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';
import { openTeamWithMotion } from '@/components/motion/choreography';
import { whenIdle } from '@/lib/idle';
import { useIsMobile } from '@/lib/hooks';

/** Cards mounted on the first render; the rest follow in chunks while the browser is idle. */
const FIRST_CARDS = 60;
const CARD_CHUNK = 60;

/** How many of `total` items to render: a first screenful at once, then the rest without blocking input. */
function useProgressiveCount(total: number) {
	const [count, setCount] = useState(FIRST_CARDS);
	const [, startTransition] = useTransition();
	useEffect(() => {
		if (count >= total) return;
		return whenIdle(() => startTransition(() => setCount((c) => c + CARD_CHUNK)));
	}, [count, total]);
	return Math.min(count, total);
}

export function TeamLibrary() {
	const teams = useStore((s) => s.library.teams);
	const openTeamId = useStore((s) => s.openTeamId);
	const setDialog = useStore((s) => s.setDialog);
	const cards = useStore((s) => s.teamView === 'cards');
	const setTeamView = useStore((s) => s.setTeamView);
	const [searching, setSearching] = useState(false);
	const [query, setQuery] = useState('');
	// A team matches on its name or on any Pokémon in it, so searching a species finds the team it is on.
	const shown = useMemo(() => {
		const q = query.trim().toLowerCase();
		const named = (name: string) => name.toLowerCase().includes(q);
		return q ? teams.filter((t) => named(t.name) || t.members.some((m) => named(m.species) || named(m.name))) : teams;
	}, [teams, query]);
	const count = useProgressiveCount(shown.length);
	const empty = !shown.length && <li className={`px-3 py-6 text-base text-muted ${cards ? 'col-span-2' : ''}`}>No teams match “{query}”.</li>;
	return (
		<aside aria-label='Teams' className='flex min-h-0 flex-col'>
			<div className='flex h-12 shrink-0 items-center pl-6 pr-3'>
				<h2 className='text-md font-semibold'>Teams</h2>
				<span className='ml-2 text-xs tabular-nums text-muted'>{teams.length}</span>
				<span className='flex-1' />
				<IconButton icon='cards' label='Card view' selected={cards} onClick={() => setTeamView(cards ? 'list' : 'cards')} />
				<IconButton icon='search' label='Search teams' selected={searching} onClick={() => { setSearching((v) => !v); setQuery(''); }} />
				<IconButton icon='import' label='Import a Showdown team' onClick={() => setDialog('importTeam')} />
				<IconButton icon='plus' label='New team' onClick={() => setDialog('newTeam')} />
			</div>
			{searching && (
				<div className='px-4 pb-2'>
					<SearchField autoFocus placeholder='Search teams or Pokémon' value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery('')} onKeyDown={(e) => e.key === 'Escape' && setSearching(false)} />
				</div>
			)}
			{cards ? (
				// No content-visibility here: its paint containment would clip a card swinging on its corner.
				<ol className='grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-3 pb-6 pt-1'>
					{shown.slice(0, count).map((team) => (
						<li key={team.id} className='flex'>
							<TeamTile team={team} open={team.id === openTeamId} />
						</li>
					))}
					{empty}
				</ol>
			) : (
				<ol className='flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-6'>
					{shown.slice(0, count).map((team, i) => (
						// Off-screen cards skip layout and paint; the browser keeps their last measured height.
						<li key={team.id} className={`[contain-intrinsic-size:auto_92px] [content-visibility:auto] ${i > 0 ? 'border-t border-line' : ''}`}>
							<TeamCard team={team} open={team.id === openTeamId} />
						</li>
					))}
					{empty}
				</ol>
			)}
		</aside>
	);
}

/** Click or Enter/Space opens a team that isn't open. Shared by the list row and the card. */
function openProps(team: Team, open: boolean) {
	return {
		onClick: () => !open && openTeamWithMotion(team.id),
		onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
			if (!open && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
				e.preventDefault();
				openTeamWithMotion(team.id);
			}
		},
		role: open ? undefined : 'button',
		tabIndex: open ? undefined : 0,
		'data-team-card': team.id,
	};
}

/** The six slots, in a row or a 2×3 grid. The desktop open team leaves them empty, since its members are in the party. */
function TeamSlots({ team, open, className }: { team: Team; open: boolean; className: string }) {
	const slots = Array.from({ length: MAX_TEAM_SIZE }, (_, i) => team.members[i]);
	// A phone shows every icon on the open team too, so the team list always shows the whole team.
	const mobile = useIsMobile();
	const collapsed = open && !mobile;
	return (
		// 32 px slots, not size-8: the root font is 14 px, so size-8 would be 28 px and the 32 px icons would overlap.
		<div className={className}>
			{slots.map((m, i) => (
				<TeamSlot key={i} team={team} index={i} empty={!collapsed && !m} onPick={m && !open ? () => openTeamWithMotion(team.id, m.uid) : undefined}>
					{m &&
						!collapsed &&
						(open ? (
							<PokemonIcon species={m.species} className='bounce-glyph' />
						) : (
							<DraggableMember team={team} member={m}>
								<PokemonIcon species={m.species} className='bounce-glyph' />
							</DraggableMember>
						))}
				</TeamSlot>
			))}
		</div>
	);
}

/** Name (a ghost input on the open team) and the legality issue count, plus any controls that share the row. */
function TeamName({ team, open, children }: { team: Team; open: boolean; children?: React.ReactNode }) {
	const renameTeam = useStore((s) => s.renameTeam);
	const issues = useStore((s) => s.validation[team.id]?.count ?? 0);
	return (
		<div className='flex h-[20px] items-center gap-1.5'>
			{open ? (
				<input
					aria-label='Team name'
					defaultValue={team.name}
					key={team.name}
					onBlur={(e) => renameTeam(team.id, e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
						if (e.key === 'Escape') {
							(e.target as HTMLInputElement).value = team.name;
							(e.target as HTMLInputElement).blur();
						}
					}}
					className='-mx-1 w-0 min-w-0 flex-1 rounded px-1 text-base font-semibold outline-none hover:bg-hover focus:bg-hover'
				/>
			) : (
				<span className='min-w-0 flex-1 truncate text-base font-semibold'>{team.name}</span>
			)}
			{issues > 0 && team.mode === 'competitive' && (
				<span className='inline-flex items-center gap-1 text-xs tabular-nums text-danger' title={`${issues} legality issue${issues === 1 ? '' : 's'}`}>
					<Icon name='warning' />
					{issues}
				</span>
			)}
			{children}
		</div>
	);
}

/** The format and size line on a closed team. The open team shows its controls in this line instead. */
function TeamMeta({ team }: { team: Team }) {
	return (
		<span className='truncate text-xs text-muted'>
			{formatLabel(team)} - {team.members.length}/{MAX_TEAM_SIZE}
		</span>
	);
}

/** Memoized: an edit replaces only its own team object, so every other card skips the render. */
const TeamCard = memo(function TeamCard({ team, open }: { team: Team; open: boolean }) {
	return (
		<div className={`group my-1 flex flex-col gap-2 rounded-md p-3 transition-colors ${open ? 'bg-hover' : 'cursor-pointer hover:bg-hover'}`} {...openProps(team, open)}>
			{!open && <span className='sr-only'>Open </span>}
			<TeamSlots team={team} open={open} className='flex gap-2' />
			<TeamName team={team} open={open} />
			{open ? <TeamControls team={team} withMode /> : <TeamMeta team={team} />}
		</div>
	);
});

/**
 * Card view: a framed card with the six icons in a 2×3 grid. On a desktop hover it
 * swings from its top-left corner (`.hinge`), unless fancy animations are off; opening it drops and shatters it.
 * The mode toggle moves up to the name row, since the card is too narrow for the full control line.
 */
const TeamTile = memo(function TeamTile({ team, open }: { team: Team; open: boolean }) {
	const still = useStore((s) => !s.fancyMotion);
	return (
		<div
			className={`group relative flex min-w-0 flex-1 flex-col gap-2 rounded-md border border-line p-3 ${open ? 'bg-hover' : 'hinge cursor-pointer bg-bg hover:z-10 hover:bg-hover'}`}
			data-team-tile={team.id}
			data-still={still || undefined}
			{...openProps(team, open)}
		>
			{!open && <span className='sr-only'>Open </span>}
			<TeamSlots team={team} open={open} className='grid w-fit grid-cols-3 gap-1' />
			<TeamName team={team} open={open}>
				{open && <ModeButton team={team} />}
			</TeamName>
			{open ? <TeamControls team={team} compact /> : <TeamMeta team={team} />}
		</div>
	);
});

/** A member on a team that isn't open. Drag it onto another team's card, or into the open party. */
function DraggableMember({ team, member, children }: { team: Team; member: PokemonSet; children: React.ReactNode }) {
	const { setNodeRef, listeners, isDragging } = useDraggable({ id: `member:${member.uid}`, data: { kind: 'member', uid: member.uid, species: member.species, teamId: team.id } });
	return (
		<span ref={setNodeRef} {...listeners} className={`drag-source block size-[32px] cursor-grab ${isDragging ? 'opacity-30' : ''}`}>
			{children}
		</span>
	);
}

/** A slot on a team card. Dropping a suggestion adds it to that team; dropping a member moves it there. */
function TeamSlot({ team, index, empty, onPick, children }: { team: Team; index: number; empty: boolean; onPick?: () => void; children?: React.ReactNode }) {
	const { setNodeRef, isOver, active } = useDroppable({ id: `teamslot:${team.id}:${index}`, data: { kind: 'teamslot', teamId: team.id, index } });
	const drag = active?.data.current as DragData | undefined;
	const dragging = drag?.kind === 'candidate' || drag?.kind === 'member' || drag?.kind === 'evolution';
	// Every slot re-renders whenever the drag moves over something new; the answer only changes with the drag or this team.
	const ok = useMemo(() => !!dragging && accepts(drag, { kind: 'teamslot', teamId: team.id, index }), [dragging, drag, team, index]);
	return (
		<span
			ref={setNodeRef}
			data-team-icon={`${team.id}:${index}`}
			onClick={onPick && ((e) => { e.stopPropagation(); onPick(); })}
			className={`bounce-host size-[32px] rounded-md border transition-colors ${onPick ? 'cursor-pointer' : ''} ${
				dragging
					? isOver
						? ok ? 'border-dashed border-accent bg-accent-soft' : 'border-dashed border-danger'
						: ok ? 'border-dashed border-accent/60' : 'border-dashed border-line-strong/60'
					: empty ? 'border-dashed border-line-strong/60' : 'border-transparent'
			}`}
		>
			{children}
		</span>
	);
}

const GENS = Array.from({ length: 9 }, (_, i) => 9 - i);
let casualOpts: React.ReactNode;
let formatOpts: React.ReactNode;
/** The same elements every render: React skips diffing about 100 options when the open team changes. */
const casualOptions = () =>
	(casualOpts ??= GENS.map((g) => (
		<option key={g} value={`casual:${g}`}>Gen {g}</option>
	)));
const formatOptions = () =>
	(formatOpts ??= GENS.map((g) => (
		<optgroup key={g} label={`Gen ${g}`}>
			{formatsForGen(g).map((f) => (
				<option key={f.id} value={f.id}>Gen {g} {f.name}</option>
			))}
		</optgroup>
	)));

function ModeButton({ team }: { team: Team }) {
	const setTeamContext = useStore((s) => s.setTeamContext);
	return (
		<IconButton
			size='sm'
			icon={team.mode}
			label={team.mode === 'competitive' ? 'Competitive. Switch to casual' : 'Casual. Switch to competitive'}
			onClick={() => setTeamContext(team.id, team.mode === 'competitive' ? { mode: 'casual' } : { mode: 'competitive', format: team.format === 'casual' ? `gen${team.gen}ou` : team.format })}
		/>
	);
}

/**
 * The open team's controls, in place of its format line: mode (list only), generation and format,
 * duplicate, export, delete. The row keeps the line's 16 px height (in pixels, since the root font is 14 px
 * and h-4 would be 14) and its buttons overflow it, so opening a team never changes the height of its card.
 * `compact` is the narrow card in card view.
 */
function TeamControls({ team, withMode, compact }: { team: Team; withMode?: boolean; compact?: boolean }) {
	const setTeamContext = useStore((s) => s.setTeamContext);
	const duplicateTeam = useStore((s) => s.duplicateTeam);
	const deleteTeam = useStore((s) => s.deleteTeam);
	const toast = useStore((s) => s.toast);
	const [confirming, setConfirming] = useState(false);
	const value = team.mode === 'casual' ? `casual:${team.gen}` : team.format;
	const label = team.mode === 'casual' ? `Gen ${team.gen}` : `Gen ${team.gen} ${formatsForGen(team.gen).find((f) => f.id === team.format)?.name ?? team.format}`;
	const copy = async () => {
		if (!team.members.length) return toast('error', 'This team has no Pokémon to export');
		try {
			await navigator.clipboard.writeText(exportTeam(team));
			toast('success', `${team.name} copied as Showdown text`);
		} catch {
			toast('error', "Couldn't copy to the clipboard");
		}
	};
	return (
		<div className='flex h-[16px] items-center'>
			{withMode && <ModeButton team={team} />}
			{/* The select is invisible over its label, so a long format name truncates instead of pushing the buttons out. */}
			<label
				className={`relative flex h-[20px] min-w-0 flex-1 items-center gap-0.5 rounded-md hover:bg-hover has-[select:focus-visible]:outline has-[select:focus-visible]:outline-[1.5px] has-[select:focus-visible]:outline-accent max-md:h-7 ${withMode ? 'px-1' : 'pr-1'}`}
			>
				<span className='sr-only'>Generation and format</span>
				<span aria-hidden='true' className={`truncate font-medium ${compact ? 'text-2xs max-md:text-xs' : 'text-xs'}`}>
					{label}
				</span>
				{!compact && <Icon name='chevron-down' size={12} className='text-muted' />}
				<select
					value={value}
					onChange={(e) => {
						const v = e.target.value;
						if (v.startsWith('casual:')) setTeamContext(team.id, { mode: 'casual', gen: Number(v.slice(7)) });
						else setTeamContext(team.id, { mode: 'competitive', format: v, gen: Number(v.match(/^gen(\d)/)![1]) });
					}}
					className='absolute inset-0 size-full cursor-pointer appearance-none opacity-0'
				>
					{team.mode === 'casual' ? casualOptions() : formatOptions()}
				</select>
			</label>
			<IconButton size='sm' icon='duplicate' label='Duplicate team' onClick={() => duplicateTeam(team.id)} />
			<IconButton size='sm' icon='export' label='Copy as Showdown text' onClick={copy} />
			{confirming ? (
				<button
					type='button'
					autoFocus
					onBlur={() => setConfirming(false)}
					onClick={() => deleteTeam(team.id)}
					className='squishy h-[24px] shrink-0 rounded-md bg-danger px-1.5 text-2xs font-medium text-white max-md:h-7 max-md:px-2 max-md:text-xs'
				>
					Delete?
				</button>
			) : (
				<IconButton size='sm' icon='trash' label='Delete team' tooltipAlign='end' onClick={() => setConfirming(true)} />
			)}
		</div>
	);
}
