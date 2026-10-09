import { ICONS, type IconName } from './icon-data';

export type { IconName };

/** Majesticons glyph drawn in currentColor; 16×16 by default. */
export function Icon({ name, size = 16, className = '' }: { name: IconName; size?: number; className?: string }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox='0 0 24 24'
			aria-hidden='true'
			focusable='false'
			className={`shrink-0 ${className}`}
			dangerouslySetInnerHTML={{ __html: ICONS[name] }}
		/>
	);
}
