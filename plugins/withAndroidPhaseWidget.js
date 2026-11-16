const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// XML Layout: widget_salah_phase.xml
const WIDGET_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root_layout"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_bg"
    android:padding="12dp">

    <!-- Top Row: Status dot + ACTIVE PHASE + Time Window -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <ImageView
            android:layout_width="8dp"
            android:layout_height="8dp"
            android:src="@drawable/widget_dot"
            android:layout_marginEnd="6dp" />

        <TextView
            android:id="@+id/widget_status_label"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="CURRENT PHASE"
            android:textColor="#10B981"
            android:textSize="10sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_phase_window"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="--:-- – --:--"
            android:textColor="#94A3B8"
            android:textSize="10sp" />
    </LinearLayout>

    <!-- Middle: Phase Name -->
    <TextView
        android:id="@+id/widget_phase_name"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="SalahFlow"
        android:textColor="#FFFFFF"
        android:textSize="16sp"
        android:textStyle="bold"
        android:maxLines="1"
        android:ellipsize="end" />

    <!-- Core Prayer Badge / Title -->
    <TextView
        android:id="@+id/widget_core_task"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="3dp"
        android:paddingHorizontal="6dp"
        android:paddingVertical="2dp"
        android:background="@drawable/widget_core_badge"
        android:text="★ Core Salah"
        android:textColor="#10B981"
        android:textSize="11sp"
        android:textStyle="bold"
        android:maxLines="1"
        android:ellipsize="end" />

    <!-- Vertical Spacer -->
    <View
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1" />

    <!-- Countdown & Next Phase -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginBottom="4dp">

        <TextView
            android:id="@+id/widget_countdown"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Loading routine..."
            android:textColor="#F59E0B"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_next_phase"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text=""
            android:textColor="#94A3B8"
            android:textSize="11sp" />
    </LinearLayout>

    <!-- Progress Bar -->
    <ProgressBar
        android:id="@+id/widget_progress_bar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="5dp"
        android:progress="0"
        android:max="100"
        android:progressDrawable="@drawable/widget_progress" />

    <!-- Task Progress Summary -->
    <TextView
        android:id="@+id/widget_task_progress"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="3dp"
        android:text="Tap to open SalahFlow"
        android:textColor="#64748B"
        android:textSize="10sp" />

</LinearLayout>
`;

// AppWidgetProviderInfo XML: widget_salah_phase_info.xml
const WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:maxResizeWidth="450dp"
    android:maxResizeHeight="250dp"
    android:resizeMode="horizontal|vertical"
    android:minResizeWidth="180dp"
    android:minResizeHeight="70dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_salah_phase"
    android:description="@string/widget_description"
    android:widgetCategory="home_screen">
</appwidget-provider>
`;

// Background drawable: widget_bg.xml
const WIDGET_BG_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#0B1320" />
    <corners android:radius="18dp" />
    <stroke android:width="1.5dp" android:color="#1A2B42" />
</shape>
`;

// Status dot: widget_dot.xml
const WIDGET_DOT_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#10B981" />
    <size android:width="8dp" android:height="8dp" />
</shape>
`;

// Core badge background: widget_core_badge.xml
const WIDGET_CORE_BADGE_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#09281E" />
    <corners android:radius="6dp" />
    <stroke android:width="1dp" android:color="#10B981" />
</shape>
`;

// Progress bar drawable: widget_progress.xml
const WIDGET_PROGRESS_XML = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:id="@android:id/background">
        <shape>
            <corners android:radius="3dp" />
            <solid android:color="#1E293B" />
        </shape>
    </item>
    <item android:id="@android:id/progress">
        <clip>
            <shape>
                <corners android:radius="3dp" />
                <solid android:color="#10B981" />
            </shape>
        </clip>
    </item>
</layer-list>
`;

