'use client';

import { useDraggable } from '@dnd-kit/core';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { addAndLand } from '@/components/motion/choreography';
import { TYPES } from '@/lib/dex';
import { canTera, costOf, hasTera, priceOf, takenBy, teamSpecies } from '@/lib/draft/draft';
import type { Draft, RosterEntry } from '@/lib/draft/types';
import { useDraft, useOpenTeam, useStore } from '@/lib/store';
import { pts } from './DraftBoard';

const TERA_TYPES = [...TYPES, 'Stellar'];

/** What is wrong with a pick against the current sheet, or null. The pick stays until the user releases it. */
function pickProblem(draft: Draft, entry: RosterEntry, taken: Map<string, string>) {
	const coach = taken.get(entry.species);
	if (coach) return `${coach} drafted ${entry.species} on the sheet`;
	if (draft.league.banned.includes(entry.species)) return `${entry.species} is now banned`;
	if (!priceOf(draft.league, entry.species)) return `${entry.species} is no longer on the board`;
	if (entry.captain && priceOf(draft.league, entry.species)?.tera == null) return `${entry.species} can no longer be a Tera Captain`;
	return null;
}

/** One pick: click or drag it onto the party. Its captain and release controls sit beside it. */
function RosterChip({ entry, draft, taken }: { entry: RosterEntry; draft: Draft; taken: Map<string, string> }) {
	const team = useOpenTeam();
	const addMember = useStore((s) => s.addMember);
	const releasePick = useStore((s) => s.releasePick);
	const setCaptain = useStore((s) => s.setCaptain);
	const setCaptainType = useStore((s) => s.setCaptainType);
	const name = teamSpecies(entry.species);
	const onTeam = team.members.some((m) => m.species === name);
	const unassignable = taken.has(entry.species);
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: `roster:${entry.uid}`,
		data: { kind: 'candidate', species: name },
		disabled: unassignable,
	});
	const price = priceOf(draft.league, entry.species);
	const problem = pickProblem(draft, entry, taken);
	const captains = hasTera(draft.league);
	return (
		<li className={`flex h-11 shrink-0 items-center gap-0.5 rounded-lg border pr-1 ${problem ? 'border-danger' : onTeam ? 'border-accent bg-accent-soft' : 'border-line'}`} title={problem ?? undefined}>
			<button
				ref={setNodeRef}
				type='button'
				{...listeners}
				{...attributes}
				aria-disabled={unassignable || undefined}
				onClick={() => addAndLand(() => addMember(name))}
				aria-label={`${onTeam ? `${entry.species}, on this team` : `Add ${entry.species} to the team`}${problem ? `. ${problem}` : ''}`}
				className={`drag-source flex h-full items-center gap-1.5 rounded-l-lg pl-1 pr-1.5 text-left hover:bg-hover ${isDragging ? 'opacity-30' : ''}`}
			>
				<PokemonIcon species={entry.species} />
				<span className='flex flex-col'>
					<span className='flex items-center gap-1 whitespace-nowrap text-base font-semibold leading-5'>
						{entry.species}
						{problem && <Icon name='warning' className='text-danger' />}
					</span>
					<span className='flex gap-1.5 whitespace-nowrap text-2xs tabular-nums text-muted'>
						{pts(costOf(draft.league, entry))}
						{entry.captain && <span className='font-medium text-accent'>Tera Captain</span>}
						{!entry.captain && price?.tera != null && captains && <span>Tera {price.tera}</span>}
					</span>
				</span>
			</button>
			{entry.captain && canTera(draft.settings.format) && (
				<select
					aria-label={`Tera type for ${entry.species}`}
					value={entry.teraType}
					onChange={(e) => setCaptainType(entry.uid, e.target.value)}
					className='h-7 rounded-md border border-line bg-bg px-1 text-xs font-medium hover:bg-hover'
				>
					<option value=''>Tera type</option>
					{TERA_TYPES.map((t) => (
						<option key={t} value={t}>
							{t}
						</option>
					))}
				</select>
			)}
			{captains && (price?.tera != null || entry.captain) && (
				<IconButton size='sm' icon='captain' label={entry.captain ? 'Unmark as Tera Captain' : 'Make Tera Captain'} selected={entry.captain} onClick={() => setCaptain(entry.uid, !entry.captain)} tooltip='above' />
			)}
			<IconButton size='sm' icon='close' label={`Release ${entry.species}`} onClick={() => releasePick(entry.uid)} tooltip='above' />
		</li>
	);
}

/** The roster as one scrollable row of picks, above the board's cards. */
export function RosterRow({ className = '' }: { className?: string }) {
	const draft = useDraft()!;
	const taken = takenBy(draft);
	return (
		<ul aria-label='Roster' className={`scrollbar-none flex min-w-0 items-center gap-2 overflow-x-auto ${className}`}>
			{draft.roster.map((entry) => (
				<RosterChip key={entry.uid} entry={entry} draft={draft} taken={taken} />
			))}
			{!draft.roster.length && <li className='flex h-11 items-center text-base text-muted'>Your roster is empty. Click a card below to draft it.</li>}
		</ul>
	);
}
