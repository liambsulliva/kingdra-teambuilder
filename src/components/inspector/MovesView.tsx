'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Move } from '@pkmn/data';
import { Icon } from '@/components/ui/Icon';
import { SearchField, Tab } from '@/components/ui/controls';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { cachedLearnableMoves, learnableMoves } from '@/lib/dex';
import { MAX_MOVES, type PokemonSet, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';
import { cachedSuggestions, NO_SUGGESTIONS, suggestionsFor } from '@/lib/hooks';
import { landOn } from '@/components/motion/choreography';

const CATS = ['All', 'Physical', 'Special', 'Status'] as const;
const CAT_SHORT: Record<string, string> = {
	Physical: 'Phys',
	Special: 'Spec',
	Status: 'Status',
};

/** Memoized: picking a move re-renders only the rows whose state changed. */
const MoveRow = memo(function MoveRow({
	move,
	state,
	usage,
	onPick,
}: {
	move: Move;
	state: 'default' | 'current' | 'used';
	usage?: number;
	onPick: (move: Move) => void;
}) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: `move:${move.name}`,
		data: { kind: 'move', move: move.name, type: move.type },
	});
	return (
		<button
			ref={setNodeRef}
			type='button'
			{...listeners}
			{...attributes}
			onClick={() => onPick(move)}
			title={move.shortDesc || move.desc}
			className={`squishy drag-source flex h-9 w-full items-center gap-2 rounded px-2 text-left transition-colors ${
				state === 'current' ? 'bg-accent-soft' : 'hover:bg-hover'
			} ${isDragging ? 'opacity-40' : ''}`}
		>
			<span className='w-16 shrink-0'>
				<TypeBadge type={move.type} />
			</span>
			<span
				className={`min-w-0 flex-1 truncate text-base font-medium ${state === 'current' ? 'text-accent' : state === 'used' ? 'text-muted' : ''}`}
			>
				{move.name}
				{state === 'used' && (
					<Icon name='check' className='ml-1 inline text-muted' size={14} />
				)}
				{usage !== undefined && usage > 0 && (
					<span className='ml-1.5 text-xs font-normal tabular-nums text-muted'>
						{usage}%
					</span>
				)}
			</span>
			<span className='w-10 shrink-0 text-right text-xs text-muted'>
				{CAT_SHORT[move.category]}
			</span>
			<span className='w-8 shrink-0 text-right text-xs tabular-nums text-muted'>
				{move.basePower || '—'}
			</span>
			<span className='w-10 shrink-0 text-right text-xs tabular-nums text-muted'>
				{move.accuracy === true ? '—' : `${move.accuracy}%`}
			</span>
		</button>
	);
});

