import { useState } from 'react';
import type { Assignment, OperationLog } from '@daycore/core';
import { addDaysIso, isoOf, toHM } from './canvas';
import {
  Anchor, BookOpen, Check, Heart, Moon, Plus, Trash, Upload, X, Zap,
} from './icons';
import type { useStore } from './store';

type S = ReturnType<typeof useStore>;

function Page({ icon, title, note, children }: { icon: React.ReactNode; title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="cj-page">
      <div className="inner">
        <h2 className="pt"><span className="ic">{icon}</span>{title}<span className="pn">{note}</span></h2>
        {children}
      </div>
    </div>
  );
}

function actorLabel(actor: string | undefined, agent: string, t: (k: string) => string): string {
  if (actor === 'agent') return agent;
  if (actor === 'system') return t('trace.system');
  return t('trace.me');
}

// ⚠️ 用浏览器本地日分组（createdAt 是 UTC，slice(0,10) 会切成 UTC 日导致跨日错位）
function groupByDay(ops: OperationLog[]): { date: string; rows: OperationLog[] }[] {
  const map = new Map<string, OperationLog[]>();
  for (const op of ops) {
    const d = isoOf(new Date(op.createdAt));
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(op);
  }
  return [...map.entries()].map(([date, rows]) => ({ date, rows }));
}

function relDay(date: string, t: (k: string) => string): string {
  const today = isoOf(new Date());
  if (date === today) return t('trace.today');
  if (date === addDaysIso(today, -1)) return t('trace.yesterday');
  return date;
}

function fmtHM(iso: string): string {
  const d = new Date(iso);
  return toHM(d.getHours() * 60 + d.getMinutes());
}

// 绝对式截止标签（照 zhiyu panels.tsx dueLabel）：今天/明天 HH:MM，其余「周日 8月16日 HH:MM」
function dueLabel(due: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return '';
  const lang = document.documentElement.lang || undefined;
  const hm = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const date = isoOf(d);
  const today = isoOf(new Date());
  if (date === today) return t('outlook.dueToday') + ' ' + hm;
  if (date === addDaysIso(today, 1)) return t('outlook.dueTomorrow') + ' ' + hm;
  const wd = new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(d);
  const md = new Intl.DateTimeFormat(lang, { month: 'long', day: 'numeric' }).format(d);
  return wd + ' ' + md + ' ' + hm;
}

// 小时级紧迫度（照 zhiyu panels.tsx urgencyOf）：<26h 强调、<76h 次之、其余淡
function urgencyOf(dueAt: string | undefined): number {
  if (!dueAt) return 0;
  const ms = new Date(dueAt).getTime();
  if (Number.isNaN(ms)) return 0;
  const dh = (ms - Date.now()) / 3600e3;
  return dh < 26 ? 2 : dh < 76 ? 1 : 0;
}

