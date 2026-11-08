import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../lib/app-context';

function ThemedStack() {
  const { palette, settings } = useApp();
  const base = palette.dark ? DarkTheme : DefaultTheme;
  const theme: Theme = {
    ...base,
    dark: palette.dark,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.bg,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.primary,
    },
  };
  return (
    <ThemeProvider value={theme}>
      <StatusBar style={palette.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
          animation: settings.reduceMotion ? 'none' : 'default',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
        <Stack.Screen name="add" />
        <Stack.Screen name="read/[passageId]" />
        <Stack.Screen name="doc/[documentId]" />
        <Stack.Screen name="probe/[passageId]" />
        <Stack.Screen name="review-run" />
        <Stack.Screen name="finish/[sessionId]" options={{ gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemedStack />
      </AppProvider>
    </SafeAreaProvider>
  );
}