export function MovesView({
	team,
	member,
}: {
	team: Team;
	member: PokemonSet;
}) {
	const activeSlot = useStore((s) => s.activeMoveSlot);
	const pickMove = useStore((s) => s.pickMove);
	const chose = useStore((s) => s.chose);
	const { mode, gen, format } = team;
	const ctx = useMemo(() => ({ mode, gen, format }) as Team, [mode, gen, format]);
	const [moves, setMoves] = useState<readonly Move[] | null>(() => cachedLearnableMoves(ctx, member.species, member.level));
	const [query, setQuery] = useState('');
	const [cat, setCat] = useState<(typeof CATS)[number]>('All');
	const suggestFormat = mode === 'casual' ? `gen${gen}ou` : format;
	const [suggested, setSuggested] = useState(() => cachedSuggestions(suggestFormat, member.species) ?? NO_SUGGESTIONS);
	const search = useRef<HTMLInputElement>(null);

	// A new slot starts a fresh search, as if the list had just opened.
	const [slotShown, setSlotShown] = useState(activeSlot);
	if (slotShown !== activeSlot) {
		setSlotShown(activeSlot);
		setQuery('');
		setCat('All');
	}
	const firstSlot = useRef(true);
	useEffect(() => {
		if (firstSlot.current) firstSlot.current = false;
		else search.current?.focus();
	}, [activeSlot]);

	// Only moves the Pokémon can know at its level are offered; a level-up move above it is not.
	// Keyed on the team's context, not the team object: picking a move must not reload the list.
	useEffect(() => {
		let live = true;
		const cached = cachedLearnableMoves(ctx, member.species, member.level);
		setMoves(cached);
		if (!cached) learnableMoves(ctx, member.species, member.level).then((m) => live && setMoves(m));
		return () => {
			live = false;
		};
	}, [ctx, member.species, member.level]);

	// Suggested moves, like Showdown: Smogon usage stats and curated sets for
	// this species in the team's format (casual teams use their gen's OU).
	useEffect(() => {
		let live = true;
		const cached = cachedSuggestions(suggestFormat, member.species);
		setSuggested(cached ?? NO_SUGGESTIONS);
		if (!cached)
			suggestionsFor(suggestFormat, member.species)
				.then((m) => live && setSuggested(m))
				.catch(() => undefined);
		return () => {
			live = false;
		};
	}, [suggestFormat, member.species]);

	const shown = useMemo(() => {
		const q = query.trim().toLowerCase();
		return (moves ?? []).filter(
			(m) =>
				(cat === 'All' || m.category === cat) &&
				(!q || m.name.toLowerCase().includes(q) || m.type.toLowerCase() === q)
		);
	}, [moves, query, cat]);
	const top = shown
		.filter((m) => suggested.has(m.name))
		.sort((a, b) => suggested.get(b.name)! - suggested.get(a.name)!);
	const rest = top.length ? shown.filter((m) => !suggested.has(m.name)) : shown;

	const current = activeSlot !== null ? member.moves[activeSlot] : '';
	const padded = [...member.moves, '', '', '', ''].slice(0, MAX_MOVES);
	const nextEmpty = padded.findIndex((m) => !m);

	// The picked move lands in its slot on the card, the same pop as a drop.
	const pickNow = (move: Move) => {
		const target = member.moves.includes(move.name)
			? -1
			: activeSlot ?? nextEmpty;
		pickMove(move.name);
		chose();
		if (target >= 0) landOn(`[data-move-slot="${target}"]`);
	};
	// One callback for every row, so the memoized rows are not re-rendered for a new closure.
	const latestPick = useRef(pickNow);
	useLayoutEffect(() => {
		latestPick.current = pickNow;
	});
	const pick = useCallback((move: Move) => latestPick.current(move), []);

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex flex-col'>
				<span className='text-base font-semibold'>
					{current
						? `Replacing ${current}`
						: activeSlot !== null
							? `Move ${activeSlot + 1}`
							: 'Moves'}
				</span>
				<span className='text-xs text-muted'>
					{activeSlot !== null
						? 'Pick a move to set this slot, or drag it onto any slot'
						: nextEmpty >= 0
							? 'Pick a move to fill the next empty slot, or drag it onto any slot'
							: 'All four moves are set. Pick a slot on the card to replace it'}
				</span>
			</div>
			<SearchField
				ref={search}
				autoFocus
				placeholder={
					moves ? `Search ${moves.length} learnable moves` : 'Loading moves'
				}
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				onClear={() => setQuery('')}
			/>
			<div role='tablist' className='flex gap-4'>
				{CATS.map((c) => (
					<Tab key={c} selected={cat === c} onClick={() => setCat(c)}>
						{c}
					</Tab>
				))}
			</div>
			<div className='flex gap-2 px-2 text-xs text-muted'>
				<span className='w-16'>Type</span>
				<span className='flex-1'>Move</span>
				<span className='w-10 text-right'>Cat</span>
				<span className='w-8 text-right'>Pow</span>
				<span className='w-10 text-right'>Acc</span>
			</div>
			<div className='flex flex-col'>
				{!moves && (
					<span className='px-2 py-4 text-base text-muted'>
						Loading learnable moves…
					</span>
				)}
				{moves && !shown.length && (
					<span className='px-2 py-4 text-base text-muted'>
						No learnable moves match.
					</span>
				)}
				{top.length > 0 && (
					<>
						<span className='flex items-baseline gap-2 px-2 pb-1 pt-2 text-xs font-medium'>
							Suggested
							<span className='font-normal text-muted'>
								Smogon usage and sets
							</span>
						</span>
						{top.map((m) => (
							<MoveRow
								key={m.id}
								move={m}
								usage={suggested.get(m.name)}
								state={
									m.name === current
										? 'current'
										: member.moves.includes(m.name)
											? 'used'
											: 'default'
								}
								onPick={pick}
							/>
						))}
						{rest.length > 0 && (
							<span className='mt-3 border-t border-line px-2 pb-1 pt-3 text-xs font-medium'>
								All Moves
							</span>
						)}
					</>
				)}
				{rest.map((m) => (
					<MoveRow
						key={m.id}
						move={m}
						state={
							m.name === current
								? 'current'
								: member.moves.includes(m.name)
									? 'used'
									: 'default'
						}
						onPick={pick}
					/>
				))}
			</div>
		</div>
	);
}
