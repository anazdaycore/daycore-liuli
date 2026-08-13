import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '@daycore/core';
import { ApiError, todayIso } from '@daycore/core';
import type { Boot, CustomTheme, DayPlan, Proposal, TimeBlock, Wish } from '@daycore/core';
import { addDaysIso, nowMin, piecesFor, toHM, type Piece } from './canvas';
import { applyTheme } from './theme';

// 长卷's state. Same discipline as the other three — no optimistic updates —
// because PATCH /api/plan can be REFUSED with 409 by the plan gate. A stale
// block does not just say the wrong thing, it occupies the wrong coordinates,
// and the user's next drag is aimed at a picture that is no longer true.

export type View = 'today' | 'materials' | 'outlook' | 'trace' | 'companion' | 'settings';
export type Mode = 'day' | 'week';

export interface Toast {
  id: number;
  label: string;
  sub?: string;
  opId?: string;
  action?: { label: string; run: () => void };
}

export interface Draft {
  blocks: TimeBlock[];
  note?: string;
}

const UNDO_MS = 6000;
let nextToast = 1;

export function useStore(boot: Boot) {
  const t = boot.catalog.t;
  const [date, setDate] = useState(() => todayIso());
  const [mode, setMode] = useState<Mode>('day');
  const [view, setView] = useState<View>('today');
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [week, setWeek] = useState<DayPlan[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [currentTheme, setCurrentTheme] = useState(() => boot.session.currentTheme || 'sky');
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [materials, setMaterials] = useState<api.Material[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tick, setTick] = useState(() => nowMin());

  useEffect(() => {
    const h = setInterval(() => setTick(nowMin()), 30_000);
    return () => clearInterval(h);
  }, []);

  const weekStart = useMemo(() => {
    const d = new Date(date + 'T12:00:00');
    const wd = (d.getDay() + 6) % 7; // Monday = 0
    return addDaysIso(date, -wd);
  }, [date]);

  const refresh = useCallback(async () => {
    try {
      const [pl, ps, th, ws, ms] = await Promise.all([
        api.planForDate(date),
        api.proposals(),
        api.themes(),
        api.wishes(),
        api.materials(),
      ]);
      setPlan(pl);
      setProposals(ps.proposals ?? []);
      setThemes(th.themes ?? []);
      setWishes(ws.wishes ?? []);
      setMaterials(ms.materials ?? []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [date]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (mode !== 'week') return;
    let live = true;
    api.planRange(weekStart, addDaysIso(weekStart, 6)).then((w) => { if (live) setWeek(w); }).catch(() => {});
    return () => { live = false; };
  }, [mode, weekStart]);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = nextToast++;
    setToasts((arr) => [...arr, { ...toast, id }]);
    window.setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== id)), UNDO_MS);
  }, []);

  const dismiss = useCallback((id: number) => setToasts((arr) => arr.filter((x) => x.id !== id)), []);

  const act = useCallback(
    async (run: () => Promise<unknown>, label: string) => {
      setBusy(true);
      setError('');
      try {
        await run();
        let opId: string | null = null;
        try { const { ops } = await api.ops(1); opId = ops?.[0]?.id ?? null; } catch { opId = null; }
        await refresh();
        if (opId) push({ label, opId });
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const body = e.body as { code?: string; message?: string; confirmable?: boolean } | null;
          const code = body?.code ?? 'locked';
          if (code === 'petrified') {
            push({ label: t('refusal.petrified'), sub: t('refusal.petrified.sub') });
          } else if (code === 'refish_capped') {
            push({ label: t('refusal.refishCapped') });
          } else if (code === 'locked') {
            const hard = body?.confirmable === false;
            push({
              label: hard ? t('refusal.lockedHard') : t('refusal.lockedSoft'),
              sub: hard ? t('refusal.locked.sub') : t('refusal.lockedSoft.sub'),
            });
          } else {
            setError(body?.message ?? e.message);
          }
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [push, refresh, t],
  );

  const takeBack = useCallback(async (opId: string) => {
    setBusy(true);
    try { await api.revertOp(opId); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }, [refresh]);

  // ── theme ──
  const setTheme = useCallback(async (id: string) => {
    setCurrentTheme(id);
    applyTheme(document.documentElement, id, themes);
    try { await api.setTheme(id); } catch { /* switch is local even if the log write fails */ }
  }, [themes]);

  // ── block lifecycle ──
  const toggleDone = useCallback(
    (b: TimeBlock) =>
      act(
        () => api.patchPlan(date, { action: 'update', match: { id: b.id }, changes: { completed: !b.completed } }),
        t(b.completed ? 'undo.reopen' : 'undo.completed', { title: b.title }),
      ),
    [act, date, t],
  );

  const setCompleted = useCallback(
    (b: TimeBlock, done: boolean) =>
      act(
        () => api.patchPlan(date, { action: 'update', match: { id: b.id }, changes: { completed: done } }),
        t(done ? 'undo.completed' : 'undo.reopen', { title: b.title }),
      ),
    [act, date, t],
  );

  const moveTime = useCallback(
    (b: TimeBlock, newMin: number) => {
      const hm = toHM(Math.max(0, Math.min(23 * 60 + 59, newMin)));
      return act(
        () => api.patchPlan(date, { action: 'update', match: { id: b.id }, changes: { time: hm } }),
        t('undo.moved', { title: b.title }),
      );
    },
    [act, date, t],
  );

  const moveToTomorrow = useCallback(
    (b: TimeBlock) => {
      const tomorrow = addDaysIso(date, 1);
      return act(async () => {
        await api.patchPlan(tomorrow, { action: 'add', block: { title: b.title, type: b.type, time: b.time, duration_min: b.duration_min, origin: 'manual' } });
        await api.patchPlan(date, { action: 'remove', match: { id: b.id } });
      }, t('undo.tomorrow', { title: b.title }));
    },
    [act, date, t],
  );

  const toWish = useCallback(
    (b: TimeBlock) => {
      return act(async () => {
        await api.createWish({ title: b.title, note: b.note, effortMin: b.duration_min ?? undefined });
        await api.patchPlan(date, { action: 'remove', match: { id: b.id } });
      }, t('undo.wish', { title: b.title }));
    },
    [act, date, t],
  );

  const refish = useCallback(
    (blockId: string) => {
      const b = plan?.blocks?.find((x) => x.id === blockId);
      if (!b) return Promise.resolve();
      const tomorrow = addDaysIso(date, 1);
      return act(
        () => api.refishBlock(tomorrow, { title: b.title, type: b.type, time: b.time, duration_min: b.duration_min, rescheduled_from: b.id }),
        t('undo.refish', { title: b.title }),
      );
    },
    [act, date, plan, t],
  );

  const markConflict = useCallback(
    (blockId: string) => act(() => api.markConflict(date, blockId), t('undo.conflict')),
    [act, date, t],
  );

  const removeBlock = useCallback(
    (b: TimeBlock) => act(() => api.patchPlan(date, { action: 'remove', match: { id: b.id } }), t('undo.removed', { title: b.title })),
    [act, date, t],
  );

  const setNote = useCallback(
    (b: TimeBlock, note: string) => act(() => api.patchPlan(date, { action: 'update', match: { id: b.id }, changes: { note } }), t('undo.note', { title: b.title })),
    [act, date, t],
  );

  const lockBlock = useCallback(
    (b: TimeBlock, level: 'none' | 'soft' | 'hard') => act(() => api.lockPlanBlock(date, b.id, level), t('undo.lock', { title: b.title })),
    [act, date, t],
  );

  // ── proposals ──
  const answer = useCallback(
    (p: Proposal, accept: boolean) => act(() => api.respondToProposal(p.id, accept), t(accept ? 'undo.accepted' : 'undo.rejected', { title: p.title })),
    [act, t],
  );

  const takeRow = useCallback(
    (p: Proposal, rowID: string) => act(() => api.respondToProposalRow(p.id, rowID), t('undo.accepted', { title: p.title })),
    [act, t],
  );

  // ── input bar (planFromText candidate confirmation) ──
  const submit = useCallback(async (text: string) => {
    setBusy(true);
    setError('');
    try {
      const r = await api.planFromText({ description: text, targetDate: date, timezone: undefined });
      if (r.error) { setError(r.message ?? r.error); return; }
      if (r.blocks && r.blocks.length) setDraft({ blocks: r.blocks, note: r.note });
      else push({ label: t('input.noBlocks') });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }, [date, push, t]);

  const confirmDraft = useCallback(async () => {
    if (!draft) return;
    setBusy(true);
    try {
      for (const b of draft.blocks) {
        await api.patchPlan(date, { action: 'add', block: { title: b.title, type: b.type, time: b.time, duration_min: b.duration_min, origin: 'manual' } });
      }
      setDraft(null);
      await refresh();
      push({ label: t('input.added', { n: draft.blocks.length }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await refresh();
    } finally { setBusy(false); }
  }, [date, draft, push, refresh, t]);

  // ── wells ──
  const keepBlock = useCallback(
    (b: TimeBlock) =>
      act(async () => {
        // ⚠️ material first, then remove: a lost note is worse than a stray block.
        await api.createMaterial({ title: b.title, category: 'note', source: 'user' });
        await api.patchPlan(date, { action: 'remove', match: { id: b.id } });
      }, t('undo.keep', { title: b.title })),
    [act, date, t],
  );

  const dropInWell = useCallback(
    (well: string, b: TimeBlock) => {
      if (well === 'tomorrow') return moveToTomorrow(b);
      if (well === 'someday') return toWish(b);
      if (well === 'replan') return refish(b.id);
      if (well === 'keep') return keepBlock(b);
      return Promise.resolve();
    },
    [moveToTomorrow, toWish, refish, keepBlock],
  );

  const pieces: Piece[] = piecesFor(plan, proposals);
  const timed = (plan?.blocks ?? []).filter((b) => !b.hidden && b.time !== null);
  // Non-timed pending proposals become stack cards, not canvas ghosts.
  const stack = proposals.filter((p) => p.state === 'pending' && !p.start);
  const isToday = date === todayIso();

  return {
    t, push, date, setDate, mode, setMode, view, setView, isToday,
    weekStart, week, plan, pieces, proposals, stack,
    themes, currentTheme, setTheme, wishes, materials,
    toasts, dismiss, busy, error, draft, setDraft, confirmDraft, submit,
    tick, now: tick,
    doneCount: timed.filter((b) => b.completed).length, total: timed.length,
    toggleDone, setCompleted, moveTime, moveToTomorrow, toWish, refish, markConflict, removeBlock, setNote, lockBlock, dropInWell,
    answer, takeRow, takeBack, refresh,
  };
}

