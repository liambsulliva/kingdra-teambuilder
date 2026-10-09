'use client';

import { memo, useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useDraggable } from '@dnd-kit/core';
import { Icon } from '@/components/ui/Icon';
import { SearchField, Select, Tab } from '@/components/ui/controls';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { CardSprite } from '@/components/pokemon/PokemonIcon';
import { formatInfo, getSpecies, speciesFor, speciesInTier } from '@/lib/dex';
import { useRoles } from '@/lib/hooks';
import { ROLES } from '@/lib/roles';
import { STATS, type Team } from '@/lib/model';
import { useOpenTeam, useStore } from '@/lib/store';
import { addAndLand } from '@/components/motion/choreography';

export function tierTabs(team: Team) {
	if (team.mode === 'casual') return ['All', ...Array.from({ length: team.gen }, (_, i) => `Gen ${i + 1}`)];
	const tiers = formatInfo(team.format, team.gen)?.tiers ?? ['OU'];
	return tiers.map((t) => (t === 'DUber' ? 'Ubers' : t));
}

export function useCandidates() {
	const team = useOpenTeam();
	const tab = useStore((s) => s.carouselTab);
	const role = useStore((s) => s.carouselRole);
	const search = useStore((s) => s.carouselSearch);
	const gen = useStore((s) => s.carouselGen);
	const roles = useRoles(team.mode === 'competitive' ? team.format : null);
	// Typing stays responsive: the list filters at a lower priority than the keystroke.
	const query = useDeferredValue(search);
	const { mode, gen: teamGen, format } = team;
	// Keyed on the team's context, not the team object, so editing a member does not re-sort the list.
	const list = useMemo(() => {
		const ctx = { mode, gen: teamGen, format } as Team;
		const q = query.trim().toLowerCase();
		const tabKey = tab === 'Ubers' && format.includes('doubles') ? 'DUber' : tab;
		const base = q ? speciesFor(ctx).filter((s) => s.name.toLowerCase().includes(q)) : speciesInTier(ctx, tabKey);
		const shown = base
			.filter((s) => gen === null || s.gen === gen)
			.filter((s) => role === 'All roles' || mode === 'casual' || roles[s.name]?.includes(role));
		const bst = new Map(shown.map((s) => [s, STATS.reduce((n, k) => n + s.baseStats[k], 0)]));
		return shown.sort((a, b) => Number(!!roles[b.name]) - Number(!!roles[a.name]) || bst.get(b)! - bst.get(a)!);
	}, [mode, teamGen, format, tab, role, query, gen, roles]);
	// Search is left out: a cross-fade on every keystroke would remount the whole list.
	return { team, list, roles, search: query, filterKey: `${team.id}:${format}:${teamGen}:${tab}:${role}:${gen}` };
}

const cardLook = 'flex h-[164px] shrink-0 flex-col gap-1.5 rounded-lg border bg-bg p-3 text-left';

function CandidateBody({ species, types, roles, casual }: { species: string; types: readonly string[]; roles?: string[]; casual: boolean }) {
	return (
		<>
			<CardSprite species={species} />
			<span className='truncate text-base font-semibold'>{species}</span>
			<span className='flex gap-1'>
				{types.map((t) => (
					<TypeBadge key={t} type={t} />
				))}
			</span>
			{!casual && <span className='truncate text-xs text-muted'>{roles?.length ? roles.join('/') : 'No Smogon sets'}</span>}
		</>
	);
}

/** The whole card, lifted under the pointer while a suggestion is dragged. */
export function CandidateOverlay({ species }: { species: string }) {
	const team = useOpenTeam();
	const roles = useRoles(team.mode === 'competitive' ? team.format : null);
	const types = getSpecies(team, species)?.types ?? [];
	return (
		<div className={`${cardLook} w-[152px] -rotate-3 border-dashed border-line-strong opacity-[0.33]`}>
			<CandidateBody species={species} types={types} roles={roles[species]} casual={team.mode === 'casual'} />
		</div>
	);
}

/** Memoized: its props come from cached species and roles, so a team edit leaves every card alone. */
export const CandidateCard = memo(function CandidateCard({ species, types, roles, casual, wide }: { species: string; types: readonly string[]; roles?: string[]; casual: boolean; wide?: boolean }) {
	const addMember = useStore((s) => s.addMember);
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `cand:${species}`, data: { kind: 'candidate', species } });
	return (
		<button
			ref={setNodeRef}
			type='button'
			{...listeners}
			{...attributes}
			onClick={() => addAndLand(() => addMember(species))}
			aria-label={`Add ${species} to the team`}
			className={`${cardLook} transition-colors ${wide ? 'w-full' : 'w-[152px]'} ${isDragging ? 'border-dashed border-line-strong opacity-[0.33]' : 'border-line hover:border-line-strong'}`}
		>
			<CandidateBody species={species} types={types} roles={roles} casual={casual} />
		</button>
	);
});

