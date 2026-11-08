import { useCallback, useState } from 'react';
import { Redirect, useFocusEffect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { dueReviewGroups } from '@recall/core';
import { useApp } from '../../lib/app-context';
import { Icon, type IconName } from '../../components/Icon';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'library', title: 'Read', icon: 'book' },
  { name: 'reviews', title: 'Reviews', icon: 'review' },
  { name: 'progress', title: 'Progress', icon: 'chart' },
  { name: 'settings', title: 'Settings', icon: 'settings' },
];

export default function TabsLayout() {
  const { settings, store, now, dataVersion, palette } = useApp();
  const [due, setDue] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void dueReviewGroups(store, now())
        .then((g) => {
          if (alive) setDue(g.reduce((n, x) => n + x.ideas.length, 0));
        })
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [store, now, dataVersion]),
  );

  if (!settings.onboardingDone) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarActiveBackgroundColor: palette.primarySoft,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.highContrast ? palette.text : palette.border,
          borderTopWidth: palette.highContrast ? 2 : 1,
        },
        tabBarItemStyle: { minHeight: 52, borderRadius: 10 },
        tabBarLabelStyle: { fontWeight: '600' },
        tabBarBadgeStyle: { backgroundColor: palette.primary, color: palette.primaryText },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) => <Icon name={t.icon} color={color} />,
            ...(t.name === 'reviews' && due > 0
              ? { tabBarBadge: due, tabBarAccessibilityLabel: `Reviews, ${due} due` }
              : { tabBarAccessibilityLabel: t.title }),
          }}
        />
      ))}
    </Tabs>
  );
}
