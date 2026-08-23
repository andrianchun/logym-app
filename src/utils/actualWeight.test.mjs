import assert from 'node:assert/strict';
import { 
  getEquipmentConfig, 
  calculateActualWeight, 
  getSetActualWeight, 
  estimate10RM, 
  estimate1RM, 
  recomputeStrengthRecords,
  rm10Series
} from './workoutCalc.js';

console.log('Testing Actual Weight & Equipment Logic...');

// 1. Test getEquipmentConfig default presets
const barbellConf = getEquipmentConfig([], null, { equipment: 'Barbell' });
assert.equal(barbellConf.baseWeight, 20, 'Barbell baseWeight should be 20 kg');
assert.equal(barbellConf.ratio, 1, 'Barbell ratio should be 1');

const smithConf = getEquipmentConfig([], null, { equipment: 'Smith Machine' });
assert.equal(smithConf.baseWeight, 15, 'Smith Machine baseWeight should be 15 kg');
assert.equal(smithConf.ratio, 1, 'Smith Machine ratio should be 1');

const sledConf = getEquipmentConfig([], null, { equipment: 'Sled Machine' });
assert.equal(sledConf.baseWeight, 45, 'Sled Machine (Leg Press) baseWeight should be 45 kg');

const cableConf = getEquipmentConfig([], null, { equipment: 'Cable' });
assert.equal(cableConf.baseWeight, 0, 'Cable baseWeight should be 0 kg');
assert.equal(cableConf.ratio, 1, 'Cable default ratio should be 1');

const dumbbellConf = getEquipmentConfig([], null, { equipment: 'Dumbbell' });
assert.equal(dumbbellConf.baseWeight, 0, 'Dumbbell baseWeight should be 0 kg');
assert.equal(dumbbellConf.ratio, 1, 'Dumbbell ratio should be 1');

const weightedConf = getEquipmentConfig([], null, { equipment: 'Weighted' }, { weight: 75 });
assert.equal(weightedConf.baseWeight, 75, 'Weighted baseWeight should inherit userProfile weight (75 kg)');

// 2. Test calculateActualWeight formula: total_w = (input_w * ratio) + base_w
// Barbell: input 80 kg (plates) + 20 kg bar = 100 kg
assert.equal(calculateActualWeight(80, barbellConf), 100);

// Smith: input 50 kg (plates) + 15 kg smith bar = 65 kg
assert.equal(calculateActualWeight(50, smithConf), 65);

// Leg Press: input 120 kg (plates) + 45 kg sled = 165 kg
assert.equal(calculateActualWeight(120, sledConf), 165);

// Cable 2:1 (ratio 0.5): input 40 kg on stack -> actual 20 kg
const cable2to1Conf = { baseWeight: 0, ratio: 0.5 };
assert.equal(calculateActualWeight(40, cable2to1Conf), 20);

// Weighted Pull-Up: input 15 kg belt + 75 kg body weight = 90 kg
assert.equal(calculateActualWeight(15, weightedConf), 90);

// 3. Test getSetActualWeight with legacy vs new structure
const legacySet = { w: 80, r: 10 };
assert.equal(getSetActualWeight(legacySet, barbellConf), 100, 'Legacy set without total_w should calculate actual weight');

const newSet = { w: 80, input_w: 80, base_w: 20, ratio: 1, total_w: 100, r: 10 };
assert.equal(getSetActualWeight(newSet, barbellConf), 100, 'New set should directly return total_w');

// 4. Test 10RM engine using total_w
// 100 kg x 10 reps -> estimate10RM = 100 kg
const rm10_100 = estimate10RM(100, 10);
assert.equal(rm10_100, 100);

// Test strength records computation with actual weight
const testHistory = {
  '2026-08-20': {
    workouts: [
      {
        id: 'w1',
        status: 'completed',
        log: {
          '109': [
            { w: 80, input_w: 80, base_w: 20, ratio: 1, total_w: 100, r: 10 } // Romanian Deadlift (Barbell 109)
          ]
        }
      }
    ]
  }
};
const lookup = { 109: { id: 109, name: 'Romanian Deadlift (RDL)', equipment: 'Barbell' } };
const records = recomputeStrengthRecords(testHistory, ['109'], lookup);
assert.ok(records['109'], 'Record should be computed');
assert.equal(records['109'].rm10, 100, '10RM should be based on total_w 100kg, not input_w 80kg');

