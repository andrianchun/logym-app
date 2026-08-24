import test from 'node:test';
import assert from 'node:assert/strict';
import {
  needsPersonalContext,
  summarizeHealthAndRecovery,
  buildSystemPrompt
} from './aiAgent.js';
import {
  pickRelevantExercises
} from './exerciseDbApi.js';

test('needsPersonalContext detects health, nutrition, sleep, and exercise queries', () => {
  // Sleep & Recovery
  assert.equal(needsPersonalContext('semalam aku tidur cuma 5 jam'), true);
  assert.equal(needsPersonalContext('gimana kesiapan dan readiness aku hari ini?'), true);
  assert.equal(needsPersonalContext('aku lagi capek dan lelah banget'), true);

  // Calories & Nutrition
  assert.equal(needsPersonalContext('kalori makananku hari ini udah berapa?'), true);
  assert.equal(needsPersonalContext('asupan protein hari ini udah cukup belum?'), true);
  assert.equal(needsPersonalContext('berapa target defisit kalori saya?'), true);
  assert.equal(needsPersonalContext('air minum ku udah berapa ml?'), true);

  // Exercise & Database
  assert.equal(needsPersonalContext('Ab Crunch ada atau ga di database?'), true);
  assert.equal(needsPersonalContext('apakah ada gerakan crunch di katalog?'), true);
  assert.equal(needsPersonalContext('ada alternatif buat bench press gak?'), true);

  // Trivial or pure generic should not pull heavy data
  assert.equal(needsPersonalContext('halo'), false);
  assert.equal(needsPersonalContext('makasih coach'), false);
  assert.equal(needsPersonalContext('apa itu deload'), false);
});

test('summarizeHealthAndRecovery produces compact, informative summary', () => {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const mockHistory = {
    [todayStr]: {
      bioData: {
        weight: 70,
        height: 175,
        bmi: 22.9,
        bmiStatus: 'Normal',
        bodyFat: 15,
        musclePercent: 45,
        bmr: 1650,
        sleep: 7.5,
        sleepDeep: 1.5,
        sleepRem: 1.8,
        restingHeartRate: 58,
        hrv: 65,
        nutritionCalories: 2100,
        protein: 140,
        carbs: 220,
        fat: 65,
        activityCalories: 500,
        waterIntake: 2500,
        steps: 8500,
        activeMinutes: 45,
        bloodPressure: '120/80',
        oxygenSaturation: 98
      }
    }
  };

  const mockUserProfile = { weight: 70, height: 175, goal: 'Muscle Gain' };
  const mockReadiness = { score: 88, status: 'optimal', message: 'Kondisi prima' };
  const mockActivityTargets = { steps: 10000, dailyActiveMinutes: 30, sleep: 8 };

  const summary = summarizeHealthAndRecovery(mockHistory, mockUserProfile, null, null, mockReadiness, mockActivityTargets);

  assert.ok(summary.includes('Weight: 70kg'));
  assert.ok(summary.includes('BMI: 22.9'));
  assert.ok(summary.includes('Last night: 7.5h (Deep: 1.5h, REM: 1.8h)'));
  assert.ok(summary.includes('Readiness: 88/100 (optimal - Kondisi prima)'));
  assert.ok(summary.includes('RHR: 58 bpm'));
  assert.ok(summary.includes('Eaten: 2100 kcal (P: 140g, C: 220g, F: 65g)'));
  assert.ok(summary.includes('Burned: ~2150 kcal'));
  assert.ok(summary.includes('Water: 2500ml'));
  assert.ok(summary.includes('Steps: 8500 / 10000'));
  assert.ok(summary.includes('Active: 45 / 30 min'));
  assert.ok(summary.includes('BP: 120/80'));
});

test('summarizeHealthAndRecovery handles empty or null data safely', () => {
  const summaryEmpty = summarizeHealthAndRecovery({}, null);
  assert.equal(typeof summaryEmpty, 'string');

  const summaryProfileOnly = summarizeHealthAndRecovery({}, { weight: 65, height: 170 });
  assert.ok(summaryProfileOnly.includes('Weight: 65kg'));
});

test('pickRelevantExercises finds Ab Crunch and variations in exercise catalog', () => {
  const mockDb = [
    { name: 'Ab Crunch Machine', target: ['Core'], equipment: 'Machine' },
    { name: 'Cable Crunch', target: ['Core'], equipment: 'Cable' },
    { name: 'Crunches', target: ['Core'], equipment: 'Body Weight' },
    { name: 'Dumbbell Bench Press', target: ['Dada Tengah'], equipment: 'Dumbbell' },
    { name: 'Barbell Squat', target: ['Quads'], equipment: 'Barbell' },
    { name: 'Lat Pulldown', target: ['Lats'], equipment: 'Cable' }
  ];

  // Search "Ab Crunch"
  const abCrunchResults = pickRelevantExercises('Ab Crunch ada atau ga di database', mockDb);
  assert.ok(abCrunchResults.length > 0);
  assert.equal(abCrunchResults[0].name, 'Ab Crunch Machine');

  // Search "latihan dada dumbbell"
  const chestDbResults = pickRelevantExercises('latihan dada dumbbell apa yang bagus?', mockDb);
  assert.ok(chestDbResults.length > 0);
  assert.equal(chestDbResults[0].name, 'Dumbbell Bench Press');

  // Search "squat"
  const squatResults = pickRelevantExercises('cara squat yang benar', mockDb);
  assert.ok(squatResults.length > 0);
  assert.equal(squatResults[0].name, 'Barbell Squat');

  // Unrelated question
  const unrelatedResults = pickRelevantExercises('selamat pagi coach apa kabar', mockDb);
  assert.equal(unrelatedResults.length, 0);
});

test('buildSystemPrompt includes health and exercise database guidance', () => {
  const prompt = buildSystemPrompt(
    { goal: 'Fat Loss', experience: 'Intermediate' },
    'Bench Press (Dada Tengah, Barbell)',
    'Recent sessions: 2026-08-20',
    '[Daily Health Context] Sleep: 7.5h | Eaten: 2000kcal',
    'Plan "Push Pull Legs"',
    'santai',
    '',
    [],
    '',
    '',
    'Ab Crunch Machine (Core, Machine)'
  );

  assert.ok(prompt.includes('Coach Logy'));
  assert.ok(prompt.includes('[Daily Health Context]'));
  assert.ok(prompt.includes('Ab Crunch Machine'));
  assert.ok(prompt.includes('Exercise Database Guidance'));
});
