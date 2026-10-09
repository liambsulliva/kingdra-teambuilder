'use client';

import { useMemo, useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { SearchField } from '@/components/ui/controls';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { formatLabel, formatsForGen } from '@/lib/dex';
import { exportTeam } from '@/lib/showdown';
import { MAX_TEAM_SIZE, type Team } from '@/lib/model';
import { useStore } from '@/lib/store';
import { openTeamWithMotion } from '@/components/motion/choreography';

const LINKS = [
	['Liam Sullivan', 'https://liambsullivan.com/'],
];

export function TeamLibrary() {
	const teams = useStore((s) => s.library.teams);
	const openTeamId = useStore((s) => s.openTeamId);
	const setDialog = useStore((s) => s.setDialog);
	const [searching, setSearching] = useState(false);
	const [query, setQuery] = useState('');
	const shown = useMemo(() => teams.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase())), [teams, query]);
	return (
		<aside aria-label='Teams' className='flex min-h-0 flex-col'>
			<div className='flex h-12 shrink-0 items-center pl-6 pr-3'>
				<h2 className='text-md font-semibold'>Teams</h2>
				<span className='ml-2 text-xs tabular-nums text-muted'>{teams.length}</span>
				<span className='flex-1' />
				<IconButton icon='search' label='Search teams' selected={searching} onClick={() => { setSearching((v) => !v); setQuery(''); }} />
				<IconButton icon='import' label='Import a Showdown team' onClick={() => setDialog('importTeam')} />
				<IconButton icon='plus' label='New team' onClick={() => setDialog('newTeam')} />
			</div>
			{searching && (
				<div className='px-4 pb-2'>
					<SearchField autoFocus placeholder='Search team names' value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery('')} onKeyDown={(e) => e.key === 'Escape' && setSearching(false)} />
				</div>
			)}
			<ol className='flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-6'>
				{shown.map((team, i) => (
					<li key={team.id} className={i > 0 ? 'border-t border-line' : ''}>
						<TeamCard team={team} open={team.id === openTeamId} />
					</li>
				))}
				{!shown.length && <li className='px-3 py-6 text-base text-muted'>No teams match “{query}”.</li>}
			</ol>
			<footer className='flex shrink-0 flex-wrap gap-x-3 gap-y-1 border-t border-line px-6 py-3 text-xs text-muted'>
				{LINKS.map(([label, href]) => (
					<a key={href} href={href} target='_blank' rel='noreferrer' className='hover:text-fg'>
						{label}
					</a>
				))}
			</footer>
		</aside>
	);
}

function TeamCard({ team, open }: { team: Team; open: boolean }) {
	const renameTeam = useStore((s) => s.renameTeam);
	const issues = useStore((s) => s.validation[team.id]?.count ?? 0);
	const slots = Array.from({ length: MAX_TEAM_SIZE }, (_, i) => team.members[i]);
	return (
		<div
			className={`group my-1 flex flex-col gap-2 rounded-md p-3 transition-colors ${open ? '' : 'cursor-pointer hover:bg-hover'}`}
			onClick={() => !open && openTeamWithMotion(team.id)}
			onKeyDown={(e) => {
				if (!open && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
					e.preventDefault();
					openTeamWithMotion(team.id);
				}
			}}
			role={open ? undefined : 'button'}
			tabIndex={open ? undefined : 0}
			aria-label={open ? undefined : `Open ${team.name}`}
			data-team-card={team.id}
		>
			<div className='flex gap-1'>
				{slots.map((m, i) => (
					<span key={i} data-team-icon={`${team.id}:${i}`} className={`bounce-host size-8 rounded-md ${open || !m ? 'border border-dashed border-line-strong/60' : ''}`}>
						{m && !open && <PokemonIcon species={m.species} className='bounce-glyph' />}
					</span>
				))}
			</div>
			<div className='flex items-center gap-1.5'>
				{open && <span aria-label='Open team' className='size-1.5 shrink-0 rounded-full bg-accent' />}
				{open ? (
					<input
						aria-label='Team name'
						defaultValue={team.name}
						key={team.name}
						onBlur={(e) => renameTeam(team.id, e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
							if (e.key === 'Escape') {
								(e.target as HTMLInputElement).value = team.name;
								(e.target as HTMLInputElement).blur();
							}
						}}
						className='-mx-1 min-w-0 flex-1 rounded px-1 text-base font-semibold outline-none hover:bg-hover focus:bg-hover'
					/>
				) : (
					<span className='min-w-0 flex-1 truncate text-base font-semibold'>{team.name}</span>
				)}
				{issues > 0 && team.mode === 'competitive' && (
					<span className='inline-flex items-center gap-1 text-xs tabular-nums text-danger' title={`${issues} legality issue${issues === 1 ? '' : 's'}`}>
						<Icon name='warning' />
						{issues}
					</span>
				)}
			</div>
			{!open && (
				<span className='text-xs text-muted'>
					{formatLabel(team)} · {team.members.length}/{MAX_TEAM_SIZE}
				</span>
			)}
			{open && <TeamControls team={team} />}
		</div>
	);
}