export function BottomPanel() {
	const { team, list, roles, filterKey, search: shownSearch } = useCandidates();
	const tab = useStore((s) => s.carouselTab);
	const role = useStore((s) => s.carouselRole);
	const search = useStore((s) => s.carouselSearch);
	const gen = useStore((s) => s.carouselGen);
	const setCarousel = useStore((s) => s.setCarousel);
	const setTeamContext = useStore((s) => s.setTeamContext);
	const boxOpen = useStore((s) => s.boxOpen);
	const setBoxOpen = useStore((s) => s.setBoxOpen);
	// Cards render 60 at a time as the row scrolls; a new filter starts over at 60.
	const [paged, setPaged] = useState({ key: '', limit: 60 });
	const pageKey = `${filterKey}:${shownSearch}`;
	const limit = paged.key === pageKey ? paged.limit : 60;
	const casual = team.mode === 'casual';
	const tabs = tierTabs(team);

	return (
		<section aria-label='Suggestions' className='flex h-[236px] shrink-0 flex-col border-t border-line'>
			<div className='flex h-[52px] shrink-0 items-center gap-4 px-6'>
				<h2 className='text-md font-semibold'>Suggestions</h2>
				<Select
					label='Generation'
					value={String(gen ?? team.gen)}
					options={Array.from({ length: 9 }, (_, i) => 9 - i).map((g) => ({ value: String(g), label: `Gen ${g}` }))}
					onChange={(v) => {
						const g = Number(v);
						// Higher than the team's generation moves the team up; lower only narrows what is browsed.
						if (g > team.gen) setTeamContext(team.id, casual ? { gen: g } : { gen: g, format: team.format.replace(/^gen\d/, `gen${g}`) });
						else setCarousel({ carouselGen: g === team.gen ? null : g, carouselSearch: '', ...(casual ? { carouselTab: 'All' } : {}) });
					}}
				/>
				<div role='tablist' aria-label={casual ? 'Generations' : 'Tiers'} className='scrollbar-none flex gap-4 overflow-x-auto'>
					{tabs.map((t) => (
						<Tab key={t} selected={!search && tab === t} onClick={() => setCarousel({ carouselTab: t, carouselSearch: '', ...(casual ? { carouselGen: null } : {}) })}>
							{t}
						</Tab>
					))}
				</div>
				{!casual && (
					<Select
						label='Role'
						value={role}
						options={['All roles', ...ROLES].map((r) => ({ value: r, label: r }))}
						onChange={(v) => setCarousel({ carouselRole: v })}
					/>
				)}
				<span className='flex-1' />
				<button
					type='button'
					aria-expanded={boxOpen}
					onClick={() => setBoxOpen(!boxOpen)}
					className={`squishy inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-base font-medium ${boxOpen ? 'bg-accent-soft text-accent' : 'hover:bg-hover'}`}
				>
					<Icon name='box' />
					Box
				</button>
				<SearchField
					className='w-56'
					placeholder='Search Pokémon'
					value={search}
					onChange={(e) => setCarousel({ carouselSearch: e.target.value })}
					onClear={() => setCarousel({ carouselSearch: '' })}
				/>
			</div>
			{/* A new category fades the old cards out in 100 ms, then the new ones rise in chunks. */}
			<AnimatePresence mode='wait' initial={false}>
				<motion.div
					key={filterKey}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.1 }}
					onScroll={(e) => {
						const el = e.currentTarget;
						// Scroll events arrive faster than renders; asking for the same next page twice is harmless.
						if (limit < list.length && el.scrollLeft + el.clientWidth > el.scrollWidth - 600) setPaged({ key: pageKey, limit: limit + 60 });
					}}
					className='scrollbar-none flex min-h-0 flex-1 gap-3 overflow-x-auto px-6 pb-4 [mask-image:linear-gradient(to_right,black_calc(100%-96px),transparent)]'
				>
					{list.slice(0, limit).map((s, i) => (
						<div key={s.name} className='flex shrink-0 animate-[rise_160ms_cubic-bezier(0.22,1,0.36,1)_both]' style={{ animationDelay: `${Math.min(Math.floor(i / 4), 6) * 40}ms` }}>
							<CandidateCard species={s.name} types={s.types} roles={roles[s.name]} casual={casual} />
						</div>
					))}
					{!list.length && <p className='self-center text-base text-muted'>{shownSearch ? `No Pokémon named “${shownSearch}” in Gen ${team.gen}.` : 'Nothing in this tier yet.'}</p>}
				</motion.div>
			</AnimatePresence>
		</section>
	);
}
