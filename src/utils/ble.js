// ============================================================
// HUB BLE UNIVERSAL — Tensimeter Yuwell (0x1810) & Timbangan Xiaomi (0x181D / 0x181B)
//
// Alur satu arah: alat BLE -> parser -> Health Connect -> (sinkron HC yang sudah ada) -> bioData
// -> Firestore. TIDAK ADA penulis Firestore baru di file ini: dokumen tahunan ditulis dengan
// diff terhadap baseline di App.jsx, jadi penulis kedua yang lewat jalur lain akan menimpa
// perubahan device lain (lihat invarian sinkron di App.jsx ~baris 2180).
//
// Yang ditulis file ini cuma: record Health Connect + satu patch bioData optimistis lewat
// setHistory milik App (biar angkanya langsung kelihatan tanpa nunggu sinkron HC berikutnya).
// ============================================================
import { BleClient } from '@capacitor-community/bluetooth-le';
import { hcWriteBloodPressure, hcWriteHeartRate, hcWriteWeight, hcWriteBodyFat, hcWriteBMR } from './healthConnect.js';
import { calculateBodyComposition } from './xiaomiScaleCalc.js';

// UUID BLE 16-bit harus ditulis panjang untuk plugin ini (Android menolak bentuk pendek).
const uuid16 = (n) => `0000${n.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb`;

export const BP_SERVICE = uuid16(0x1810);          // Blood Pressure
export const BP_MEASUREMENT = uuid16(0x2a35);      // indikasi (CCCD 0x2902 diurus plugin)
export const WEIGHT_SERVICE = uuid16(0x181d);      // Weight Scale (Mi Scale gen-1, standar)
export const WEIGHT_MEASUREMENT = uuid16(0x2a9d);
export const BODY_COMP_SERVICE = uuid16(0x181b);   // Body Composition (Mi Body Composition Scale 2)
export const BODY_COMP_MEASUREMENT = uuid16(0x2a9c);
export const RACP = uuid16(0x2a52);                // Record Access Control Point (History)
export const CURRENT_TIME_SERVICE = uuid16(0x1805); // Current Time Service
export const CURRENT_TIME = uuid16(0x2a2b);        // Current Time Characteristic

// ============================================================
// PARSER — murni, tanpa efek samping, semuanya diuji di ble.test.mjs
// ============================================================

/**
 * IEEE 11073-20601 SFLOAT 16-bit: 4 bit eksponen (signed) + 12 bit mantissa (signed),
 * keduanya two's complement. Dipakai semua nilai di karakteristik tekanan darah.
 * Nilai khusus (NaN/NRes/±INFINITY) dikembalikan sebagai null — JANGAN dijadikan angka,
 * mantissa 0x07FF apa adanya akan terbaca sebagai tensi 2047 mmHg.
 */
export const parseSFloat = (view, offset) => {
  const raw = view.getUint16(offset, true);
  const mantissaRaw = raw & 0x0fff;
  if (mantissaRaw >= 0x07fe && mantissaRaw <= 0x0802) return null; // +INF, NaN, NRes, reserved, -INF
  let exponent = raw >> 12;
  let mantissa = mantissaRaw;
  if (exponent >= 0x8) exponent -= 0x10;
  if (mantissa >= 0x800) mantissa -= 0x1000;
  return mantissa * Math.pow(10, exponent);
};

// Stempel waktu 7 byte "Date Time" (org.bluetooth.characteristic.date_time).
const parseDateTime = (view, offset) => {
  const year = view.getUint16(offset, true);
  if (!year) return null; // 0 = "tidak diketahui" menurut spesifikasi
  return new Date(year, view.getUint8(offset + 2) - 1, view.getUint8(offset + 3),
    view.getUint8(offset + 4), view.getUint8(offset + 5), view.getUint8(offset + 6));
};

const KPA_TO_MMHG = 7.50062;

