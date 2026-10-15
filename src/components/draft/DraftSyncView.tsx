'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/controls';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { suggestions } from '@/lib/draft/draft';
import { useDraft, useStore } from '@/lib/store';

/** Where the roster differs from the league sheet. Nothing changes until the user accepts it. */
export function DraftSyncView() {
	const draft = useDraft();
	const accept = useStore((s) => s.acceptSuggestion);
	const acceptAll = useStore((s) => s.acceptAllSuggestions);
	const dismiss = useStore((s) => s.dismissSuggestion);
	const list = useMemo(() => (draft ? suggestions(draft) : []), [draft]);
	if (!draft) return null;
	const coach = draft.settings.coach;
	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-2'>
				<h2 className='font-head text-[20px] font-semibold leading-6'>Draft sync</h2>
				<span className='flex-1' />
				{list.length > 1 && (
					<Button variant='ghost' icon='check' onClick={() => acceptAll(list)}>
						Accept all
					</Button>
				)}
			</div>
			<p className='text-xs text-muted'>
				{coach
					? `Changes between your roster and ${coach}'s picks on the sheet. Your roster can differ from the sheet, so plan ahead as you like.`
					: 'Other coaches you share a Pokémon with show here. Pick your coach in the league sheet settings to compare your own picks.'}
			</p>
			{list.length ? (
				<ul className='flex flex-col gap-2'>
					{list.map((s) => (
						<li key={s.key} className='flex flex-col gap-2 rounded-lg border border-line p-3'>
							<div className='flex items-start gap-2'>
								<PokemonIcon species={s.species} />
								<p className='min-w-0 flex-1 text-base'>{s.message}</p>
							</div>
							<div className='flex justify-end gap-2'>
								<Button onClick={() => dismiss(s)}>Dismiss</Button>
								<Button variant={s.kind === 'release' ? 'secondary' : 'accent'} onClick={() => accept(s)}>
									{s.kind === 'add' ? 'Add' : s.kind === 'release' ? 'Release' : s.kind === 'captain' ? 'Mark' : 'Unmark'}
								</Button>
							</div>
						</li>
					))}
				</ul>
			) : (
				<p className='text-base text-muted'>Your roster matches the sheet.</p>
			)}
		</div>
	);
}
