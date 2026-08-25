import assert from 'node:assert/strict';
import { defaultMasterExercises, findMatchingMasterExercise } from '../data/constants.js';

console.log('Testing exercise matching and entity merging...');

// 1. Lat Pulldown -> Wide-Grip Lat Pulldown
const matchLatPulldown = findMatchingMasterExercise({ name: 'Lat Pulldown' }, defaultMasterExercises);
assert.ok(matchLatPulldown, 'Lat Pulldown harus menemukan master exercise');
assert.equal(matchLatPulldown.name, 'Wide-Grip Lat Pulldown');
assert.ok(matchLatPulldown.videoUrl.includes('Wide-Grip_Lat_Pulldown.mp4'), 'Video harus mengarah ke Wide-Grip Lat Pulldown');
assert.ok(matchLatPulldown.thumbnailUrl.includes('Wide-Grip_Lat_Pulldown.webp'), 'Thumbnail harus mengarah ke Wide-Grip Lat Pulldown webp');

// 2. Cable Pull Through -> Pull Through
const matchPullThrough = findMatchingMasterExercise({ name: 'Cable Pull Through' }, defaultMasterExercises);
assert.ok(matchPullThrough, 'Cable Pull Through harus menemukan master exercise');
assert.equal(matchPullThrough.name, 'Pull Through');
assert.ok(matchPullThrough.videoUrl.includes('Pull_Through.mp4'));

// 3. Flat Dumbbell Bench Press -> Dumbbell Bench Press
const matchBench = findMatchingMasterExercise({ name: 'Flat Dumbbell Bench Press' }, defaultMasterExercises);
assert.ok(matchBench, 'Flat Dumbbell Bench Press harus menemukan Dumbbell Bench Press');
assert.equal(matchBench.name, 'Dumbbell Bench Press');
assert.ok(matchBench.thumbnailUrl.includes('Dumbbell_Bench_Press.webp'));

// 4. Cable Lateral Raises -> Cable Seated Lateral Raise
const matchLatRaise = findMatchingMasterExercise({ name: 'Cable Lateral Raises' }, defaultMasterExercises);
assert.ok(matchLatRaise, 'Cable Lateral Raises harus menemukan Cable Seated Lateral Raise');
assert.equal(matchLatRaise.name, 'Cable Seated Lateral Raise');

// 5. Cable Triceps Pushdown -> Triceps Pushdown
const matchTriceps = findMatchingMasterExercise({ name: 'Cable Triceps Pushdown' }, defaultMasterExercises);
assert.ok(matchTriceps, 'Cable Triceps Pushdown harus menemukan Triceps Pushdown');
assert.equal(matchTriceps.name, 'Triceps Pushdown');
assert.ok(matchTriceps.thumbnailUrl.includes('Triceps_Pushdown.webp'));

// 6. Rumanian Deadlift -> Romanian Deadlift
const matchRumanian = findMatchingMasterExercise({ name: 'Rumanian Deadlift' }, defaultMasterExercises);
assert.ok(matchRumanian, 'Rumanian Deadlift harus menemukan Romanian Deadlift');
assert.equal(matchRumanian.name, 'Romanian Deadlift');
assert.ok(matchRumanian.thumbnailUrl.includes('Romanian_Deadlift.webp'));
assert.ok(matchRumanian.videoUrl.includes('Romanian_Deadlift.mp4'));

console.log('exerciseMatching OK');
