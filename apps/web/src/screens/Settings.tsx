import { useEffect, useRef, useState } from 'react';
import {
  backupFileName,
  createBackup,
  deleteAllData,
  FIXED_CHUNK_CHOICES,
  FONT_SCALES,
  parseBackup,
  readSnapshot,
  type ParseResult,
  type Snapshot,
} from '@recall/core';
import { useApp } from '../lib/app-context';
import { saveTextFile } from '../lib/download';
import { navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { ConfirmDialog } from '../components/ui';

declare const __APP_VERSION__: string;

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: 8 }}>{label}</legend>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className="choice" onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = `t-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label className="toggle" htmlFor={id}>
        <span>{label}</span>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={hint ? `${id}-h` : undefined} />
      </label>
      {hint ? (
        <p id={`${id}-h`} className="small muted" style={{ marginTop: 0 }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SettingsScreen() {
  const { store, settings, updateSettings, now, refresh, persistence, dataVersion } = useApp();
  const [counts, setCounts] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<Extract<ParseResult, { ok: true }> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void readSnapshot(store).then(setCounts);
  }, [store, dataVersion]);

  const exportBackup = async () => {
    setErrorMsg(null);
    try {
      const snap = await readSnapshot(store);
      const how = await saveTextFile(backupFileName(now()), JSON.stringify(createBackup(snap, now(), __APP_VERSION__), null, 1));
      setMessage(how === 'shared' ? 'Backup ready. Choose “Save to Files” to keep it.' : 'Backup file saved to your downloads.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErrorMsg('The backup could not be created. Please try again.');
    }
  };

  const onFile = async (file: File | undefined) => {
    setMessage(null);
    setErrorMsg(null);
    if (!file) return;
    const result = parseBackup(await file.text());
    if (fileRef.current) fileRef.current.value = '';
    if (!result.ok) {
      setErrorMsg(result.error);
      return;
    }
    setPendingImport(result);
  };

  const doImport = async () => {
    if (!pendingImport) return;
    setBusy(true);
    try {
      await store.replaceAll(pendingImport.snapshot);
      setPendingImport(null);
      setMessage(`Backup restored.${pendingImport.warnings.length ? ' ' + pendingImport.warnings.join(' ') : ''}`);
      refresh();
    } catch (e) {
      setErrorMsg((e as Error).message || 'The backup could not be restored. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    await deleteAllData(store);
    setBusy(false);
    setConfirmDelete(false);
    refresh();
    navigate('/welcome', { replace: true });
  };

  return (
    <div className="stack-lg">
      <h1>Settings</h1>

      <section className="card stack" aria-labelledby="comfort-h">
        <h2 id="comfort-h">Reading comfort</h2>
        <Segmented label="Text size" value={settings.fontScale} options={FONT_SCALES} onChange={(v) => void updateSettings({ fontScale: v })} />
        <p className="reading-text" style={{ margin: 0 }}>
          This is how reading text will look.
        </p>
        <Segmented
          label="Reading font"
          value={settings.readingFont}
          options={[
            { value: 'serif', label: 'Book style' },
            { value: 'sans', label: 'Plain style' },
          ]}
          onChange={(v) => void updateSettings({ readingFont: v })}
        />
        <Segmented
          label="Colours"
          value={settings.theme}
          options={[
            { value: 'system', label: 'Match iPhone' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(v) => void updateSettings({ theme: v })}
        />
        <Toggle label="High contrast" checked={settings.highContrast} onChange={(v) => void updateSettings({ highContrast: v })} />
        <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(v) => void updateSettings({ reduceMotion: v })} />
      </section>

      <section className="card stack" aria-labelledby="ans-h">
        <h2 id="ans-h">Answering</h2>
        <Segmented
          label="I prefer to"
          value={settings.inputPreference}
          options={[
            { value: 'typing', label: 'Type' },
            { value: 'dictation', label: 'Speak' },
          ]}
          onChange={(v) => void updateSettings({ inputPreference: v })}
        />
        <p className="small muted" style={{ margin: 0 }}>
          To speak, use the microphone key on the iPhone keyboard. Your words appear in the box so you can check them before
          continuing. Recall itself never records audio.
        </p>
        <Toggle
          label="Ask a quick understanding question"
          hint="One multiple-choice question per part, about what it means."
          checked={settings.askQuestions}
          onChange={(v) => void updateSettings({ askQuestions: v })}
        />
      </section>

      <section className="card stack" aria-labelledby="size-h">
        <h2 id="size-h">Part size</h2>
        <Segmented
          label="How long should each part be?"
          value={settings.chunkMode === 'auto' ? 0 : settings.fixedChunkWords}
          options={[{ value: 0, label: `Automatic (now ${settings.adaptiveChunkWords} words)` }, ...FIXED_CHUNK_CHOICES]}
          onChange={(v) => void updateSettings(v === 0 ? { chunkMode: 'auto' } : { chunkMode: 'fixed', fixedChunkWords: v })}
        />
        <p className="small muted" style={{ margin: 0 }}>
          Parts always end at a sensible place, so sizes are approximate. A new size applies to readings you start next.
        </p>
      </section>

      <section className="card stack" aria-labelledby="priv-h">
        <h2 id="priv-h">Privacy and your data</h2>
        <ul className="stack" style={{ paddingLeft: '1.2em', margin: 0 }}>
          <li>Everything stays on this device. There is no account, no advertising, no tracking and no analytics.</li>
          <li>Recall does not send your reading or your answers anywhere and does not use AI.</li>
          <li>Read-aloud uses your device’s built-in voices.</li>
          <li>Keyboard dictation is provided by Apple and follows your iPhone’s own dictation settings.</li>
          <li>Recall is a reading aid. It does not diagnose or monitor any condition.</li>
        </ul>
        <p className="small muted" style={{ margin: 0 }}>
          Storage:{' '}
          {persistence === 'persistent'
            ? 'saved on this device and marked to be kept.'
            : persistence === 'best-effort'
              ? 'saved on this device. Browsers can clear website data, so export a backup now and then.'
              : 'not available in this browser mode — nothing will be kept.'}
        </p>
        {counts ? (
          <details>
            <summary>What is stored</summary>
            <table className="simple">
              <tbody>
                <tr>
                  <th scope="row">Readings</th>
                  <td>{counts.documents.length}</td>
                </tr>
                <tr>
                  <th scope="row">Parts</th>
                  <td>{counts.chunks.length}</td>
                </tr>
                <tr>
                  <th scope="row">Points with review dates</th>
                  <td>{counts.memory.length}</td>
                </tr>
                <tr>
                  <th scope="row">Your answers</th>
                  <td>{counts.attempts.length}</td>
                </tr>
                <tr>
                  <th scope="row">Review history entries</th>
                  <td>{counts.reviewLog.length}</td>
                </tr>
                <tr>
                  <th scope="row">Sessions</th>
                  <td>{counts.sessions.length}</td>
                </tr>
              </tbody>
            </table>
            <p className="small muted">No diagnosis, health information, audio, name or contact details are stored.</p>
          </details>
        ) : null}
        {message ? (
          <p className="banner" role="status">
            {message}
          </p>
        ) : null}
        {errorMsg ? (
          <p className="banner error" role="alert">
            {errorMsg}
          </p>
        ) : null}
        <button type="button" className="btn secondary block" onClick={() => void exportBackup()}>
          <Icon name="download" /> Export backup
        </button>
        <button type="button" className="btn secondary block" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" /> Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          aria-label="Choose a backup file"
          data-testid="import-file"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <button type="button" className="btn danger block" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" /> Delete all data
        </button>
      </section>

      <section className="card stack" aria-labelledby="about-h">
        <h2 id="about-h">How Recall works</h2>
        <details>
          <summary>Review dates</summary>
          <p>
            Points come back after 1, 3, 7, 14, 30, 60 and then 120 days. Remembering a point on your own moves it to the next
            step; needing the sentence or a reread brings it back the next day. An experimental adaptive scheduler also makes
            suggestions in the background, but it is <strong>not used</strong> for your real review dates.
          </p>
        </details>
        <details>
          <summary>Checking answers</summary>
          <p>
            You compare your own words with the main points and say whether they match. Recall does not mark your writing
            automatically: an automatic checker was tested and was not accurate enough, so it is switched off.
          </p>
        </details>
        <details>
          <summary>Hints</summary>
          <p>
            Hints go from small to big: how many points there are and what one is about, then a hint about the meaning, then
            the sentence with words missing, then the sentence itself, then the whole part.
          </p>
        </details>
        <button type="button" className="btn ghost" onClick={() => navigate('/welcome')}>
          Show the welcome screens again
        </button>
        <p className="small muted" style={{ margin: 0 }}>
          Recall {__APP_VERSION__}. Reading passages are original and free to share (CC BY 4.0).
        </p>
      </section>

      {pendingImport ? (
        <ConfirmDialog
          title="Restore this backup?"
          confirmLabel="Replace with backup"
          danger
          busy={busy}
          onCancel={() => setPendingImport(null)}
          onConfirm={() => void doImport()}
        >
          <p>
            This replaces everything currently in Recall on this device with the backup: {pendingImport.counts.documents ?? 0}{' '}
            readings and {pendingImport.counts.attempts ?? 0} answers.
            {pendingImport.migratedFrom ? ' The backup is from an older version and will be upgraded.' : ''}
          </p>
        </ConfirmDialog>
      ) : null}
      {confirmDelete ? (
        <ConfirmDialog
          title="Delete all data?"
          confirmLabel="Delete everything"
          danger
          busy={busy}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void doDelete()}
        >
          <p>All readings, answers, review dates and settings will be removed from this device. This can’t be undone.</p>
          <p className="small muted">Tip: export a backup first if you might want them later.</p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
