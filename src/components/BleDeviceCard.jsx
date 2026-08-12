import React from 'react';
import { Bluetooth, HeartPulse, Scale, Loader2, X, Plus } from 'lucide-react';
import { scanForDevice } from '../utils/ble';

// Daftar alat yang sudah dipasangkan. Cuma id + nama — bukan data ukur, jadi aman di
// localStorage. Bentuknya ARRAY sejak awal: alat kedua tidak boleh butuh perubahan struktur.
const SAVED_KEY = 'ble_devices';

// Ikon & label ikut jenis pengukuran yang PERNAH dikirim alatnya, bukan tebakan dari namanya.
// Alat yang belum pernah mengirim apa-apa tampil netral — lebih jujur daripada menebak salah.
const KIND = {
  bloodPressure: { icon: HeartPulse, label: 'Tensimeter' },
  weight: { icon: Scale, label: 'Timbangan' },
};

const describe = (r) => {
  if (!r) return null;
  if (r.type === 'bloodPressure') {
    return `${r.systolic}/${r.diastolic} mmHg${r.pulse > 0 ? ` · ${r.pulse} bpm` : ''}`;
  }
  if (r.type === 'weight') {
    return `${r.weight} kg${r.impedance > 0 ? ` · ${r.impedance} Ω` : ''}`;
  }
  return null;
};

/**
 * Kartu "Alat Bluetooth" — satu daftar untuk SEMUA alat BLE, bukan satu kartu per jenis.
 *
 * Alat apa pun yang lewat pemasangan yang sama masuk ke daftar ini; yang menentukan didukung
 * atau tidak cuma karakteristik yang dia punya (lihat connectAndListen di utils/ble.js).
 * Menambah dukungan alat baru = menambah parser di sana, kartu ini tidak perlu disentuh.
 *
 * Alur ukur: HP cuma MENDENGAR. Baik tensimeter maupun timbangan memulai pengukuran dari
 * alatnya sendiri, hasilnya dikirim setelah selesai — jadi tidak ada tombol "Ukur" di sini.
 */
export default function BleDeviceCard({ t, bleManager }) {
  if (!bleManager.available) return null;

  const { devices, status, readings, errors, warn, addDevice, forgetDevice, listen } = bleManager;

  const pair = async (showAll = false) => {
    let dev;
    try { dev = await scanForDevice(undefined, showAll); }
    catch { return; }
    addDevice({ deviceId: dev.deviceId, name: dev.name || 'Alat Bluetooth', kind: null });
  };

  return (
    <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-3`}>
      <p className={`body-md ${t.textMuted} uppercase tracking-wider mb-2 flex items-center gap-2`}>
        <Bluetooth size={16} /> Alat Medis
      </p>

      {devices.length === 0 && (
        <p className={`text-[10px] ${t.textMuted} leading-tight`}>
          Belum ada alat. Nyalakan alat (misal tensimeter, timbangan) supaya muncul di
          daftar saat memasangkan.
        </p>
      )}

      {devices.map((d) => {
        const st = status[d.deviceId];
        const Icon = KIND[d.kind]?.icon || Bluetooth;
        const reading = describe(readings[d.deviceId]);
        return (
          <div key={d.deviceId} className={`p-3 rounded-xl ${t.btnBg} space-y-2`}>
            <div className="flex items-center gap-3">
              <Icon size={16} className={t.textMuted} />
              <div className="min-w-0 flex-1">
                <p className={`font-bold text-sm ${t.textMain} truncate`}>{d.name}</p>
                <p className={`text-[10px] ${t.textMuted} truncate`}>
                  {KIND[d.kind]?.label || 'Belum diketahui jenisnya'}
                </p>
              </div>
              <button
                disabled={st === 'connecting'}
                onClick={() => listen(d)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${st === 'listening' ? `${t.bgAccent} text-white shadow-sm` : `${t.bgCard} ${t.textMuted}`}`}
              >
                {st === 'connecting' ? 'Menyambung...' : st === 'listening' ? 'Terhubung' : 'Sambungkan'}
              </button>
              <button onClick={() => forgetDevice(d.deviceId)} aria-label={`Lupakan ${d.name}`} className={`shrink-0 p-1 rounded-full ${t.textMuted} hover:text-rose-500 transition-colors`}>
                <X size={14} />
              </button>
            </div>

            {st === 'listening' && !reading && (
              <p className={`text-[10px] ${t.textMuted} flex items-center gap-1.5`}>
                <Loader2 size={12} className="animate-spin" /> Menunggu hasil — mulai pengukuran dari alatnya.
              </p>
            )}
            {reading && (
              <p className={`text-sm font-bold ${t.textMain}`}>
                {reading} <span className={`text-[10px] font-normal ${t.textMuted}`}>tersimpan</span>
              </p>
            )}
            {errors[d.deviceId] && <p className="text-[10px] text-red-500 leading-tight">{errors[d.deviceId]}</p>}
          </div>
        );
      })}

      {warn && <p className="text-[10px] text-amber-500 leading-tight">{warn}</p>}

      <button
        onClick={() => pair()}
        className={`w-full py-2.5 rounded-xl border border-dashed ${t.border} ${t.btnBg} ${t.textMain} font-bold text-sm flex items-center justify-center gap-2 transition-colors`}
      >
        <Plus size={16} /> Tambah Alat
      </button>
      {/* Sebagian alat baru mengumumkan service-nya SETELAH tersambung, jadi tidak pernah muncul
          di daftar yang tersaring. Tanpa jalan keluar ini, alat yang sebenarnya didukung
          terlihat seperti "tidak kompatibel". */}
      <button onClick={() => pair(true)} className={`text-[10px] ${t.textMuted} underline`}>
        Alat tidak muncul?
      </button>
    </div>
  );
}
