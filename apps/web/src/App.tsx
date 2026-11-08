import { useEffect, useState } from 'react';
import { dueReviewGroups } from '@recall/core';
import { useApp } from './lib/app-context';
import { navigate, useRoute } from './lib/router';
import { ErrorBanner, TabBar } from './components/ui';
import { Home } from './screens/Home';
import { AddReading, Library } from './screens/Library';
import { ReadSession } from './screens/ReadSession';
import { ReviewRun, ReviewsOverview } from './screens/Reviews';
import { Insights } from './screens/Insights';
import { SettingsScreen } from './screens/Settings';
import { Finish, Onboarding } from './screens/Onboarding';

const FOCUSED = ['read', 'doc', 'probe', 'welcome', 'add', 'finish'];

export function App() {
  const route = useRoute();
  const { settings, store, now, dataVersion, error, setError } = useApp();
  const [due, setDue] = useState(0);
  const [first] = route.segments;
  const focused = FOCUSED.includes(first ?? '') || (first === 'reviews' && route.segments[1] === 'run');

  useEffect(() => {
    if (!settings.onboardingDone && first !== 'welcome') navigate('/welcome', { replace: true });
  }, [settings.onboardingDone, first]);

  useEffect(() => {
    void dueReviewGroups(store, now())
      .then((g) => setDue(g.reduce((n, x) => n + x.ideas.length, 0)))
      .catch(() => setDue(0));
  }, [store, now, dataVersion, route.path]);

  useEffect(() => {
    const titles: Record<string, string> = {
      '': 'Home',
      library: 'Choose something to read',
      add: 'Paste your own reading',
      reviews: 'Reviews',
      insights: 'Progress',
      settings: 'Settings',
      welcome: 'Welcome',
      read: 'Reading',
      doc: 'Reading',
      probe: 'Fresh-text check',
      finish: 'Session finished',
    };
    document.title = `${titles[first ?? ''] ?? 'Recall'} · Recall`;
  }, [first]);

  const mode = route.query.get('mode') === 'read' ? 'read' : 'remember';
  let screen: React.ReactNode;
  switch (first) {
    case undefined:
      screen = <Home />;
      break;
    case 'welcome':
      screen = <Onboarding />;
      break;
    case 'library':
      screen = <Library />;
      break;
    case 'add':
      screen = <AddReading />;
      break;
    case 'read':
      screen = <ReadSession key={route.path + mode} passageId={route.segments[1]} mode={mode} />;
      break;
    case 'doc':
      screen = <ReadSession key={route.path + mode} documentId={route.segments[1]} mode={mode} />;
      break;
    case 'probe':
      screen = <ReadSession key={route.path} passageId={route.segments[1]} mode="probe" />;
      break;
    case 'reviews':
      screen = route.segments[1] === 'run' ? <ReviewRun key={route.path} thenRead={route.query.get('then') === 'read'} /> : <ReviewsOverview />;
      break;
    case 'insights':
      screen = <Insights />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    case 'finish':
      screen = <Finish sessionId={route.segments[1] ?? ''} />;
      break;
    default:
      screen = (
        <div className="stack-lg">
          <h1>Page not found</h1>
          <a className="btn primary block" href="#/">
            Go to Home
          </a>
        </div>
      );
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <main id="main" tabIndex={-1} className={`main ${focused ? 'focused' : ''}`}>
        {error ? <ErrorBanner message={error} onClose={() => setError(null)} /> : null}
        {screen}
      </main>
      {focused ? null : <TabBar current={route.path} reviewsDue={due} />}
    </div>
  );
}
