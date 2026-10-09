'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { NumberBox, SearchField, Select } from '@/components/ui/controls';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { abilitiesFor, fieldsFor, generationFor, getSpecies, itemsFor, naturesFor, searchItems, typesForGen } from '@/lib/dex';
import type { PokemonSet, Team } from '@/lib/model';
import { useStore, type InspectorView } from '@/lib/store';
import { landOn } from '@/components/motion/choreography';
import { NatureText } from './StatsView';

/** `picked`: a value chosen from a list lands on its key row on the card. Typed or removed values do not. */
function useApply(member: PokemonSet) {
	const updateSet = useStore((s) => s.updateSet);
	return (view: InspectorView, patch: Partial<PokemonSet>, picked = false) => {
		// Choosing what is already chosen is a no-op: no change, no animation.
		if ((Object.keys(patch) as (keyof PokemonSet)[]).every((k) => member[k] === patch[k])) return;
		updateSet(member.uid, patch);
		if (picked) landOn(`[data-key-row="${view}"]`);
	};
}

function Heading({ title, hint }: { title: string; hint?: string }) {
	return (
		<div className='flex flex-col'>
			<span className='text-base font-semibold'>{title}</span>
			{hint && <span className='text-xs text-muted'>{hint}</span>}
		</div>
	);
}

function Row({ selected, onClick, children, title }: { selected?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
	return (
		<button
			type='button'
			title={title}
			aria-pressed={selected}
			onClick={onClick}
			className={`squishy flex w-full items-start gap-3 rounded px-2 py-2 text-left transition-colors ${selected ? 'bg-accent-soft' : 'hover:bg-hover'}`}
		>
			{children}
		</button>
	);
}

export function AbilityView({ team, member }: { team: Team; member: PokemonSet }) {
	const apply = useApply(member);
	const abilities = abilitiesFor(team, member.species);
	return (
		<div className='flex flex-col gap-3'>
			<Heading title='Ability' hint={`What ${member.species} can have in Gen ${team.gen}`} />
			<div className='flex flex-col'>
				{abilities.map(({ ability, hidden, special }) => (
					<Row key={ability.id} selected={member.ability === ability.name} onClick={() => apply('ability', { ability: ability.name }, true)}>
						<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
							<span className={`flex items-center gap-2 text-base font-medium ${member.ability === ability.name ? 'text-accent' : ''}`}>
								{ability.name}
								{hidden && <span className='rounded border border-line px-1 text-2xs font-medium text-muted'>Hidden</span>}
								{special && <span className='rounded border border-line px-1 text-2xs font-medium text-muted'>Special</span>}
							</span>
							<span className='text-xs text-muted'>{ability.shortDesc || ability.desc}</span>
						</span>
					</Row>
				))}
				{!abilities.length && <p className='px-2 text-base text-muted'>Abilities arrived in Gen 3.</p>}
			</div>
		</div>
	);
}

export function ItemView({ team, member }: { team: Team; member: PokemonSet }) {
	const apply = useApply(member);
	const [query, setQuery] = useState('');
	const items = useMemo(() => itemsFor(team), [team]);
	const q = query.trim().toLowerCase();
	const shown = useMemo(() => searchItems(items, query).slice(0, 120), [items, query]);
	return (
		<div className='flex flex-col gap-3'>
			<Heading title='Item' hint={`${items.length} held items in Gen ${team.gen}`} />
			<SearchField autoFocus placeholder='Search items and effects' value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery('')} />
			<div className='flex flex-col'>
				{member.item && (
					<Row onClick={() => apply('item', { item: '' })}>
						<Icon name='close' className='mt-0.5 text-muted' />
						<span className='text-base text-muted'>Remove {member.item}</span>
					</Row>
				)}
				{shown.map((i) => (
					<Row key={i.id} selected={member.item === i.name} onClick={() => apply('item', { item: i.name }, true)}>
						<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
							<span className={`text-base font-medium ${member.item === i.name ? 'text-accent' : ''}`}>{i.name}</span>
							{/* A match in the long text shows that text, so the row says why it matched. */}
							<span className='line-clamp-2 text-xs text-muted'>{q && !i.shortDesc.toLowerCase().includes(q) ? i.desc : i.shortDesc || i.desc}</span>
						</span>
					</Row>
				))}
			</div>
		</div>
	);
}

export function NatureView({ team, member }: { team: Team; member: PokemonSet }) {
	const apply = useApply(member);
	const natures = naturesFor(team);
	return (
		<div className='flex flex-col gap-3'>
			<Heading title='Nature' hint='Raised stat in red, lowered stat in blue' />
			<div className='grid grid-cols-2 gap-1'>
				{natures.map((n) => (
					<Row key={n.id} selected={member.nature === n.name} onClick={() => apply('nature', { nature: n.name }, true)}>
						<span className={`text-base font-medium ${member.nature === n.name ? 'text-accent' : ''}`}>
							<NatureText name={n.name} plus={n.plus} minus={n.minus} />
						</span>
					</Row>
				))}
			</div>
		</div>
	);
}

