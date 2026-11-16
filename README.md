# SalahFlow — Offline-First, Prayer-Aware Daily Timetable

> **Created by Aaqil Khan under *Solutions with Aaqil***

[![Expo](https://img.shields.io/badge/Expo-SDK%2058-000020.svg?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB.svg?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/Database-Expo%20SQLite%20(Offline)-003B57.svg?logo=sqlite&logoColor=white)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
[![License](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

**SalahFlow** is a modern, offline-first mobile application where the five daily Islamic obligatory prayer (*Salah*) timings govern the dynamic structure of your day.

Unlike traditional productivity apps with rigid, static hours, SalahFlow organizes daily schedules into **prayer-anchored phases**. Tasks dynamically adjust their start times as prayer times change throughout the year due to seasonal astronomical variations, completely offline with zero tracking or external servers.

> [!IMPORTANT]
> ### 📲 Direct Download: Ready-to-Install APK Available!
> You **do not** need to clone the repository or set up the developer tools if you simply want to install and use SalahFlow on your phone!
>
> A pre-built, ready-to-install Android APK package is already included directly in this repository:
>
> 📦 **[`SalahFlow v1.apk.zip`](./SalahFlow%20v1.apk.zip)**
>
> **Quick Steps to Install:**
> 1. Download **`SalahFlow v1.apk.zip`** directly from the repository.
> 2. Extract / unzip the file on your computer or Android smartphone.
> 3. Tap the extracted `.apk` file on your Android device to install and enjoy SalahFlow instantly!

---

## 🌟 Key Highlights & Features

- **100% Offline-First Architecture**: Works entirely on-device using local astronomical mathematics (`adhan` JS) and Expo SQLite. No cloud account, internet connection, or subscriptions required.
- **Five Default Daily Routine Phases**:
  1. **Phase 1 — Early Morning / Dawn**: Anchored by **Tahajjud** (pre-dawn vigil) and **Fajr** (dawn prayer) as protected core tasks.
  2. **Phase 2 — Morning / Midday**: Anchored by **Zuhr** (noon prayer).
  3. **Phase 3 — Afternoon**: Anchored by **Asr** (afternoon prayer with Hanafi double-shadow calculation).
  4. **Phase 4 — Evening**: Anchored by **Maghrib** (sunset prayer).
  5. **Phase 5 — Night**: Anchored by **Isha** (night prayer).
- **Core Salah Protection**: Obligatory prayer tasks are locked into their astronomical phases to ensure daily obligations are never compromised.
- **Android Home Screen Live Phase Widget**:
  - Displays the currently active phase, core prayer, time window, countdown to completion, and progress bar.
  - Automatically updates when each phase ends via native Android `AlarmManager`.
  - Tapping the widget launches the app directly into your daily routine.
- **Audible Notification Alarms & Reminders**:
  - High-priority audible alarms with sound, custom vibration patterns, and lockscreen visibility.
  - Default **10-minute advance notice** automatically enabled for all core prayers.
  - Built-in **Instant 5-Second Test Alarm** in Settings to verify sound and vibration.
- **21-Day Interactive Routine Calendar**:
  - Horizontal scrolling strip (`-7` to `+14` days) to view past adherence and future routines.
  - Quick-jump "Today" button and "Set as Active Routine" selector.
- **Drag-and-Drop Task Reordering**:
  - Smooth reordering via `react-native-draggable-flatlist` with immediate SQLite persistence.
  - Accessible Up/Down step buttons for fine-tuned organization.
- **Astronomical Precision & Madhab Flexibility**:
  - Default: University of Islamic Sciences, Karachi (18° / 18° standard for South Asia / India / Pakistan).
  - Toggles for Hanafi (double shadow) and Shafi/Standard Asr calculations.
  - Support for ISNA, Muslim World League, Umm Al-Qura, and Egyptian authorities.

---

## 📱 Architecture & Directory Structure

```
SalahFlow/
├── android/                          # Continuous Native Generation (CNG) Android project
├── assets/                           # High-resolution icons, splash screens, and adaptive assets
├── plugins/                          # Custom Expo Config Plugins
│   ├── withAndroidExactAlarm.js      # SCHEDULE_EXACT_ALARM, boot receiver & wake-lock permissions
│   └── withAndroidPhaseWidget.js     # Native Android AppWidgetProvider, RemoteViews & Kotlin bridge
├── src/
│   ├── app/                          # Expo Router Navigation Screens
│   │   ├── _layout.tsx               # Root Layout with branded splash startup & dark theme
│   │   ├── index.tsx                 # Dashboard (Countdown, Salah card, Live phase, Daily routine)
│   │   ├── onboarding.tsx            # First-launch onboarding (GPS location & Asr calculation)
│   │   ├── phase/
│   │   │   ├── [id].tsx              # Phase detail & task reordering
│   │   │   └── builder.tsx           # Custom phase creation (anchored to core tasks)
│   │   ├── task/
│   │   │   ├── new.tsx               # Task creation (prayer-relative, fixed-time, flexible)
│   │   │   └── [id].tsx              # Task editing & per-task alarm configuration
│   │   ├── prayers/index.tsx         # Astronomical prayer timetable (daily & monthly view)
│   │   ├── calendar/index.tsx        # 21-day routine browser & adherence tracker
│   │   ├── settings/index.tsx        # Location, calculation method, audio alarm test & backup
│   │   ├── statistics/index.tsx      # Adherence streaks & completion analytics
│   │   └── alarms/test.tsx           # Android exact alarm diagnostic & permission inspector
│   ├── components/                   # Modular UI Components
│   │   ├── cards/                    # LivePhaseWidgetCard, CountdownCard, PrayerTimingCard, TaskCard
│   │   ├── common/                   # Header, Button, Badge, ProgressBar
│   │   └── dialogs/                  # ConflictModal (prayer overlap warning dialog)
│   ├── database/                     # Expo SQLite Storage Engine
│   │   ├── index.ts                  # Database connection & migration coordinator
│   │   ├── schema.ts                 # DDL schema, foreign keys, and indexes
│   │   └── repositories/             # Task, Phase, Alarm, Prayer, Settings repositories
│   ├── services/                     # Core Business Logic
│   │   ├── alarms/                   # AlarmManager, exact alarm scheduling & rescheduler
│   │   ├── notifications/            # Android notification channels (Alarms, Reminders, Prayers)
│   │   ├── prayer/                   # Adhan JS calculation engine & yearly caching
│   │   ├── scheduling/               # Phase boundaries, schedule generator & conflict resolver
│   │   └── widget/                   # Home screen widget data synchronization service
│   ├── store/                        # Zustand Global State Management
│   │   ├── useAppStore.ts            # Initialization, onboarding & active date
│   │   ├── usePrayerStore.ts         # Astronomical calculations & location coordinates
│   │   └── useScheduleStore.ts       # Phases, tasks, drag-and-drop & widget synchronizer
│   └── theme/                        # Deep charcoal dark theme & emerald palette
├── app.json                          # Expo application configuration & plugin list
├── eas.json                          # EAS Build profiles (preview APK, production AAB)
└── package.json                      # Dependencies and scripts
```

---

## 🛠️ Prerequisites

Before building or running the project, ensure you have the following installed:

1. **Node.js**: v18.0.0 or higher (`node -v`)
2. **Package Manager**: `npm` or `bun`
3. **Java Development Kit (JDK)**: JDK 21 (recommended: Eclipse Temurin 21)
4. **Android SDK**:
   - `Android SDK Platform 34` or `35`
   - `Android SDK Build-Tools 34.0.0` or `35.0.0`
   - `Android NDK 27.1.12297006` and `CMake 3.22.1`
   - `Android Platform-Tools` (`adb`)

### Configure Android Environment Variables
Add the following to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
```

Verify your setup:
```bash
adb version
javac -version
```

---

## 🚀 Development & Local Server

### 1. Install Dependencies
```bash
npm install
```

### 2. Run TypeScript Verification & Unit Tests
```bash
# Typecheck
npm run typecheck

# Unit tests (Jest)
npm test
```

### 3. Start Expo Dev Server
```bash
npx expo start
```

> **Note on Expo Go**: Because SalahFlow includes custom native Android code (Home Screen Widget, exact alarms, and notification channels), running the full native feature set requires a **development build** or **standalone APK** rather than standard Expo Go.

---

## 📦 Building the Android APK

> [!TIP]
> **Skip the build process entirely!**  
> If you just want to run the app on your Android device, simply download and unzip the pre-built **[`SalahFlow v1.apk.zip`](./SalahFlow%20v1.apk.zip)** at the root of this repository.

You have three options if you want to build the Android APK from source:
1. **Local APK Build via Gradle (Fastest, Completely Free, No Cloud Required)**
2. **Local EAS Build (Using EAS CLI Locally)**
3. **Expo Cloud Build via EAS (Built on Expo's Servers)**

---

### Option 1: Local APK Build via Gradle (Recommended)

This creates a standalone `debug` APK directly on your computer without needing an Expo account.

#### Step 1: Prebuild Native Android Directories
This generates the native `android/` directory and applies all custom config plugins:
```bash
npx expo prebuild --platform android --clean
```

#### Step 2: Build the APK
```bash
cd android
./gradlew assembleDebug
cd ..
```

#### Step 3: Locate Your APK
Once compilation completes successfully, your APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

#### Step 4: Install to Connected Android Device via USB
1. Enable **Developer Options** and **USB Debugging** on your Android phone.
2. Connect your phone via USB cable and allow debugging when prompted.
3. Verify the device is recognized:
   ```bash
   adb devices
   ```
4. Install the APK:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
5. Launch the app directly:
   ```bash
   adb shell am start -n com.salahflow.app/.MainActivity
   ```

---

### Option 2: Local APK Build via EAS CLI

If you prefer using EAS CLI to package a release or preview build locally on your machine:

```bash
# Install EAS CLI globally (if not already installed)
npm install -g eas-cli

# Run local preview build (outputs an installable APK)
npx eas-cli build --platform android --profile preview --local
```

Requirements for `--local`: Docker or a properly configured local Android SDK environment.

---

### Option 3: Expo Cloud Build via EAS (EAS Cloud)

If you don't have Android SDK or Gradle installed locally, you can let Expo's cloud build servers compile the APK for you.

#### Step 1: Log in to Your Expo Account
```bash
npx eas-cli login
```

#### Step 2: Configure EAS (Already Pre-Configured)
The project includes a ready-to-use `eas.json`:
```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

#### Step 3: Trigger Cloud Build
```bash
# Build standalone installable APK on Expo cloud
npx eas-cli build --platform android --profile preview
```

When the build finishes, EAS will output a download link and QR code in the terminal. Scan the QR code or open the link on your phone to download and install the APK directly.

#### Step 4: Production Google Play Store Build (AAB)
When preparing to publish to the Google Play Store:
```bash
npx eas-cli build --platform android --profile production
```

---

## 🧭 In-App Setup & Testing

### 1. Adding the Android Home Screen Widget
1. Long-press an empty space on your Android home screen.
2. Select **Widgets**.
3. Scroll down or search for **SalahFlow**.
4. Drag the **SalahFlow Active Phase** widget (4x2) onto your screen.
5. The widget displays the current prayer phase, core Salah badge, countdown timer, and progress bar, and updates dynamically.

### 2. Testing Audible Prayer Alarms
1. Open SalahFlow.
2. Tap the **Settings** icon (top right).
3. Under **Alarms & Notification System**, observe that all 5 prayers have active alarms with a 10-minute advance notice.
4. Tap **Test Audible Alarm (5s)**.
5. Lock your screen or leave the app open — after 5 seconds, an audible alarm with custom vibration will fire to verify full device compatibility.
6. For technical inspection, tap **Full Diagnostics & Permissions** to verify battery optimization, boot receivers, and exact alarm permissions (`/alarms/test`).

---

## 👨‍💻 Creator & Credits

Developed with precision and care by:

**Aaqil Khan**  
*Under **Solutions with Aaqil***

Dedicated to creating clean, offline-first, distraction-free software that seamlessly aligns everyday productivity with sacred spiritual duties.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
