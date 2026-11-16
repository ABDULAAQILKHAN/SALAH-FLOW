import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { ProgressBar } from '../../components/common/ProgressBar';
import { dailyTaskStatusRepository } from '../../database/repositories/dailyTaskStatusRepository';
import { taskRepository } from '../../database/repositories/taskRepository';
import { phaseRepository } from '../../database/repositories/phaseRepository';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { formatDateKey } from '../../utils/dateTime';
import { subDays } from 'date-fns';

export default function StatisticsScreen() {
  const [totalCompleted, setTotalCompleted] = useState<number>(0);
  const [totalSkipped, setTotalSkipped] = useState<number>(0);
  const [activeStreakDays, setActiveStreakDays] = useState<number>(0);
  const [recentStats, setRecentStats] = useState<
    { date: string; total: number; completed: number; skipped: number }[]
  >([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date();
        const start = formatDateKey(subDays(today, 14));
        const end = formatDateKey(today);

        const stats = await dailyTaskStatusRepository.getCompletionStats(start, end);
        setRecentStats(stats);

        let completed = 0;
        let skipped = 0;
        let streak = 0;

        for (const s of stats) {
          completed += s.completed;
          skipped += s.skipped;
          if (s.completed > 0) {
            streak++;
          }
        }

        setTotalCompleted(completed);
        setTotalSkipped(skipped);
        setActiveStreakDays(streak);
      } catch (e) {
        console.warn('Failed to load stats:', e);
      }
    };
    fetchStats();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Statistics & Consistency" subtitle="Routine adherence over time" showBack={true} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Metric Cards Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="check-decagram" size={24} color={colors.primary} />
            <Text style={styles.metricValue}>{totalCompleted}</Text>
            <Text style={styles.metricLabel}>Tasks Completed</Text>
          </View>

          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="fire" size={24} color={colors.gold} />
            <Text style={styles.metricValue}>{activeStreakDays}</Text>
            <Text style={styles.metricLabel}>Active Streak Days</Text>
          </View>
        </View>

        {/* 14-Day Consistency History */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Last 14 Days Adherence</Text>
          <Text style={styles.sectionDesc}>
            Daily completion of core Salah and routine activities.
          </Text>

          {recentStats.length === 0 ? (
            <Text style={styles.emptyText}>
              Complete tasks on the home timetable to start building your streak history.
            </Text>
          ) : (
            recentStats.map((item) => {
              const rate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
              return (
                <View key={item.date} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>{item.date}</Text>
                    <Text style={styles.historyCount}>
                      {item.completed} of {item.total} tasks
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyPercent}>{rate}%</Text>
                    <ProgressBar progress={rate} height={5} style={{ width: 80 }} />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Salah Tracking Pillar */}
        <View style={styles.card}>
          <View style={styles.pillarHeader}>
            <MaterialCommunityIcons name="mosque" size={22} color={colors.primary} />
            <Text style={styles.sectionHeader}>Salah As Anchor Principle</Text>
          </View>
          <Text style={styles.pillarText}>
            SalahFlow grounds all daily activities in the five daily prayers. By protecting Tahajjud and Fajr at dawn, Zuhr at midday, Asr in the afternoon, Maghrib at dusk, and Isha at night, activities shift naturally with seasonal astronomical changes without disturbing your religious routine.
          </Text>
        </View>
      </ScrollView>
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
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  metricValue: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.heavy,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  metricLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
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
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  sectionDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  historyCount: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyPercent: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  pillarText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
