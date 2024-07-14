import '@/app/globals.css';
import Footer from '@/components/layouts/footer';

const notFound = () => {
	return (
		<html lang='en'>
			<head>
				<link rel='icon' href='/favicon.ico' />
			</head>
			<body className='flex flex-col items-center gap-2 p-32'>
				<a href='/' className='mb-8 text-black hover:underline'>
					Home
				</a>
				<h1 className='text-5xl font-bold'>
					You&apos;re lost aren&apos;t you...
				</h1>
				<h2 className='text-2xl font-light'>404: Page Not Found.</h2>
				<div className='absolute bottom-0 w-full'>
					<Footer />
				</div>
			</body>
		</html>
	);
};

export default notFound;
