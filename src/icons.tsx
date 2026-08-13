import type { ReactNode, SVGProps } from 'react';

// Inline SVG icons. 长卷 does not pull a dependency for a handful of strokes —
// each is a 24×24 viewBox with the currentColor convention, sized by the
// caller's `size`. Stroke-based (like the design system's) rather than filled.

export interface IconProps extends SVGProps<SVGSVGElement> { size?: number }

function base({ size = 18, ...rest }: IconProps, children: ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const ChevronLeft = (p: IconProps) => base(p, <path d="M15 18l-6-6 6-6" />);
export const ChevronRight = (p: IconProps) => base(p, <path d="M9 6l6 6-6 6" />);
export const Sun = (p: IconProps) => base(p, <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const Layers = (p: IconProps) => base(p, <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></>);
export const BookOpen = (p: IconProps) => base(p, <><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" /><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" /></>);
export const Anchor = (p: IconProps) => base(p, <><circle cx="12" cy="5" r="3" /><path d="M12 22V8M5 12H2a10 10 0 0 0 20 0h-3" /></>);
export const Zap = (p: IconProps) => base(p, <path d="M13 2L3 14h7l-1 8 11-12h-7l1-8z" />);
export const MessageHeart = (p: IconProps) => base(p, <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M12 8.5c-.6-1-1.7-1.5-2.6-1-1 .5-1.2 1.8-.4 2.7.9 1 2.9 2.3 3 2.3.1 0 2.1-1.3 3-2.3.8-.9.6-2.2-.4-2.7-.9-.5-2 0-2.6 1z" fill="currentColor" stroke="none" /></>);
export const Settings = (p: IconProps) => base(p, <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>);
export const X = (p: IconProps) => base(p, <path d="M18 6L6 18M6 6l12 12" />);
export const Check = (p: IconProps) => base(p, <path d="M20 6L9 17l-5-5" />);
export const ArrowUp = (p: IconProps) => base(p, <path d="M12 19V5M5 12l7-7 7 7" />);
export const Mic = (p: IconProps) => base(p, <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></>);
export const Link = (p: IconProps) => base(p, <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>);
export const Sparkles = (p: IconProps) => base(p, <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" /></>);
export const Trash = (p: IconProps) => base(p, <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>);
export const Repeat = (p: IconProps) => base(p, <><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>);
export const Clock = (p: IconProps) => base(p, <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>);
export const MoreHorizontal = (p: IconProps) => base(p, <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>);
export const Pencil = (p: IconProps) => base(p, <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />);
export const Palette = (p: IconProps) => base(p, <><path d="M12 22a10 10 0 1 1 10-10c0 2-1.5 3-3 3h-2a2 2 0 0 0-1.5 3.4c.3.4.5.8.5 1.3a2.3 2.3 0 0 1-2.3 2.3z" /><circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" /><circle cx="11" cy="7.5" r="1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="7.5" r="1" fill="currentColor" stroke="none" /></>);

