'use client';

import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useDraggable } from '@dnd-kit/core';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { SearchField, Select, Tab } from '@/components/ui/controls';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { CardSprite } from '@/components/pokemon/PokemonIcon';
import { ROLE_OPTIONS, SUPPORT_OPTIONS } from '@/components/browse/BottomPanel';
import { addAndLand } from '@/components/motion/choreography';
import { Dex } from '@pkmn/dex';
import { getSpecies, moveIndex } from '@/lib/dex';
import type { Team } from '@/lib/model';
import { balance, pickState, suggestions, takenBy, teamSpecies, type PickState } from '@/lib/draft/draft';
import { lastSynced, syncDraft } from '@/lib/draft/sync';
import { RosterRow } from './Roster';
import type { TierEntry } from '@/lib/draft/types';
import { useMoveIndex, useRoles } from '@/lib/hooks';
import { matchesTerms, searchTerms, supportMoveIds } from '@/lib/search';
import { useDraft, useOpenTeam, useStore } from '@/lib/store';

export const pts = (n: number) => `${n} ${n === 1 ? 'pt' : 'pts'}`;

/** The board's tabs: everything, then each price from the top. Banned Pokémon aren't on the board. */
export function boardTabs(tiers: readonly TierEntry[]) {
	const prices = [...new Set(tiers.map((t) => t.points))].sort((a, b) => b - a);
	return ['All', ...prices.map(pts)];
}

/** A board species. Champions Megas are "Future" to the team's dex, so they fall back to the full one. */
const boardSpecies = (team: Pick<Team, 'mode' | 'gen' | 'format'>, name: string) => {
	const s = getSpecies(team, name);
	if (s) return s;
	const raw = Dex.species.get(name);
	return raw.exists ? raw : undefined;
};

export interface BoardItem {
	species: string;
	price: TierEntry;
	state: PickState;
	/** The coach who drafted it, when another coach did. */
	coach?: string;
}

