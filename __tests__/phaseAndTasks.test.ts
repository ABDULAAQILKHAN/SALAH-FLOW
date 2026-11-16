import { DEFAULT_PHASE_DEFINITIONS } from '../src/constants/phases';
import { phaseEngine } from '../src/services/scheduling/phaseEngine';

describe('Phase & Task Management Domain Logic', () => {
  test('Exactly 5 default phases are defined', () => {
    expect(DEFAULT_PHASE_DEFINITIONS.length).toBe(5);
  });

  test('Phase 1 contains Tahajjud and Fajr as two core tasks', () => {
    const phase1 = DEFAULT_PHASE_DEFINITIONS[0];
    expect(phase1.type).toBe('fajr_early_morning');
    expect(phase1.coreTasks.length).toBe(2);

    const tahajjud = phase1.coreTasks.find((t) => t.prayerType === 'tahajjud');
    const fajr = phase1.coreTasks.find((t) => t.prayerType === 'fajr');

    expect(tahajjud).toBeDefined();
    expect(tahajjud?.isCore).toBe(true);
    expect(fajr).toBeDefined();
    expect(fajr?.isCore).toBe(true);

    // Tahajjud is anchored before Fajr
    expect(tahajjud?.anchorPrayer).toBe('fajr');
    expect(tahajjud?.anchorRelation).toBe('before');
  });

  test('Phases 2-5 contain Zuhr, Asr, Maghrib, and Isha as single core tasks', () => {
    const phase2 = DEFAULT_PHASE_DEFINITIONS[1];
    expect(phase2.type).toBe('zuhr_morning_midday');
    expect(phase2.coreTasks.length).toBe(1);
    expect(phase2.coreTasks[0].prayerType).toBe('zuhr');

    const phase3 = DEFAULT_PHASE_DEFINITIONS[2];
    expect(phase3.type).toBe('asr_afternoon');
    expect(phase3.coreTasks.length).toBe(1);
    expect(phase3.coreTasks[0].prayerType).toBe('asr');

    const phase4 = DEFAULT_PHASE_DEFINITIONS[3];
    expect(phase4.type).toBe('maghrib_evening');
    expect(phase4.coreTasks.length).toBe(1);
    expect(phase4.coreTasks[0].prayerType).toBe('maghrib');

    const phase5 = DEFAULT_PHASE_DEFINITIONS[4];
    expect(phase5.type).toBe('isha_night');
    expect(phase5.coreTasks.length).toBe(1);
    expect(phase5.coreTasks[0].prayerType).toBe('isha');
  });

  test('Custom phase requires exactly one designated core task', () => {
    // Missing phase name
    const res1 = phaseEngine.validateCustomPhase('', 'Study React Native', 45);
    expect(res1.valid).toBe(false);

    // Missing core task
    const res2 = phaseEngine.validateCustomPhase('Evening Learning', '', 45);
    expect(res2.valid).toBe(false);
    expect(res2.error).toContain('exactly one designated core task');

    // Invalid duration
    const res3 = phaseEngine.validateCustomPhase('Evening Learning', 'Study', 0);
    expect(res3.valid).toBe(false);

    // Valid
    const res4 = phaseEngine.validateCustomPhase('Evening Learning', 'Study System Architecture', 60);
    expect(res4.valid).toBe(true);
  });
});
