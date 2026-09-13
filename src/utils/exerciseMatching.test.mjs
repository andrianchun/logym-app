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
assert.equal(canonicalizeExercise({ name: 'Cable Lateral Raises' }).name, 'Standing Cable Lateral Raise');
assert.equal(canonicalizeExercise({ name: 'Standing Cable Lateral Raise' }).name, 'Standing Cable Lateral Raise');
assert.equal(canonicalizeExercise({ name: 'Cable Seated Lateral Raise' }).name, 'Cable Seated Lateral Raise');
assert.equal(canonicalizeExercise({ name: 'Seated Side Lateral Raise' }).name, 'Seated Side Lateral Raise');
assert.equal(canonicalizeExercise({ name: 'Side Lateral Raise' }).name, 'Side Lateral Raise');
assert.equal(canonicalizeExercise({ name: 'Dumbbell Lateral Raise' }).name, 'Side Lateral Raise');
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
assert.ok(matchPullThrough.videoUrl.includes('edb-Pull_Through.mp4'), 'Pull Through harus memiliki videoUrl edb-Pull_Through.mp4');
assert.ok(matchPullThrough.ytVideo.includes('sFQtAuiVwyo'), 'Pull Through harus memiliki ytVideo sFQtAuiVwyo');

// 3. Cable Hip Abduction (ID 121) TIDAK boleh menggunakan video Pull Through
const matchAbduction = findMatchingMasterExercise({ name: 'Cable Hip Abduction' }, defaultMasterExercises);
assert.ok(matchAbduction, 'Cable Hip Abduction harus menemukan master ID 121');
assert.equal(matchAbduction.id, 121);
assert.equal(matchAbduction.name, 'Cable Hip Abduction');
assert.equal(matchAbduction.videoUrl, '', 'Cable Hip Abduction tidak boleh memakai videoUrl Pull Through');
assert.equal(matchAbduction.ytVideo, '', 'Cable Hip Abduction tidak boleh memakai ytVideo Pull Through');

// 3. Flat Dumbbell Bench Press -> Dumbbell Bench Press
const matchBench = findMatchingMasterExercise({ name: 'Flat Dumbbell Bench Press' }, defaultMasterExercises);
assert.ok(matchBench, 'Flat Dumbbell Bench Press harus menemukan Dumbbell Bench Press');
assert.equal(matchBench.name, 'Dumbbell Bench Press');
assert.ok(matchBench.thumbnailUrl.includes('Dumbbell_Bench_Press.webp'));

// 4. Cable Lateral Raises -> Standing Cable Lateral Raise (ID 104)
const matchLatRaise = findMatchingMasterExercise({ name: 'Cable Lateral Raises' }, defaultMasterExercises);
assert.ok(matchLatRaise, 'Cable Lateral Raises harus menemukan Standing Cable Lateral Raise');
assert.equal(matchLatRaise.name, 'Standing Cable Lateral Raise');
assert.equal(matchLatRaise.id, 104);

// 4b. Side Lateral Raise (Dumbbell) -> Side Lateral Raise (ID 143)
const matchSideLat = findMatchingMasterExercise({ name: 'Side Lateral Raise', equipment: 'Dumbbell' }, defaultMasterExercises);
assert.ok(matchSideLat, 'Side Lateral Raise harus menemukan ID 143');
assert.equal(matchSideLat.name, 'Side Lateral Raise');
assert.equal(matchSideLat.id, 143);

// 4c. Seated Side Lateral Raise (Dumbbell) TIDAK boleh mencocokkan Standing Cable Lateral Raise (ID 104)
const matchSeatedDumbbell = findMatchingMasterExercise({ name: 'Seated Side Lateral Raise', equipment: 'Dumbbell' }, defaultMasterExercises);
assert.notEqual(matchSeatedDumbbell?.id, 104, 'Seated Dumbbell Lateral Raise tidak boleh mencocokkan ID 104 Cable');

// 4d. Cable Seated Lateral Raise TIDAK boleh mencocokkan Standing Cable Lateral Raise (ID 104)
const matchCableSeated = findMatchingMasterExercise({ name: 'Cable Seated Lateral Raise', equipment: 'Cable' }, defaultMasterExercises);
assert.notEqual(matchCableSeated?.id, 104, 'Cable Seated Lateral Raise tidak boleh mencocokkan Standing Cable ID 104');

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

// 9. Romanian Deadlift from Deficit TIDAK boleh tertukar dengan Romanian Deadlift biasa
const matchDeficit = findMatchingMasterExercise({ name: 'Romanian Deadlift from Deficit' }, defaultMasterExercises);
assert.equal(matchDeficit, null, 'Romanian Deadlift from Deficit tidak boleh tertukar dengan RDL biasa di master');
assert.equal(canonicalizeExercise({ name: 'Romanian Deadlift from Deficit' }).name, 'Romanian Deadlift from Deficit');

