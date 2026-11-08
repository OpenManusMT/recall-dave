import { useEffect, useState } from 'react';
import {
  describeDue,
  dueReviewGroups,
  finishSession,
  getActiveSession,
  nextReviewAt,
  startSession,
  suggestNextPassage,
  type DueGroup,
  type SessionRecord,
} from '@recall/core';
import { LIBRARY_PASSAGES } from '@recall/content';
import { useApp } from '../lib/app-context';
import { href, navigate } from '../lib/router';
import { ChunkFlow } from '../components/ChunkFlow';
import { TopBar } from '../components/ui';
import { Icon } from '../components/Icon';

export function ReviewsOverview() {
  const { store, now, dataVersion } = useApp();
  const [groups, setGroups] = useState<DueGroup[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    void dueReviewGroups(store, now()).then(setGroups);
    void nextReviewAt(store, now()).then(setNext);
  }, [store, now, dataVersion]);
  if (!groups) return <p role="status">Loading…</p>;
  const points = groups.reduce((n, g) => n + g.ideas.length, 0);
  return (
    <div className="stack-lg">
      <h1>Reviews</h1>
      {groups.length === 0 ? (
        <div className="card stack">
          <p style={{ fontWeight: 600 }}>Nothing is due right now.</p>
          <p className="muted">
            {next
              ? `Your next review is ${describeDue(next, now())}.`
              : 'After you read something, its main points come back here the next day.'}
          </p>
          <a className="btn primary block" href={href('/library')}>
            Choose something to read
          </a>
        </div>
      ) : (
        <>
          <p className="muted">
            {points === 1 ? '1 point is' : `${points} points are`} ready to remember again, from{' '}
            {groups.length} {groups.length === 1 ? 'part' : 'parts'}. You try first, then check — no
            time limit.
          </p>
          <a className="btn primary block large" href={href('/reviews/run')}>
            <Icon name="review" /> Start reviews
          </a>
          <ul className="list" aria-label="Due reviews">
            {groups.map((g) => (
              <li key={g.chunk.id} className="list-item" style={{ cursor: 'default' }}>
                <div className="grow">
                  <div className="title">{g.document.title}</div>
                  <div className="small muted">
                    Part {g.chunk.index + 1} · {g.ideas.length}{' '}
                    {g.ideas.length === 1 ? 'point' : 'points'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="small muted">
            Review dates use simple fixed steps (1, 3, 7, 14, 30, 60, 120 days).
          </p>
        </>
      )}
    </div>
  );
}

export function ReviewRun({ thenRead }: { thenRead: boolean }) {
  const { store, now } = useApp();
  const [groups, setGroups] = useState<DueGroup[] | null>(null);
  const [i, setI] = useState(0);
  const [session, setSession] = useState<SessionRecord | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const g = await dueReviewGroups(store, now());
      const active = await getActiveSession(store);
      const s =
        active && active.mode === 'remember'
          ? active
          : (await startSession(store, 'remember', now())).session;
      if (alive) {
        setGroups(g);
        setSession(s);
      }
    })();
    return () => {
      alive = false;
    };
  }, [store, now]);

  if (!groups || !session) return <p role="status">Loading…</p>;

  const finish = async () => {
    await finishSession(store, session.id, now());
    navigate(`/finish/${session.id}`, { replace: true });
  };
  const continueReading = async () => {
    const docs = await store.getAll('documents');
    const p = suggestNextPassage(LIBRARY_PASSAGES, docs);
    navigate(p ? `/read/${p.id}` : '/library', { replace: true });
  };

  if (groups.length === 0 || i >= groups.length) {
    return (
      <div className="stack-lg">
        <TopBar back="/" backLabel="Home" />
        <h1>{groups.length === 0 ? 'No reviews are due' : 'Reviews done'}</h1>
        <p className="muted">
          {groups.length === 0
            ? 'Nothing to review right now.'
            : 'Thank you. Your review dates have been updated.'}
        </p>
        {thenRead ? (
          <button
            type="button"
            className="btn primary block large"
            onClick={() => void continueReading()}
          >
            Now read something new
          </button>
        ) : null}
        <button
          type="button"
          className={`btn block ${thenRead ? 'secondary' : 'primary large'}`}
          onClick={() => void finish()}
        >
          Finish session
        </button>
      </div>
    );
  }

  const g = groups[i] as DueGroup;
  return (
    <div className="stack">
      <TopBar
        back={() => navigate('/')}
        backLabel="Pause"
        right={<span className="pill blue">Review</span>}
      />
      <ChunkFlow
        key={g.chunk.id}
        kind="review"
        sessionId={session.id}
        document={g.document}
        chunk={g.chunk}
        ideas={g.ideas}
        partLabel={`Review ${i + 1} of ${groups.length}`}
        progress={(i + 0.5) / groups.length}
        onDone={() => undefined}
        doneActions={() => (
          <>
            <button type="button" className="btn primary block large" onClick={() => setI(i + 1)}>
              {i < groups.length - 1 ? 'Next review' : 'Continue'}
            </button>
            <button type="button" className="btn secondary block" onClick={() => void finish()}>
              Finish for now
            </button>
          </>
        )}
      />
    </div>
  );
}
