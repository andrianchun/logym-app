import assert from 'node:assert/strict';
import { splitSessionLogs } from './constants.js';

// Simulasi logika penyimpanan multi-extra session seperti di App.jsx
function simulateSaveWorkout({
  history,
  dateStr,
  progId,
  fokusSesi,
  extraExercises,
  exerciseLogs,
  skippedExercises = {},
  durationSecs = 900,
  workoutIdGen
}) {
  const h = JSON.parse(JSON.stringify(history));
  const dayData = h[dateStr] || { workouts: [] };
  let workouts = [...(dayData.workouts || [])];

  const belah = splitSessionLogs(exerciseLogs, {
    progId,
    workoutId: fokusSesi,
    extraExercises,
    sessionExercises: progId === 'extra' ? extraExercises : []
  });
  const belahSkip = splitSessionLogs(skippedExercises, {
    progId,
    workoutId: fokusSesi,
    extraExercises,
    sessionExercises: progId === 'extra' ? extraExercises : []
  });

  const cleanLogs = belah.milikSesi;
  const cleanSkipped = belahSkip.milikSesi;
  const cleanExtra = extraExercises || [];
  const sisaLogs = belah.sisa;
  const sisaSkipped = belahSkip.sisa;

  const formatDur = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (progId === 'extra') {
    const adhocIdx = workouts.findIndex(w => w.programId === 'adhoc' && w.status !== 'completed');
    const targetAdhocIdx = (fokusSesi && fokusSesi !== 'extra') ? workouts.findIndex(w => w.id === fokusSesi) : -1;
    const matchedIdx = adhocIdx >= 0 ? adhocIdx : targetAdhocIdx;

    if (matchedIdx >= 0) {
      const existingW = workouts[matchedIdx];
      workouts[matchedIdx] = {
        ...existingW,
        status: 'completed',
        log: cleanLogs,
        skipped: cleanSkipped,
        exercises: cleanExtra,
        duration: formatDur(durationSecs)
      };
    } else {
      workouts.push({
        id: (fokusSesi && fokusSesi !== 'extra') ? fokusSesi : (workoutIdGen ? workoutIdGen() : `adhoc_${Date.now()}`),
        programId: 'adhoc',
        programName: 'Ekstra',
        status: 'completed',
        log: cleanLogs,
        skipped: cleanSkipped,
        exercises: cleanExtra,
        duration: formatDur(durationSecs)
      });
    }
  }

  h[dateStr] = {
    ...dayData,
    workouts,
    _activeSession: {
      exerciseLogs: sisaLogs,
      skippedExercises: sisaSkipped,
      extraExercises: []
    }
  };

  return h;
}

// 1. Simpan Sesi Ekstra Pertama
const ex1 = [{ id: '101-ts1', name: 'Incline Dumbbell Press', sets: 3 }];
const logs1 = {
  '101-ts1': [
    { done: true, w: 20, r: 10 },
    { done: true, w: 20, r: 10 },
    { done: true, w: 20, r: 10 }
  ]
};

let hist = { '2026-08-26': { workouts: [] } };
hist = simulateSaveWorkout({
  history: hist,
  dateStr: '2026-08-26',
  progId: 'extra',
  fokusSesi: 'extra',
  extraExercises: ex1,
  exerciseLogs: logs1,
  durationSecs: 900,
  workoutIdGen: () => 'adhoc_session_1'
});

assert.equal(hist['2026-08-26'].workouts.length, 1);
assert.equal(hist['2026-08-26'].workouts[0].id, 'adhoc_session_1');
assert.equal(hist['2026-08-26'].workouts[0].exercises[0].name, 'Incline Dumbbell Press');
assert.equal(hist['2026-08-26'].workouts[0].duration, '15:00');

// 2. Simpan Sesi Ekstra Kedua di hari yang sama
const ex2 = [{ id: '202-ts2', name: 'Lateral Raise', sets: 3 }];
const logs2 = {
  '202-ts2': [
    { done: true, w: 10, r: 12 },
    { done: true, w: 10, r: 12 },
    { done: true, w: 10, r: 12 }
  ]
};

hist = simulateSaveWorkout({
  history: hist,
  dateStr: '2026-08-26',
  progId: 'extra',
  fokusSesi: 'extra',
  extraExercises: ex2,
  exerciseLogs: logs2,
  durationSecs: 600,
  workoutIdGen: () => 'adhoc_session_2'
});

// Verifikasi INVARIAN ENTERPRISE: Sesi 1 TIDAK KETIMPA! Keduanya harus ada!
assert.equal(hist['2026-08-26'].workouts.length, 2, 'Harus ada 2 sesi ekstra terpisah di hari yang sama');

const s1 = hist['2026-08-26'].workouts.find(w => w.id === 'adhoc_session_1');
assert.ok(s1, 'Sesi 1 harus tetap ada');
assert.equal(s1.exercises[0].name, 'Incline Dumbbell Press', 'Isi latihan Sesi 1 tidak boleh berubah');
assert.equal(s1.duration, '15:00', 'Durasi Sesi 1 tidak boleh berubah');
assert.ok(s1.log['101-ts1'], 'Log set Sesi 1 harus utuh');

const s2 = hist['2026-08-26'].workouts.find(w => w.id === 'adhoc_session_2');
assert.ok(s2, 'Sesi 2 harus ada');
assert.equal(s2.exercises[0].name, 'Lateral Raise', 'Isi latihan Sesi 2 harus Lateral Raise');
assert.equal(s2.duration, '10:00', 'Durasi Sesi 2 harus 10:00 (bukan warisan 15:00)');
assert.ok(s2.log['202-ts2'], 'Log set Sesi 2 harus utuh');

// 3. Edit Sesi 1 spesifik (fokusSesi = 'adhoc_session_1')
const updatedLogs1 = {
  '101-ts1': [
    { done: true, w: 22.5, r: 10 },
    { done: true, w: 22.5, r: 10 },
    { done: true, w: 22.5, r: 10 }
  ]
};

hist = simulateSaveWorkout({
  history: hist,
  dateStr: '2026-08-26',
  progId: 'extra',
  fokusSesi: 'adhoc_session_1',
  extraExercises: ex1,
  exerciseLogs: updatedLogs1,
  durationSecs: 1000
});

assert.equal(hist['2026-08-26'].workouts.length, 2, 'Jumlah sesi harus tetap 2 setelah edit');
const s1Edited = hist['2026-08-26'].workouts.find(w => w.id === 'adhoc_session_1');
assert.equal(s1Edited.log['101-ts1'][0].w, 22.5, 'Beban Sesi 1 terupdate');
const s2Untouched = hist['2026-08-26'].workouts.find(w => w.id === 'adhoc_session_2');
assert.equal(s2Untouched.exercises[0].name, 'Lateral Raise', 'Sesi 2 tidak terpengaruh oleh edit Sesi 1');

console.log('multiExtraSession OK: Semua skenario isolasi multi-sesi ekstra lolos tanpa cacat!');
