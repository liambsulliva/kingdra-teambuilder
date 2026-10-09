'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/controls';
import { TypeBadge, TypeSwatch } from '@/components/ui/TypeBadge';
import { PokemonIcon, PokemonSprite } from '@/components/pokemon/PokemonIcon';
import { defaultAbility, evolutionLine, fieldsFor, getMove, getNature, getSpecies } from '@/lib/dex';
import { exportSet, smogonPatch, type SmogonSet } from '@/lib/showdown';
import { supportFor, type SupportGroup } from '@/lib/support';
import { MAX_MOVES, type PokemonSet, type Team } from '@/lib/model';
import { NatureText } from '@/components/inspector/StatsView';
import { hopAndSwap } from '@/components/motion/choreography';
import { useIsMobile } from '@/lib/hooks';
import { useStore, type InspectorView } from '@/lib/store';

const NO_PROBLEMS: string[] = [];
const problemsFor = (problems: string[], words: string[]) => problems.filter((p) => words.some((w) => w && p.toLowerCase().includes(w.toLowerCase())));

export function ExpandedCard({ team, member }: { team: Team; member: PokemonSet }) {
	const species = getSpecies(team, member.species);
	const inspector = useStore((s) => s.inspector);
	const activeSlot = useStore((s) => s.activeMoveSlot);
	const setInspector = useStore((s) => s.setInspector);
	const setMatchupType = useStore((s) => s.setMatchupType);
	const setDialog = useStore((s) => s.setDialog);
	const updateSet = useStore((s) => s.updateSet);
	const [sets, setSets] = useState<Record<string, SmogonSet> | null>(null);
	const [support, setSupport] = useState<SupportGroup[]>([]);
	const toast = useStore((s) => s.toast);
	const problems = useStore((s) => s.validation[team.id]?.byMember[member.uid] ?? NO_PROBLEMS);
	const fields = fieldsFor(team);
	const mobile = useIsMobile();
	const line = evolutionLine(team, member.species);
	const nature = getNature(team, member.nature);

	// Keyed on the team's context, not the team object, so an edit to this member does not look it up again.
	const { mode, gen, format } = team;
	useEffect(() => {
		let live = true;
		supportFor({ mode, gen, format } as Team, member.species, member.level).then((groups) => live && setSupport(groups)).catch(() => live && setSupport([]));
		return () => {
			live = false;
		};
	}, [mode, gen, format, member.species, member.level]);

	const rows: { view: InspectorView; label: string; value: string; empty: string; flag: string[] }[] = [];
	if (fields.level) rows.push({ view: 'level', label: 'Level', value: String(member.level), empty: '', flag: problemsFor(problems, ['level']) });
	if (fields.ability) rows.push({ view: 'ability', label: 'Ability', value: member.ability, empty: 'Choose an ability', flag: problemsFor(problems, ['ability', member.ability]) });
	if (fields.item) rows.push({ view: 'item', label: 'Item', value: member.item, empty: 'No item', flag: problemsFor(problems, ['item', member.item]) });
	if (fields.nature) rows.push({ view: 'nature', label: 'Nature', value: member.nature, empty: 'Neutral', flag: [] });
	if (fields.tera) rows.push({ view: 'tera', label: 'Tera', value: member.teraType, empty: species?.types[0] ?? 'Choose a type', flag: problemsFor(problems, ['tera']) });

	const applySet = (name: string, set: SmogonSet) => {
		updateSet(member.uid, smogonPatch(set, defaultAbility(team, member.species)));
		setSets(null);
		toast('success', `Loaded the Smogon ${name} set`);
	};
	const loadSmogon = async () => {
		const format = team.mode === 'casual' ? `gen${team.gen}ou` : team.format;
		try {
			const res = await fetch(`/api/sets?format=${format}&species=${encodeURIComponent(member.species)}`);
			const found = ((await res.json()).sets ?? {}) as Record<string, SmogonSet>;
			const names = Object.keys(found);
			if (!names.length) return toast('error', `No Smogon set for ${member.species} in this format`);
			if (names.length === 1) applySet(names[0], found[names[0]]);
			else setSets(found);
		} catch {
			toast('error', "Couldn't load Smogon sets");
		}
	};

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(exportSet(member));
			toast('success', `${member.name || member.species} copied as Showdown text`);
		} catch {
			toast('error', "Couldn't copy to the clipboard");
		}
	};

	return (
		<div className='relative w-full'>
		<section aria-label={`${member.name || member.species} set`} className='flex w-full max-w-[580px] flex-col gap-4'>
			<div className='flex gap-4 md:gap-6'>
				<div data-card-sprite className='flex size-[72px] shrink-0 items-end justify-center self-center md:size-24'>
					<PokemonSprite species={member.species} shiny={member.shiny} size={mobile ? 72 : 96} />
				</div>
				<div className='flex min-w-0 flex-1 flex-col gap-2.5'>
					{/* Room on the right for the member actions, which sit at the top right of the panel. */}
					<div className='flex items-end gap-2 pr-36'>
						<h2 className='truncate font-head text-[24px] font-semibold leading-7 tracking-[-0.02em] md:text-[32px] md:leading-9'>{member.name || member.species}</h2>
						<span className='pb-1 font-mono text-2xs text-muted'>#{species?.num ?? '?'}</span>
						{member.name && <span className='truncate pb-1 text-xs text-muted'>{member.species}</span>}
					</div>
					<div className='flex items-center gap-1'>
						{(species?.types ?? []).map((t) => (
							<TypeBadge key={t} type={t} onClick={() => setMatchupType(t)} />
						))}
						{fields.shiny && (
							<IconButton icon='shiny' label={member.shiny ? 'Shiny' : 'Not shiny'} selected={member.shiny} onClick={() => updateSet(member.uid, { shiny: !member.shiny })} className='!size-5' />
						)}
					</div>
					<div className='-mb-0.5 flex items-start gap-3 pt-1'>
						{line.map((name) => (
							<EvolutionStep key={name} team={team} member={member} name={name} />
						))}
					</div>
				</div>
			</div>

			{rows.length > 0 && (
				<div className='flex flex-col'>
					{rows.map((r) => {
						const active = inspector === r.view;
						return (
							<button
								key={r.view}
								type='button'
								data-key-row={r.view}
								onClick={() => setInspector(r.view)}
								className='group flex h-7 items-center gap-3 rounded px-2 text-left hover:bg-hover'
							>
								<span className='w-16 shrink-0 text-xs text-muted'>{r.label}</span>
								<span className={`min-w-0 flex-1 truncate text-base font-medium ${active ? 'text-accent' : r.value ? 'text-fg' : 'text-muted'}`}>
									{r.view === 'nature' && nature ? <NatureText name={nature.name} plus={nature.plus} minus={nature.minus} /> : r.value || r.empty}
								</span>
								{r.flag.length > 0 && (
									<span title={r.flag.join('\n')} className='text-danger'>
										<Icon name='warning' />
									</span>
								)}
								<Icon name='chevron-right' className={`text-muted ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
							</button>
						);
					})}
				</div>
			)}

			<div className='flex flex-col gap-2'>
				{/* The set buttons follow the Load button inline and wrap back to the left edge. */}
				<div className='flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-2'>
					<span className='text-xs text-muted'>Moves</span>
					<button type='button' onClick={loadSmogon} className='text-xs font-medium text-muted hover:text-fg'>
						Load Smogon Set
					</button>
					{sets &&
						Object.entries(sets).map(([name, set]) => (
							<Button key={name} className='!h-7 !px-2 !text-xs' onClick={() => applySet(name, set)}>
								{name}
							</Button>
						))}
				</div>
				{support.length > 0 && (
					<div className='flex flex-wrap items-center gap-1.5 pl-2'>
						<span className='mr-1 text-xs text-muted'>Support</span>
						{support.map((g) => (
							<span
								key={g.name}
								tabIndex={0}
								className='group/support relative inline-flex h-5 items-center rounded border border-line px-1.5 text-2xs text-muted hover:text-fg'
							>
								{g.name}
								<span
									role='tooltip'
									className='pointer-events-none absolute left-0 top-6 z-50 w-max max-w-[260px] rounded bg-fg px-2 py-1 text-xs leading-5 text-bg opacity-0 transition-opacity duration-150 group-hover/support:opacity-100 group-focus-visible/support:opacity-100 max-md:hidden'
								>
									{g.moves.join(', ')}
								</span>
							</span>
						))}
					</div>
				)}
				<div className='grid grid-cols-2 gap-2'>
					{Array.from({ length: MAX_MOVES }, (_, i) => (
						<MoveCell
							key={i}
							team={team}
							slot={i}
							move={member.moves[i] ?? ''}
							active={inspector === 'moves' && activeSlot === i}
							flagged={!!member.moves[i] && problemsFor(problems, [member.moves[i]]).length > 0}
							onClick={() => setInspector('moves', i)}
						/>
					))}
				</div>
			</div>
		</section>
		<div className='absolute right-0 top-0 flex'>
			<IconButton icon='export' label='Copy set as Showdown text' onClick={copy} />
			<IconButton icon='import' label='Paste a Showdown set' onClick={() => setDialog('importSet')} />
			{team.mode === 'competitive' && <IconButton icon='details' label='More details' selected={inspector === 'details'} onClick={() => setInspector('details')} />}
			<span className='ml-2 flex'>
				<IconButton icon='trash' label={`Delete ${member.name || member.species}`} tone='danger' tooltipAlign='end' onClick={() => setDialog('deleteMember')} />
			</span>
		</div>
		</div>
	);
}

/**
 * One stage of the evolution line. Click switches the card to it. Drag it onto
 * another team's card to move the member there as that stage.
 */
function EvolutionStep({ team, member, name }: { team: Team; member: PokemonSet; name: string }) {
	const changeSpecies = useStore((s) => s.changeSpecies);
	const current = name === member.species;
	// The stage the card is on drags too: it moves the Pokémon itself, as its party sprite does.
	const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
		id: `evolution:${member.uid}:${name}`,
		data: { kind: 'evolution', uid: member.uid, species: name, teamId: team.id },
	});
	return (
		<button
			ref={setNodeRef}
			type='button'
			{...attributes}
			{...listeners}
			// Keyboard keeps its click: the drag sensor would otherwise take Enter and Space.
			onKeyDown={undefined}
			onClick={current ? undefined : () => hopAndSwap(document.querySelector('[data-card-sprite]'), () => changeSpecies(member.uid, name))}
			className={`bounce-host group flex flex-col items-center gap-1 ${current ? 'cursor-grab' : 'cursor-pointer'} ${isDragging ? 'opacity-40' : ''}`}
			title={current ? `Drag onto another team to move ${member.name || name} there` : `Switch to ${name}. Drag onto another team to move it there as ${name}`}
		>
			<PokemonIcon species={name} className='bounce-glyph' />
			<span className={`h-0.5 w-5 rounded-full ${current ? 'bg-accent' : 'bg-transparent'}`} />
			<span className={`text-xs ${current ? 'text-fg' : 'text-muted group-hover:text-fg'}`}>{name}</span>
		</button>
	);
}

function MoveCell({ team, slot, move, active, flagged, onClick }: { team: Team; slot: number; move: string; active: boolean; flagged: boolean; onClick: () => void }) {
	const { setNodeRef, isOver, active: dragging } = useDroppable({ id: `moveslot:${slot}`, data: { kind: 'moveslot', slot } });
	const { setNodeRef: dragRef, listeners, attributes, isDragging } = useDraggable({
		id: `moveslot-drag:${slot}`,
		data: { kind: 'move', move, type: getMove(team, move)?.type, slot },
		disabled: !move,
	});
	const data = move ? getMove(team, move) : null;
	const dropping = dragging?.data.current?.kind === 'move';
	const over = isOver && dropping;
	return (
		<button
			ref={(el) => {
				setNodeRef(el);
				dragRef(el);
			}}
			type='button'
			{...listeners}
			{...attributes}
			data-move-slot={slot}
			onClick={onClick}
			aria-label={move ? `Move ${slot + 1}: ${move}. Change` : `Move ${slot + 1}: empty. Add a move`}
			className={`flex h-14 flex-col justify-center gap-1 rounded-md px-3 text-left transition-colors ${isDragging ? 'opacity-40' : ''} ${
				over ? 'border border-dashed border-accent bg-accent-soft' : move ? (active ? 'border-[1.5px] border-accent' : 'border border-line hover:border-line-strong') : `border border-dashed ${dropping ? 'border-accent' : 'border-line-strong'} hover:bg-hover`
			}`}
		>
			{move ? (
				<>
					<span className='flex items-center gap-1.5 text-base font-medium'>
						{move}
						{flagged && <Icon name='warning' className='text-danger' />}
					</span>
					<span className='flex items-center gap-1.5 text-xs text-muted'>
						{data && <TypeSwatch type={data.type} />}
						{data ? `${data.type} - ${data.category}${data.basePower ? ` - ${data.basePower}` : ''}` : 'Unknown move'}
					</span>
				</>
			) : (
				<span className={`flex items-center gap-1.5 text-base font-medium ${over ? 'text-accent' : 'text-muted'}`}>
					<Icon name='plus' />
					{over ? `Drop to set move ${slot + 1}` : 'Add move'}
				</span>
			)}
		</button>
	);
}
