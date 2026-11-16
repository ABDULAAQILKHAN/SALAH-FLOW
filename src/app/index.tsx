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
import { CountdownCard } from '../components/cards/CountdownCard';
import { PrayerTimingCard } from '../components/cards/PrayerTimingCard';
import { LivePhaseWidgetCard } from '../components/cards/LivePhaseWidgetCard';
import { PhaseCard } from '../components/cards/PhaseCard';
import { ProgressBar } from '../components/common/ProgressBar';
import { ConflictModal } from '../components/dialogs/ConflictModal';
import {
  formatReadableDate,
  getGreeting,
  formatDateKey,
} from '../utils/dateTime';

export default function HomeScreen() {
  const { hasCompletedOnboarding, selectedDate, setSelectedDate } = useAppStore();
  const { todayTimings, nextPrayer, refreshTimings } = usePrayerStore();
  const {
    dailySchedule,
    loadSchedule,
    toggleTaskStatus,
    isLoading,
  } = useScheduleStore();

  const [refreshing, setRefreshing] = useState(false);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : insets.top;
  const topPadding = Math.max(statusBarHeight, insets.top) + spacing.md;

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

  const conflictsCount = dailySchedule?.conflicts?.length || 0;

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
        <View style={[styles.topBar, { paddingTop: topPadding }]}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.brandIcon}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.dateText}>{formatReadableDate()}</Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/prayers' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="mosque" size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/calendar' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/statistics' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="chart-box-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/settings' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="cog-outline" size={20} color={colors.textSecondary} />
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
          {/* Conflict Banner if any conflicts exist */}
          {conflictsCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setConflictModalVisible(true)}
              style={styles.conflictBanner}
            >
              <MaterialCommunityIcons
                name="alert-octagon"
                size={18}
                color={colors.gold}
              />
              <Text style={styles.conflictBannerText}>
                {conflictsCount} scheduling conflict{conflictsCount > 1 ? 's' : ''} detected. Tap to inspect.
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={colors.gold}
              />
            </TouchableOpacity>
          )}

          {/* Next Salah Countdown Card */}
          <CountdownCard
            nextPrayer={nextPrayer}
            currentPhaseName={dailySchedule?.currentPhase?.name}
            onPress={() => router.push('/prayers' as any)}
          />

          {/* Today's 5 Prayer Timings Horizontal Scroller */}
          <PrayerTimingCard
            timings={todayTimings}
            activePrayer={nextPrayer?.name}
          />

          {/* Live Phase Widget Card — Active Phase & Auto-Update on Completion */}
          {dailySchedule && (
            <LivePhaseWidgetCard
              schedule={dailySchedule}
              onPhaseCompleted={onRefresh}
            />
          )}

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

        {/* Conflict Inspection Modal */}
        {dailySchedule?.conflicts && (
          <ConflictModal
            visible={conflictModalVisible}
            conflicts={dailySchedule.conflicts}
            onClose={() => setConflictModalVisible(false)}
          />
        )}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
  },
  dateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.heavy,
    color: colors.textPrimary,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