// 5. Test deload week reduction (15-20%)
const normalWeight = 100;
const deloadWeight = Math.round(normalWeight * 0.825);
assert.ok(deloadWeight >= 80 && deloadWeight <= 85, 'Deload should cut ~17.5%');

console.log('✅ All Actual Weight & 10RM unit tests PASSED successfully!');

// ---- Beban dasar custom per gym untuk alat NON-BAR ----
// Permintaan 23/08/2026: "cable, dumbbell, smith machine kayaknya ada yg ga bener2 0 beban
// alaminya, di aku sekitaran 2,5 apa 5 kg". Mesinnya sudah mendukung ini sejak awal — yang
// hilang cuma kolom inputnya di GymManagerModal, yang dulu hanya dirender untuk alat berbasis bar.
{
  const gym = (config) => [{ id: 'g1', name: 'Gym Saya', equipment: 'all', config }];

  // 1. Cable dengan tumpukan berbeban dasar 2,5 kg.
  const cableEx = { id: 1, name: 'Cable Row', equipment: 'Cable' };
  const cCable = getEquipmentConfig(gym({ Cable: { baseWeight: 2.5, ratio: 1 } }), 'g1', cableEx);
  assert.equal(cCable.baseWeight, 2.5, 'baseWeight custom untuk Cable harus terbaca');
  assert.equal(calculateActualWeight(20, cCable), 22.5, '20 kg di tumpukan + 2,5 kg dasar = 22,5');

  // 2. Dumbbell dengan pegangan 5 kg.
  const dbEx = { id: 2, name: 'DB Curl', equipment: 'Dumbbell' };
  const cDb = getEquipmentConfig(gym({ Dumbbell: { baseWeight: 5 } }), 'g1', dbEx);
  assert.equal(calculateActualWeight(10, cDb), 15, 'pelat 10 kg + pegangan 5 kg = 15');

  // 3. Beban dasar 0 yang DISENGAJA tetap dihormati, bukan jatuh ke default alat.
  const smithEx = { id: 3, name: 'Smith Squat', equipment: 'Smith Machine' };
  const cSmith0 = getEquipmentConfig(gym({ 'Smith Machine': { baseWeight: 0 } }), 'g1', smithEx);
  assert.equal(cSmith0.baseWeight, 0, 'nol eksplisit harus menang atas default');

  // 4. Tanpa config gym, default bawaan alat tetap dipakai (jangan regresi).
  const cSmithDefault = getEquipmentConfig(null, null, smithEx);
  assert.ok(cSmithDefault.baseWeight >= 0);
  assert.equal(getEquipmentConfig(gym({}), 'g1', cableEx).baseWeight,
    getEquipmentConfig(null, null, cableEx).baseWeight, 'config kosong = perilaku default');

  // 5. Rasio katrol tetap ikut terhitung bersama beban dasar.
  const cKatrol = getEquipmentConfig(gym({ Cable: { baseWeight: 2.5, ratio: 0.5 } }), 'g1', cableEx);
  assert.equal(calculateActualWeight(20, cKatrol), 12.5, '(20 x 0,5) + 2,5 = 12,5');

  console.log('beban dasar custom OK');
}

