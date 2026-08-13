import { useState } from 'react';
import { ArrowUp, Check, MessageHeart, X } from './icons';
import type { ChatMsg, useStore } from './store';

type S = ReturnType<typeof useStore>;

export function Companion({ s, onClose }: { s: S; onClose: () => void }) {
  const t = s.t;
  const [text, setText] = useState('');
  const send = () => {
    const tx = text.trim();
    if (!tx || s.chatBusy) return;
    setText('');
    void s.sendCompanion(tx);
  };
  const typing = s.chatBusy && s.chat[s.chat.length - 1]?.role === 'assistant' &&
    s.chat[s.chat.length - 1]?.status === 'streaming' && !s.chat[s.chat.length - 1]?.content &&
    !s.chat[s.chat.length - 1]?.error && !(s.chat[s.chat.length - 1]?.tools?.length) && !s.chat[s.chat.length - 1]?.decision &&
    !s.chat[s.chat.length - 1]?.reasoning;
  return (
    <>
      <div className="cj-veil" onClick={onClose}></div>
      <div className="cj-drawer glass bottom">
        <div className="cj-dhead"><h3><span className="ic"><MessageHeart size={18} /></span>{t('drawer.companion')}</h3><button className="close" onClick={onClose}><X size={16} /></button></div>
        <div className="cj-dbody" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="cj-chat" style={{ flex: 1 }}>
            {s.chat.length === 0 && !s.chatBusy && <div className="cj-sub" style={{ padding: '4px 0' }}>{t('companion.empty')}</div>}
            {s.chat.map((m) => {
              if (m.role === 'assistant' && m.status === 'streaming' && !m.content && !m.error && !m.reasoning && !(m.tools?.length) && !m.decision) return null;
              return <Msg key={m.id} m={m} s={s} />;
            })}
            {typing && <div className="cj-typing"><i /><i /><i /></div>}
          </div>
          <div className="cj-chatbar">
            <input placeholder={t('input.placeholder.companion')} value={text} autoFocus
              onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <button className="send" disabled={!text.trim() || s.chatBusy} onClick={send}><ArrowUp size={16} /></button>
          </div>
        </div>
      </div>
    </>
  );
}

function Msg({ m, s }: { m: ChatMsg; s: S }) {
  const t = s.t;
  return (
    <div className={'cj-msg ' + (m.role === 'user' ? 'user' : 'ai') + (m.error ? ' err' : '')}>
      {m.reasoning && (
        <details className="cj-reason"><summary>{t('companion.reasoning')}</summary>{m.reasoning}</details>
      )}
      {m.content}
      {m.tools && m.tools.length > 0 && (
        <div className="cj-tools">
          {m.tools.map((tc) => (
            <span key={tc.callId} className={'cj-tool' + (tc.ok ? ' ok' : '')}>
              {tc.label}{tc.summary ? ' · ' + tc.summary : ''}
              {tc.opId && <button onClick={() => void s.takeBack(tc.opId as string)}>{t('companion.undo')}</button>}
            </span>
          ))}
        </div>
      )}
      {m.decision && <Decision m={m} s={s} />}
      {m.error && <div>{m.error}</div>}
    </div>
  );
}

function Decision({ m, s }: { m: ChatMsg; s: S }) {
  const t = s.t;
  const d = m.decision!;
  const [text, setText] = useState('');
  const send = (choice: string, free?: string) => void s.respondDecision(d.id, choice, free);
  return (
    <div className="cj-decision">
      <div className="dt">{d.title}</div>
      {d.summary && <div className="ds">{d.summary}</div>}
      {d.answered ? (
        <div className="done"><Check size={13} />{t('companion.decision.answered')}</div>
      ) : (
        <>
          <div className="opts">{d.options.map((o) => <button key={o.id} className="opt" onClick={() => send(o.id)}>{o.label}</button>)}</div>
          <div className="custom">
            <input placeholder={t('companion.decision.custom')} value={text}
              onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { send('', text.trim()); setText(''); } }} />
            <button onClick={() => { if (text.trim()) { send('', text.trim()); setText(''); } }}><ArrowUp size={15} /></button>
          </div>
        </>
      )}
    </div>
  );
}

