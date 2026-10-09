'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { getSpecies, serebiiUrl } from '@/lib/dex';
import { STATS } from '@/lib/model';
import { pokeapiId } from '@/lib/sprites';
import { speciesRef } from '@/components/pokemon/PokemonIcon';
import type { PokemonSet, Team } from '@/lib/model';
import { StatRow } from './StatsView';

const cache = new Map<string, Promise<unknown>>();
function usePokeApi<T>(url: string | null) {
	const [state, setState] = useState<{ data?: T; error?: boolean; loading: boolean }>({ loading: true });
	useEffect(() => {
		if (!url) return;
		let live = true;
		setState({ loading: true });
		if (!cache.has(url)) cache.set(url, fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status))));
		cache
			.get(url)!
			.then((data) => live && setState({ data: data as T, loading: false }))
			.catch(() => {
				cache.delete(url);
				if (live) setState({ error: true, loading: false });
			});
		return () => {
			live = false;
		};
	}, [url]);
	return state;
}

interface SpeciesData {
	flavor_text_entries: { flavor_text: string; language: { name: string }; version: { name: string } }[];
	genera: { genus: string; language: { name: string } }[];
	generation: { name: string };
	capture_rate: number;
	gender_rate: number;
	base_happiness: number | null;
	is_baby: boolean;
	is_legendary: boolean;
	is_mythical: boolean;
	hatch_counter: number | null;
	growth_rate: { name: string };
	egg_groups: { name: string }[];
	evolves_from_species: { name: string } | null;
	varieties: { pokemon: { name: string } }[];
}

const title = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9' };

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className='flex flex-col gap-0.5'>
			<span className='text-xs text-muted'>{label}</span>
			<span className='text-base'>{value}</span>
		</div>
	);
}

export function PokedexView({ team, member }: { team: Team; member: PokemonSet }) {
	const s = getSpecies(team, member.species);
	const num = s?.num ?? 0;
	const { data, loading, error } = usePokeApi<SpeciesData>(num ? `https://pokeapi.co/api/v2/pokemon-species/${num}/` : null);
	if (!s) return null;
	const flavor = data?.flavor_text_entries.filter((f) => f.language.name === 'en');
	const text = flavor?.[flavor.length - 1]?.flavor_text.replace(/[\n\f­]+/g, ' ');
	const genus = data?.genera.find((g) => g.language.name === 'en')?.genus;
	const gender = data ? (data.gender_rate < 0 ? 'Genderless' : `${(data.gender_rate / 8) * 100}% ♀`) : '';
	const forms = data?.varieties.map((v) => v.pokemon.name).filter((n) => n !== s.baseSpecies.toLowerCase()) ?? [];
	const total = STATS.reduce((n, k) => n + s.baseStats[k], 0);
	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-end gap-2'>
				<span className='text-base font-semibold'>{s.name}</span>
				<span className='font-mono text-2xs text-muted'>#{num}</span>
				{genus && <span className='text-xs text-muted'>{genus}</span>}
			</div>
			{loading && <p className='text-base text-muted'>Loading Pokédex entry…</p>}
			{error && <p className='flex items-center gap-1.5 text-base text-danger'><Icon name='warning' />Couldn&apos;t reach PokeAPI. Try again later.</p>}
			{text && <p className='text-base text-muted'>{text}</p>}
			{data && (
				<div className='grid grid-cols-2 gap-x-6 gap-y-3'>
					<Fact label='Introduced' value={`Gen ${ROMAN[data.generation.name.split('-')[1]] ?? '?'}`} />
					<Fact label='Capture Rate' value={data.capture_rate} />
					<Fact label='Gender' value={gender} />
					<Fact label='Base Happiness' value={data.base_happiness ?? '—'} />
					<Fact label='Egg Groups' value={data.egg_groups.map((e) => title(e.name)).join(', ') || '—'} />
					<Fact label='Hatch' value={data.hatch_counter != null ? `${data.hatch_counter} Cycles` : '—'} />
					<Fact label='Growth' value={title(data.growth_rate.name)} />
					<Fact label='Evolves From' value={data.evolves_from_species ? title(data.evolves_from_species.name) : '—'} />
					<Fact label='Baby' value={data.is_baby ? 'Yes' : 'No'} />
					<Fact label='Legendary / Mythical' value={data.is_legendary ? 'Legendary' : data.is_mythical ? 'Mythical' : 'No'} />
				</div>
			)}
			<div className='flex items-end'>
				<span className='text-xs font-medium'>Base Stats</span>
				<span className='flex-1' />
				<span className='text-xs tabular-nums text-muted'>Total {total}</span>
			</div>
			<div className='flex flex-col gap-1.5'>
				{STATS.map((k) => (
					<StatRow key={k} stat={k} base={s.baseStats[k]} />
				))}
			</div>
			{forms.length > 0 && <Fact label='Forms' value={forms.map(title).join(', ')} />}
			<a href={serebiiUrl(team.gen, num, s.baseSpecies)} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1.5 self-start text-xs font-medium hover:text-accent'>
				Serebii, Gen {team.gen}
				<Icon name='external' className='text-muted' />
			</a>
		</div>
	);
}

interface Encounter {
	location_area: { name: string };
	version_details: { version: { name: string }; max_chance: number }[];
}

const GEN_VERSIONS: Record<number, string[]> = {
	1: ['red', 'blue', 'yellow'],
	2: ['gold', 'silver', 'crystal'],
	3: ['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen'],
	4: ['diamond', 'pearl', 'platinum', 'heartgold', 'soulsilver'],
	5: ['black', 'white', 'black-2', 'white-2'],
	6: ['x', 'y', 'omega-ruby', 'alpha-sapphire'],
	7: ['sun', 'moon', 'ultra-sun', 'ultra-moon', 'lets-go-pikachu', 'lets-go-eevee'],
	8: ['sword', 'shield', 'brilliant-diamond', 'shining-pearl', 'legends-arceus'],
	9: ['scarlet', 'violet'],
};

export function LocationsView({ team, member }: { team: Team; member: PokemonSet }) {
	const id = pokeapiId(speciesRef(member.species));
	const { data, loading, error } = usePokeApi<Encounter[]>(`https://pokeapi.co/api/v2/pokemon/${id}/encounters`);
	const versions = GEN_VERSIONS[team.gen] ?? [];
	const rows = (data ?? [])
		.map((e) => ({ area: title(e.location_area.name), details: e.version_details.filter((v) => versions.includes(v.version.name)) }))
		.filter((r) => r.details.length);
	return (
		<div className='flex flex-col gap-3'>
			<div className='flex flex-col'>
				<span className='text-base font-semibold'>Where To Find {member.species}</span>
				<span className='text-xs text-muted'>Wild encounters in Gen {team.gen} games</span>
			</div>
			{loading && <p className='text-base text-muted'>Loading locations…</p>}
			{error && <p className='flex items-center gap-1.5 text-base text-danger'><Icon name='warning' />Couldn&apos;t reach PokeAPI. Try again later.</p>}
			{!loading && !error && !rows.length && <p className='text-base text-muted'>No wild encounters in Gen {team.gen}. It may be an evolution, gift or event Pokémon.</p>}
			<ul className='flex flex-col'>
				{rows.map((r) => (
					<li key={r.area} className='flex flex-col gap-1 border-b border-line py-2.5'>
						<span className='text-base font-medium'>{r.area}</span>
						<span className='flex flex-wrap gap-x-3 text-xs text-muted'>
							{r.details.map((d) => (
								<span key={d.version.name}>
									{title(d.version.name)} <span className='tabular-nums'>{d.max_chance}%</span>
								</span>
							))}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
