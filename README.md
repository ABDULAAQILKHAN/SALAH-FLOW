# SalahFlow — Offline-First, Prayer-Aware Daily Planner

SalahFlow is a personal mobile application built with React Native and Expo where the five daily obligatory Islamic prayer (Salah) timings determine the entire structure of the user's day.

Unlike conventional task managers with static hours, SalahFlow organizes the day into **prayer-oriented phases**. Tasks dynamically adjust as prayer times change throughout the year due to seasonal astronomical variations, completely offline.

---

## 1. Key Features

- **Offline-First Architecture**: Runs 100% offline once initial coordinates or city are configured. No cloud servers, backend accounts, or tracking.
- **Five Default Daily Phases**:
  1. **Phase 1 — Before Fajr / Early Morning**: Features **Tahajjud** (pre-dawn vigil) and **Fajr** (obligatory dawn prayer) as protected core tasks. Tasks can be arranged before Tahajjud, between Tahajjud and Fajr, and after Fajr.
  2. **Phase 2 — Morning / Midday**: Anchored by **Zuhr**.
  3. **Phase 3 — Afternoon**: Anchored by **Asr** (Hanafi shadow calculation).
  4. **Phase 4 — Evening**: Anchored by **Maghrib**.
  5. **Phase 5 — Night**: Anchored by **Isha**.
- **Core Task Protection**: Obligatory Salah core tasks cannot be accidentally deleted or moved outside their designated phase.
- **Custom Phase Builder**: Create personalized routine phases (e.g. "Evening Learning", "Workout Block") with exactly one designated anchor core task.
- **Drag-and-Drop Task Reordering**: Smooth visual drag handles (`react-native-draggable-flatlist`) with immediate SQLite database persistence and alternative accessible Up/Down buttons.
- **Dynamic Scheduling Engine**:
  - **Prayer-Relative Tasks**: Automatically shift when reference prayer timings change (e.g. "+30m after Fajr", "-15m before Maghrib").
  - **Fixed-Time Tasks**: Remain fixed at configured clock times (e.g. "09:30 AM Office").
  - **Flexible Tasks**: Slot into available time windows within phase boundaries.
- **Conflict Resolution**: Detects task collisions with obligatory prayers, phase boundary overflows, and overlapping fixed events, offering recommended start times.
- **Astronomical Prayer Engine**: Powered by **Adhan JS** with Hanafi Asr calculation (double-shadow factor) and configurable calculation methods (Karachi default for South Asia / India, MWL, Egyptian, Umm Al Qura, etc.).
- **Reliable Local Alarm System**:
  - Exact alarms via Android `AlarmManager` permissions (`SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`).
  - Distinguishes between **advance reminders** (e.g. 10m before) and **main exact alarms**.
  - Automatic rescheduling on prayer time shifts, date rollover, and device reboot.
  - Dedicated **Alarm Diagnostics & Live Test Screen** (`/alarms/test`).
- **SQLite Persistence**: Source of truth with schema migrations, indexes, foreign keys, and JSON export/import for manual backups.

---

## 2. Architecture & Directory Structure

```
src/
├── app/                              # Expo Router Routes
│   ├── _layout.tsx                   # Root Stack layout, dark theme & initialization
│   ├── index.tsx                     # Home Dashboard (Countdown, Salah timings, Phases, Progress)
│   ├── onboarding.tsx                # First-launch onboarding (GPS, Asr, permissions)
│   ├── phase/
│   │   ├── [id].tsx                  # Phase details with drag-and-drop task reordering
│   │   └── builder.tsx               # Custom phase builder (with mandatory 1 core task)
│   ├── task/
│   │   ├── new.tsx                   # Task creation (relative, fixed, flexible, alarm)
│   │   └── [id].tsx                  # Task editing (protected core prayers, alarm settings)
│   ├── prayers/
│   │   └── index.tsx                 # Daily & monthly astronomical prayer timetable
│   ├── calendar/
│   │   └── index.tsx                 # 7-day strip routine viewer & adherence history
│   ├── settings/
│   │   └── index.tsx                 # Location, Asr madhab, calculation method, JSON backup/restore
│   ├── statistics/
│   │   └── index.tsx                 # Consistency streak & completion analytics
│   └── alarms/
│       └── test.tsx                  # Dedicated exact alarm diagnostic & test utility
├── components/
│   ├── common/                       # Header, Badge, Button, Card, ProgressBar
│   ├── cards/                        # CountdownCard, PrayerTimingCard, PhaseCard, TaskCard
│   ├── dialogs/                      # ConflictModal
│   └── timeline/                     # TaskReorderList (DraggableFlatList with Up/Down buttons)
├── database/
│   ├── index.ts                      # Expo SQLite connection & transaction helpers
│   ├── schema.ts                     # Schema DDL, foreign keys, and indexes
│   └── repositories/                 # Phase, Task, Alarm, Prayer, Status, Settings repos
├── services/
│   ├── prayer/                       # Adhan JS calculation, Hanafi Asr, yearly cache
│   ├── scheduling/                   # Schedule engine, Phase boundaries, Conflict resolver
│   ├── alarms/                       # AlarmManager, Android permissions, AlarmRescheduler
│   ├── location/                     # Expo Location GPS & fallback cities
│   ├── notifications/                # Expo Notifications channels (Alarms, Reminders, Prayers)
│   └── backup/                       # JSON export/import data service
├── store/
│   ├── useAppStore.ts                # App initialization & onboarding state
│   ├── usePrayerStore.ts             # Prayer timings & calculation settings state
│   └── useScheduleStore.ts           # Phases, tasks, drag-and-drop reorder state
├── types/                            # Domain TypeScript definitions
├── theme/                            # Charcoal dark theme & emerald green palette
├── utils/                            # DateTime formatting, math, and UUID generator
└── constants/                        # Phase definitions, calculation methods, popular cities
```

