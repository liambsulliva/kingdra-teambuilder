'use client';

import { useState } from 'react';
import {
	DndContext,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	pointerWithin,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragOverEvent,
	type DragStartEvent,
} from '@dnd-kit/core';
import { CandidateOverlay } from '@/components/browse/BottomPanel';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { TYPE_COLORS } from '@/components/ui/TypeBadge';
import { accepts, type DragData, type DropTarget } from '@/lib/drag';
import { useStore } from '@/lib/store';
import { poof, pop } from '@/components/motion/choreography';
import { selectWithLift } from '@/components/workspace/PartyRow';

export function DragLayer({ children }: { children: React.ReactNode }) {
	const [active, setActive] = useState<DragData | null>(null);
	const [ok, setOk] = useState(true);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
		useSensor(KeyboardSensor)
	);

	const onStart = (e: DragStartEvent) => {
		setActive(e.active.data.current as DragData);
		setOk(true);
	};
	const onOver = (e: DragOverEvent) => setOk(accepts(e.active.data.current as DragData, e.over?.data.current as DropTarget));

	const onEnd = (e: DragEndEvent) => {
		const drag = e.active.data.current as DragData;
		const over = e.over?.data.current as DropTarget;
		const s = useStore.getState();
		const open = s.library.teams.find((t) => t.id === s.openTeamId)!;
		setActive(null);
		const point = (e.activatorEvent as PointerEvent | undefined) && 'clientX' in (e.activatorEvent as PointerEvent)
			? { x: (e.activatorEvent as PointerEvent).clientX + e.delta.x, y: (e.activatorEvent as PointerEvent).clientY + e.delta.y }
			: null;
		const landed = (selector: string) => requestAnimationFrame(() => pop(document.querySelector(selector)));
		const partyCell = (index: number) => `[data-party-member][data-index="${index}"]`;

		if (drag.kind === 'candidate') {
			if (over?.kind === 'card') {
				// Nothing to compare against on an empty team, so the drop adds the first member and puts it on the card.
				if (!open.members.length) {
					if (s.addMember(drag.species!)) {
						const added = useStore.getState().library.teams.find((t) => t.id === open.id)!.members[0];
						const from = point && new DOMRect(point.x - 16, point.y - 16, 32, 32);
						selectWithLift(added, from || undefined);
					}
					return;
				}
				return s.compare(drag.species!);
			}
			if (over?.kind === 'teamslot') return void s.addMemberToTeam(over.teamId, drag.species!, over.index);
			// addMember rejects a seventh member itself (toast + party shake).
			if (over?.kind === 'party') {
				const at = Math.min(over.index!, open.members.length);
				if (s.addMember(drag.species!, over.index)) landed(partyCell(at));
			}
			return;
		}
		if (drag.kind === 'evolution') {
			// The member leaves the open team and arrives on the target team as this evolution.
			if (over?.kind === 'teamslot') s.moveMemberToTeam(drag.uid!, drag.teamId!, over.teamId, over.index, drag.species);
			return;
		}
		if (drag.kind === 'member') {
			const own = drag.teamId === open.id;
			// A long-press that never moved is a request for the action sheet (touch).
			if (Math.hypot(e.delta.x, e.delta.y) < 6) {
				if (own && window.matchMedia('(max-width: 767px)').matches) useStore.setState({ mobileActionUid: drag.uid });
				return;
			}
			if (over?.kind === 'teamslot') {
				if (over.teamId !== drag.teamId) s.moveMemberToTeam(drag.uid!, drag.teamId!, over.teamId, over.index);
				return;
			}
			if (!own) {
				// Another team's member can only be dropped into the open party.
				if (over?.kind === 'party') {
					const at = Math.min(over.index!, open.members.length);
					if (s.moveMemberToTeam(drag.uid!, drag.teamId!, open.id, over.index)) landed(partyCell(at));
				}
				return;
			}
			// Released anywhere that isn't the party or the Box: poof.
			if (!over || (over.kind !== 'party' && over.kind !== 'boxcell')) {
				s.removeMember(drag.uid!);
				if (point) poof(point.x, point.y);
				return;
			}
			if (over.kind === 'party') return s.reorderMember(drag.uid!, over.index!);
			if (over.kind === 'boxcell') return s.storeInBox(drag.uid!, over.box, over.slot);
			return;
		}
		if (drag.kind === 'boxset') {
			if (over?.kind === 'party') return s.takeFromBox(drag.box!, drag.slot!, over.index! < open.members.length ? over.index : undefined);
			if (over?.kind === 'boxcell') return s.moveInBox(drag.box!, drag.slot!, over.box!, over.slot!);
			return;
		}
		if (drag.kind === 'move') {
			if (!s.selectedUid) return;
			if (over?.kind === 'moveslot') {
				s.setMove(s.selectedUid, over.slot!, drag.move!);
				landed(`[data-move-slot="${over.slot}"]`);
			} else if (drag.slot !== undefined) {
				// Dragged off its slot and dropped anywhere else: the move leaves the set, with the same poof as a removed Pokémon.
				s.setMove(s.selectedUid, drag.slot, '');
				if (point) poof(point.x, point.y);
			}
		}
	};

	return (
		<DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onStart} onDragOver={onOver} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
			{children}
			<DragOverlay dropAnimation={ok ? null : { duration: 360, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }} zIndex={90}>
				{active?.kind === 'move' ? (
					<span className='flex -rotate-3 items-center gap-1.5 rounded-md bg-bg px-2 py-1 text-base font-medium shadow-lg ring-1 ring-line'>
						<span className='size-2 rounded-sm' style={{ background: TYPE_COLORS[active.type!] }} />
						{active.move}
					</span>
				) : active?.kind === 'candidate' ? (
					<CandidateOverlay species={active.species!} />
				) : active?.species ? (
					<span className='block size-8 -rotate-12 drop-shadow-md'>
						<PokemonIcon species={active.species} />
					</span>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
