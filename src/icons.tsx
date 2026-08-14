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

export const Heart = (p: IconProps) => base(p, <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />);
export const Moon = (p: IconProps) => base(p, <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />);
export const Bell = (p: IconProps) => base(p, <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>);
export const RefreshCw = (p: IconProps) => base(p, <><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15" /></>);
export const EyeOff = (p: IconProps) => base(p, <><path d="M17.9 17.9A10 10 0 0 1 12 19c-5 0-9-7-9-7a17.5 17.5 0 0 1 3.2-3.7M9.9 4.2A10 10 0 0 1 12 4c5 0 9 7 9 7a17.5 17.5 0 0 1-2.2 3.2M1 1l22 22" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>);
export const Globe = (p: IconProps) => base(p, <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>);
export const Plus = (p: IconProps) => base(p, <path d="M12 5v14M5 12h14" />);
export const Key = (p: IconProps) => base(p, <><path d="M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 8.5m0 0l3 3L22 8l-3-3-3.5 3.5z" /></>);
export const Copy = (p: IconProps) => base(p, <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>);
export const Wand = (p: IconProps) => base(p, <><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M15 9l.2.2" /><path d="M3 21l9-9M12.2 6.2L17.8 11.8a2 2 0 0 1 0 2.8l-3.2 3.2a2 2 0 0 1-2.8 0L6.2 12.2a2 2 0 0 1 0-2.8l3.2-3.2a2 2 0 0 1 2.8 0z" /></>);
export const NotebookPen = (p: IconProps) => base(p, <><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" /><path d="M8 3v3M8 9h8M8 13h5" /></>);
export const Utensils = (p: IconProps) => base(p, <><path d="M3 2v7a2 2 0 0 0 2 2v9M7 2v11a2 2 0 0 0 2 2v5M7 2v4M3 2v4M17 2v20M17 2a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3M17 2a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3" /></>);
export const GraduationCap = (p: IconProps) => base(p, <><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" /></>);
export const Plane = (p: IconProps) => base(p, <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />);
export const Wallet = (p: IconProps) => base(p, <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></>);
export const Dumbbell = (p: IconProps) => base(p, <><path d="M6.5 6.5L17.5 17.5M3 9l2 2-2 2M21 9l-2 2 2 2M6 6l2-2 2 2M16 16l2 2 2-2" /></>);
export const MessageCircle = (p: IconProps) => base(p, <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.4 8.4 0 0 1 8.5 8.5z" />);
export const Send = (p: IconProps) => base(p, <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />);
export const ExternalLink = (p: IconProps) => base(p, <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14L21 3" /></>);
export const Circle = (p: IconProps) => base(p, <circle cx="12" cy="12" r="9" />);
