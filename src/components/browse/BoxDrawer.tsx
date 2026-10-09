'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Dex } from '@pkmn/dex';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { IconButton } from '@/components/ui/IconButton';
import { Button, Tab } from '@/components/ui/controls';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { PokemonIcon } from '@/components/pokemon/PokemonIcon';
import { getSpecies } from '@/lib/dex';
import { BOX_SIZE, type PokemonSet } from '@/lib/model';
import { useOpenTeam, useStore } from '@/lib/store';
import { PartyRow } from '@/components/workspace/PartyRow';
import { NatureText } from '@/components/inspector/StatsView';

function BoxCell({ box, slot, set, selected, onSelect }: { box: number; slot: number; set: PokemonSet | null; selected: boolean; onSelect: () => void }) {
	const { setNodeRef: dropRef, isOver, active } = useDroppable({ id: `boxcell:${box}:${slot}`, data: { kind: 'boxcell', box, slot } });
	const { setNodeRef: dragRef, listeners, attributes, isDragging } = useDraggable({ id: `boxset:${box}:${slot}`, data: { kind: 'boxset', box, slot, species: set?.species }, disabled: !set });
	const over = isOver && active?.data.current?.kind !== 'move' && active?.data.current?.kind !== 'candidate';
	return (
		<div ref={dropRef} className={`flex size-12 items-center justify-center rounded-md ${over ? 'bg-accent-soft outline-dashed outline-1 outline-accent' : ''}`}>
			{set ? (
				<button
					ref={dragRef}
					type='button'
					{...listeners}
					{...attributes}
					onClick={onSelect}
					aria-label={`${set.name || set.species}, box slot ${slot + 1}`}
					className={`rounded-md p-1 ${selected ? 'bg-accent-soft' : 'hover:bg-hover'} ${isDragging ? 'opacity-30' : ''}`}
				>
					<PokemonIcon species={set.species} />
				</button>
			) : (
				<span className='size-8 rounded-md border border-dashed border-line-strong/60' />
			)}
		</div>
	);
}

