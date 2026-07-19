/**
 * patch-workout.mjs
 * Pindahkan durasi dari sesi adhoc ekstra ke sesi Upper Body Focus
 * Tanggal: 2026-07-19, User: andriantriwibawanto@gmail.com
 * 
 * Syarat: ada file serviceAccount.json di folder ini
 * (download dari Firebase Console → Project Settings → Service Accounts → Generate new private key)
 */

import { readFileSync } from 'fs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = JSON.parse(readFileSync('./serviceAccount.json', 'utf8'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'logym-id',
  });
}

const db   = getFirestore();
const auth = getAuth();

async function main() {
  const userRecord = await auth.getUserByEmail('andriantriwibawanto@gmail.com');
  const uid = userRecord.uid;
  console.log('UID ditemukan:', uid);

  const DATE = '2026-07-19';
  const YEAR = '2026';

  const yearRef = db.doc(`users/${uid}/history_years/${YEAR}`);
  const snap    = await yearRef.get();

  if (!snap.exists) { console.error('history_years/2026 tidak ditemukan!'); return; }

  const yearData = snap.data();
  const dayData  = yearData[DATE];
  if (!dayData) { console.error(`Tanggal ${DATE} tidak ada.`); return; }

  const workouts = [...(dayData.workouts || [])];
  console.log('\n📋 Workouts sekarang:');
  workouts.forEach((w, i) =>
    console.log(`  [${i}] programId=${w.programId} | name=${w.programName || w.id} | status=${w.status} | duration=${w.duration || '-'}`)
  );

  // Cari adhoc dengan durasi
  const adhocIdx = workouts.findIndex(w =>
    (w.programId === 'adhoc') && w.duration && w.duration !== '00:00' && w.duration !== '0'
  );
  if (adhocIdx === -1) { console.error('\n❌ Adhoc dengan durasi tidak ditemukan.'); return; }

  const adhocW       = workouts[adhocIdx];
  const moveDuration = adhocW.duration;
  const moveLogs     = adhocW.log || {};
  const moveSkipped  = adhocW.skipped || {};
  console.log(`\n▶ Mengambil dari adhoc[${adhocIdx}]: duration=${moveDuration}, ${Object.keys(moveLogs).length} exercise logs`);

  // Cari Upper Body Focus: non-adhoc, 0 menit atau belum ada durasi
  const targetIdx = workouts.findIndex((w, i) =>
    i !== adhocIdx &&
    w.programId !== 'adhoc' &&
    (!w.duration || w.duration === '00:00' || w.duration === '0')
  );

  if (targetIdx === -1) { console.error('\n❌ Sesi target 0-menit tidak ditemukan.'); return; }

  const targetW = workouts[targetIdx];
  console.log(`▶ Target[${targetIdx}]: programId=${targetW.programId} | name=${targetW.programName}`);

  // Patch
  const patched = workouts.map((w, i) => {
    if (i === targetIdx) {
      return {
        ...w,
        status: 'completed',
        duration: moveDuration,
        log: { ...(w.log || {}), ...moveLogs },
        skipped: { ...(w.skipped || {}), ...moveSkipped },
      };
    }
    if (i === adhocIdx) {
      const { duration, log, skipped, ...rest } = w;
      return { ...rest, duration: '00:00', log: {}, skipped: {} };
    }
    return w;
  });

  console.log('\n✅ Preview setelah patch:');
  patched.forEach((w, i) =>
    console.log(`  [${i}] programId=${w.programId} | name=${w.programName || w.id} | status=${w.status} | duration=${w.duration || '-'}`)
  );

  await yearRef.set({ [DATE]: { ...dayData, workouts: patched } }, { merge: true });
  console.log('\n🎉 Patch berhasil disimpan ke Firestore!');
}

main().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1); });
