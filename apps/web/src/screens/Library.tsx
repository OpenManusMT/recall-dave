import { useEffect, useState } from 'react';
import {
  countWords,
  createPastedDocument,
  deleteDocument,
  MAX_PASTED_CHARS,
  planPastedChunks,
  validatePastedReading,
  currentChunkTarget,
  type ReadingDocument,
} from '@recall/core';
import { LIBRARY_PASSAGES } from '@recall/content';
import { useApp } from '../lib/app-context';
import { href, navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { ConfirmDialog, TopBar } from '../components/ui';

const SUBJECT_LABEL: Record<string, string> = {
  food: 'Food',
  nature: 'Nature',
  travel: 'Travel',
  history: 'History',
  home: 'Home',
  practical: 'Everyday',
  science: 'How things work',
  places: 'Places',
};

export function Library() {
  const { store, dataVersion, refresh } = useApp();
  const [docs, setDocs] = useState<ReadingDocument[]>([]);
  const [mode, setMode] = useState<'remember' | 'read'>('remember');
  const [toDelete, setToDelete] = useState<ReadingDocument | null>(null);

  useEffect(() => {
    void store.getAll('documents').then(setDocs);
  }, [store, dataVersion]);

  const statusFor = (passageId: string) => {
    const ds = docs.filter((d) => d.passageId === passageId);
    if (ds.some((d) => d.status === 'in_progress')) return 'Started';
    if (ds.some((d) => d.status === 'finished')) return 'Finished';
    return null;
  };
  const mine = docs.filter((d) => d.provenance === 'pasted').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const q = mode === 'read' ? '?mode=read' : '';

  return (
    <div className="stack-lg">
      <h1>Choose something to read</h1>
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: 8 }}>How would you like to read?</legend>
        <div className="segmented" role="radiogroup" aria-label="Reading mode">
          <button type="button" role="radio" aria-checked={mode === 'remember'} className="choice" onClick={() => setMode('remember')}>
            Help me remember this
          </button>
          <button type="button" role="radio" aria-checked={mode === 'read'} className="choice" onClick={() => setMode('read')}>
            Help me read this
          </button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          {mode === 'remember'
            ? 'Read a small part, hide it, write what you remember, then check with hints if you need them. Points come back later for review.'
            : 'Understanding first: the text stays visible, with read-aloud and the main points if you want them.'}
        </p>
      </fieldset>

      <a className="btn secondary block" href={href('/add')}>
        <Icon name="plus" /> Paste your own reading
      </a>

      {mine.length > 0 ? (
        <section className="stack" aria-labelledby="mine-h">
          <h2 id="mine-h">Your reading</h2>
          <ul className="list">
            {mine.map((d) => (
              <li key={d.id} className="row" style={{ flexWrap: 'nowrap' }}>
                <a className="list-item grow" href={href(`/doc/${d.id}${q}`)}>
                  <div className="grow">
                    <div className="title">{d.title}</div>
                    <div className="small muted">
                      {d.status === 'finished' ? 'Finished' : `Part ${Math.min(d.nextChunkIndex + 1, d.chunkCount)} of ${d.chunkCount}`}
                    </div>
                  </div>
                </a>
                <button type="button" className="btn ghost" aria-label={`Delete “${d.title}”`} onClick={() => setToDelete(d)}>
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="stack" aria-labelledby="lib-h">
        <h2 id="lib-h">Library</h2>
        <p className="small muted" style={{ margin: 0 }}>
          {LIBRARY_PASSAGES.length} short pieces written for Recall. They all work without an internet connection.
        </p>
        <ul className="list">
          {LIBRARY_PASSAGES.map((p) => {
            const status = statusFor(p.id);
            const words = p.sections.reduce((n, s) => n + countWords(s.text), 0);
            return (
              <li key={p.id}>
                <a className="list-item" href={href(`/read/${p.id}${q}`)}>
                  <div className="grow">
                    <div className="title">{p.title}</div>
                    <div className="small muted">{p.summary}</div>
                    <div className="row small" style={{ marginTop: 4, gap: 6 }}>
                      <span className="pill">{SUBJECT_LABEL[p.subject] ?? p.subject}</span>
                      <span className="pill">About {Math.round(words / 10) * 10} words</span>
                      {status ? <span className="pill good">{status}</span> : null}
                    </div>
                  </div>
                  <Icon name="next" />
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      {toDelete ? (
        <ConfirmDialog
          title="Delete this reading?"
          confirmLabel="Delete reading"
          danger
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            await deleteDocument(store, toDelete.id);
            setToDelete(null);
            refresh();
          }}
        >
          <p>
            “{toDelete.title}” and everything you wrote about it, including its reviews, will be removed from this device.
            This can’t be undone.
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

export function AddReading() {
  const { store, settings, now, refresh } = useApp();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = text.trim() ? validatePastedReading(title, text) : null;
  const parts = preview?.ok ? planPastedChunks(preview.text, { targetWords: currentChunkTarget(settings), minWords: settings.minChunkWords, maxWords: settings.maxChunkWords }, 'preview').length : 0;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { document } = await createPastedDocument(store, { title, text }, settings, now());
      refresh();
      navigate(`/doc/${document.id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="stack-lg">
      <TopBar back="/library" backLabel="Library" />
      <h1>Paste your own reading</h1>
      <p className="muted">
        Paste a letter, an article or anything you want to read. It stays on this device. Recall splits it into small parts
        and picks key sentences by counting important words — it does not use AI or the internet.
      </p>
      <div className="stack">
        <label htmlFor="add-title">Title (optional)</label>
        <input id="add-title" type="text" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
      </div>
      <div className="stack">
        <label htmlFor="add-text">Text</label>
        <textarea
          id="add-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ minHeight: '14em' }}
          aria-describedby="add-help"
        />
        <p id="add-help" className="small muted">
          {text.length.toLocaleString('en-GB')} of {MAX_PASTED_CHARS.toLocaleString('en-GB')} characters.
          {parts > 0 ? ` About ${parts} ${parts === 1 ? 'part' : 'parts'}.` : ''} Links and code in the text are shown as plain
          words and never opened.
        </p>
      </div>
      {error || (preview && !preview.ok) ? (
        <p className="banner error" role="alert">
          {error ?? (preview && !preview.ok ? preview.error : '')}
        </p>
      ) : null}
      <button type="button" className="btn primary block large" onClick={() => void save()} disabled={busy || !preview?.ok}>
        Save and start reading
      </button>
    </div>
  );
}
