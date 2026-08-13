import { describe, expect, it } from 'vitest';
import type { CustomTheme } from '@daycore/core';
import { BUILTIN_IDS, BUILTIN_META, isBuiltin, resolveCustom, themeBase } from './theme';

const theme = (o: Partial<CustomTheme>): CustomTheme => ({
  id: 'c1', familyId: 'liuli', name: 't', dark: false, variables: {}, ...o,
});

describe('BUILTIN_META', () => {
  it('covers exactly the four builtin ids', () => {
    expect(Object.keys(BUILTIN_META).sort()).toEqual([...BUILTIN_IDS].sort());
  });
  it('night is the one dark builtin', () => {
    expect(BUILTIN_META.night.dark).toBe(true);
    expect(BUILTIN_META.sky.dark).toBe(false);
  });
});

describe('isBuiltin', () => {
  it('knows the four ids and nothing else', () => {
    for (const id of BUILTIN_IDS) expect(isBuiltin(id)).toBe(true);
    expect(isBuiltin('custom-1')).toBe(false);
    expect(isBuiltin('')).toBe(false);
  });
});

describe('themeBase', () => {
  // ⚠️ dark decides night; base only breaks the tie between light bases.
  it('falls back to sky for a missing theme', () => {
    expect(themeBase(undefined)).toBe('sky');
  });
  it('uses night for a dark theme regardless of base', () => {
    expect(themeBase(theme({ dark: true, base: 'sunset' }))).toBe('night');
    expect(themeBase(theme({ dark: true, base: '' }))).toBe('night');
  });
  it('uses the base for a light theme when it is a builtin', () => {
    expect(themeBase(theme({ dark: false, base: 'sunset' }))).toBe('sunset');
    expect(themeBase(theme({ dark: false, base: 'nature' }))).toBe('nature');
  });
  it('ignores a base that is not a builtin', () => {
    expect(themeBase(theme({ dark: false, base: 'not-real' }))).toBe('sky');
    expect(themeBase(theme({ dark: false, base: '' }))).toBe('sky');
  });
});

describe('resolveCustom', () => {
  it('returns undefined for a builtin id', () => {
    expect(resolveCustom('sky', [theme({ id: 'sky', base: 'sky' })])).toBeUndefined();
  });
  it('finds a custom theme by id', () => {
    const t = theme({ id: 'c1' });
    expect(resolveCustom('c1', [t])).toBe(t);
  });
  it('returns undefined for a dangling id', () => {
    expect(resolveCustom('gone', [])).toBeUndefined();
  });
});
