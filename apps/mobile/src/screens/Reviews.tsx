import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
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
import { goHome, useFocusedData } from '../lib/navigation';
import { ChunkFlow } from '../components/ChunkFlow';
import { Button, Card, Heading, Pill, Screen, Stack, T, TopBar } from '../components/ui';

export function ReviewsOverview() {
  const { store, now, dataVersion, palette } = useApp();
  const data = useFocusedData(
    async () => ({ groups: await dueReviewGroups(store, now()), next: await nextReviewAt(store, now()) }),
    [store, now, dataVersion],
  );
  if (!data) {
    return (
      <Screen>
        <T>Loading…</T>
      </Screen>
    );
  }
  const { groups, next } = data;
  const points = groups.reduce((n, g) => n + g.ideas.length, 0);
  return (
    <Screen>
      <Heading>Reviews</Heading>
      {groups.length === 0 ? (
        <Card>
          <T variant="bold">Nothing is due right now.</T>
          <T variant="muted">
            {next
              ? `Your next review is ${describeDue(next, now())}.`
              : 'After you read something, its main points come back here the next day.'}
          </T>
          <Button variant="primary" label="Choose something to read" onPress={() => router.navigate('/library')} />
        </Card>
      ) : (
        <>
          <T variant="muted">
            {points === 1 ? '1 point is' : `${points} points are`} ready to remember again, from {groups.length}{' '}
            {groups.length === 1 ? 'part' : 'parts'}. You try first, then check — no time limit.
          </T>
          <Button variant="primary" large icon="review" label="Start reviews" onPress={() => router.push('/review-run')} />
          <View accessibilityRole="list" accessibilityLabel="Due reviews" style={{ gap: 10 }}>
            {groups.map((g) => (
              <View
                key={g.chunk.id}
                accessible
                accessibilityLabel={`${g.document.title}. Part ${g.chunk.index + 1}, ${g.ideas.length} ${g.ideas.length === 1 ? 'point' : 'points'}`}
                style={{
                  minHeight: 64,
                  justifyContent: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: palette.highContrast ? 2 : 1,
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                  gap: 2,
                }}
              >
                <T variant="bold">{g.document.title}</T>
                <T variant="smallMuted">
                  Part {g.chunk.index + 1} · {g.ideas.length} {g.ideas.length === 1 ? 'point' : 'points'}
                </T>
              </View>
            ))}
          </View>
          <T variant="smallMuted">Review dates use simple fixed steps (1, 3, 7, 14, 30, 60, 120 days).</T>
        </>
      )}
    </Screen>
  );
}

const FOCUSED_EDGES = ['top', 'bottom', 'left', 'right'] as const;

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
      const s = active && active.mode === 'remember' ? active : (await startSession(store, 'remember', now())).session;
      if (alive) {
        setGroups(g);
        setSession(s);
      }
    })();
    return () => {
      alive = false;
    };
  }, [store, now]);

  if (!groups || !session) {
    return (
      <Screen edges={[...FOCUSED_EDGES]}>
        <T>Loading…</T>
      </Screen>
    );
  }

  const finish = async () => {
    await finishSession(store, session.id, now());
    router.replace(`/finish/${session.id}`);
  };
  const continueReading = async () => {
    const docs = await store.getAll('documents');
    const p = suggestNextPassage(LIBRARY_PASSAGES, docs);
    if (p) router.replace(`/read/${p.id}`);
    else router.dismissTo('/library');
  };

  if (groups.length === 0 || i >= groups.length) {
    return (
      <Screen edges={[...FOCUSED_EDGES]}>
        <TopBar onBack={goHome} backLabel="Home" />
        <Heading>{groups.length === 0 ? 'No reviews are due' : 'Reviews done'}</Heading>
        <T variant="muted">
          {groups.length === 0 ? 'Nothing to review right now.' : 'Thank you. Your review dates have been updated.'}
        </T>
        <Stack>
          {thenRead ? (
            <Button variant="primary" large label="Now read something new" onPress={() => void continueReading()} />
          ) : null}
          <Button
            variant={thenRead ? 'secondary' : 'primary'}
            large={!thenRead}
            label="Finish session"
            onPress={() => void finish()}
          />
        </Stack>
      </Screen>
    );
  }

  const g = groups[i] as DueGroup;
  return (
    <Screen edges={[...FOCUSED_EDGES]}>
      <TopBar onBack={goHome} backLabel="Pause" right={<Pill kind="blue" label="Review" />} />
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
            <Button
              variant="primary"
              large
              label={i < groups.length - 1 ? 'Next review' : 'Continue'}
              onPress={() => setI(i + 1)}
            />
            <Button variant="secondary" label="Finish for now" onPress={() => void finish()} />
          </>
        )}
      />
    </Screen>
  );
}
