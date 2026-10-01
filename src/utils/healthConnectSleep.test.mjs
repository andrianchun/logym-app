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

console.log('healthConnectSleep OK');
