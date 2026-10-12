import type { Metadata, Viewport } from 'next';
import { Stack_Sans_Text, Stack_Sans_Headline, IBM_Plex_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const text = Stack_Sans_Text({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-text', fallback: ['system-ui', 'sans-serif'], adjustFontFallback: false });
const head = Stack_Sans_Headline({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-head', fallback: ['system-ui', 'sans-serif'], adjustFontFallback: false });
// Mono is only the small dex numbers: one weight, and it does not compete with the app's JS for the first paint.
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-mono', preload: false });

export const metadata: Metadata = {
	title: 'Kingdra',
	description: 'A Pokémon teambuilder for casual and competitive teams. Designed and developed by Liam Sullivan.',
	applicationName: 'Kingdra',
	appleWebApp: { capable: true, title: 'Kingdra', statusBarStyle: 'default' },
	formatDetection: { telephone: false },
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	// No viewport-fit=cover: with it, iOS draws the page under the status bar and frosts that strip. Without it the
	// page starts below the status bar, so the env(safe-area-inset-*) paddings are zero and the layout needs none.
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#ffffff' },
		{ media: '(prefers-color-scheme: dark)', color: '#0f0f10' },
	],
};

// Applies the saved theme before paint so there is no flash.
// Also unregisters the retired service worker for returning visitors.
const themeScript = `try{var t=localStorage.getItem('kingdra.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}try{navigator.serviceWorker&&navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})})}catch(e){}`;

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
	<ClerkProvider>
		<html lang='en' className={`${text.variable} ${head.variable} ${mono.variable}`} suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
				{/* Every party icon and card sprite comes from these hosts; open the connections while the JS loads. */}
				<link rel='preconnect' href='https://raw.githubusercontent.com' />
				<link rel='preconnect' href='https://play.pokemonshowdown.com' />
			</head>
			<body>
				{children}
			</body>
		</html>
	</ClerkProvider>
);

export default RootLayout;
