import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimeBlock } from '@daycore/core';
import {
  boxOf, canvasHeight, DAY0, DAY1, DEFAULT_DUR, PXM_BASE, phaseOf, snap5, toHM, toMin, wellAt, yOf,
  type Well,
} from './canvas';
import { Anchor, BookOpen, Check, ChevronRight, Clock, Repeat, Sparkles, Trash, X } from './icons';
import type { useStore } from './store';

type S = ReturnType<typeof useStore>;

const TYPE_VAR: Record<TimeBlock['type'], string> = {
  task: 'var(--c-task)', appointment: 'var(--c-appointment)', relax: 'var(--c-relax)', meal: 'var(--c-meal)', break: 'var(--c-break)',
};

const WELL_META: { well: Well; cls: string }[] = [
  { well: 'keep', cls: 'tl' },
  { well: 'tomorrow', cls: 'tr' },
  { well: 'someday', cls: 'bl' },
  { well: 'replan', cls: 'br' },
];

function wellIcon(well: Well): React.ReactNode {
  if (well === 'keep') return <BookOpen size={17} />;
  if (well === 'tomorrow') return <ChevronRight size={17} />;
  if (well === 'someday') return <Anchor size={17} />;
  return <Sparkles size={17} />;
}

function wellNode(t: S['t'], well: Well): React.ReactNode {
  if (well === 'keep') return <span>{t('well.keep')}</span>;
  if (well === 'tomorrow') return <span>{t('well.tomorrow')}</span>;
  if (well === 'someday') return <span>{t('well.somedayWish')}<br />{t('well.someday')}</span>;
  return <span>{t('well.replanA')}<br />{t('well.replanB')}</span>;
}

function tagsOf(b: TimeBlock, phase: string, t: S['t']): string[] {
  const tags: string[] = [b.origin === 'auto' ? t('tag.auto') : t('tag.manual')];
  if (b.lock_level === 'hard') tags.push(t('tag.hard'));
  else if (b.lock_level === 'soft') tags.push(t('tag.soft'));
  if (phase === 'recon' && !b.completed) tags.push(t('tag.review'));
  else if (b.note) tags.push(t('tag.note'));
  return tags.slice(0, 3);
}

