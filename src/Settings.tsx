import { useState } from 'react';
import * as api from '@daycore/core';
import type { CustomTheme } from '@daycore/core';
import {
  Bell, Check, Circle, Copy, Dumbbell, EyeOff, GraduationCap, Globe, Heart, Key, Moon,
  MoreHorizontal, NotebookPen, Palette, Plane, Plus, RefreshCw, Send, Settings, Sparkles,
  Sun, Trash, Utensils, Wallet, Wand, Zap, MessageCircle,
  type IconProps,
} from './icons';
import type { useStore } from './store';
import { BUILTIN_META, BUILTIN_IDS } from './theme';

type S = ReturnType<typeof useStore>;

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return <button className={'cj-switch' + (on ? ' on' : '')} role="switch" aria-checked={on} onClick={onToggle}></button>;
}

function Row({ icon, t, s, children, onClick }: { icon: React.ReactNode; t: string; s?: string; children?: React.ReactNode; onClick?: () => void }) {
  return (
    <div className="cj-set-row glass" style={onClick ? { cursor: 'pointer' } : undefined} onClick={onClick}>
      <span className="ic">{icon}</span>
      <div className="bd"><div className="t">{t}</div>{s ? <div className="s">{s}</div> : null}</div>
      {children}
    </div>
  );
}

function Group({ lab, sub, children }: { lab: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="cj-set-group">
      <div className="cj-set-lab">{lab}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink3)', margin: '-4px 0 10px' }}>{sub}</div>}
      {children}
    </div>
  );
}

function ThemeStudio({ s }: { s: S }) {
  const t = s.t;
  const [aiDesc, setAiDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<{ name: string; dark: boolean; variables: Record<string, string> } | null>(null);
  const [menu, setMenu] = useState<{ th: CustomTheme; confirm: boolean } | null>(null);

  const applyCandidate = (cand: { dark: boolean; variables: Record<string, string> }) => {
    const root = document.documentElement;
    root.removeAttribute('style');
    root.setAttribute('data-theme', cand.dark ? 'night' : 'sky');
    for (const [k, v] of Object.entries(cand.variables)) root.style.setProperty(k, v);
  };

  const generate = async () => {
    const desc = aiDesc.trim();
    if (!desc) return;
    setBusy(true);
    setErr('');
    try {
      const res = await api.generateTheme(desc);
      if (res.error) { setErr(t('settings.theme.aiError')); return; }
      const variables = res.variables || {};
      const name = (res.name as string) || t('theme.sky');
      const dark = !!(res as { dark?: boolean }).dark;
      setPreview({ name, dark, variables });
      applyCandidate({ dark, variables });
    } catch {
      setErr(t('settings.theme.aiError'));
    } finally {
      setBusy(false);
    }
  };

  const cancelPreview = () => { setPreview(null); void s.setTheme(s.currentTheme); };
  const savePreview = async () => {
    if (!preview) return;
    const th = await api.saveTheme({ name: preview.name, dark: preview.dark, variables: preview.variables });
    setPreview(null);
    setAiDesc('');
    await s.refresh();
    void s.setTheme(th.id);
    s.push({ label: t('settings.theme.saved', { name: th.name }), sub: t('settings.theme.savedSub') });
  };

  const swOf = (th: CustomTheme) => {
    const v = th.variables || {};
    return [v['--accent'] || '#888', v['--bg'] || '#eee', v['--bg2'] || '#ddd'];
  };

  const card = (id: string, name: string, sw: [string, string, string], dark: boolean, th?: CustomTheme) => (
    <button key={id} className={'cj-theme-card' + (s.currentTheme === id ? ' sel' : '')}
      onClick={() => void s.setTheme(id)}
      onContextMenu={th ? (e) => { e.preventDefault(); setMenu({ th, confirm: false }); } : undefined}>
      <span className="cj-theme-sw" style={{ background: 'linear-gradient(135deg,' + sw[1] + ',' + sw[2] + ')' }}><span className="pill" style={{ background: sw[0] }}></span></span>
      <span className="cj-theme-name">{name}{dark && <span className="dk">{t('theme.dark')}</span>}</span>
      {s.currentTheme === id && <span className="cj-theme-check"><Check size={12} strokeWidth={3} /></span>}
      {th && <span className="dots" onClick={(e) => { e.stopPropagation(); setMenu({ th, confirm: false }); }}><MoreHorizontal size={13} /></span>}
    </button>
  );

  const tn = (id: string) => { const m = BUILTIN_META[id as keyof typeof BUILTIN_META]; return m ? (id === 'sky' ? t('theme.sky') : id === 'sunset' ? t('theme.sunset') : id === 'night' ? t('theme.night') : t('theme.nature')) : id; };

  return (
    <>
      <div className="cj-theme-grid">
        {BUILTIN_IDS.map((id) => card(id, tn(id), BUILTIN_META[id].sw, BUILTIN_META[id].dark))}
        {s.themes.map((th) => card(th.id, th.name, swOf(th) as [string, string, string], th.dark, th))}
      </div>
      {s.themes.length > 0 && <div style={{ fontSize: 11.5, color: 'var(--ink3)', margin: '8px 2px 0' }}>{t('settings.theme.customHint')}</div>}
      <div className="cj-set-card glass" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13.5, fontWeight: 650 }}><Wand size={16} style={{ color: 'var(--accent)' }} />{t('settings.theme.aiTitle')}</div>
        <input className="cj-ai-input" placeholder={t('settings.theme.aiPlaceholder')} value={aiDesc}
          onChange={(e) => setAiDesc(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void generate(); }} />
        {err && <div className="cj-err">{err}</div>}
        <button className="cj-btn pri" style={{ width: '100%', marginTop: 12, height: 38 }} disabled={busy || !aiDesc.trim()} onClick={() => void generate()}>
          <Sparkles size={15} />{busy ? t('settings.theme.aiBusy') : t('settings.theme.aiGenerate')}
        </button>
      </div>
      {preview && (
        <div className="cj-previewbar glass">
          <Palette size={16} style={{ color: 'var(--accent)', flex: 'none' }} />
          <span className="nm">{t('settings.theme.preview', { name: preview.name })}</span>
          <button onClick={cancelPreview}>{t('settings.theme.cancel')}</button>
          <button className="pri" onClick={() => void savePreview()}>{t('settings.theme.save')}</button>
        </div>
      )}
      {menu && (
        <>
          <div className="cj-veil" style={{ background: 'transparent', backdropFilter: 'none' }} onClick={() => setMenu(null)}></div>
          <div className="cj-ctx glass" style={{ left: '50%', top: '40%', transform: 'translate(-50%,-50%)' }} onClick={(e) => e.stopPropagation()}>
            <button style={{ color: '#dc2626' }} onClick={() => {
              if (!menu.confirm) { setMenu({ ...menu, confirm: true }); return; }
              const nm = menu.th.name;
              void api.deleteTheme(menu.th.id).then(() => { setMenu(null); void s.refresh(); s.push({ label: t('settings.theme.deleted', { name: nm }) }); });
            }}><Trash size={14} />{menu.confirm ? t('settings.theme.deleteConfirm') : t('settings.theme.delete')}</button>
          </div>
        </>
      )}
    </>
  );
}

