// Cek setiap dataType yang dipakai Logym benar-benar dikenal plugin @capgo/capacitor-health.
// Jalankan: node src/utils/hcDataTypes.test.mjs
//
// Kenapa perlu tes seaneh ini (membaca sumber, bukan memanggil fungsi): healthConnect.js
// mengimpor Capacitor, jadi tidak bisa di-import dari Node polos. Tapi kegagalannya mahal —
// SATU nama asing di READ_TYPES/WRITE_TYPES membuat parseTypeList di HealthPlugin.kt melempar
// SEBELUM dialog izin muncul, sehingga SELURUH koneksi Health Connect gagal dengan pesan
// "Unsupported data type: X". Bukan fitur yang berkurang — Health Connect mati total.
// Kejadian nyata: 'nutrition' (identifier yang benar 'dietaryEnergyConsumed') plus boneMass,
// leanBodyMass, dan bodyWaterMass yang memang tidak ada record-nya di plugin.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ENUM_PATH = 'node_modules/@capgo/capacitor-health/android/src/main/java/app/capgo/plugin/health/HealthDataType.kt';
const HC_PATH = 'src/utils/healthConnect.js';

if (!fs.existsSync(ENUM_PATH)) {
  console.log('hcDataTypes DILEWATI: node_modules plugin tidak ada');
  process.exit(0);
}

// Baris enum berbentuk:  STEPS("steps", StepsRecord::class, "count"),
const enumSrc = fs.readFileSync(ENUM_PATH, 'utf8');
const known = new Set([...enumSrc.matchAll(/^\s+[A-Z0-9_]+\("([^"]+)"/gm)].map(m => m[1]));
assert.ok(known.size > 10, `enum plugin tidak terbaca (cuma ${known.size} tipe) — format berubah?`);
assert.ok(known.has('steps'), 'sanity: "steps" harus ada di enum plugin');

const hcSrc = fs.readFileSync(HC_PATH, 'utf8');
const listOf = (name) => {
  const m = hcSrc.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  assert.ok(m, `${name} tidak ditemukan di ${HC_PATH}`);
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
};

const read = listOf('READ_TYPES');
const write = listOf('WRITE_TYPES');
assert.ok(read.length > 5 && write.length > 2, 'daftar tipe terbaca kosong — regex-nya rusak?');

for (const [label, list] of [['READ_TYPES', read], ['WRITE_TYPES', write]]) {
  for (const t of list) {
    assert.ok(known.has(t),
      `${label} memakai '${t}' yang TIDAK ADA di HealthDataType plugin.\n` +
      `  Akibatnya seluruh koneksi Health Connect gagal: "Unsupported data type: ${t}".\n` +
      `  Tipe yang dikenal: ${[...known].sort().join(', ')}`);
  }
}

// Semua dataType yang dipakai saat membaca data juga harus dikenal — salah satu di sini tidak
// mematikan koneksi, tapi membuat satu sumber data diam-diam selalu kosong.
for (const m of hcSrc.matchAll(/dataType:\s*'([^']+)'/g)) {
  assert.ok(known.has(m[1]), `readSamples/queryAggregated memakai dataType '${m[1]}' yang tidak dikenal plugin`);
}

// Regresi khusus: nama lama yang pernah mematikan koneksi tidak boleh kembali.
for (const banned of ['nutrition', 'boneMass', 'leanBodyMass', 'bodyWaterMass']) {
  assert.ok(!known.has(banned), `dugaan salah: '${banned}' ternyata ada di enum plugin — perbarui tes ini`);
  assert.ok(!read.includes(banned) && !write.includes(banned), `'${banned}' kembali muncul di daftar tipe`);
}

console.log(`hcDataTypes OK (${read.length} baca, ${write.length} tulis, ${known.size} dikenal plugin)`);
