import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '@daycore/core';
import { ApiError, todayIso } from '@daycore/core';
import type { Boot, ChannelBinding, CustomTheme, DayPlan, MaterialCategory, MemoryFact, MoodCheckin, MoodKind, Proposal, SessionPrefs, TimeBlock, Wish } from '@daycore/core';
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

/** One tool call shown collapsed inside an assistant message. */
export interface ToolCard {
  callId: string;
  label: string;
  ok?: boolean;
  summary?: string;
  opId?: string;
}

/** A decision card the agent is blocked on (≤45s). */
export interface DecisionState {
  id: string;
  title: string;
  summary?: string;
  options: { id: string; label: string }[];
  answered?: boolean;
}

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  tools?: ToolCard[];
  decision?: DecisionState;
  error?: string;
  status: 'streaming' | 'done';
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
  const [threadId, setThreadId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const companionLoaded = useRef(false);
  const [prefs, setPrefs] = useState<SessionPrefs | null>(null);
  const [channels, setChannels] = useState<{ name: string; label: string; available: boolean }[]>([]);
  const [bindings, setBindings] = useState<ChannelBinding[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const [assistantName, setAssistantName] = useState(() => boot.session.assistantName);
  // ⚠️ personaPrompt 后端已改为 GET 回带（domain.Session json:"personaPrompt"），但 core 的 Session 类型还没这个字段 —— 用窄类型断言读，不碰 core。
  const personaPrompt = (boot.session as { personaPrompt?: string }).personaPrompt ?? '';
  const [moodKinds, setMoodKinds] = useState<MoodKind[]>([]);
  const [moodToday, setMoodToday] = useState<MoodCheckin | null>(null);

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
      const [pl, ps, th, ws, ms, pr, ch, ca, me, mk, mh] = await Promise.all([
        api.planForDate(date),
        api.proposals(),
        api.themes(),
        api.wishes(),
        api.materials(),
        api.preferences(),
        api.channels(),
        api.materialCategories(),
        api.memory(),
        api.moodKinds(),
        api.moodHistory(3),
      ]);
      setPlan(pl);
      setProposals(ps.proposals ?? []);
      setThemes(th.themes ?? []);
      setWishes(ws.wishes ?? []);
      setMaterials(ms.materials ?? []);
      setPrefs(pr);
      setChannels(ch.channels ?? []);
      setBindings(ch.bindings ?? []);
      setCategories(ca.categories ?? []);
      setMemories(me.facts ?? []);
      setMoodKinds(mk.kinds ?? []);
      const todayIsoStr = todayIso();
      setMoodToday((mh ?? []).find((m) => (m.createdAt || '').slice(0, 10) === todayIsoStr) || null);
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

  // ── companion (SSE v2) ──
  const openCompanion = useCallback(async () => {
    if (companionLoaded.current) return;
    companionLoaded.current = true;
    try {
      const { threads } = await api.threads();
      const first = threads[0];
      const tid = first ? first.id : (await api.createThread()).id;
      setThreadId(tid);
      // ⚠️ threadMessages is newest-first; reverse before rendering a transcript.
      const { messages } = await api.threadMessages(tid, 50);
      setChat(messages.slice().reverse().map((m) => ({
        id: m.id,
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
        status: 'done' as const,
      })));
    } catch {
      /* history is best-effort — an empty transcript still chats */
    }
  }, []);

  useEffect(() => {
    if (view === 'companion') void openCompanion();
  }, [view, openCompanion]);

  const sendCompanion = useCallback(async (text: string) => {
    if (!threadId) return;
    const asstId = 'a' + Date.now();
    setChat((prev) => [
      ...prev,
      { id: 'u' + Date.now(), role: 'user', content: text, status: 'done' },
      { id: asstId, role: 'assistant', content: '', status: 'streaming' },
    ]);
    setChatBusy(true);
    const patch = (fn: (m: ChatMsg) => ChatMsg) =>
      setChat((prev) => prev.map((m) => (m.id === asstId ? fn(m) : m)));
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await api.streamCompanion(
        { message: text, timezone: tz, threadId },
        {
          onDelta: (d) => patch((m) => ({ ...m, content: m.content + d })),
          onReasoning: (d) => patch((m) => ({ ...m, reasoning: (m.reasoning || '') + d })),
          onToolStart: (f) => patch((m) => ({ ...m, tools: [...(m.tools || []), { callId: f.callId, label: f.tool }] })),
          onToolResult: (f) => patch((m) => ({
            ...m,
            tools: (m.tools || []).map((tc) =>
              tc.callId === f.callId ? { ...tc, ok: f.ok, summary: f.summary, opId: f.opId } : tc,
            ),
          })),
          onDecisionCard: (f) => patch((m) => ({ ...m, decision: { id: f.id, title: f.title, summary: f.summary, options: f.options } })),
          onError: (_code, msg) => patch((m) => ({ ...m, error: msg, status: 'done' })),
          onDone: () => patch((m) => ({ ...m, status: 'done' })),
        },
      );
    } catch (e) {
      patch((m) => ({ ...m, error: e instanceof Error ? e.message : String(e), status: 'done' }));
    } finally {
      setChatBusy(false);
    }
  }, [threadId]);

  const respondDecision = useCallback(async (did: string, choice: string, text?: string) => {
    setChat((prev) => prev.map((m) =>
      m.decision && m.decision.id === did ? { ...m, decision: { ...m.decision, answered: true } } : m,
    ));
    try { await api.respondToDecision(did, choice, text); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);

  // ── settings ──
  const setPref = useCallback((key: keyof SessionPrefs, value: boolean) => {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
    void api.patchPreferences({ [key]: value } as Partial<SessionPrefs>).then(setPrefs).catch(() => {});
  }, []);

  const saveAssistantName = useCallback((name: string) => {
    setAssistantName(name);
    void api.patchSettings({ assistantName: name }).catch(() => {});
  }, []);

  const savePersonaPrompt = useCallback((prompt: string) => {
    void api.patchSettings({ personaPrompt: prompt }).catch(() => {});
  }, []);

  const saveLanguage = useCallback((lang: string) => {
    void api.patchSettings({ language: lang }).catch(() => {});
  }, []);

  const bindChannel = useCallback(async (channel: string) => {
    const r = await api.bindChannel(channel);
    await refresh();
    return r;
  }, [refresh]);

  const unbindChannel = useCallback(async (channel: string) => {
    await api.unbindChannel(channel);
    await refresh();
  }, [refresh]);

  const toggleCategory = useCallback((id: string, on: boolean) => {
    const next: Record<string, boolean> = {};
    for (const c of categories) next[c.id] = c.enabled;
    next[id] = on;
    setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, enabled: on } : c)));
    void api.patchPreferences({ materialCategories: next }).then(() => refresh()).catch(() => refresh());
  }, [categories, refresh]);

  const addMemory = useCallback(async (text: string) => {
    await api.addMemory(text);
    await refresh();
  }, [refresh]);

  const deleteMemory = useCallback(async (id: string) => {
    await api.deleteMemory(id);
    await refresh();
  }, [refresh]);

  const clearMemory = useCallback(async () => {
    await api.clearMemory();
    await refresh();
  }, [refresh]);

  const recordMood = useCallback(async (kindId: string, note?: string) => {
    await api.recordMood(kindId, note || '');
    await refresh();
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
    t, push, locale: boot.catalog.locale, date, setDate, mode, setMode, view, setView, isToday,
    weekStart, week, plan, pieces, proposals, stack,
    themes, currentTheme, setTheme, wishes, materials,
    toasts, dismiss, busy, error, draft, setDraft, confirmDraft, submit,
    tick, now: tick,
    doneCount: timed.filter((b) => b.completed).length, total: timed.length,
    toggleDone, setCompleted, moveTime, moveToTomorrow, toWish, refish, markConflict, removeBlock, setNote, lockBlock, dropInWell,
    answer, takeRow, takeBack, refresh,
    threadId, chat, chatBusy, openCompanion, sendCompanion, respondDecision,
    prefs, channels, bindings, categories, memories, assistantName, personaPrompt,
    setPref, saveAssistantName, savePersonaPrompt, saveLanguage, bindChannel, unbindChannel, toggleCategory, addMemory, deleteMemory, clearMemory,
    moodKinds, moodToday, recordMood,
  };
}

