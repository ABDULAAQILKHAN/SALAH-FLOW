import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { usePrayerStore } from '../store/usePrayerStore';
import { useScheduleStore } from '../store/useScheduleStore';
import { colors, typography, spacing, borderRadius } from '../theme';
import { PrayerTimingCard } from '../components/cards/PrayerTimingCard';
import { PhaseCard } from '../components/cards/PhaseCard';
import { ProgressBar } from '../components/common/ProgressBar';
import { CitySelectorModal } from '../components/dialogs/CitySelectorModal';
import { MissingPermissionsBanner } from '../components/common/MissingPermissionsBanner';
import { LocationConfig } from '../types';
import { formatDateKey } from '../utils/dateTime';

export default function HomeScreen() {
  const { hasCompletedOnboarding, selectedDate } = useAppStore();
  const { location, todayTimings, nextPrayer, refreshTimings, updateLocation } = usePrayerStore();
  const {
    dailySchedule,
    loadSchedule,
    toggleTaskStatus,
    isLoading,
  } = useScheduleStore();

  const [refreshing, setRefreshing] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : insets.top;
  const topPadding = Math.max(statusBarHeight, insets.top) + spacing.sm;

  // If onboarding not completed, route there
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      router.replace('/onboarding');
    }
  }, [hasCompletedOnboarding]);

  const loadData = useCallback(async () => {
    const timings = await refreshTimings(new Date());
    await loadSchedule(selectedDate, timings);
  }, [selectedDate, refreshTimings, loadSchedule]);

  useEffect(() => {
    if (hasCompletedOnboarding) {
      loadData();
    }
  }, [hasCompletedOnboarding, selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectCity = async (loc: LocationConfig) => {
    await updateLocation(loc);
    const timings = await refreshTimings();
    await loadSchedule(selectedDate, timings);
  };

  return (
    <View style={styles.container}>
      {/* Streamlined Top App Bar */}
      <View style={[styles.topBar, { paddingTop: topPadding }]}>
        {/* Left: Brand */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.brandIcon}
            resizeMode="contain"
          />
          <Text style={styles.brandText}>SalahFlow</Text>
        </View>

        {/* Center: City Selector Chip */}
        <TouchableOpacity
          style={styles.cityChip}
          onPress={() => setCityModalVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="map-marker" size={13} color={colors.primary} />
          <Text style={styles.cityChipText} numberOfLines={1}>
            {location.cityName}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={13} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Right: Quick Options / Navigation */}
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/prayers' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="mosque" size={18} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/calendar' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/alarms/settings' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="bell-ring-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/settings' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="cog-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Warning Banner at top if critical permissions are missing */}
        <MissingPermissionsBanner />

        {/* Today's 5 Prayer Timings Horizontal Scroller */}
        <PrayerTimingCard
          timings={todayTimings}
          activePrayer={nextPrayer?.name}
        />

        {/* Today's Overall Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Daily Routine Progress</Text>
              <Text style={styles.progressSubtitle}>
                {dailySchedule?.completedTasks || 0} of {dailySchedule?.totalTasks || 0} tasks completed
              </Text>
            </View>
            <Text style={styles.progressPercent}>
              {dailySchedule?.overallProgress || 0}%
            </Text>
          </View>
          <ProgressBar
            progress={dailySchedule?.overallProgress || 0}
            color={colors.primary}
            height={7}
          />

          {/* Upcoming Task preview */}
          {dailySchedule?.upcomingTask && (
            <View style={styles.upcomingBox}>
              <MaterialCommunityIcons
                name="ray-start-arrow"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.upcomingLabel}>Next Task:</Text>
              <Text style={styles.upcomingTitle} numberOfLines={1}>
                {dailySchedule.upcomingTask.title} ({dailySchedule.upcomingTask.displayStartTime})
              </Text>
            </View>
          )}
        </View>

        {/* Section Header: Daily Phases */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeaderTitle}>Prayer-Oriented Phases</Text>
          <TouchableOpacity
            onPress={() => router.push('/phase/builder' as any)}
            style={styles.addPhaseButton}
          >
            <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
            <Text style={styles.addPhaseText}>Custom Phase</Text>
          </TouchableOpacity>
        </View>

        {/* Chronological Phase Cards */}
        {dailySchedule?.phases?.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            onToggleTaskStatus={async (taskId, status) => {
              if (todayTimings) {
                await toggleTaskStatus(taskId, status, todayTimings);
              }
            }}
          />
        ))}

        {/* Bottom spacing */}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Quick Add Task Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/task/new' as any)}
        style={styles.fab}
      >
        <MaterialCommunityIcons name="plus" size={26} color={colors.textOnPrimary} />
        <Text style={styles.fabText}>Add Task</Text>
      </TouchableOpacity>

      {/* Quick City Selector Modal */}
      <CitySelectorModal
        visible={cityModalVisible}
        currentCityName={location.cityName}
        onSelectCity={handleSelectCity}
        onClose={() => setCityModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.xs,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
  },
  brandText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 4,
    maxWidth: 120,
  },
  cityChipText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  conflictBannerText: {
    fontSize: typography.fontSize.xs,
    color: colors.gold,
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  progressSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressPercent: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.heavy,
    color: colors.primary,
  },
  upcomingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    gap: 6,
  },
  upcomingLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textMuted,
  },
  upcomingTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionHeaderTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  addPhaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addPhaseText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    gap: 6,
  },
  fabText: {
    color: colors.textOnPrimary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
  },
});
