import { useEffect, useState } from 'react';
import { FONT_SCALES, finishSession, getActiveSession, readSnapshot } from '@recall/core';
import { useApp } from '../lib/app-context';
import { href, navigate } from '../lib/router';
import { useFocusOnChange } from '../components/ui';

export function Onboarding() {
  const { settings, updateSettings } = useApp();
  const [step, setStep] = useState(0);
  const ref = useFocusOnChange<HTMLHeadingElement>(step);
  const done = async () => {
    await updateSettings({ onboardingDone: true });
    navigate('/', { replace: true });
  };

  if (step === 0) {
    return (
      <div className="stack-lg">
        <h1 ref={ref} tabIndex={-1}>
          Welcome to Recall
        </h1>
        <p>Recall helps you read in small parts and hold on to the main points.</p>
        <ol className="stack" style={{ paddingLeft: '1.2em' }}>
          <li>Read a short part. Take as long as you like.</li>
          <li>Hide it and write what you remember, in your own words.</li>
          <li>Check against the main points, with hints if you want them.</li>
          <li>The points come back another day, which helps them stick.</li>
        </ol>
        <p className="muted">No account. Nothing leaves this device. You can stop at any time.</p>
        <button type="button" className="btn primary block large" onClick={() => setStep(1)}>
          Continue
        </button>
        <button type="button" className="btn ghost block" onClick={() => void done()}>
          Skip and start
        </button>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="stack-lg">
        <h1 ref={ref} tabIndex={-1}>
          Choose a comfortable text size
        </h1>
        <div className="card">
          <p className="reading-text" style={{ margin: 0 }}>
            The kettle clicked off. Steam drifted past the window as the morning light came in.
          </p>
        </div>
        <div className="choice-list" role="radiogroup" aria-label="Text size">
          {FONT_SCALES.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={settings.fontScale === f.value}
              className="choice"
              onClick={() => void updateSettings({ fontScale: f.value })}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn primary block large" onClick={() => setStep(2)}>
          Continue
        </button>
      </div>
    );
  }
  return (
    <div className="stack-lg">
      <h1 ref={ref} tabIndex={-1}>
        How would you like to answer?
      </h1>
      <div className="choice-list" role="radiogroup" aria-label="Answer by">
        <button
          type="button"
          role="radio"
          aria-checked={settings.inputPreference === 'typing'}
          className="choice"
          onClick={() => void updateSettings({ inputPreference: 'typing' })}
        >
          Typing
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={settings.inputPreference === 'dictation'}
          className="choice"
          onClick={() => void updateSettings({ inputPreference: 'dictation' })}
        >
          Speaking, using the microphone on the iPhone keyboard
        </button>
      </div>
      <p className="small muted">You can always type. You can change this later in Settings.</p>
      <button type="button" className="btn primary block large" onClick={() => void done()}>
        Start
      </button>
    </div>
  );
}

export function Finish({ sessionId }: { sessionId: string }) {
  const { store, now } = useApp();
  const [summary, setSummary] = useState<{ parts: number; points: number; own: number; reviews: number } | null>(null);
  useEffect(() => {
    void (async () => {
      const snap = await readSnapshot(store);
      const s = snap.sessions.find((x) => x.id === sessionId);
      const attempts = snap.attempts.filter((a) => s?.attemptIds.includes(a.id));
      const checks = attempts.flatMap((a) => a.ideas);
      setSummary({
        parts: attempts.filter((a) => a.kind !== 'review').length,
        reviews: attempts.filter((a) => a.kind === 'review').length,
        points: checks.length,
        own: checks.filter((c) => c.outcome === 'correct' && c.clueLevel === 0).length,
      });
      const active = await getActiveSession(store);
      if (active?.id === sessionId) await finishSession(store, sessionId, now());
    })();
  }, [store, sessionId, now]);
  return (
    <div className="stack-lg">
      <h1>Session finished</h1>
      {summary ? (
        <div className="card good stack">
          {summary.parts + summary.reviews === 0 ? (
            <p style={{ margin: 0 }}>Nothing was saved in this session. That’s fine — come back whenever you like.</p>
          ) : (
            <>
              <p style={{ margin: 0 }}>
                You read {summary.parts} {summary.parts === 1 ? 'part' : 'parts'}
                {summary.reviews > 0 ? ` and did ${summary.reviews} ${summary.reviews === 1 ? 'review' : 'reviews'}` : ''}.
              </p>
              {summary.points > 0 ? (
                <p style={{ margin: 0 }}>
                  You checked {summary.points} {summary.points === 1 ? 'point' : 'points'}; {summary.own} on your own.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      <p className="muted">Your progress is saved on this device. The points will come back under Reviews when they are due.</p>
      <a className="btn primary block large" href={href('/')}>
        Back to home
      </a>
    </div>
  );
}