function Channels({ s }: { s: S }) {
  const t = s.t;
  const [bindFor, setBindFor] = useState<{ id: string; token: string } | null>(null);
  const [unbind, setUnbind] = useState<string | null>(null);
  const META: Record<string, (p: IconProps) => React.JSX.Element> = { onebot: MessageCircle, qq: MessageCircle, telegram: Send };
  return (
    <>
      {s.channels.map((ch) => {
        const binding = s.bindings.find((b) => b.channel === ch.name);
        const label = ch.label || ch.name;
        const Icon = META[ch.name] || Circle;
        return (
          <div key={ch.name}>
            <Row icon={<Icon size={17} />} t={label + (binding ? t('settings.channels.bound') : '')} s={binding ? binding.externalId : t('settings.channels.sub')}>
              {binding
                ? <button className="cj-btn sec" style={{ height: 30 }} onClick={() => {
                    if (unbind !== ch.name) { setUnbind(ch.name); setTimeout(() => setUnbind((u) => (u === ch.name ? null : u)), 2600); return; }
                    void s.unbindChannel(ch.name); setUnbind(null); s.push({ label: t('settings.channels.unbound', { name: label }) });
                  }}>{unbind === ch.name ? t('settings.channels.unbindConfirm') : t('settings.channels.unbind')}</button>
                : <button className="cj-btn pri" style={{ height: 30 }} onClick={() => { void s.bindChannel(ch.name).then((r) => setBindFor({ id: ch.name, token: r.token })); }}>{t('settings.channels.bind')}</button>}
            </Row>
            {bindFor && bindFor.id === ch.name && (
              <div className="cj-set-card glass" style={{ marginTop: -2 }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.6 }}>{t('settings.channels.tokenHint', { name: label })}</div>
                <div className="cj-token"><Key size={15} style={{ color: 'var(--accent)' }} /><span style={{ flex: 1 }}>{bindFor.token}</span>
                  <button className="cj-btn ghost" style={{ height: 26 }} onClick={() => { void navigator.clipboard.writeText(bindFor.token); s.push({ label: t('settings.channels.copy') }); }}><Copy size={13} /></button></div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="cj-btn sec" style={{ height: 30 }} onClick={() => setBindFor(null)}>{t('settings.theme.cancel')}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ fontSize: 11.5, color: 'var(--ink3)', margin: '2px 2px 0' }}>{t('settings.channels.limit')}</div>
    </>
  );
}

const CAT_ICON: Record<string, (p: IconProps) => React.JSX.Element> = {
  note: NotebookPen, diet: Utensils, health: Heart, academic: GraduationCap,
  travel: Plane, finance: Wallet, fitness: Dumbbell, idea: Sparkles,
};

function Categories({ s }: { s: S }) {
  const t = s.t;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
      {s.categories.map((c) => {
        const Icon = CAT_ICON[c.id] || Circle;
        const locked = c.id === 'note'; // 随手笔记始终开启（handoff §I）
        return (
          <div key={c.id} className="cj-set-row glass" style={{ marginBottom: 0 }}>
            <span className="ic"><Icon size={16} /></span>
            <div className="bd"><div className="t" style={{ fontSize: 13 }}>{c.name}</div>{locked && <div className="s">{t('settings.categories.locked')}</div>}</div>
            {locked ? <Check size={15} style={{ color: 'var(--ink3)' }} /> : <Switch on={c.enabled} onToggle={() => s.toggleCategory(c.id, !c.enabled)} />}
          </div>
        );
      })}
    </div>
  );
}

function Memories({ s }: { s: S }) {
  const t = s.t;
  const [draft, setDraft] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const add = () => { const tx = draft.trim(); if (!tx) return; void s.addMemory(tx); setDraft(''); s.push({ label: t('settings.memory.saved') }); };
  return (
    <>
      {s.memories.map((m) => (
        <div key={m.id} className="cj-item">
          <span className="cj-kind mem">{m.type === 'preference' ? t('settings.memory.preference') : t('settings.memory.wish')}</span>
          <div className="bd"><div className="t">{m.fact}</div></div>
          <button className="x" title={t('settings.memory.removed')} onClick={() => { void s.deleteMemory(m.id); }}><Trash size={13} /></button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <input className="cj-ai-input" style={{ flex: 1 }} placeholder={t('settings.memory.placeholder')} value={draft}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        <button className="cj-btn sec" disabled={!draft.trim()} onClick={add} style={{ height: 40 }}><Plus size={14} />{t('settings.memory.add')}</button>
      </div>
      {s.memories.length > 0 && (
        <button className="cj-btn ghost" style={{ marginTop: 8 }} onClick={() => {
          if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 2600); return; }
          void s.clearMemory(); setConfirmClear(false); s.push({ label: t('settings.memory.cleared') });
        }}><Trash size={13} />{confirmClear ? t('settings.memory.clearConfirm') : t('settings.memory.clear')}</button>
      )}
    </>
  );
}

const PREFS: { key: 'morningBrief' | 'eveningReview' | 'deadlineAlerts' | 'rollingReplan' | 'gapSuggestions' | 'autoPlan' | 'doNotDisturb'; ic: (p: IconProps) => React.JSX.Element }[] = [
  { key: 'morningBrief', ic: Sun }, { key: 'eveningReview', ic: Moon }, { key: 'deadlineAlerts', ic: Bell },
  { key: 'rollingReplan', ic: RefreshCw }, { key: 'gapSuggestions', ic: Sparkles }, { key: 'autoPlan', ic: Zap }, { key: 'doNotDisturb', ic: EyeOff },
];

function careLabel(t: (k: string) => string, key: string): string {
  if (key === 'morningBrief') return t('settings.care.morningBrief');
  if (key === 'eveningReview') return t('settings.care.eveningReview');
  if (key === 'deadlineAlerts') return t('settings.care.deadlineAlerts');
  if (key === 'rollingReplan') return t('settings.care.rollingReplan');
  if (key === 'gapSuggestions') return t('settings.care.gapSuggestions');
  if (key === 'autoPlan') return t('settings.care.autoPlan');
  return t('settings.care.doNotDisturb');
}

function careSub(t: (k: string) => string, key: string): string {
  if (key === 'morningBrief') return t('settings.care.morningBriefSub');
  if (key === 'eveningReview') return t('settings.care.eveningReviewSub');
  if (key === 'deadlineAlerts') return t('settings.care.deadlineAlertsSub');
  if (key === 'rollingReplan') return t('settings.care.rollingReplanSub');
  if (key === 'gapSuggestions') return t('settings.care.gapSuggestionsSub');
  if (key === 'autoPlan') return t('settings.care.autoPlanSub');
  return t('settings.care.doNotDisturbSub');
}

export function SettingsPage({ s }: { s: S }) {
  const t = s.t;
  const [name, setName] = useState(s.assistantName);
  const [l2, setL2] = useState('');
NaN
  // 前端无法回显已存值 —— 只能离开输入框时保存，重开为空。
  const saveName = () => { const v = name.trim(); if (v && v !== s.assistantName) { s.saveAssistantName(v); s.push({ label: t('settings.assistant.nameSaved', { name: v }) }); } };
  const saveL2 = () => { if (l2.trim()) { s.savePersonaPrompt(l2); s.push({ label: t('settings.assistant.promptSaved') }); } };
  return (
    <div className="cj-page">
      <div className="inner">
        <h2 className="pt"><span className="ic"><Settings size={19} /></span>{t('settings.header.title')}<span className="pn">{t('settings.header.sub')}</span></h2>

        <div className="cj-set-row glass" style={{ marginBottom: 26 }}>
          <span className="cj-avatar" style={{ width: 44, height: 44, fontSize: 16, flex: 'none' }}>{s.assistantName.charAt(0)}</span>
          <div className="bd"><div className="t" style={{ fontSize: 15 }}>{s.assistantName}</div><div className="s">{t('settings.user.anonymous')}</div></div>
        </div>

        <Group lab={t('settings.theme.title')} sub={t('settings.theme.sub')}><ThemeStudio s={s} /></Group>

        <Group lab={t('settings.assistant.title')}>
          <Row icon={<Heart size={17} />} t={t('settings.assistant.name')} s={t('settings.assistant.nameSub')}>
            <input className="cj-ai-input" style={{ width: 130, textAlign: 'right', height: 34 }} value={name}
              onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
          </Row>
          <div className="cj-set-card glass">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 650 }}><Sparkles size={14} style={{ color: 'var(--accent)' }} />{t('settings.assistant.promptTitle')}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink3)', margin: '4px 0 10px' }}>{t('settings.assistant.promptSub')}</div>
            <textarea className="cj-ta" rows={4} maxLength={2000} placeholder={t('settings.assistant.promptPlaceholder')} value={l2}
              onChange={(e) => setL2(e.target.value)} onBlur={saveL2}></textarea>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>{t('settings.assistant.promptCount', { n: l2.length })}</div>
          </div>
        </Group>

        <Group lab={t('settings.language.title')}>
          <Row icon={<Globe size={17} />} t={t('settings.language.label')} s={t('settings.language.sub')}>
            <div className="cj-seg" style={{ width: 150 }}>
              {(['zh-CN', 'en-US'] as const).map((loc) => (
                <button key={loc} className={s.locale === loc ? 'on' : ''} onClick={() => { s.saveLanguage(loc); s.push({ label: t('settings.language.reload') }); }}>
                  {t(loc === 'zh-CN' ? 'lang.zh' : 'lang.en')}
                </button>
              ))}
            </div>
          </Row>
        </Group>

        <Group lab={t('settings.care.title')} sub={t('settings.care.sub')}>
          {PREFS.map(({ key, ic: Icon }) => (
            <Row key={key} icon={<Icon size={16} />} t={careLabel(t, key)} s={careSub(t, key)}>
              <Switch on={!!(s.prefs && s.prefs[key])} onToggle={() => s.setPref(key, !(s.prefs && s.prefs[key]))} />
            </Row>
          ))}
        </Group>

        <Group lab={t('settings.channels.title')}><Channels s={s} /></Group>

        <Group lab={t('settings.categories.title')} sub={t('settings.categories.sub')}><Categories s={s} /></Group>

        <Group lab={t('settings.memory.title')} sub={t('settings.memory.sub')}><Memories s={s} /></Group>

        {/* ⚠️ 演示场景 / 管理控制台 / 回门厅 是 design-ui mock 专属，无后端端点，省略。 */}
        <div className="cj-about glass" style={{ borderRadius: 'var(--r-md)', padding: '18px 16px' }}>
          <b>{t('settings.about.title')}</b><br />{t('settings.about.sub')}<br />
        </div>
      </div>
    </div>
  );
}

