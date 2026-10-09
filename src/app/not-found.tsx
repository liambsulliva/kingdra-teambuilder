import Link from 'next/link';

export default function NotFound() {
	return (
		<main className='flex h-dvh flex-col justify-center gap-3 px-6 md:px-16'>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src='/brand/kingdra@2x.png' alt='' width={76} height={76} className='pixelated' />
			<h1 className='font-head text-[32px] font-semibold leading-9 tracking-[-0.02em]'>This route doesn&apos;t exist.</h1>
			<p className='text-base text-muted'>404, page not found.</p>
			<Link href='/' className='text-base font-medium text-accent hover:underline'>
				Back to your teams
			</Link>
		</main>
	);
}
