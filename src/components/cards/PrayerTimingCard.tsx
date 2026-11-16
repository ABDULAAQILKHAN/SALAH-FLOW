import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { CalculatedTimes } from '../../services/prayer/prayerCalculator';
import { formatTime12h } from '../../utils/dateTime';

interface PrayerTimingCardProps {
  timings: CalculatedTimes | null;
  activePrayer?: string;
}

export const PrayerTimingCard: React.FC<PrayerTimingCardProps> = ({
  timings,
  activePrayer,
}) => {
  if (!timings) return null;

  const prayerItems: {
    key: string;
    label: string;
    time: Date;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    isSunnah?: boolean;
  }[] = [
    {
      key: 'tahajjud',
      label: 'Tahajjud',
      time: timings.tahajjud,
      icon: 'weather-night',
      isSunnah: true,
    },
    {
      key: 'fajr',
      label: 'Fajr',
      time: timings.fajr,
      icon: 'weather-sunset-up',
    },
    {
      key: 'sunrise',
      label: 'Sunrise',
      time: timings.sunrise,
      icon: 'weather-sunny',
      isSunnah: true,
    },
    {
      key: 'zuhr',
      label: 'Zuhr',
      time: timings.dhuhr,
      icon: 'white-balance-sunny',
    },
    {
      key: 'asr',
      label: 'Asr',
      time: timings.asr,
      icon: 'weather-partly-cloudy',
    },
    {
      key: 'maghrib',
      label: 'Maghrib',
      time: timings.maghrib,
      icon: 'weather-sunset-down',
    },
    {
      key: 'isha',
      label: 'Isha',
      time: timings.isha,
      icon: 'moon-waning-crescent',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Salah Schedule</Text>
        <Text style={styles.tag}>Hanafi Calculated</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {prayerItems.map((item) => {
          const isActive = activePrayer === item.key;
          return (
            <View
              key={item.key}
              style={[
                styles.itemCard,
                isActive && styles.itemCardActive,
                item.isSunnah && styles.itemCardSunnah,
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={18}
                color={isActive ? colors.primaryLight : colors.textSecondary}
              />
              <Text
                style={[
                  styles.itemLabel,
                  isActive && styles.itemLabelActive,
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.itemTime,
                  isActive && styles.itemTimeActive,
                ]}
              >
                {formatTime12h(item.time)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  tag: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  scrollContent: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  itemCard: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  itemCardActive: {
    backgroundColor: '#0F261E',
    borderColor: colors.primary,
  },
  itemCardSunnah: {
    borderStyle: 'dashed',
  },
  itemLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: typography.fontWeight.medium,
  },
  itemLabelActive: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.bold,
  },
  itemTime: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
    marginTop: 2,
  },
  itemTimeActive: {
    color: '#FFFFFF',
  },
});
