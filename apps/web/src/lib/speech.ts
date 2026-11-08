/**
 * Read-aloud uses the browser's built-in speech synthesis (on iPhone this is
 * Apple's on-device voices). It is offered only when the feature exists.
 */
export function canReadAloud(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'en-GB' && v.localService) ?? voices.find((v) => v.lang === 'en-GB') ?? voices.find((v) => v.lang.startsWith('en'));
}

export function speak(text: string, onEnd?: () => void): boolean {
  if (!canReadAloud()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB';
  u.rate = 0.9;
  const v = pickVoice();
  if (v) u.voice = v;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (canReadAloud()) window.speechSynthesis.cancel();
}
