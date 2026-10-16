'use client';

import { forwardRef, useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	icon: IconName;
	label: string;
	selected?: boolean;
	tone?: 'default' | 'accent' | 'danger';
	tooltip?: 'below' | 'above' | 'none';
	/** Anchor the tooltip to the button's right edge so it can't spill past the viewport. */
	tooltipAlign?: 'center' | 'end';
	/** `sm`: a 24 px hit (the touch-target minimum) for rows that must keep a 16 px line, such as a team card's controls. */
	size?: 'md' | 'sm';
}

/** Where a tooltip sits, fixed to the viewport, for a button at `r`. 4 px from the button, as before. */
function tipPlace(r: DOMRect, side: 'below' | 'above', align: 'center' | 'end'): CSSProperties {
	return {
		...(side === 'below' ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }),
		...(align === 'end' ? { right: window.innerWidth - r.right } : { left: r.left + r.width / 2, transform: 'translateX(-50%)' }),
	};
}

/**
 * personal-website-v3 IconButton: 16 px glyph in a 32 px hit, 80% → 100%
 * on hover with a hover fill, tooltip below. The tooltip renders in document.body, so a scrolling or clipped
 * container (a roster row, a team list) can't hide it.
 */
export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
	{ icon, label, selected, tone = 'default', tooltip = 'below', tooltipAlign = 'center', size = 'md', className = '', ...rest },
	ref
) {
	const [anchor, setAnchor] = useState<DOMRect | null>(null);
	// A fixed tooltip would drift from its button on scroll, so scrolling hides it.
	useEffect(() => {
		if (!anchor) return;
		const hide = () => setAnchor(null);
		window.addEventListener('scroll', hide, true);
		return () => window.removeEventListener('scroll', hide, true);
	}, [anchor]);
	const show = (e: React.SyntheticEvent<HTMLElement>) => setAnchor(e.currentTarget.getBoundingClientRect());
	return (
		<span
			className='group/ib relative inline-flex'
			onPointerEnter={tooltip === 'none' ? undefined : show}
			onPointerLeave={() => setAnchor(null)}
			onFocus={tooltip === 'none' ? undefined : (e) => e.target.matches(':focus-visible') && show(e)}
			onBlur={() => setAnchor(null)}
		>
			<button
				ref={ref}
				type='button'
				aria-label={label}
				aria-pressed={selected}
				className={`squishy inline-flex ${size === 'sm' ? 'size-[24px] rounded-md max-md:size-7' : 'size-8 rounded-lg'} items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-30 ${
					selected ? 'bg-accent-soft text-accent' : tone === 'danger' ? 'text-danger ring-1 ring-danger hover:bg-danger-soft' : tone === 'accent' ? 'text-accent hover:bg-hover' : 'text-fg/80 hover:bg-hover hover:text-fg'
				} ${className}`}
				{...rest}
			>
				<Icon name={icon} />
			</button>
			{tooltip !== 'none' &&
				anchor &&
				createPortal(
					<span
						role='tooltip'
						style={tipPlace(anchor, tooltip, tooltipAlign)}
						className='pointer-events-none fixed z-[110] whitespace-nowrap rounded bg-fg px-2 py-1 text-sm font-medium text-bg max-md:hidden'
					>
						{label}
					</span>,
					document.body
				)}
		</span>
	);
});
