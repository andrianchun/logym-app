import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, CalendarDays, Loader2, ShieldAlert, HeartPulse } from 'lucide-react';
import { playSoundEffect } from '../utils/audio';
import SwipeInput from './SwipeInput';

// --- IMPORT CAPACITOR & HEALTH CONNECT BARU ---
import { Capacitor } from '@capacitor/core';
import { HealthConnect } from 'capacitor-health-connect';

const DashboardModals = ({ 
  t, lang, showSyncModal, setShowSyncModal, connectedApps, handleToggleApp,
  showManualModal, setShowManualModal, manualTab, setManualTab, 
  modalDate, setModalDate, formBio, setFormBio, bioData,
  handleSaveManualData, handleDeleteBioData, soundEnabled, unitSystem, setConfirmModal
}) => {
  const isImp = unitSystem === 'imperial';

  const [authSim, setAuthSim] = useState(null);

  const triggerConnection = async (appKey) => {
      playSoundEffect('click', soundEnabled);
      
      // JALUR LYFEAT (Firebase Internal)
      if (appKey === 'lyfeat') {
          if (connectedApps[appKey]) { handleToggleApp(appKey); return; }
          setAuthSim(appKey);
          setTimeout(() => { setAuthSim(null); handleToggleApp(appKey); }, 2000);
          return;
      }

      // JALUR TUNGGAL ANDROID HEALTH CONNECT
      if (appKey === 'healthconnect') {
          if (connectedApps[appKey]) {
              handleToggleApp(appKey);
              return;
          }

          setAuthSim(appKey);

          try {
              // Langsung minta semua izin sekaligus dalam 1 pintu
              await HealthConnect.requestHealthPermissions({
                  read: ['Weight', 'BodyFat', 'Steps', 'HeartRate', 'SleepSession'],
                  write: []
              });

              setAuthSim(null);
              handleToggleApp(appKey);
          } catch (err) {
              console.error("Izin ditolak atau error:", err);
              setAuthSim(null);
              alert("Gagal memanggil Health Connect: " + (err.message || err));
          }
      }
  };
  const parseSleep = (str) => {
      const parts = (str || '').match(/(\d+)h\s*(\d+)m/);
      if (parts) return { h: parseInt(parts[1]) || 0, m: parseInt(parts[2]) || 0 };
      return { h: 0, m: 0 };
  };
  const { h: sleepH, m: sleepM } = parseSleep(formBio.sleep);
  const handleSleepH = (v) => setFormBio({ ...formBio, sleep: `${v}h ${sleepM}m` });
  const handleSleepM = (v) => setFormBio({ ...formBio, sleep: `${sleepH}h ${v}m` });

  const parseBP = (str) => {
      const parts = (str || '').split('/');
      if (parts.length === 2) return { sys: parseInt(parts[0]) || 0, dia: parseInt(parts[1]) || 0 };
      return { sys: 0, dia: 0 };
  };
  const { sys: bpSys, dia: bpDia } = parseBP(formBio.bloodPressure);
  const handleBPSys = (v) => setFormBio({ ...formBio, bloodPressure: `${v}/${bpDia}` });
  const handleBPDia = (v) => setFormBio({ ...formBio, bloodPressure: `${bpSys}/${v}` });

  const ph = (val, def) => val ? val.toString() : def;
  const { h: lastSleepH, m: lastSleepM } = parseSleep(bioData?.sleep);
  const { sys: lastBpSys, dia: lastBpDia } = parseBP(bioData?.bloodPressure);


  return (
    <>
      {/* 1. MODAL KELOLA KONEKSI APLIKASI */}
      {showSyncModal && createPortal((
        <div className={`fixed inset-0 -top-24 -bottom-24 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in ${t.textMain} font-sans`} onClick={() => setShowSyncModal(false)}>
           <div className={`w-full max-w-sm mx-auto ${t.bgCard} rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border ${t.border} p-5 relative`} onClick={(e) => e.stopPropagation()}>
              
              {authSim && (
                  <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in">
                      <Loader2 size={40} className={`animate-spin ${t.textAccent} mb-4`} />
                      <h4 className="h3 mb-1">Membuka Akses</h4>
                      <p className="caption text-center px-6 opacity-80">
                          Meminta izin dari {authSim === 'lyfeat' ? 'LyFeat Cloud' : 'Android Health Connect'}...
                      </p>
                  </div>
              )}

              <div className="flex justify-between items-center mb-2">
                 <h3 className="h2">Ekosistem Aplikasi</h3>
                 <button onClick={() => setShowSyncModal(false)} className={`p-1.5 rounded-full ${t.btnBg}`}><X size={16}/></button>
              </div>
              <p className={`caption ${t.textMuted} mb-4 flex items-start`}>
                  <ShieldAlert size={14} className="mr-1.5 shrink-0" />
                  Pilih layanan yang diizinkan untuk berbagi dan membaca data biometrik secara background.
              </p>
              
              <div className="space-y-2 mb-4">
                  {/* KONEKSI TUNGGAL HEALTH CONNECT */}
                  <div onClick={() => triggerConnection('healthconnect')} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-colors ${connectedApps.healthconnect ? t.bgAccentSoft + ' ' + t.borderAccentSoft : t.inputBg + ' ' + t.border}`}>
                      <div className="flex flex-col">
                          <div className="flex items-center space-x-1.5 mb-0.5">
                              <HeartPulse size={14} className={connectedApps.healthconnect ? t.textAccent : t.textMuted} />
                              <span className={`body-lg font-black ${connectedApps.healthconnect ? t.textAccent : t.textMain}`}>Health Connect</span>
                          </div>
                          <span className={`caption ${t.textMuted}`}>Sinkronisasi Langkah, Kalori & Nadi</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${connectedApps.healthconnect ? t.bgAccent + ' border-transparent' : 'border-zinc-500'}`}>
                          {connectedApps.healthconnect && <Check size={12} strokeWidth={3}/>}
                      </div>
                  </div>

                  {/* KONEKSI LYFEAT */}
                  <div onClick={() => triggerConnection('lyfeat')} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-colors ${connectedApps.lyfeat ? 'bg-violet-500/10 border-violet-500/40' : t.inputBg + ' ' + t.border}`}>
                      <div className="flex flex-col">
                          <span className="body-lg font-black text-violet-500">LyFeat (Nutrition)</span>
                          <span className={`caption ${t.textMuted}`}>Kirim kalori workout, terima data nutrisi</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${connectedApps.lyfeat ? 'bg-violet-500 border-transparent text-white' : 'border-zinc-500'}`}>
                          {connectedApps.lyfeat && <Check size={12} strokeWidth={3}/>}
                      </div>
                  </div>
              </div>
              <button onClick={() => setShowSyncModal(false)} className={`w-full py-3 rounded-xl body-lg font-black text-white ${t.bgAccent}`}>Selesai</button>
           </div>
        </div>
      ), document.body)}

      {/* 2. MODAL INPUT MANUAL & IN-DEPTH EDITING */}
      {showManualModal && createPortal((
        <div className={`fixed inset-0 -top-24 -bottom-24 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in ${t.textMain} font-sans`} onClick={() => setShowManualModal(false)}>
           <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border ${t.border}`} onClick={(e) => e.stopPropagation()}>
              
              <div className="flex justify-between items-start p-5 pb-4 shrink-0">
                 <div>
                    <h3 className="h2 leading-tight">Input Manual</h3>
                    <div className="relative flex items-center space-x-2 mt-2 w-max cursor-pointer">
                        <CalendarDays size={14} className={t.textAccent} />
                        <span className={`body-md ${t.textAccent}`}>{new Date(modalDate).toLocaleDateString(lang.workout === 'Latihan' ? 'id-ID' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                        <input type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} onClick={(e) => { try { e.target.showPicker() } catch(err){} }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </div>
                 </div>
                 <div className="flex space-x-2">
                     <button 
                         onClick={() => { 
                             setConfirmModal({
                                 isOpen: true,
                                 title: 'Hapus Data?',
                                 message: `Yakin ingin menghapus data ${manualTab === 'komposisi' ? 'Komposisi Tubuh' : 'Aktivitas Harian'} di tanggal ${new Date(modalDate).toLocaleDateString(lang.workout === 'Latihan' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}? Data yang dihapus tidak bisa dikembalikan.`,
                                 onConfirm: handleDeleteBioData
                             }); 
                         }} 
                         className={`p-2 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors`} 
                         title="Hapus Data"
                     >
                         <X size={16}/>
                     </button>
                 </div>
              </div>

              <div className="mb-4 shrink-0 px-5">
                 <div className={`relative flex w-full p-1.5 rounded-full ${t.btnBg}`}>
                     <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: manualTab === 'komposisi' ? 'translateX(0)' : 'translateX(100%)', left: '6px' }}></div>
                     
                     <button onClick={() => setManualTab('komposisi')} className={`flex-1 py-2 rounded-full caption font-black relative z-10 transition-colors duration-300 ${manualTab === 'komposisi' ? 'text-white' : t.textMuted}`}>Komposisi Tubuh</button>
                     <button onClick={() => setManualTab('harian')} className={`flex-1 py-2 rounded-full caption font-black relative z-10 transition-colors duration-300 ${manualTab === 'harian' ? 'text-white' : t.textMuted}`}>Data Harian</button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 body-md pb-6 hide-scrollbar px-5 pt-2">
                 {manualTab === 'komposisi' ? (
                   <div className="grid grid-cols-2 gap-4">
                         <div><label className={`block ${t.textMuted} mb-1.5`}>Berat Badan ({isImp ? 'lbs' : 'kg'})</label><SwipeInput value={formBio.weight === 0 ? '' : (isImp ? Math.round(formBio.weight * 2.20462 * 10)/10 : formBio.weight)} onChange={(val) => setFormBio({...formBio, weight: isImp ? Number((val / 2.20462).toFixed(2)) : val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(isImp ? bioData?.weight * 2.20462 : bioData?.weight, isImp ? "154" : "70")} /></div>
                         
                         {isImp ? (
                             <div><label className={`block ${t.textMuted} mb-1.5`}>Tinggi Badan (ft & in)</label>
                                 <div className="grid grid-cols-2 gap-2">
                                     <div className="relative">
                                         <SwipeInput value={formBio.height === 0 ? '' : Math.floor(formBio.height / 30.48)} onChange={(val) => { const currentInches = formBio.height === 0 ? 0 : Math.round((formBio.height / 2.54) % 12); setFormBio({...formBio, height: Number((val * 30.48 + currentInches * 2.54).toFixed(2))}); }} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center pr-4`} placeholder="5" />
                                         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold pointer-events-none">ft</span>
                                     </div>
                                     <div className="relative">
                                         <SwipeInput value={formBio.height === 0 ? '' : Math.round((formBio.height / 2.54) % 12)} onChange={(val) => { const currentFeet = formBio.height === 0 ? 0 : Math.floor(formBio.height / 30.48); setFormBio({...formBio, height: Number((currentFeet * 30.48 + val * 2.54).toFixed(2))}); }} step={1} min={0} max={11} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center pr-4`} placeholder="7" />
                                         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold pointer-events-none">in</span>
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             <div><label className={`block ${t.textMuted} mb-1.5`}>Tinggi Badan (cm)</label><SwipeInput value={formBio.height === 0 ? '' : formBio.height} onChange={(val) => setFormBio({...formBio, height: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.height, "170")} /></div>
                         )}

                         <div><label className={`block ${t.textMuted} mb-1`}>Lingkar Perut ({isImp ? 'in' : 'cm'})</label><SwipeInput value={formBio.waist === 0 ? '' : (isImp ? Math.round(formBio.waist * 0.393701 * 10)/10 : formBio.waist)} onChange={(val) => setFormBio({...formBio, waist: isImp ? Number((val / 0.393701).toFixed(2)) : val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(isImp ? bioData?.waist * 0.393701 : bioData?.waist, isImp ? "31.5" : "80")} /></div>
                         <div><label className={`block ${t.textMuted} mb-1`}>BMR (kcal)</label><SwipeInput value={formBio.bmr === 0 ? '' : formBio.bmr} onChange={(val) => setFormBio({...formBio, bmr: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.bmr, "1500")} /></div>
                         <div><label className={`block ${t.textMuted} mb-1`}>Massa Otot ({isImp ? 'lbs' : 'kg'})</label><SwipeInput value={formBio.muscleMass === 0 ? '' : (isImp ? Math.round(formBio.muscleMass * 2.20462 * 10)/10 : formBio.muscleMass)} onChange={(val) => setFormBio({...formBio, muscleMass: isImp ? Number((val / 2.20462).toFixed(2)) : val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(isImp ? bioData?.muscleMass * 2.20462 : bioData?.muscleMass, isImp ? "66" : "30")} /></div>
                         <div><label className={`block ${t.textMuted} mb-1`}>Kadar Otot (%)</label><SwipeInput value={formBio.musclePercent === 0 ? '' : formBio.musclePercent} onChange={(val) => setFormBio({...formBio, musclePercent: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.musclePercent, "40")} /></div>
                         <div><label className={`block ${t.textMuted} mb-1`}>Kadar Lemak (%)</label><SwipeInput value={formBio.bodyFat === 0 ? '' : formBio.bodyFat} onChange={(val) => setFormBio({...formBio, bodyFat: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.bodyFat, "20")} /></div>
                         <div><label className={`block ${t.textMuted} mb-1`}>Visceral Fat</label><SwipeInput value={formBio.visceralFat === 0 ? '' : formBio.visceralFat} onChange={(val) => setFormBio({...formBio, visceralFat: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.visceralFat, "5")} /></div>
                         <div><label className={`block ${t.textMuted} mb-1`}>Kadar Air (%)</label><SwipeInput value={formBio.waterPercent === 0 ? '' : formBio.waterPercent} onChange={(val) => setFormBio({...formBio, waterPercent: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.waterPercent, "60")} /></div>
                         <div><label className={`block ${t.textMuted} mb-1`}>Kadar Protein (%)</label><SwipeInput value={formBio.proteinPercent === 0 ? '' : formBio.proteinPercent} onChange={(val) => setFormBio({...formBio, proteinPercent: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.proteinPercent, "18")} /></div>
                         <div><label className={`block ${t.textMuted} mb-1`}>Usia Sel Tubuh (th)</label><SwipeInput value={formBio.bodyAge === 0 ? '' : formBio.bodyAge} onChange={(val) => setFormBio({...formBio, bodyAge: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.bodyAge, "25")} /></div>
                         <div><label className={`block ${t.textMuted} mb-1`}>Body Score (0-100)</label><SwipeInput value={formBio.bodyScore === 0 ? '' : formBio.bodyScore} onChange={(val) => setFormBio({...formBio, bodyScore: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.bodyScore, "80")} /></div>
                     </div>
                 ) : (
                    <div className="space-y-4">
                        {/* Group 1: General Activity */}
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={`block ${t.textMuted} mb-1`}>Langkah</label><SwipeInput value={formBio.steps || ''} onChange={(val) => setFormBio({...formBio, steps: val})} step={100} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.steps, "5000")} /></div>
                            <div><label className={`block ${t.textMuted} mb-1`}>Energy Score</label><SwipeInput value={formBio.energyScore || ''} onChange={(val) => setFormBio({...formBio, energyScore: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.energyScore, "80")} /></div>
                            <div><label className={`block ${t.textMuted} mb-1`}>Waktu Aktif (mnt)</label><SwipeInput value={formBio.activeMinutes || ''} onChange={(val) => setFormBio({...formBio, activeMinutes: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.activeMinutes, "30")} /></div>
                            <div><label className={`block ${t.textMuted} mb-1`}>Kalori Aktif (kcal)</label><SwipeInput value={formBio.activityCalories || ''} onChange={(val) => setFormBio({...formBio, activityCalories: val})} step={10} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.activityCalories, "300")} /></div>
                        </div>
                        
                        {/* Group 2: Tidur & Tensi (Swipeable) */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Tidur */}
                            <div>
                                <label className={`block ${t.textMuted} mb-1`}>Tidur (Jam/Menit)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <SwipeInput value={sleepH || ''} onChange={handleSleepH} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center pr-4`} placeholder={ph(lastSleepH, "7")} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold pointer-events-none">h</span>
                                    </div>
                                    <div className="relative">
                                        <SwipeInput value={sleepM || ''} onChange={handleSleepM} step={5} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center pr-4`} placeholder={ph(lastSleepM, "0")} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold pointer-events-none">m</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tensi */}
                            <div>
                                <label className={`block ${t.textMuted} mb-1`}>Tensi (Sys/Dia)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <SwipeInput value={bpSys || ''} onChange={handleBPSys} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(lastBpSys, "120")} />
                                    <SwipeInput value={bpDia || ''} onChange={handleBPDia} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(lastBpDia, "80")} />
                                </div>
                            </div>
                        </div>

                        {/* Group 3: Detak Jantung */}
                        <div>
                            <label className={`block ${t.textMuted} mb-1`}>Detak Jantung (Avg / Min / Max)</label>
                            <div className="grid grid-cols-3 gap-2">
                                <SwipeInput value={formBio.heartRate || ''} onChange={(val) => setFormBio({...formBio, heartRate: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.heartRate, "75")} />
                                <SwipeInput value={formBio.minHeartRate || ''} onChange={(val) => setFormBio({...formBio, minHeartRate: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.minHeartRate, "60")} />
                                <SwipeInput value={formBio.maxHeartRate || ''} onChange={(val) => setFormBio({...formBio, maxHeartRate: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.maxHeartRate, "100")} />
                            </div>
                        </div>

                        {/* Rekap Latihan Mingguan */}
                        <div className="mt-2 pt-4 border-t border-dashed border-zinc-700">
                            <span className={`block ${t.textAccent} mb-3 uppercase tracking-wider text-[10px] font-bold`}>Rekap Latihan Mingguan</span>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={`block ${t.textMuted} mb-1`}>Total Sesi (x)</label><SwipeInput value={formBio.weeklySessions || ''} onChange={(val) => setFormBio({...formBio, weeklySessions: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.weeklySessions, "3")} /></div>
                                <div><label className={`block ${t.textMuted} mb-1`}>Durasi (Menit)</label><SwipeInput value={formBio.weeklyDuration || ''} onChange={(val) => setFormBio({...formBio, weeklyDuration: val})} step={10} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.weeklyDuration, "120")} /></div>
                            </div>
                        </div>
                    </div>
                 )}
              </div>

              <div className="px-5 pb-6 pt-4 mt-auto shrink-0 border-t border-dashed border-zinc-500/30">
                  <div className="flex gap-3">
                      <button onClick={() => setShowManualModal(false)} className={`w-1/3 py-3 rounded-xl font-bold body-lg ${t.textMuted} ${t.btnBg} active:scale-[0.98] transition-all`}>Batal</button>
                      <button onClick={handleSaveManualData} className={`flex-1 py-3 rounded-xl font-black body-lg text-white ${t.bgAccent} shadow-lg shadow-black/20 active:scale-[0.98] transition-all`}>Simpan</button>
                  </div>
              </div>
           </div>
        </div>
      ), document.body)}
    </>
  );
};

export default DashboardModals;
