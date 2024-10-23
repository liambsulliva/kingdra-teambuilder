import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
	title: 'Kingdra - A Pokémon Teambuilder',
	description: 'Designed and Developed by Liam Sullivan',
};

const RootLayout = ({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) => {
	return (
		<html lang='en'>
			<head>
				<link rel='icon' href='/favicon.ico' />
				<link rel='preconnect' href='https://fonts.googleapis.com'></link>
				<link
					rel='preconnect'
					href='https://fonts.gstatic.com'
					crossOrigin={'anonymous'}
				></link>
				<link
					href='https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap'
					rel='stylesheet'
				></link>
			</head>
			<body>
				{children}
				<Script src='/service-worker.js' />
			</body>
		</html>
	);
};

export default RootLayout;
