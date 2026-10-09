'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { getSpecies } from '@/lib/dex';
import { MAX_TEAM_SIZE, type PokemonSet } from '@/lib/model';
import { useOpenTeam, useStore } from '@/lib/store';
import { liftToCard } from '@/components/motion/choreography';

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

/** One fixed cell of the party row. Cells never move, so the skeletons stay put as members come and go. */
function PartyCell({ index, member, occupied, onHover }: { index: number; member?: PokemonSet; occupied: boolean; onHover: (m: PokemonSet | null) => void }) {
	const { setNodeRef: dropRef, isOver, active } = useDroppable({ id: `party:${index}`, data: { kind: 'party', index } });
	const live = !!active && active.data.current?.kind !== 'move';
	const dropHint = isOver && live && !(member && String(active.id).endsWith(member.uid));
	return (
		<div
			ref={dropRef}
			className={`relative size-8 rounded-md border transition-colors ${
				occupied ? 'border-transparent' : isOver && live ? 'border-dashed border-accent bg-accent-soft' : live ? 'border-dashed border-accent/60' : 'border-dashed border-line-strong/60'
			} ${member && dropHint ? 'outline-dashed outline-1 outline-accent' : ''}`}
		>
			{member && <MemberButton member={member} index={index} onHover={onHover} />}
		</div>
	);
}

function MemberButton({ member, index, onHover }: { member: PokemonSet; index: number; onHover: (m: PokemonSet | null) => void }) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `member:${member.uid}`, data: { kind: 'member', uid: member.uid, species: member.species } });
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
				// With the Box open, a click picks the member there instead of putting it on the card.
				if (useStore.getState().boxOpen) useStore.getState().setBoxPartyUid(member.uid);
				else selectWithLift(member, e.currentTarget.getBoundingClientRect());
			}}
			onMouseEnter={() => onHover(member)}
			onMouseLeave={() => onHover(null)}
			onFocus={() => onHover(member)}
			onBlur={() => onHover(null)}
			className={`bounce-host squishy absolute -inset-px block rounded-md ${isDragging ? 'opacity-30' : ''} ${picked ? 'bg-accent-soft' : ''}`}
		>
			<span className='absolute inset-px'>
				<PokemonIcon species={member.species} className='bounce-glyph' />
			</span>
			{flagged && <span className='absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-danger' aria-label='Has legality issues' />}
		</button>
	);
}

/** Bottom-left party: six fixed cells. */
export function PartyRow() {
	const team = useOpenTeam();
	const selectedUid = useStore((s) => s.selectedUid);
	const rejectedAt = useStore((s) => s.rejectedAt);
	const [hovered, setHovered] = useState<PokemonSet | null>(null);
	const species = hovered ? getSpecies(team, hovered.species) : null;
	return (
		<div className='flex flex-col gap-2' data-party>
			<motion.div
				key={rejectedAt}
				animate={rejectedAt ? { x: [0, -6, 5, -3, 0] } : undefined}
				transition={{ duration: 0.36 }}
				className='flex gap-2'
			>
				{Array.from({ length: MAX_TEAM_SIZE }, (_, i) => {
					const m = team.members[i];
					// The member on the card leaves its cell blank: no skeleton, so it never reads as a free slot.
					return <PartyCell key={i} index={i} occupied={!!m} member={m && m.uid !== selectedUid ? m : undefined} onHover={setHovered} />;
				})}
			</motion.div>
			<p className='flex h-4 items-center gap-2 text-xs' aria-live='polite'>
				{hovered ? (
					<>
						<span className='font-medium'>{hovered.name || hovered.species}</span>
						<span className='flex gap-1'>{species?.types.map((t) => <TypeBadge key={t} type={t} />)}</span>
						<span className='text-muted'>drag out to remove</span>
					</>
				) : (
					<>
						<span className='text-muted'>Party</span>
						<span className='tabular-nums text-muted'>
							{team.members.length}/{MAX_TEAM_SIZE}
							{selectedUid ? ` - ${team.members.find((m) => m.uid === selectedUid)?.species} is on the card` : ''}
						</span>
					</>
				)}
			</p>
		</div>
	);
}