/**
 * 0x2A35 Blood Pressure Measurement (Yuwell dan semua tensimeter ber-profil standar).
 *
 * byte 0      flags: bit0 satuan (0=mmHg, 1=kPa), bit1 stempel waktu, bit2 nadi,
 *                    bit3 user id, bit4 status pengukuran
 * byte 1..6   sistolik, diastolik, MAP — masing-masing SFLOAT
 * lalu (opsional, urut sesuai flag): stempel waktu 7B, nadi SFLOAT, user id 1B, status 2B
 *
 * Offset field opsional WAJIB dihitung dari flags, bukan dipatok: Yuwell mengirim stempel
 * waktu, alat lain tidak, dan nadi akan terbaca dari byte yang salah kalau dipatok.
 */
export const parseBloodPressure = (view) => {
  const flags = view.getUint8(0);
  const kPa = (flags & 0x01) !== 0;
  const conv = (v) => (v === null ? null : Math.round(kPa ? v * KPA_TO_MMHG : v));

  const out = {
    type: 'bloodPressure',
    systolic: conv(parseSFloat(view, 1)),
    diastolic: conv(parseSFloat(view, 3)),
    meanArterial: conv(parseSFloat(view, 5)),
    pulse: null,
    at: null,
  };

  let offset = 7;
  if (flags & 0x02) { out.at = parseDateTime(view, offset); offset += 7; }
  if (flags & 0x04) {
    const p = parseSFloat(view, offset);
    out.pulse = p === null ? null : Math.round(p);
    offset += 2;
  }
  return out;
};

/**
 * 0x2A9D Weight Measurement (standar SIG — Mi Scale gen-1 dan timbangan ber-profil standar).
 *
 * byte 0    flags: bit0 satuan (0=SI kg, 1=imperial lb), bit1 stempel waktu, bit2 user id,
 *                  bit3 BMI + tinggi
 * byte 1..2 berat uint16 LE — resolusi 5 g (SI) atau 0,01 lb (imperial)
 */
export const parseWeightMeasurement = (view) => {
  const flags = view.getUint8(0);
  const imperial = (flags & 0x01) !== 0;
  const raw = view.getUint16(1, true);
  const out = {
    type: 'weight',
    weight: Number((imperial ? raw * 0.01 * 0.45359237 : raw * 0.005).toFixed(2)),
    impedance: null,
    bmi: null,
    stable: true, // profil standar cuma mengirim hasil akhir
    at: null,
  };

  let offset = 3;
  if (flags & 0x02) { out.at = parseDateTime(view, offset); offset += 7; }
  if (flags & 0x04) offset += 1; // user id — tidak dipakai, Logym single-user per akun
  if (flags & 0x08) out.bmi = Number((view.getUint16(offset, true) * 0.1).toFixed(1));
  return out;
};

/**
 * Protokol Xiaomi (Mi Body Composition Scale 2) — 13 byte di 0x181B/0x2A9C, juga muncul
 * sebagai service data di iklan BLE.
 *
 * byte 0     kontrol: bit0 satuan lb, bit4 satuan jin (catty); selain itu kg
 * byte 1     status: bit1 impedansi siap, bit5 berat stabil, bit7 beban sudah diangkat
 * byte 2..8  tanggal/jam menurut jam timbangan (SERING SALAH — jangan dipakai, pakai jam HP)
 * byte 9..10 impedansi uint16 LE (ohm)
 * byte 11..12 berat uint16 LE — /200 utk kg, /100 utk lb & jin
 *
 * `stable` WAJIB dicek pemanggil: timbangan menyiarkan berat yang masih naik-turun berkali-kali
 * selama user naik, dan menyimpan yang pertama datang berarti mencatat 43 kg untuk orang 70 kg.
 */
export const parseXiaomiBodyComposition = (view) => {
  const ctrl = view.getUint8(0);
  const status = view.getUint8(1);
  const raw = view.getUint16(11, true);
  const kg = (ctrl & 0x01) ? (raw / 100) * 0.45359237  // lb
           : (ctrl & 0x10) ? (raw / 100) * 0.5          // jin/catty
           : raw / 200;                                 // kg
  const impedanceReady = (status & 0x02) !== 0;
  const impedance = view.getUint16(9, true);
  return {
    type: 'weight',
    weight: Number(kg.toFixed(2)),
    // 0 dan 0xFFFF = belum terukur; menyimpannya berarti mengarang komposisi tubuh.
    impedance: impedanceReady && impedance > 0 && impedance < 0xffff ? impedance : null,
    bmi: null,
    stable: (status & 0x20) !== 0,
    removed: (status & 0x80) !== 0,
    at: null,
  };
};

