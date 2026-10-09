'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { SearchField, Tab } from '@/components/ui/controls';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { Account, Logo, SpriteToggle, useTheme } from '@/components/shell/Header';
import { TeamLibrary } from '@/components/library/TeamLibrary';
import { Workspace } from '@/components/workspace/Workspace';
import { Inspector } from '@/components/inspector/Inspector';
import { CandidateCard, tierTabs, useCandidates } from '@/components/browse/BottomPanel';
import { formatLabel, getSpecies } from '@/lib/dex';
import { useOpenTeam, useSelectedMember, useStore } from '@/lib/store';

type TabId = 'teams' | 'party' | 'browse';

/** Bottom sheet that springs up and can be dragged down to dismiss. */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div key='scrim' className='fixed inset-0 z-40 bg-fg/20' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
					<motion.div
						key='sheet'
						role='dialog'
						aria-label={label}
						className='fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col rounded-t-2xl border border-line bg-bg'
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={{ type: 'spring', stiffness: 420, damping: 36 }}
						drag='y'
						dragConstraints={{ top: 0, bottom: 0 }}
						dragElastic={{ top: 0, bottom: 0.6 }}
						onDragEnd={(_, info) => (info.offset.y > 100 || info.velocity.y > 600) && onClose()}
					>
						<div className='flex justify-center py-2'>
							<span className='h-1 w-9 rounded-full bg-line' />
						</div>
						<div className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)]'>{children}</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

function MemberActions() {
	const uid = useStore((s) => s.mobileActionUid);
	const close = () => useStore.setState({ mobileActionUid: null });
	const team = useOpenTeam();
	const member = team.members.find((m) => m.uid === uid);
	const species = member ? getSpecies(team, member.species) : null;
	const s = useStore.getState();
	const action = (icon: IconName, label: string, run: () => void, danger?: boolean) => (
		<button type='button' onClick={() => { run(); close(); }} className={`flex h-12 w-full items-center gap-3 rounded-lg px-3 text-base font-medium hover:bg-hover ${danger ? 'text-danger' : ''}`}>
			<Icon name={icon} />
			{label}
		</button>
	);
	return (
		<Sheet open={!!member} onClose={close} label='Pokémon actions'>
			{member && (
				<div className='flex flex-col gap-1 px-4 pb-8'>
					<div className='flex items-center gap-3 pb-2'>
						<PokemonIcon species={member.species} />
						<div className='flex flex-col gap-1'>
							<span className='text-base font-semibold'>{member.name || member.species}</span>
							<span className='flex gap-1'>{species?.types.map((t) => <TypeBadge key={t} type={t} />)}</span>
						</div>
					</div>
					{action('eye', 'Put on the card', () => s.selectMember(member.uid))}
					{action('box', 'Move to Box', () => s.storeInBox(member.uid))}
					{action('trash', 'Remove from team', () => s.removeMember(member.uid), true)}
				</div>
			)}
		</Sheet>
	);
}

function BoxGrid() {
	const boxes = useStore((s) => s.library.boxes);
	const index = useStore((s) => Math.min(s.boxIndex, s.library.boxes.length - 1));
	const setIndex = useStore((s) => s.setBoxIndex);
	const takeFromBox = useStore((s) => s.takeFromBox);
	return (
		<div className='flex flex-col gap-3 px-4'>
			<div className='scrollbar-none flex gap-4 overflow-x-auto'>
				{boxes.map((b, i) => (
					<Tab key={b.id} selected={i === index} onClick={() => setIndex(i)}>{b.name}</Tab>
				))}
			</div>
			<div className='grid grid-cols-6 gap-1'>
				{boxes[index].slots.map((set, i) =>
					set ? (
						<button key={i} type='button' onClick={() => takeFromBox(index, i)} aria-label={`Move ${set.species} to the party`} className='flex aspect-square items-center justify-center rounded-md hover:bg-hover'>
							<PokemonIcon species={set.species} />
						</button>
					) : (
						<span key={i} className='flex aspect-square items-center justify-center'><span className='size-8 rounded-md border border-dashed border-line-strong/60' /></span>
					)
				)}
			</div>
			<p className='text-xs text-muted'>Tap a Pokémon to move it into the party. Long-press a party member for Move to Box.</p>
		</div>
	);
}

