/**
 * The core flow for one part (chunk): read → hide → recall in your own words →
 * optional question → per-point self-check with the clue ladder → save.
 *
 * A direct port of apps/web/src/components/ChunkFlow.tsx: same steps, same
 * buttons, same wording. All scoring, scheduling and ladder rules come from
 * @recall/core.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, AppState, Text, View } from 'react-native';
import {
  cueText,
  initialLadder,
  ladderFeedback,
  ladderReducer,
  logStrategy,
  MAX_RECALL_CHARS,
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
  type StrategyName,
} from '@recall/core';
import { useApp } from '../lib/app-context';
import { canReadAloud, speak, stopSpeaking } from '../lib/speech';
import {
  Banner,
  Button,
  Card,
  Choice,
  Cue,
  Disclosure,
  Field,
  Heading,
  ProgressBar,
  Quote,
  RadioGroup,
  ReadingText,
  Stack,
  T,
  ToolRow,
  ToolSlot,
  useStepFocus,
} from './ui';

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
  doneActions: (outcome: AttemptOutcome) => ReactNode;
}

const LEVEL_LABEL: Record<ClueLevel, string> = {
  0: '',
  1: 'Starting point',
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
  const { store, settings, now, refresh, setError, palette } = useApp();
  const { kind, sessionId, document: doc, onDone } = props;
  const [chunk, setChunk] = useState(props.chunk);
  const ideas = kind === 'review' ? props.ideas : chunk.ideas;
  const startedAt = useRef(now().toISOString());
  // Generated once per part, so a repeated tap on "Save" can never record the attempt twice.
  const attemptId = useRef(newId('att'));
  const resumable = Boolean(props.draft && props.draft.chunkId === chunk.id && props.draft.phase !== 'reading');
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
  const headingRef = useStepFocus(`${phase}:${ideaIndex}`);
  /** The draft write in flight, so saving the attempt never races with it. */
  const draftWrite = useRef<Promise<void> | null>(null);

  useEffect(() => () => stopSpeaking(), []);

  // Keep a draft so the app can be closed and resumed mid-part.
  const currentDraft = (): SessionDraft | null =>
    phase === 'saving' || phase === 'done'
      ? null
      : { documentId: doc.id, chunkId: chunk.id, phase: phase === 'check' ? 'check' : phase, recallText, kind };
  const latestDraft = useRef(currentDraft);
  latestDraft.current = currentDraft;

  const writeDraft = (draft: SessionDraft) => {
    const p = (draftWrite.current ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => saveDraft(store, sessionId, draft, now()))
      .catch(() => undefined);
    draftWrite.current = p;
    return p;
  };

  useEffect(() => {
    const draft = latestDraft.current();
    if (!draft) return;
    const t = setTimeout(() => void writeDraft(draft), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recallText, store, sessionId, doc.id, chunk.id, kind]);

  // Save the draft straight away if the app is sent to the background (it may be closed there).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      const draft = latestDraft.current();
      if (draft) void writeDraft(draft);
      if (state === 'background') {
        stopSpeaking();
        setSpeaking(false);
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, sessionId]);

  // ...and when leaving this part with "Pause" or the back gesture, so the last words typed are kept.
  useEffect(
    () => () => {
      const draft = latestDraft.current();
      // Refresh afterwards so Home can offer "Continue where you left off" straight away.
      if (draft) void writeDraft(draft).then(refresh);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const strategy = (s: StrategyName) => void logStrategy(store, sessionId, s, chunk.id, now()).catch(() => undefined);

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    strategy('read_aloud');
    void speak(chunk.text, () => setSpeaking(false)).catch(() => setSpeaking(false));
  };

  const doTooMuch = async () => {
    if (!props.onTooMuch) return;
    setTooMuch(true);
    strategy('too_much');
    const replacement = await props.onTooMuch();
    if (replacement && replacement.id !== chunk.id && replacement.wordCount < chunk.wordCount) {
      setChunk(replacement);
      setLadders(replacement.ideas.map(() => initialLadder()));
      setTooMuchNote('This part is now shorter. Later parts will be shorter too.');
    } else {
      setTooMuchNote('The next parts will be shorter. This part could not be split without breaking up an idea.');
    }
  };

  const afterRecall = () => {
    stopSpeaking();
    setSpeaking(false);
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
    stopSpeaking();
    setSpeaking(false);
    setPhase('saving');
    setSaveError(null);
    try {
      if (draftWrite.current) await draftWrite.current;
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
    if (a.type === 'reread') strategy('reread');
    setLadders((prev) => prev.map((s, i) => (i === k ? ladderReducer(s, a) : s)));
  };

  const allChecked = ladders.length > 0 && ladders.every((l) => l.phase === 'done');

  const header = (
    <Stack gap={8}>
      <ProgressBar value={props.progress} label={props.partLabel} />
      <T variant="smallMuted">{doc.title}</T>
    </Stack>
  );

  // ------------------------------------------------------------------ reading
  if (phase === 'reading') {
    const readMode = kind === 'read';
    return (
      <Stack gap={20}>
        {header}
        <Heading ref={headingRef}>{readMode ? 'Read this part' : 'Read this part, then hide it'}</Heading>
        {tooMuchNote ? <Banner message={tooMuchNote} /> : null}
        <Card>
          <ReadingText text={chunk.text} />
        </Card>
        <ToolRow>
          {canReadAloud() ? (
            <ToolSlot>
              <Button
                variant="tool"
                icon={speaking ? 'stop' : 'speaker'}
                label={speaking ? 'Stop reading' : 'Read aloud'}
                selected={speaking}
                onPress={toggleSpeak}
              />
            </ToolSlot>
          ) : null}
          {kind !== 'probe' && chunk.ideas.length > 0 ? (
            <ToolSlot>
              <Button
                variant="tool"
                icon="bulb"
                label={explain ? 'Hide main points' : 'Explain this part'}
                expanded={explain}
                onPress={() => {
                  setExplain((v) => !v);
                  if (!explain) strategy('explain');
                }}
              />
            </ToolSlot>
          ) : null}
          {props.onTooMuch && kind !== 'probe' ? (
            <ToolSlot>
              <Button variant="tool" icon="shrink" label="Too much text" onPress={() => void doTooMuch()} disabled={tooMuch} />
            </ToolSlot>
          ) : null}
        </ToolRow>
        {explain ? <MainPoints ideas={chunk.ideas} /> : null}
        {readMode ? (
          <>
            {question ? <QuestionBlock question={question} answer={answer} onAnswer={setAnswer} textVisible /> : null}
            <Button
              variant="primary"
              large
              label={question && answer === null ? 'Answer the question to continue' : 'Next'}
              onPress={() => void save([])}
              disabled={Boolean(question) && answer === null}
            />
          </>
        ) : (
          <Button variant="primary" large icon="eyeOff" label="I’ve read it — hide the text" onPress={() => setPhase('recall')} />
        )}
        {kind === 'probe' ? (
          <T variant="smallMuted">Fresh-text check: no hints before you try. Take as long as you like.</T>
        ) : null}
      </Stack>
    );
  }

  // ------------------------------------------------------------------- recall
  if (phase === 'recall') {
    const isReview = kind === 'review';
    return (
      <Stack gap={20}>
        {header}
        <Heading ref={headingRef}>{isReview ? 'What do you remember from this part?' : 'What do you remember?'}</Heading>
        {isReview ? (
          <T variant="muted">
            Before looking: write the {ideas.length === 1 ? 'main point' : `${ideas.length} main points`} you remember from “
            {doc.title}”. There is no time limit.
          </T>
        ) : (
          <T variant="muted">
            Write the main ideas in your own words. Spelling and grammar don’t matter. There is no time limit.
          </T>
        )}
        <Field
          label="Your words"
          multiline
          value={recallText}
          onChangeText={(v) => setRecallText(v.slice(0, MAX_RECALL_CHARS))}
          maxLength={MAX_RECALL_CHARS}
          placeholder="Type here…"
          autoCapitalize="sentences"
          autoCorrect
          spellCheck
          help={
            settings.inputPreference === 'dictation'
              ? 'To speak instead of typing, tap the microphone on your keyboard. Check the words before you continue.'
              : 'Tip: on iPhone you can tap the microphone on the keyboard to speak instead of typing.'
          }
        />
        <Stack>
          <Button
            variant="primary"
            large
            icon="check"
            label={recallText.trim() ? 'Check my answer' : 'I can’t remember — help me'}
            onPress={afterRecall}
          />
          <Button
            variant="secondary"
            icon={peeking ? 'eyeOff' : 'eye'}
            label={peeking ? 'Hide the text again' : 'Show text'}
            expanded={peeking}
            onPress={() => {
              if (!peeking) {
                setPeeks((n) => n + 1);
                strategy('show_text');
              }
              setPeeking((v) => !v);
            }}
          />
        </Stack>
        {peeking ? (
          <Card accessibilityLabel="The text">
            <ReadingText text={chunk.text} />
          </Card>
        ) : null}
      </Stack>
    );
  }

  // ----------------------------------------------------------------- question
  if (phase === 'question' && question) {
    const answered = answer !== null;
    const next = () => (ideas.length > 0 ? setPhase('check') : void save([]));
    return (
      <Stack gap={20}>
        {header}
        <Heading ref={headingRef}>A quick question</Heading>
        <QuestionBlock question={question} answer={answer} onAnswer={setAnswer} />
        <Button
          variant="primary"
          large
          disabled={!answered}
          label={answered ? 'Continue' : 'Choose an answer to continue'}
          onPress={next}
        />
        <Button variant="ghost" label="Skip this question" onPress={next} />
      </Stack>
    );
  }

  // -------------------------------------------------------------------- check
  if (phase === 'check') {
    const k = Math.min(ideaIndex, ideas.length - 1);
    const idea = ideas[k] as KeyIdeaSnapshot;
    const state = ladders[k] as LadderState;
    return (
      <Stack gap={20}>
        {header}
        <Heading ref={headingRef}>
          Check point {k + 1} of {ideas.length}
        </Heading>
        <Card>
          <Disclosure summary="What you wrote">
            <T selectable>{recallText.trim() || '(nothing yet — that’s fine)'}</T>
          </Disclosure>
        </Card>
        <IdeaLadder idea={idea} state={state} chunkText={chunk.text} onAction={(a) => dispatch(k, a)} />
        {state.phase === 'done' ? (
          k < ideas.length - 1 ? (
            <Button variant="primary" large label="Next point" onPress={() => setIdeaIndex(k + 1)} />
          ) : (
            <Button variant="primary" large label="Save and continue" onPress={() => void save(ladders)} disabled={!allChecked} />
          )
        ) : null}
      </Stack>
    );
  }

  // ------------------------------------------------------------------- saving
  if (phase === 'saving') {
    return (
      <Stack gap={20}>
        {header}
        {saveError ? (
          <Stack>
            <Banner kind="error" message={saveError} />
            <Button variant="primary" label="Try saving again" onPress={() => void save(ladders)} />
          </Stack>
        ) : (
          <Text accessibilityRole="text" style={{ color: palette.text }}>
            Saving…
          </Text>
        )}
      </Stack>
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

function MainPoints({ ideas }: { ideas: KeyIdeaSnapshot[] }) {
  const heuristic = ideas.some((i) => i.origin === 'heuristic');
  return (
    <Card variant="soft">
      <Heading level={2}>{heuristic ? 'Key sentences' : 'Main points'}</Heading>
      <T variant="smallMuted">
        {heuristic
          ? 'Picked automatically by counting important words (not AI). The exact sentences are shown.'
          : 'Written for this passage. Each one is backed by the sentence shown from the text.'}
      </T>
      <Stack>
        {ideas.map((i, n) => (
          <View key={i.id} style={{ flexDirection: 'row', gap: 8 }}>
            <T variant="bold">{`${n + 1}.`}</T>
            <View style={{ flex: 1, gap: 6 }}>
              {i.origin === 'authored' ? <T>{i.text}</T> : null}
              <Quote>{i.cues.sentence}</Quote>
            </View>
          </View>
        ))}
      </Stack>
    </Card>
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
  const right = answer === question.answerIndex;
  return (
    <Stack>
      <T variant="lead">{question.prompt}</T>
      {textVisible ? <T variant="smallMuted">You can look at the text above.</T> : null}
      <RadioGroup label={question.prompt}>
        {question.options.map((o, i) => (
          <Choice
            key={i}
            prefix={`${String.fromCharCode(65 + i)}.`}
            label={o}
            accessibilityLabel={`${String.fromCharCode(65 + i)}. ${o}`}
            checked={answer === i}
            correct={answered && i === question.answerIndex}
            onPress={() => {
              if (!answered) onAnswer(i);
            }}
            disabled={answered && answer !== i && i !== question.answerIndex}
          />
        ))}
      </RadioGroup>
      {answered ? (
        <Card variant={right ? 'good' : 'note'}>
          <Feedback
            text={right ? 'That’s right.' : `Not quite — the answer is “${question.options[question.answerIndex]}”.`}
          />
          <Quote>{question.explanationSpan}</Quote>
        </Card>
      ) : null}
    </Stack>
  );
}

/** Bold feedback line that is announced to VoiceOver when it appears. */
function Feedback({ text }: { text: string }) {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(text);
  }, [text]);
  return <T variant="bold">{text}</T>;
}

function IdeaLadder({
  idea,
  state,
  chunkText,
  onAction,
}: {
  idea: KeyIdeaSnapshot;
  state: LadderState;
  chunkText: string;
  onAction: (a: LadderAction) => void;
}) {
  // Announce each new step of the ladder (the web app uses aria-live="polite").
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const msg =
      state.phase === 'cue'
        ? `${LEVEL_LABEL[state.cueLevel]}. ${cueText(idea, state.cueLevel, chunkText)}`
        : state.phase === 'verify' || state.phase === 'study'
          ? `The point: ${idea.text}`
          : state.phase === 'done'
            ? ladderFeedback(state)
            : '';
    if (msg) AccessibilityInfo.announceForAccessibility(msg);
  }, [state.phase, state.cueLevel, idea, chunkText, state]);

  const revealed = (
    <Stack>
      <Card variant="good" gap={4}>
        <T variant="smallMuted">The point</T>
        <T variant="bold" selectable>
          {idea.text}
        </T>
      </Card>
      <Stack gap={4}>
        <T variant="smallMuted">From the text</T>
        <Quote>{idea.cues.sentence}</Quote>
      </Stack>
    </Stack>
  );

  if (state.phase === 'ask') {
    return (
      <Stack>
        <Cue label={LEVEL_LABEL[1]}>{idea.cues.structural}</Cue>
        <T variant="bold">Is this point in what you wrote?</T>
        <Stack>
          <Button variant="good" label="Yes, I wrote about it" onPress={() => onAction({ type: 'covered', answer: 'yes' })} />
          <Button variant="secondary" label="Partly" onPress={() => onAction({ type: 'covered', answer: 'partly' })} />
          <Button
            variant="secondary"
            label="No, or I’m not sure — give me a hint"
            onPress={() => onAction({ type: 'covered', answer: 'no' })}
          />
          <Button variant="ghost" label="I remember it now — show me" onPress={() => onAction({ type: 'remember_now' })} />
        </Stack>
      </Stack>
    );
  }

  if (state.phase === 'cue') {
    return (
      <Stack>
        <Cue label={LEVEL_LABEL[state.cueLevel]}>{cueText(idea, state.cueLevel, chunkText)}</Cue>
        <T variant="muted">Take your time. Think about it, then choose.</T>
        <Stack>
          <Button variant="good" label="I remember it now — show me" onPress={() => onAction({ type: 'remember_now' })} />
          <Button
            variant="secondary"
            label={state.cueLevel >= 3 ? 'Show me the sentence' : 'Another hint'}
            onPress={() => onAction({ type: 'another_hint' })}
          />
          <Button variant="ghost" label="Read the whole part again" onPress={() => onAction({ type: 'reread' })} />
        </Stack>
      </Stack>
    );
  }

  if (state.phase === 'verify') {
    return (
      <Stack>
        {revealed}
        <T variant="bold">
          {state.claimed && state.creditLevel === 0 ? 'Does this match what you wrote?' : 'Was that what you remembered?'}
        </T>
        <Stack>
          <Button variant="good" label="Yes, it matches" onPress={() => onAction({ type: 'match', answer: 'yes' })} />
          <Button variant="secondary" label="Partly" onPress={() => onAction({ type: 'match', answer: 'partly' })} />
          <Button variant="secondary" label="No, mine was different" onPress={() => onAction({ type: 'match', answer: 'no' })} />
        </Stack>
      </Stack>
    );
  }

  if (state.phase === 'study') {
    return (
      <Stack>
        {state.cueLevel === 5 ? (
          <Card>
            <T variant="smallMuted">The whole part</T>
            <ReadingText text={chunkText} />
          </Card>
        ) : null}
        {revealed}
        <T variant="muted">Read it slowly. It will come up again in a review, which helps it stick.</T>
        <Stack>
          <Button variant="primary" label="Got it" onPress={() => onAction({ type: 'continue' })} />
          {state.cueLevel < 5 ? (
            <Button variant="ghost" label="Read the whole part again" onPress={() => onAction({ type: 'reread' })} />
          ) : null}
        </Stack>
      </Stack>
    );
  }

  // done
  return (
    <Stack>
      <Card variant="good">
        <T variant="bold">{ladderFeedback(state)}</T>
      </Card>
      {revealed}
    </Stack>
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
  headingRef: ReturnType<typeof useStepFocus>;
  kind: AttemptKind;
  ideas: KeyIdeaSnapshot[];
  ladders: LadderState[];
  question: QuestionSnapshot | null;
  answer: number | null;
  actions: ReactNode;
}) {
  const own = ladders.filter((l) => l.outcome === 'correct' && l.recordedLevel === 0).length;
  const withHelp = ladders.filter((l) => l.outcome !== null && !(l.outcome === 'correct' && l.recordedLevel === 0)).length;
  const message = useMemo(() => {
    if (kind === 'read') return 'Part finished.';
    if (ideas.length === 0) return 'Saved.';
    if (own === ideas.length)
      return ideas.length === 1 ? 'You remembered the main point on your own.' : `You remembered all ${ideas.length} points on your own.`;
    if (own > 0) return `You remembered ${own} of ${ideas.length} points on your own. The others will come back in a review.`;
    return 'Well done for working through it. These points will come back in a review, which is how they stick.';
  }, [kind, ideas.length, own]);
  return (
    <Stack gap={20}>
      <Heading ref={headingRef}>{message}</Heading>
      {kind !== 'read' && withHelp > 0 && own > 0 ? (
        <T variant="muted">Hints are there to help — using them is part of practice.</T>
      ) : null}
      {question && answer !== null ? (
        <T variant="muted">Question: {answer === question.answerIndex ? 'answered correctly.' : 'now you know the answer.'}</T>
      ) : null}
      {kind === 'learn' ? <T variant="muted">These points are saved. You’ll see them again tomorrow under Reviews.</T> : null}
      <Stack>{actions}</Stack>
    </Stack>
  );
}
