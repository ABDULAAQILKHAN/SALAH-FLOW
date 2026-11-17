import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import { phaseRepository } from '../../database/repositories/phaseRepository';
import { taskRepository } from '../../database/repositories/taskRepository';
import { taskAlarmRepository } from '../../database/repositories/taskAlarmRepository';
import { settingsRepository } from '../../database/repositories/settingsRepository';
import { locationService } from '../location/locationService';
import { DEFAULT_PRAYER_CONFIG, POPULAR_LOCATIONS } from '../../constants/prayers';
import { formatDateKey } from '../../utils/dateTime';
import { resetDatabase } from '../../database';
import {
  Phase,
  Task,
  TaskAlarm,
  LocationConfig,
  PrayerCalculationConfig,
} from '../../types';

const { StorageAccessFramework } = FileSystem;

export interface BackupData {
  version: number;
  exportedAt: string;
  city: string;
  location?: LocationConfig;
  prayerConfig?: PrayerCalculationConfig;
  phases: Phase[];
  tasks: Task[];
  alarms: TaskAlarm[];
  settings: Record<string, string>;
}

export interface ExportResult {
  jsonString: string;
  fileName: string;
  savedPath: string;
  folderName: string;
  city: string;
  phaseCount: number;
  taskCount: number;
}

export interface ImportResult {
  success: boolean;
  city: string;
  phaseCount: number;
  taskCount: number;
  exportedAt: string;
}

