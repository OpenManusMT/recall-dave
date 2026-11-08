import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { AppProvider, openBestStore } from './lib/app-context';

async function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch {
    // Offline support is unavailable (e.g. not served over HTTPS); the app still works online.
  }
}

async function start() {
  const { store, persistence } = await openBestStore();
  const root = createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <StrictMode>
      <AppProvider initialStore={store} initialPersistence={persistence}>
        <App />
      </AppProvider>
    </StrictMode>,
  );
  void registerServiceWorker();
}

void start();