// ── 资料 ──
export function MaterialsPage({ s }: { s: S }) {
  const t = s.t;
  const catName = (id: string) => s.categories.find((c) => c.id === id)?.name || id;
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    void s.addMaterial(f.name, t('materials.uploadedBody', { kb: Math.round(f.size / 1024) }));
  };
  return (
    <Page icon={<BookOpen size={19} />} title={t('drawer.materials')} note={t('materials.note')}>
      <div className="cj-grid2">
        <div>
          <label className="cj-item" style={{ borderStyle: 'dashed', cursor: 'pointer' }}>
            <span style={{ color: 'var(--accent)', marginTop: 2 }}><Upload size={16} /></span>
            <div className="bd"><div className="t">{t('materials.upload')}</div><div className="s">{t('materials.uploadSub')}</div></div>
            <input type="file" style={{ display: 'none' }} onChange={onFile} />
          </label>
          <div className="cj-sec">{t('materials.library')}<span className="n">{s.materials.length}</span></div>
          {s.materials.map((m) => (
            <div key={m.id} className="cj-item">
              <span className={'cj-kind' + ((m.category === 'health' || m.category === 'diet' || m.category === 'fitness' || m.category === 'travel') ? ' life' : '')}>{catName(m.category)}</span>
              <div className="bd"><div className="t">{m.title}</div>{m.summary ? <div className="s">{m.summary}</div> : null}</div>
              <button className="x" title={t('materials.remove')} onClick={() => void s.deleteMaterial(m.id)}><Trash size={13} /></button>
            </div>
          ))}
        </div>
        <div>
          <div className="cj-sec">{t('materials.memory')}<span className="n">{s.memories.length}</span></div>
          {s.memories.map((m) => (
            <div key={m.id} className="cj-item">
              <span className="cj-kind mem">{m.type === 'preference' ? t('settings.memory.preference') : t('settings.memory.wish')}</span>
              <div className="bd"><div className="t">{m.fact}</div></div>
              <button className="x" title={t('settings.memory.removed')} onClick={() => void s.deleteMemory(m.id)}><Trash size={13} /></button>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

// ── 足迹 ──
export function TracePage({ s }: { s: S }) {
  const t = s.t;
  const today = isoOf(new Date());
  const days = Array.from({ length: 15 }, (_, i) => addDaysIso(today, i - 14));
  const moodByDay = new Map(s.riverMoods.map((m) => [(m.createdAt || '').slice(0, 10), m]));
  const opsByDay = new Map<string, number>();
  for (const op of s.ops) { const d = isoOf(new Date(op.createdAt)); opsByDay.set(d, (opsByDay.get(d) || 0) + 1); }
  const maxN = Math.max(1, ...[...opsByDay.values()]);
  const ledger = groupByDay(s.ops);
  return (
    <Page icon={<Anchor size={19} />} title={t('drawer.trace')} note={t('trace.note')}>
      <div className="cj-grid2">
        <div>
          <div className="cj-sec">{t('trace.river')}</div>
          <div className="cj-river">
            {days.map((d) => {
              const mood = moodByDay.get(d);
              const kind = mood ? s.moodKinds.find((k) => k.id === mood.mood) : null;
              const count = opsByDay.get(d) || 0;
              return (
                <div key={d} className={'cj-rday' + (d === today ? ' today' : '')}>
                  <span className="e">{kind ? kind.emoji : ''}</span>
                  <span className="bar" style={{ height: 8 + (count / maxN) * 44 }}></span>
                  <span className="d">{Number(d.slice(8, 10))}</span>
                </div>
              );
            })}
          </div>
          {/* ⚠️ 钉住钮：服务端无 pin 端点，不做（core 只有 GET /api/rhythm 只读） */}
          <div className="cj-item" style={{ marginTop: 14 }}>
            <span style={{ color: 'var(--accent)', marginTop: 2 }}><Moon size={15} /></span>
            <div className="bd">
              <div className="t">{s.rhythm && s.rhythm.source !== 'default' ? t('trace.rhythm.learned', { sleep: s.rhythm.sleep, wake: s.rhythm.wake }) : t('trace.rhythm.title')}</div>
              <div className="s">{s.rhythm && s.rhythm.source !== 'default' ? (s.rhythm.source === 'pinned' ? t('trace.rhythm.pinnedSub') : t('trace.rhythm.learnedSub')) : t('trace.rhythm.body')}</div>
            </div>
          </div>
          {/* ⚠️ 周信：无端点，静态文案卡 */}
          <div className="cj-item" style={{ marginTop: 14 }}>
            <span style={{ color: 'var(--warm)', marginTop: 2 }}><Heart size={15} /></span>
            <div className="bd"><div className="t">{t('trace.weekly')}</div><div className="s">{t('trace.weekly.sub')}</div></div>
          </div>
        </div>
        <div>
          <div className="cj-sec">{t('trace.ledger')}<span className="n">{s.ops.length}</span></div>
          {ledger.length === 0 && <div className="cj-item"><div className="bd"><div className="s">{t('trace.empty')}</div></div></div>}
          {ledger.map(({ date, rows }) => (
            <div key={date}>
              <div className="cj-sec" style={{ letterSpacing: 0, fontWeight: 650 }}>{relDay(date, t)}</div>
              {rows.map((op) => (
                <div key={op.id} className="cj-op">
                  <span className="tm">{fmtHM(op.createdAt)}</span>
                  <div className="bd"><div className="lb">{op.summary || op.action}</div></div>
                  <span className={'who' + (op.actor === 'agent' ? '' : ' me')}>{actorLabel(op.actor, s.assistantName, t)}</span>
                  <button className="un" onClick={() => void s.takeBack(op.id)}>{t('undo.take')}</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

// ── 展望 ──
export function OutlookPage({ s }: { s: S }) {
  const t = s.t;
  const [wish, setWish] = useState('');
  const addWish = () => { const tx = wish.trim(); if (!tx) return; void s.addWish(tx); setWish(''); s.push({ label: t('outlook.wishAdded') }); };
  const active = s.wishes.filter((w) => w.status === 'active');
  const tomorrow = s.tomorrowPlan?.blocks?.filter((b) => !b.hidden && b.time !== null) ?? [];
  return (
    <Page icon={<Zap size={19} />} title={t('drawer.outlook')} note={t('outlook.note')}>
      <div className="cj-grid2">
        <div>
          <div className="cj-sec">{t('outlook.due')}<span className="n">{s.assignments.length}</span></div>
          <div className="cj-radar">
            {s.assignments.map((a: Assignment) => {
              const info = { label: dueLabel(a.dueAt || '', t), urgency: urgencyOf(a.dueAt) };
              const course = s.courses.find((c) => c.id === a.courseId);
              return (
                <div key={a.id} className="cj-ritem" data-u={info.urgency}>
                  <span className="u" data-u={info.urgency}></span>
                  <div className="bd"><div className="t">{a.title}</div>{course ? <div className="c">{course.courseCode || course.name}</div> : null}</div>
                  <span className="dl">{info.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="cj-sec">{t('outlook.tomorrow')}</div>
          {tomorrow.length === 0 && <div className="cj-item"><div className="bd"><div className="s">{t('outlook.tomorrowEmpty')}</div></div></div>}
          {tomorrow.map((b) => (
            <div key={b.id} className="cj-op" style={{ cursor: 'pointer' }} onClick={() => s.setDate(addDaysIso(isoOf(new Date()), 1))}>
              <span className="tm">{b.time}</span><div className="bd"><div className="lb">{b.title}</div></div>
              <span className="who">{b.origin === 'auto' ? s.assistantName : t('trace.me')}</span>
            </div>
          ))}
          <div className="cj-sec" style={{ marginTop: 18 }}>{t('outlook.wishes')}<span className="n">{active.length}</span></div>
          {active.map((w) => (
            <div key={w.id} className="cj-item">
              <div className="bd"><div className="t">{w.title}</div>{w.effortMin ? <div className="s">{t('outlook.effort', { n: w.effortMin })}</div> : null}</div>
              <button className="x" title={t('outlook.done')} onClick={() => void s.setWishStatus(w.id, 'done')} style={{ color: 'var(--ok)', opacity: 1 }}><Check size={14} /></button>
              <button className="x" title={t('outlook.drop')} onClick={() => void s.setWishStatus(w.id, 'archived')} style={{ opacity: 1 }}><X size={13} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input placeholder={t('outlook.wishPlaceholder')} value={wish} onChange={(e) => setWish(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addWish(); }}
              style={{ flex: 1, height: 36, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--glass2)', padding: '0 12px', fontSize: 12.5, color: 'var(--ink)' }} />
            <button className="cj-btn sec" onClick={addWish}><Plus size={14} /></button>
          </div>
        </div>
      </div>
    </Page>
  );
}

