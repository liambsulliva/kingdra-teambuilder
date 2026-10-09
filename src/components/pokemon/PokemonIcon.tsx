'use client';

import { memo, useState } from 'react';
import { Dex } from '@pkmn/dex';
import { iconSprite, iconStyle, frontSprite, animatedSprite, staticSprite } from '@/lib/sprites';

export const speciesRef = (name: string) => {
	const s = Dex.species.get(name);
	return { name: s.name || name, num: s.num, forme: s.forme, baseSpecies: s.baseSpecies };
};

/** 32×32 (by default) trimmed icon that fills its slot, bottom-centered. */
export const PokemonIcon = memo(function PokemonIcon({ species, size = 32, className = '' }: { species: string; size?: number; className?: string }) {
	const sprite = iconSprite(speciesRef(species));
	if (!sprite) return <Pokeball size={size} className={className} />;
	return <span aria-hidden className={`block shrink-0 ${className}`} style={{ width: size, height: size, ...iconStyle(sprite, size) }} />;
});

export function Pokeball({ size = 32, className = '' }: { size?: number; className?: string }) {
	return (
		<svg width={size} height={size} viewBox='0 0 32 32' aria-hidden className={`shrink-0 text-line-strong ${className}`}>
			<circle cx='16' cy='16' r='11' fill='none' stroke='currentColor' strokeWidth='1.5' />
			<path d='M5 16h8m6 0h8' stroke='currentColor' strokeWidth='1.5' />
			<circle cx='16' cy='16' r='3' fill='none' stroke='currentColor' strokeWidth='1.5' />
		</svg>
	);
}

/**
 * Card art: Showdown's animated sprite from PokeAPI, falling back to the
 * static sprite and finally a Poké Ball.
 */
export function PokemonSprite({
	species,
	back = false,
	shiny = false,
	size = 96,
	className = '',
}: {
	species: string;
	back?: boolean;
	shiny?: boolean;
	size?: number;
	className?: string;
}) {
	const ref = speciesRef(species);
	const sources = [animatedSprite(ref, back, shiny), staticSprite(ref, back, shiny), back ? null : frontSprite(ref)].filter(Boolean) as string[];
	const [index, setIndex] = useState(0);
	const [key, setKey] = useState(species);
	if (key !== species) {
		setKey(species);
		setIndex(0);
	}
	if (index >= sources.length) return <Pokeball size={size} className={className} />;
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={sources[index]}
			alt={species}
			onError={() => setIndex((i) => i + 1)}
			className={`pixelated object-contain object-bottom ${className}`}
			style={{ width: size, height: size }}
			draggable={false}
		/>
	);
}

/** Static front sprite used on carousel cards. */
export function CardSprite({ species, size = 56 }: { species: string; size?: number }) {
	const [failed, setFailed] = useState(false);
	if (failed) return <Pokeball size={size} />;
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={frontSprite(speciesRef(species))}
			alt=''
			loading='lazy'
			onError={() => setFailed(true)}
			className='pixelated object-contain object-bottom'
			style={{ width: size, height: size }}
			draggable={false}
		/>
	);
}