// 10. Treadmill & Trail Running
assert.equal(canonicalizeExercise({ name: 'Treadmill Running' }).name, 'Treadmill');
assert.equal(canonicalizeExercise({ name: 'Trail Running' }).name, 'Trail Running');
const matchTreadmill = findMatchingMasterExercise({ name: 'Treadmill Running' }, defaultMasterExercises);
assert.equal(matchTreadmill.name, 'Treadmill');
assert.equal(matchTreadmill.id, 126);

const matchTrail = findMatchingMasterExercise({ name: 'Trail Running' }, defaultMasterExercises);
assert.equal(matchTrail.name, 'Trail Running');
assert.equal(matchTrail.id, 141);

// 11. Proteksi Alat & Variasi: Cable Bicep Curl TIDAK boleh tertukar ke Dumbbell Bicep Curl (harus Standing Biceps Cable Curl ID 118)
assert.equal(canonicalizeExercise({ name: 'Cable Bicep Curl' }).name, 'Standing Biceps Cable Curl');
assert.equal(findMatchingMasterExercise({ name: 'Cable Bicep Curl' }, defaultMasterExercises)?.id, 118);

// 12. Proteksi Triceps: Cable Rope Overhead Triceps Extension (ID 117) TIDAK boleh tertukar ke Triceps Pushdown (ID 105)
const matchOverhead = findMatchingMasterExercise({ name: 'Cable Rope Overhead Triceps Extension' }, defaultMasterExercises);
assert.equal(matchOverhead.id, 117);
assert.equal(matchOverhead.name, 'Cable Rope Overhead Triceps Extension');

// 13. Dumbbell Lateral Raise TIDAK boleh tertukar ke Standing Cable Lateral Raise (harus Side Lateral Raise)
assert.equal(canonicalizeExercise({ name: 'Dumbbell Lateral Raise' }).name, 'Side Lateral Raise');

// 14. Smith Machine Romanian Deadlift (ID 120) nama lengkap resmi & merger Stiff Leg RDL
assert.equal(canonicalizeExercise({ name: 'SM Romanian Deadlift (RDL)' }).name, 'Smith Machine Romanian Deadlift');
assert.equal(canonicalizeExercise({ name: 'Smith Machine Romanian Deadlift' }).name, 'Smith Machine Romanian Deadlift');
assert.equal(canonicalizeExercise({ name: 'Smith Machine Stiff Leg RDL' }).name, 'Smith Machine Romanian Deadlift');
assert.equal(canonicalizeExercise({ name: 'Smith Machine Stiff-Legged Deadlift' }).name, 'Smith Machine Romanian Deadlift');
assert.equal(canonicalizeExercise({ name: 'SM Stiff Leg Deadlift' }).name, 'Smith Machine Romanian Deadlift');
const matchSmRdl = findMatchingMasterExercise({ name: 'SM Romanian Deadlift (RDL)' }, defaultMasterExercises);
assert.equal(matchSmRdl.id, 120);
assert.equal(matchSmRdl.name, 'Smith Machine Romanian Deadlift');

const matchSmStiff = findMatchingMasterExercise({ name: 'Smith Machine Stiff Leg RDL' }, defaultMasterExercises);
assert.equal(matchSmStiff.id, 120);
assert.equal(matchSmStiff.name, 'Smith Machine Romanian Deadlift');

// 15. Barbell Incline Bench Press vs Barbell Bench Press
const matchBarbellIncline = findMatchingMasterExercise({ name: 'Barbell Incline Bench Press' }, defaultMasterExercises);
assert.ok(matchBarbellIncline, 'Harus menemukan Barbell Incline Bench Press ID 142');
assert.equal(matchBarbellIncline.id, 142);
assert.notEqual(matchBarbellIncline.id, 135, 'Barbell Incline TIDAK boleh tertukar dengan Flat Barbell Bench Press (ID 135)');

// 16. Dumbbell Walking Lunges (ID 110)
const matchDumbbellLunge = findMatchingMasterExercise({ name: 'Dumbbell Walking Lunges' }, defaultMasterExercises);
assert.ok(matchDumbbellLunge, 'Harus menemukan ID 110');
assert.equal(matchDumbbellLunge.id, 110);
assert.equal(matchDumbbellLunge.name, 'Dumbbell Walking Lunges');
assert.equal(matchDumbbellLunge.equipment, 'Dumbbell');
assert.equal(matchDumbbellLunge.videoUrl, '');
assert.ok(matchDumbbellLunge.thumbnailUrl.includes('Dumbbell_Lunges'));

assert.equal(canonicalizeExercise({ name: 'Dumbbell Walking Lunges' }).name, 'Dumbbell Walking Lunges');
assert.equal(canonicalizeExercise({ name: 'Walking Lunges' }).name, 'Dumbbell Walking Lunges');

// 17. Standing Cable Lateral Raise (ID 104)
const matchStandingCable = findMatchingMasterExercise({ name: 'Standing Cable Lateral Raise' }, defaultMasterExercises);
assert.ok(matchStandingCable, 'Harus menemukan ID 104');
assert.equal(matchStandingCable.id, 104);
assert.equal(matchStandingCable.videoUrl, '/exercise-assets/youtube-backup/edb-Standing_Cable_Lateral_Raise.mp4');

