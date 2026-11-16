import { getDatabase } from '../index';
import { PrayerTimings, AsrMethod } from '../../types';

interface PrayerTimingRow {
  id: string;
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  tahajjud: string;
  latitude: number;
  longitude: number;
  calculation_method: string;
  asr_method: string;
  created_at: string;
}

function mapRowToTimings(row: PrayerTimingRow): PrayerTimings {
  return {
    id: row.id,
    date: row.date,
    fajr: row.fajr,
    sunrise: row.sunrise,
    dhuhr: row.dhuhr,
    asr: row.asr,
    maghrib: row.maghrib,
    isha: row.isha,
    tahajjud: row.tahajjud,
    latitude: row.latitude,
    longitude: row.longitude,
    calculationMethod: row.calculation_method,
    asrMethod: row.asr_method as AsrMethod,
    createdAt: row.created_at,
  };
}

export const prayerTimingRepository = {
  async getByDate(
    date: string,
    method?: string,
    asrMethod?: AsrMethod
  ): Promise<PrayerTimings | null> {
    const db = await getDatabase();
    let query = 'SELECT * FROM prayer_timings WHERE date = ?';
    const params: (string | number)[] = [date];

    if (method && asrMethod) {
      query += ' AND calculation_method = ? AND asr_method = ?';
      params.push(method, asrMethod);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const row = await db.getFirstAsync<PrayerTimingRow>(query, params);
    return row ? mapRowToTimings(row) : null;
  },

  async save(timings: PrayerTimings): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO prayer_timings (
        id, date, fajr, sunrise, dhuhr, asr, maghrib, isha, tahajjud,
        latitude, longitude, calculation_method, asr_method, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        timings.id,
        timings.date,
        timings.fajr,
        timings.sunrise,
        timings.dhuhr,
        timings.asr,
        timings.maghrib,
        timings.isha,
        timings.tahajjud,
        timings.latitude,
        timings.longitude,
        timings.calculationMethod,
        timings.asrMethod,
        timings.createdAt,
      ]
    );
  },

  async saveBulk(timingsList: PrayerTimings[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const t of timingsList) {
        await db.runAsync(
          `INSERT OR REPLACE INTO prayer_timings (
            id, date, fajr, sunrise, dhuhr, asr, maghrib, isha, tahajjud,
            latitude, longitude, calculation_method, asr_method, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id,
            t.date,
            t.fajr,
            t.sunrise,
            t.dhuhr,
            t.asr,
            t.maghrib,
            t.isha,
            t.tahajjud,
            t.latitude,
            t.longitude,
            t.calculationMethod,
            t.asrMethod,
            t.createdAt,
          ]
        );
      }
    });
  },

  async getMonthTimings(
    yearMonthPrefix: string,
    method?: string,
    asrMethod?: AsrMethod
  ): Promise<PrayerTimings[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM prayer_timings WHERE date LIKE ?';
    const params: string[] = [`${yearMonthPrefix}%`];

    if (method && asrMethod) {
      query += ' AND calculation_method = ? AND asr_method = ?';
      params.push(method, asrMethod);
    }

    query += ' ORDER BY date ASC';

    const rows = await db.getAllAsync<PrayerTimingRow>(query, params);
    return rows.map(mapRowToTimings);
  },

  async clearAll(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM prayer_timings');
  },
};
