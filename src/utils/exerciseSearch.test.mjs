import assert from 'node:assert/strict';
import {
  normalizeSearchString,
  collapseSearchString,
  computeOwnExerciseUsage,
  prepareSearchableExercise,
  scoreExerciseMatch,
  exerciseSlug
} from './exerciseSearch.js';

// 1. String normalizers & collapsers
assert.equal(normalizeSearchString('Triceps Push-down / Cable'), 'triceps push down cable');
assert.equal(collapseSearchString('Triceps Push-down / Cable'), 'tricepspushdowncable');
assert.equal(collapseSearchString('   Push   Down   '), 'pushdown');

// 2. Pre-index searchable exercise
const rawEx = {
  id: 101,
  name: 'Triceps Pushdown',
  target: ['Triceps'],
  aliases: ['Cable Triceps Pushdown'],
  equipment: 'cable'
};
const indexedEx = prepareSearchableExercise(rawEx);
assert.equal(indexedEx._nameNorm, 'triceps pushdown');
assert.equal(indexedEx._nameColl, 'tricepspushdown');
assert.ok(indexedEx._allText.includes('triceps'));
assert.ok(indexedEx._allColl.includes('cabletricepspushdown'));
assert.equal(indexedEx._slug, exerciseSlug('Triceps Pushdown'));

// 3. computeOwnExerciseUsage from history
const mockHistory = {
  '2026-08-01': {
    workouts: [
      {
        id: 'w1',
        status: 'completed',
        exercises: [{ id: 'ex-101', name: 'Triceps Pushdown' }],
        log: {
          'ex-101-w1': [
            { w: 30, r: 10, done: true },
            { w: 35, r: 10, done: false } // undone
          ],
          'ex-999-w1': [
            { w: 50, r: 10, skipped: true } // skipped
          ]
        }
      }
    ]
  },
  '2026-08-05': {
    workouts: [
      {
        id: 'w2',
        status: 'completed',
        overriddenExercises: [{ id: 'ex-101', name: 'Triceps Pushdown' }],
        log: {
          'ex-101-w2': [
            { w: 40, r: 10, done: true }
          ]
        }
      }
    ]
  }
};

const usage = computeOwnExerciseUsage(mockHistory);
const pushdownSlug = exerciseSlug('Triceps Pushdown');
assert.ok(usage[pushdownSlug] >= 2, `usage[${pushdownSlug}] should be at least 2`);
assert.ok(usage['ex-101'] >= 2, 'usage[ex-101] should be at least 2');
assert.equal(usage['ex-999'], undefined, 'Skipped sets should not count towards usage');

// 4. scoreExerciseMatch
const exPushdown = prepareSearchableExercise({
  id: 101,
  name: 'Triceps Pushdown',
  target: ['Triceps'],
  aliases: ['Cable Triceps Pushdown', 'Tricep Pushdown'],
  equipment: 'cable'
});

const exOverhead = prepareSearchableExercise({
  id: 102,
  name: 'Cable Overhead Triceps Extension',
  target: ['Triceps'],
  aliases: ['Overhead Cable Triceps Extension'],
  equipment: 'cable'
});

const exBench = prepareSearchableExercise({
  id: 103,
  name: 'Bench Press',
  target: ['Chest', 'Triceps'],
  aliases: ['Flat Barbell Bench Press'],
  equipment: 'barbell'
});

// A. Space vs collapsed: "triceps push down" (with space) MUST match "Triceps Pushdown"
const scoreSpaced = scoreExerciseMatch(exPushdown, 'triceps push down');
assert.ok(scoreSpaced > 0, '"triceps push down" must match "Triceps Pushdown"');

// B. "push down" MUST match "Triceps Pushdown"
const scorePushdown = scoreExerciseMatch(exPushdown, 'push down');
assert.ok(scorePushdown > 0, '"push down" must match "Triceps Pushdown"');