// String values: widget_strings.xml
const WIDGET_STRINGS_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="widget_description">Shows your active SalahFlow prayer phase, core prayer, and countdown to phase completion.</string>
</resources>
`;

// Kotlin: SalahFlowPhaseWidgetProvider.kt
const WIDGET_PROVIDER_KT = `package com.salahflow.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SalahFlowPhaseWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_UPDATE_PHASE_WIDGET = "com.salahflow.app.ACTION_UPDATE_PHASE_WIDGET"
        const val PREFS_NAME = "SalahFlowWidgetPrefs"
        const val KEY_PHASES = "phase_schedule"
        const val ALARM_REQUEST_CODE = 4401

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context) ?: return
            val componentName = ComponentName(context, SalahFlowPhaseWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName) ?: return
            for (appWidgetId in appWidgetIds) {
                renderWidget(context, appWidgetManager, appWidgetId)
            }
        }

        private fun renderWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_salah_phase)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val phasesJsonStr = prefs.getString(KEY_PHASES, null)

            // Intent to launch app when clicking widget
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                ?: Intent(Intent.ACTION_MAIN).apply {
                    setPackage(context.packageName)
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root_layout, pendingIntent)

            if (phasesJsonStr.isNullOrEmpty()) {
                views.setTextViewText(R.id.widget_phase_name, "SalahFlow")
                views.setTextViewText(R.id.widget_core_task, "★ Prayer Routine")
                views.setTextViewText(R.id.widget_phase_window, "Offline")
                views.setTextViewText(R.id.widget_countdown, "Tap to open SalahFlow")
                views.setTextViewText(R.id.widget_next_phase, "")
                views.setProgressBar(R.id.widget_progress_bar, 100, 0, false)
                views.setTextViewText(R.id.widget_task_progress, "Set up prayer phases in app")
                appWidgetManager.updateAppWidget(appWidgetId, views)
                return
            }

            try {
                val jsonArray = JSONArray(phasesJsonStr)
                if (jsonArray.length() == 0) {
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                    return
                }

                val now = System.currentTimeMillis()
                var activePhase: JSONObject? = null
                var nextPhaseName = ""
                var nextPhaseEndTimeMs = 0L

                // 1. Find currently active phase where now >= start && now < end
                for (i in 0 until jsonArray.length()) {
                    val phase = jsonArray.getJSONObject(i)
                    val startMs = phase.optLong("startTimeMs", 0L)
                    val endMs = phase.optLong("endTimeMs", 0L)

                    if (now in startMs until endMs) {
                        activePhase = phase
                        val nextIdx = (i + 1) % jsonArray.length()
                        nextPhaseName = jsonArray.getJSONObject(nextIdx).optString("phaseName", "")
                        nextPhaseEndTimeMs = endMs
                        break
                    }
                }

                // 2. If outside boundaries, find the next upcoming phase
                if (activePhase == null) {
                    for (i in 0 until jsonArray.length()) {
                        val phase = jsonArray.getJSONObject(i)
                        val startMs = phase.optLong("startTimeMs", 0L)
                        if (startMs > now) {
                            activePhase = phase
                            val nextIdx = (i + 1) % jsonArray.length()
                            nextPhaseName = jsonArray.getJSONObject(nextIdx).optString("phaseName", "")
                            nextPhaseEndTimeMs = phase.optLong("endTimeMs", 0L)
                            break
                        }
                    }
                }

                // Fallback to first phase
                if (activePhase == null) {
                    activePhase = jsonArray.getJSONObject(0)
                    nextPhaseName = if (jsonArray.length() > 1) jsonArray.getJSONObject(1).optString("phaseName", "") else ""
                    nextPhaseEndTimeMs = activePhase.optLong("endTimeMs", 0L)
                }

                val phaseName = activePhase.optString("phaseName", "Daily Routine")
                val coreTask = activePhase.optString("coreTaskTitle", "Core Salah")
                val dispStart = activePhase.optString("displayStartTime", "")
                val dispEnd = activePhase.optString("displayEndTime", "")
                val totalTasks = activePhase.optInt("totalTasks", 0)
                val completedTasks = activePhase.optInt("completedTasks", 0)
                val progressPercent = activePhase.optInt("progressPercent", 0)
                val endMs = activePhase.optLong("endTimeMs", 0L)

                val diffMs = maxOf(0L, endMs - now)
                val hours = TimeUnit.MILLISECONDS.toHours(diffMs)
                val mins = TimeUnit.MILLISECONDS.toMinutes(diffMs) % 60

                val countdownText = if (diffMs <= 0) {
                    "Phase Complete"
                } else if (hours > 0) {
                    "Completes in \${hours}h \${mins}m"
                } else {
                    "Completes in \${mins}m"
                }

                views.setTextViewText(R.id.widget_phase_name, phaseName)
                views.setTextViewText(R.id.widget_core_task, "★ \$coreTask")
                views.setTextViewText(R.id.widget_phase_window, "\$dispStart – \$dispEnd")
                views.setTextViewText(R.id.widget_countdown, countdownText)
                views.setTextViewText(R.id.widget_next_phase, if (nextPhaseName.isNotEmpty()) "Next: \$nextPhaseName" else "")
                views.setProgressBar(R.id.widget_progress_bar, 100, progressPercent, false)
                views.setTextViewText(
                    R.id.widget_task_progress,
                    "\$completedTasks of \$totalTasks tasks done (\${progressPercent}%)"
                )

                appWidgetManager.updateAppWidget(appWidgetId, views)

                // Schedule alarm to self-update exactly when phase completes!
                if (nextPhaseEndTimeMs > now) {
                    scheduleNextPhaseAlarm(context, nextPhaseEndTimeMs)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }

        private fun scheduleNextPhaseAlarm(context: Context, endTimeMs: Long) {
            val now = System.currentTimeMillis()
            val triggerTime = endTimeMs + 1000L // 1 second after phase ends
            if (triggerTime <= now) return

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, SalahFlowPhaseWidgetProvider::class.java).apply {
                action = ACTION_UPDATE_PHASE_WIDGET
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        if (alarmManager.canScheduleExactAlarms()) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                        } else {
                            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                        }
                    } else {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                    }
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            renderWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_UPDATE_PHASE_WIDGET,
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_DATE_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED -> {
                updateAllWidgets(context)
            }
            else -> super.onReceive(context, intent)
        }
    }
}
`;

// Kotlin: SalahFlowWidgetModule.kt
const WIDGET_MODULE_KT = `package com.salahflow.app

