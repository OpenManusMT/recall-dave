import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';

/** Leave a focused screen (reading, reviews, finish) and show the Home tab. */
export function goHome(): void {
  router.dismissTo('/');
}

/** Leave a focused screen and show the Read (library) tab. */
export function goLibrary(): void {
  router.dismissTo('/library');
}

/** Close a focused screen: go back if there is somewhere to go back to, otherwise show Home. */
export function closeScreen(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Load data when the screen comes into focus and whenever `deps` change while
 * it is focused (tabs stay mounted, so this keeps them fresh after a session).
 */
export function useFocusedData<T>(load: () => Promise<T>, deps: readonly unknown[]): T | null {
  const [data, setData] = useState<T | null>(null);
  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      let alive = true;
      load()
        .then((d) => {
          if (alive) setData(d);
        })
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, deps),
  );
  return data;
}