/** The draft board's cards for the current tab and filters, each with whether it can be drafted. */
export function useBoard() {
	const draft = useDraft()!;
	const team = useOpenTeam();
	const tab = useStore((s) => s.carouselTab);
	const role = useStore((s) => s.carouselRole);
	const support = useStore((s) => s.carouselSupport);
	const search = useStore((s) => s.carouselSearch);
	const roles = useRoles(team.format);
	const query = useDeferredValue(search);
	const q = query.trim().toLowerCase();
	const { mode, gen, format } = team;
	const terms = useMemo(() => searchTerms({ mode, gen, format }, q), [mode, gen, format, q]);
	const needsIndex = support !== 'All support' || terms.moves.size > 0;
	const index = useMoveIndex(team, needsIndex);
	const { league, settings, roster } = draft;
	const tabs = useMemo(() => boardTabs(league.tiers), [league.tiers]);
	const list = useMemo(() => {
		const ctx = { league, settings, roster };
		const taken = takenBy(ctx);
		const banned = new Set(league.banned);
		const base = league.tiers.filter((t) => !banned.has(t.species) && (q || tab === 'All' || pts(t.points) === tab)).map((t) => ({ species: t.species, price: t }));
		const supportMoves = supportMoveIds(support);
		// Moves and roles belong to the form a pick plays as: a Mega's base species.
		const learns = (name: string) => index?.get(teamSpecies(name));
		return base
			.filter(({ species }) => {
				const s = getSpecies(team, species);
				if (q && !species.toLowerCase().includes(q) && !(s && matchesTerms(s, terms, roles[species], learns(species)))) return false;
				if (role !== 'All roles' && !roles[species]?.includes(role)) return false;
				return !supportMoves.length || supportMoves.some((m) => learns(species)?.has(m));
			})
			.map((b): BoardItem => ({ ...b, state: pickState(ctx, b.species, taken), coach: taken.get(b.species) }));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [league, settings, roster, tab, q, terms, role, support, index, roles]);
	const loading = needsIndex && !index;
	return { draft, team, tabs, list, roles, loading, search: query, filterKey: `${team.id}:${tab}:${role}:${support}` };
}

const LABEL: Record<Exclude<PickState, { ok: true }>['reason'], string> = {
	drafted: 'Drafted',
	banned: 'Banned',
	unlisted: 'Not on the board',
	taken: 'Taken',
	full: 'Roster full',
	budget: "Can't afford",
};

const cardLook = 'flex h-[164px] shrink-0 flex-col gap-1.5 rounded-lg border p-3 text-left';

/** A draft board card. Click drafts it; once drafted, click puts it on the team. Taken and banned cards stay put. */
export const BoardCard = memo(function BoardCard({ item, wide }: { item: BoardItem; wide?: boolean }) {
	const team = useOpenTeam();
	const draftPick = useStore((s) => s.draftPick);
	const addMember = useStore((s) => s.addMember);
	const { species, price, state } = item;
	const drafted = !state.ok && state.reason === 'drafted';
	const unassignable = !state.ok && (state.reason === 'taken' || state.reason === 'banned' || state.reason === 'unlisted');
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: `cand:${species}`,
		data: { kind: 'candidate', species: teamSpecies(species) },
		disabled: unassignable,
	});
	const types = boardSpecies(team, species)?.types ?? [];
	// A taken card names the coach who has it.
	const status = state.ok ? null : state.reason === 'taken' ? (item.coach ?? LABEL.taken) : LABEL[state.reason];
	return (
		<button
			ref={setNodeRef}
			type='button'
			{...listeners}
			{...attributes}
			aria-disabled={unassignable || undefined}
			title={state.ok ? `Draft ${species}` : state.message}
			onClick={() => (drafted ? addAndLand(() => addMember(teamSpecies(species))) : draftPick(species))}
			className={`${cardLook} drag-source transition-colors ${wide ? 'w-full' : 'w-[152px]'} ${
				isDragging
					? 'border-dashed border-line-strong opacity-[0.33]'
					: drafted
						? 'border-accent bg-accent-soft'
						: 'border-line bg-bg hover:border-line-strong'
			}`}
		>
			<span className='sr-only'>{drafted ? 'Add ' : state.ok ? 'Draft ' : ''}</span>
			<span className={!state.ok && !drafted ? 'opacity-40 grayscale' : ''}>
				<CardSprite species={species} />
			</span>
			<span className='truncate text-base font-semibold'>{species}</span>
			<span className='flex gap-1'>
				{types.map((t) => (
					<TypeBadge key={t} type={t} />
				))}
			</span>
			<span className='flex items-center gap-1.5 text-xs'>
				<span className='font-semibold tabular-nums'>{pts(price.points)}</span>
				{status && (
					<span className={`ml-auto inline-flex min-w-0 items-center gap-1 truncate ${drafted ? 'font-medium text-accent' : 'text-muted'}`}>
						{drafted && <Icon name='check' className='shrink-0' />}
						<span className='truncate'>{status}</span>
					</span>
				)}
			</span>
			<span className='sr-only'>{drafted ? ' to the team' : state.ok ? '' : `. ${state.message}`}</span>
		</button>
	);
});

/** "just now", "4 min ago", "2 h ago". Re-renders every 30 s. */
function useAgo(at: number) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(t);
	}, []);
	const min = Math.floor(Math.max(0, now - at) / 60_000);
	if (min < 1) return 'just now';
	if (min < 60) return `${min} min ago`;
	return `${Math.floor(min / 60)} h ago`;
}

