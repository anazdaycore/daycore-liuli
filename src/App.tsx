import { useMemo, useRef, useState } from 'react';
import type { Boot } from '@daycore/core';
import { addDaysIso, isoOf, toHM, toMin } from './canvas';
import { Companion } from './Companion';
import { DayCanvas } from './DayCanvas';
import { OutlookPanel, TracePanel } from './Drawers';
import { SettingsPage } from './Settings';
import { WeekLens } from './WeekLens';
import {
  Anchor, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, Layers, MessageHeart,
  Mic, Settings, Smile, Sun, X, Zap,
} from './icons';
import { useStore } from './store';
import { BUILTIN_META, BUILTIN_IDS } from './theme';

function ctxOf(t: (k: string) => string): Record<string, string> {
  return { today: t('ctx.today'), materials: t('ctx.materials'), outlook: t('ctx.outlook'), trace: t('ctx.trace'), companion: t('ctx.companion'), settings: t('ctx.settings') };
}

function phOf(t: (k: string) => string): Record<string, string> {
  return {
    today: t('input.placeholder.today'), materials: t('input.placeholder.materials'), outlook: t('input.placeholder.outlook'),
    trace: t('input.placeholder.trace'), companion: t('input.placeholder.companion'), settings: t('input.placeholder.settings'),
  };
}

function themeNames(t: (k: string) => string): Record<string, string> {
  return { sky: t('theme.sky'), sunset: t('theme.sunset'), night: t('theme.night'), nature: t('theme.nature') };
}