function Browse({ onPreview }: { onPreview: () => void }) {
	const { team, list, roles } = useCandidates();
	const tab = useStore((s) => s.carouselTab);
	const search = useStore((s) => s.carouselSearch);
	const setCarousel = useStore((s) => s.setCarousel);
	const previewSpecies = useStore((s) => s.previewSpecies);
	const [mode, setMode] = useState<'suggestions' | 'box'>('suggestions');
	const seen = useRef(previewSpecies);
	useEffect(() => {
		if (previewSpecies && previewSpecies !== seen.current) onPreview();
		seen.current = previewSpecies;
	}, [previewSpecies, onPreview]);
	return (
		<div className='flex min-h-0 flex-1 flex-col gap-3 pt-2'>
			<div className='flex gap-5 px-4'>
				<Tab selected={mode === 'suggestions'} onClick={() => setMode('suggestions')}>Suggestions</Tab>
				<Tab selected={mode === 'box'} onClick={() => setMode('box')}>Box</Tab>
			</div>
			{mode === 'box' ? (
				<BoxGrid />
			) : (
				<>
					<div className='flex flex-col gap-2 px-4'>
						<SearchField placeholder='Search Pokémon' value={search} onChange={(e) => setCarousel({ carouselSearch: e.target.value })} onClear={() => setCarousel({ carouselSearch: '' })} />
						<div className='scrollbar-none flex gap-4 overflow-x-auto'>
							{tierTabs(team).map((t) => (
								<Tab key={t} selected={!search && tab === t} onClick={() => setCarousel({ carouselTab: t, carouselSearch: '' })}>{t}</Tab>
							))}
						</div>
					</div>
					<div className='grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto px-4 pb-4'>
						{list.slice(0, 80).map((s) => (
							<CandidateCard key={s.name} species={s.name} types={s.types} roles={roles[s.name]} casual={team.mode === 'casual'} wide />
						))}
					</div>
				</>
			)}
		</div>
	);
}

export function MobileApp() {
	const [tab, setTab] = useState<TabId>('party');
	const { theme, toggle } = useTheme();
	const team = useOpenTeam();
	const member = useSelectedMember();
	const openTeamId = useStore((s) => s.openTeamId);
	const inspector = useStore((s) => s.inspector);
	const slot = useStore((s) => s.activeMoveSlot);
	const [sheet, setSheet] = useState(false);
	const firstTeam = useRef(openTeamId);
	const firstView = useRef(`${inspector}:${slot}`);

	// Opening a team from the Teams tab jumps to Party.
	useEffect(() => {
		if (openTeamId !== firstTeam.current) setTab('party');
		firstTeam.current = openTeamId;
	}, [openTeamId]);
	// Tapping a key row, move or stats opens the editor sheet.
	useEffect(() => {
		const key = `${inspector}:${slot}`;
		if (key !== firstView.current && member && inspector !== 'team') setSheet(true);
		firstView.current = key;
	}, [inspector, slot, member]);

	const tabs: [TabId, IconName, string][] = [['teams', 'teams', 'Teams'], ['party', 'party', 'Party'], ['browse', 'browse', 'Browse']];
	return (
		<div className='flex h-dvh flex-col overflow-hidden'>
			<header className='flex h-[52px] shrink-0 items-center gap-2 border-b border-line pl-4 pr-2'>
				<Logo size={32} />
				<span className='font-head text-[20px] font-bold leading-6'>Kingdra</span>
				<span className='flex-1' />
				<SpriteToggle />
				<IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={toggle} tooltip='none' />
				<Account />
			</header>
			{tab === 'party' && (
				<button type='button' onClick={() => setTab('teams')} className='flex h-11 shrink-0 items-center gap-2 border-b border-line px-4 text-left'>
					<span className='size-1.5 rounded-full bg-accent' />
					<span className='text-base font-semibold'>{team.name}</span>
					<span className='text-xs text-muted'>{formatLabel(team)} - {team.members.length}/6</span>
					<span className='flex-1' />
					<Icon name='chevron-down' className='text-muted' />
				</button>
			)}
			<div className='flex min-h-0 flex-1 flex-col'>
				{tab === 'teams' && <div className='min-h-0 flex-1 overflow-y-auto'><TeamLibrary /></div>}
				{tab === 'party' && <Workspace />}
				{tab === 'browse' && <Browse onPreview={() => setTab('party')} />}
			</div>
			<nav className='flex h-[72px] shrink-0 border-t border-line pb-[env(safe-area-inset-bottom)]'>
				{tabs.map(([id, icon, label]) => (
					<button key={id} type='button' onClick={() => setTab(id)} aria-current={tab === id} className='flex flex-1 flex-col items-center justify-center gap-1'>
						<Icon name={icon} className={tab === id ? 'text-accent' : 'text-muted'} />
						<span className={`text-xs ${tab === id ? 'font-medium' : 'text-muted'}`}>{label}</span>
					</button>
				))}
			</nav>
			<Sheet open={sheet && !!member} onClose={() => setSheet(false)} label='Editor'>
				<Inspector />
			</Sheet>
			<MemberActions />
		</div>
	);
}