export const backupService = {
  async exportData(): Promise<string> {
    const [phases, tasks, alarms, settings, location, prayerConfig] = await Promise.all([
      phaseRepository.getAll(),
      taskRepository.getAll(),
      taskAlarmRepository.getAllEnabled(),
      settingsRepository.getAll(),
      locationService.getSavedLocation(),
      settingsRepository.getJSON<PrayerCalculationConfig>('prayer_config', DEFAULT_PRAYER_CONFIG),
    ]);

    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      city: location.cityName,
      location,
      prayerConfig,
      phases,
      tasks,
      alarms,
      settings,
    };

    return JSON.stringify(backup, null, 2);
  },

  async exportToDownloadsFolder(): Promise<ExportResult> {
    const [phases, tasks, alarms, settings, location, prayerConfig] = await Promise.all([
      phaseRepository.getAll(),
      taskRepository.getAll(),
      taskAlarmRepository.getAllEnabled(),
      settingsRepository.getAll(),
      locationService.getSavedLocation(),
      settingsRepository.getJSON<PrayerCalculationConfig>('prayer_config', DEFAULT_PRAYER_CONFIG),
    ]);

    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      city: location.cityName,
      location,
      prayerConfig,
      phases,
      tasks,
      alarms,
      settings,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const citySlug = (location.cityName || 'city').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const dateSlug = formatDateKey(new Date());
    const fileName = `salahflow_${citySlug}_${dateSlug}.json`;
    const fileNameWithoutExt = `salahflow_${citySlug}_${dateSlug}`;

    let savedPath = '';
    let folderName = 'Downloads / SalahFlow Data';

    // 1. Android: Try saving directly into Downloads / SalahFlow Data via SAF
    if (Platform.OS === 'android') {
      try {
        const downloadUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
        const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadUri);
        if (perm.granted) {
          const rootUri = perm.directoryUri;
          let targetDirUri = rootUri;

          try {
            const files = await StorageAccessFramework.readDirectoryAsync(rootUri);
            const existingDir = files.find(
              (f) =>
                decodeURIComponent(f).includes('SalahFlow Data') ||
                decodeURIComponent(f).includes('salahflow_data')
            );
            if (existingDir) {
              targetDirUri = existingDir;
            } else {
              targetDirUri = await StorageAccessFramework.makeDirectoryAsync(
                rootUri,
                'SalahFlow Data'
              );
            }
          } catch {
            targetDirUri = rootUri;
          }

          const fileUri = await StorageAccessFramework.createFileAsync(
            targetDirUri,
            fileNameWithoutExt,
            'application/json'
          );

          await FileSystem.writeAsStringAsync(fileUri, jsonString, {
            encoding: FileSystem.EncodingType.UTF8,
          });

          savedPath = fileUri;
        }
      } catch (safErr) {
        console.warn('SAF Downloads export encountered error, proceeding to local backup:', safErr);
      }
    }

    // 2. Also write an internal persistent copy in SalahFlow Data directory
    try {
      const localDir = `${FileSystem.documentDirectory}SalahFlow Data/`;
      const dirInfo = await FileSystem.getInfoAsync(localDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
      }
      const localFileUri = `${localDir}${fileName}`;
      await FileSystem.writeAsStringAsync(localFileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!savedPath) {
        savedPath = localFileUri;
        folderName = 'SalahFlow Data (Documents)';
      }
    } catch (localErr) {
      console.warn('Failed to write local SalahFlow Data copy:', localErr);
    }

    return {
      jsonString,
      fileName,
      savedPath,
      folderName,
      city: location.cityName,
      phaseCount: phases.length,
      taskCount: tasks.length,
    };
  },

  async pickBackupFile(): Promise<{ jsonString: string; fileName: string } | null> {
    try {
      // 1. Try modern File.pickFileAsync (built into Expo SDK 58 FileSystem)
      const res = await File.pickFileAsync({
        mimeTypes: ['application/json', 'text/plain', '*/*'],
      });

      if (!res.canceled && res.result) {
        const pickedFile = res.result;
        const uri = pickedFile.uri;
        const fileName = pickedFile.name || 'salahflow_backup.json';
        const jsonString = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        return { jsonString, fileName };
      }
    } catch (e) {
      console.warn('File.pickFileAsync fallback to SAF directory picker:', e);
    }

    // 2. Android SAF directory fallback
    if (Platform.OS === 'android') {
      try {
        const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (perm.granted) {
          const files = await StorageAccessFramework.readDirectoryAsync(perm.directoryUri);
          const jsonFiles = files.filter(
            (f) => f.toLowerCase().endsWith('.json') || f.includes('.json')
          );
          if (jsonFiles.length > 0) {
            const latestUri = jsonFiles[jsonFiles.length - 1];
            const jsonString = await FileSystem.readAsStringAsync(latestUri, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            const fileName = decodeURIComponent(latestUri.split('/').pop() || 'backup.json');
            return { jsonString, fileName };
          }
        }
      } catch (safErr) {
        console.warn('SAF directory backup pick failed:', safErr);
      }
    }

    return null;
  },

  async listLocalBackups(): Promise<string[]> {
    try {
      const localDir = `${FileSystem.documentDirectory}SalahFlow Data/`;
      const dirInfo = await FileSystem.getInfoAsync(localDir);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(localDir);
        return files.filter((f) => f.endsWith('.json')).sort().reverse();
      }
    } catch {
      // Ignore
    }
    return [];
  },

  async readLocalBackup(fileName: string): Promise<string> {
    const filePath = `${FileSystem.documentDirectory}SalahFlow Data/${fileName}`;
    return await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  },

  async importData(jsonString: string): Promise<ImportResult> {
    try {
      const backup = JSON.parse(jsonString) as BackupData;
      if (!backup.phases || !backup.tasks) {
        throw new Error('Invalid backup file structure: missing phases or tasks.');
      }

      // Reset existing data
      await resetDatabase();

      // Restore phases
      for (const p of backup.phases) {
        await phaseRepository.create(p);
      }

      // Restore tasks
      for (const t of backup.tasks) {
        await taskRepository.create(t);
      }

      // Restore alarms
      if (backup.alarms) {
        for (const a of backup.alarms) {
          await taskAlarmRepository.upsert(a);
        }
      }

      // Restore settings
      if (backup.settings) {
        for (const [k, v] of Object.entries(backup.settings)) {
          await settingsRepository.set(k, v);
        }
      }

      // Restore location & city
      const city = backup.city || backup.location?.cityName || 'Indore';
      if (backup.location) {
        await locationService.saveLocation(backup.location);
      } else if (backup.city) {
        const match = POPULAR_LOCATIONS.find(
          (c) => c.cityName.toLowerCase() === backup.city.toLowerCase()
        );
        if (match) {
          await locationService.saveLocation(match);
        }
      }

      if (backup.prayerConfig) {
        await settingsRepository.setJSON('prayer_config', backup.prayerConfig);
      }

      return {
        success: true,
        city,
        phaseCount: backup.phases.length,
        taskCount: backup.tasks.length,
        exportedAt: backup.exportedAt,
      };
    } catch (e) {
      console.error('Failed to import backup:', e);
      throw e;
    }
  },
};
