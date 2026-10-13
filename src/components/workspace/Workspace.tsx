'use client';

import { useDroppable } from '@dnd-kit/core';
import { formatLabel } from '@/lib/dex';
import { accepts, type DragData } from '@/lib/drag';
import { MAX_TEAM_SIZE, type Team } from '@/lib/model';
import { useOpenTeam, useSelectedMember, useStore } from '@/lib/store';
import { ExpandedCard } from './ExpandedCard';
import { PartyRow } from './PartyRow';
import { useIsMobile } from '@/lib/hooks';

/** `empty` adds to the empty state (mobile: starter suggestions). */
export function Workspace({ empty }: { empty?: React.ReactNode } = {}) {
	const team = useOpenTeam();
	const member = useSelectedMember();
	const boxOpen = useStore((s) => s.boxOpen);
	// A Pokémon dropped anywhere on the card goes onto the card: see DragLayer.
	const { setNodeRef, isOver, active } = useDroppable({ id: 'card', data: { kind: 'card' } });
	const pokemonOver = isOver && !!active && active.data.current?.kind !== 'move' && accepts(active.data.current as DragData, { kind: 'card' });

	return (
		<div className='flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-4 pt-5 md:px-10 md:pb-6 md:pt-6'>
			<div
				ref={setNodeRef}
				className={`relative -m-2 min-h-0 flex-1 overflow-y-auto rounded-lg p-2 transition-colors ${pokemonOver ? 'bg-accent-soft' : ''}`}
			>
				{member ? (
					<ExpandedCard key={member.uid} team={team} member={member} />
				) : (
					<EmptyState team={team}>{!team.members.length && empty}</EmptyState>
				)}
			</div>
			{/* While the Box is open the party rides on the drawer instead. */}
			<div className='pt-2'>{boxOpen ? <div className='h-14' /> : <PartyRow />}</div>
		</div>
	);
}

function EmptyState({ team, children }: { team: Team; children?: React.ReactNode }) {
	const mobile = useIsMobile();
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
					: `Drag a suggestion onto the party, or ${mobile ? 'tap' : 'click'} one to add it.`}
			</p>
			{children}
		</div>
	);
}