export function DayCanvas({ s }: { s: S }) {
  const t = s.t;
  const wrap = useRef<HTMLDivElement | null>(null);
  const wellsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [drag, setDrag] = useState<{ id: string; dy: number; hot: Well | null } | null>(null);
  const [pop, setPop] = useState<{ kind: 'block' | 'ghost'; id: string; x: number; y: number } | null>(null);
  const dragRef = useRef<{
    id: string; y0: number; x0: number; moved: boolean; stone: boolean; hard: boolean; opened: boolean; warned: boolean; lp: number | null;
  } | null>(null);

  useEffect(() => {
    if (!wrap.current) return;
    const target = s.isToday ? yOf(Math.max(DAY0, s.now)) - wrap.current.clientHeight * 0.38 : yOf(8 * 60) - 60;
    wrap.current.scrollTop = Math.max(0, target);
  }, [s.date, s.isToday, s.now]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPop(null); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const hotWell = useCallback((x: number, y: number, touch: boolean): Well | null => {
    const tl = wellsRef.current.tl?.getBoundingClientRect();
    const tr = wellsRef.current.tr?.getBoundingClientRect();
    const br = wellsRef.current.br?.getBoundingClientRect();
    if (!tl || !tr || !br) return null;
    // 井格 = 四井外角构成的矩形；wellAt 的四角恰好对应 4 个井（触屏 -10 / 桌面 +18）。
    return wellAt(x - tl.left, y - tl.top, tr.right - tl.left, br.bottom - tl.top, touch);
  }, []);

  const onDown = (b: TimeBlock) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const ph = phaseOf(b, s.date);
    const hard = b.lock_level === 'hard';
    const stone = ph === 'stone';
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    const d = { id: b.id, y0: e.clientY, x0: e.clientX, moved: false, stone, hard, opened: false, warned: false, lp: null as number | null };
    dragRef.current = d;
    d.lp = window.setTimeout(() => {
      const cur = dragRef.current;
      if (!cur || cur.moved || cur.id !== b.id) return;
      cur.opened = true;
      if (navigator.vibrate) navigator.vibrate(12);
      setDrag(null);
      setPop({ kind: 'block', id: b.id, x: e.clientX + 14, y: e.clientY - 40 });
    }, 460);
    const move = (ev: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur || cur.id !== b.id) return;
      const dy = ev.clientY - cur.y0;
      const dx = ev.clientX - cur.x0;
      if (!cur.moved && Math.abs(dy) < 5 && Math.abs(dx) < 5) return;
      if (cur.lp) { clearTimeout(cur.lp); cur.lp = null; }
      if (cur.opened) return;
      if (cur.hard) {
        if (!cur.warned && Math.abs(dy) > 10) {
          cur.warned = true;
          const el = document.getElementById('cj-blk-' + b.id);
          if (el) { el.classList.remove('tug'); void el.offsetWidth; el.classList.add('tug'); setTimeout(() => el.classList.remove('tug'), 460); }
          if (navigator.vibrate) navigator.vibrate(12);
          s.push({ label: t('drag.hard', { reason: b.lock_reason || t('drag.hard.reason') }), sub: t('drag.hard.sub') });
        }
        setDrag({ id: cur.id, dy: Math.max(-7, Math.min(7, dy)), hot: null });
        return;
      }
      if (cur.stone) {
        if (!cur.warned && Math.abs(dy) > 14) { cur.warned = true; s.push({ label: t('drag.stone'), sub: t('drag.stone.sub') }); }
        return;
      }
      cur.moved = true;
      setDrag({ id: cur.id, dy, hot: hotWell(ev.clientX, ev.clientY, ev.pointerType === 'touch') });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const cur = dragRef.current;
      dragRef.current = null;
      if (!cur) return;
      if (cur.lp) clearTimeout(cur.lp);
      setDrag(null);
      if (cur.opened || cur.hard || cur.stone) return;
      if (!cur.moved) { setPop({ kind: 'block', id: b.id, x: ev.clientX + 14, y: ev.clientY - 40 }); return; }
      const well = hotWell(ev.clientX, ev.clientY, ev.pointerType === 'touch');
      if (well) { void s.dropInWell(well, b); return; }
      const dy = ev.clientY - cur.y0;
      const newMin = snap5(toMin(b.time || '09:00') + Math.round(dy / PXM_BASE));
      void s.moveTime(b, newMin);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const hours: number[] = [];
  for (let m = DAY0; m <= DAY1; m += 60) hours.push(m);

  const pieces = s.pieces;
  return (
    <div className="cj-stage">
      <div className="cj-scroll" ref={wrap}>
        <div className="cj-day">
          <div className="cj-col" style={{ height: canvasHeight() }}>
          {hours.map((m) => (
            <div key={m} className="cj-hour" style={{ top: yOf(m) }}>
              <span className="hl">{toHM(m)}</span>
              <i className="ln" />
            </div>
          ))}
          {/* ⚠️ 钳位渲染：now < DAY0 时把 now 丸钳在轴顶，夜里也能看见（对照原型） */}
          {s.isToday && (
            <div className="cj-now" style={{ top: Math.max(0, Math.min(canvasHeight(), yOf(s.now))) }}>
              <span className="chip">{toHM(s.now)}</span>
              <i className="ln" />
            </div>
          )}
          {pieces.map((p) => {
            const box = boxOf(p);
            if (p.kind === 'ghost') {
              return (
                <div key={'g:' + p.id} className="cj-ghost"
                  style={{ top: box.top, height: box.height, left: box.left, right: 6, zIndex: 14 + p.lane, '--bc': 'var(--accent)' } as React.CSSProperties}
                  onClick={() => setPop({ kind: 'ghost', id: p.id, x: 0, y: 0 })}>
                  <span className="q">{t('ghost.eyebrow')}</span>
                  {!box.compact && <div className="tm">{toHM(p.s)} · {t('block.minutes', { n: p.e - p.s })}</div>}
                  <div className="tt">{p.title}</div>
                </div>
              );
            }
            const b = p.block as TimeBlock;
            const ph = phaseOf(b, s.date);
            const isDragging = drag && drag.id === b.id;
            const cls = 'cj-blk' + (box.stacked ? ' stacked' : '') + (box.compact ? ' compact' : '') + (b.completed ? ' done' : '') + (b.origin === 'auto' ? ' auto' : '') + (ph === 'stone' ? ' stone' : '') + (ph === 'recon' ? ' recon' : '') + (b.lock_level === 'hard' ? ' lk-hard' : b.lock_level === 'soft' ? ' lk-soft' : '') + (isDragging ? ' dragging' : '');
            const style: React.CSSProperties = { top: box.top, height: box.height, left: box.left, right: 6, '--lane': p.lane, '--bc': TYPE_VAR[b.type] || 'var(--accent)', ...(drag && drag.id === b.id ? { transform: `translateY(${drag.dy}px)` } : {}) } as React.CSSProperties;
            return (
              <div key={'b:' + p.id} id={'cj-blk-' + b.id} className={cls} style={style}
                onPointerDown={onDown(b)}
                onContextMenu={(ev) => { ev.preventDefault(); setPop({ kind: 'block', id: b.id, x: ev.clientX, y: ev.clientY }); }}>
                {(b.lock_level === 'hard' || b.lock_level === 'soft') && <span className={'cj-lock' + (b.lock_level === 'soft' ? ' soft' : '')} />}
                {!box.compact && <div className="tm">{toHM(p.s)}–{toHM(p.s + (b.duration_min ?? DEFAULT_DUR))}</div>}
                <div className="tt">{b.title}</div>
                {ph !== 'stone' && (
                  <button className={'cj-tick' + (b.completed ? ' on' : '')}
                    aria-label={t('block.done')}
                    onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); }}
                    onClick={(ev) => { ev.stopPropagation(); void s.toggleDone(b); }}>
                    {b.completed ? <Check size={14} strokeWidth={3} /> : null}
                  </button>
                )}
                {!box.compact && (() => { const tg = tagsOf(b, ph, t); return tg.length ? <div className="cj-tags">{tg.map((x, i) => <span key={i} className="cj-tg">{x}</span>)}</div> : null; })()}
                {ph === 'stone' && <span className="rec">{t('block.record')}</span>}
              </div>
            );
          })}
          {pieces.length === 0 && (
            <div className="cj-empty">
              <b>{t('canvas.empty')}</b>
              <span>{t('canvas.emptyBody')}</span>
            </div>
          )}
          </div>
        </div>
      </div>
      <div className={'cj-wells' + (drag ? ' live' : '')}>
        {WELL_META.map(({ well, cls }) => (
          <div key={well} ref={(el) => { wellsRef.current[cls] = el; }} className={'cj-well ' + cls + (drag && drag.hot === well ? ' hot' : '')}>
            <span className="halo">{wellIcon(well)}</span>
            {wellNode(t, well)}
          </div>
        ))}
      </div>
      {drag && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20, pointerEvents: 'none' }} />
      )}
      {pop && (pop.kind === 'ghost' ? <GhostPop id={pop.id} s={s} onClose={() => setPop(null)} /> : <BlockPop id={pop.id} x={pop.x} y={pop.y} s={s} onClose={() => setPop(null)} />)}
    </div>
  );
}