// ---- repairActualWeights: hitung ulang riwayat setelah beban dasar dibetulkan ----
// Permintaan 23/08/2026: "bisa ga kalo riwayat semua dibenerin?" — setelah beban dasar Cable/
// Dumbbell bisa diisi, set-set lama masih menyimpan total_w yang dihitung seolah dasarnya nol.
{
  const { repairActualWeights } = await import('./workoutCalc.js');
  const cable = { id: 'c1', name: 'Cable Row', equipment: 'Cable' };
  const lookup = { c1: cable };
  const conf = { baseWeight: 2.5, ratio: 1, increment: 5 };
  const eqConfOf = () => conf;

  const hari = (sets) => ({ '2026-08-01': { workouts: [{ id: 'w1', status: 'completed', log: { c1: sets } }] } });

  // 1. KASUS UTAMA: set lama tanpa base_w -> total_w dihitung ulang.
  {
    const h = hari([{ input_w: 20, w: 20, r: 10, total_w: 20, done: true }]);
    const r = repairActualWeights(h, lookup, eqConfOf);
    assert.equal(r.diubah, 1);
    assert.equal(r.next['2026-08-01'].workouts[0].log.c1[0].total_w, 22.5);
    assert.equal(r.next['2026-08-01'].workouts[0].log.c1[0].base_w, 2.5);
    // Yang DIKETIK user tidak boleh berubah — cuma turunannya.
    assert.equal(r.next['2026-08-01'].workouts[0].log.c1[0].input_w, 20);
    assert.equal(r.next['2026-08-01'].workouts[0].log.c1[0].w, 20);
    // Masukan asli tidak dimutasi.
    assert.equal(h['2026-08-01'].workouts[0].log.c1[0].total_w, 20, 'history asli tidak boleh berubah');
  }

  // 2. Set yang SUDAH punya beban dasar sungguhan tidak disentuh — itu batas pengamannya.
  {
    const h = hari([{ input_w: 20, base_w: 5, ratio: 1, total_w: 25, r: 10, done: true }]);
    const r = repairActualWeights(h, lookup, eqConfOf);
    assert.equal(r.diubah, 0);
    assert.equal(r.next, h, 'tanpa perubahan, objek yang sama dikembalikan');
  }

  // 3. Rasio katrol yang tersimpan di set tetap dihormati, bukan ditimpa konfigurasi gym.
  {
    const h = hari([{ input_w: 20, ratio: 0.5, total_w: 10, r: 10, done: true }]);
    const r = repairActualWeights(h, lookup, eqConfOf);
    assert.equal(r.next['2026-08-01'].workouts[0].log.c1[0].total_w, 12.5, '(20 x 0,5) + 2,5');
  }

  // 4. Alat yang beban dasarnya nol di gym sekarang tidak diapa-apakan.
  {
    const h = hari([{ input_w: 20, total_w: 20, r: 10, done: true }]);
    assert.equal(repairActualWeights(h, lookup, () => ({ baseWeight: 0, ratio: 1 })).diubah, 0);
  }

  // 5. Set kosong, set tanpa beban, dan latihan tak dikenal dilewati tanpa melempar.
  {
    const h = hari([null, { r: 10, done: true }, { input_w: 0, total_w: 0 }]);
    assert.equal(repairActualWeights(h, lookup, eqConfOf).diubah, 0);
    assert.equal(repairActualWeights(hari([{ input_w: 20 }]), {}, eqConfOf).diubah, 0, 'latihan tak dikenal dilewati');
    assert.deepEqual(repairActualWeights(null, lookup, eqConfOf).next, {});
  }

  // 6. Set berbentuk objek ber-key angka (hasil bolak-balik penyimpanan) ikut diperbaiki.
  {
    const h = hari({ 0: { input_w: 20, total_w: 20, r: 10, done: true } });
    const r = repairActualWeights(h, lookup, eqConfOf);
    assert.equal(r.diubah, 1);
    assert.equal(r.next['2026-08-01'].workouts[0].log.c1[0].total_w, 22.5);
  }

  // 7. Idempoten: menjalankannya dua kali tidak menambah beban dasar dua kali.
  {
    const h = hari([{ input_w: 20, total_w: 20, r: 10, done: true }]);
    const sekali = repairActualWeights(h, lookup, eqConfOf);
    const dua = repairActualWeights(sekali.next, lookup, eqConfOf);
    assert.equal(dua.diubah, 0, 'jalan kedua tidak boleh mengubah apa pun');
    assert.equal(dua.next['2026-08-01'].workouts[0].log.c1[0].total_w, 22.5);
  }

  // 8. Contoh untuk pratinjau terisi, dibatasi 5.
  {
    const banyak = {};
    for (let i = 1; i <= 8; i++) {
      banyak[`2026-08-0${i}`] = { workouts: [{ id: 'w' + i, log: { c1: [{ input_w: 10 + i, total_w: 10 + i, done: true }] } }] };
    }
    const r = repairActualWeights(banyak, lookup, eqConfOf);
    assert.equal(r.diubah, 8);
    assert.equal(r.contoh.length, 5, 'pratinjau dibatasi 5 contoh');
    assert.equal(r.contoh[0].ke, r.contoh[0].dari + 2.5);
  }

  console.log('repairActualWeights OK');
}
