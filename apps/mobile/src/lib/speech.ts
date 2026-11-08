/**
 * Read-aloud with expo-speech, which uses Apple's on-device voices
 * (AVSpeechSynthesizer). No audio is recorded and nothing is sent anywhere.
 */
import * as Speech from 'expo-speech';

let britishVoice: string | null | undefined;

async function pickVoice(): Promise<string | undefined> {
  if (britishVoice !== undefined) return britishVoice ?? undefined;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const gb = voices.filter((v) => v.language === 'en-GB' || v.language === 'en_GB');
    const best = gb.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ?? gb[0];
    britishVoice = best?.identifier ?? null;
  } catch {
    britishVoice = null;
  }
  return britishVoice ?? undefined;
}

export function canReadAloud(): boolean {
  return true;
}

/** Start reading `text` aloud. `onEnd` runs when it finishes, is stopped, or fails. */
export async function speak(text: string, onEnd: () => void): Promise<void> {
  await Speech.stop();
  const voice = await pickVoice();
  Speech.speak(text, {
    language: 'en-GB',
    rate: 0.9,
    ...(voice ? { voice } : {}),
    onDone: onEnd,
    onStopped: onEnd,
    onError: onEnd,
  });
}

export function stopSpeaking(): void {
  void Speech.stop();
}
