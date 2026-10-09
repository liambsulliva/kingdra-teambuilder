'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useDraggable } from '@dnd-kit/core';
import { Icon } from '@/components/ui/Icon';
import { SearchField, Select, Tab } from '@/components/ui/controls';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { CardSprite } from '@/components/pokemon/PokemonIcon';
import { formatInfo, speciesFor, speciesInTier } from '@/lib/dex';
import { useRoles } from '@/lib/hooks';
import { ROLES } from '@/lib/roles';
import { STATS, type Team } from '@/lib/model';
import { useOpenTeam, useStore } from '@/lib/store';
import { pop } from '@/components/motion/choreography';

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
	const roles = useRoles(team.mode === 'competitive' ? team.format : null);
	const list = useMemo(() => {
		const q = search.trim().toLowerCase();
		const tabKey = tab === 'Ubers' && team.format.includes('doubles') ? 'DUber' : tab;
		const base = q ? speciesFor(team).filter((s) => s.name.toLowerCase().includes(q)) : speciesInTier(team, tabKey);
		const bst = (s: (typeof base)[number]) => STATS.reduce((n, k) => n + s.baseStats[k], 0);
		return base
			.filter((s) => role === 'All roles' || team.mode === 'casual' || roles[s.name]?.includes(role))
			.sort((a, b) => Number(!!roles[b.name]) - Number(!!roles[a.name]) || bst(b) - bst(a));
	}, [team, tab, role, search, roles]);
	return { team, list, roles, filterKey: `${team.id}:${team.format}:${team.gen}:${tab}:${role}:${search}` };
}

export function CandidateCard({ species, types, roles, casual, wide }: { species: string; types: string[]; roles?: string[]; casual: boolean; wide?: boolean }) {
	const addMember = useStore((s) => s.addMember);
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `cand:${species}`, data: { kind: 'candidate', species } });
	return (
		<button
			ref={setNodeRef}
			type='button'
			{...listeners}
			{...attributes}
			onClick={() => addMember(species) && requestAnimationFrame(() => pop([...document.querySelectorAll('[data-party] [data-party-member]')].at(-1) ?? null))}
			aria-label={`Add ${species} to the team`}
			className={`flex h-[164px] shrink-0 flex-col gap-1.5 rounded-lg border border-line bg-bg p-3 text-left transition-colors hover:border-line-strong ${wide ? 'w-full' : 'w-[152px]'} ${isDragging ? 'border-dashed opacity-40' : ''}`}
		>
			<CardSprite species={species} />
			<span className='truncate text-base font-semibold'>{species}</span>
			<span className='flex gap-1'>
				{types.map((t) => (
					<TypeBadge key={t} type={t} />
				))}
			</span>
			{!casual && <span className='truncate text-xs text-muted'>{roles?.length ? roles.join('/') : 'No Smogon sets'}</span>}
		</button>
	);
}

export function BottomPanel() {
	const { team, list, roles, filterKey } = useCandidates();
	const tab = useStore((s) => s.carouselTab);
	const role = useStore((s) => s.carouselRole);
	const search = useStore((s) => s.carouselSearch);
	const setCarousel = useStore((s) => s.setCarousel);
	const setTeamContext = useStore((s) => s.setTeamContext);
	const boxOpen = useStore((s) => s.boxOpen);
	const setBoxOpen = useStore((s) => s.setBoxOpen);
	const [limit, setLimit] = useState(60);
	const casual = team.mode === 'casual';
	const tabs = tierTabs(team);

	return (
		<section aria-label='Suggestions' className='flex h-[236px] shrink-0 flex-col border-t border-line'>
			<div className='flex h-[52px] shrink-0 items-center gap-4 px-6'>
				<h2 className='text-md font-semibold'>Suggestions</h2>
				<Select
					label='Generation'
					value={String(team.gen)}
					options={Array.from({ length: 9 }, (_, i) => 9 - i).map((g) => ({ value: String(g), label: casual ? `Up to Gen ${g}` : `Gen ${g}` }))}
					onChange={(v) => {
						const g = Number(v);
						setTeamContext(team.id, casual ? { gen: g } : { gen: g, format: team.format.replace(/^gen\d/, `gen${g}`) });
					}}
				/>
				<div role='tablist' aria-label={casual ? 'Generations' : 'Tiers'} className='scrollbar-none flex gap-4 overflow-x-auto'>
					{tabs.map((t) => (
						<Tab key={t} selected={!search && tab === t} onClick={() => setCarousel({ carouselTab: t, carouselSearch: '' })}>
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
					className={`squishy inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-base font-medium hover:bg-hover ${boxOpen ? 'text-accent' : ''}`}
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
			<AnimatePresence mode='wait' initial={false}>
				<motion.div
					key={filterKey}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.1 }}
					onScroll={(e) => {
						const el = e.currentTarget;
						if (el.scrollLeft + el.clientWidth > el.scrollWidth - 600) setLimit((l) => l + 60);
					}}
					className='scrollbar-none flex min-h-0 flex-1 gap-3 overflow-x-auto px-6 pb-4 [mask-image:linear-gradient(to_right,black_calc(100%-96px),transparent)]'
				>
					{list.slice(0, limit).map((s) => (
						<CandidateCard key={s.name} species={s.name} types={s.types} roles={roles[s.name]} casual={casual} />
					))}
					{!list.length && <p className='self-center text-base text-muted'>{search ? `No Pokémon named “${search}” in gen ${team.gen}.` : 'Nothing in this tier yet.'}</p>}
				</motion.div>
			</AnimatePresence>
		</section>
	);
}