export function TeraView({ team, member }: { team: Team; member: PokemonSet }) {
	const apply = useApply(member);
	const types = [...typesForGen(team.gen), 'Stellar'];
	return (
		<div className='flex flex-col gap-3'>
			<Heading title='Tera type' hint='Defaults to the first type when empty' />
			<div className='flex flex-wrap gap-2'>
				{types.map((t) => (
					<button
						key={t}
						type='button'
						onClick={() => apply('tera', { teraType: t }, true)}
						className={`squishy rounded p-0.5 ${member.teraType === t ? 'ring-[1.5px] ring-accent' : ''}`}
						aria-pressed={member.teraType === t}
					>
						<TypeBadge type={t} />
					</button>
				))}
			</div>
		</div>
	);
}

export function LevelView({ team, member }: { team: Team; member: PokemonSet }) {
	const apply = useApply(member);
	return (
		<div className='flex flex-col gap-3'>
			<Heading title='Level' hint={team.format.includes('vgc') ? 'VGC battles at level 50' : team.format.endsWith('lc') ? 'Little Cup is level 5' : '1 to 100'} />
			<div className='flex items-center gap-2'>
				<NumberBox label='Level' value={member.level} min={1} max={100} width='w-16' onCommit={(v) => apply('level', { level: v })} />
				{[100, 50, 5].map((l) => (
					<button key={l} type='button' onClick={() => apply('level', { level: l }, true)} className='squishy h-6 rounded border border-line px-2 text-xs font-medium hover:bg-hover'>
						{l}
					</button>
				))}
			</div>
		</div>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className='flex min-h-9 items-center gap-3 border-b border-line py-1.5'>
			<span className='w-28 shrink-0 text-xs text-muted'>{label}</span>
			<span className='flex min-w-0 flex-1 items-center gap-2'>{children}</span>
		</label>
	);
}

export function DetailsView({ team, member }: { team: Team; member: PokemonSet }) {
	const updateSet = useStore((s) => s.updateSet);
	const f = fieldsFor(team);
	const species = getSpecies(team, member.species);
	const gen = generationFor(team);
	const balls = useMemo(() => [...gen.items].filter((i) => i.isPokeball).map((i) => i.name), [gen]);
	const genders = species?.gender ? [species.gender] : ['M', 'F'];
	const hpTypes = typesForGen(team.gen).filter((t) => t !== 'Normal' && t !== 'Fairy');
	const set = (patch: Partial<PokemonSet>) => updateSet(member.uid, patch);
	return (
		<div className='flex flex-col gap-3'>
			<Heading title='Details' hint={`Fields that exist in Gen ${team.gen}`} />
			<div className='flex flex-col'>
				<Field label='Nickname'>
					<input
						value={member.name}
						maxLength={18}
						placeholder={member.species}
						onChange={(e) => set({ name: e.target.value })}
						onBlur={(e) => {
							const name = e.target.value.trim();
							if (name !== member.name) set({ name });
						}}
						className='h-7 w-full rounded px-1.5 text-base outline-none placeholder:text-muted hover:bg-hover focus:bg-hover'
					/>
				</Field>
				{f.gender && (
					<Field label='Gender'>
						{species?.gender === 'N' ? (
							<span className='text-base text-muted'>Genderless</span>
						) : (
							(['', ...genders] as PokemonSet['gender'][]).map((g) => (
								<button key={g || 'any'} type='button' onClick={() => set({ gender: g })} className={`squishy h-7 rounded px-2 text-base ${member.gender === g ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-hover'}`}>
									{g === 'M' ? '♂ Male' : g === 'F' ? '♀ Female' : 'Random'}
								</button>
							))
						)}
					</Field>
				)}
				{f.happiness && (
					<Field label='Happiness'>
						<NumberBox label='Happiness' value={member.happiness} min={0} max={255} width='w-14' onCommit={(v) => set({ happiness: v })} />
						<span className='text-xs text-muted'>0 to 255. Return and Frustration use this</span>
					</Field>
				)}
				{f.pokeball && (
					<Field label='Poké Ball'>
						<Select label='Poké Ball' className='w-full' value={member.pokeball || 'Poke Ball'} options={balls.map((b) => ({ value: b, label: b }))} onChange={(v) => set({ pokeball: v === 'Poke Ball' ? '' : v })} />
					</Field>
				)}
				{f.hiddenPower && (
					<Field label='Hidden Power'>
						<Select label='Hidden Power type' className='w-full' value={member.hpType || ''} options={[{ value: '', label: 'From IVs' }, ...hpTypes.map((t) => ({ value: t, label: t }))]} onChange={(v) => set({ hpType: v })} />
					</Field>
				)}
				{f.dynamax && (
					<>
						<Field label='Dynamax level'>
							<NumberBox label='Dynamax level' value={member.dynamaxLevel} min={0} max={10} width='w-12' onCommit={(v) => set({ dynamaxLevel: v })} />
						</Field>
						{species?.canGigantamax && (
							<Field label='Gigantamax'>
								<button type='button' role='switch' aria-checked={member.gigantamax} onClick={() => set({ gigantamax: !member.gigantamax })} className={`squishy h-7 rounded px-2 text-base ${member.gigantamax ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-hover'}`}>
									{member.gigantamax ? 'Gigantamax' : 'Off'}
								</button>
							</Field>
						)}
					</>
				)}
			</div>
		</div>
	);
}