// 18. Legacy 11 names in defaultMasterExercises
const legacyTestCases = [
  ['Incline Smith Machine Press', 101],
  ['Cable Seated Row', 102],
  ['Standing Calf Raise', 111],
  ['SM Flat Bench Press', 115],
  ['Overhead Cable Triceps Extension', 117],
  ['Biceps Cable Curl', 118],
  ['DB Bulgarian Split Squat', 119],
  ['Seated Dumbbell Calf Raise', 122],
  ['Dumbbell Wrist Curl', 125],
  ['Dumbbell Goblet Squat', 134],
  ['Dumbbell Walking Lunges', 110],
];

for (const [legacyName, expectedId] of legacyTestCases) {
  const match = findMatchingMasterExercise({ name: legacyName }, defaultMasterExercises);
  assert.ok(match, `Legacy exercise "${legacyName}" harus cocok`);
  assert.equal(match.id, expectedId, `Legacy exercise "${legacyName}" harus cocok dengan ID ${expectedId}`);
}

// 19. Integritas Instruksi defaultMasterExercises (Semua 43 item wajib memiliki instruksi ID & EN yang valid)
assert.equal(defaultMasterExercises.length, 43, 'Harus ada tepat 43 master exercises');
for (const ex of defaultMasterExercises) {
  assert.ok(Array.isArray(ex.instructions_id) && ex.instructions_id.length > 0, `Master exercise "${ex.name}" (ID ${ex.id}) wajib memiliki instructions_id`);
  assert.ok(Array.isArray(ex.instructions_en) && ex.instructions_en.length > 0, `Master exercise "${ex.name}" (ID ${ex.id}) wajib memiliki instructions_en`);
  assert.ok(Array.isArray(ex.instructions) && ex.instructions.length > 0, `Master exercise "${ex.name}" (ID ${ex.id}) wajib memiliki instructions`);
  assert.ok(ex.id && ex.name && ex.target && ex.equipment, `Master exercise "${ex.name}" wajib memiliki field inti`);
}

// 20. Integritas exercisedb.json (887 item wajib memiliki instruksi ID & EN yang valid dan non-placeholder)
import fs from 'node:fs';
const edbRaw = fs.readFileSync(new URL('../../public/exercisedb.json', import.meta.url), 'utf-8');
const edb = JSON.parse(edbRaw);
assert.equal(edb.length, 887, 'exercisedb.json harus berisi 887 item');
for (const ex of edb) {
  assert.ok(Array.isArray(ex.instructions_id) && ex.instructions_id.length > 0, `exercisedb "${ex.name}" (ID ${ex.id}) instructions_id kosong`);
  assert.ok(Array.isArray(ex.instructions_en) && ex.instructions_en.length > 0, `exercisedb "${ex.name}" (ID ${ex.id}) instructions_en kosong`);
  assert.ok(Array.isArray(ex.instructions) && ex.instructions.length > 0, `exercisedb "${ex.name}" (ID ${ex.id}) instructions kosong`);
  // Pastikan tidak ada instruksi dummy tersisa
  const firstIdLine = ex.instructions_id[0] || '';
  assert.notEqual(firstIdLine, 'Lakukan gerakan sesuai panduan dan intensitas yang nyaman.', `exercisedb "${ex.name}" (ID ${ex.id}) masih memakai placeholder`);
}

// 21. Verifikasi spesifik video Cable Hip Abduction vs Pull Through di exercisedb.json
const edbHipAbduction = edb.find(e => e.id === 'Cable_Hip_Abduction' || e.name === 'Cable Hip Abduction');
assert.ok(edbHipAbduction, 'Cable Hip Abduction harus ada di exercisedb.json');
assert.notEqual(edbHipAbduction.videoUrl, '/exercise-assets/youtube-backup/edb-Pull_Through.mp4', 'Cable Hip Abduction tidak boleh memakai video Pull Through');
assert.notEqual(edbHipAbduction.ytVideo, 'https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G', 'Cable Hip Abduction tidak boleh memakai ytVideo Pull Through');

const edbPullThrough = edb.find(e => e.id === 'Pull_Through' || e.name === 'Pull Through');
assert.ok(edbPullThrough, 'Pull Through harus ada di exercisedb.json');
assert.equal(edbPullThrough.videoUrl, '/exercise-assets/youtube-backup/edb-Pull_Through.mp4', 'Pull Through harus memakai video Pull Through');
assert.equal(edbPullThrough.ytVideo, 'https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G', 'Pull Through harus memakai ytVideo Pull Through');

// 22. Verifikasi Canonicalize mempertahankan field instruksi
const canonicalWithInstr = canonicalizeExercise({
  name: 'Cable Bicep Curl',
  instructions_id: ['Instruksi khusus ID'],
  instructions_en: ['Custom instruction EN'],
});
assert.deepEqual(canonicalWithInstr.instructions_id, ['Instruksi khusus ID']);
assert.deepEqual(canonicalWithInstr.instructions_en, ['Custom instruction EN']);

console.log('exerciseMatching OK');
