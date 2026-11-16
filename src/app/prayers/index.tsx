import React, { useState } from 'react';
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
import { usePrayerStore } from '../../store/usePrayerStore';
import { calculatePrayerTimes } from '../../services/prayer/prayerCalculator';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { formatTime12h, formatShortDate, formatDateKey } from '../../utils/dateTime';
import { addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export default function PrayerScheduleScreen() {
  const { location, prayerConfig, todayTimings, nextPrayer } = usePrayerStore();

  const [activeTab, setActiveTab] = useState<'today' | 'monthly'>('today');
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());

  // Generate days for monthly view
  const monthStart = startOfMonth(selectedMonthDate);
  const monthEnd = endOfMonth(selectedMonthDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Salah Timetable" subtitle={`${location.cityName}, ${location.countryName}`} showBack={true} />

      <View style={styles.container}>
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'today' && styles.tabButtonActive]}
            onPress={() => setActiveTab('today')}
          >
            <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
              Today's Timings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'monthly' && styles.tabButtonActive]}
            onPress={() => setActiveTab('monthly')}
          >
            <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
              Monthly Calendar
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'today' ? (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            {/* Countdown Summary */}
            {nextPrayer && (
              <View style={styles.nextBox}>
                <View style={styles.nextLeft}>
                  <Text style={styles.nextLabel}>NEXT PRAYER</Text>
                  <Text style={styles.nextTitle}>{nextPrayer.displayName}</Text>
                  <Text style={styles.nextTime}>{nextPrayer.formattedTime}</Text>
                </View>
                <View style={styles.nextRight}>
                  <Text style={styles.countdownTitle}>In</Text>
                  <Text style={styles.countdownValue}>{nextPrayer.formattedCountdown}</Text>
                </View>
              </View>
            )}

            {/* Prayer Cards */}
            {todayTimings && (
              <View style={styles.prayerList}>
                {[
                  { key: 'tahajjud', name: 'Tahajjud (Qiyam)', time: todayTimings.tahajjud, note: 'Sunnah / Pre-dawn vigil', icon: 'weather-night' },
                  { key: 'fajr', name: 'Fajr', time: todayTimings.fajr, note: 'Obligatory Dawn Prayer', icon: 'weather-sunset-up' },
                  { key: 'sunrise', name: 'Sunrise (Shuruq)', time: todayTimings.sunrise, note: 'End of Fajr window', icon: 'weather-sunny' },
                  { key: 'zuhr', name: 'Zuhr (Dhuhr)', time: todayTimings.dhuhr, note: 'Obligatory Midday Prayer', icon: 'white-balance-sunny' },
                  { key: 'asr', name: 'Asr', time: todayTimings.asr, note: 'Obligatory Afternoon (Hanafi)', icon: 'weather-partly-cloudy' },
                  { key: 'maghrib', name: 'Maghrib', time: todayTimings.maghrib, note: 'Obligatory Sunset Prayer', icon: 'weather-sunset-down' },
                  { key: 'isha', name: 'Isha', time: todayTimings.isha, note: 'Obligatory Night Prayer', icon: 'moon-waning-crescent' },
                ].map((item) => {
                  const isNext = nextPrayer?.name === item.key;
                  return (
                    <View
                      key={item.key}
                      style={[
                        styles.prayerRowCard,
                        isNext && styles.prayerRowCardActive,
                      ]}
                    >
                      <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, isNext && styles.iconCircleActive]}>
                          <MaterialCommunityIcons
                            name={item.icon as any}
                            size={20}
                            color={isNext ? colors.primary : colors.textSecondary}
                          />
                        </View>
                        <View>
                          <Text style={[styles.prayerName, isNext && styles.prayerNameActive]}>
                            {item.name}
                          </Text>
                          <Text style={styles.prayerNote}>{item.note}</Text>
                        </View>
                      </View>

                      <Text style={[styles.timeText, isNext && styles.timeTextActive]}>
                        {formatTime12h(item.time)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Calculation Parameters Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Calculation Parameters</Text>
              <Text style={styles.infoText}>• Method: {prayerConfig.method}</Text>
              <Text style={styles.infoText}>
                • Asr Jurisprudence: {prayerConfig.asrMethod === 'hanafi' ? 'Hanafi (2x shadow factor)' : 'Standard / Shafi'}
              </Text>
              <Text style={styles.infoText}>• Coordinates: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°</Text>
              <Text style={styles.infoText}>• 100% astronomical Adhan JS calculation running offline</Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            <Text style={styles.monthlyNote}>
              Timetable pre-calculated offline for {monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}:
            </Text>

            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { width: 55 }]}>Date</Text>
                <Text style={styles.thCell}>Fajr</Text>
                <Text style={styles.thCell}>Zuhr</Text>
                <Text style={styles.thCell}>Asr</Text>
                <Text style={styles.thCell}>Maghrib</Text>
                <Text style={styles.thCell}>Isha</Text>
              </View>

              {daysInMonth.map((day) => {
                const dayTimes = calculatePrayerTimes(day, location, prayerConfig);
                const isToday = formatDateKey(day) === formatDateKey(new Date());

                return (
                  <View key={day.toISOString()} style={[styles.tableRow, isToday && styles.tableRowToday]}>
                    <Text style={[styles.tdCell, { width: 55 }, isToday && styles.tdToday]}>
                      {formatShortDate(day)}
                    </Text>
                    <Text style={[styles.tdCell, isToday && styles.tdToday]}>
                      {formatTime12h(dayTimes.fajr)}
                    </Text>
                    <Text style={[styles.tdCell, isToday && styles.tdToday]}>
                      {formatTime12h(dayTimes.dhuhr)}
                    </Text>
                    <Text style={[styles.tdCell, isToday && styles.tdToday]}>
                      {formatTime12h(dayTimes.asr)}
                    </Text>
                    <Text style={[styles.tdCell, isToday && styles.tdToday]}>
                      {formatTime12h(dayTimes.maghrib)}
                    </Text>
                    <Text style={[styles.tdCell, isToday && styles.tdToday]}>
                      {formatTime12h(dayTimes.isha)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: borderRadius.md,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  nextBox: {
    backgroundColor: '#0E1C24',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextLeft: {
    flex: 1,
  },
  nextLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight.heavy,
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  nextTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.heavy,
    color: colors.textPrimary,
    marginTop: 2,
  },
  nextTime: {
    fontSize: typography.fontSize.sm,
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.medium,
  },
  nextRight: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  countdownTitle: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  countdownValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  prayerList: {
    gap: spacing.sm,
  },
  prayerRowCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  prayerRowCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#0F221B',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.primaryMuted,
  },
  prayerName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  prayerNameActive: {
    color: colors.primaryLight,
  },
  prayerNote: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  timeTextActive: {
    color: colors.primaryLight,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  infoTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  monthlyNote: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  thCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: typography.fontWeight.heavy,
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  tableRowToday: {
    backgroundColor: '#0F261D',
  },
  tdCell: {
    flex: 1,
    fontSize: 10,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tdToday: {
    color: colors.primaryLight,
    fontWeight: typography.fontWeight.bold,
  },
});
