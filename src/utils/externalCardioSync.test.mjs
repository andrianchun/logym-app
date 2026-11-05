import assert from 'node:assert/strict';
import {
  mapHcWorkoutType,
  formatDurationFromSeconds,
  convertHcWorkoutToLogym,
  isWorkoutConflict,
  isAllowedExternalType,
  isAllowedCardioType,
  cleanSourceAppName,
  formatExternalWorkoutName,
  getWorkoutSortMinutes,
} from './healthConnect.js';
import { dailyBurnCalories, splitWorkoutCalories, calculateSmartWorkoutCalories } from './workoutCalc.js';

console.log('Testing External Cardio & Strength Sync (Samsung Health / Health Connect)...');

// 1. isAllowedExternalType
assert.equal(isAllowedExternalType('cycling'), true);
assert.equal(isAllowedExternalType('bikingStationary'), true);
assert.equal(isAllowedExternalType('running'), true);
assert.equal(isAllowedExternalType('walking'), true);
assert.equal(isAllowedExternalType('swimming'), true);
assert.equal(isAllowedExternalType('hiking'), true);
assert.equal(isAllowedExternalType('other'), true, "'other' diperbolehkan jika tidak ada konflik");
assert.equal(isAllowedExternalType('strengthTraining'), true, "'strengthTraining' diperbolehkan jika user latihan beban di SH");
assert.equal(isAllowedExternalType('weightlifting'), true, "'weightlifting' diperbolehkan jika user latihan beban di SH");
console.log('✅ isAllowedExternalType passed');

// 2. cleanSourceAppName (Tampilan badge bersih, bukan package name)
assert.equal(cleanSourceAppName('com.sec.android.app.shealth', 'com.sec.android.app.shealth'), 'Samsung Health');
assert.equal(cleanSourceAppName(null, 'com.sec.android.app.shealth'), 'Samsung Health');
assert.equal(cleanSourceAppName('Samsung Health', 'com.sec.android.app.shealth'), 'Samsung Health');
assert.equal(cleanSourceAppName('Strava', 'com.strava'), 'Strava');
assert.equal(cleanSourceAppName(null, 'com.garmin.android.apps.connectmobile'), 'Garmin');
console.log('✅ cleanSourceAppName passed');

// 3. mapHcWorkoutType & formatExternalWorkoutName (ID vs EN dipisah murni)
assert.equal(mapHcWorkoutType('cycling'), 'Bersepeda');
assert.equal(mapHcWorkoutType('cycling', 'en'), 'Cycling');
assert.equal(mapHcWorkoutType('bikingStationary'), 'Bersepeda');
assert.equal(mapHcWorkoutType('running'), 'Lari');
assert.equal(mapHcWorkoutType('running', 'en'), 'Running');
assert.equal(mapHcWorkoutType('runningTreadmill'), 'Lari');
assert.equal(mapHcWorkoutType('walking'), 'Jalan Santai');
assert.equal(mapHcWorkoutType('walking', 'en'), 'Walking');
assert.equal(mapHcWorkoutType('swimming'), 'Berenang');
assert.equal(mapHcWorkoutType('swimming', 'en'), 'Swimming');
assert.equal(mapHcWorkoutType('hiking'), 'Mendaki');
assert.equal(mapHcWorkoutType('hiking', 'en'), 'Hiking');
assert.equal(mapHcWorkoutType('weightlifting'), 'Latihan Beban Ekstra');
assert.equal(mapHcWorkoutType('weightlifting', 'en'), 'Extra Strength Training');
assert.equal(mapHcWorkoutType('other'), 'Lainnya');
assert.equal(mapHcWorkoutType('other', 'en'), 'Other');

assert.equal(formatExternalWorkoutName('Bersepeda (Cycling)'), 'Bersepeda');
assert.equal(formatExternalWorkoutName('Bersepeda (Cycling)', 'en'), 'Cycling');
assert.equal(formatExternalWorkoutName('Latihan Beban Ekstra'), 'Latihan Beban Ekstra');
assert.equal(formatExternalWorkoutName('Latihan Beban Ekstra', 'en'), 'Extra Strength Training');
assert.equal(formatExternalWorkoutName('Other'), 'Lainnya');
assert.equal(formatExternalWorkoutName('Other', 'en'), 'Other');
console.log('✅ mapHcWorkoutType & formatExternalWorkoutName passed');

// 4. formatDurationFromSeconds & getWorkoutSortMinutes
assert.equal(formatDurationFromSeconds(45), '00:45');
assert.equal(formatDurationFromSeconds(1800), '30:00');
assert.equal(formatDurationFromSeconds(3665), '01:01:05');

assert.equal(getWorkoutSortMinutes({ timestamp: '06:30' }), 6 * 60 + 30);
assert.equal(getWorkoutSortMinutes({ reminderTime: '15:00' }), 15 * 60);
console.log('✅ formatDurationFromSeconds & getWorkoutSortMinutes passed');

// 5. convertHcWorkoutToLogym (Cardio & Strength)
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
assert.equal(converted.programName, 'Bersepeda');
assert.equal(converted.duration, '45:00');
assert.equal(converted.calories, 380);
assert.equal(converted.distanceKm, 15.42);
assert.equal(converted.status, 'completed');
assert.equal(converted.exercises.length, 1);

// Strength external session (User tracked weightlifting only in Samsung Health)
const sampleHcStrength = {
  workoutType: 'weightlifting',
  duration: 3600, // 60 menit
  totalEnergyBurned: 320,
  startDate: '2026-11-04T10:00:00.000Z',
  endDate: '2026-11-04T11:00:00.000Z',
  sourceName: 'Samsung Health',
  platformId: 'hc_strength_1',
};
const convertedStrength = convertHcWorkoutToLogym(sampleHcStrength, '2026-11-04');
assert.equal(convertedStrength.type, 'strength');
assert.equal(convertedStrength.programId, 'strength-external');
assert.equal(convertedStrength.programName, 'Latihan Beban Ekstra');
assert.equal(convertedStrength.calories, 320);
console.log('✅ convertHcWorkoutToLogym (cardio & strength) passed');

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
const splitCardio = splitWorkoutCalories(userWeight, converted, converted.log);
assert.equal(splitCardio.kardio, 380, 'Seluruh kalori sepedahan eksternal harus masuk kardio');
assert.equal(splitCardio.beban, 0, 'Kalori beban harus 0 untuk sesi sepedahan');

const splitStrength = splitWorkoutCalories(userWeight, convertedStrength, convertedStrength.log);
assert.equal(splitStrength.kardio, 0, 'Kalori kardio harus 0 untuk sesi latihan beban eksternal');
assert.equal(splitStrength.beban, 320, 'Seluruh kalori latihan beban eksternal harus masuk beban');

const bioData = { steps: 5000, bmr: 1600 };
const burn = dailyBurnCalories(bioData, [converted, convertedStrength], userWeight, {});
assert.equal(burn.kardio, 380, 'burn.kardio harus terhitung 380 kcal');
assert.equal(burn.beban, 320, 'burn.beban harus terhitung 320 kcal');
assert.equal(burn.workout, 700, 'burn.workout harus mencakup 700 kcal (380 + 320)');
assert.equal(burn.sessions, 2, 'burn.sessions harus 2');
assert.ok(burn.total >= 1600 + (5000 * 0.04) + 700, 'Total kalori harian harus mencakup EAT lengkap');
console.log('✅ Integrasi Energi SSOT (workoutCalc & dailyBurnCalories) passed');

console.log('🎉 All External Cardio & Strength Sync unit tests PASSED successfully!');