// Pilih parser dari UUID karakteristik yang mengirim data.
export const parseMeasurement = (charUuid, view) => {
  const u = charUuid.toLowerCase();
  if (u === BP_MEASUREMENT) return parseBloodPressure(view);
  if (u === WEIGHT_MEASUREMENT) return parseWeightMeasurement(view);
  if (u === BODY_COMP_MEASUREMENT) return parseXiaomiBodyComposition(view);
  return null;
};

// ============================================================
// KONEKSI
// ============================================================

/**
 * BLE jalan di APK MAUPUN di browser: plugin ini punya jalur Web Bluetooth, dan
 * `initialize()` sendiri yang melempar kalau browsernya tidak mendukung. Jadi JANGAN
 * dipagari `Capacitor.isNativePlatform()` — pagar itu bikin pengembangan di localhost
 * mustahil padahal jalurnya ada.
 *
 * Yang memang cuma ada di APK: penulisan ke Health Connect (lihat hcSaveSample). Di browser
 * hasil ukur tetap masuk Logym/Firestore, cuma tidak diteruskan ke Health Connect.
 *
 * Catatan browser: Web Bluetooth cuma ada di Chrome/Edge (bukan Firefox/Safari), wajib
 * HTTPS — kecuali localhost, yang memang dikecualikan, jadi `npm run dev` bisa dipakai.
 */
export const bleAvailable = async () => {
  try { await BleClient.initialize({ androidNeverForLocation: true }); return true; }
  catch { return false; }
};

/**
 * Buka pemilih perangkat bawaan sistem, tersaring ke service yang kita mengerti saja.
 * Balikannya `{ deviceId, name }` — simpan deviceId kalau mau langsung sambung lain kali.
 *
 * `showAll`: tampilkan SEMUA perangkat BLE di sekitar, tanpa saringan service. Perlu karena
 * saringan itu bekerja atas paket IKLAN, dan sebagian alat (beberapa varian Yuwell termasuk)
 * cuma mengumumkan service-nya SETELAH tersambung — alat yang sebenarnya didukung jadi tidak
 * pernah muncul di daftar. Service-nya tetap diperiksa saat connect, jadi salah pilih perangkat
 * gagal dengan pesan yang jelas, bukan diam-diam menyimpan data ngawur.
 */
export const scanForDevice = async (services = [BP_SERVICE, WEIGHT_SERVICE, BODY_COMP_SERVICE], showAll = false) => {
  await BleClient.initialize({ androidNeverForLocation: true });
  return BleClient.requestDevice({
    services: showAll ? [] : services,
    optionalServices: [BP_SERVICE, WEIGHT_SERVICE, BODY_COMP_SERVICE],
  });
};

/**
 * Sambung, langganan karakteristik pengukuran, panggil `onReading` tiap ada hasil.
 *
 * Indikasi vs notifikasi tidak dibedakan di sisi JS — plugin menulis CCCD 0x2902 sesuai
 * properti karakteristiknya, jadi 0x2A35 (indicate-only) tetap jalan lewat startNotifications.
 *
 * Balikannya fungsi pemutus; WAJIB dipanggil saat komponen unmount, kalau tidak koneksi BLE
 * tetap hidup di latar dan alat menolak koneksi berikutnya sampai HP-nya di-bluetooth-ulang.
 */
