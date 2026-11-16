import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { usePrayerStore } from '../store/usePrayerStore';
import { locationService } from '../services/location/locationService';
import { alarmPermissions } from '../services/alarms/alarmPermissions';
import {
  CALCULATION_METHODS,
  POPULAR_LOCATIONS,
  DEFAULT_LOCATION,
  DEFAULT_PRAYER_CONFIG,
} from '../constants/prayers';
import { LocationConfig, PrayerCalculationConfig, AsrMethod } from '../types';
import { Button } from '../components/common/Button';

export default function OnboardingScreen() {
  const { setOnboardingCompleted } = useAppStore();
  const { updateLocation, updatePrayerConfig } = usePrayerStore();

  const [selectedLocation, setSelectedLocation] = useState<LocationConfig>(DEFAULT_LOCATION);
  const [selectedMethod, setSelectedMethod] = useState<string>('Karachi');
  const [isHanafi, setIsHanafi] = useState<boolean>(true);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : insets.top;
  const topPadding = Math.max(statusBarHeight, insets.top) + spacing.md;

  const handleDetectGps = async () => {
    setDetectingGps(true);
    setGpsError(null);
    try {
      const loc = await locationService.getCurrentLocation();
      setSelectedLocation(loc);
    } catch (e: any) {
      setGpsError('Could not detect GPS location. Please pick a city below.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleFinish = async () => {
    // 1. Request notifications permission
    await alarmPermissions.requestNotificationPermissions();

    // 2. Save location and prayer settings
    await updateLocation(selectedLocation);

    const prayerConfig: PrayerCalculationConfig = {
      ...DEFAULT_PRAYER_CONFIG,
      method: selectedMethod,
      asrMethod: isHanafi ? 'hanafi' : 'standard',
    };
    await updatePrayerConfig(prayerConfig);

    // 3. Mark onboarding completed and navigate home
    await setOnboardingCompleted(true);
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <MaterialCommunityIcons name="mosque" size={32} color={colors.primary} />
        </View>
        <Text style={styles.brandTitle}>SalahFlow</Text>
        <Text style={styles.brandSubtitle}>
          Offline-first, prayer-aware daily timetable. Your day organized around the five obligatory prayers.
        </Text>
      </View>

      {/* Step 1: Location */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="map-marker-radius" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>1. Set Location</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Astronomical prayer times require accurate geographic coordinates.
        </Text>

        <TouchableOpacity
          style={styles.gpsButton}
          onPress={handleDetectGps}
          disabled={detectingGps}
        >
          {detectingGps ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
          )}
          <Text style={styles.gpsButtonText}>
            {detectingGps ? 'Detecting Coordinates...' : 'Auto-Detect via GPS'}
          </Text>
        </TouchableOpacity>

        {gpsError && <Text style={styles.errorText}>{gpsError}</Text>}

        <Text style={styles.pickerLabel}>Or Select Your City:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}>
          {POPULAR_LOCATIONS.map((city) => {
            const isSelected = selectedLocation.cityName === city.cityName;
            return (
              <TouchableOpacity
                key={city.cityName}
                onPress={() => setSelectedLocation(city)}
                style={[styles.cityChip, isSelected && styles.cityChipSelected]}
              >
                <Text style={[styles.cityChipText, isSelected && styles.cityChipTextSelected]}>
                  {city.cityName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.selectedBox}>
          <Text style={styles.selectedLabel}>Selected:</Text>
          <Text style={styles.selectedValue}>
            {selectedLocation.cityName}, {selectedLocation.countryName} ({selectedLocation.latitude.toFixed(2)}°, {selectedLocation.longitude.toFixed(2)}°)
          </Text>
        </View>
      </View>

      {/* Step 2: Calculation Method */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="calculator" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>2. Calculation Method</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Default set to Karachi (University of Islamic Sciences) for South Asia / India.
        </Text>

        {CALCULATION_METHODS.slice(0, 4).map((method) => {
          const isSelected = selectedMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              onPress={() => setSelectedMethod(method.id)}
              style={[styles.methodItem, isSelected && styles.methodItemSelected]}
            >
              <View style={styles.radio}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodName, isSelected && styles.methodNameSelected]}>
                  {method.name}
                </Text>
                <Text style={styles.methodDesc}>{method.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Step 3: Hanafi Asr */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="weather-sunny" size={20} color={colors.gold} />
              <Text style={styles.sectionTitle}>Hanafi Asr Timing</Text>
            </View>
            <Text style={styles.sectionDesc}>
              Calculates Asr when shadow equals twice object length (standard for Hanafi jurisprudence).
            </Text>
          </View>
          <Switch
            value={isHanafi}
            onValueChange={setIsHanafi}
            trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
            thumbColor={isHanafi ? '#FFFFFF' : colors.textMuted}
          />
        </View>
      </View>

      {/* Step 4: Alarms & Offline Note */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="bell-ring-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Exact Alarms & Offline Ready</Text>
        </View>
        <Text style={styles.sectionDesc}>
          SalahFlow calculates an entire year of prayer times completely offline. We will request notification access so your task alarms fire on time.
        </Text>
      </View>

      {/* Action Button */}
      <View style={styles.footer}>
        <Button
          title="Complete Setup & Open Planner"
          onPress={handleFinish}
          variant="primary"
          size="lg"
          icon="check-circle-outline"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  brandTitle: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.heavy,
    color: colors.textPrimary,
  },
  brandSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  sectionDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  gpsButtonText: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  pickerLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  cityScroll: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  cityChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cityChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  cityChipText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  cityChipTextSelected: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.bold,
  },
  selectedBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
  },
  selectedLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  selectedValue: {
    fontSize: typography.fontSize.sm,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  methodItemSelected: {
    borderColor: colors.primary,
    backgroundColor: '#0F231D',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  methodNameSelected: {
    color: colors.primaryLight,
  },
  methodDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    marginTop: spacing.md,
  },
});
