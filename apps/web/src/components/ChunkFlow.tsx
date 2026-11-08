import { useEffect, useMemo, useRef, useState } from 'react';
import {
  cueText,
  initialLadder,
  ladderFeedback,
  ladderReducer,
  logStrategy,
  newId,
  recordAttempt,
  saveDraft,
  type AttemptKind,
  type AttemptOutcome,
  type ChunkRecord,
  type ClueLevel,
  type KeyIdeaSnapshot,
  type LadderAction,
  type LadderState,
  type QuestionResult,
  type QuestionSnapshot,
  type ReadingDocument,
  type SessionDraft,
} from '@recall/core';
import { useApp } from '../lib/app-context';
import { canReadAloud, speak, stopSpeaking } from '../lib/speech';
import { Icon } from './Icon';
import { ProgressBar, ReadingText, useFocusOnChange } from './ui';
import { ExperimentalHints } from './ExperimentalHints';

type Phase = 'reading' | 'recall' | 'question' | 'check' | 'saving' | 'done';

export interface ChunkFlowProps {
  kind: AttemptKind;
  sessionId: string;
  document: ReadingDocument;
  chunk: ChunkRecord;
  /** Ideas to check. For reviews: only the due ones. */
  ideas: KeyIdeaSnapshot[];
  partLabel: string;
  progress: number;
  draft?: SessionDraft | null;
  onDone: (outcome: AttemptOutcome) => void;
  /** "Too much text": parent re-plans; returns the (possibly shorter) chunk to show now. */
  onTooMuch?: () => Promise<ChunkRecord | null>;
  doneActions: (outcome: AttemptOutcome) => React.ReactNode;
}

const LEVEL_LABEL: Record<ClueLevel, string> = {
  0: '',
  1: 'About this point',
  2: 'Hint',
  3: 'Stronger hint',
  4: 'From the text',
  5: 'The whole part',
};

function pickQuestion(kind: AttemptKind, chunk: ChunkRecord): QuestionSnapshot | null {
  if (chunk.questions.length === 0) return null;
  if (kind === 'review') return chunk.questions[1] ?? chunk.questions[0] ?? null;
  return chunk.questions[0] ?? null;
}

