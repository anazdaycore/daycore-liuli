import { SPEAKS } from '@daycore/core';
import type { KindSpec, Manifest, TokenSpec } from '@daycore/core';

// 琉璃 · 长卷 —— 时间是一块连续的空间画布。
//
// ⚠️ Its own family, like the other three. A theme is a set of values for ONE
// token space, and 长卷's space is a canvas's: a background gradient, three
// levels of ink, an accent pair, a glass surface, and the few lines only a map
// of time has (the hour line, the now line). 汀 has water; 纸屿 has paper. None
// of those words mean anything in the other two.

export const FAMILY_ID = 'liuli';
export const DISPLAY_NAME = '琉璃 · 长卷';
// ⚠️ 从 core 取，不再各写一份。四份 `= 1` 曾经同时是错的：core 的 paths.ts
// 硬写 /api/v2，所以对着 v1 后端每个请求都 404，而这个数字说「能连」。
// 一个前端如果真的需要比 core 更新的契约，那时候再在这里覆盖它。
export const MIN_API = SPEAKS.major;

/**
 * 长卷's token space.
 *
 * ⚠️ These names must match what src/theme.css actually reads — the theme
 * editor offers a variable that changes nothing otherwise, which reads as "the
 * backend lost my value" and is the single most confusing outcome.
 *
 * Deliberately NOT every `--cj-*`/derived variable in the stylesheet. The
 * derived ones (`--accent-soft`, `--line`, `--glass2`, `--veil`,
 * `--c-task`, `--shadow`, …) are colour-mix plumbing a person theming a
 * canvas would never set by hand, and they recompute automatically off the
 * primitives below. What is here is the handoff's themeable set — the colours,
 * the three radii, and the lock variables it names explicitly as "AI 生成主题时
 * 可覆盖" (HANDOFF 06 §1).
 */
export const TOKENS: TokenSpec[] = [
  // ── the canvas itself ──
  { name: '--bg', kind: 'color', description: '画布背景渐变起点（整屏底色）' },
  { name: '--bg2', kind: 'color', description: '画布背景渐变终点（略亮）' },
  // ── ink ──
  { name: '--ink', kind: 'color', description: '正文墨色' },
  { name: '--ink2', kind: 'color', description: '次级墨色：时长、元信息' },
  { name: '--ink3', kind: 'color', description: '最弱墨色：刻度、标签、已过去的块' },
  // ── accent ──
  { name: '--accent', kind: 'color', description: '主色：现在线、主按钮、选中态' },
  { name: '--accent2', kind: 'color', description: '副强调色：约会类块、次级高亮' },
  // ── glass ──
  { name: '--glass', kind: 'color', description: '玻璃表面（半透明）' },
  { name: '--glass-brd', kind: 'color', description: '玻璃描边' },
  // ── status ──
  { name: '--ok', kind: 'color', description: '完成、放松类块' },
  { name: '--warm', kind: 'color', description: '提醒、用餐类块、暖色点缀' },
  // ── the lock (HANDOFF 02 §4: --lock-c / --lock-sz / --lock-op / --lock-radius) ──
  { name: '--lock-c', kind: 'color', description: '锁的颜色，默认取 --ink3' },
  { name: '--lock-sz', kind: 'length', description: '锁体宽度' },
  { name: '--lock-op', kind: 'ratio', description: '锁的不透明度（0–1）' },
  { name: '--lock-radius', kind: 'length', description: '锁体圆角' },
  // ── shape ──
  { name: '--r-lg', kind: 'length', description: '大圆角：抽屉、卡片' },
  { name: '--r-md', kind: 'length', description: '中圆角' },
  { name: '--r-sm', kind: 'length', description: '小圆角' },
  // ── the lines only a time map has ──
  { name: '--cj-hour-line', kind: 'color', description: '整点刻度线。⚠️ 要淡到不和块抢' },
  { name: '--cj-now-line', kind: 'color', description: '「现在」那条线' },
  // ── 虚影（提案在时间轴上的占位影）──
  { name: '--cj-ghost-inset', kind: 'ratio-or-length', description: '虚影相对块的内缩' },
  { name: '--cj-ghost-dash', kind: 'list-of<length>', description: '虚影描边虚线的线段节奏' },
];

/** 虚影内缩既可以是比例（0.06）也可以是长度（6px）——内置六 kind 没有一个
 *  能同时收这两种，所以长卷提议一个自己的。pattern 原文即后端测试钉住的那
 *  份（internal/theme），改它两边一起红。 */
const RATIO_OR_LENGTH: KindSpec = {
  name: 'ratio-or-length',
  pattern: '0|0?\\.[0-9]+|1(\\.0+)?|[0-9.]+(px|rem)',
  description: '比例或长度：0–1 的小数，或带 px/rem 的长度',
};

export const PROPOSED_KINDS: KindSpec[] = [RATIO_OR_LENGTH];

export const THEME_RULES = [
  '长卷 是一张地图：整屏是连续的时间，块是贴在上面的东西。所以背景要能承托很多块而不喧宾夺主。',
  '⚠️ --cj-hour-line 必须非常淡。刻度线一旦和块争夺注意力，地图就退化成表格。',
  '--cj-now-line 是唯一应该被一眼看到的线，但它是 1.5px 均匀实线，不是渐变 —— 渐变会让它左粗右消、视觉偏心。',
  '三级墨色（--ink / --ink2 / --ink3）拉开层次，最弱那级要真的退到背景里去。',
  '--glass 与 --glass-brd 都要半透明，撑起玻璃拟态；深色主题记得用很低透明度的白。',
].join('\n');

export function manifest(buildHash: string): Manifest {
  return {
    familyId: FAMILY_ID,
    buildHash,
    displayName: DISPLAY_NAME,
    version: __APP_VERSION__,
    minApi: MIN_API,
    theme: { tokens: TOKENS, kinds: PROPOSED_KINDS, rules: THEME_RULES },
  };
}
