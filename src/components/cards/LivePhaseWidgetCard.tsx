import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { DailySchedule } from '../../types';
import { widgetService, WidgetPhaseData } from '../../services/widget/widgetService';
import { ProgressBar } from '../common/ProgressBar';
import { formatDateKey } from '../../utils/dateTime';
import { router } from 'expo-router';

interface LivePhaseWidgetCardProps {
  schedule: DailySchedule | null;
  onPhaseCompleted?: () => void;
}

export const LivePhaseWidgetCard: React.FC<LivePhaseWidgetCardProps> = ({
  schedule,
  onPhaseCompleted,
}) => {
  const [phaseData, setPhaseData] = useState<WidgetPhaseData | null>(null);

  useEffect(() => {
    if (!schedule) return;

    // Only run live countdown and sync if the schedule is for TODAY
    const todayKey = formatDateKey(new Date());
    if (schedule.date !== todayKey) {
      setPhaseData(null);
      return;
    }

    const update = () => {
      const now = new Date();
      if (schedule.date !== formatDateKey(now)) return;

      const current = widgetService.computeCurrentPhaseData(schedule, now);

      // If phase transitioned, trigger callback
      if (phaseData && current && current.phaseId !== phaseData.phaseId) {
        onPhaseCompleted?.();
      }

      setPhaseData(current);
      widgetService.updateWidgetData(schedule, now);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [schedule]);

  if (!phaseData) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/phase/${phaseData.phaseId}` as any)}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.liveIndicator}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveText}>CURRENT PHASE ACTIVE</Text>
        </View>

        <Text style={styles.timeWindow}>
          {phaseData.displayStartTime} – {phaseData.displayEndTime}
        </Text>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.leftCol}>
          <Text style={styles.phaseName}>{phaseData.phaseName}</Text>
          <View style={styles.coreRow}>
            <MaterialCommunityIcons name="star-four-points" size={14} color={colors.primary} />
            <Text style={styles.coreText} numberOfLines={1}>
              {phaseData.coreTaskTitle}
            </Text>
          </View>
        </View>

        <View style={styles.countdownBox}>
          <Text style={styles.countdownLabel}>Completes In</Text>
          <Text style={styles.countdownValue}>
            {phaseData.formattedCountdownToPhaseEnd}
          </Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>
            Phase Progress ({phaseData.completedTasksCount}/{phaseData.totalTasksCount} tasks)
          </Text>
          <Text style={styles.progressPercent}>{phaseData.progressPercent}%</Text>
        </View>
        <ProgressBar progress={phaseData.progressPercent} height={5} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.nextPhaseText}>
          Next: <Text style={styles.nextPhaseBold}>{phaseData.nextPhaseName}</Text>
        </Text>
        <View style={styles.tapToOpen}>
          <Text style={styles.tapToOpenText}>View Routine</Text>
          <MaterialCommunityIcons name="arrow-right" size={14} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D1B22',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  liveText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.heavy,
    color: colors.primaryLight,
    letterSpacing: 0.6,
  },
  timeWindow: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  leftCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  phaseName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.heavy,
    color: colors.textPrimary,
  },
  coreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  coreText: {
    fontSize: typography.fontSize.sm,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.semibold,
  },
  countdownBox: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  countdownLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  countdownValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  progressRow: {
    marginBottom: spacing.sm,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  progressPercent: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  nextPhaseText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  nextPhaseBold: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  tapToOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tapToOpenText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});
