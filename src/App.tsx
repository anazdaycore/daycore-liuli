import { useEffect, useMemo, useRef, useState } from 'react';
import type { Boot } from '@daycore/core';
import { addDaysIso, isoOf, toHM, toMin } from './canvas';
import { AuthCard } from './Auth';
import { CompanionPage } from './Companion';
import { DayCanvas } from './DayCanvas';
import { MaterialsPage, OutlookPage, TracePage } from './Drawers';
import { SettingsPage } from './Settings';
import { WeekLens } from './WeekLens';
import {
  Anchor, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, Layers, Link, MessageHeart,
  Mic, Settings, Smile, Sun, X, Zap,
} from './icons';
import { useStore } from './store';
import { BUILTIN_META, BUILTIN_IDS } from './theme';

function ctxOf(t: (k: string) => string): Record<string, string> {
  return { today: t('ctx.today'), materials: t('ctx.materials'), outlook: t('ctx.outlook'), trace: t('ctx.trace'), companion: t('ctx.companion'), settings: t('ctx.settings') };
}

function phOf(t: (k: string, vars?: Record<string, string | number>) => string, name: string): Record<string, string> {
  return {
    today: t('input.placeholder.today'), materials: t('input.placeholder.materials'), outlook: t('input.placeholder.outlook'),
    trace: t('input.placeholder.trace'), companion: t('input.placeholder.companion', { name }), settings: t('input.placeholder.settings'),
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
  const [pushOpen, setPushOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const ctx = ctxOf(t);
  const ph = phOf(t, boot.session.assistantName);
  const SpeechRecognition = typeof window !== 'undefined' ? ((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition) : null;
  const hasSpeech = !!SpeechRecognition;
  const startVoice = () => {
    if (!SpeechRecognition) return;
    const rec = new (SpeechRecognition as new () => { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onend: () => void; onerror: () => void; start: () => void })();
    rec.lang = document.documentElement.lang || 'zh-CN';
    rec.interimResults = false;
    rec.onresult = (e) => { setText((prev) => (prev ? prev + ' ' : '') + e.results[0][0].transcript); setListening(false); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };
  const onAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    void s.addMaterial(f.name, t('materials.uploadedBody', { kb: Math.round(f.size / 1024) }));
  };
  const tn = themeNames(t);
  // ⚠️ 头像与菜单 who 是「用户」不是助手：已登录取用户姓名首字，匿名用「我」——
  //  wire 上没有匿名的用户名字段，把 assistantName 摆进 who 区会让人以为账户是助手的。
  const initial = (s.user && !s.user.isAnonymous ? (s.user.name || s.user.email || '') : t('trace.me')).charAt(0);

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
    if (s.view === 'companion') void s.sendCompanion(tx);
    else void s.submit(tx);
  };

  // 键盘：today 视图 ←/→ 翻日；Esc 关菜单/认证卡/推送卡/草稿（DayCanvas 的 pop 已自行监听 Esc）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false); setPushOpen(false); setAuthOpen(false); s.setDraft(null);
        return;
      }
      if (s.view !== 'today') return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.key === 'ArrowLeft') s.setDate(addDaysIso(s.date, -1));
      else if (e.key === 'ArrowRight') s.setDate(addDaysIso(s.date, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.date, s.view, s.setDate, s.setDraft]);

  // ⚠️ 用目录 locale（boot 已写进 html lang）而不是浏览器语言，否则中文界面顶栏显示英文日期。
  const dateLabel = useMemo(() => {
    const d = new Date(s.date + 'T12:00:00');
    const lang = document.documentElement.lang || undefined;
    return d.toLocaleDateString(lang, { month: 'long', day: 'numeric' }) + ' ' + d.toLocaleDateString(lang, { weekday: 'short' });
  }, [s.date]);

  return (
    <div className="cj-app">
      <div className="cj-orbs"></div>

      <header className="cj-top">
        {s.view === 'today' && s.proposals.filter((p) => p.state === 'pending').length > 0 && (
          <div style={{ position: 'relative' }}>
            <button className="cj-push glass" onClick={() => setPushOpen(!pushOpen)}>
              <span className="dot" />
              <span className="t">{t('push.label', { n: s.proposals.filter((p) => p.state === 'pending').length })}</span>
            </button>
            {pushOpen && (
              <div className="cj-push-card glass" style={{ width: 340 }}>
                {s.proposals.filter((p) => p.state === 'pending').map((p) => (
                  <div key={p.id} style={{ marginBottom: 14 }}>
                    <h4>{p.title}</h4>
                    {p.summary ? <p>{p.summary}</p> : null}
                    {p.rows && p.rows.length > 0 ? (
                      <div className="cj-rows">{p.rows.map((r) => <button key={r.id} className="cj-btn sec" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { void s.takeRow(p, r.id); setPushOpen(false); }}>{r.label}</button>)}</div>
                    ) : (
                      <div className="row">
                        <button className="cj-btn pri" onClick={() => { void s.answer(p, true); setPushOpen(false); }}>{t('ghost.accept')}</button>
                        <button className="cj-btn sec" onClick={() => { void s.answer(p, false); setPushOpen(false); }}>{t('ghost.reject')}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {s.view === 'today' && (
          <div className="cj-nav">
            <button className="cj-navbtn" onClick={() => s.setDate(addDaysIso(s.date, s.mode === 'week' ? -7 : -1))}><ChevronLeft size={17} /></button>
            <div className={'cj-title' + (s.mode === 'week' ? ' wk' : '')}>
              <span className="d">{s.mode === 'week' ? t('top.week') : (s.isToday ? t('top.today') : dateLabel)}</span>
              <span className="w">{s.mode === 'week' ? t('top.weekHint') : dateLabel + (nb ? ' · ' + nb + ' ' + t('top.count') : '')}</span>
            </div>
            <button className="cj-navbtn" onClick={() => s.setDate(addDaysIso(s.date, s.mode === 'week' ? 7 : 1))}><ChevronRight size={17} /></button>
            {offToday && <button className="cj-pill glass on" onClick={() => s.setDate(isoOf(new Date()))}><Sun size={14} />{t('top.backToday')}</button>}
          </div>
        )}
        {s.view !== 'today' && <div className="cj-title"><span className="d">{ctx[s.view]}</span><span className="w">{t('top.today')} · {dateLabel}</span></div>}
        <span className="cj-sp"></span>
        {s.view === 'today' && s.mode === 'day' && <MoodCapsule s={s} />}
        <span className="cj-clock glass" title={t('top.clockTitle')}>{toHM(s.now)}</span>
        {s.view === 'today' && (
          <button className={'cj-pill glass' + (s.mode === 'week' ? ' on' : '')} onClick={() => s.setMode(s.mode === 'week' ? 'day' : 'week')}>
            <Layers size={14} />{s.mode === 'week' ? t('top.toDay') : t('top.toWeek')}
          </button>
        )}
        <button className="cj-avatar" onClick={() => setMenu(!menu)}>{initial}</button>
      </header>

      {menu && (
        <>
          <div className="cj-veil" style={{ background: 'transparent', backdropFilter: 'none' }} onClick={() => setMenu(false)}></div>
          <div className="cj-menu glass">
            <div className="who">
              <span className="cj-avatar">{s.user && !s.user.isAnonymous ? (s.user.name || s.user.email || '').charAt(0) : initial}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{s.user && !s.user.isAnonymous ? (s.user.name || s.user.email) : t('auth.anonymous')}</b>
                <span>{s.user && !s.user.isAnonymous ? (s.user.email ? s.user.email + ' · ' + t('auth.synced') : t('auth.synced')) : t('auth.anonymousSub')}</span>
              </div>
              {s.user && !s.user.isAnonymous ? (
                <button className="cj-btn ghost" style={{ height: 28, flex: 'none' }} onClick={() => { void s.doLogout(); setMenu(false); s.push({ label: t('auth.signedOut') }); }}>{t('auth.logout')}</button>
              ) : (
                <button className="cj-btn pri" style={{ height: 28, flex: 'none' }} onClick={() => { setMenu(false); setAuthOpen(true); }}>{t('auth.signin')}</button>
              )}
            </div>
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
      {s.view === 'materials' && <MaterialsPage s={s} />}
      {s.view === 'outlook' && <OutlookPage s={s} />}
      {s.view === 'trace' && <TracePage s={s} />}
      {s.view === 'companion' && <CompanionPage s={s} />}
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

      {authOpen && <AuthCard s={s} onClose={() => setAuthOpen(false)} />}
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

      <footer className="cj-bottom">
        <div className="cj-inputbar glass">
          <span className="ctx">{ctx[s.view]}</span>
          <input ref={inputRef} placeholder={ph[s.view]} value={text}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          <button className="mic" title={t('input.attach')} onClick={() => fileRef.current?.click()}><Link size={15} /></button>
          {hasSpeech && <button className={'mic' + (listening ? ' on' : '')} title={t('input.mic')} onClick={startVoice}><Mic size={16} /></button>}
          <button className="send" disabled={!text.trim() || s.busy} onClick={submit}><ArrowUp size={16} /></button>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onAttach} />
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
            <span className="meta"><span className="name">{s.user && !s.user.isAnonymous ? (s.user.name || s.user.email) : t('auth.anonymous')}</span><span className="sub">{t('menu.settings')}</span></span>
            <Settings size={15} style={{ color: 'var(--ink3)', flex: 'none' }} />
          </button>
        </nav>
      </footer>
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



