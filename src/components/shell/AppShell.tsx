import { Logo } from './Header';

/**
 * The frame the server renders before the app mounts: header and panel
 * outlines for both layouts, picked by CSS at the same 650px switch as
 * MOBILE_QUERY. It reads nothing from the browser, so it hydrates without a
 * mismatch and paints before any app JavaScript runs.
 */
export function AppShell() {
	return (
		<div className='h-dvh' aria-busy='true'>
			<div className='hidden h-full flex-col min-[651px]:flex'>
				<header className='flex h-14 shrink-0 items-center gap-2 border-b border-line pl-6 pr-4'>
					<Logo />
					<span className='font-head text-[20px] font-bold leading-6 tracking-[-0.01em]'>Kingdra</span>
				</header>
				<div className='flex min-h-0 flex-1'>
					<div className='w-[296px] shrink-0 border-r border-line' />
					<div className='flex-1' />
					<div className='w-[384px] shrink-0 border-l border-line max-[1100px]:hidden' />
				</div>
			</div>
			<div className='flex h-full flex-col min-[651px]:hidden'>
				<header className='flex h-[52px] shrink-0 items-center gap-2 border-b border-line pl-4 pr-2'>
					<Logo size={32} />
					<span className='font-head text-[20px] font-bold leading-6'>Kingdra</span>
				</header>
				<div className='h-11 shrink-0 border-b border-line' />
				<div className='flex-1' />
				<div className='h-[72px] shrink-0 border-t border-line' />
			</div>
		</div>
	);
}
