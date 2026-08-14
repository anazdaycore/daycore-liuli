import { useState } from 'react';
import { X } from './icons';
import type { useStore } from './store';

type S = ReturnType<typeof useStore>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// 琉璃风 glass 认证卡：登录/注册切换，注册多昵称，Enter 提交，错误 inline。
export function AuthCard({ s, onClose }: { s: S; onClose: () => void }) {
  const t = s.t;
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) { setErr(t('auth.emailBad')); return; }
    if (password.length < 8) { setErr(t('auth.passwordBad')); return; }
    setBusy(true);
    setErr('');
    try {
      const u = mode === 'login' ? await s.doLogin(email.trim(), password) : await s.doRegister(email.trim(), password, name.trim() || undefined);
      onClose();
      s.push({ label: t('auth.welcome', { name: u.name || u.email || '' }) });
    } catch {
      setErr(t('auth.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="cj-veil" onClick={onClose}></div>
      <div className="cj-pop glass" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 320, zIndex: 80 } as React.CSSProperties}>
        <button className="close" onClick={onClose}><X size={15} /></button>
        <h4>{t('auth.account')}</h4>
        <div className="cj-seg" style={{ marginTop: 10 }}>
          <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>{t('auth.signin')}</button>
          <button className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr(''); }}>{t('auth.signup')}</button>
        </div>
        {mode === 'register' && (
          <input className="cj-ai-input" style={{ marginTop: 12 }} placeholder={t('auth.namePh')} value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="cj-ai-input" style={{ marginTop: 12 }} placeholder={t('auth.emailPh')} type="email" autoCapitalize="off" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="cj-ai-input" style={{ marginTop: 8 }} placeholder={t('auth.passwordPh')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} />
        {err && <div className="cj-err">{err}</div>}
        <button className="cj-btn pri" style={{ width: '100%', marginTop: 12, height: 38 }} disabled={busy} onClick={() => void submit()}>
          {mode === 'login' ? t('auth.signin') : t('auth.submitSignup')}
        </button>
        <button className="cj-btn ghost" style={{ width: '100%', marginTop: 4 }} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? t('auth.toSignup') : t('auth.toLogin')}
        </button>
        <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 10, textWrap: 'pretty' } as React.CSSProperties}>{t('auth.anonymousSub')}</p>
      </div>
    </>
  );
}

