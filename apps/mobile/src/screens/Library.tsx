import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  countWords,
  createPastedDocument,
  currentChunkTarget,
  deleteDocument,
  MAX_PASTED_CHARS,
  MAX_TITLE_CHARS,
  planPastedChunks,
  validatePastedReading,
  type ReadingDocument,
} from '@recall/core';
import { LIBRARY_PASSAGES } from '@recall/content';
import { useApp } from '../lib/app-context';
import { closeScreen, useFocusedData } from '../lib/navigation';
import { Icon } from '../components/Icon';
import { Banner, Button, Choice, Field, Heading, Pill, RadioGroup, Screen, Stack, T, TopBar } from '../components/ui';

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

function ListRow({
  title,
  lines,
  pills,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  lines: string[];
  pills?: { label: string; kind?: 'default' | 'good' }[];
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { palette: p } = useApp();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: p.highContrast ? 2 : 1,
        borderColor: p.border,
        backgroundColor: p.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="bold">{title}</T>
        {lines.map((l) => (
          <T key={l} variant="smallMuted">
            {l}
          </T>
        ))}
        {pills && pills.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {pills.map((x) => (
              <Pill key={x.label} label={x.label} kind={x.kind} />
            ))}
          </View>
        ) : null}
      </View>
      <Icon name="next" color={p.textMuted} />
    </Pressable>
  );
}

export function Library() {
  const { store, dataVersion, refresh, palette } = useApp();
  const [mode, setMode] = useState<'remember' | 'read'>('remember');
  const docs = useFocusedData(() => store.getAll('documents'), [store, dataVersion]) ?? [];

  const statusFor = (passageId: string) => {
    const ds = docs.filter((d) => d.passageId === passageId);
    if (ds.some((d) => d.status === 'in_progress')) return 'Started';
    if (ds.some((d) => d.status === 'finished')) return 'Finished';
    return null;
  };
  const mine = docs.filter((d) => d.provenance === 'pasted').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const q = mode === 'read' ? '?mode=read' : '';

  const confirmDelete = (d: ReadingDocument) => {
    Alert.alert(
      'Delete this reading?',
      `“${d.title}” and everything you wrote about it, including its reviews, will be removed from this iPhone. This can’t be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete reading',
          style: 'destructive',
          onPress: () => {
            void deleteDocument(store, d.id).then(refresh);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Heading>Choose something to read</Heading>
      <Stack gap={8}>
        <T variant="bold">How would you like to read?</T>
        <RadioGroup label="Reading mode">
          <Choice label="Help me remember this" checked={mode === 'remember'} onPress={() => setMode('remember')} />
          <Choice label="Help me read this" checked={mode === 'read'} onPress={() => setMode('read')} />
        </RadioGroup>
        <T variant="smallMuted">
          {mode === 'remember'
            ? 'Read a small part, hide it, write what you remember, then check with hints if you need them. Points come back later for review.'
            : 'Understanding first: the text stays visible, with read-aloud and the main points if you want them.'}
        </T>
      </Stack>

      <Button variant="secondary" icon="plus" label="Paste your own reading" onPress={() => router.push('/add')} />

      {mine.length > 0 ? (
        <Stack>
          <Heading level={2}>Your reading</Heading>
          {mine.map((d) => {
            const where = d.status === 'finished' ? 'Finished' : `Part ${Math.min(d.nextChunkIndex + 1, d.chunkCount)} of ${d.chunkCount}`;
            return (
              <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ListRow
                  title={d.title}
                  lines={[where]}
                  onPress={() => router.push(`/doc/${d.id}${q}`)}
                  accessibilityLabel={`${d.title}. ${where}`}
                />
                <Pressable
                  onPress={() => confirmDelete(d)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete “${d.title}”`}
                  style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="trash" color={palette.primary} />
                </Pressable>
              </View>
            );
          })}
        </Stack>
      ) : null}

      <Stack>
        <Heading level={2}>Library</Heading>
        <T variant="smallMuted">
          {LIBRARY_PASSAGES.length} short pieces written for Recall. They all work without an internet connection.
        </T>
        {LIBRARY_PASSAGES.map((p) => {
          const status = statusFor(p.id);
          const words = Math.round(p.sections.reduce((n, s) => n + countWords(s.text), 0) / 10) * 10;
          const subject = SUBJECT_LABEL[p.subject] ?? p.subject;
          return (
            <ListRow
              key={p.id}
              title={p.title}
              lines={[p.summary]}
              pills={[{ label: subject }, { label: `About ${words} words` }, ...(status ? [{ label: status, kind: 'good' as const }] : [])]}
              onPress={() => router.push(`/read/${p.id}${q}`)}
              accessibilityLabel={`${p.title}. ${p.summary} ${subject}, about ${words} words.${status ? ` ${status}.` : ''}`}
            />
          );
        })}
      </Stack>
    </Screen>
  );
}

export function AddReading() {
  const { store, settings, now, refresh } = useApp();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = text.trim() ? validatePastedReading(title, text) : null;
  const parts = preview?.ok
    ? planPastedChunks(
        preview.text,
        { targetWords: currentChunkTarget(settings), minWords: settings.minChunkWords, maxWords: settings.maxChunkWords },
        'preview',
      ).length
    : 0;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { document } = await createPastedDocument(store, { title, text }, settings, now());
      refresh();
      router.replace(`/doc/${document.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const shownError = error ?? (preview && !preview.ok ? preview.error : null);
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <TopBar onBack={closeScreen} backLabel="Library" />
      <Heading>Paste your own reading</Heading>
      <T variant="muted">
        Paste a letter, an article or anything you want to read. It stays on this device. Recall splits it into small parts and
        picks key sentences by counting important words — it does not use AI or the internet.
      </T>
      <Field
        label="Title (optional)"
        value={title}
        maxLength={MAX_TITLE_CHARS}
        onChangeText={setTitle}
        autoComplete="off"
        autoCorrect={false}
        returnKeyType="next"
      />
      <Field
        label="Text"
        multiline
        minLines={10}
        value={text}
        onChangeText={setText}
        help={`${text.length.toLocaleString('en-GB')} of ${MAX_PASTED_CHARS.toLocaleString('en-GB')} characters.${
          parts > 0 ? ` About ${parts} ${parts === 1 ? 'part' : 'parts'}.` : ''
        } Links and code in the text are shown as plain words and never opened.`}
      />
      {shownError ? <Banner kind="error" message={shownError} /> : null}
      <Button
        variant="primary"
        large
        label="Save and start reading"
        onPress={() => void save()}
        disabled={busy || !preview?.ok}
      />
    </Screen>
  );
}
