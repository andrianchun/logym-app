import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, CalendarDays, Loader2, ShieldAlert, HeartPulse, Camera } from 'lucide-react';
import { playSoundEffect } from '../utils/audio';
import SwipeInput from './SwipeInput';
import { extractBiometricsFromImage } from '../utils/aiVision';

// --- IMPORT CAPACITOR & HEALTH CONNECT BARU ---
import { Capacitor } from '@capacitor/core';
import { HealthConnect } from 'capacitor-health-connect';

const DashboardModals = ({ 
  t, lang, showSyncModal, setShowSyncModal, connectedApps, handleToggleApp,
  showManualModal, setShowManualModal, manualTab, setManualTab, 
  modalDate, setModalDate, formBio, setFormBio, bioData,
  handleSaveManualData, handleDeleteBioData, soundEnabled, unitSystem, setConfirmModal,
  userGeminiApiKey
}) => {
  const isImp = unitSystem === 'imperial';

  const [authSim, setAuthSim] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  const handleAIScan = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsScanning(true);
      setScanError('');
      playSoundEffect('click', soundEnabled);

      try {
          // Kompres gambar menggunakan Canvas agar tidak melebihi limit 6MB Netlify Payload
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          img.src = objectUrl;

          img.onload = async () => {
              URL.revokeObjectURL(objectUrl);
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 2500;
              const MAX_HEIGHT = 2500;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                  if (width > MAX_WIDTH) {
                      height = Math.round(height * (MAX_WIDTH / width));
                      width = MAX_WIDTH;
                  }
              } else {
                  if (height > MAX_HEIGHT) {
                      width = Math.round(width * (MAX_HEIGHT / height));
                      height = MAX_HEIGHT;
                  }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);

              // Konversi ke base64 JPEG kualitas 80%
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              const base64Data = dataUrl.split(',')[1];
              const mimeType = 'image/jpeg';

              try {
                  const aiData = await extractBiometricsFromImage(base64Data, mimeType, userGeminiApiKey);
                  setFormBio(prev => {
                      const newBio = { ...prev };
                      // Basic Metrics
                      if (aiData.weight) newBio.weight = aiData.weight;
                      if (aiData.height) newBio.height = aiData.height;
                      if (aiData.bodyFat) newBio.bodyFat = aiData.bodyFat;
                      if (aiData.muscleMass) newBio.muscleMass = aiData.muscleMass;
                      // Detailed Body Composition
                      if (aiData.bmi) newBio.bmi = aiData.bmi;
                      if (aiData.boneMass) newBio.boneMass = aiData.boneMass;
                      if (aiData.musclePercent) newBio.musclePercent = aiData.musclePercent;
                      if (aiData.visceralFat) newBio.visceralFat = aiData.visceralFat;
                      if (aiData.waterPercent) newBio.waterPercent = aiData.waterPercent;
                      if (aiData.proteinPercent) newBio.proteinPercent = aiData.proteinPercent;
                      if (aiData.bmr) newBio.bmr = aiData.bmr;
                      if (aiData.bodyAge) newBio.bodyAge = aiData.bodyAge;
                      if (aiData.bodyScore) newBio.bodyScore = aiData.bodyScore;
                      if (aiData.bellyCircumference) newBio.bellyCircumference = aiData.bellyCircumference;

                      // Kalkulasi cerdas Tinggi <-> BMI jika salah satu hilang
                      if (newBio.weight && newBio.weight > 0) {
                          if (newBio.bmi && newBio.bmi > 0 && (!newBio.height || newBio.height === 0)) {
                              newBio.height = Math.round(Math.sqrt(newBio.weight / newBio.bmi) * 100);
                          } else if (newBio.height && newBio.height > 0 && (!newBio.bmi || newBio.bmi === 0)) {
                              newBio.bmi = Number((newBio.weight / Math.pow(newBio.height / 100, 2)).toFixed(1));
                          }
                      }
                      // Activity & Heart
                      if (aiData.steps) newBio.steps = aiData.steps;
                      if (aiData.activeMinutes) newBio.activeMinutes = aiData.activeMinutes;
                      if (aiData.activityCalories) newBio.activityCalories = aiData.activityCalories;
                      if (aiData.sleep) newBio.sleep = aiData.sleep;
                      if (aiData.energyScore) newBio.energyScore = aiData.energyScore;
                      if (aiData.heartRate) newBio.heartRate = aiData.heartRate;
                      if (aiData.minHeartRate) newBio.minHeartRate = aiData.minHeartRate;
                      if (aiData.maxHeartRate) newBio.maxHeartRate = aiData.maxHeartRate;
                      if (aiData.weeklySessions) newBio.weeklySessions = aiData.weeklySessions;
                      if (aiData.weeklyDuration) newBio.weeklyDuration = aiData.weeklyDuration;
                      if (aiData.bloodPressure) newBio.bloodPressure = aiData.bloodPressure;
                      return newBio;
                  });
                  playSoundEffect('success', soundEnabled);
              } catch (err) {
                  if (err.message === 'RATE_LIMIT_EXCEEDED') {
                      setScanError('Server penuh. Masukkan API Key pribadimu di Pengaturan untuk bypass limit.');
                  } else {

                      setScanError(err.message || 'Gagal membaca gambar');
                  }
              } finally {
                  setIsScanning(false);
              }
          };
          img.onerror = () => {
              setScanError('Gagal memuat gambar');
              setIsScanning(false);
          };
      } catch (err) {
          setScanError('Gagal memproses gambar: ' + err.message);
          setIsScanning(false);
      }
      e.target.value = '';
  };

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
                     <label className={`p-2 rounded-full ${isScanning ? 'bg-zinc-500/20 text-zinc-500' : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'} transition-colors cursor-pointer`} title="Scan Foto via AI">
                         {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                         <input type="file" accept="image/*" capture="environment" onChange={handleAIScan} className="hidden" disabled={isScanning} />
                     </label>
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

              <div className="mb-2 shrink-0 px-5">
                 <div className={`relative flex w-full p-1.5 rounded-full ${t.btnBg}`}>
                     <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: manualTab === 'komposisi' ? 'translateX(0)' : 'translateX(100%)', left: '6px' }}></div>
                     
                     <button onClick={() => setManualTab('komposisi')} className={`flex-1 py-2 rounded-full caption font-black relative z-10 transition-colors duration-300 ${manualTab === 'komposisi' ? 'text-white' : t.textMuted}`}>Komposisi Tubuh</button>
                     <button onClick={() => setManualTab('harian')} className={`flex-1 py-2 rounded-full caption font-black relative z-10 transition-colors duration-300 ${manualTab === 'harian' ? 'text-white' : t.textMuted}`}>Data Harian</button>
                 </div>
              </div>

              {scanError && (
                  <div className="mx-5 mb-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2">
                      <ShieldAlert size={16} className="text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-500 leading-tight">{scanError}</p>
                  </div>
              )}

              <div className="flex-1 overflow-hidden space-y-4 body-md pb-2 px-5 pt-0">
                 {manualTab === 'komposisi' ? (
                   <div className="grid grid-cols-2 gap-2.5">
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Berat Badan ({isImp ? 'lbs' : 'kg'})</label><SwipeInput language={lang?.id || 'ID'} value={formBio.weight === 0 ? '' : (isImp ? Math.round(formBio.weight * 2.20462 * 10)/10 : formBio.weight)} onChange={(val) => {
                             const wKg = isImp ? Number((val / 2.20462).toFixed(2)) : val;
                             let newBmi = formBio.bmi;
                             let newHeight = formBio.height;
                             if (newHeight > 0) newBmi = Number((wKg / Math.pow(newHeight / 100, 2)).toFixed(1));
                             else if (newBmi > 0) newHeight = Math.round(Math.sqrt(wKg / newBmi) * 100);
                             setFormBio({...formBio, weight: wKg, bmi: newBmi, height: newHeight});
                         }} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(isImp ? bioData?.weight * 2.20462 : bioData?.weight, isImp ? "154" : "70")} /></div>
                         
                         {isImp ? (
                             <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Tinggi Badan (ft & in)</label>
                                 <div className="grid grid-cols-2 gap-1.5">
                                     <div className="relative">
                                         <SwipeInput language={lang?.id || 'ID'} value={formBio.height === 0 ? '' : Math.floor(formBio.height / 30.48)} onChange={(val) => { const currentInches = formBio.height === 0 ? 0 : Math.round((formBio.height / 2.54) % 12); setFormBio({...formBio, height: Number((val * 30.48 + currentInches * 2.54).toFixed(2))}); }} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center pr-4`} placeholder="5" />
                                         <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold pointer-events-none">ft</span>
                                     </div>
                                     <div className="relative">
                                         <SwipeInput language={lang?.id || 'ID'} value={formBio.height === 0 ? '' : Math.round((formBio.height / 2.54) % 12)} onChange={(val) => { const currentFeet = formBio.height === 0 ? 0 : Math.floor(formBio.height / 30.48); setFormBio({...formBio, height: Number((currentFeet * 30.48 + val * 2.54).toFixed(2))}); }} step={1} min={0} max={11} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center pr-4`} placeholder="7" />
                                         <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold pointer-events-none">in</span>
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Tinggi Badan (cm)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.height === 0 ? '' : formBio.height} onChange={(val) => {
                                 let newBmi = formBio.bmi;
                                 if (formBio.weight > 0 && val > 0) {
                                     newBmi = Number((formBio.weight / Math.pow(val / 100, 2)).toFixed(1));
                                 }
                                 setFormBio({...formBio, height: val, bmi: newBmi});
                             }} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.height, "170")} /></div>
                         )}

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>BMI</label><SwipeInput language={lang?.id || 'ID'} value={formBio.bmi === 0 ? '' : formBio.bmi} onChange={(val) => {
                             let newHeight = formBio.height;
                             if (formBio.weight > 0 && val > 0 && (!formBio.height || formBio.height === 0)) {
                                 newHeight = Math.round(Math.sqrt(formBio.weight / val) * 100);
                             }
                             setFormBio({...formBio, bmi: val, height: newHeight});
                         }} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.bmi, "22.5")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Lingkar Perut ({isImp ? 'in' : 'cm'})</label><SwipeInput language={lang?.id || 'ID'} value={formBio.waist === 0 ? '' : (isImp ? Math.round(formBio.waist * 0.393701 * 10)/10 : formBio.waist)} onChange={(val) => setFormBio({...formBio, waist: isImp ? Number((val / 0.393701).toFixed(2)) : val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(isImp ? bioData?.waist * 0.393701 : bioData?.waist, isImp ? "31.5" : "80")} /></div>

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Massa Otot ({isImp ? 'lbs' : 'kg'})</label><SwipeInput language={lang?.id || 'ID'} value={formBio.muscleMass === 0 ? '' : (isImp ? Math.round(formBio.muscleMass * 2.20462 * 10)/10 : formBio.muscleMass)} onChange={(val) => setFormBio({...formBio, muscleMass: isImp ? Number((val / 2.20462).toFixed(2)) : val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(isImp ? bioData?.muscleMass * 2.20462 : bioData?.muscleMass, isImp ? "66" : "30")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Kadar Otot (%)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.musclePercent === 0 ? '' : formBio.musclePercent} onChange={(val) => setFormBio({...formBio, musclePercent: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.musclePercent, "40")} /></div>

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>BMR (kcal)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.bmr === 0 ? '' : formBio.bmr} onChange={(val) => setFormBio({...formBio, bmr: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.bmr, "1500")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Body Score (0-100)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.bodyScore === 0 ? '' : formBio.bodyScore} onChange={(val) => setFormBio({...formBio, bodyScore: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.bodyScore, "80")} /></div>

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Kadar Lemak (%)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.bodyFat === 0 ? '' : formBio.bodyFat} onChange={(val) => setFormBio({...formBio, bodyFat: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.bodyFat, "20")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Visceral Fat</label><SwipeInput language={lang?.id || 'ID'} value={formBio.visceralFat === 0 ? '' : formBio.visceralFat} onChange={(val) => setFormBio({...formBio, visceralFat: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.visceralFat, "5")} /></div>

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Kadar Protein (%)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.proteinPercent === 0 ? '' : formBio.proteinPercent} onChange={(val) => setFormBio({...formBio, proteinPercent: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.proteinPercent, "18")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Kadar Air (%)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.waterPercent === 0 ? '' : formBio.waterPercent} onChange={(val) => setFormBio({...formBio, waterPercent: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.waterPercent, "60")} /></div>

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Usia Sel Tubuh (th)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.bodyAge === 0 ? '' : formBio.bodyAge} onChange={(val) => setFormBio({...formBio, bodyAge: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.bodyAge, "25")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Massa Tulang ({isImp ? 'lbs' : 'kg'})</label><SwipeInput language={lang?.id || 'ID'} value={formBio.boneMass === 0 ? '' : (isImp ? Math.round(formBio.boneMass * 2.20462 * 10)/10 : formBio.boneMass)} onChange={(val) => setFormBio({...formBio, boneMass: isImp ? Number((val / 2.20462).toFixed(2)) : val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(isImp ? bioData?.boneMass * 2.20462 : bioData?.boneMass, isImp ? "6.6" : "3.0")} /></div>
                     </div>
                 ) : (
                    <div className="space-y-4">
                        {/* Group 1: General Activity */}
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={`block ${t.textMuted} mb-1`}>Langkah</label><SwipeInput language={lang?.id || 'ID'} value={formBio.steps || ''} onChange={(val) => setFormBio({...formBio, steps: val})} step={100} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.steps, "5000")} /></div>
                            <div><label className={`block ${t.textMuted} mb-1`}>Energy Score</label><SwipeInput language={lang?.id || 'ID'} value={formBio.energyScore || ''} onChange={(val) => setFormBio({...formBio, energyScore: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.energyScore, "80")} /></div>
                            <div><label className={`block ${t.textMuted} mb-1`}>Waktu Aktif (mnt)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.activeMinutes || ''} onChange={(val) => setFormBio({...formBio, activeMinutes: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.activeMinutes, "30")} /></div>
                            <div><label className={`block ${t.textMuted} mb-1`}>Kalori Aktif (kcal)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.activityCalories || ''} onChange={(val) => setFormBio({...formBio, activityCalories: val})} step={10} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.activityCalories, "300")} /></div>
                        </div>
                        
                        {/* Group 2: Tidur & Tensi (Swipeable) */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Tidur */}
                            <div>
                                <label className={`block ${t.textMuted} mb-1`}>Tidur (Jam/Menit)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <SwipeInput language={lang?.id || 'ID'} value={sleepH || ''} onChange={handleSleepH} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center pr-4`} placeholder={ph(lastSleepH, "7")} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold pointer-events-none">h</span>
                                    </div>
                                    <div className="relative">
                                        <SwipeInput language={lang?.id || 'ID'} value={sleepM || ''} onChange={handleSleepM} step={5} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center pr-4`} placeholder={ph(lastSleepM, "0")} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold pointer-events-none">m</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tensi */}
                            <div>
                                <label className={`block ${t.textMuted} mb-1`}>Tensi (Sys/Dia)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <SwipeInput language={lang?.id || 'ID'} value={bpSys || ''} onChange={handleBPSys} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(lastBpSys, "120")} />
                                    <SwipeInput language={lang?.id || 'ID'} value={bpDia || ''} onChange={handleBPDia} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(lastBpDia, "80")} />
                                </div>
                            </div>
                        </div>

                        {/* Group 3: Detak Jantung */}
                        <div>
                            <label className={`block ${t.textMuted} mb-1`}>Detak Jantung (Avg / Min / Max)</label>
                            <div className="grid grid-cols-3 gap-2">
                                <SwipeInput language={lang?.id || 'ID'} value={formBio.heartRate || ''} onChange={(val) => setFormBio({...formBio, heartRate: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.heartRate, "75")} />
                                <SwipeInput language={lang?.id || 'ID'} value={formBio.minHeartRate || ''} onChange={(val) => setFormBio({...formBio, minHeartRate: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.minHeartRate, "60")} />
                                <SwipeInput language={lang?.id || 'ID'} value={formBio.maxHeartRate || ''} onChange={(val) => setFormBio({...formBio, maxHeartRate: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.maxHeartRate, "100")} />
                            </div>
                        </div>

                        {/* Rekap Latihan Mingguan */}
                        <div className="mt-2 pt-4 border-t border-dashed border-zinc-700">
                            <span className={`block ${t.textAccent} mb-3 uppercase tracking-wider text-[10px] font-bold`}>Rekap Latihan Mingguan</span>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={`block ${t.textMuted} mb-1`}>Total Sesi (x)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.weeklySessions || ''} onChange={(val) => setFormBio({...formBio, weeklySessions: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.weeklySessions, "3")} /></div>
                                <div><label className={`block ${t.textMuted} mb-1`}>Durasi (Menit)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.weeklyDuration || ''} onChange={(val) => setFormBio({...formBio, weeklyDuration: val})} step={10} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-3 rounded-xl outline-none font-black text-center`} placeholder={ph(bioData?.weeklyDuration, "120")} /></div>
                            </div>
                        </div>
                    </div>
                 )}
              </div>

              <div className="px-5 pb-5 pt-2 mt-auto shrink-0">
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