export function BoxDrawer() {
	const open = useStore((s) => s.boxOpen);
	const setOpen = useStore((s) => s.setBoxOpen);
	const boxes = useStore((s) => s.library.boxes);
	const index = useStore((s) => Math.min(s.boxIndex, s.library.boxes.length - 1));
	const setIndex = useStore((s) => s.setBoxIndex);
	const addBox = useStore((s) => s.addBox);
	const renameBox = useStore((s) => s.renameBox);
	const deleteBox = useStore((s) => s.deleteBox);
	const takeFromBox = useStore((s) => s.takeFromBox);
	const team = useOpenTeam();
	const [selected, setSelected] = useState<number | null>(null);
	const [renaming, setRenaming] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const box = boxes[index];
	const stored = selected !== null ? box.slots[selected] : null;
	const species = stored ? getSpecies(team, stored.species) : null;
	const count = box.slots.filter(Boolean).length;

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, setOpen]);

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key='scrim'
						className='fixed inset-0 top-14 z-40 bg-bg/60'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={() => setOpen(false)}
					/>
					<motion.section
						key='drawer'
						aria-label='Box'
						role='dialog'
						className='fixed bottom-6 left-1/2 z-50 flex w-max max-w-[calc(100vw-32px)] flex-col gap-4 rounded-2xl border border-line bg-bg px-6 pb-6 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]'
						initial={{ y: '110%', x: '-50%' }}
						animate={{ y: 0, x: '-50%' }}
						exit={{ y: '110%', x: '-50%' }}
						transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
					>
						<div className='flex justify-center pt-2'>
							<span className='h-1 w-9 rounded-full bg-line' />
						</div>
						<PartyRow />
						<div className='h-px bg-line' />
						<div className='flex items-center gap-3'>
							<h2 className='text-md font-semibold'>Box</h2>
							<IconButton icon='chevron-left' label='Previous box' disabled={index === 0} onClick={() => { setIndex(index - 1); setSelected(null); }} />
							<div role='tablist' className='scrollbar-none flex max-w-[360px] gap-4 overflow-x-auto'>
								{boxes.map((b, i) =>
									i === index && renaming ? (
										<input
											key={b.id}
											autoFocus
											defaultValue={b.name}
											onBlur={(e) => { renameBox(i, e.target.value); setRenaming(false); }}
											onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
											className='w-28 rounded px-1 text-md font-semibold outline-none ring-1 ring-accent'
										/>
									) : (
										<Tab key={b.id} selected={i === index} onClick={() => { setIndex(i); setSelected(null); }} onDoubleClick={() => setRenaming(true)} title='Double-click to rename'>
											{b.name}
										</Tab>
									)
								)}
							</div>
							<IconButton icon='chevron-right' label='Next box' disabled={index === boxes.length - 1} onClick={() => { setIndex(index + 1); setSelected(null); }} />
							<IconButton icon='plus' label='New box' onClick={addBox} />
							{confirmingDelete ? (
								<button
									type='button'
									autoFocus
									onBlur={() => setConfirmingDelete(false)}
									onClick={() => { deleteBox(index); setSelected(null); setConfirmingDelete(false); }}
									className='squishy h-8 rounded-md bg-danger px-2 text-xs font-medium text-white'
								>
									{count ? `Delete ${box.name} and ${count} stored?` : `Delete ${box.name}?`}
								</button>
							) : (
								<IconButton icon='trash' label='Delete box' disabled={boxes.length <= 1} onClick={() => setConfirmingDelete(true)} />
							)}
							<span className='text-xs tabular-nums text-muted'>{count} / {BOX_SIZE}</span>
							<span className='flex-1' />
							<IconButton icon='close' label='Close box' onClick={() => setOpen(false)} />
						</div>
						<div className='flex gap-12'>
							<div className='grid grid-cols-6 gap-1'>
								{box.slots.map((set, i) => (
									<BoxCell key={i} box={index} slot={i} set={set} selected={selected === i} onSelect={() => setSelected(i)} />
								))}
							</div>
							<div className='flex w-[300px] flex-col gap-3'>
								{stored && species ? (
									<>
										<div className='flex items-end gap-2'>
											<span className='font-head text-[20px] font-semibold leading-6'>{stored.name || stored.species}</span>
											<span className='font-mono text-2xs text-muted'>#{species.num}</span>
										</div>
										<div className='flex gap-1'>{species.types.map((t) => <TypeBadge key={t} type={t} />)}</div>
										<dl className='grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-base'>
											{stored.ability && (<><dt className='text-xs text-muted'>Ability</dt><dd className='font-medium'>{stored.ability}</dd></>)}
											{stored.item && (<><dt className='text-xs text-muted'>Item</dt><dd className='font-medium'>{stored.item}</dd></>)}
											{stored.nature && (<><dt className='text-xs text-muted'>Nature</dt><dd className='font-medium'><NatureText name={stored.nature} {...(getNatureParts(stored.nature))} /></dd></>)}
											{stored.moves.length > 0 && (<><dt className='text-xs text-muted'>Moves</dt><dd className='font-medium'>{stored.moves.filter(Boolean).join(', ')}</dd></>)}
										</dl>
										<Button icon='party' onClick={() => { takeFromBox(index, selected!); setSelected(null); }}>
											Move to party
										</Button>
									</>
								) : (
									<p className='text-base text-muted'>Select a Pokémon to see its stored set.</p>
								)}
								<p className='text-xs text-muted'>Drag between the Box and the party. Drop on a member to swap them. Moving into a team of another generation keeps the set and flags anything illegal.</p>
							</div>
						</div>
					</motion.section>
				</>
			)}
		</AnimatePresence>
	);
}

function getNatureParts(name: string) {
	const n = Dex.natures.get(name);
	return { plus: n.plus, minus: n.minus };
}
