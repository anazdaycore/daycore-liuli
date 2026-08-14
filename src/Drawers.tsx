import { useState } from 'react';
import type { Assignment, OperationLog } from '@daycore/core';
import { addDaysIso, isoOf, toHM } from './canvas';
import { Check, Plus, X } from './icons';
import type { useStore } from './store';

type S = ReturnType<typeof useStore>;

function actorLabel(actor: string | undefined, t: (k: string) => string): string {
  if (actor === 'agent') return t('trace.agent');
  if (actor === 'system') return t('trace.system');
  return t('trace.me');
}

function groupByDay(ops: OperationLog[]): { date: string; rows: OperationLog[] }[] {
  const map = new Map<string, OperationLog[]>();
  for (const op of ops) {
    const d = op.date || (op.createdAt || '').slice(0, 10);
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

function dueInfo(dueAt: string | undefined, t: (k: string, v?: Record<string, string | number>) => string): { label: string; urgency: number } {
  if (!dueAt) return { label: '', urgency: 0 };
  const due = dueAt.slice(0, 10);
  const today = isoOf(new Date());
  const days = Math.round((new Date(due + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);
  if (days < 0) return { label: t('outlook.overdue'), urgency: 2 };
  if (days === 0) return { label: t('outlook.dueToday'), urgency: 2 };
  if (days === 1) return { label: t('outlook.dueTomorrow'), urgency: 2 };
  if (days <= 3) return { label: t('outlook.dueIn', { n: days }), urgency: 1 };
  return { label: t('outlook.dueIn', { n: days }), urgency: 0 };
}

export function TracePanel({ s }: { s: S }) {
  const t = s.t;
  const days = groupByDay(s.ops);
  return (
    <div className="cj-grid2">
      <div>
        <div className="cj-sec">{t('trace.ledger')}<span className="n">{s.ops.length}</span></div>
        {days.length === 0 && <div className="cj-item"><div className="bd"><div className="s">{t('trace.empty')}</div></div></div>}
        {days.map(({ date, rows }) => (
          <div key={date}>
            <div className="cj-sec" style={{ letterSpacing: 0, fontWeight: 650 }}>{relDay(date, t)}</div>
            {rows.map((op) => (
              <div key={op.id} className="cj-op">
                <span className="tm">{fmtHM(op.createdAt)}</span>
                <div className="bd"><div className="lb">{op.summary || op.action}</div></div>
                <span className={'who' + (op.actor === 'agent' ? '' : ' me')}>{actorLabel(op.actor, t)}</span>
                <button className="un" onClick={() => void s.takeBack(op.id)}>{t('undo.take')}</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OutlookPanel({ s }: { s: S }) {
  const t = s.t;
  const [wish, setWish] = useState('');
  const addWish = () => { const tx = wish.trim(); if (!tx) return; void s.addWish(tx); setWish(''); s.push({ label: t('outlook.wishAdded') }); };
  const active = s.wishes.filter((w) => w.status === 'active');
  return (
    <div className="cj-grid2">
      <div>
        <div className="cj-sec">{t('outlook.due')}<span className="n">{s.assignments.length}</span></div>
        <div className="cj-radar">
          {s.assignments.map((a: Assignment) => {
            const info = dueInfo(a.dueAt, t);
            const course = s.courses.find((c) => c.id === a.courseId);
            return (
              <div key={a.id} className="cj-ritem" data-u={info.urgency}>
                <span className="u" data-u={info.urgency}></span>
                <div className="bd"><div className="t">{a.title}</div>{course ? <div className="c">{course.name}</div> : null}</div>
                <span className="dl">{info.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="cj-sec">{t('outlook.wishes')}<span className="n">{active.length}</span></div>
        {active.map((w) => (
          <div key={w.id} className="cj-item">
            <div className="bd"><div className="t">{w.title}</div>{w.effortMin ? <div className="s">{t('outlook.effort', { n: w.effortMin })}</div> : null}</div>
            {/* ⚠️ 达成/放下是主操作，常驻可见（.cj-item .x 默认 hover 才显，移动端无 hover） */}
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
  );
}

