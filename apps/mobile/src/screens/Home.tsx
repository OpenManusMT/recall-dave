import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  computeInsights,
  describeDue,
  dueReviewGroups,
  getActiveSession,
  nextReviewAt,
  readSnapshot,
  suggestNextPassage,
  suggestNextProbe,
  type Metric,
} from '@recall/core';
import { ALL_PASSAGES, LIBRARY_PASSAGES } from '@recall/content';
import { useApp } from '../lib/app-context';
import { useFocusedData } from '../lib/navigation';
import { Banner, Button, Card, Heading, Screen, Stack, T } from '../components/ui';

export function Home() {
  const { store, settings, now, dataVersion, persistence, palette, type } = useApp();
  const data = useFocusedData(async () => {
    const snap = await readSnapshot(store);
    const groups = await dueReviewGroups(store, now());
    const active = await getActiveSession(store);
    const activeDoc = active?.draft ? snap.documents.find((d) => d.id === active.draft?.documentId) : undefined;
    return {
      due: groups.reduce((n, g) => n + g.ideas.length, 0),
      dueParts: groups.length,
      next: await nextReviewAt(store, now()),
      active,
      activeDoc,
      suggestion: suggestNextPassage(LIBRARY_PASSAGES, snap.documents),
      probe: suggestNextProbe(ALL_PASSAGES, snap.documents),
      insights: computeInsights({ attempts: snap.attempts, reviewLog: snap.reviewLog, settings }, now()),
    };
  }, [store, now, dataVersion, settings]);

  if (!data) {
    return (
      <Screen>
        <T>Loading…</T>
      </Screen>
    );
  }

  const resume = () => {
    const d = data.activeDoc;
    if (!d) return;
    const readQ = data.active?.mode === 'read' ? '?mode=read' : '';
    if (data.active?.draft?.kind === 'review') router.push('/review-run');
    else if (d.passageId) router.push(`/${d.provenance === 'probe' ? 'probe' : 'read'}/${d.passageId}${readQ}`);
    else router.push(`/doc/${d.id}${readQ}`);
  };

  const startSessionNow = () => {
    if (data.due > 0) router.push('/review-run?then=read');
    else if (data.suggestion) router.push(`/read/${data.suggestion.id}`);
    else router.navigate('/library');
  };

  const { practised } = data.insights;
  const tile = (key: string, label: string, display: string, unmeasured: boolean) => (
    <Pressable
      key={key}
      onPress={() => router.navigate('/progress')}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${display}`}
      accessibilityHint="Opens Progress"
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: 150,
        minHeight: 88,
        backgroundColor: palette.surface,
        borderColor: palette.border,
        borderWidth: palette.highContrast ? 2 : 1,
        borderRadius: 14,
        padding: 16,
        gap: 2,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <T variant="smallMuted">{label}</T>
      <Text
        style={{
          color: unmeasured ? palette.textMuted : palette.text,
          fontSize: unmeasured ? type.body : Math.round(type.body * 1.5),
          fontWeight: unmeasured ? '600' : '700',
        }}
      >
        {display}
      </Text>
    </Pressable>
  );

  return (
    <Screen>
      <Stack gap={2}>
        <Heading>Recall</Heading>
        <T variant="muted">Read a little, remember the main points, come back later.</T>
      </Stack>

      {persistence === 'memory-only' ? (
        <Banner message="Recall could not open its storage on this iPhone. You can still read, but progress will be lost when you close the app." />
      ) : null}

      {data.active?.draft && data.activeDoc ? (
        <Card variant="soft">
          <T variant="bold">You were part-way through “{data.activeDoc.title}”.</T>
          <Button variant="primary" large label="Continue where you left off" onPress={resume} />
        </Card>
      ) : null}

      <Stack>
        <Button variant="primary" large label="Start a session" iconAfter="next" onPress={startSessionNow} />
        <T variant="smallMuted">
          {data.due > 0
            ? `Starts with ${data.due === 1 ? '1 point' : `${data.due} points`} to remember again, then something new.`
            : data.suggestion
              ? `Next up: “${data.suggestion.title}”.`
              : ''}
        </T>
        <Button variant="secondary" icon="book" label="Choose something to read" onPress={() => router.navigate('/library')} />
      </Stack>

      <Card>
        <Heading level={2}>Reviews</Heading>
        {data.due > 0 ? (
          <>
            <T>{data.due === 1 ? '1 point is' : `${data.due} points are`} ready to remember again.</T>
            <Button variant="good" icon="review" label="Do reviews only" onPress={() => router.push('/review-run')} />
          </>
        ) : (
          <T variant="muted">
            {data.next ? `Nothing due now. Next review ${describeDue(data.next, now())}.` : 'Nothing to review yet.'}
          </T>
        )}
      </Card>

      <Stack>
        <Heading level={2}>At a glance</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[practised.nextDay, practised.week, practised.clueDependence].map((m: Metric) =>
            tile(m.key, m.label, m.display, m.value === null),
          )}
          {tile('size', 'Comfortable part size', `${data.insights.comfortableChunkWords} words`, false)}
        </View>
      </Stack>

      {data.probe ? (
        <Card>
          <Heading level={2}>Fresh-text check</Heading>
          <T variant="muted">
            Optional. A short passage you haven’t seen before, to show how reading new text is going. Kept separate from
            practice.
          </T>
          <Button variant="secondary" label="Try a fresh passage" onPress={() => router.push(`/probe/${data.probe?.id}`)} />
        </Card>
      ) : null}
    </Screen>
  );
}