export function App({ boot }: { boot: Boot }) {
  const s = useStore(boot);
  const t = boot.catalog.t;
  const [menu, setMenu] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const ctx = ctxOf(t);
  const ph = phOf(t);
  const tn = themeNames(t);
  const initial = boot.session.assistantName.charAt(0);

  const seats = [
    { id: 'materials', label: t('dock.materials'), icon: <BookOpen size={20} /> },
    { id: 'trace', label: t('dock.trace'), icon: <Anchor size={20} /> },
    { id: 'today', label: t('dock.today'), icon: <Sun size={22} /> },
    { id: 'outlook', label: t('dock.outlook'), icon: <Zap size={20} /> },
    { id: 'companion', label: t('dock.companion'), icon: <MessageHeart size={20} /> },
  ] as const;

  const offToday = s.mode !== 'day' || s.date !== isoOf(new Date());
  const nb = s.view === 'today' ? s.total : 0;

  const submit = () => {
    const tx = text.trim();
    if (!tx) return;
    setText('');
    inputRef.current?.focus();
    void s.submit(tx);
  };

  const dateLabel = useMemo(() => {
    const d = new Date(s.date + 'T12:00:00');
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + ' ' + d.toLocaleDateString(undefined, { weekday: 'short' });
  }, [s.date]);

  return (
    <div className="cj-app">
      <div className="cj-orbs"></div>

      <header className="cj-top">
        {s.view === 'today' && (
          <div className="cj-nav">
            <button className="cj-navbtn" onClick={() => s.setDate(addDaysIso(s.date, s.mode === 'week' ? -7 : -1))}><ChevronLeft size={17} /></button>
            <div className="cj-title">
              <span className="d">{s.mode === 'week' ? t('top.week') : (s.isToday ? t('top.today') : dateLabel)}</span>
              <span className="w">{dateLabel}{nb ? ' · ' + nb + ' ' + t('top.count') : ''}</span>
            </div>
            <button className="cj-navbtn" onClick={() => s.setDate(addDaysIso(s.date, s.mode === 'week' ? 7 : 1))}><ChevronRight size={17} /></button>
            {offToday && <button className="cj-pill glass on" onClick={() => s.setDate(isoOf(new Date()))}><Sun size={14} />{t('top.backToday')}</button>}
          </div>
        )}
        {s.view !== 'today' && <div className="cj-title"><span className="d">{ctx[s.view]}</span></div>}
        <span className="cj-sp"></span>
        {s.view === 'today' && s.mode === 'day' && <MoodCapsule s={s} />}
        {s.view === 'today' && (
          <button className={'cj-pill glass' + (s.mode === 'week' ? ' on' : '')} onClick={() => s.setMode(s.mode === 'week' ? 'day' : 'week')}>
            <Layers size={14} />{s.mode === 'week' ? t('top.toDay') : t('top.toWeek')}
          </button>
        )}
        <span className="cj-clock glass">{toHM(s.now)}</span>
        <button className="cj-avatar" onClick={() => setMenu(!menu)}>{initial}</button>
      </header>

      {menu && (
        <>
          <div className="cj-veil" style={{ background: 'transparent', backdropFilter: 'none' }} onClick={() => setMenu(false)}></div>
          <div className="cj-menu glass">
            <div className="who"><span className="cj-avatar">{initial}</span><div><b>{boot.session.assistantName}</b><span>{t('menu.tagline')}</span></div></div>
            <div className="lab">{t('menu.theme')}</div>
            <div className="cj-mini-themes">
              {BUILTIN_IDS.map((id) => (
                <button key={id} title={tn[id]} className={s.currentTheme === id ? 'on' : ''}
                  style={{ background: 'linear-gradient(145deg,' + BUILTIN_META[id].sw[1] + ',' + BUILTIN_META[id].sw[2] + ')', '--sw': BUILTIN_META[id].sw[0] } as React.CSSProperties}
                  onClick={() => void s.setTheme(id)} />
              ))}
              {s.themes.map((th) => {
                const v = th.variables || {};
                return (
                  <button key={th.id} title={th.name} className={s.currentTheme === th.id ? 'on' : ''}
                    style={{ background: 'linear-gradient(145deg,' + (v['--bg'] || '#eee') + ',' + (v['--bg2'] || '#ddd') + ')', '--sw': v['--accent'] || '#888' } as React.CSSProperties}
                    onClick={() => void s.setTheme(th.id)} />
                );
              })}
            </div>
            <button className="mrow" style={{ marginTop: 10 }} onClick={() => { setMenu(false); s.setView('settings'); }}><span className="ic"><Settings size={15} /></span>{t('menu.settings')}</button>
          </div>
        </>
      )}

      {s.view === 'today' && (s.mode === 'day' ? <DayCanvas s={s} /> : <WeekLens s={s} />)}
      {s.view === 'materials' && <Drawer title={t('drawer.materials')} side="left" onClose={() => s.setView('today')}>{s.materials.map((m) => <div key={m.id} className="cj-item"><div className="bd"><div className="t">{m.title}</div>{m.summary ? <div className="s">{m.summary}</div> : null}</div></div>)}</Drawer>}
      {s.view === 'outlook' && <Drawer title={t('drawer.outlook')} side="right" onClose={() => s.setView('today')}><OutlookPanel s={s} /></Drawer>}
      {s.view === 'trace' && <Drawer title={t('drawer.trace')} side="top" onClose={() => s.setView('today')}><TracePanel s={s} /></Drawer>}
      {s.view === 'companion' && <Companion s={s} onClose={() => s.setView('today')} />}
      {s.view === 'settings' && <SettingsPage s={s} />}

      {s.view === 'today' && s.stack.length > 0 && (
        <div className="cj-stack">
          {s.stack.map((p) => (
            <div key={p.id} className="cj-card glass">
              <h4>{p.title}</h4>
              {p.summary ? <div className="sum">{p.summary}</div> : null}
              {p.rows && p.rows.length > 0 ? (
                <div className="cj-rows">
                  {p.rows.map((r) => (
                    <div key={r.id} className={'cj-row' + (r.state === 'accepted' ? ' acc' : '')}>
                      <span className="lb">{r.label}</span>
                      {r.state === 'pending' && (
                        <>
                          <button className="rb y" onClick={() => void s.takeRow(p, r.id)}><Check size={13} /></button>
                          <button className="rb n" onClick={() => void s.answer(p, false)}><X size={12} /></button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cj-actions">
                  <button className="cj-btn pri" onClick={() => void s.answer(p, true)}><Check size={14} />{t('ghost.accept')}</button>
                  <button className="cj-btn sec" onClick={() => void s.answer(p, false)}>{t('ghost.reject')}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {s.draft && <div className="cj-veil" onClick={() => s.setDraft(null)}></div>}
      {s.draft && (
        <div className="cj-pop glass" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 340, zIndex: 70 } as React.CSSProperties}>
          <button className="close" onClick={() => s.setDraft(null)}><X size={15} /></button>
          <h4>{t('draft.title')}</h4>
          <div className="cj-rows">
            {s.draft.blocks.map((b, i) => (
              <div key={i} className="cj-row"><span className="lb">{b.time ? toHM(toMin(b.time)) + ' · ' : ''}{b.title}</span></div>
            ))}
          </div>
          <div className="grp" style={{ justifyContent: 'flex-end' }}>
            <button className="cj-btn sec" onClick={() => s.setDraft(null)}>{t('draft.discard')}</button>
            <button className="cj-btn pri" disabled={s.busy} onClick={() => void s.confirmDraft()}><Check size={14} />{t('draft.confirm')}</button>
          </div>
        </div>
      )}

      {s.toasts.length > 0 && (
        <div className="cj-toasts">
          {s.toasts.map((to) => (
            <div key={to.id} className="cj-toast glass">
              <span className="ic"><Check size={14} /></span>
              <div className="bd">
                <div className="lb">{to.label}</div>
                {to.sub && <div className="sb">{to.sub}</div>}
                {(to.opId || to.action) && (
                  <div className="acts">
                    {to.opId && <button onClick={() => { void s.takeBack(to.opId as string); s.dismiss(to.id); }}>{t('undo.take')}</button>}
                    {to.action && <button onClick={() => { to.action?.run(); s.dismiss(to.id); }}>{to.action.label}</button>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {s.error && <div className="cj-toasts" style={{ bottom: 8 }}><div className="cj-toast glass"><span className="ic" style={{ color: 'var(--warm)' }}><X size={14} /></span><div className="bd"><div className="lb">{s.error}</div></div></div></div>}

      {s.view !== 'companion' && (
      <footer className="cj-bottom">
        <div className="cj-inputbar glass">
          <span className="ctx">{ctx[s.view]}</span>
          <input ref={inputRef} placeholder={ph[s.view]} value={text}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          <button className="mic" title={t('input.mic')}><Mic size={16} /></button>
          <button className="send" disabled={!text.trim() || s.busy} onClick={submit}><ArrowUp size={16} /></button>
        </div>
        <nav className="cj-dock glass">
          <div className="cj-rail-logo"><span className="dot"></span>{t('menu.brand')}</div>
          {seats.map((seat) => {
            if (seat.id === 'today') {
              return <button key={seat.id} className={'cj-seat home' + (s.view === 'today' && !offToday ? '' : ' off')} onClick={() => { s.setView('today'); s.setDate(isoOf(new Date())); s.setMode('day'); }}>{seat.icon}{seat.label}</button>;
            }
            return <button key={seat.id} className={'cj-seat' + (s.view === seat.id ? ' on' : '')} onClick={() => s.setView(s.view === seat.id ? 'today' : seat.id)}>{seat.icon}{seat.label}</button>;
          })}
          <button className="cj-rail-user" onClick={() => setMenu(!menu)}>
            <span className="cj-avatar" style={{ width: 32, height: 32, fontSize: 12, flex: 'none' }}>{initial}</span>
            <span className="meta"><span className="name">{boot.session.assistantName}</span><span className="sub">{t('menu.settings')}</span></span>
            <Settings size={15} style={{ color: 'var(--ink3)', flex: 'none' }} />
          </button>
        </nav>
      </footer>
      )}
    </div>
  );
}

function MoodCapsule({ s }: { s: ReturnType<typeof useStore> }) {
  const t = s.t;
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const todayKindId = s.moodToday ? s.moodToday.mood : null;
  const kind = todayKindId ? s.moodKinds.find((k) => k.id === todayKindId) : null;
  const save = () => {
    if (!sel) return;
    const k = s.moodKinds.find((x) => x.id === sel);
    void s.recordMood(sel, note.trim() || undefined);
    s.push({ label: t('mood.saved', { name: k ? k.name : '' }) });
    setSel(null); setNote(''); setOpen(false);
  };
  return (
    <div className="cj-mood">
      <button className="cj-moodcap glass" onClick={() => setOpen(!open)}>
        {kind ? <><span className="e">{kind.emoji}</span>{kind.name}</> : <><Smile size={16} />{t('mood.title')}</>}
      </button>
      {open && (
        <div className="cj-moodpick glass">
          <h4>{kind ? t('mood.picker.qAgain') : t('mood.picker.q')}</h4>
          <div className="cj-moodgrid">
            {s.moodKinds.map((k) => (
              <button key={k.id} className={sel === k.id ? 'on' : ''} onClick={() => setSel(k.id)}>
                <span className="e">{k.emoji}</span>{k.name}
              </button>
            ))}
          </div>
          <input placeholder={t('mood.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
          <div className="row">
            <button className="cj-btn ghost" onClick={() => setOpen(false)}>{t('mood.cancel')}</button>
            <button className="cj-btn pri" disabled={!sel} onClick={save}>{t('mood.save')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Drawer({ title, side, onClose, children }: { title: string; side: 'left' | 'right' | 'top' | 'bottom'; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="cj-veil" onClick={onClose}></div>
      <div className={'cj-drawer glass ' + side}>
        <div className="cj-dhead"><h3><span className="ic"></span>{title}</h3><button className="close" onClick={onClose}><X size={16} /></button></div>
        <div className="cj-dbody">{children}</div>
      </div>
    </>
  );
}


