import assert from 'node:assert/strict';
import {
  mapHcWorkoutType,
  formatDurationFromSeconds,
  convertHcWorkoutToLogym,
  isWorkoutConflict,
  isAllowedCardioType,
  cleanSourceAppName,
} from './healthConnect.js';
import { dailyBurnCalories, splitWorkoutCalories, calculateSmartWorkoutCalories } from './workoutCalc.js';

console.log('Testing External Cardio Sync (Samsung Health / Health Connect)...');

// 1. isAllowedCardioType (Cegah import 'Other' atau 'strengthTraining')
assert.equal(isAllowedCardioType('cycling'), true);
assert.equal(isAllowedCardioType('bikingStationary'), true);
assert.equal(isAllowedCardioType('running'), true);
assert.equal(isAllowedCardioType('walking'), true);
assert.equal(isAllowedCardioType('swimming'), true);
assert.equal(isAllowedCardioType('hiking'), true);
assert.equal(isAllowedCardioType('other'), false, "'other' BUKAN kardio, dilarang di-pull!");
assert.equal(isAllowedCardioType('strengthTraining'), false, "'strengthTraining' dilarang di-pull!");
assert.equal(isAllowedCardioType('weightlifting'), false, "'weightlifting' dilarang di-pull!");
console.log('✅ isAllowedCardioType passed');

// 2. cleanSourceAppName (Tampilan badge bersih, bukan package name)
assert.equal(cleanSourceAppName('com.sec.android.app.shealth', 'com.sec.android.app.shealth'), 'Samsung Health');
assert.equal(cleanSourceAppName(null, 'com.sec.android.app.shealth'), 'Samsung Health');
assert.equal(cleanSourceAppName('Samsung Health', 'com.sec.android.app.shealth'), 'Samsung Health');
assert.equal(cleanSourceAppName('Strava', 'com.strava'), 'Strava');
assert.equal(cleanSourceAppName(null, 'com.garmin.android.apps.connectmobile'), 'Garmin');
console.log('✅ cleanSourceAppName passed');

// 3. mapHcWorkoutType
assert.equal(mapHcWorkoutType('cycling'), 'Bersepeda (Cycling)');
assert.equal(mapHcWorkoutType('bikingStationary'), 'Bersepeda (Cycling)');
assert.equal(mapHcWorkoutType('running'), 'Lari (Running)');
assert.equal(mapHcWorkoutType('runningTreadmill'), 'Lari (Running)');
assert.equal(mapHcWorkoutType('walking'), 'Jalan Santai (Walking)');
assert.equal(mapHcWorkoutType('swimming'), 'Berenang (Swimming)');
assert.equal(mapHcWorkoutType('hiking'), 'Mendaki (Hiking)');
console.log('✅ mapHcWorkoutType passed');

// 4. formatDurationFromSeconds
assert.equal(formatDurationFromSeconds(45), '00:45');
assert.equal(formatDurationFromSeconds(1800), '30:00');
assert.equal(formatDurationFromSeconds(3665), '01:01:05');
console.log('✅ formatDurationFromSeconds passed');

// 5. convertHcWorkoutToLogym
const sampleHcWorkout = {
  workoutType: 'cycling',
  duration: 2700, // 45 menit
  totalEnergyBurned: 380, // kcal
  totalDistance: 15420, // meter
  startDate: '2026-11-04T06:30:00.000Z',
  endDate: '2026-11-04T07:15:00.000Z',
  sourceName: 'Samsung Health',
  sourceId: 'com.sec.android.app.shealth',
  platformId: 'hc_sample_cycle_1',
};

const converted = convertHcWorkoutToLogym(sampleHcWorkout, '2026-11-04');
assert.equal(converted.id, 'hc_hc_sample_cycle_1');
assert.equal(converted.externalId, 'hc_sample_cycle_1');
assert.equal(converted.isExternal, true);
assert.equal(converted.source, 'Samsung Health');
assert.equal(converted.type, 'cardio');
assert.equal(converted.programName, 'Bersepeda (Cycling)');
assert.equal(converted.duration, '45:00');
assert.equal(converted.calories, 380);
assert.equal(converted.distanceKm, 15.42);
assert.equal(converted.status, 'completed');
assert.equal(converted.exercises.length, 1);
assert.equal(converted.exercises[0].category, 'cardio');
console.log('✅ convertHcWorkoutToLogym passed');

// 6. isWorkoutConflict (Anti-Double-Counting dengan Sesi Asli Logym)
// Case A: Sesi pada waktu yang sama (overlap 100%) dengan format Logym (timestamp: "15:00")
const externalOtherWorkout = {
  workoutType: 'other',
  startDate: '2026-11-04T08:00:00.000Z', // 15:00 WIB (UTC+7)
  endDate: '2026-11-04T09:14:00.000Z',   // 16:14 WIB (UTC+7)
  duration: 4440,
};

const logymPullSession = {
  id: 'workout_pull_today',
  programName: 'Pull',
  status: 'completed',
  startedAt: new Date('2026-11-04T08:00:00.000Z').getTime(), // 15:00 WIB
  duration: '48 menit',
  timestamp: '15:48',
};

// Harus terdeteksi bentrok karena user nyalain Samsung Health bareng Logym saat Pull!
assert.equal(isWorkoutConflict(externalOtherWorkout, logymPullSession, '2026-11-04'), true);

// Case B: Sesi berbeda jam (pagi sepedahan vs sore Pull) -> TIDAK BENTROK
assert.equal(isWorkoutConflict(sampleHcWorkout, logymPullSession, '2026-11-04'), false);
console.log('✅ isWorkoutConflict (Anti-Double-Counting) passed');

// 7. Integrasi Energi SSOT (workoutCalc & dailyBurnCalories)
const userWeight = 70;
const split = splitWorkoutCalories(userWeight, converted, converted.log);
assert.equal(split.kardio, 380, 'Seluruh kalori sepedahan eksternal harus masuk kardio');
assert.equal(split.beban, 0, 'Kalori beban harus 0 untuk sesi sepedahan');

const smartKcal = calculateSmartWorkoutCalories(userWeight, converted, converted.log);
assert.equal(smartKcal, 380);

const bioData = { steps: 5000, bmr: 1600 };
const burn = dailyBurnCalories(bioData, [converted], userWeight, {});
assert.equal(burn.kardio, 380, 'burn.kardio harus terhitung 380 kcal');
assert.equal(burn.workout, 380, 'burn.workout harus mencakup 380 kcal');
assert.equal(burn.sessions, 1, 'burn.sessions harus 1');
assert.ok(burn.total >= 1600 + (5000 * 0.04) + 380, 'Total kalori harian harus mencakup EAT sepedahan');
console.log('✅ Integrasi Energi SSOT (workoutCalc & dailyBurnCalories) passed');

console.log('🎉 All External Cardio Sync unit tests PASSED successfully!');
