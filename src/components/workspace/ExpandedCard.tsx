'use client';

import { useDroppable } from '@dnd-kit/core';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { TypeBadge, TypeSwatch } from '@/components/ui/TypeBadge';
import { PokemonIcon, PokemonSprite } from '@/components/pokemon/PokemonIcon';
import { evolutionLine, fieldsFor, getMove, getNature, getSpecies } from '@/lib/dex';
import { exportSet } from '@/lib/showdown';
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
	const changeSpecies = useStore((s) => s.changeSpecies);
	const setDialog = useStore((s) => s.setDialog);
	const toast = useStore((s) => s.toast);
	const problems = useStore((s) => s.validation[team.id]?.byMember[member.uid] ?? NO_PROBLEMS);
	const fields = fieldsFor(team);
	const mobile = useIsMobile();
	const line = evolutionLine(team, member.species);
	const nature = getNature(team, member.nature);

	const rows: { view: InspectorView; label: string; value: string; empty: string; flag: string[] }[] = [];
	if (fields.level) rows.push({ view: 'level', label: 'Level', value: String(member.level), empty: '', flag: problemsFor(problems, ['level']) });
	if (fields.ability) rows.push({ view: 'ability', label: 'Ability', value: member.ability, empty: 'Choose an ability', flag: problemsFor(problems, ['ability', member.ability]) });
	if (fields.item) rows.push({ view: 'item', label: 'Item', value: member.item, empty: 'No item', flag: problemsFor(problems, ['item', member.item]) });
	if (fields.nature) rows.push({ view: 'nature', label: 'Nature', value: member.nature, empty: 'Neutral', flag: [] });
	if (fields.tera) rows.push({ view: 'tera', label: 'Tera', value: member.teraType, empty: species?.types[0] ?? 'Choose a type', flag: problemsFor(problems, ['tera']) });

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(exportSet(member));
			toast('success', `${member.name || member.species} copied as Showdown text`);
		} catch {
			toast('error', "Couldn't copy to the clipboard");
		}
	};

	return (
		<section aria-label={`${member.name || member.species} set`} className='flex w-full max-w-[580px] flex-col gap-4'>
			<div className='flex gap-4 md:gap-6'>
				<div data-card-sprite className='flex size-[72px] shrink-0 items-end justify-center md:size-24'>
					<PokemonSprite species={member.species} shiny={member.shiny} size={mobile ? 72 : 96} />
				</div>
				<div className='flex min-w-0 flex-1 flex-col gap-2.5'>
					<div className='flex items-end gap-2'>
						<h2 className='truncate font-head text-[24px] font-semibold leading-7 tracking-[-0.02em] md:text-[32px] md:leading-9'>{member.name || member.species}</h2>
						<span className='pb-1 font-mono text-2xs text-muted'>#{species?.num ?? '?'}</span>
						{member.name && <span className='truncate pb-1 text-xs text-muted'>{member.species}</span>}
						<span className='flex-1' />
						<div className='flex shrink-0'>
							<IconButton icon='export' label='Copy set as Showdown text' onClick={copy} />
							<IconButton icon='import' label='Paste a Showdown set' onClick={() => setDialog('importSet')} />
							{team.mode === 'competitive' && <IconButton icon='details' label='More details' selected={inspector === 'details'} onClick={() => setInspector('details')} />}
						</div>
					</div>
					<div className='flex gap-1'>
						{(species?.types ?? []).map((t) => (
							<TypeBadge key={t} type={t} onClick={() => setMatchupType(t)} />
						))}
					</div>
					<div className='flex items-start gap-3 pt-1'>
						{line.map((name) => {
							const current = name === member.species;
							return (
								<button
									key={name}
									type='button'
									disabled={current}
									onClick={() =>
										hopAndSwap(document.querySelector('[data-card-sprite]'), () => {
											changeSpecies(member.uid, name);
											toast('success', `Now ${name}. The set was kept; anything it can't use is flagged.`);
										})
									}
									className='bounce-host group flex flex-col items-center gap-1 disabled:cursor-default'
									title={current ? name : `Switch to ${name}`}
								>
									<PokemonIcon species={name} className='bounce-glyph' />
									<span className={`h-0.5 w-5 rounded-full ${current ? 'bg-accent' : 'bg-transparent'}`} />
									<span className={`text-xs ${current ? 'text-fg' : 'text-muted group-hover:text-fg'}`}>{name}</span>
								</button>
							);
						})}
						{line.length === 1 && <span className='self-center text-xs text-muted'>does not evolve</span>}
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
				<div className='flex items-center pl-2'>
					<span className='text-xs text-muted'>Moves</span>
					<span className='flex-1' />
					<IconButton
						icon='stats'
						label={team.mode === 'casual' ? 'Base stats' : 'Stats'}
						selected={inspector === 'stats' || (team.mode === 'casual' && inspector === 'pokedex')}
						onClick={() => setInspector(team.mode === 'casual' ? 'pokedex' : 'stats')}
					/>
				</div>
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
	);
}

function MoveCell({ team, slot, move, active, flagged, onClick }: { team: Team; slot: number; move: string; active: boolean; flagged: boolean; onClick: () => void }) {
	const { setNodeRef, isOver, active: dragging } = useDroppable({ id: `moveslot:${slot}`, data: { kind: 'moveslot', slot } });
	const data = move ? getMove(team, move) : null;
	const dropping = dragging?.data.current?.kind === 'move';
	const over = isOver && dropping;
	return (
		<button
			ref={setNodeRef}
			type='button'
			data-move-slot={slot}
			onClick={onClick}
			aria-label={move ? `Move ${slot + 1}: ${move}. Change` : `Move ${slot + 1}: empty. Add a move`}
			className={`flex h-14 flex-col justify-center gap-1 rounded-md px-3 text-left transition-colors ${
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
						{data ? `${data.type} - ${data.category.toLowerCase()}${data.basePower ? ` - ${data.basePower}` : ''}` : 'Unknown move'}
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
