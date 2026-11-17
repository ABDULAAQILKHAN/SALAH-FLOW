import { backupService, BackupData } from '../src/services/backup/backupService';
import { phaseRepository } from '../src/database/repositories/phaseRepository';
import { taskRepository } from '../src/database/repositories/taskRepository';
import { taskAlarmRepository } from '../src/database/repositories/taskAlarmRepository';
import { settingsRepository } from '../src/database/repositories/settingsRepository';
import { locationService } from '../src/services/location/locationService';
import { resetDatabase } from '../src/database';
import { Phase, Task, LocationConfig } from '../src/types';

jest.mock('../src/database', () => ({
  resetDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/database/repositories/phaseRepository', () => ({
  phaseRepository: {
    getAll: jest.fn(),
    create: jest.fn().mockResolvedValue('p1'),
  },
}));

jest.mock('../src/database/repositories/taskRepository', () => ({
  taskRepository: {
    getAll: jest.fn(),
    create: jest.fn().mockResolvedValue('t1'),
  },
}));

jest.mock('../src/database/repositories/taskAlarmRepository', () => ({
  taskAlarmRepository: {
    getAllEnabled: jest.fn(),
    upsert: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../src/database/repositories/settingsRepository', () => ({
  settingsRepository: {
    getAll: jest.fn(),
    getJSON: jest.fn(),
    setJSON: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../src/services/location/locationService', () => ({
  locationService: {
    getSavedLocation: jest.fn(),
    saveLocation: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-file-system', () => ({
  File: {
    pickFileAsync: jest.fn(),
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  StorageAccessFramework: {
    getUriForDirectoryInRoot: jest.fn(),
    requestDirectoryPermissionsAsync: jest.fn(),
    makeDirectoryAsync: jest.fn(),
    createFileAsync: jest.fn(),
    readDirectoryAsync: jest.fn(),
  },
  documentDirectory: 'file:///mock/documents/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue('{}'),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  EncodingType: { UTF8: 'utf8' },
}));

describe('Backup & Restore Service', () => {
  const mockLocation: LocationConfig = {
    cityName: 'Indore',
    countryName: 'India',
    latitude: 22.7196,
    longitude: 75.8577,
    timezone: 'Asia/Kolkata',
    isManual: true,
  };

  const mockPhases: Phase[] = [
    {
      id: 'p1',
      name: 'Before Fajr / Early Morning',
      type: 'fajr_early_morning',
      sortOrder: 0,
      isDefault: true,
      isEnabled: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const mockTasks: Task[] = [
    {
      id: 't1',
      phaseId: 'p1',
      title: 'Tahajjud Prayer',
      durationMinutes: 20,
      sortOrder: 0,
      taskType: 'prayer',
      isCore: true,
      prayerType: 'tahajjud',
      schedulingType: 'fixed_time',
      fixedTime: '05:43',
      offsetMinutes: 0,
      priority: 'core',
      isEnabled: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 't2',
      phaseId: 'p1',
      title: 'Quran Recitation',
      durationMinutes: 30,
      sortOrder: 1,
      taskType: 'activity',
      isCore: false,
      schedulingType: 'prayer_relative',
      anchorPrayer: 'fajr',
      anchorRelation: 'before',
      offsetMinutes: 0,
      priority: 'medium',
      isEnabled: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (locationService.getSavedLocation as jest.Mock).mockResolvedValue(mockLocation);
    (phaseRepository.getAll as jest.Mock).mockResolvedValue(mockPhases);
    (taskRepository.getAll as jest.Mock).mockResolvedValue(mockTasks);
    (taskAlarmRepository.getAllEnabled as jest.Mock).mockResolvedValue([]);
    (settingsRepository.getAll as jest.Mock).mockResolvedValue({});
    (settingsRepository.getJSON as jest.Mock).mockResolvedValue({
      method: 'Karachi',
      asrMethod: 'hanafi',
      highLatitudeRule: 'MiddleOfTheNight',
    });
  });

  test('exportData includes current city, location, phases, and tasks', async () => {
    const jsonString = await backupService.exportData();
    const backup: BackupData = JSON.parse(jsonString);

    expect(backup.version).toBe(1);
    expect(backup.city).toBe('Indore');
    expect(backup.location).toEqual(mockLocation);
    expect(backup.phases.length).toBe(1);
    expect(backup.tasks.length).toBe(2);
    expect(backup.prayerConfig?.asrMethod).toBe('hanafi');
  });

  test('importData restores phases, tasks, and switches city location', async () => {
    const backupToImport: BackupData = {
      version: 1,
      exportedAt: '2026-11-17T12:00:00Z',
      city: 'Ujjain',
      location: {
        cityName: 'Ujjain',
        countryName: 'India',
        latitude: 23.1765,
        longitude: 75.7885,
        timezone: 'Asia/Kolkata',
        isManual: true,
      },
      phases: mockPhases,
      tasks: mockTasks,
      alarms: [],
      settings: {},
    };

    const result = await backupService.importData(JSON.stringify(backupToImport));

    expect(resetDatabase).toHaveBeenCalledTimes(1);
    expect(phaseRepository.create).toHaveBeenCalledWith(mockPhases[0]);
    expect(taskRepository.create).toHaveBeenCalledTimes(2);
    expect(locationService.saveLocation).toHaveBeenCalledWith(backupToImport.location);
    expect(result.success).toBe(true);
    expect(result.city).toBe('Ujjain');
    expect(result.taskCount).toBe(2);
    expect(result.phaseCount).toBe(1);
  });

  test('importData throws error if phases or tasks are missing', async () => {
    const invalidJson = JSON.stringify({ version: 1, city: 'Indore' });
    await expect(backupService.importData(invalidJson)).rejects.toThrow(
      'Invalid backup file structure: missing phases or tasks.'
    );
  });
});
