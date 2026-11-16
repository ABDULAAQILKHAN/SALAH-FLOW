import { widgetService } from '../src/services/widget/widgetService';
import { DailySchedule, ScheduledPhase, ScheduledTask } from '../src/types';

describe('widgetService', () => {
  const createMockTask = (
    id: string,
    phaseId: string,
    title: string,
    isCore: boolean,
    start: Date,
    end: Date,
    dispStart: string,
    dispEnd: string,
    status: 'pending' | 'completed' | 'skipped' = 'pending'
  ): ScheduledTask => ({
    id,
    phaseId,
    title,
    taskType: isCore ? 'prayer' : 'activity',
    isCore,
    sortOrder: 0,
    durationMinutes: 20,
    schedulingType: 'prayer_relative',
    offsetMinutes: 0,
    priority: isCore ? 'core' : 'medium',
    isEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startTime: start,
    endTime: end,
    displayStartTime: dispStart,
    displayEndTime: dispEnd,
    status,
  });

  const phase1Start = new Date('2026-11-16T04:30:00.000Z');
  const phase1End = new Date('2026-11-16T06:15:00.000Z');
  const phase2Start = new Date('2026-11-16T12:00:00.000Z');
  const phase2End = new Date('2026-11-16T15:30:00.000Z');

  const taskTahajjud = createMockTask(
    'task_tahajjud',
    'phase_1',
    'Tahajjud',
    true,
    new Date('2026-11-16T04:30:00.000Z'),
    new Date('2026-11-16T05:00:00.000Z'),
    '4:30 AM',
    '5:00 AM',
    'completed'
  );

  const taskFajr = createMockTask(
    'task_fajr',
    'phase_1',
    'Fajr Prayer',
    true,
    new Date('2026-11-16T05:30:00.000Z'),
    new Date('2026-11-16T05:50:00.000Z'),
    '5:30 AM',
    '5:50 AM',
    'pending'
  );

  const taskZuhr = createMockTask(
    'task_zuhr',
    'phase_2',
    'Zuhr Prayer',
    true,
    new Date('2026-11-16T12:15:00.000Z'),
    new Date('2026-11-16T12:35:00.000Z'),
    '12:15 PM',
    '12:35 PM',
    'pending'
  );

  const mockPhases: ScheduledPhase[] = [
    {
      id: 'phase_1',
      name: 'Before Fajr / Early Morning',
      type: 'fajr_early_morning',
      sortOrder: 1,
      isDefault: true,
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startTime: phase1Start,
      endTime: phase1End,
      displayStartTime: '4:30 AM',
      displayEndTime: '6:15 AM',
      coreTasks: [taskTahajjud, taskFajr],
      tasks: [taskTahajjud, taskFajr],
      totalCount: 2,
      completedCount: 1,
      progressPercent: 50,
    },
    {
      id: 'phase_2',
      name: 'Morning / Midday',
      type: 'zuhr_morning_midday',
      sortOrder: 2,
      isDefault: true,
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startTime: phase2Start,
      endTime: phase2End,
      displayStartTime: '12:00 PM',
      displayEndTime: '3:30 PM',
      coreTasks: [taskZuhr],
      tasks: [taskZuhr],
      totalCount: 1,
      completedCount: 0,
      progressPercent: 0,
    },
  ];

  const mockSchedule: DailySchedule = {
    date: '2026-11-16',
    phases: mockPhases,
    totalTasks: 3,
    completedTasks: 1,
    overallProgress: 33,
    currentPhase: mockPhases[0],
    conflicts: [],
  };

  it('correctly calculates current active phase data during phase 1', () => {
    // Current time at 5:00 AM UTC (inside Phase 1)
    const testNow = new Date('2026-11-16T05:00:00.000Z');
    const phaseData = widgetService.computeCurrentPhaseData(mockSchedule, testNow);

    expect(phaseData).not.toBeNull();
    expect(phaseData?.phaseId).toBe('phase_1');
    expect(phaseData?.phaseName).toBe('Before Fajr / Early Morning');
    expect(phaseData?.coreTaskTitle).toBe('Tahajjud & Fajr Prayer');
    expect(phaseData?.nextPhaseName).toBe('Morning / Midday');
    expect(phaseData?.totalTasksCount).toBe(2);
    expect(phaseData?.completedTasksCount).toBe(1);
    expect(phaseData?.progressPercent).toBe(50);
    // End time is 06:15:00 UTC, diff from 05:00:00 is 75 minutes
    expect(phaseData?.remainingMinutesToPhaseEnd).toBe(75);
    expect(phaseData?.formattedCountdownToPhaseEnd).toBe('1h 15m');
  });

  it('correctly calculates current active phase data during phase 2', () => {
    // Current time at 13:00 UTC (inside Phase 2)
    const testNow = new Date('2026-11-16T13:00:00.000Z');
    const phaseData = widgetService.computeCurrentPhaseData(mockSchedule, testNow);

    expect(phaseData).not.toBeNull();
    expect(phaseData?.phaseId).toBe('phase_2');
    expect(phaseData?.phaseName).toBe('Morning / Midday');
    expect(phaseData?.coreTaskTitle).toBe('Zuhr Prayer');
    // End time is 15:30:00 UTC, diff from 13:00:00 is 150 minutes (2h 30m)
    expect(phaseData?.remainingMinutesToPhaseEnd).toBe(150);
    expect(phaseData?.formattedCountdownToPhaseEnd).toBe('2h 30m');
  });
});