function TeamControls({ team }: { team: Team }) {
	const setTeamContext = useStore((s) => s.setTeamContext);
	const duplicateTeam = useStore((s) => s.duplicateTeam);
	const deleteTeam = useStore((s) => s.deleteTeam);
	const toast = useStore((s) => s.toast);
	const [confirming, setConfirming] = useState(false);
	const value = team.mode === 'casual' ? `casual:${team.gen}` : team.format;
	const copy = async () => {
		if (!team.members.length) return toast('error', 'This team has no Pokémon to export');
		try {
			await navigator.clipboard.writeText(exportTeam(team));
			toast('success', `${team.name} copied as Showdown text`);
		} catch {
			toast('error', "Couldn't copy to the clipboard");
		}
	};
	return (
		<div className='animate-[rise_200ms_cubic-bezier(0.22,1,0.36,1)] border-t border-line pt-2'>
			<div className='flex items-center'>
				<IconButton
					icon={team.mode}
					label={team.mode === 'competitive' ? 'Competitive. Switch to casual' : 'Casual. Switch to competitive'}
					onClick={() =>
						setTeamContext(team.id, team.mode === 'competitive' ? { mode: 'casual' } : { mode: 'competitive', format: team.format === 'casual' ? `gen${team.gen}ou` : team.format })
					}
				/>
				<label className='relative flex h-8 min-w-0 items-center'>
					<span className='sr-only'>Generation and format</span>
					<select
						value={value}
						onChange={(e) => {
							const v = e.target.value;
							if (v.startsWith('casual:')) setTeamContext(team.id, { mode: 'casual', gen: Number(v.slice(7)) });
							else setTeamContext(team.id, { mode: 'competitive', format: v, gen: Number(v.match(/^gen(\d)/)![1]) });
						}}
						className='h-8 max-w-[120px] appearance-none truncate rounded-md bg-transparent pl-1 pr-6 text-xs font-medium hover:bg-hover'
					>
						{team.mode === 'casual'
							? Array.from({ length: 9 }, (_, i) => 9 - i).map((g) => (
									<option key={g} value={`casual:${g}`}>Gen {g}</option>
								))
							: Array.from({ length: 9 }, (_, i) => 9 - i).map((g) => (
									<optgroup key={g} label={`Gen ${g}`}>
										{formatsForGen(g).map((f) => (
											<option key={f.id} value={f.id}>Gen {g} {f.name}</option>
										))}
									</optgroup>
								))}
					</select>
					<Icon name='chevron-down' className='pointer-events-none absolute right-1 text-muted' />
				</label>
				<span className='flex-1' />
				<IconButton icon='duplicate' label='Duplicate team' onClick={() => duplicateTeam(team.id)} />
				<IconButton icon='export' label='Copy as Showdown text' onClick={copy} />
				{confirming ? (
					<button
						type='button'
						autoFocus
						onBlur={() => setConfirming(false)}
						onClick={() => deleteTeam(team.id)}
						className='squishy h-8 rounded-md bg-danger px-2 text-xs font-medium text-white'
					>
						Delete?
					</button>
				) : (
					<IconButton icon='trash' label='Delete team' onClick={() => setConfirming(true)} />
				)}
			</div>
		</div>
	);
}
