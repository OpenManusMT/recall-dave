/** Save a text file locally (no network). On iPhone this opens the share sheet / Files. */
export async function saveTextFile(name: string, text: string): Promise<'shared' | 'downloaded'> {
  const blob = new Blob([text], { type: 'application/json' });
  const file = typeof File === 'function' ? new File([blob], name, { type: 'application/json' }) : null;
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (file && nav.canShare?.({ files: [file] }) && typeof nav.share === 'function') {
    try {
      await nav.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}
