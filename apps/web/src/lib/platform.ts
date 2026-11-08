/** iPhone/iPad Safari detection for install guidance (feature hints only; never used for tracking). */
export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** True when running from the Home Screen (installed PWA). */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}

/** Per-device convenience flags. Storage may be unavailable (private mode): never throw. */
export function getFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(`recall.${key}`) === '1';
  } catch {
    return false;
  }
}

export function setFlag(key: string) {
  try {
    window.localStorage.setItem(`recall.${key}`, '1');
  } catch {
    /* ignore */
  }
}
