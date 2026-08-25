import assert from 'node:assert/strict';
import { defaultMasterExercises, findMatchingMasterExercise, canonicalizeExercise } from '../data/constants.js';

console.log('Testing exercise matching and entity merging...');

// Canonicalize tests
assert.equal(canonicalizeExercise({ name: 'Lat Pulldown' }).name, 'Wide-Grip Lat Pulldown');
assert.equal(canonicalizeExercise({ name: 'Cross Cable Rear Delt' }).name, 'Cable Rear Delt Fly');
assert.equal(canonicalizeExercise({ name: 'Dumbbell Biceps Curl' }).name, 'Dumbbell Alternate Bicep Curl');
assert.equal(canonicalizeExercise({ name: 'Biceps Curl' }).name, 'Dumbbell Alternate Bicep Curl');
assert.equal(canonicalizeExercise({ name: 'Rumanian Deadlift' }).name, 'Romanian Deadlift');
assert.equal(canonicalizeExercise({ name: 'Flat Dumbbell Bench Press' }).name, 'Dumbbell Bench Press');
assert.equal(canonicalizeExercise({ name: 'Cable Lateral Raises' }).name, 'Cable Seated Lateral Raise');
assert.equal(canonicalizeExercise({ name: 'Cable Hip Abduction' }).name, 'Cable Hip Abduction');
assert.equal(canonicalizeExercise({ name: 'Standing Cable Hip Abduction' }).name, 'Cable Hip Abduction');
assert.equal(canonicalizeExercise({ name: 'Cable Pull Through' }).name, 'Pull Through');
assert.equal(canonicalizeExercise({ name: 'Cable Triceps Pushdown' }).name, 'Triceps Pushdown');

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
assert.equal(matchPullThrough.id, 140);

// 3. Cable Hip Abduction (ID 121)
const matchAbduction = findMatchingMasterExercise({ name: 'Cable Hip Abduction' }, defaultMasterExercises);
assert.ok(matchAbduction, 'Cable Hip Abduction harus menemukan master ID 121');
assert.equal(matchAbduction.id, 121);
assert.equal(matchAbduction.name, 'Cable Hip Abduction');
assert.ok(matchAbduction.ytVideo.includes('sFQtAuiVwyo'));

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

// 7. Dumbbell Biceps Curl / Biceps Curl -> Dumbbell Alternate Bicep Curl
const matchBicep = findMatchingMasterExercise({ name: 'Dumbbell Biceps Curl' }, defaultMasterExercises);
assert.ok(matchBicep, 'Dumbbell Biceps Curl harus menemukan Dumbbell Alternate Bicep Curl');
assert.equal(matchBicep.name, 'Dumbbell Alternate Bicep Curl');
assert.ok(matchBicep.thumbnailUrl.includes('Dumbbell_Alternate_Bicep_Curl.webp'));
assert.ok(matchBicep.videoUrl.includes('Dumbbell_Alternate_Bicep_Curl.mp4'));

// 8. Cross Cable Rear Delt -> Cable Rear Delt Fly
const matchRearDelt = findMatchingMasterExercise({ name: 'Cross Cable Rear Delt' }, defaultMasterExercises);
assert.ok(matchRearDelt, 'Cross Cable Rear Delt harus menemukan Cable Rear Delt Fly');
assert.equal(matchRearDelt.name, 'Cable Rear Delt Fly');
assert.ok(matchRearDelt.thumbnailUrl.includes('Cable_Rear_Delt_Fly.webp'));
assert.ok(matchRearDelt.videoUrl.includes('Cable_Rear_Delt_Fly_1.mp4'));

console.log('exerciseMatching OK');
