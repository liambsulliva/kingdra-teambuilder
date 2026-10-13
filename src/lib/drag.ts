import { canUseSpecies } from './dex';
import { MAX_TEAM_SIZE, type Team } from './model';
import { useStore } from './store';

export interface DragData {
	kind: 'candidate' | 'member' | 'evolution' | 'boxset' | 'move';
	/** The species: a suggestion's, or the evolution a member would become. */
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
	// A move dragged off its slot is removed wherever it is dropped; a move from the pool only lands on a slot.
	if (drag.kind === 'move') return over?.kind === 'moveslot' || drag.slot !== undefined;
	if (!over) return own && drag.kind === 'member'; // released outside: remove (poof)
	// Dropped on the card (its move slots included), a Pokémon goes onto the card, joining the party if it needs a place.
	if (over.kind === 'card' || over.kind === 'moveslot') {
		if (drag.kind === 'member') return own || hasRoom(open);
		if (drag.kind === 'candidate' || drag.kind === 'boxset') return hasRoom(open);
		return false;
	}
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
			return over.kind === 'party' && (hasRoom(open) || over.index! < open.members.length);
		case 'member':
			// Any member can move to another team's card or to the open party. On an occupied slot the two swap, so a full team takes it too.
			if (over.kind === 'teamslot') {
				const target = s.library.teams.find((t) => t.id === over.teamId);
				return !!target && over.teamId !== drag.teamId;
			}
			if (over.kind === 'party') return own || hasRoom(open) || over.index! < open.members.length;
			// Only the open team's members can be stored or removed.
			return own;
		case 'evolution': {
			// A stage moves its member to another team. The card's own stage moves it unchanged, as its party sprite does.
			if (over.kind !== 'teamslot') return false;
			const target = s.library.teams.find((t) => t.id === over.teamId);
			const source = s.library.teams.find((t) => t.id === drag.teamId)?.members.find((m) => m.uid === drag.uid);
			const isOwnStage = source?.species === drag.species;
			return !!target && over.teamId !== drag.teamId && (hasRoom(target) || over.index < target.members.length) && (isOwnStage || canUseSpecies(target, drag.species!));
		}
		case 'boxset':
			return (over.kind === 'party' && (over.index! < open.members.length || hasRoom(open))) || over.kind === 'boxcell';
	}
}
