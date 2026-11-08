import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import {
  backupFileName,
  createBackup,
  deleteAllData,
  FIXED_CHUNK_CHOICES,
  FONT_SCALES,
  parseBackup,
  readSnapshot,
  type ParseResult,
} from '@recall/core';
import { useApp } from '../lib/app-context';
import { pickBackupText, shareBackupFile } from '../lib/backup-files';
import { useFocusedData } from '../lib/navigation';
import { Banner, Button, Card, Disclosure, Heading, ReadingText, Rows, Screen, Segmented, Stack, T, Toggle } from '../components/ui';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

function Bullets({ items }: { items: string[] }) {
  const { palette: p, type } = useApp();
  return (
    <View style={{ gap: 8 }}>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: 8 }} accessible accessibilityLabel={t}>
          <Text style={{ color: p.text, fontSize: type.body, lineHeight: type.body * 1.5 }}>•</Text>
          <Text style={{ flex: 1, color: p.text, fontSize: type.body, lineHeight: type.body * 1.5 }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export function SettingsScreen() {
  const { store, settings, updateSettings, now, refresh, persistence, dataVersion } = useApp();
  const counts = useFocusedData(() => readSnapshot(store), [store, dataVersion]);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exportBackup = async () => {
    setErrorMsg(null);
    setMessage(null);
    setBusy(true);
    try {
      const snap = await readSnapshot(store);
      await shareBackupFile(backupFileName(now()), JSON.stringify(createBackup(snap, now(), APP_VERSION), null, 1));
      setMessage('Backup finished. If you chose “Save to Files”, it is saved there. The temporary copy has been removed from Recall.');
    } catch (e) {
      setErrorMsg((e as Error).message || 'The backup could not be created. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (result: Extract<ParseResult, { ok: true }>) => {
    setBusy(true);
    try {
      await store.replaceAll(result.snapshot);
      setMessage(`Backup restored.${result.warnings.length ? ' ' + result.warnings.join(' ') : ''}`);
      refresh();
    } catch (e) {
      setErrorMsg((e as Error).message || 'The backup could not be restored. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async () => {
    setMessage(null);
    setErrorMsg(null);
    let text: string;
    try {
      const picked = await pickBackupText();
      if (picked.canceled) return;
      text = picked.text;
    } catch (e) {
      setErrorMsg((e as Error).message || 'That file could not be read. Nothing was changed.');
      return;
    }
    const result = parseBackup(text);
    if (!result.ok) {
      setErrorMsg(result.error);
      return;
    }
    Alert.alert(
      'Restore this backup?',
      `This replaces everything currently in Recall on this iPhone with the backup: ${result.counts.documents ?? 0} readings and ${
        result.counts.attempts ?? 0
      } answers.${result.migratedFrom ? ' The backup is from an older version and will be upgraded.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace with backup', style: 'destructive', onPress: () => void doImport(result) },
      ],
    );
  };

  const confirmDeleteAll = () => {
    Alert.alert(
      'Delete all data?',
      'All readings, answers, review dates and settings will be removed from this iPhone. This can’t be undone.\n\nTip: export a backup first if you might want them later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            void deleteAllData(store)
              .then(() => {
                setMessage(null);
                refresh();
              })
              .catch(() => setErrorMsg('Recall could not delete its data. Please try again.'))
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Heading>Settings</Heading>

      <Card>
        <Heading level={2}>Reading comfort</Heading>
        <Segmented label="Text size" value={settings.fontScale} options={FONT_SCALES} onChange={(v) => void updateSettings({ fontScale: v })} />
        <ReadingText text="This is how reading text will look." />
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
        <Toggle
          label="Reduce motion"
          hint="Screens change without sliding."
          checked={settings.reduceMotion}
          onChange={(v) => void updateSettings({ reduceMotion: v })}
        />
      </Card>

      <Card>
        <Heading level={2}>Answering</Heading>
        <Segmented
          label="I prefer to"
          value={settings.inputPreference}
          options={[
            { value: 'typing', label: 'Type' },
            { value: 'dictation', label: 'Speak' },
          ]}
          onChange={(v) => void updateSettings({ inputPreference: v })}
        />
        <T variant="smallMuted">
          To speak, use the microphone key on the iPhone keyboard. Your words appear in the box so you can check them before
          continuing. Recall itself never records audio.
        </T>
        <Toggle
          label="Ask a quick understanding question"
          hint="One multiple-choice question per part, about what it means."
          checked={settings.askQuestions}
          onChange={(v) => void updateSettings({ askQuestions: v })}
        />
      </Card>

      <Card>
        <Heading level={2}>Part size</Heading>
        <Segmented
          label="How long should each part be?"
          value={settings.chunkMode === 'auto' ? 0 : settings.fixedChunkWords}
          options={[{ value: 0, label: `Automatic (now ${settings.adaptiveChunkWords} words)` }, ...FIXED_CHUNK_CHOICES]}
          onChange={(v) => void updateSettings(v === 0 ? { chunkMode: 'auto' } : { chunkMode: 'fixed', fixedChunkWords: v })}
        />
        <T variant="smallMuted">
          Parts always end at a sensible place, so sizes are approximate. A new size applies to readings you start next.
        </T>
      </Card>

      <Card>
        <Heading level={2}>Privacy and your data</Heading>
        <Bullets
          items={[
            'Everything stays on this device. There is no account, no advertising, no tracking and no analytics.',
            'Recall does not send your reading or your answers anywhere and does not use AI.',
            'Read-aloud uses your device’s built-in voices.',
            'Keyboard dictation is provided by Apple and follows your iPhone’s own dictation settings.',
            'Recall is a reading aid. It does not diagnose or monitor any condition.',
          ]}
        />
        <T variant="smallMuted">
          Storage:{' '}
          {persistence === 'persistent'
            ? 'saved on this iPhone, inside Recall’s own private storage. Your iPhone’s own backups (iCloud or a computer) can include it if you use them.'
            : 'not available right now — nothing will be kept when Recall closes.'}
        </T>
        {counts ? (
          <Disclosure summary="What is stored">
            <Rows
              rows={[
                ['Readings', counts.documents.length],
                ['Parts', counts.chunks.length],
                ['Points with review dates', counts.memory.length],
                ['Your answers', counts.attempts.length],
                ['Review history entries', counts.reviewLog.length],
                ['Sessions', counts.sessions.length],
              ]}
            />
            <T variant="smallMuted">No diagnosis, health information, audio, name or contact details are stored.</T>
          </Disclosure>
        ) : null}
        {message ? <Banner message={message} /> : null}
        {errorMsg ? <Banner kind="error" message={errorMsg} /> : null}
        <Stack>
          <Button
            variant="secondary"
            icon="download"
            label="Export backup"
            accessibilityHint="Opens the share sheet. Choose Save to Files to keep the backup."
            busy={busy}
            onPress={() => void exportBackup()}
          />
          <T variant="smallMuted">Opens the share sheet. Choose “Save to Files” to keep the backup somewhere safe.</T>
          <Button variant="secondary" icon="upload" label="Import backup" busy={busy} onPress={() => void importBackup()} />
          <Button variant="danger" icon="trash" label="Delete all data" busy={busy} onPress={confirmDeleteAll} />
        </Stack>
      </Card>

      <Card>
        <Heading level={2}>How Recall works</Heading>
        <Disclosure summary="Review dates">
          <T>
            Points come back after 1, 3, 7, 14, 30, 60 and then 120 days. Remembering a point on your own moves it to the next step;
            needing the sentence or a reread brings it back the next day. An experimental adaptive scheduler also makes suggestions
            in the background, but it is <Text style={{ fontWeight: '700' }}>not used</Text> for your real review dates.
          </T>
        </Disclosure>
        <Disclosure summary="Checking answers">
          <T>
            You compare your own words with the main points and say whether they match. Recall does not mark your writing
            automatically: an automatic checker was tested and was not accurate enough, so it is switched off.
          </T>
        </Disclosure>
        <Disclosure summary="Hints">
          <T>
            Hints go from small to big: how many points there are and what one is about, then a hint about the meaning, then the
            sentence with words missing, then the sentence itself, then the whole part.
          </T>
        </Disclosure>
        <Button variant="ghost" label="Show the welcome screens again" onPress={() => router.push('/welcome')} />
        <T variant="smallMuted">Recall {APP_VERSION}. Reading passages are original and free to share (CC BY 4.0).</T>
      </Card>
    </Screen>
  );
}