function GhostPop({ id, s, onClose }: { id: string; s: S; onClose: () => void }) {
  const t = s.t;
  const p = s.proposals.find((q) => q.id === id);
  if (!p || p.state !== 'pending') return null;
  const style: React.CSSProperties = { left: 20, right: 20, top: '50%', transform: 'translateY(-50%)', width: 'auto', maxWidth: 360, margin: '0 auto' };
  return (
    <div className="cj-pop glass" style={style}>
      <button className="close" onClick={onClose}><X size={15} /></button>
      <h4>{p.title}</h4>
      <div className="meta"><span className="org auto">{t('ghost.eyebrow')}</span>{p.start ? p.start + ' · ' + t('block.minutes', { n: p.dur ?? DEFAULT_DUR }) : ''}</div>
      {p.reason && <div className="stoneline">{p.reason}</div>}
      <div className="grp">
        <button className="cj-btn pri" onClick={() => { void s.answer(p, true); onClose(); }}><Check size={14} />{t('ghost.accept')}</button>
        <button className="cj-btn sec" onClick={() => { void s.answer(p, false); onClose(); }}>{t('ghost.reject')}</button>
      </div>
    </div>
  );
}

export function BlockPop({ id, x, y, s, onClose }: { id: string; x: number; y: number; s: S; onClose: () => void }) {
  const t = s.t;
  const b = s.plan?.blocks?.find((q) => q.id === id);
  const [note, setNote] = useState('');
  const [confirmTomorrow, setConfirmTomorrow] = useState(false);
  useEffect(() => { if (b) setNote(b.note || ''); setConfirmTomorrow(false); }, [id]);
  if (!b) return null;
  const ph = phaseOf(b, s.date);
  const style: React.CSSProperties = { left: Math.max(10, Math.min(x, window.innerWidth - 316)), top: Math.max(10, Math.min(y, window.innerHeight - 360)) };
  return (
    <div className="cj-pop glass" style={style}>
      <button className="close" onClick={onClose}><X size={15} /></button>
      <h4>{b.title}</h4>
      <div className="meta">
        <span className={'org ' + (b.origin === 'manual' ? 'manual' : 'auto')}>{b.origin === 'manual' ? t('tag.manual') : b.origin === 'auto' ? t('tag.auto') : t('tag.rule')}</span>
        {b.time && <span>{b.time}{b.duration_min ? '–' + toHM(toMin(b.time) + b.duration_min) : ''}</span>}
        {ph === 'stone' && <span className="org">{t('block.record')}</span>}
        {b.completed && <span><Check size={12} />{t('block.completed')}</span>}
      </div>
      {(ph === 'future' || ph === 'now') && (
        <div className="grp">
          {b.lock_level === 'hard' && (
            <div className="stoneline"><span className="cj-lock sm" />{b.lock_reason || t('block.locked')}——{t('pop.hard.sub')}</div>
          )}
          <button className="cj-btn pri" onClick={() => { void s.setCompleted(b, !b.completed); onClose(); }}><Check size={14} />{t('pop.done')}</button>
          {b.lock_level && <button className="cj-btn sec" onClick={() => { void s.markConflict(b.id); onClose(); }}>{t('pop.conflict')}</button>}
          {b.lock_level !== 'hard' && (
            <button className="cj-btn sec" onClick={() => {
              if (b.lock_level === 'soft' && !confirmTomorrow) { setConfirmTomorrow(true); setTimeout(() => setConfirmTomorrow(false), 2600); return; }
              setConfirmTomorrow(false);
              void s.moveToTomorrow(b); onClose();
            }}>{b.lock_level === 'soft' && confirmTomorrow ? t('pop.tomorrowConfirm') : t('pop.tomorrow')}</button>
          )}
          {b.lock_level !== 'hard' && <button className="cj-btn sec" onClick={() => { void s.moveTime(b, Math.min(23 * 60 - 30, toMin(b.time || '09:00') + 30)); onClose(); }}>+30</button>}
          <button className="cj-btn ghost" onClick={() => { void s.removeBlock(b); onClose(); }}><Trash size={13} />{t('pop.remove')}</button>
        </div>
      )}
      {ph !== 'stone' && (
        <div className="cj-marks">
          <button className={'cj-mk' + (b.completed ? ' on' : '')} onClick={() => { void s.setCompleted(b, !b.completed); onClose(); }}>{t('pop.done')}</button>
          <button className="cj-mk" onClick={() => { void s.removeBlock(b); onClose(); }}>{t('pop.miss')}</button>
        </div>
      )}
      {ph === 'recon' && b.completed === false && (
        <div className="cj-lapse">
          <div className="q"><Sparkles size={12} />{t('pop.lapse.q')}</div>
          <div className="grp">
            <button className="cj-btn sec" onClick={() => { void s.toWish(b); onClose(); }}>{t('pop.lapse.wish')}</button>
            <button className="cj-btn sec" onClick={() => { void s.moveToTomorrow(b); onClose(); }}>{t('pop.lapse.tomorrow')}</button>
            <button className="cj-btn ghost" onClick={() => { void s.setCompleted(b, false); onClose(); }}>{t('pop.lapse.miss')}</button>
          </div>
        </div>
      )}
      {ph === 'stone' && (
        <div className="grp">
          <div className="stoneline"><Clock size={13} />{t('pop.stone.sub')}</div>
          <button className="cj-btn sec" onClick={() => { void s.refish(b.id); onClose(); }}><Repeat size={13} />{t('pop.refish')}</button>
        </div>
      )}
      <input className="note" placeholder={t('pop.note')} value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => { if (note !== (b.note || '')) void s.setNote(b, note); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </div>
  );
}