export const connectAndListen = async (deviceId, onReading) => {
  await BleClient.initialize({ androidNeverForLocation: true });
  await BleClient.connect(deviceId, () => onReading({ type: 'disconnected' }));

  const services = await BleClient.getServices(deviceId);
  const targets = [];
  let racpData = null;
  let timeData = null;

  for (const s of services) {
    for (const c of s.characteristics || []) {
      const cu = c.uuid.toLowerCase();
      if (cu === BP_MEASUREMENT || cu === WEIGHT_MEASUREMENT || cu === BODY_COMP_MEASUREMENT) {
        targets.push([s.uuid, c.uuid]);
      }
      if (cu === RACP) racpData = [s.uuid, c.uuid];
      if (cu === CURRENT_TIME) timeData = [s.uuid, c.uuid];
    }
  }
  if (targets.length === 0) {
    await BleClient.disconnect(deviceId);
    throw new Error('Perangkat ini tidak punya karakteristik pengukuran yang dikenal (0x2A35 / 0x2A9D / 0x2A9C).');
  }

  for (const [su, cu] of targets) {
    await BleClient.startNotifications(deviceId, su, cu, (view) => {
      const reading = parseMeasurement(cu, view);
      // Timbangan menyiarkan berat yang belum stabil berkali-kali selama user naik — buang
      // sampai stabil, kalau tidak yang tercatat adalah berat setengah jalan.
      if (!reading || reading.stable === false) return;
      onReading(reading);
    });
  }

  // Request History for Blood Pressure using RACP
  if (racpData && targets.some(t => t[1] === BP_MEASUREMENT)) {
    try {
      const [rSu, rCu] = racpData;
      await BleClient.startNotifications(deviceId, rSu, rCu, (view) => {
        console.log('[BLE] RACP Response:', view);
      });
      // OpCode: 1 (Report stored records), Operator: 1 (All records)
      const cmd = new Uint8Array([0x01, 0x01]);
      await BleClient.write(deviceId, rSu, rCu, new DataView(cmd.buffer));
    } catch (e) {
      console.log('[BLE] RACP request failed', e);
    }
  }

  // Set Current Time (Standard procedure for Xiaomi and other smart scales to sync history)
  if (timeData) {
    try {
      const [tSu, tCu] = timeData;
      const now = new Date();
      const buf = new ArrayBuffer(10);
      const view = new DataView(buf);
      view.setUint16(0, now.getFullYear(), true); // little-endian
      view.setUint8(2, now.getMonth() + 1);
      view.setUint8(3, now.getDate());
      view.setUint8(4, now.getHours());
      view.setUint8(5, now.getMinutes());
      view.setUint8(6, now.getSeconds());
      view.setUint8(7, now.getDay() === 0 ? 7 : now.getDay()); 
      view.setUint8(8, 0);
      view.setUint8(9, 1);
      await BleClient.write(deviceId, tSu, tCu, view);
    } catch (e) {
      console.log('[BLE] Time Sync failed', e);
    }
  }

  return async () => {
    if (racpData) {
      await BleClient.stopNotifications(deviceId, racpData[0], racpData[1]).catch(() => {});
    }
    for (const [su, cu] of targets) {
      await BleClient.stopNotifications(deviceId, su, cu).catch(() => {});
    }
    await BleClient.disconnect(deviceId).catch(() => {});
  };
};

// ============================================================
// PENYIMPANAN TERPADU
// ============================================================

const ymdOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Satu pintu simpan untuk semua hasil BLE.
 *
 * 1) tulis ke Health Connect (sumber kebenaran lintas app),
 * 2) tempel optimistis ke bioData hari itu lewat setHistory milik App — auto-save di App.jsx
 *    yang mengirimkannya ke Firestore (history_years/<tahun>, di-diff terhadap baseline).
 *
 * SENGAJA TIDAK menyetel `_manualFlags`: field bertanda manual dilewati mergeHcDays, jadi
 * menandainya akan MEMATIKAN sinkron Health Connect untuk berat/tensi hari itu selamanya.
 * Data dari alat itu otomatis, bukan ketikan user.
 *
 * `bloodPressureLog` sengaja tidak disentuh — field itu dibangun ulang utuh per hari oleh
 * hcReadRange dari record HC, termasuk record yang baru saja kita tulis di langkah 1.
 */
