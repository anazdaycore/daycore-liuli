import type { CustomTheme } from '@daycore/core';

// 长卷's theme application.
//
// ⚠️ Builtin themes are applied by switching the data-theme attribute (the
// four rules in theme.css); custom themes are applied by laying them over a
// BASE builtin — the dark themes inherit night's light-text handling, light
// ones inherit sky — and then writing each variable inline onto :root. Inline
// beats every selector, so the custom values win over the base; switching back
// to a builtin clears the inline overrides (FRONTEND_HANDOFF §8).
//
// ⚠️ The base is "dark ? night : (base || sky)", NOT the theme's own id: a
// stored custom theme carries a "base" that names where the AI started from,
// which is a hint, not a CSS answer. The dark flag is the load-bearing one.

/** Swatches for the four builtins, so the picker never needs to reach into CSS. */
export interface BuiltinMeta {
  /** accent, bg, bg2 — three colours that read the theme at a glance. */
  sw: [string, string, string];
  dark: boolean;
}

export const BUILTIN_META: {
  sky: BuiltinMeta;
  sunset: BuiltinMeta;
  night: BuiltinMeta;
  nature: BuiltinMeta;
} = {
  sky: { sw: ['#3b82f6', '#e0f2fe', '#f0f9ff'], dark: false },
  sunset: { sw: ['#f97316', '#fff7ed', '#fef3c7'], dark: false },
  night: { sw: ['#a78bfa', '#1e1b4b', '#312e81'], dark: true },
  nature: { sw: ['#16a34a', '#f0fdf4', '#ecfdf5'], dark: false },
};

export const BUILTIN_IDS = ['sky', 'sunset', 'night', 'nature'] as const;

/** Is this id one of the four builtins? */
export function isBuiltin(id: string): boolean {
  return (BUILTIN_IDS as readonly string[]).includes(id);
}

/**
 * The base builtin a custom theme should sit on.
 *
 * ⚠️ Pure so the decision can be tested without a DOM. The dark flag decides
 * night vs sky; "base" only breaks the tie between light bases (it names where
 * the AI started, sunset vs nature), and only when it is actually a builtin.
 */
export function themeBase(theme: CustomTheme | undefined): string {
  if (!theme) return 'sky';
  if (theme.dark) return 'night';
  return theme.base && isBuiltin(theme.base) ? theme.base : 'sky';
}

/**
 * The custom theme to resolve, given an id and the session's list.
 *
 * ⚠️ An id that is neither builtin nor present in the list falls back to sky —
 * the one base every build renders. A dangling id (theme deleted behind the
 * session's back) must not render as "no theme at all".
 */
export function resolveCustom(id: string, customThemes: CustomTheme[]): CustomTheme | undefined {
  if (isBuiltin(id)) return undefined;
  return customThemes.find((c) => c.id === id);
}

/**
 * Apply one theme to the document.
 *
 * ⚠️ Builtin → set data-theme, clear inline. Custom → set data-theme to the
 * base, then setProperty each variable. The inline variables are what override
 * the base rule; without clearing them first, switching sky → sunset would
 * leave the old sky variables pinning the palette.
 */
export function applyTheme(root: HTMLElement, current: string, customThemes: CustomTheme[]): void {
  root.removeAttribute('style');
  if (isBuiltin(current)) {
    root.setAttribute('data-theme', current);
    return;
  }
  const th = resolveCustom(current, customThemes);
  root.setAttribute('data-theme', themeBase(th));
  if (th) {
    for (const [k, v] of Object.entries(th.variables)) {
      root.style.setProperty(k, v);
    }
  }
}
