import { useEffect, useState } from 'react';
import {
  backupReminderDue,
  computeInsights,
  describeDue,
  dueReviewGroups,
  getActiveSession,
  nextReviewAt,
  readSnapshot,
  suggestNextPassage,
  suggestNextProbe,
  type AuthoredPassage,
  type Insights,
  type ReadingDocument,
  type SessionRecord,
} from '@recall/core';
import { ALL_PASSAGES, LIBRARY_PASSAGES } from '@recall/content';
import { useApp } from '../lib/app-context';
import { href, navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { getFlag, isIos, isStandalone, setFlag } from '../lib/platform';

interface HomeData {
  due: number;
  dueParts: number;
  next: string | null;
  active: SessionRecord | undefined;
  activeDoc: ReadingDocument | undefined;
  suggestion: AuthoredPassage | null;
  probe: AuthoredPassage | null;
  insights: Insights;
  answers: number;
}

export function Home() {
  const { store, settings, now, dataVersion, persistence } = useApp();
  const [data, setData] = useState<HomeData | null>(null);
  const [showInstall, setShowInstall] = useState(
    () => isIos() && !isStandalone() && !getFlag('installHintDismissed'),
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const snap = await readSnapshot(store);
      const groups = await dueReviewGroups(store, now());
      const active = await getActiveSession(store);
      const activeDoc = active?.draft
        ? snap.documents.find((d) => d.id === active.draft?.documentId)
        : undefined;
      const d: HomeData = {
        due: groups.reduce((n, g) => n + g.ideas.length, 0),
        dueParts: groups.length,
        next: await nextReviewAt(store, now()),
        active,
        activeDoc,
        suggestion: suggestNextPassage(LIBRARY_PASSAGES, snap.documents),
        probe: suggestNextProbe(ALL_PASSAGES, snap.documents),
        answers: snap.attempts.length,
        insights: computeInsights(
          { attempts: snap.attempts, reviewLog: snap.reviewLog, settings },
          now(),
        ),
      };
      if (alive) setData(d);
    })();
    return () => {
      alive = false;
    };
  }, [store, now, dataVersion, settings]);

  if (!data) return <p role="status">Loading…</p>;

  const resume = () => {
    const d = data.activeDoc;
    if (!d) return;
    if (data.active?.draft?.kind === 'review') navigate('/reviews/run');
    else if (d.passageId)
      navigate(
        `/${d.provenance === 'probe' ? 'probe' : 'read'}/${d.passageId}${data.active?.mode === 'read' ? '?mode=read' : ''}`,
      );
    else navigate(`/doc/${d.id}${data.active?.mode === 'read' ? '?mode=read' : ''}`);
  };

  const startSession = () => {
    // Never discard a half-written answer: continue it first.
    if (data.active?.draft && data.activeDoc) resume();
    else if (data.due > 0) navigate('/reviews/run?then=read');
    else if (data.suggestion) navigate(`/read/${data.suggestion.id}`);
    else navigate('/library');
  };

  const { practised } = data.insights;
  return (
    <div className="stack-lg">
      <header>
        <h1 style={{ marginBottom: 2 }}>Recall</h1>
        <p className="muted" style={{ margin: 0 }}>
          Read a little, remember the main points, come back later.
        </p>
      </header>

      {persistence === 'memory-only' ? (
        <p className="banner" role="status">
          This browser is not letting Recall save anything (for example in Private Browsing). You
          can still read, but progress will be lost when you close the page.
        </p>
      ) : null}

      {showInstall ? (
        <div className="card soft stack" role="note" aria-labelledby="install-h">
          <h2 id="install-h">Add Recall to your Home Screen</h2>
          <p style={{ margin: 0 }}>
            In Safari, tap the Share button (a square with an arrow), then “Add to Home Screen”.
            Recall then opens like an app, works without internet, and keeps your progress more
            reliably.
          </p>
          <button
            type="button"
            className="btn secondary block"
            onClick={() => {
              setFlag('installHintDismissed');
              setShowInstall(false);
            }}
          >
            Got it
          </button>
        </div>
      ) : null}

      {backupReminderDue(settings, data.answers, now()) ? (
        <div className="card note stack" role="note" aria-labelledby="backup-h">
          <h2 id="backup-h">Keep a copy of your progress</h2>
          <p style={{ margin: 0 }}>
            Your progress is only on this device. A backup file lets you restore it if the browser
            clears its data or you change phone.
          </p>
          <a className="btn secondary block" href={href('/settings')}>
            <Icon name="download" /> Make a backup in Settings
          </a>
        </div>
      ) : null}

      {data.active?.draft && data.activeDoc ? (
        <div className="card soft stack">
          <p style={{ fontWeight: 600, margin: 0 }}>
            You were part-way through “{data.activeDoc.title}”.
          </p>
          <button type="button" className="btn primary block large" onClick={resume}>
            Continue where you left off
          </button>
        </div>
      ) : null}

      <div className="stack">
        <button type="button" className="btn primary block large" onClick={startSession}>
          Start a session <Icon name="next" />
        </button>
        <p className="small muted" style={{ marginTop: 6 }}>
          {data.due > 0
            ? `Starts with ${data.due === 1 ? '1 point' : `${data.due} points`} to remember again, then something new.`
            : data.suggestion
              ? `Next up: “${data.suggestion.title}”.`
              : ''}
        </p>
        <a className="btn secondary block" href={href('/library')}>
          <Icon name="book" /> Choose something to read
        </a>
      </div>

      <section className="card stack" aria-labelledby="today-h">
        <h2 id="today-h">Reviews</h2>
        {data.due > 0 ? (
          <>
            <p style={{ margin: 0 }}>
              {data.due === 1 ? '1 point is' : `${data.due} points are`} ready to remember again.
            </p>
            <a className="btn good block" href={href('/reviews/run')}>
              <Icon name="review" /> Do reviews only
            </a>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            {data.next
              ? `Nothing due now. Next review ${describeDue(data.next, now())}.`
              : 'Nothing to review yet.'}
          </p>
        )}
      </section>

      <section className="stack" aria-labelledby="glance-h">
        <h2 id="glance-h">At a glance</h2>
        {data.insights.totals.partsRead + data.insights.totals.reviewsDone === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Your progress will appear here after your first reading. Parts are about{' '}
            {data.insights.comfortableChunkWords} words to start with.
          </p>
        ) : (
          <ul className="list" aria-label="Progress at a glance">
            {[practised.nextDay, practised.week, practised.clueDependence].map((m) => (
              <li key={m.key}>
                <a className="list-item" href={href('/insights')}>
                  <span className="grow">{m.label}</span>
                  <strong className={m.value === null ? 'muted' : ''}>
                    {m.display}
                    {m.value !== null ? (
                      <span className="small muted" style={{ fontWeight: 400 }}>
                        {' '}
                        · {m.n} checks
                      </span>
                    ) : null}
                  </strong>
                </a>
              </li>
            ))}
            <li>
              <a className="list-item" href={href('/insights')}>
                <span className="grow">Comfortable part size</span>
                <strong>{data.insights.comfortableChunkWords} words</strong>
              </a>
            </li>
          </ul>
        )}
      </section>

      {data.probe ? (
        <section className="card stack" aria-labelledby="fresh-h">
          <h2 id="fresh-h">Fresh-text check</h2>
          <p className="muted" style={{ margin: 0 }}>
            Optional. A short passage you haven’t seen before, to show how reading new text is
            going. Kept separate from practice.
          </p>
          <a className="btn secondary block" href={href(`/probe/${data.probe.id}`)}>
            Try a fresh passage
          </a>
        </section>
      ) : null}
    </div>
  );
}
