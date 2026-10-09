import { canUseSpecies } from './dex';
import { MAX_TEAM_SIZE, type Team } from './model';
import { useStore } from './store';

export interface DragData {
	kind: 'candidate' | 'member' | 'boxset' | 'move';
	species?: string;
	/** A member's uid and the team it currently belongs to. */
	uid?: string;
	teamId?: string;
	box?: number;
	slot?: number;
	move?: string;
	type?: string;
}

export type DropTarget =
	| {
			kind: 'party' | 'moveslot' | 'boxcell' | 'card';
			index?: number;
			slot?: number;
			box?: number;
	  }
	| { kind: 'teamslot'; teamId: string; index: number }
	| undefined;

const hasRoom = (team: Team) => team.members.length < MAX_TEAM_SIZE;

/** Would dropping `drag` on `over` be accepted? Rejected drops spring back. */
export function accepts(drag: DragData, over: DropTarget): boolean {
	const s = useStore.getState();
	const open = s.library.teams.find((t) => t.id === s.openTeamId)!;
	const own = drag.teamId === open.id;
	if (!over) return own && drag.kind === 'member'; // released outside: remove (poof)
	switch (drag.kind) {
		case 'candidate':
			if (over.kind === 'teamslot') {
				const target = s.library.teams.find((t) => t.id === over.teamId);
				return (
					!!target &&
					(target.members.length < MAX_TEAM_SIZE ||
						over.index < target.members.length) &&
					canUseSpecies(target, drag.species!)
				);
			}
			return (
				(over.kind === 'party' &&
					(hasRoom(open) || over.index! < open.members.length)) ||
				over.kind === 'card'
			);
		case 'member':
			// Any member can move to another team's card or to the open party.
			if (over.kind === 'teamslot') {
				const target = s.library.teams.find((t) => t.id === over.teamId);
				return !!target && over.teamId !== drag.teamId && hasRoom(target);
			}
			if (over.kind === 'party') return own || hasRoom(open);
			// Only the open team's members can be stored or removed.
			return own;
		case 'boxset':
			return (
				(over.kind === 'party' &&
					(over.index! < open.members.length || hasRoom(open))) ||
				over.kind === 'boxcell'
			);
		case 'move':
			return over.kind === 'moveslot';
	}
}