/** Points and picks left. Over budget turns red. */
export function DraftBalance({ className = '' }: { className?: string }) {
	const draft = useDraft()!;
	const b = balance(draft);
	const stat = (left: number, total: number, unit: string) => (
		<span className={`whitespace-nowrap tabular-nums ${left < 0 ? 'text-danger' : ''}`}>
			<span className='font-semibold'>{left}</span>
			<span className='text-muted'>
				{' '}
				of {total} {unit} left
			</span>
		</span>
	);
	return (
		<span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className}`}>
			{stat(b.pointsLeft, draft.settings.points, 'pts')}
			{stat(b.picksLeft, draft.settings.picks, 'picks')}
		</span>
	);
}

/** Sync state, the sync button and the count of sheet changes waiting. A static upload shows that it won't sync. */
export function DraftSyncStatus({ onChanges }: { onChanges: () => void }) {
	const draft = useDraft()!;
	const sync = useStore((s) => s.draftSync);
	const at = useStore(lastSynced);
	const ago = useAgo(at);
	const waiting = useMemo(() => suggestions(draft).length, [draft]);
	const live = draft.league.source.kind === 'google';
	return (
		<span className='inline-flex items-center gap-1'>
			{waiting > 0 && (
				<button
					type='button'
					onClick={onChanges}
					className='squishy inline-flex h-7 items-center gap-1.5 rounded-full bg-accent-soft px-2.5 text-xs font-medium text-accent'
				>
					{waiting} {waiting === 1 ? 'change' : 'changes'} on the sheet
				</button>
			)}
			{live ? (
				<>
					<span className={`whitespace-nowrap text-xs ${sync.status === 'error' ? 'text-danger' : 'text-muted'}`} title={sync.status === 'error' ? sync.message : undefined} aria-live='polite'>
						{sync.status === 'syncing' ? 'Syncing' : sync.status === 'error' ? 'Sync failed' : `Synced ${ago}`}
					</span>
					<IconButton icon='sync' label='Sync with the sheet' disabled={sync.status === 'syncing'} onClick={() => void syncDraft()} tooltip='none' />
				</>
			) : (
				<span className='whitespace-nowrap text-xs text-muted'>Uploaded file, won&apos;t sync</span>
			)}
		</span>
	);
}

function BoardTabs({ tabs, className = '' }: { tabs: string[]; className?: string }) {
	const tab = useStore((s) => s.carouselTab);
	const search = useStore((s) => s.carouselSearch);
	const setCarousel = useStore((s) => s.setCarousel);
	return (
		<div role='tablist' aria-label='Prices' className={`scrollbar-none flex min-w-0 gap-4 overflow-x-auto ${className}`}>
			{tabs.map((t) => (
				<Tab key={t} selected={!search && tab === t} onClick={() => setCarousel({ carouselTab: t, carouselSearch: '' })}>
					{t}
				</Tab>
			))}
		</div>
	);
}

export function boardEmpty(search: string) {
	return search ? `Nothing on the board matches "${search}".` : 'Nothing on the board here.';
}

/** Desktop and tablet: the Suggestions panel becomes the draft board. */
export function DraftBoard() {
	const { team, tabs, list, loading, filterKey, search: shownSearch } = useBoard();
	const role = useStore((s) => s.carouselRole);
	const support = useStore((s) => s.carouselSupport);
	const search = useStore((s) => s.carouselSearch);
	const roster = useStore((s) => s.library.draft?.roster.length ?? 0);
	const setCarousel = useStore((s) => s.setCarousel);
	const setDialog = useStore((s) => s.setDialog);
	const setInspector = useStore((s) => s.setInspector);
	const [paged, setPaged] = useState({ key: '', limit: 60 });
	const pageKey = `${filterKey}:${shownSearch}`;
	const limit = paged.key === pageKey ? paged.limit : 60;
	return (
		<section aria-label='Draft board' className='flex shrink-0 flex-col border-t border-line'>
			{/* One line: the price tabs scroll rather than push the search onto a second row. */}
			<div className='flex min-h-[52px] shrink-0 items-center gap-4 px-6 py-2.5'>
				<h2 className='shrink-0 text-md font-semibold'>Draft board</h2>
				<BoardTabs tabs={tabs} className='flex-1 [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]' />
				<div className='flex shrink-0 gap-4'>
					<Select label='Role' value={role} options={ROLE_OPTIONS} onChange={(v) => setCarousel({ carouselRole: v })} />
					<Select label='Support' value={support} options={SUPPORT_OPTIONS} onChange={(v) => setCarousel({ carouselSupport: v })} />
				</div>
				<div className='flex w-[18rem] shrink items-center justify-end'>
					<SearchField
						className='min-w-0 flex-1'
						placeholder='Search by name, role, type, or move.'
						value={search}
						onFocus={() => void moveIndex(team).catch(() => undefined)}
						onChange={(e) => setCarousel({ carouselSearch: e.target.value })}
						onClear={() => setCarousel({ carouselSearch: '' })}
					/>
				</div>
			</div>
			{/* The roster sits over the cards: drafted picks above, the board below. */}
			<div className='flex shrink-0 items-center gap-4 px-6 pb-3'>
				<div className='flex shrink-0 flex-col'>
					<h3 className='text-base font-semibold'>
						Roster <span className='font-normal tabular-nums text-muted'>{roster}</span>
					</h3>
					<DraftBalance className='flex-col !items-start !gap-0' />
				</div>
				<RosterRow className='flex-1 [mask-image:linear-gradient(to_right,black_calc(100%-48px),transparent)]' />
				{/* Sync and the league sheet sit together, as close as the sync label and its button. */}
				<span className='flex shrink-0 items-center gap-1'>
					<DraftSyncStatus onChanges={() => setInspector('draftSync')} />
					<IconButton icon='details' label='League sheet' onClick={() => setDialog('draftSetup')} tooltip='above' tooltipAlign='end' />
				</span>
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
						if (limit < list.length && el.scrollLeft + el.clientWidth > el.scrollWidth - 600) setPaged({ key: pageKey, limit: limit + 60 });
					}}
					className='scrollbar-none flex h-[183px] shrink-0 gap-3 overflow-x-auto px-6 pb-4 [mask-image:linear-gradient(to_right,black_calc(100%-96px),transparent)]'
				>
					{list.slice(0, limit).map((item, i) => (
						<div key={item.species} className='flex shrink-0 animate-[rise_160ms_cubic-bezier(0.22,1,0.36,1)_both]' style={{ animationDelay: `${Math.min(Math.floor(i / 4), 6) * 40}ms` }}>
							<BoardCard item={item} />
						</div>
					))}
					{!list.length && !loading && <p className='self-center text-base text-muted'>{boardEmpty(shownSearch)}</p>}
				</motion.div>
			</AnimatePresence>
		</section>
	);
}

/** Phone: the board as a two-column grid under the Browse tab. */
export function MobileBoard({ onChanges }: { onChanges: () => void }) {
	const { tabs, list, loading, search: shownSearch } = useBoard();
	const role = useStore((s) => s.carouselRole);
	const support = useStore((s) => s.carouselSupport);
	const search = useStore((s) => s.carouselSearch);
	const setCarousel = useStore((s) => s.setCarousel);
	const setDialog = useStore((s) => s.setDialog);
	return (
		<>
			<div className='flex flex-col gap-2 px-4'>
				<div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
					<DraftBalance />
					<span className='flex-1' />
					<IconButton icon='details' label='League sheet' onClick={() => setDialog('draftSetup')} tooltip='none' />
				</div>
				<div className='flex items-center'>
					<DraftSyncStatus onChanges={onChanges} />
				</div>
				<SearchField placeholder='Search by name, role, type, or move.' value={search} onChange={(e) => setCarousel({ carouselSearch: e.target.value })} onClear={() => setCarousel({ carouselSearch: '' })} />
				<div className='flex gap-2'>
					<Select className='min-w-0 flex-1' label='Role' value={role} options={ROLE_OPTIONS} onChange={(v) => setCarousel({ carouselRole: v })} />
					<Select className='min-w-0 flex-1' label='Support' value={support} options={SUPPORT_OPTIONS} onChange={(v) => setCarousel({ carouselSupport: v })} />
				</div>
				<BoardTabs tabs={tabs} />
			</div>
			<RosterRow className='shrink-0 px-4' />
			<div className='grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto px-4 pb-4'>
				{list.slice(0, 80).map((item) => (
					<BoardCard key={item.species} item={item} wide />
				))}
				{!list.length && !loading && <p className='col-span-2 pt-2 text-base text-muted'>{boardEmpty(shownSearch)}</p>}
			</div>
		</>
	);
}
