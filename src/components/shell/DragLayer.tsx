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
import { MAX_TEAM_SIZE } from '@/lib/model';
import { canUseSpecies } from '@/lib/dex';
import { useStore } from '@/lib/store';
import { poof, pop } from '@/components/motion/choreography';

type Data = { kind: 'candidate' | 'member' | 'boxset' | 'move'; species?: string; uid?: string; box?: number; slot?: number; move?: string; type?: string };
type Target = { kind: 'party' | 'moveslot' | 'boxcell' | 'card' | 'teamslot'; index?: number; slot?: number; box?: number; teamId?: string } | undefined;

/** Would dropping `drag` on `over` be accepted? Rejected drops spring back. */
function accepts(drag: Data, over: Target) {
	const s = useStore.getState();
	const team = s.library.teams.find((t) => t.id === s.openTeamId)!;
	if (!over) return drag.kind === 'member'; // released outside: remove (poof)
	switch (drag.kind) {
		case 'candidate':
			if (over.kind === 'teamslot') {
				const target = s.library.teams.find((t) => t.id === over.teamId);
				return !!target && (target.members.length < MAX_TEAM_SIZE || over.index! < target.members.length) && canUseSpecies(target, drag.species!);
			}
			return (over.kind === 'party' && (team.members.length < MAX_TEAM_SIZE || over.index! < team.members.length)) || over.kind === 'card';
		case 'member':
			return over.kind !== 'teamslot';
		case 'boxset':
			return (over.kind === 'party' && (over.index! < team.members.length || team.members.length < MAX_TEAM_SIZE)) || over.kind === 'boxcell';
		case 'move':
			return over.kind === 'moveslot';
	}
}

export function DragLayer({ children }: { children: React.ReactNode }) {
	const [active, setActive] = useState<Data | null>(null);
	const [ok, setOk] = useState(true);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
		useSensor(KeyboardSensor)
	);

	const onStart = (e: DragStartEvent) => {
		setActive(e.active.data.current as Data);
		setOk(true);
	};
	const onOver = (e: DragOverEvent) => setOk(accepts(e.active.data.current as Data, e.over?.data.current as Target));

	const onEnd = (e: DragEndEvent) => {
		const drag = e.active.data.current as Data;
		const over = e.over?.data.current as Target;
		const s = useStore.getState();
		setActive(null);
		const point = (e.activatorEvent as PointerEvent | undefined) && 'clientX' in (e.activatorEvent as PointerEvent)
			? { x: (e.activatorEvent as PointerEvent).clientX + e.delta.x, y: (e.activatorEvent as PointerEvent).clientY + e.delta.y }
			: null;
		const landed = (selector: string) => requestAnimationFrame(() => pop(document.querySelector(selector)));

		if (drag.kind === 'candidate') {
			if (over?.kind === 'card') return s.compare(drag.species!);
			if (over?.kind === 'teamslot') return void s.addMemberToTeam(over.teamId!, drag.species!, over.index);
			// addMember rejects a seventh member itself (toast + party shake).
			if (over?.kind === 'party' && s.addMember(drag.species!, over.index)) landed('[data-party] [data-party-member]:last-of-type');
			return;
		}
		// A long-press that never moved is a request for the action sheet (touch).
		if (drag.kind === 'member' && Math.hypot(e.delta.x, e.delta.y) < 6) {
			if (window.matchMedia('(max-width: 767px)').matches) useStore.setState({ mobileActionUid: drag.uid });
			return;
		}
		if (drag.kind === 'member') {
			if (over?.kind === 'teamslot') return;
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
			if (over?.kind === 'party') return s.takeFromBox(drag.box!, drag.slot!, over.index! < (s.library.teams.find((t) => t.id === s.openTeamId)?.members.length ?? 0) ? over.index : undefined);
			if (over?.kind === 'boxcell') return s.moveInBox(drag.box!, drag.slot!, over.box!, over.slot!);
			return;
		}
		if (drag.kind === 'move' && over?.kind === 'moveslot' && s.selectedUid) {
			s.setMove(s.selectedUid, over.slot!, drag.move!);
			landed(`[data-move-slot="${over.slot}"]`);
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