import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SalahFlowWidgetModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SalahFlowWidgetModule"

    @ReactMethod
    fun updateWidgetData(phasesJson: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(
                SalahFlowPhaseWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            prefs.edit().putString(SalahFlowPhaseWidgetProvider.KEY_PHASES, phasesJson).apply()

            // Trigger immediate widget render
            SalahFlowPhaseWidgetProvider.updateAllWidgets(reactContext)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun refreshWidget(promise: Promise) {
        try {
            SalahFlowPhaseWidgetProvider.updateAllWidgets(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_ERROR", e.message, e)
        }
    }
}
`;

// Kotlin: SalahFlowWidgetPackage.kt
const WIDGET_PACKAGE_KT = `package com.salahflow.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SalahFlowWidgetPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(SalahFlowWidgetModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

const withAndroidPhaseWidget = (config) => {
  // 1. AndroidManifest: Add widget receiver
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    if (androidManifest.application && androidManifest.application[0]) {
      const app = androidManifest.application[0];
      if (!app.receiver) {
        app.receiver = [];
      }

      const widgetReceiverExists = app.receiver.some(
        (r) => r.$?.['android:name'] === '.SalahFlowPhaseWidgetProvider'
      );

      if (!widgetReceiverExists) {
        app.receiver.push({
          $: {
            'android:name': '.SalahFlowPhaseWidgetProvider',
            'android:label': 'SalahFlow Active Phase',
            'android:exported': 'true',
          },
          'intent-filter': [
            {
              action: [
                { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
                { $: { 'android:name': 'com.salahflow.app.ACTION_UPDATE_PHASE_WIDGET' } },
                { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
                { $: { 'android:name': 'android.intent.action.TIME_SET' } },
                { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
              ],
            },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.appwidget.provider',
                'android:resource': '@xml/widget_salah_phase_info',
              },
            },
          ],
        });
      }
    }
    return config;
  });

  // 2. MainApplication: Register SalahFlowWidgetPackage
  config = withMainApplication(config, async (config) => {
    let mainApp = config.modResults.contents;
    if (!mainApp.includes('SalahFlowWidgetPackage')) {
      if (mainApp.includes('PackageList(this).packages.apply {')) {
        mainApp = mainApp.replace(
          'PackageList(this).packages.apply {',
          'PackageList(this).packages.apply {\n      add(SalahFlowWidgetPackage())'
        );
      } else if (mainApp.includes('PackageList(this).packages')) {
        mainApp = mainApp.replace(
          'PackageList(this).packages',
          'PackageList(this).packages.apply { add(SalahFlowWidgetPackage()) }'
        );
      }
      config.modResults.contents = mainApp;
    }
    return config;
  });

  // 3. Write resources and Kotlin files to android platform directory
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const resDir = path.join(projectRoot, 'app', 'src', 'main', 'res');
      const javaDir = path.join(
        projectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'salahflow',
        'app'
      );

      // Directories
      const xmlDir = path.join(resDir, 'xml');
      const layoutDir = path.join(resDir, 'layout');
      const drawableDir = path.join(resDir, 'drawable');
      const valuesDir = path.join(resDir, 'values');

      [xmlDir, layoutDir, drawableDir, valuesDir, javaDir].forEach((dir) => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Write layout and resources
      fs.writeFileSync(path.join(layoutDir, 'widget_salah_phase.xml'), WIDGET_LAYOUT_XML, 'utf8');
      fs.writeFileSync(path.join(xmlDir, 'widget_salah_phase_info.xml'), WIDGET_INFO_XML, 'utf8');
      fs.writeFileSync(path.join(drawableDir, 'widget_bg.xml'), WIDGET_BG_XML, 'utf8');
      fs.writeFileSync(path.join(drawableDir, 'widget_dot.xml'), WIDGET_DOT_XML, 'utf8');
      fs.writeFileSync(path.join(drawableDir, 'widget_core_badge.xml'), WIDGET_CORE_BADGE_XML, 'utf8');
      fs.writeFileSync(path.join(drawableDir, 'widget_progress.xml'), WIDGET_PROGRESS_XML, 'utf8');
      fs.writeFileSync(path.join(valuesDir, 'widget_strings.xml'), WIDGET_STRINGS_XML, 'utf8');

      // Write Kotlin classes
      fs.writeFileSync(
        path.join(javaDir, 'SalahFlowPhaseWidgetProvider.kt'),
        WIDGET_PROVIDER_KT,
        'utf8'
      );
      fs.writeFileSync(
        path.join(javaDir, 'SalahFlowWidgetModule.kt'),
        WIDGET_MODULE_KT,
        'utf8'
      );
      fs.writeFileSync(
        path.join(javaDir, 'SalahFlowWidgetPackage.kt'),
        WIDGET_PACKAGE_KT,
        'utf8'
      );

      // Write local.properties to guarantee Gradle finds the Android SDK
      const sdkDir =
        process.env.ANDROID_HOME ||
        path.join(process.env.HOME || '/Users/aaqilkhan', 'Library', 'Android', 'sdk');
      fs.writeFileSync(
        path.join(projectRoot, 'local.properties'),
        `sdk.dir=${sdkDir}\n`,
        'utf8'
      );

      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidPhaseWidget;
