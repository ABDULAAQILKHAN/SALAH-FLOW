import React, { useState, useEffect } from 'react';
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
import { colors, typography, spacing, borderRadius } from '../../theme';
import { formatDateKey, formatShortDate } from '../../utils/dateTime';
import { addDays, subDays } from 'date-fns';

export default function CalendarScreen() {
  const { loadSchedule, dailySchedule, toggleTaskStatus } = useScheduleStore();
  const { refreshTimings, todayTimings } = usePrayerStore();

  const [currentSelectedDate, setCurrentSelectedDate] = useState<Date>(new Date());

  // Generate 7-day strip centered around selected date
  const days = [-3, -2, -1, 0, 1, 2, 3].map((offset) => addDays(currentSelectedDate, offset));

  useEffect(() => {
    const fetch = async () => {
      const timings = await refreshTimings(currentSelectedDate);
      await loadSchedule(formatDateKey(currentSelectedDate), timings);
    };
    fetch();
  }, [currentSelectedDate]);

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
      />

      <View style={styles.container}>
        {/* Horizontal Week Strip */}
        <View style={styles.weekStrip}>
          {days.map((day) => {
            const isSelected = formatDateKey(day) === formatDateKey(currentSelectedDate);
            const isToday = formatDateKey(day) === formatDateKey(new Date());

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
                {isToday && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
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
                if (todayTimings) {
                  await toggleTaskStatus(taskId, status, todayTimings);
                }
              }}
            />
          ))}
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
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  dayCard: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 40,
  },
  dayCardSelected: {
    backgroundColor: colors.primary,
  },
  dayCardToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayName: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  dayNameSelected: {
    color: colors.textOnPrimary,
  },
  dayNum: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  dayNumSelected: {
    color: colors.textOnPrimary,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: spacing.md,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
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
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.heavy,
    color: colors.textPrimary,
    marginTop: 2,
  },
});
