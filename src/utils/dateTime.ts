import {
  format,
  parse,
  addMinutes,
  subMinutes,
  differenceInMinutes,
  differenceInSeconds,
  isBefore,
  isAfter,
  isValid,
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  setSeconds,
} from 'date-fns';

export function formatDateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatReadableDate(date: Date = new Date()): string {
  return format(date, 'EEEE, d MMMM yyyy');
}

export function formatShortDate(date: Date = new Date()): string {
  return format(date, 'EEE, d MMM');
}

export function formatTime12h(date: Date): string {
  if (!isValid(date)) return '--:--';
  return format(date, 'h:mm a');
}

export function formatTime24h(date: Date): string {
  if (!isValid(date)) return '--:--';
  return format(date, 'HH:mm');
}

export function parseTimeToDate(timeString: string, baseDate: Date = new Date()): Date {
  // timeString can be "HH:mm" (24h) or "h:mm a"
  const clean = timeString.trim();
  const dateObj = new Date(baseDate);

  if (clean.includes(':')) {
    const parts = clean.split(':');
    const hours = parseInt(parts[0], 10);
    const mins = parseInt(parts[1].substring(0, 2), 10);
    if (!isNaN(hours) && !isNaN(mins)) {
      return setMinutes(setHours(dateObj, hours), mins);
    }
  }

  return baseDate;
}

export function addMinutesToDate(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

export function subMinutesFromDate(date: Date, minutes: number): Date {
  return subMinutes(date, minutes);
}

export function getMinutesDifference(dateLeft: Date, dateRight: Date): number {
  return differenceInMinutes(dateLeft, dateRight);
}

export function formatRemainingCountdown(targetDate: Date, fromDate: Date = new Date()): string {
  const totalSeconds = differenceInSeconds(targetDate, fromDate);
  if (totalSeconds <= 0) return 'Now';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return 'Blessed Night';
  if (hour < 12) return 'Good Morning';
  if (hour < 16) return 'Good Afternoon';
  if (hour < 20) return 'Peaceful Evening';
  return 'Peaceful Night';
}

export function isTimeInRange(target: Date, start: Date, end: Date): boolean {
  return (isAfter(target, start) || target.getTime() === start.getTime()) &&
         (isBefore(target, end) || target.getTime() === end.getTime());
}
