import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { PhaseCard } from '../../components/cards/PhaseCard';
import { useScheduleStore } from '../../store/useScheduleStore';
import { usePrayerStore } from '../../store/usePrayerStore';
import { useAppStore } from '../../store/useAppStore';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { formatDateKey } from '../../utils/dateTime';
import { addDays, subDays, isSameDay } from 'date-fns';
import { router } from 'expo-router';
import { CalculatedTimes } from '../../services/prayer/prayerCalculator';

export default function CalendarScreen() {
  const { loadSchedule, dailySchedule, toggleTaskStatus } = useScheduleStore();
  const { refreshTimings, todayTimings } = usePrayerStore();
  const { setSelectedDate } = useAppStore();

  const [currentSelectedDate, setCurrentSelectedDate] = useState<Date>(new Date());
  const [selectedDayTimings, setSelectedDayTimings] = useState<CalculatedTimes | null>(null);

  // Stable 21-day strip (7 days past, today, 13 days future)
  const baseToday = useMemo(() => new Date(), []);
  const days = useMemo(() => {
    const list: Date[] = [];
    for (let offset = -7; offset <= 14; offset++) {
      list.push(addDays(baseToday, offset));
    }
    return list;
  }, [baseToday]);

  useEffect(() => {
    let isCancelled = false;

    const fetch = async () => {
      const timings = await refreshTimings(currentSelectedDate);
      if (isCancelled) return;
      setSelectedDayTimings(timings);
      await loadSchedule(formatDateKey(currentSelectedDate), timings);
    };

    fetch();

    return () => {
      isCancelled = true;
    };
  }, [currentSelectedDate]);

  const isTodaySelected = isSameDay(currentSelectedDate, new Date());

  const handleSetAsActiveOnDashboard = () => {
    const key = formatDateKey(currentSelectedDate);
    setSelectedDate(key);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Calendar & Routine"
        subtitle={currentSelectedDate.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
        showBack={true}
        rightAction={{
          icon: 'home-export-outline',
          onPress: handleSetAsActiveOnDashboard,
        }}
      />

      <View style={styles.container}>
        {/* Navigation & Quick Jump Bar */}
        <View style={styles.subBar}>
          <TouchableOpacity
            style={[styles.jumpTodayBtn, isTodaySelected && styles.jumpTodayBtnActive]}
            onPress={() => setCurrentSelectedDate(new Date())}
          >
            <MaterialCommunityIcons
              name="calendar-today"
              size={14}
              color={isTodaySelected ? colors.textOnPrimary : colors.primary}
            />
            <Text
              style={[
                styles.jumpTodayText,
                isTodaySelected && styles.jumpTodayTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.openDashboardBtn}
            onPress={handleSetAsActiveOnDashboard}
          >
            <Text style={styles.openDashboardText}>Set as Active Routine</Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color={colors.primaryLight} />
          </TouchableOpacity>
        </View>

        {/* Horizontal Week Strip (Scrollable, stable) */}
        <View style={styles.weekStripContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekStripContent}
          >
            {days.map((day) => {
              const isSelected = formatDateKey(day) === formatDateKey(currentSelectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  onPress={() => setCurrentSelectedDate(day)}
                  style={[
                    styles.dayCard,
                    isSelected && styles.dayCardSelected,
                    isToday && !isSelected && styles.dayCardToday,
                  ]}
                >
                  <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                    {day.toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </Text>
                  <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>
                    {day.getDate()}
                  </Text>
                  {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Day Routine Overview */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Tasks</Text>
              <Text style={styles.statValue}>{dailySchedule?.totalTasks || 0}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statValue}>{dailySchedule?.completedTasks || 0}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Adherence</Text>
              <Text style={styles.statValue}>{dailySchedule?.overallProgress || 0}%</Text>
            </View>
          </View>

          {/* Chronological Phase Cards */}
          {dailySchedule?.phases?.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              onToggleTaskStatus={async (taskId, status) => {
                const timings = selectedDayTimings || todayTimings;
                if (timings) {
                  await toggleTaskStatus(taskId, status, timings);
                }
              }}
            />
          ))}

          {(!dailySchedule?.phases || dailySchedule.phases.length === 0) && (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No routine loaded for this date.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  subBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  jumpTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 4,
  },
  jumpTodayBtnActive: {
    backgroundColor: colors.primary,
  },
  jumpTodayText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  jumpTodayTextActive: {
    color: colors.textOnPrimary,
  },
  openDashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openDashboardText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
  },
  weekStripContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    paddingVertical: spacing.sm,
  },
  weekStripContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  dayCard: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 44,
  },
  dayCardSelected: {
    backgroundColor: colors.primary,
  },
  dayCardToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dayNameSelected: {
    color: colors.textOnPrimary,
  },
  dayNum: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  dayNumSelected: {
    color: colors.textOnPrimary,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  todayDotSelected: {
    backgroundColor: colors.textOnPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
});