export function ChunkFlow(props: ChunkFlowProps) {
  const { store, settings, now, refresh, setError } = useApp();
  const { kind, sessionId, document: doc, onDone } = props;
  const [chunk, setChunk] = useState(props.chunk);
  const ideas = kind === 'review' ? props.ideas : chunk.ideas;
  const startedAt = useRef(now().toISOString());
  const attemptId = useRef(newId('att'));
  const resumable =
    props.draft && props.draft.chunkId === chunk.id && props.draft.phase !== 'reading';
  const [phase, setPhase] = useState<Phase>(kind === 'review' || resumable ? 'recall' : 'reading');
  const [recallText, setRecallText] = useState(resumable ? (props.draft?.recallText ?? '') : '');
  const [peeking, setPeeking] = useState(false);
  const [peeks, setPeeks] = useState(0);
  const [explain, setExplain] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [tooMuch, setTooMuch] = useState(false);
  const [tooMuchNote, setTooMuchNote] = useState<string | null>(null);
  const question = settings.askQuestions || kind === 'read' ? pickQuestion(kind, chunk) : null;
  const [answer, setAnswer] = useState<number | null>(null);
  const [ideaIndex, setIdeaIndex] = useState(0);
  const [ladders, setLadders] = useState<LadderState[]>(() => ideas.map(() => initialLadder()));
  const [outcome, setOutcome] = useState<AttemptOutcome | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const headingRef = useFocusOnChange<HTMLHeadingElement>(`${phase}:${ideaIndex}`);

  useEffect(() => () => stopSpeaking(), []);

  // Keep a draft so the app can be closed and resumed mid-chunk.
  useEffect(() => {
    if (phase === 'saving' || phase === 'done') return;
    const t = setTimeout(() => {
      const draft: SessionDraft = {
        documentId: doc.id,
        chunkId: chunk.id,
        phase: phase === 'check' ? 'check' : phase,
        recallText,
        kind,
      };
      void saveDraft(store, sessionId, draft, now()).catch(() => undefined);
    }, 400);
    return () => clearTimeout(t);
  }, [phase, recallText, store, sessionId, doc.id, chunk.id, kind, now]);

  const strategy = (s: Parameters<typeof logStrategy>[2]) =>
    void logStrategy(store, sessionId, s, chunk.id, now()).catch(() => undefined);

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    if (speak(chunk.text, () => setSpeaking(false))) {
      setSpeaking(true);
      strategy('read_aloud');
    }
  };

  const doTooMuch = async () => {
    if (!props.onTooMuch) return;
    setTooMuch(true);
    strategy('too_much');
    const replacement = await props.onTooMuch();
    if (replacement) {
      const shorter = replacement.wordCount < chunk.wordCount;
      setChunk(replacement);
      setLadders(replacement.ideas.map(() => initialLadder()));
      setTooMuchNote(
        shorter
          ? 'This part is now shorter. Later parts will be shorter too.'
          : 'The next parts will be shorter. This part could not be split without breaking up an idea.',
      );
    } else {
      setTooMuchNote('The next parts will be shorter.');
    }
  };

  const afterRecall = () => {
    stopSpeaking();
    setPeeking(false);
    if (question && kind !== 'read') setPhase('question');
    else if (ideas.length > 0) setPhase('check');
    else void save([]);
  };

  const questionResult = (): QuestionResult | null =>
    question && answer !== null
      ? { questionId: question.id, chosenIndex: answer, correct: answer === question.answerIndex }
      : null;

  async function save(finalLadders: LadderState[]) {
    setPhase('saving');
    setSaveError(null);
    try {
      const out = await recordAttempt(
        store,
        {
          attemptId: attemptId.current,
          sessionId,
          documentId: doc.id,
          chunkId: chunk.id,
          kind,
          startedAt: startedAt.current,
          recallText,
          textPeeks: peeks,
          ideas:
            kind === 'read'
              ? []
              : ideas.map((i, k) => ({
                  ideaId: i.id,
                  outcome: finalLadders[k]?.outcome ?? 'incorrect',
                  clueLevel: (finalLadders[k]?.recordedLevel ?? 5) as ClueLevel,
                })),
          question: questionResult(),
          tooMuch,
        },
        now(),
      );
      setOutcome(out);
      setPhase('done');
      refresh();
      onDone(out);
    } catch (e) {
      setSaveError((e as Error).message || 'Recall could not save this part.');
      setError(null);
    }
  }

  const dispatch = (k: number, a: LadderAction) => {
    setLadders((prev) => {
      const next = prev.map((s, i) => (i === k ? ladderReducer(s, a) : s));
      if (a.type === 'reread') strategy('reread');
      return next;
    });
  };

  const allChecked = ladders.length > 0 && ladders.every((l) => l.phase === 'done');

  const header = (
    <div className="stack">
      <ProgressBar value={props.progress} label={props.partLabel} />
      <p className="small muted" style={{ margin: 0 }}>
        {doc.title}
      </p>
    </div>
  );

  // ------------------------------------------------------------------ reading
  if (phase === 'reading') {
    const readMode = kind === 'read';
    return (
      <section className="stack-lg" aria-labelledby="chunk-heading">
        {header}
        <h1 id="chunk-heading" ref={headingRef} tabIndex={-1}>
          {readMode ? 'Read this part' : 'Read this part, then hide it'}
        </h1>
        {tooMuchNote ? (
          <p className="banner" role="status">
            {tooMuchNote}
          </p>
        ) : null}
        <div className="card">
          <ReadingText text={chunk.text} />
        </div>
        <div className="tools">
          {canReadAloud() ? (
            <button type="button" className="btn" onClick={toggleSpeak} aria-pressed={speaking}>
              <Icon name={speaking ? 'stop' : 'speaker'} />
              {speaking ? 'Stop reading' : 'Read aloud'}
            </button>
          ) : null}
          {kind !== 'probe' && chunk.ideas.length > 0 ? (
            <button
              type="button"
              className="btn"
              aria-expanded={explain}
              aria-controls="explain-panel"
              onClick={() => {
                setExplain((v) => !v);
                if (!explain) strategy('explain');
              }}
            >
              <Icon name="bulb" />
              {explain ? 'Hide main points' : 'Explain this part'}
            </button>
          ) : null}
          {props.onTooMuch && kind !== 'probe' ? (
            <button
              type="button"
              className="btn"
              onClick={() => void doTooMuch()}
              disabled={tooMuch}
            >
              <Icon name="shrink" />
              Too much text
            </button>
          ) : null}
        </div>
        {explain ? <MainPoints id="explain-panel" ideas={chunk.ideas} /> : null}
        {readMode ? (
          <>
            {question ? (
              <QuestionBlock question={question} answer={answer} onAnswer={setAnswer} textVisible />
            ) : null}
            <button
              type="button"
              className="btn primary block large"
              onClick={() => void save([])}
              disabled={Boolean(question) && answer === null}
            >
              {question && answer === null ? 'Answer the question to continue' : 'Next'}
            </button>
          </>
        ) : (
          <div className="actionbar">
            <button
              type="button"
              className="btn primary block large"
              onClick={() => setPhase('recall')}
            >
              <Icon name="eyeOff" /> I’ve read it — hide the text
            </button>
          </div>
        )}
        {kind === 'probe' ? (
          <p className="small muted">
            Fresh-text check: no hints before you try. Take as long as you like.
          </p>
        ) : null}
      </section>
    );
  }

  // ------------------------------------------------------------------- recall
  if (phase === 'recall') {
    const isReview = kind === 'review';
    return (
      <section className="stack-lg" aria-labelledby="recall-heading">
        {header}
        <h1 id="recall-heading" ref={headingRef} tabIndex={-1}>
          {isReview ? 'What do you remember from this part?' : 'What do you remember?'}
        </h1>
        {isReview ? (
          <p className="muted">
            Before looking: write the{' '}
            {ideas.length === 1 ? 'main point' : `${ideas.length} main points`} you remember from “
            {doc.title}”. There is no time limit.
          </p>
        ) : (
          <p className="muted">
            Write the main ideas in your own words. Spelling and grammar don’t matter. There is no
            time limit.
          </p>
        )}
        <div className="stack">
          <label htmlFor="recall-box">Your words</label>
          <textarea
            id="recall-box"
            value={recallText}
            onChange={(e) => setRecallText(e.target.value.slice(0, 4000))}
            placeholder="Type here…"
            autoCapitalize="sentences"
            spellCheck
            aria-describedby="recall-help"
          />
          <p id="recall-help" className="small muted">
            {settings.inputPreference === 'dictation'
              ? 'To speak instead of typing, tap the microphone on your keyboard. Check the words before you continue.'
              : 'Tip: on iPhone you can tap the microphone on the keyboard to speak instead of typing.'}
          </p>
        </div>
        <div className="actionbar">
          <button type="button" className="btn primary block large" onClick={afterRecall}>
            <Icon name="check" />{' '}
            {recallText.trim() ? 'Check my answer' : 'I can’t remember — help me'}
          </button>
        </div>
        <button
          type="button"
          className="btn secondary block"
          aria-expanded={peeking}
          onClick={() => {
            if (!peeking) {
              setPeeks((n) => n + 1);
              strategy('show_text');
            }
            setPeeking((v) => !v);
          }}
        >
          <Icon name={peeking ? 'eyeOff' : 'eye'} /> {peeking ? 'Hide the text again' : 'Show text'}
        </button>
        {peeking ? (
          <div className="card" aria-label="The text">
            <ReadingText text={chunk.text} />
          </div>
        ) : null}
      </section>
    );
  }

  // ----------------------------------------------------------------- question
  if (phase === 'question' && question) {
    const answered = answer !== null;
    return (
      <section className="stack-lg" aria-labelledby="q-heading">
        {header}
        <h1 id="q-heading" ref={headingRef} tabIndex={-1}>
          A quick question
        </h1>
        <QuestionBlock question={question} answer={answer} onAnswer={setAnswer} />
        <button
          type="button"
          className="btn primary block large"
          disabled={!answered}
          onClick={() => (ideas.length > 0 ? setPhase('check') : void save([]))}
        >
          {answered ? 'Continue' : 'Choose an answer to continue'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => (ideas.length > 0 ? setPhase('check') : void save([]))}
        >
          Skip this question
        </button>
      </section>
    );
  }

  // -------------------------------------------------------------------- check
  if (phase === 'check') {
    const k = Math.min(ideaIndex, ideas.length - 1);
    const idea = ideas[k] as KeyIdeaSnapshot;
    const state = ladders[k] as LadderState;
    return (
      <section className="stack-lg" aria-labelledby="check-heading">
        {header}
        <h1 id="check-heading" ref={headingRef} tabIndex={-1}>
          Check point {k + 1} of {ideas.length}
        </h1>
        <details className="card" open>
          <summary>What you wrote</summary>
          <p style={{ whiteSpace: 'pre-wrap' }}>
            {recallText.trim() || '(nothing yet — that’s fine)'}
          </p>
        </details>
        <IdeaLadder
          idea={idea}
          state={state}
          chunkText={chunk.text}
          recallText={recallText}
          onAction={(a) => dispatch(k, a)}
        />
        {state.phase === 'done' ? (
          k < ideas.length - 1 ? (
            <button
              type="button"
              className="btn primary block large"
              onClick={() => setIdeaIndex(k + 1)}
            >
              Next point
            </button>
          ) : (
            <button
              type="button"
              className="btn primary block large"
              onClick={() => void save(ladders)}
              disabled={!allChecked}
            >
              Save and continue
            </button>
          )
        ) : null}
      </section>
    );
  }

  // ------------------------------------------------------------------- saving
  if (phase === 'saving') {
    return (
      <section className="stack-lg" aria-busy={!saveError}>
        {header}
        {saveError ? (
          <div className="stack">
            <p className="banner error" role="alert">
              {saveError}
            </p>
            <button type="button" className="btn primary block" onClick={() => void save(ladders)}>
              Try saving again
            </button>
          </div>
        ) : (
          <p role="status">Saving…</p>
        )}
      </section>
    );
  }

  // --------------------------------------------------------------------- done
  if (phase === 'done' && outcome) {
    return (
      <DoneSummary
        headingRef={headingRef}
        kind={kind}
        ideas={ideas}
        ladders={ladders}
        question={question}
        answer={answer}
        actions={props.doneActions(outcome)}
      />
    );
  }
  return null;
}

