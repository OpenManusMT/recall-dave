import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { FONT_SCALES, finishSession, getActiveSession, readSnapshot } from '@recall/core';
import { useApp } from '../lib/app-context';
import { closeScreen, goHome } from '../lib/navigation';
import { Button, Card, Choice, Heading, RadioGroup, ReadingText, Screen, Stack, T, useStepFocus } from '../components/ui';

const ALL_EDGES = ['top', 'bottom', 'left', 'right'] as const;

function Steps() {
  const { settings, updateSettings } = useApp();
  const [step, setStep] = useState(0);
  const ref = useStepFocus(step);
  const done = async () => {
    await updateSettings({ onboardingDone: true });
    closeScreen();
  };

  if (step === 0) {
    return (
      <Stack gap={20}>
        <Heading ref={ref}>Welcome to Recall</Heading>
        <T>Recall helps you read in small parts and hold on to the main points.</T>
        <View style={{ gap: 10 }}>
          {[
            'Read a short part. Take as long as you like.',
            'Hide it and write what you remember, in your own words.',
            'Check against the main points, with hints if you want them.',
            'The points come back another day, which helps them stick.',
          ].map((t, i) => (
            <View key={t} style={{ flexDirection: 'row', gap: 8 }} accessible accessibilityLabel={`${i + 1}. ${t}`}>
              <T variant="bold">{`${i + 1}.`}</T>
              <View style={{ flex: 1 }}>
                <T>{t}</T>
              </View>
            </View>
          ))}
        </View>
        <T variant="muted">No account. Nothing leaves this device. You can stop at any time.</T>
        <Stack>
          <Button variant="primary" large label="Continue" onPress={() => setStep(1)} />
          <Button variant="ghost" label="Skip and start" onPress={() => void done()} />
        </Stack>
      </Stack>
    );
  }
  if (step === 1) {
    return (
      <Stack gap={20}>
        <Heading ref={ref}>Choose a comfortable text size</Heading>
        <Card>
          <ReadingText text="The kettle clicked off. Steam drifted past the window as the morning light came in." />
        </Card>
        <RadioGroup label="Text size">
          {FONT_SCALES.map((f) => (
            <Choice
              key={f.value}
              label={f.label}
              checked={settings.fontScale === f.value}
              onPress={() => void updateSettings({ fontScale: f.value })}
            />
          ))}
        </RadioGroup>
        <T variant="smallMuted">Your iPhone’s own text size (Settings › Display & Brightness › Text Size) is respected as well.</T>
        <Button variant="primary" large label="Continue" onPress={() => setStep(2)} />
      </Stack>
    );
  }
  return (
    <Stack gap={20}>
      <Heading ref={ref}>How would you like to answer?</Heading>
      <RadioGroup label="Answer by">
        <Choice
          label="Typing"
          checked={settings.inputPreference === 'typing'}
          onPress={() => void updateSettings({ inputPreference: 'typing' })}
        />
        <Choice
          label="Speaking, using the microphone on the iPhone keyboard"
          checked={settings.inputPreference === 'dictation'}
          onPress={() => void updateSettings({ inputPreference: 'dictation' })}
        />
      </RadioGroup>
      <T variant="smallMuted">You can always type. You can change this later in Settings.</T>
      <Button variant="primary" large label="Start" onPress={() => void done()} />
    </Stack>
  );
}

export function Onboarding() {
  return (
    <Screen edges={[...ALL_EDGES]}>
      <Steps />
    </Screen>
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
    <Screen edges={[...ALL_EDGES]}>
      <Heading>Session finished</Heading>
      {summary ? (
        <Card variant="good">
          {summary.parts + summary.reviews === 0 ? (
            <T>Nothing was saved in this session. That’s fine — come back whenever you like.</T>
          ) : (
            <>
              <T>
                You read {summary.parts} {summary.parts === 1 ? 'part' : 'parts'}
                {summary.reviews > 0 ? ` and did ${summary.reviews} ${summary.reviews === 1 ? 'review' : 'reviews'}` : ''}.
              </T>
              {summary.points > 0 ? (
                <T>
                  You checked {summary.points} {summary.points === 1 ? 'point' : 'points'}; {summary.own} on your own.
                </T>
              ) : null}
            </>
          )}
        </Card>
      ) : null}
      <T variant="muted">Your progress is saved on this device. The points will come back under Reviews when they are due.</T>
      <Button variant="primary" large label="Back to home" onPress={goHome} />
    </Screen>
  );
}
