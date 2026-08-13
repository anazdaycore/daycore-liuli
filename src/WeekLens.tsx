import type { DayPlan, TimeBlock } from '@daycore/core';
import { addDaysIso, isoOf, toMin } from './canvas';
import type { useStore } from './store';

type S = ReturnType<typeof useStore>;

const TYPE_VAR: Record<TimeBlock['type'], string> = {
  task: 'var(--c-task)', appointment: 'var(--c-appointment)', relax: 'var(--c-relax)', meal: 'var(--c-meal)', break: 'var(--c-break)',
};

export function WeekLens({ s }: { s: S }) {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push(addDaysIso(s.weekStart, i));
  const planByDate = new Map<string, DayPlan>((s.week ?? []).map((p) => [p.date, p]));
  const today = isoOf(new Date());
  return (
    <div className="cj-stage">
      <div className="cj-scroll">
        <div className="cj-week">
          {days.map((d) => {
            const plan = planByDate.get(d);
            const blocks = (plan?.blocks ?? []).filter((b) => !b.hidden && b.time !== null);
            const dObj = new Date(d + 'T12:00:00');
            return (
              <div key={d} className={'cj-wcol' + (d === today ? ' today' : '')} onClick={() => s.setDate(d)}>
                <h5>{dObj.toLocaleDateString(undefined, { weekday: 'short' })}</h5>
                <div className="n">{dObj.getDate()}</div>
                <div className="cj-wbody">
                  {blocks.map((b) => {
                    const s0 = toMin(b.time || '09:00');
                    const top = ((s0 - 6 * 60) / (18 * 60)) * 100;
                    const h = Math.max(3, ((b.duration_min || 45) / (18 * 60)) * 100);
                    return (
                      <div key={b.id} className={'cj-wblk' + (b.origin === 'auto' ? ' auto' : '')}
                        style={{ top: top + '%', height: h + '%', '--bc': TYPE_VAR[b.type] || 'var(--accent)' } as React.CSSProperties}
                        title={b.title} />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

