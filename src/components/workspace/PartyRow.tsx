'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { getSpecies } from '@/lib/dex';
import { MAX_TEAM_SIZE, type PokemonSet } from '@/lib/model';
import { useOpenTeam, useStore } from '@/lib/store';
import { liftToCard } from '@/components/motion/choreography';

const spring = { type: 'spring' as const, stiffness: 520, damping: 34 };

export async function selectWithLift(member: PokemonSet, from?: DOMRect) {
	const store = useStore.getState();
	store.selectMember(member.uid);
	if (!from) return;
	await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
	const sprite = document.querySelector<HTMLElement>('[data-card-sprite]');
	if (!sprite) return;
	sprite.style.opacity = '0';
	await liftToCard(member.species, from, sprite.getBoundingClientRect());
	sprite.style.opacity = '';
}

function MemberSlot({ member, index, onHover }: { member: PokemonSet; index: number; onHover: (m: PokemonSet | null) => void }) {
	const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({ id: `member:${member.uid}`, data: { kind: 'member', uid: member.uid, species: member.species } });
	const { setNodeRef: dropRef, isOver, active } = useDroppable({ id: `party:${index}`, data: { kind: 'party', index } });
	const flagged = useStore((s) => (s.validation[s.openTeamId]?.byMember[member.uid]?.length ?? 0) > 0);
	const dropHint = isOver && active && !String(active.id).endsWith(member.uid);
	return (
		<motion.div layout transition={spring} ref={dropRef} className='relative'>
			<button
				ref={dragRef}
				type='button'
				{...listeners}
				{...attributes}
				data-party-member
				data-index={index}
				data-species={member.species}
				aria-label={`${member.name || member.species}. Put on the card`}
				onClick={(e) => selectWithLift(member, e.currentTarget.getBoundingClientRect())}
				onMouseEnter={() => onHover(member)}
				onMouseLeave={() => onHover(null)}
				onFocus={() => onHover(member)}
				onBlur={() => onHover(null)}
				className={`bounce-host squishy relative block size-8 rounded-md ${dropHint ? 'outline-dashed outline-1 outline-accent' : ''} ${isDragging ? 'opacity-30' : ''}`}
			>
				<PokemonIcon species={member.species} className='bounce-glyph' />
				{flagged && <span className='absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-danger' aria-label='Has legality issues' />}
			</button>
		</motion.div>
	);
}

function EmptySlot({ index }: { index: number }) {
	const { setNodeRef, isOver, active } = useDroppable({ id: `party:${index}`, data: { kind: 'party', index } });
	const live = !!active && active.data.current?.kind !== 'move';
	return (
		<motion.div
			layout
			transition={spring}
			ref={setNodeRef}
			className={`size-8 rounded-md border border-dashed transition-colors ${
				isOver && live ? 'border-accent bg-accent-soft' : live ? 'border-accent/60' : 'border-line-strong/60'
			}`}
		/>
	);
}

/** Bottom-left party. While a member is on the card the row holds five. */
export function PartyRow() {
	const team = useOpenTeam();
	const selectedUid = useStore((s) => s.selectedUid);
	const rejectedAt = useStore((s) => s.rejectedAt);
	const [hovered, setHovered] = useState<PokemonSet | null>(null);
	const others = team.members.filter((m) => m.uid !== selectedUid);
	const positions = selectedUid ? MAX_TEAM_SIZE - 1 : MAX_TEAM_SIZE;
	const empties = Math.max(0, positions - others.length);
	const species = hovered ? getSpecies(team, hovered.species) : null;
	return (
		<div className='flex flex-col gap-2' data-party>
			<motion.div
				key={rejectedAt}
				animate={rejectedAt ? { x: [0, -6, 5, -3, 0] } : undefined}
				transition={{ duration: 0.36 }}
				className='flex gap-2'
			>
				{others.map((m) => (
					<MemberSlot key={m.uid} member={m} index={team.members.indexOf(m)} onHover={setHovered} />
				))}
				{Array.from({ length: empties }, (_, i) => (
					<EmptySlot key={`empty-${i}`} index={team.members.length + i} />
				))}
			</motion.div>
			<p className='flex h-4 items-center gap-2 text-xs' aria-live='polite'>
				{hovered ? (
					<>
						<span className='font-medium'>{hovered.name || hovered.species}</span>
						<span className='text-muted'>{species?.types.join(' · ').toLowerCase()} · drag out to remove</span>
					</>
				) : (
					<>
						<span className='text-muted'>Party</span>
						<span className='tabular-nums text-muted'>
							{team.members.length}/{MAX_TEAM_SIZE}
							{selectedUid ? ` · ${team.members.find((m) => m.uid === selectedUid)?.species} is on the card` : ''}
						</span>
					</>
				)}
			</p>
		</div>
	);
}
