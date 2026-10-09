'use client';

import { memo, useRef, useState } from 'react';
import { Dex } from '@pkmn/dex';
import { iconSprite, iconStyle, frontSprite, cardSources, POKEBALL } from '@/lib/sprites';
import { useStore } from '@/lib/store';
import { LazyImg, Skeleton, sheetReady, useNearViewport, useSheet } from '@/components/ui/Skeleton';

export const speciesRef = (name: string) => {
	const s = Dex.species.get(name);
	return { name: s.name || name, num: s.num, forme: s.forme, baseSpecies: s.baseSpecies };
};

/**
 * 32×32 (by default) trimmed icon that fills its slot, bottom-centered. The icon
 * sheet loads once the icon is near the screen, behind a pulsing skeleton.
 */
export const PokemonIcon = memo(function PokemonIcon({ species, size = 32, className = '' }: { species: string; size?: number; className?: string }) {
	const sprite = iconSprite(speciesRef(species));
	const ref = useRef<HTMLSpanElement>(null);
	const near = useNearViewport(ref);
	// A sheet already loaded this session draws at once: no skeleton when a tab or panel remounts the icon.
	const state = useSheet((near || sheetReady(sprite?.url)) && sprite ? sprite.url : null);
	if (!sprite || state === 'failed') return <Pokeball size={size} className={className} />;
	return (
		<span ref={ref} aria-hidden className={`relative block shrink-0 overflow-hidden rounded-md ${className}`} style={{ width: size, height: size }}>
			{state === 'loading' && <Skeleton />}
			<span className={`absolute inset-0 transition-opacity duration-300 ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`} style={iconStyle(sprite, size)} />
		</span>
	);
});

/**
 * The Poké Ball shown where a Pokémon has no art: the one for the card-art set
 * on screen (Black/White or X/Y). Both are prefetched, so it is ready at once.
 */
export function Pokeball({ size = 32, className = '' }: { size?: number; className?: string }) {
	const spriteSet = useStore((s) => s.spriteSet);
	return <LazyImg src={POKEBALL[spriteSet]} alt='' size={size} className={className} />;
}

/**
 * Card art in the style the user picked (Black/White animated or X/Y pixelated
 * 3D), falling back through the other set, the static sprite and finally a
 * Poké Ball.
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
	const spriteSet = useStore((s) => s.spriteSet);
	const sources = cardSources(speciesRef(species), spriteSet, back, shiny);
	// A new species, side or set starts the fallback chain again from its best source.
	const identity = `${species}|${back}|${shiny}|${spriteSet}`;
	const [index, setIndex] = useState(0);
	const [key, setKey] = useState(identity);
	if (key !== identity) {
		setKey(identity);
		setIndex(0);
	}
	const source = sources[index];
	if (!source) return <Pokeball size={size} className={className} />;
	return <LazyImg src={source} alt={species} size={size} className={className} onError={() => setIndex((i) => i + 1)} />;
}

/** Static front sprite used on carousel cards. */
export function CardSprite({ species, size = 56 }: { species: string; size?: number }) {
	const [failed, setFailed] = useState(false);
	if (failed) return <Pokeball size={size} />;
	return <LazyImg src={frontSprite(speciesRef(species))} alt='' size={size} onError={() => setFailed(true)} />;
}
