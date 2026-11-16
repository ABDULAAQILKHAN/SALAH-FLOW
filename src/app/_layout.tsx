import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator, Text, Image } from 'react-native';
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
        <View style={styles.splashIconWrapper}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.splashTitle}>SalahFlow</Text>
        <Text style={styles.splashSubtitle}>Prayer-Aware Timetable & Routine</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 28 }} />
        <Text style={styles.loadingText}>Initializing routine...</Text>
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
  splashIconWrapper: {
    width: 104,
    height: 104,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  splashLogo: {
    width: 100,
    height: 100,
    borderRadius: 22,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  splashSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
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
