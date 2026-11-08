/**
 * Backup export/import on iPhone. Everything is local: the backup is written
 * to Recall's temporary (cache) folder, handed to the iOS share sheet so the
 * learner can choose "Save to Files", and the temporary copy is deleted
 * afterwards. Import reads a file the learner picks; it is validated fully by
 * @recall/core before anything is changed.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { MAX_BACKUP_BYTES } from '@recall/core';

/** Writes `json` to a temporary file, opens the share sheet, then removes the temporary file. */
export async function shareBackupFile(fileName: string, json: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device, so the backup could not be saved.');
  }
  const file = new File(Paths.cache, fileName);
  try {
    if (file.exists) file.delete();
    file.create();
    await file.write(json);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Save your Recall backup',
    });
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      /* best effort: the cache folder is cleared by iOS anyway */
    }
  }
}

export type PickedText = { canceled: true } | { canceled: false; name: string; text: string };

/** Lets the learner choose a backup file and returns its text. The picked copy is removed afterwards. */
export async function pickBackupText(): Promise<PickedText> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return { canceled: true };
  const asset = result.assets[0];
  if (!asset) return { canceled: true };
  const file = new File(asset.uri);
  try {
    if (typeof asset.size === 'number' && asset.size > MAX_BACKUP_BYTES) {
      throw new Error('The file is too large to be a Recall backup.');
    }
    const text = await file.text();
    return { canceled: false, name: asset.name, text };
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      /* best effort */
    }
  }
}
