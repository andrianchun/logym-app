import assert from 'node:assert/strict';
import {
  mapHcWorkoutType,
  formatDurationFromSeconds,
  convertHcWorkoutToLogym,
  isWorkoutConflict,
} from './healthConnect.js';
import { dailyBurnCalories, splitWorkoutCalories, calculateSmartWorkoutCalories } from './workoutCalc.js';

console.log('Testing External Cardio Sync (Samsung Health / Health Connect)...');

// 1. mapHcWorkoutType
assert.equal(mapHcWorkoutType('cycling'), 'Bersepeda (Cycling)');
assert.equal(mapHcWorkoutType('bikingStationary'), 'Bersepeda (Cycling)');
assert.equal(mapHcWorkoutType('running'), 'Lari (Running)');
assert.equal(mapHcWorkoutType('runningTreadmill'), 'Lari (Running)');
assert.equal(mapHcWorkoutType('walking'), 'Jalan Santai (Walking)');
assert.equal(mapHcWorkoutType('swimming'), 'Berenang (Swimming)');
assert.equal(mapHcWorkoutType('hiking'), 'Mendaki (Hiking)');
console.log('✅ mapHcWorkoutType passed');

// 2. formatDurationFromSeconds
assert.equal(formatDurationFromSeconds(45), '00:45');
assert.equal(formatDurationFromSeconds(1800), '30:00');
assert.equal(formatDurationFromSeconds(3665), '01:01:05');
console.log('✅ formatDurationFromSeconds passed');

// 3. convertHcWorkoutToLogym
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

// 4. isWorkoutConflict (Anti-Double-Counting)
// Case A: Sesi pada waktu yang sama (overlap 100%) -> KONFLIK
const existingTreadmill = {
  id: 'workout_treadmill_1',
  startTime: '2026-11-04T06:30:00.000Z',
  endTime: '2026-11-04T07:15:00.000Z',
  durationSecs: 2700,
};
assert.equal(isWorkoutConflict(sampleHcWorkout, existingTreadmill), true);

// Case B: Sesi berbeda jam (pagi sepedahan, sore angkat beban) -> TIDAK KONFLIK
const eveningGym = {
  id: 'workout_evening_gym',
  startTime: '2026-11-04T17:00:00.000Z',
  endTime: '2026-11-04T18:00:00.000Z',
  durationSecs: 3600,
};
assert.equal(isWorkoutConflict(sampleHcWorkout, eveningGym), false);

// Case C: Sesi tumpang tindih sedikit (<50%) -> TIDAK KONFLIK
const slightOverlap = {
  id: 'workout_slight',
  startTime: '2026-11-04T07:10:00.000Z', // tumpang tindih cuma 5 menit dari total 45 menit (11%)
  endTime: '2026-11-04T08:00:00.000Z',
  durationSecs: 3000,
};
assert.equal(isWorkoutConflict(sampleHcWorkout, slightOverlap), false);
console.log('✅ isWorkoutConflict (Anti-Double-Counting) passed');

// 5. Integrasi Energi SSOT (workoutCalc & dailyBurnCalories)
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
