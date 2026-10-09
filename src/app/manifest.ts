import type { MetadataRoute } from 'next';

// Installable PWA. Kingdra is always online, so there is deliberately no
// service worker or offline cache; browsers no longer require one to install.
export default function manifest(): MetadataRoute.Manifest {
	return {
		id: '/',
		name: 'Kingdra',
		short_name: 'Kingdra',
		description: 'A Pokémon teambuilder for casual and competitive teams.',
		start_url: '/',
		scope: '/',
		display: 'standalone',
		orientation: 'any',
		background_color: '#ffffff',
		theme_color: '#ffffff',
		categories: ['games', 'utilities'],
		icons: [
			{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
		],
	};
}
