import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  finishSession,
  getActiveSession,
  getDocumentChunks,
  openPassage,
  replanFrom,
  startSession,
  tooMuchTarget,
  type AttemptKind,
  type ChunkRecord,
  type ReadingDocument,
  type SessionRecord,
} from '@recall/core';
import { findPassage } from '@recall/content';
import { useApp } from '../lib/app-context';
import { goHome, goLibrary } from '../lib/navigation';
import { ChunkFlow } from '../components/ChunkFlow';
import { Banner, Button, Card, Heading, Pill, Screen, Stack, T, TopBar } from '../components/ui';

export type ReadMode = 'remember' | 'read' | 'probe';

interface Loaded {
  session: SessionRecord;
  document: ReadingDocument;
  chunks: ChunkRecord[];
  index: number;
}

const FOCUSED_EDGES = ['top', 'bottom', 'left', 'right'] as const;

export function ReadSession({ passageId, documentId, mode }: { passageId?: string; documentId?: string; mode: ReadMode }) {
  const { store, settings, now, updateSettings } = useApp();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flowKey, setFlowKey] = useState(0);
  const passage = passageId ? (findPassage(passageId) ?? null) : null;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let document: ReadingDocument | undefined;
        let chunks: ChunkRecord[] = [];
        if (passageId) {
          if (!passage) throw new Error('This reading could not be found. It may have been deleted.');
          if (mode === 'probe' && passage.kind !== 'probe') throw new Error('That is not a fresh-text passage.');
          const r = await openPassage(store, passage, settings, now());
          document = r.document;
          chunks = r.chunks;
        } else if (documentId) {
          document = await store.get('documents', documentId);
          if (document) chunks = await getDocumentChunks(store, document.id);
        }
        if (!document) throw new Error('This reading could not be found. It may have been deleted.');
        const active = await getActiveSession(store);
        const sessionMode = mode === 'read' ? 'read' : 'remember';
        const session = active && active.mode === sessionMode ? active : (await startSession(store, sessionMode, now())).session;
        if (!alive) return;
        setLoaded({ session, document, chunks, index: Math.min(document.nextChunkIndex, chunks.length) });
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
    // Load once per screen; settings changes during the session must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageId, documentId, mode, store]);

  const onTooMuch = useCallback(async (): Promise<ChunkRecord | null> => {
    if (!loaded) return null;
    const chunk = loaded.chunks[loaded.index];
    if (!chunk) return null;
    const target = tooMuchTarget(settings, chunk.wordCount);
    const patch = settings.chunkMode === 'fixed' ? { fixedChunkWords: target } : { adaptiveChunkWords: target };
    await updateSettings(patch);
    const replanned = await replanFrom(store, loaded.document.id, loaded.index, target, { ...settings, ...patch }, passage, now());
    setLoaded({ ...loaded, chunks: replanned });
    return replanned[loaded.index] ?? null;
  }, [loaded, settings, updateSettings, store, passage, now]);

  const finish = async () => {
    if (loaded) await finishSession(store, loaded.session.id, now());
    if (loaded) router.replace(`/finish/${loaded.session.id}`);
    else goHome();
  };

  if (error) {
    return (
      <Screen edges={[...FOCUSED_EDGES]}>
        <TopBar onBack={() => goLibrary()} backLabel="Library" />
        <Banner kind="error" message={error} />
      </Screen>
    );
  }
  if (!loaded) {
    return (
      <Screen edges={[...FOCUSED_EDGES]}>
        <T>Opening…</T>
      </Screen>
    );
  }

  const { document, chunks, index, session } = loaded;
  const kind: AttemptKind = mode === 'read' ? 'read' : mode === 'probe' ? 'probe' : 'learn';

  if (index >= chunks.length) {
    return (
      <Screen edges={[...FOCUSED_EDGES]}>
        <TopBar onBack={goHome} backLabel="Home" />
        <Heading>You have finished “{document.title}”</Heading>
        <T variant="muted">Its points will come back under Reviews when they are due.</T>
        <Stack>
          <Button variant="primary" large label="Finish" onPress={() => void finish()} />
          <Button variant="secondary" label="Choose something else to read" onPress={() => goLibrary()} />
        </Stack>
      </Screen>
    );
  }

  const chunk = chunks[index] as ChunkRecord;
  const isLast = index >= chunks.length - 1;
  return (
    <Screen edges={[...FOCUSED_EDGES]}>
      <TopBar
        onBack={goHome}
        backLabel="Pause"
        right={<Pill kind="blue" label={mode === 'read' ? 'Help me read' : mode === 'probe' ? 'Fresh-text check' : 'Help me remember'} />}
      />
      <ChunkFlow
        key={`${chunk.id}:${flowKey}`}
        kind={kind}
        sessionId={session.id}
        document={document}
        chunk={chunk}
        ideas={chunk.ideas}
        partLabel={`Part ${index + 1} of ${chunks.length}`}
        progress={(index + 0.5) / chunks.length}
        draft={session.draft}
        onTooMuch={mode === 'probe' ? undefined : onTooMuch}
        onDone={() => undefined}
        doneActions={() => (
          <>
            {!isLast ? (
              <Button
                variant="primary"
                large
                label="Next part"
                iconAfter="next"
                onPress={() => {
                  setLoaded({ ...loaded, index: index + 1, session: { ...session, draft: null } });
                  setFlowKey((k) => k + 1);
                }}
              />
            ) : (
              <Card variant="good">
                <T>You have finished “{document.title}”.</T>
              </Card>
            )}
            <Button
              variant={isLast ? 'primary' : 'secondary'}
              large={isLast}
              label={isLast ? 'Finish session' : 'Finish for now'}
              onPress={() => void finish()}
            />
          </>
        )}
      />
    </Screen>
  );
}
