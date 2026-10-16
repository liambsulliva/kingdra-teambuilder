'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/controls';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { acceptable, addRefusal, allSuggestions, suggestions } from '@/lib/draft/draft';
import { useDraft, useStore } from '@/lib/store';

/** What to say when nothing is waiting. Dismissed changes are hidden, not settled, so they get their own line. */
function idleNote(total: number, coach: string | null) {
	if (total) return 'All changes are dismissed. They stay hidden until their lines change on the sheet.';
	if (coach) return 'No changes waiting from the sheet.';
	return null;
}

/** Where the roster differs from the league sheet. Nothing changes until the user accepts it. */
export function DraftSyncView() {
	const draft = useDraft();
	const accept = useStore((s) => s.acceptSuggestion);
	const acceptAll = useStore((s) => s.acceptAllSuggestions);
	const dismiss = useStore((s) => s.dismissSuggestion);
	const total = useMemo(() => (draft ? allSuggestions(draft).length : 0), [draft]);
	const list = useMemo(() => (draft ? suggestions(draft) : []), [draft]);
	const takeable = useMemo(() => (draft ? acceptable(draft, list) : []), [draft, list]);
	if (!draft) return null;
	const coach = draft.settings.coach;
	const note = idleNote(total, coach);
	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-2'>
				<h2 className='font-head text-[20px] font-semibold leading-6'>Draft sync</h2>
				<span className='flex-1' />
				{list.length > 1 && (
					<Button variant='ghost' icon='check' disabled={!takeable.length} onClick={() => acceptAll(list)}>
						Accept all
					</Button>
				)}
			</div>
			<p className='text-xs text-muted'>
				{coach
					? 'Changes between your current roster and the sheet. Your roster can differ from the sheet, so plan ahead as you like.'
					: "You aren't a coach in this league, so every Pokémon is open to you. Pick your coach in the league sheet settings to compare your own picks."}
			</p>
			{list.length ? (
				<ul className='flex flex-col gap-2'>
					{list.map((s) => {
						const waiting = s.kind === 'add' ? addRefusal(draft, s.species) : null;
						return (
							<li key={s.key} className='flex flex-col gap-2 rounded-lg border border-line p-3'>
								<div className='flex items-start gap-2'>
									<PokemonIcon species={s.species} />
									<p className='min-w-0 flex-1 text-base'>
										{s.message}
										{waiting && <span className='block text-xs text-muted'>{waiting}</span>}
									</p>
								</div>
								<div className='flex justify-end gap-2'>
									<Button onClick={() => dismiss(s)}>Dismiss</Button>
									<Button variant={s.kind === 'release' ? 'secondary' : 'accent'} disabled={!!waiting} onClick={() => accept(s)}>
										{s.kind === 'add' ? 'Add' : 'Release'}
									</Button>
								</div>
							</li>
						);
					})}
				</ul>
			) : (
				note && <p className='text-base text-muted'>{note}</p>
			)}
		</div>
	);
}