export const saveMeasurement = async (reading, { setHistory, userProfile } = {}) => {
  const at = reading.at instanceof Date && !Number.isNaN(reading.at.getTime()) ? reading.at : new Date();
  reading.at = at;
  const ymd = ymdOf(at);
  const patch = {};
  // Gagal menulis ke HC TIDAK membatalkan simpan ke Logym — angkanya sudah di tangan, dan
  // penyebab paling umum cuma izin tulis yang belum diminta ulang. Dilaporkan ke pemanggil
  // supaya bisa ditampilkan, bukan ditelan diam-diam.
  let hcOk = true;

  if (reading.type === 'bloodPressure') {
    if (!(reading.systolic > 0) || !(reading.diastolic > 0)) {
      throw new Error('Pengukuran tensi tidak valid (sistolik/diastolik kosong).');
    }
    const bpOk = await hcWriteBloodPressure(reading.systolic, reading.diastolic, at);
    let hrOk = true;
    patch.bloodPressure = `${reading.systolic}/${reading.diastolic}`;
    if (reading.pulse > 0) {
      hrOk = await hcWriteHeartRate(reading.pulse, at);
      patch.heartRate = reading.pulse.toString();
    }
    hcOk = bpOk && hrOk;
  } else if (reading.type === 'weight') {
    if (!(reading.weight > 0)) throw new Error('Pengukuran berat tidak valid.');
    hcOk = await hcWriteWeight(reading.weight, at);
    patch.weight = reading.weight;
    
    // Hitung Komposisi Tubuh jika ada data profil dan impedansi
    let comp = null;
    if (reading.impedance > 0 && userProfile && userProfile.height > 0 && userProfile.dob && userProfile.gender) {
        const age = new Date().getFullYear() - new Date(userProfile.dob).getFullYear();
        comp = calculateBodyComposition(reading.weight, reading.impedance, userProfile.height, age, userProfile.gender);
    }
    
    // Fallback: BodyFat yang dikirim langsung (jika ada timbangan yang ngirim tanpa impedansi)
    if (!comp && reading.bodyFat > 0) {
      hcOk = (await hcWriteBodyFat(reading.bodyFat, at)) && hcOk;
      patch.bodyFat = reading.bodyFat;
    }
    
    if (comp) {
        // Tulis semua ke HC yang didukung
        hcOk = (await hcWriteBodyFat(comp.bodyFat, at)) && hcOk;
        // Massa tulang & massa otot sengaja tidak dikirim ke Health Connect: plugin tidak
        // mengenal record-nya (lihat healthConnect.js), jadi dulu panggilannya selalu gagal
        // dan menyeret hcOk jadi false padahal berat/body fat/BMR sudah tersimpan.
        if (comp.bmr > 0) hcOk = (await hcWriteBMR(comp.bmr, at)) && hcOk;
        
        // Simpan semua ke state Logym (patch)
        patch.bodyFat = comp.bodyFat;
        patch.muscleMass = comp.muscleMass;
        patch.musclePercent = comp.musclePercent;
        patch.boneMass = comp.boneMass;
        patch.visceralFat = comp.visceralFat;
        patch.waterPercent = comp.waterPercent;
        patch.proteinPercent = comp.proteinPercent;
        patch.bmr = comp.bmr;
        patch.bodyAge = comp.bodyAge;
        patch.bodyScore = comp.bodyScore;
        patch.bmi = comp.bmi;
    }

    // Impedansi mentah tidak punya padanan di Health Connect — disimpan di bioData saja.
    if (reading.impedance > 0) patch.impedance = reading.impedance;
  } else {
    return null;
  }

  setHistory?.((prev) => {
    const oldBio = prev[ymd]?.bioData || {};
    const newBio = { ...oldBio, ...patch };

    // Intraday Data Append (Grafik harian)
    const ts = at.getTime();
    const timeStr = at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (reading.type === 'bloodPressure') {
      newBio.bloodPressureLog = [...(oldBio.bloodPressureLog || []), { time: timeStr, ts, sys: Math.round(reading.systolic), dia: Math.round(reading.diastolic) }].sort((a,b) => a.ts - b.ts);
      if (reading.pulse > 0) {
        newBio.heartRateLog = [...(oldBio.heartRateLog || []), { time: timeStr, ts, value: Math.round(reading.pulse) }].sort((a,b) => a.ts - b.ts);
      }
    } else if (reading.type === 'weight') {
      newBio.weightLog = [...(oldBio.weightLog || []), { time: timeStr, ts, value: Number(reading.weight.toFixed(1)) }].sort((a,b) => a.ts - b.ts);
    }

    return {
      ...prev,
      [ymd]: { ...(prev[ymd] || {}), bioData: newBio },
    };
  });

  return { ymd, patch, hcOk };
};
