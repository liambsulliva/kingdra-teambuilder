'use client';

import { forwardRef } from 'react';
import { Icon, type IconName } from './Icon';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	icon: IconName;
	label: string;
	selected?: boolean;
	tone?: 'default' | 'accent' | 'danger';
	tooltip?: 'below' | 'above' | 'none';
	/** Anchor the tooltip to the button's right edge so it can't spill past the viewport. */
	tooltipAlign?: 'center' | 'end';
}

/**
 * personal-website-v3 IconButton: 16 px glyph in a 32 px hit, 80% → 100%
 * on hover with a hover fill, tooltip below.
 */
export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
	{ icon, label, selected, tone = 'default', tooltip = 'below', tooltipAlign = 'center', className = '', ...rest },
	ref
) {
	return (
		<span className='group/ib relative inline-flex'>
			<button
				ref={ref}
				type='button'
				aria-label={label}
				aria-pressed={selected}
				className={`squishy inline-flex size-8 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30 ${
					selected ? 'bg-accent-soft text-accent' : tone === 'danger' ? 'text-danger ring-1 ring-danger hover:bg-danger-soft' : tone === 'accent' ? 'text-accent hover:bg-hover' : 'text-fg/80 hover:bg-hover hover:text-fg'
				} ${className}`}
				{...rest}
			>
				<Icon name={icon} />
			</button>
			{tooltip !== 'none' && (
				<span
					role='tooltip'
					className={`pointer-events-none absolute z-50 max-md:hidden whitespace-nowrap ${tooltipAlign === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'} rounded bg-fg px-2 py-1 text-sm font-medium text-bg opacity-0 transition-opacity duration-150 group-hover/ib:opacity-100 group-has-[:focus-visible]/ib:opacity-100 ${
						tooltip === 'below' ? 'top-9' : 'bottom-9'
					}`}
				>
					{label}
				</span>
			)}
		</span>
	);
});