---

## 3. Technology Stack

- **React Native 0.76 & Expo SDK 52**
- **TypeScript 5.3** (Strict Mode)
- **Expo Router v4**
- **Zustand 5**
- **Expo SQLite** (Persistent local database)
- **Adhan JS** (Offline astronomical calculations)
- **Expo Location** (GPS coordinates)
- **Expo Notifications** (High-importance notification channels & sound)
- **React Native Gesture Handler & Reanimated 3**
- **React Native Draggable FlatList** (Drag-and-drop reordering)
- **Date-fns 4**

---

## 4. Setup & Development Commands

### Prerequisites
- Node.js >= 18
- npm or bun

### Installation
```bash
npm install
```

### Typecheck & Testing
```bash
# Run TypeScript compilation check
npm run typecheck

# Run full Jest test suite
npm test
```

### Starting the Dev Server
```bash
npx expo start
```

---

## 5. Android Build Instructions

### Native Android Exact Alarms & Prebuild
SalahFlow includes an Expo Config Plugin (`plugins/withAndroidExactAlarm.js`) that injects required permissions and broadcast receivers into `AndroidManifest.xml`:
- `android.permission.SCHEDULE_EXACT_ALARM`
- `android.permission.USE_EXACT_ALARM`
- `android.permission.RECEIVE_BOOT_COMPLETED`
- `android.permission.WAKE_LOCK`
- `android.permission.VIBRATE`
- `android.permission.POST_NOTIFICATIONS`

### Prebuild Android Project
```bash
npx expo prebuild --platform android
```

### Run Locally on Connected Android Device or Emulator
```bash
npx expo run:android
```

### Cloud Build with EAS (APK / AAB)
```bash
# Install EAS CLI
npm install -g eas-cli

# Build Android development or release APK
eas build --platform android --profile preview
```

---

## 6. Prayer Calculation & Hanafi Asr

SalahFlow uses **Adhan JS** for astronomical calculations without relying on any external APIs.
- **Asr Calculation**: By default configured to **Hanafi**, which calculates Asr when an object's shadow equals twice its length plus noon shadow (`shadowLength = 2`). Standard / Shafi calculation (`shadowLength = 1`) can be toggled in Settings.
- **Default Method**: University of Islamic Sciences, Karachi (18° Fajr, 18° Isha), the standard across South Asia.
- **Tahajjud Calculation**: Either computed as the start of the last third of the night or configured as an offset (e.g. 45-60 minutes before Fajr).
- **Yearly Offline Caching**: The application precomputes and caches timings for the entire year in SQLite so it never needs network connectivity.

---

## 7. Alarm System & Diagnostics

To verify exact alarm delivery and permissions on your device:
1. Open SalahFlow.
2. Tap the **Settings** icon (top right) -> **Alarm Diagnostics & Live Test** (or navigate to `/alarms/test`).
3. Inspect notification permission and Android exact alarm status.
4. Tap **Test in 5 Seconds**: the app will schedule an exact alarm with sound and vibration to prove end-to-end delivery.
5. All scheduled alarms use deterministic IDs (`alarm_<taskId>` and `reminder_<taskId>`) to guarantee zero duplicate alarms during repeated synchronizations.
