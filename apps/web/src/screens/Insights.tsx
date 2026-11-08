import { useEffect, useState } from 'react';
import {
  computeInsights,
  readSnapshot,
  type Insights as InsightsData,
  type Metric,
  type WeekPoint,
} from '@recall/core';
import { useApp } from '../lib/app-context';
import { href } from '../lib/router';

function MetricCard({ m }: { m: Metric }) {
  return (
    <div className="card metric">
      <span className="small muted">{m.label}</span>
      <span className={`value ${m.value === null ? 'unmeasured' : ''}`}>{m.display}</span>
      {m.n > 0 ? (
        <span className="small muted">
          Based on {m.n} {m.n === 1 ? 'check' : 'checks'}
        </span>
      ) : null}
      <span className="small muted">{m.explanation}</span>
    </div>
  );
}

function WeeklyChart({ weeks }: { weeks: WeekPoint[] }) {
  const w = 320;
  const h = 140;
  const pad = 24;
  const bw = (w - pad * 2) / weeks.length;
  const bar = (v: number | null) => (v === null ? 0 : v * (h - pad * 2));
  const any = weeks.some((x) => x.practisedN > 0 || x.freshN > 0);
  if (!any)
    return (
      <p className="muted">
        Not measured yet. Weekly results appear here after reviews and fresh-text checks.
      </p>
    );
  const label = weeks
    .map((x) => {
      const d = new Date(x.weekStart).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
      const p =
        x.practisedDelayed === null ? 'not measured' : `${Math.round(x.practisedDelayed * 100)}%`;
      const f = x.fresh === null ? 'not measured' : `${Math.round(x.fresh * 100)}%`;
      return `Week of ${d}: practised ${p}, fresh ${f}`;
    })
    .join('. ');
  return (
    <figure className="stack" style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" opacity={0.3} />
        {weeks.map((x, i) => {
          const x0 = pad + i * bw + 4;
          const half = (bw - 8) / 2;
          return (
            <g key={x.weekStart}>
              <rect
                x={x0}
                y={h - pad - bar(x.practisedDelayed)}
                width={half - 1}
                height={bar(x.practisedDelayed)}
                fill="var(--primary)"
                rx={2}
              />
              <rect
                x={x0 + half}
                y={h - pad - bar(x.fresh)}
                width={half - 1}
                height={bar(x.fresh)}
                fill="var(--accent)"
                rx={2}
              />
              {i % 2 === weeks.length % 2 ? (
                <text x={x0 + half} y={h - 8} textAnchor="middle">
                  {new Date(x.weekStart).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="row small">
        <span className="pill blue">■ Practised material, reviewed a day or more later</span>
        <span className="pill good">■ Fresh text, first read</span>
      </figcaption>
    </figure>
  );
}

export function Insights() {
  const { store, settings, now, dataVersion } = useApp();
  const [data, setData] = useState<InsightsData | null>(null);
  useEffect(() => {
    void readSnapshot(store).then((s) =>
      setData(computeInsights({ attempts: s.attempts, reviewLog: s.reviewLog, settings }, now())),
    );
  }, [store, settings, now, dataVersion]);
  if (!data) return <p role="status">Loading…</p>;
  const p = data.practised;
  const f = data.fresh;
  return (
    <div className="stack-lg">
      <h1>Progress</h1>
      <p className="muted">
        These describe your reading practice only. They are not a test score and say nothing about
        health. Practised material and fresh text are kept apart, so getting better at familiar
        pieces is never counted as improvement on new reading.
      </p>

      <section className="stack" aria-labelledby="pr-h">
        <h2 id="pr-h">Practised material</h2>
        <div className="grid-2">
          <MetricCard m={p.immediate} />
          <MetricCard m={p.nextDay} />
          <MetricCard m={p.week} />
          <MetricCard m={p.clueDependence} />
          <MetricCard m={p.comprehension} />
        </div>
      </section>

      <section className="stack" aria-labelledby="fr-h">
        <h2 id="fr-h">Fresh text (never seen before)</h2>
        <div className="grid-2">
          <MetricCard m={f.immediate} />
          <MetricCard m={f.comprehension} />
          <MetricCard m={f.clueDependence} />
        </div>
        <a className="btn secondary block" href={href('/')}>
          Fresh-text checks are on the Home screen
        </a>
      </section>

      <section className="card stack" aria-labelledby="wk-h">
        <h2 id="wk-h">Week by week</h2>
        <WeeklyChart weeks={data.weekly} />
      </section>

      <section className="card stack" aria-labelledby="sz-h">
        <h2 id="sz-h">Comfortable part size</h2>
        <p style={{ margin: 0 }}>
          About <strong>{data.comfortableChunkWords} words</strong> per part{' '}
          {data.chunkMode === 'fixed' ? '(you chose this size).' : '(adjusted automatically).'}
        </p>
        <p className="small muted" style={{ margin: 0 }}>
          The size changes slowly, at most once per session, based on how recent new parts were
          remembered the next day. These are starting rules, not medically tested ones. You can
          choose a fixed size in Settings.
        </p>
      </section>

      <section className="card stack" aria-labelledby="tot-h">
        <h2 id="tot-h">So far</h2>
        <table className="simple">
          <tbody>
            <tr>
              <th scope="row">Parts read</th>
              <td>{data.totals.partsRead}</td>
            </tr>
            <tr>
              <th scope="row">Points checked</th>
              <td>{data.totals.pointsChecked}</td>
            </tr>
            <tr>
              <th scope="row">Review rounds</th>
              <td>{data.totals.reviewsDone}</td>
            </tr>
            <tr>
              <th scope="row">Fresh-text checks</th>
              <td>{data.totals.freshChecks}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
