import assert from 'node:assert/strict';
import { defaultMasterExercises, resolveExerciseDbId } from '../data/constants.js';

console.log('Testing Media Parsing SSOT Engine...');

// Logic matching ExerciseDetailModal & ImmersiveWorkout parseMedia
function parseMedia(exercise) {
  if (!exercise) return [];
  let items = [];

  // 1. Video AI / HTML5 Video (MP4 / WebM)
  if (exercise.videoUrl) {
    const urls = exercise.videoUrl.split(/(?:,|\s)+/).filter(v => v.trim());
    urls.forEach(u => {
      if (u.match(/\.(mp4|webm)$/i)) {
        if (!items.some(it => it.url === u)) items.push({ type: 'video', url: u });
      }
    });
  }

  if (exercise.gifUrl && exercise.gifUrl.match(/\.(mp4|webm)$/i)) {
    if (!items.some(it => it.url === exercise.gifUrl)) {
      items.push({ type: 'video', url: exercise.gifUrl });
    }
  }

  // 2. ExerciseDB Animated GIF / Motion Loop (selalu ditaruh di akhir jika ada video)
  const exId = exercise.exerciseId || resolveExerciseDbId(exercise) || (exercise.id && String(exercise.id).startsWith('edb-') ? String(exercise.id).replace(/^edb-/, '') : null);
  const rawGif = exercise.gifUrl || '';
  let loopExId = exId ? String(exId).replace(/^edb-/, '').trim() : null;
  let loopGif = null;

  if (rawGif.endsWith('.gif')) {
    if (!items.some(it => it.url === rawGif)) {
      items.push({ type: 'image', url: rawGif });
    }
  } else {
    if (rawGif.includes('/0.jpg') || rawGif.includes('/1.jpg')) {
      loopGif = rawGif;
      const match = rawGif.match(/exercises\/([^/]+)\/[01]\.jpg/);
      if (match) loopExId = match[1];
    } else if (loopExId && !loopExId.match(/^\d+$/)) {
      loopGif = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${loopExId}/0.jpg`;
    }

    if (loopExId || loopGif) {
      if (!items.some(it => it.type === 'motion-loop')) {
        items.push({ type: 'motion-loop', exerciseId: loopExId, gifUrl: loopGif, url: loopGif });
      }
    }
  }

  // 3. Fallback: Thumbnail diam HANYA jika tidak ada video maupun motion loop
  if (items.length === 0) {
    const fallbackImg = exercise.thumbnailUrl || exercise.gifUrl;
    if (fallbackImg && !fallbackImg.match(/\.(mp4|webm)$/i)) {
      items.push({ type: 'image', url: fallbackImg });
    }
  }

  return items;
}

// Test 1: Side Lateral Raise (ID 143)
const ex143 = defaultMasterExercises.find(e => e.id === 143);
assert.ok(ex143, 'Side Lateral Raise must exist');
const media143 = parseMedia(ex143);
assert.equal(media143.length, 1, 'Side Lateral Raise must have EXACTLY 1 media item (no redundant static slide)');
assert.equal(media143[0].type, 'motion-loop', 'Side Lateral Raise media must be motion-loop');
assert.equal(media143[0].exerciseId, 'Side_Lateral_Raise');

// Test 2: Cable Seated Lateral Raise (ID 144)
const ex144 = defaultMasterExercises.find(e => e.id === 144);
assert.ok(ex144, 'Cable Seated Lateral Raise must exist');
const media144 = parseMedia(ex144);
assert.equal(media144.length, 1, 'Cable Seated Lateral Raise must have EXACTLY 1 media item (no redundant static slide)');
assert.equal(media144[0].type, 'motion-loop', 'Cable Seated Lateral Raise media must be motion-loop');
assert.equal(media144[0].exerciseId, 'Cable_Seated_Lateral_Raise');

// Test 3: Barbell Incline Bench Press (ID 142)
const ex142 = defaultMasterExercises.find(e => e.id === 142);
const media142 = parseMedia(ex142);
assert.equal(media142.length, 1, 'Barbell Incline Bench Press must have EXACTLY 1 media item');
assert.equal(media142[0].type, 'motion-loop');

// Test 4: Standing Cable Lateral Raise (ID 104) - Has custom video + motion loop backup
const ex104 = defaultMasterExercises.find(e => e.id === 104);
const media104 = parseMedia(ex104);
assert.equal(media104.length, 2, 'Standing Cable Lateral Raise must have 2 items (video first, motion loop second)');
assert.equal(media104[0].type, 'video');
assert.equal(media104[1].type, 'motion-loop');

// Test 5: All 44 master exercises audit - None without video should have multiple items
defaultMasterExercises.forEach(ex => {
  const items = parseMedia(ex);
  if (!ex.videoUrl) {
    if (items.length > 1) {
      assert.fail(`Exercise without video has multiple slides: ${ex.name}`);
    }
    if (ex.exerciseId) {
      assert.equal(items[0]?.type, 'motion-loop', `${ex.name} must render motion-loop directly`);
    }
  }
});

// Test 6: Invariant verification that videos are never cropped (object-contain, no object-cover or scale-zoom)
import fs from 'node:fs';
import path from 'node:path';

const detailModalCode = fs.readFileSync(path.resolve('src/components/ExerciseDetailModal.jsx'), 'utf8');
assert.ok(detailModalCode.includes('exercise-video-html5 relative z-10 w-full h-full object-contain'), 'ExerciseDetailModal video must use object-contain and not be cropped');
assert.ok(!detailModalCode.includes('exercise-video-html5 w-full h-full object-cover'), 'ExerciseDetailModal video must not have object-cover');

const immersiveCode = fs.readFileSync(path.resolve('src/components/ImmersiveWorkout.jsx'), 'utf8');
assert.ok(immersiveCode.includes('immersive-video-html5 relative z-10 w-full h-full object-contain'), 'ImmersiveWorkout video must use object-contain and not be cropped');
assert.ok(!immersiveCode.includes('immersive-video-html5 w-full h-full object-cover'), 'ImmersiveWorkout video must not have object-cover');
assert.ok(!immersiveCode.includes('immersive-video-html5') || !immersiveCode.match(/immersive-video-html5[^>]*scale-\[1\.10\]/), 'ImmersiveWorkout video must not be zoomed via scale-[1.10]');

console.log('✅ All Media Parsing & Video Invariant tests PASSED successfully!');