function MainPoints({ ideas, id }: { ideas: KeyIdeaSnapshot[]; id?: string }) {
  const heuristic = ideas.some((i) => i.origin === 'heuristic');
  return (
    <div className="card soft stack" id={id}>
      <h2>{heuristic ? 'Key sentences' : 'Main points'}</h2>
      <p className="small muted">
        {heuristic
          ? 'Picked automatically by counting important words (not AI). The exact sentences are shown.'
          : 'Written for this passage. Each one is backed by the sentence shown from the text.'}
      </p>
      <ol className="stack" style={{ paddingLeft: '1.2em', margin: 0 }}>
        {ideas.map((i) => (
          <li key={i.id}>
            {i.origin === 'authored' ? <p style={{ marginBottom: 6 }}>{i.text}</p> : null}
            <div className="quote">{i.cues.sentence}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function QuestionBlock({
  question,
  answer,
  onAnswer,
  textVisible,
}: {
  question: QuestionSnapshot;
  answer: number | null;
  onAnswer: (n: number) => void;
  textVisible?: boolean;
}) {
  const answered = answer !== null;
  return (
    <div className="stack">
      <p style={{ fontWeight: 600, fontSize: '1.1rem' }} id={`q-${question.id}`}>
        {question.prompt}
      </p>
      {textVisible ? <p className="small muted">You can look at the text above.</p> : null}
      <div className="choice-list" role="radiogroup" aria-labelledby={`q-${question.id}`}>
        {question.options.map((o, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={answer === i}
            className={`choice ${answered && i === question.answerIndex ? 'correct' : ''}`}
            onClick={() => !answered && onAnswer(i)}
            disabled={answered && answer !== i && i !== question.answerIndex}
          >
            <span aria-hidden="true">{String.fromCharCode(65 + i)}.</span> {o}
          </button>
        ))}
      </div>
      {answered ? (
        <div className={`card ${answer === question.answerIndex ? 'good' : 'note'}`} role="status">
          <p style={{ fontWeight: 600 }}>
            {answer === question.answerIndex
              ? 'That’s right.'
              : `Not quite — the answer is “${question.options[question.answerIndex]}”.`}
          </p>
          <div className="quote">{question.explanationSpan}</div>
        </div>
      ) : null}
    </div>
  );
}

function IdeaLadder({
  idea,
  state,
  chunkText,
  recallText,
  onAction,
}: {
  idea: KeyIdeaSnapshot;
  state: LadderState;
  chunkText: string;
  recallText: string;
  onAction: (a: LadderAction) => void;
}) {
  const { settings } = useApp();
  const revealed = (
    <div className="stack">
      <div className="card good">
        <span className="small muted">The point</span>
        <p style={{ fontWeight: 600, margin: 0 }}>{idea.text}</p>
      </div>
      <div>
        <span className="small muted">From the text</span>
        <div className="quote">{idea.cues.sentence}</div>
      </div>
    </div>
  );

  if (state.phase === 'ask') {
    return (
      <div className="stack" aria-live="polite">
        <div className="cue">
          <span className="cue-label">{LEVEL_LABEL[1]}</span>
          {idea.cues.structural}
        </div>
        {settings.experimentalScorer ? (
          <ExperimentalHints idea={idea} recallText={recallText} />
        ) : null}
        <p style={{ fontWeight: 600 }}>Is this point in what you wrote?</p>
        <div className="stack">
          <button
            type="button"
            className="btn good block"
            onClick={() => onAction({ type: 'covered', answer: 'yes' })}
          >
            Yes, I wrote about it
          </button>
          <button
            type="button"
            className="btn secondary block"
            onClick={() => onAction({ type: 'covered', answer: 'partly' })}
          >
            Partly
          </button>
          <button
            type="button"
            className="btn secondary block"
            onClick={() => onAction({ type: 'covered', answer: 'no' })}
          >
            No, or I’m not sure — give me a hint
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onAction({ type: 'remember_now' })}
          >
            I didn’t write it, but I remember it now
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === 'cue') {
    return (
      <div className="stack" aria-live="polite">
        <div className="cue">
          <span className="cue-label">{LEVEL_LABEL[state.cueLevel]}</span>
          {cueText(idea, state.cueLevel, chunkText)}
        </div>
        <p className="muted">Take your time. Think about it, then choose.</p>
        <div className="stack">
          <button
            type="button"
            className="btn good block"
            onClick={() => onAction({ type: 'remember_now' })}
          >
            I remember it now — show me
          </button>
          <button
            type="button"
            className="btn secondary block"
            onClick={() => onAction({ type: 'another_hint' })}
          >
            {state.cueLevel >= 3 ? 'Show me the sentence' : 'Another hint'}
          </button>
          <button type="button" className="btn ghost" onClick={() => onAction({ type: 'reread' })}>
            Read the whole part again
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === 'verify') {
    return (
      <div className="stack" aria-live="polite">
        {revealed}
        <p style={{ fontWeight: 600 }}>
          {state.claimed && state.creditLevel === 0
            ? 'Does this match what you wrote?'
            : 'Was that what you remembered?'}
        </p>
        <div className="stack">
          <button
            type="button"
            className="btn good block"
            onClick={() => onAction({ type: 'match', answer: 'yes' })}
          >
            Yes, it matches
          </button>
          <button
            type="button"
            className="btn secondary block"
            onClick={() => onAction({ type: 'match', answer: 'partly' })}
          >
            Partly
          </button>
          <button
            type="button"
            className="btn secondary block"
            onClick={() => onAction({ type: 'match', answer: 'no' })}
          >
            No, mine was different
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === 'study') {
    return (
      <div className="stack" aria-live="polite">
        {state.cueLevel === 5 ? (
          <div className="card">
            <span className="small muted">The whole part</span>
            <ReadingText text={chunkText} />
          </div>
        ) : null}
        {revealed}
        <p className="muted">
          Read it slowly. It will come up again in a review, which helps it stick.
        </p>
        <div className="stack">
          <button
            type="button"
            className="btn primary block"
            onClick={() => onAction({ type: 'continue' })}
          >
            Got it
          </button>
          {state.cueLevel < 5 ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => onAction({ type: 'reread' })}
            >
              Read the whole part again
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // done
  return (
    <div className="stack" aria-live="polite">
      <p className="card good" role="status" style={{ fontWeight: 600 }}>
        {ladderFeedback(state)}
      </p>
      {revealed}
    </div>
  );
}

function DoneSummary({
  headingRef,
  kind,
  ideas,
  ladders,
  question,
  answer,
  actions,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  kind: AttemptKind;
  ideas: KeyIdeaSnapshot[];
  ladders: LadderState[];
  question: QuestionSnapshot | null;
  answer: number | null;
  actions: React.ReactNode;
}) {
  const own = ladders.filter((l) => l.outcome === 'correct' && l.recordedLevel === 0).length;
  const withHelp = ladders.filter(
    (l) => l.outcome !== null && !(l.outcome === 'correct' && l.recordedLevel === 0),
  ).length;
  const message = useMemo(() => {
    if (kind === 'read') return 'Part finished.';
    if (ideas.length === 0) return 'Saved.';
    if (own === ideas.length)
      return ideas.length === 1
        ? 'You remembered the main point on your own.'
        : `You remembered all ${ideas.length} points on your own.`;
    if (own > 0)
      return `You remembered ${own} of ${ideas.length} points on your own. The others will come back in a review.`;
    return 'Well done for working through it. These points will come back in a review, which is how they stick.';
  }, [kind, ideas.length, own]);
  return (
    <section className="stack-lg" aria-labelledby="done-heading">
      <h1 id="done-heading" ref={headingRef} tabIndex={-1}>
        {message}
      </h1>
      {kind !== 'read' && withHelp > 0 && own > 0 ? (
        <p className="muted">Hints are there to help — using them is part of practice.</p>
      ) : null}
      {question && answer !== null ? (
        <p className="muted">
          Question:{' '}
          {answer === question.answerIndex ? 'answered correctly.' : 'now you know the answer.'}
        </p>
      ) : null}
      {kind === 'learn' ? (
        <p className="muted">
          These points are saved. You’ll see them again tomorrow under Reviews.
        </p>
      ) : null}
      <div className="stack">{actions}</div>
    </section>
  );
}
