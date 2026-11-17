export type PhaseType =
  | 'fajr_early_morning'
  | 'zuhr_morning_midday'
  | 'asr_afternoon'
  | 'maghrib_evening'
  | 'isha_night'
  | 'custom';

export type PrayerName =
  | 'fajr'
  | 'sunrise'
  | 'zuhr'
  | 'asr'
  | 'maghrib'
  | 'isha'
  | 'tahajjud';

export type TaskType = 'prayer' | 'activity' | 'custom_core';

export type SchedulingType = 'prayer_relative' | 'fixed_time' | 'flexible';

export type AnchorRelation = 'before' | 'after';

export type TaskPriority = 'low' | 'medium' | 'high' | 'core';

export type TaskStatus = 'pending' | 'completed' | 'skipped';

export type RepeatRule = 'daily' | 'weekdays' | 'weekends' | 'none';

export type AsrMethod = 'hanafi' | 'standard';

export interface Phase {
  id: string;
  name: string;
  type: PhaseType;
  sortOrder: number;
  isDefault: boolean;
  isEnabled: boolean;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  phaseId: string;
  title: string;
  description?: string;
  taskType: TaskType;
  isCore: boolean;
  prayerType?: PrayerName;
  sortOrder: number;
  durationMinutes: number;
  schedulingType: SchedulingType;
  fixedTime?: string; // HH:mm (24-hour)
  anchorPrayer?: PrayerName;
  anchorRelation?: AnchorRelation;
  offsetMinutes: number;
  priority: TaskPriority;
  isEnabled: boolean;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAlarm {
  id: string;
  taskId: string;
  isEnabled: boolean;
  alarmTime?: string; // HH:mm
  reminderMinutes: number; // 0, 5, 10, 15, 30
  soundEnabled: boolean;
  soundTone?: string; // 'peaceful_adhan' | 'soft_chime' | 'dawn_birds' | 'calm_bell' | 'default'
  vibrationEnabled: boolean;
  snoozeMinutes: number;
  repeatRule: RepeatRule;
  createdAt: string;
  updatedAt: string;
}

export interface PrayerTimings {
  id: string;
  date: string; // YYYY-MM-DD
  fajr: string; // ISO string
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  tahajjud: string;
  latitude: number;
  longitude: number;
  calculationMethod: string;
  asrMethod: AsrMethod;
  createdAt: string;
}

export interface DailyTaskStatus {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  status: TaskStatus;
  completedAt?: string;
  actualScheduledTime?: string; // HH:mm
}

export interface AppSettings {
  key: string;
  value: string;
}

export interface LocationConfig {
  latitude: number;
  longitude: number;
  cityName: string;
  countryName: string;
  timezone: string;
  isManual: boolean;
}

export interface PrayerCalculationConfig {
  method: string;
  asrMethod: AsrMethod;
  tahajjudOffsetMinutes: number; // e.g. 60 mins before Fajr, or dynamic last third
  tahajjudMode: 'relative_to_fajr' | 'last_third_night';
  fajrAngle?: number;
  ishaAngle?: number;
}

export interface ScheduledTask extends Task {
  startTime: Date;
  endTime: Date;
  displayStartTime: string; // 12h or 24h formatted, e.g. "05:15 AM"
  displayEndTime: string;
  status: TaskStatus;
  completedAt?: string;
  alarm?: TaskAlarm;
}

export interface ScheduledPhase extends Phase {
  startTime: Date;
  endTime: Date;
  displayStartTime: string;
  displayEndTime: string;
  tasks: ScheduledTask[];
  coreTasks: ScheduledTask[];
  progressPercent: number;
  completedCount: number;
  totalCount: number;
}

export type ConflictType =
  | 'overlap'
  | 'phase_boundary_exceeded'
  | 'outside_prayer_window'
  | 'unresolved_slot';

export interface SchedulingConflict {
  id: string;
  taskId: string;
  conflictingTaskId?: string;
  conflictType: ConflictType;
  message: string;
  suggestedStartTime?: Date;
  severity: 'warning' | 'error';
}

export interface DailySchedule {
  date: string;
  phases: ScheduledPhase[];
  conflicts: SchedulingConflict[];
  overallProgress: number;
  totalTasks: number;
  completedTasks: number;
  upcomingTask?: ScheduledTask;
  currentPhase?: ScheduledPhase;
  nextPrayer?: {
    name: PrayerName;
    time: Date;
    formattedTime: string;
    remainingMinutes: number;
    formattedCountdown: string;
  };
}
