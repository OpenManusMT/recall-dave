import { useCallback, useEffect, useState } from 'react';
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
import { href, navigate } from '../lib/router';
import { ChunkFlow } from '../components/ChunkFlow';
import { TopBar } from '../components/ui';
import { Icon } from '../components/Icon';

export type ReadMode = 'remember' | 'read' | 'probe';

interface Loaded {
  session: SessionRecord;
  document: ReadingDocument;
  chunks: ChunkRecord[];
  index: number;
}

export function ReadSession({
  passageId,
  documentId,
  mode,
}: {
  passageId?: string;
  documentId?: string;
  mode: ReadMode;
}) {
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
        if (passage) {
          if (mode === 'probe' && passage.kind !== 'probe')
            throw new Error('That is not a fresh-text passage.');
          const r = await openPassage(store, passage, settings, now());
          document = r.document;
          chunks = r.chunks;
        } else if (documentId) {
          document = await store.get('documents', documentId);
          if (document) chunks = await getDocumentChunks(store, document.id);
        }
        if (!document)
          throw new Error('This reading could not be found. It may have been deleted.');
        const active = await getActiveSession(store);
        const sessionMode = mode === 'read' ? 'read' : 'remember';
        const session =
          active && active.mode === sessionMode
            ? active
            : (await startSession(store, sessionMode, now())).session;
        if (!alive) return;
        setLoaded({
          session,
          document,
          chunks,
          index: Math.min(document.nextChunkIndex, chunks.length),
        });
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
    // Load once per route; settings changes during the session must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageId, documentId, mode, store]);

  const onTooMuch = useCallback(async (): Promise<ChunkRecord | null> => {
    if (!loaded) return null;
    const chunk = loaded.chunks[loaded.index];
    if (!chunk) return null;
    const target = tooMuchTarget(settings, chunk.wordCount);
    const patch =
      settings.chunkMode === 'fixed' ? { fixedChunkWords: target } : { adaptiveChunkWords: target };
    await updateSettings(patch);
    const replanned = await replanFrom(
      store,
      loaded.document.id,
      loaded.index,
      target,
      { ...settings, ...patch },
      passage,
      now(),
    );
    setLoaded({ ...loaded, chunks: replanned });
    return replanned[loaded.index] ?? null;
  }, [loaded, settings, updateSettings, store, passage, now]);

  const finish = async () => {
    if (loaded) await finishSession(store, loaded.session.id, now());
    navigate(loaded ? `/finish/${loaded.session.id}` : '/', { replace: true });
  };

  if (error) {
    return (
      <div className="stack-lg">
        <TopBar back="/library" backLabel="Library" />
        <p className="banner error" role="alert">
          {error}
        </p>
      </div>
    );
  }
  if (!loaded) return <p role="status">Opening…</p>;

  const { document, chunks, index, session } = loaded;
  const kind: AttemptKind = mode === 'read' ? 'read' : mode === 'probe' ? 'probe' : 'learn';

  if (index >= chunks.length) {
    return (
      <div className="stack-lg">
        <TopBar back="/library" backLabel="Library" />
        <h1>You have finished “{document.title}”</h1>
        <p className="muted">Its points will come back under Reviews when they are due.</p>
        <button type="button" className="btn primary block large" onClick={() => void finish()}>
          Finish
        </button>
        <a className="btn secondary block" href={href('/library')}>
          Choose something else to read
        </a>
      </div>
    );
  }

  const chunk = chunks[index] as ChunkRecord;
  const isLast = index >= chunks.length - 1;
  return (
    <div className="stack">
      <TopBar
        back={() => navigate('/')}
        backLabel="Pause"
        right={
          <span className="pill blue">
            {mode === 'read'
              ? 'Help me read'
              : mode === 'probe'
                ? 'Fresh-text check'
                : 'Help me remember'}
          </span>
        }
      />
      <ChunkFlow
        key={`${index}:${flowKey}`}
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
              <button
                type="button"
                className="btn primary block large"
                onClick={() => {
                  setLoaded({ ...loaded, index: index + 1, session: { ...session, draft: null } });
                  setFlowKey((k) => k + 1);
                }}
              >
                Next part <Icon name="next" />
              </button>
            ) : (
              <p className="card good">You have finished “{document.title}”.</p>
            )}
            <button
              type="button"
              className={`btn block ${isLast ? 'primary large' : 'secondary'}`}
              onClick={() => void finish()}
            >
              {isLast ? 'Finish session' : 'Finish for now'}
            </button>
          </>
        )}
      />
    </div>
  );
}
