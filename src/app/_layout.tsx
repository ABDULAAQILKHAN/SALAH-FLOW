import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { usePrayerStore } from '../store/usePrayerStore';
import { colors, typography } from '../theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const { isInitialized, initApp, errorMessage } = useAppStore();
  const { loadSettings } = usePrayerStore();

  useEffect(() => {
    const start = async () => {
      await initApp();
      await loadSettings();
    };
    start();
  }, []);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing SalahFlow...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>Startup Error</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="phase/[id]" />
          <Stack.Screen name="phase/builder" />
          <Stack.Screen name="task/new" />
          <Stack.Screen name="task/[id]" />
          <Stack.Screen name="prayers/index" />
          <Stack.Screen name="calendar/index" />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="statistics/index" />
          <Stack.Screen name="alarms/test" />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 8,
  },
  errorText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
