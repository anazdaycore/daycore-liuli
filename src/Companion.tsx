import { useState } from 'react';
import { ArrowUp, Check, MessageHeart } from './icons';
import type { ChatMsg, useStore } from './store';

type S = ReturnType<typeof useStore>;

// 伙伴是整页（appbar + 标题 + 聊天气泡流），输入走全局底部输入条（见 App.tsx submit）。
export function CompanionPage({ s }: { s: S }) {
  const t = s.t;
  const typing = s.chatBusy && s.chat[s.chat.length - 1]?.role === 'assistant' &&
    s.chat[s.chat.length - 1]?.status === 'streaming' && !s.chat[s.chat.length - 1]?.content &&
    !s.chat[s.chat.length - 1]?.error && !(s.chat[s.chat.length - 1]?.tools?.length) && !s.chat[s.chat.length - 1]?.decision &&
    !s.chat[s.chat.length - 1]?.reasoning;
  return (
    <div className="cj-page">
      <div className="inner narrow">
        <h2 className="pt"><span className="ic"><MessageHeart size={19} /></span>{t('drawer.companion')} · {s.assistantName}<span className="pn">{t('companion.note')}</span></h2>
        <div className="cj-chat">
          {s.chat.length === 0 && !s.chatBusy && <div className="cj-sub" style={{ padding: '4px 0' }}>{t('companion.empty', { name: s.assistantName })}</div>}
          {s.chat.map((m) => {
            if (m.role === 'assistant' && m.status === 'streaming' && !m.content && !m.error && !m.reasoning && !(m.tools?.length) && !m.decision) return null;
            return <Msg key={m.id} m={m} s={s} />;
          })}
          {typing && <div className="cj-typing"><i /><i /><i /></div>}
        </div>
      </div>
    </div>
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

