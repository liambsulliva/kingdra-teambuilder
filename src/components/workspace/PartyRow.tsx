'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { accepts, type DragData } from '@/lib/drag';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { getSpecies } from '@/lib/dex';
import { MAX_TEAM_SIZE, type PokemonSet } from '@/lib/model';
import { useOpenTeam, useStore } from '@/lib/store';
import { selectWithLift } from '@/components/motion/choreography';
import { useIsMobile } from '@/lib/hooks';

/** One fixed cell of the party row. Cells never move, so the skeletons stay put as members come and go. */
function PartyCell({ teamId, index, member, occupied, onHover, onTap }: { teamId: string; index: number; member?: PokemonSet; occupied: boolean; onHover: (m: PokemonSet | null) => void; onTap?: (m: PokemonSet, from: DOMRect, source: HTMLElement) => void }) {
	const { setNodeRef: dropRef, isOver, active } = useDroppable({ id: `party:${index}`, data: { kind: 'party', index } });
	const drag = active?.data.current as DragData | undefined;
	// Only cells the dragged item could land on light up.
	const live = !!drag && accepts(drag, { kind: 'party', index });
	const self = !!member && String(active?.id).endsWith(member.uid);
	return (
		<div
			ref={dropRef}
			className={`relative size-8 rounded-md border transition-colors ${
				live ? (isOver && !self ? 'border-dashed border-accent bg-accent-soft' : 'border-dashed border-accent/60') : occupied ? 'border-transparent' : 'border-dashed border-line-strong/60'
			}`}
		>
			{member && <MemberButton teamId={teamId} member={member} index={index} onHover={onHover} onTap={onTap} />}
		</div>
	);
}

function MemberButton({ teamId, member, index, onHover, onTap }: { teamId: string; member: PokemonSet; index: number; onHover: (m: PokemonSet | null) => void; onTap?: (m: PokemonSet, from: DOMRect, source: HTMLElement) => void }) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `member:${member.uid}`, data: { kind: 'member', uid: member.uid, species: member.species, teamId } });
	const picked = useStore((s) => s.boxOpen && s.boxPartyUid === member.uid);
	const flagged = useStore((s) => (s.validation[s.openTeamId]?.byMember[member.uid]?.length ?? 0) > 0);
	return (
		<button
			ref={setNodeRef}
			type='button'
			{...listeners}
			{...attributes}
			data-party-member
			data-index={index}
			data-species={member.species}
			aria-label={`${member.name || member.species}. Put on the card`}
			onClick={(e) => {
				if (onTap) return onTap(member, e.currentTarget.getBoundingClientRect(), e.currentTarget);
				// With the Box open, a click picks the member there instead of putting it on the card.
				if (useStore.getState().boxOpen) useStore.getState().setBoxPartyUid(member.uid);
				else selectWithLift(member, e.currentTarget.getBoundingClientRect(), e.currentTarget);
			}}
			onMouseEnter={() => onHover(member)}
			onMouseLeave={() => onHover(null)}
			onFocus={() => onHover(member)}
			onBlur={() => onHover(null)}
			className={`bounce-host squishy drag-source absolute -inset-px block rounded-md ${isDragging ? 'opacity-30' : ''} ${picked ? 'bg-accent-soft' : ''}`}
		>
			<span className='absolute inset-px'>
				<PokemonIcon species={member.species} className='bounce-glyph' />
			</span>
			{flagged && <span className='absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-danger' aria-label='Has legality issues' />}
		</button>
	);
}

/**
 * Bottom-left party: six fixed cells, one per member, the member on the card included. On phones a tap hops a
 * member up onto the card (or runs `onTap`), and the caption names the member on the card rather than the last
 * one touched.
 */
export function PartyRow({ onTap, className = '' }: { onTap?: (m: PokemonSet, from: DOMRect, source: HTMLElement) => void; className?: string } = {}) {
	const team = useOpenTeam();
	const selectedUid = useStore((s) => s.selectedUid);
	const rejectedAt = useStore((s) => s.rejectedAt);
	const mobile = useIsMobile();
	const [hoveredState, setHovered] = useState<PokemonSet | null>(null);
	const onCard = team.members.find((m) => m.uid === selectedUid) ?? null;
	// Touch has no hover: a tap would otherwise leave its label behind, even after that member is gone.
	const hovered = mobile ? onCard : hoveredState && team.members.some((m) => m.uid === hoveredState.uid) ? hoveredState : null;
	const hover = mobile ? () => undefined : setHovered;
	const tap = onTap ?? (mobile ? (m: PokemonSet, from: DOMRect, source: HTMLElement) => void selectWithLift(m, from, source) : undefined);
	const species = hovered ? getSpecies(team, hovered.species) : null;
	return (
		<div className={`flex flex-col gap-2 ${className}`} data-party>
			<motion.div
				key={rejectedAt}
				animate={rejectedAt ? { x: [0, -6, 5, -3, 0] } : undefined}
				transition={{ duration: 0.36 }}
				className='flex gap-2'
			>
				{Array.from({ length: MAX_TEAM_SIZE }, (_, i) => {
					const m = team.members[i];
					return <PartyCell key={i} teamId={team.id} index={i} occupied={!!m} member={m} onHover={hover} onTap={tap} />;
				})}
			</motion.div>
			<p className='flex h-4 items-center gap-2 text-xs' aria-live='polite'>
				{hovered ? (
					<>
						<span className='font-medium'>{hovered.name || hovered.species}</span>
						<span className='flex gap-1'>{species?.types.map((t) => <TypeBadge key={t} type={t} />)}</span>
					</>
				) : (
					<>
						<span className='text-muted'>Party</span>
						<span className='tabular-nums text-muted'>
							{team.members.length}/{MAX_TEAM_SIZE}
						</span>
					</>
				)}
			</p>
		</div>
	);
}
