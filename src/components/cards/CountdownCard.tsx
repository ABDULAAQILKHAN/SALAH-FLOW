import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { NextPrayerInfo } from '../../services/prayer/prayerCalculator';
import { formatRemainingCountdown } from '../../utils/dateTime';

interface CountdownCardProps {
  nextPrayer: NextPrayerInfo | null;
  currentPhaseName?: string;
  onPress?: () => void;
}

export const CountdownCard: React.FC<CountdownCardProps> = ({
  nextPrayer,
  currentPhaseName,
  onPress,
}) => {
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (!nextPrayer) return;

    const update = () => {
      setCountdown(formatRemainingCountdown(nextPrayer.time, new Date()));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextPrayer]);

  if (!nextPrayer) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color={colors.primary}
            style={styles.badgeIcon}
          />
          <Text style={styles.badgeText}>NEXT PRAYER</Text>
        </View>

        {currentPhaseName && (
          <Text style={styles.phaseText}>In {currentPhaseName}</Text>
        )}
      </View>

      <View style={styles.centerRow}>
        <View>
          <Text style={styles.prayerName}>{nextPrayer.displayName}</Text>
          <Text style={styles.prayerTime}>{nextPrayer.formattedTime}</Text>
        </View>

        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>Time Remaining</Text>
          <Text style={styles.countdownValue}>{countdown || nextPrayer.formattedCountdown}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <MaterialCommunityIcons
          name="mosque"
          size={16}
          color={colors.textSecondary}
          style={{ marginRight: 6 }}
        />
        <Text style={styles.footerText}>
          Organized around obligatory prayer times
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0E1726',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: typography.fontWeight.heavy,
    letterSpacing: 0.8,
  },
  phaseText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  prayerName: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.heavy,
    color: colors.textPrimary,
  },
  prayerTime: {
    fontSize: typography.fontSize.md,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.medium,
    marginTop: 2,
  },
  countdownContainer: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  countdownLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  countdownValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingTop: spacing.sm,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: typography.fontSize.xs,
  },
});
