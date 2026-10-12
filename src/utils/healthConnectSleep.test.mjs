import assert from 'node:assert/strict';
import { sleepPerDay, ymdOf } from './healthConnect.js';

// 1. ymdOf handles both Date objects and ISO strings in local timezone
{
  const d = new Date(2026, 9, 1, 6, 30); // 1 Okt 2026, 06:30 local time
  assert.equal(ymdOf(d), '2026-10-01');
  assert.equal(ymdOf('2026-10-01T06:30:00'), '2026-10-01');
}

// 2. sleepPerDay groups by wake-up day (endDate) across month boundary
{
  // User sleeps 30 Sept 23:00 -> 1 Oct 07:00 (ganti bulan)
  const start = new Date(2026, 8, 30, 23, 0).toISOString();
  const end = new Date(2026, 9, 1, 7, 0).toISOString();

  const samples = [
    {
      startDate: start,
      endDate: end,
      // Note: @capgo/capacitor-health does NOT set hasStageData, only stages array
      stages: [
        { stage: 'light', durationMinutes: 120 },
        { stage: 'deep', durationMinutes: 90 },
        { stage: 'rem', durationMinutes: 90 },
        { stage: 'light', durationMinutes: 120 },
        { stage: 'awake', durationMinutes: 60 },
      ]
    }
  ];

  const result = sleepPerDay(samples);
  assert.ok(result['2026-10-01'], 'Data tidur harus jatuh di tanggal bangun (1 Okt)');
  assert.equal(result['2026-09-30'], undefined, 'Tidak boleh jatuh di tanggal 30 Sep');
  
  const oct1 = result['2026-10-01'];
  assert.equal(oct1.sleep, 8.0, 'Total tidur harus 8.0 jam (480 menit)');
  assert.equal(oct1.sleepDeep, '90', 'Deep sleep 90 menit');
  assert.equal(oct1.sleepRem, '90', 'REM sleep 90 menit');
  assert.equal(oct1.sleepLight, '240', 'Light sleep 240 menit');
  assert.equal(oct1.sleepAwake, '60', 'Awake 60 menit');
  assert.ok(Array.isArray(oct1.sleepLog) && oct1.sleepLog.length > 2, 'sleepLog harus terisi untuk hipnogram');
}

// 3. Fallback when stages are not available (simple sleep session)
{
  const start = new Date(2026, 9, 1, 23, 0).toISOString();
  const end = new Date(2026, 9, 2, 6, 30).toISOString();

  const samples = [
    {
      startDate: start,
      endDate: end,
    }
  ];

  const result = sleepPerDay(samples);
  assert.ok(result['2026-10-02']);
  const oct2 = result['2026-10-02'];
  assert.equal(oct2.sleep, 7.5, 'Total tidur 7.5 jam (450 menit)');
  assert.equal(oct2.sleepDeep, '0');
  assert.equal(oct2.sleepLight, '0');
}

// 4. Overlapping duplicate sessions from multiple apps (e.g. Samsung Health + Google Fit)
{
  const start = '2026-10-09T23:45:00.000Z';
  const end = '2026-10-10T06:06:00.000Z';

  const samples = [
    {
      startDate: start,
      endDate: end,
      sourceId: 'com.sec.android.app.shealth',
      stages: [
        { stage: 'deep', durationMinutes: 40 },
        { stage: 'light', durationMinutes: 224 },
        { stage: 'rem', durationMinutes: 101 },
        { stage: 'awake', durationMinutes: 16 }
      ]
    },
    {
      startDate: start,
      endDate: end,
      sourceId: 'com.google.android.apps.fitness',
      stages: [
        { stage: 'deep', durationMinutes: 41 },
        { stage: 'light', durationMinutes: 224 },
        { stage: 'rem', durationMinutes: 101 },
        { stage: 'awake', durationMinutes: 15 }
      ]
    }
  ];

  const result = sleepPerDay(samples);
  const oct10 = result['2026-10-10'];
  assert.ok(oct10, 'Data 10 Okt harus ada');
  assert.equal(oct10.sleep, 6.3, 'Tidur tidak boleh kedobel jadi 12.7 jam!');
  assert.equal(oct10.sleepDeep, '40', 'Deep sleep harus 40 menit, bukan 81');
  assert.equal(oct10.sleepLight, '224', 'Light sleep harus 224 menit, bukan 448');
  assert.equal(oct10.sleepRem, '101', 'REM sleep harus 101 menit, bukan 202');
  assert.equal(oct10.sleepAwake, '16', 'Awake sleep harus 16 menit, bukan 31');
}

// 5. Legitimate afternoon nap + overnight sleep on the same day are both kept
{
  // Overnight sleep: 23:00 (Oct 9) -> 06:00 (Oct 10) = 7 hours
  // Afternoon nap: 13:00 (Oct 10) -> 14:00 (Oct 10) = 1 hour
  const samples = [
    {
      startDate: '2026-10-09T23:00:00.000Z',
      endDate: '2026-10-10T06:00:00.000Z',
      stages: [
        { stage: 'deep', durationMinutes: 60 },
        { stage: 'light', durationMinutes: 300 },
        { stage: 'rem', durationMinutes: 60 }
      ]
    },
    {
      startDate: '2026-10-10T13:00:00.000Z',
      endDate: '2026-10-10T14:00:00.000Z',
      stages: [
        { stage: 'light', durationMinutes: 60 }
      ]
    }
  ];

  const result = sleepPerDay(samples);
  const oct10 = result['2026-10-10'];
  assert.ok(oct10);
  assert.equal(oct10.sleep, 8.0, '7 jam tidur malam + 1 jam tidur siang = 8 jam');
  assert.equal(oct10.sleepLight, '360', 'Light sleep 300 + 60 = 360');
}

console.log('healthConnectSleep OK');