// C. Indonesian synonym "trisep" MUST match "Triceps Pushdown"
const scoreTrisep = scoreExerciseMatch(exPushdown, 'trisep');
assert.ok(scoreTrisep > 0, '"trisep" must match "Triceps Pushdown"');

// D. Frequently trained exercise ranking priority
// If user has done Triceps Pushdown 25 times and Overhead Extension 0 times:
const usagePushdown = 25;
const usageOverhead = 0;
const sPush = scoreExerciseMatch(exPushdown, 'triceps', usagePushdown);
const sOver = scoreExerciseMatch(exOverhead, 'triceps', usageOverhead);
assert.ok(sPush > sOver, 'Frequently trained Triceps Pushdown must rank higher than Cable Overhead Triceps Extension');

// E. "cable tricep" matches both, but Pushdown with usage wins
const sCableTricepPush = scoreExerciseMatch(exPushdown, 'cable tricep', usagePushdown);
const sCableTricepOver = scoreExerciseMatch(exOverhead, 'cable tricep', usageOverhead);
assert.ok(sCableTricepPush > 0);
assert.ok(sCableTricepOver > 0);
assert.ok(sCableTricepPush > sCableTricepOver, 'Triceps Pushdown with usage must beat Overhead on "cable tricep"');

// F. Unrelated query returns -1
const sUnrelated = scoreExerciseMatch(exPushdown, 'squat');
assert.equal(sUnrelated, -1, '"squat" should return -1 for Triceps Pushdown');

// G. Indonesian search queries
const exTreadmill = prepareSearchableExercise({
  id: 126,
  name: 'Running, Treadmill',
  target: ['Cardio', 'Quads', 'Calves'],
  aliases: ['Treadmill', 'Treadmill Running'],
  equipment: 'machine'
});
const exBicycling = prepareSearchableExercise({
  id: 139,
  name: 'Bicycling',
  target: ['Cardio', 'Quads'],
  aliases: ['Cycling', 'Sepeda'],
  equipment: 'bicycle'
});
const exStationary = prepareSearchableExercise({
  id: 127,
  name: 'Bicycling, Stationary',
  target: ['Cardio', 'Quads'],
  aliases: ['Stationary Bike', 'Sepeda Statis'],
  equipment: 'machine'
});
const exSwimming = prepareSearchableExercise({
  id: 136,
  name: 'Swimming (Renang)',
  target: ['Cardio', 'Core', 'Lats'],
  aliases: ['Renang', 'Swimming'],
  equipment: 'pool'
});

// "lari" matches Running, Treadmill
const sLari = scoreExerciseMatch(exTreadmill, 'lari');
assert.ok(sLari > 0, '"lari" must match "Running, Treadmill"');

// "sepeda" matches Bicycling & Bicycling, Stationary
const sSepeda = scoreExerciseMatch(exBicycling, 'sepeda');
const sSepedaStat = scoreExerciseMatch(exStationary, 'sepeda');
assert.ok(sSepeda > 0, '"sepeda" must match "Bicycling"');
assert.ok(sSepedaStat > 0, '"sepeda" must match "Bicycling, Stationary"');

// "gowes" matches Bicycling
const sGowes = scoreExerciseMatch(exBicycling, 'gowes');
assert.ok(sGowes > 0, '"gowes" must match "Bicycling"');

// "renang" matches Swimming
const sRenang = scoreExerciseMatch(exSwimming, 'renang');
assert.ok(sRenang > 0, '"renang" must match "Swimming (Renang)"');

// Prefix "lar" matches Running, Treadmill
const sPrefixLari = scoreExerciseMatch(exTreadmill, 'lar');
assert.ok(sPrefixLari > 0, 'Prefix "lar" must match "Running, Treadmill"');

// Prefix "seped" matches Bicycling
const sPrefixSeped = scoreExerciseMatch(exBicycling, 'seped');
assert.ok(sPrefixSeped > 0, 'Prefix "seped" must match "Bicycling"');

console.log('exerciseSearch OK', {
  scoreSpaced,
  scorePushdown,
  scoreTrisep,
  sPush,
  sOver
});
