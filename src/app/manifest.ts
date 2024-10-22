import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Kingdra Teambuilder',
		short_name: 'Kingdra',
		description: 'A Pokemon Teambuilder - Built by Liam Sullivan.',
		start_url: '/',
		display: 'standalone',
		background_color: '#ffffff',
		theme_color: '#000000',
		icons: [
			{
				src: '/icon.png',
				sizes: '192x192',
				type: 'image/png',
			},
		],
	};
}
