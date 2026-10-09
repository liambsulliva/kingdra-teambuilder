'use client';

import { forwardRef } from 'react';
import { Icon, type IconName } from './Icon';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	icon: IconName;
	label: string;
	selected?: boolean;
	tone?: 'default' | 'accent';
	tooltip?: 'below' | 'above' | 'none';
}

/**
 * personal-website-v3 IconButton: 16 px glyph in a 32 px hit, 80% → 100%
 * on hover with a hover fill, tooltip below, scare-bounce on hover.
 */
export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
	{ icon, label, selected, tone = 'default', tooltip = 'below', className = '', ...rest },
	ref
) {
	return (
		<span className='group/ib bounce-host relative inline-flex'>
			<button
				ref={ref}
				type='button'
				aria-label={label}
				aria-pressed={selected}
				className={`squishy inline-flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-hover disabled:pointer-events-none disabled:opacity-30 ${
					selected || tone === 'accent' ? 'text-accent' : 'text-fg/80 hover:text-fg'
				} ${className}`}
				{...rest}
			>
				<span className='bounce-glyph inline-flex'>
					<Icon name={icon} />
				</span>
			</button>
			{tooltip !== 'none' && (
				<span
					role='tooltip'
					className={`pointer-events-none absolute left-1/2 z-50 max-md:hidden -translate-x-1/2 whitespace-nowrap rounded bg-fg px-2 py-1 text-sm font-medium text-bg opacity-0 transition-opacity duration-150 group-hover/ib:opacity-100 group-has-[:focus-visible]/ib:opacity-100 ${
						tooltip === 'below' ? 'top-9' : 'bottom-9'
					}`}
				>
					{label}
				</span>
			)}
		</span>
	);
});
