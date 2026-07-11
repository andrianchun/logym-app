import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, CalendarDays, Loader2, ShieldAlert, HeartPulse, Camera, Image as ImageIcon, Scan } from 'lucide-react';
import { playSoundEffect } from '../utils/audio';
import SwipeInput from './SwipeInput';
import { extractBiometricsFromImage } from '../utils/aiVision';
import { AI_MODELS, getProviderStatus } from '../utils/aiAgent';

// --- IMPORT CAPACITOR & HEALTH CONNECT BARU ---
import { Capacitor } from '@capacitor/core';
import { HealthConnect } from 'capacitor-health-connect';

const DashboardModals = ({ 
  t, lang, theme,
  showManualModal, setShowManualModal, manualTab, setManualTab, 
  modalDate, setModalDate, formBio, setFormBio, bioData,
  handleSaveManualData, handleDeleteBioData, soundEnabled, units, setConfirmModal,
  userApiKeys, aiProvider, aiModel, setKeyStatuses, setShowSettings, keyStatuses
}) => {
  const isImp = units?.weight === 'lbs';

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);

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

              const currentProvider = AI_MODELS.find(m => m.id === aiModel)?.provider || aiProvider;
              const status = getProviderStatus(currentProvider, userApiKeys, keyStatuses || {});
              
              if (status === 'missing' || status === 'exhausted') {
                  alert(`API Key untuk ${currentProvider} ${status === 'missing' ? 'tidak ditemukan' : 'telah mencapai limit'}. Silakan perbarui di menu Pengaturan (Settings).`);
                  if (setShowSettings) setShowSettings('lanjutan');
                  return;
              }

              try {
                  const aiData = await extractBiometricsFromImage(base64Data, mimeType, userApiKeys, currentProvider, aiModel, setKeyStatuses);
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
                  setScanSuccess(true);
                  setTimeout(() => setScanSuccess(false), 2500);
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
                 <div className="flex space-x-2 relative">
                     <label className={`p-2 rounded-full ${isScanning ? 'bg-zinc-500/20 text-zinc-500' : scanSuccess ? 'bg-green-500/20 text-green-500' : `${t.btnBg} ${t.textAccent} hover:brightness-110`} transition-all cursor-pointer shadow-sm relative z-10`} title="Kamera">
                         {isScanning ? <Loader2 size={16} className="animate-spin" /> : scanSuccess ? <Check size={16} /> : <Camera size={16} />}
                         <input type="file" accept="image/*" capture="environment" onChange={handleAIScan} className="hidden" disabled={isScanning || scanSuccess} />
                     </label>
                     <label className={`p-2 rounded-full ${isScanning ? 'bg-zinc-500/20 text-zinc-500' : scanSuccess ? 'bg-green-500/20 text-green-500' : `${t.btnBg} ${t.textAccent} hover:brightness-110`} transition-all cursor-pointer shadow-sm relative z-10`} title="Galeri">
                         {isScanning ? <Loader2 size={16} className="animate-spin" /> : scanSuccess ? <Check size={16} /> : <ImageIcon size={16} />}
                         <input type="file" accept="image/*" onChange={handleAIScan} className="hidden" disabled={isScanning || scanSuccess} />
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
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Berat Badan ({units?.weight || 'kg'})</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.weight ? '' : (isImp ? Math.round(formBio.weight * 2.20462 * 10)/10 : formBio.weight)} onChange={(val) => {
                             const wKg = isImp ? Number((val / 2.20462).toFixed(2)) : val;
                             let newBmi = formBio.bmi;
                             if (formBio.height > 0) newBmi = Number((wKg / Math.pow(formBio.height / 100, 2)).toFixed(1));
                             setFormBio({...formBio, weight: wKg, bmi: newBmi});
                         }} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(isImp ? bioData?.weight * 2.20462 : bioData?.weight, isImp ? "154" : "70")} /></div>
                         
                         {isImp ? (
                             <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Tinggi Badan (ft & in)</label>
                                 <div className="grid grid-cols-2 gap-1.5">
                                     <div className="relative">
                                         <SwipeInput language={lang?.id || 'ID'} value={!formBio.height ? '' : Math.floor(formBio.height / 30.48)} onChange={(val) => { const currentInches = !formBio.height ? 0 : Math.round((formBio.height / 2.54) % 12); const newHeight = Number((val * 30.48 + currentInches * 2.54).toFixed(2)); const newBmi = (formBio.weight > 0 && newHeight > 0) ? Number((formBio.weight / Math.pow(newHeight / 100, 2)).toFixed(1)) : formBio.bmi; setFormBio({...formBio, height: newHeight, bmi: newBmi}); }} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center pr-4`} placeholder="5" />
                                         <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold pointer-events-none">ft</span>
                                     </div>
                                     <div className="relative">
                                         <SwipeInput language={lang?.id || 'ID'} value={!formBio.height ? '' : Math.round((formBio.height / 2.54) % 12)} onChange={(val) => { const currentFeet = !formBio.height ? 0 : Math.floor(formBio.height / 30.48); const newHeight = Number((currentFeet * 30.48 + val * 2.54).toFixed(2)); const newBmi = (formBio.weight > 0 && newHeight > 0) ? Number((formBio.weight / Math.pow(newHeight / 100, 2)).toFixed(1)) : formBio.bmi; setFormBio({...formBio, height: newHeight, bmi: newBmi}); }} step={1} min={0} max={11} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center pr-4`} placeholder="7" />
                                         <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold pointer-events-none">in</span>
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Tinggi Badan (cm)</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.height ? '' : formBio.height} onChange={(val) => {
                                 let newBmi = formBio.bmi;
                                 if (formBio.weight > 0 && val > 0) {
                                     newBmi = Number((formBio.weight / Math.pow(val / 100, 2)).toFixed(1));
                                 }
                                 setFormBio({...formBio, height: val, bmi: newBmi});
                             }} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.height, "170")} /></div>
                         )}

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>BMI</label><input readOnly value={formBio.bmi || ''} className={`w-full bg-black/5 dark:bg-black/30 ${t.textMuted} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder="-" /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Lingkar Perut ({isImp ? 'in' : 'cm'})</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.waist ? '' : (isImp ? Math.round(formBio.waist * 0.393701 * 10)/10 : formBio.waist)} onChange={(val) => setFormBio({...formBio, waist: isImp ? Number((val / 0.393701).toFixed(2)) : val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(isImp ? bioData?.waist * 0.393701 : bioData?.waist, isImp ? "31.5" : "80")} /></div>

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Massa Otot ({isImp ? 'lbs' : 'kg'})</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.muscleMass ? '' : (isImp ? Math.round(formBio.muscleMass * 2.20462 * 10)/10 : formBio.muscleMass)} onChange={(val) => setFormBio({...formBio, muscleMass: isImp ? Number((val / 2.20462).toFixed(2)) : val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(isImp ? bioData?.muscleMass * 2.20462 : bioData?.muscleMass, isImp ? "66" : "30")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Kadar Otot (%)</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.musclePercent ? '' : formBio.musclePercent} onChange={(val) => setFormBio({...formBio, musclePercent: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.musclePercent, "40")} /></div>



                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Kadar Lemak (%)</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.bodyFat ? '' : formBio.bodyFat} onChange={(val) => setFormBio({...formBio, bodyFat: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.bodyFat, "20")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Visceral Fat</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.visceralFat ? '' : formBio.visceralFat} onChange={(val) => setFormBio({...formBio, visceralFat: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.visceralFat, "5")} /></div>

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Kadar Protein (%)</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.proteinPercent ? '' : formBio.proteinPercent} onChange={(val) => setFormBio({...formBio, proteinPercent: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.proteinPercent, "18")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Kadar Air (%)</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.waterPercent ? '' : formBio.waterPercent} onChange={(val) => setFormBio({...formBio, waterPercent: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.waterPercent, "60")} /></div>

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Usia Sel Tubuh (th)</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.bodyAge ? '' : formBio.bodyAge} onChange={(val) => setFormBio({...formBio, bodyAge: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.bodyAge, "25")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Mineral Tulang (%)</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.boneMass ? '' : formBio.boneMass} onChange={(val) => setFormBio({...formBio, boneMass: val})} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.boneMass, "5.5")} /></div>

                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>BMR (kcal)</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.bmr ? '' : formBio.bmr} onChange={(val) => setFormBio({...formBio, bmr: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.bmr, "1500")} /></div>
                         <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Body Score (0-100)</label><SwipeInput language={lang?.id || 'ID'} value={!formBio.bodyScore ? '' : formBio.bodyScore} onChange={(val) => setFormBio({...formBio, bodyScore: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.bodyScore, "80")} /></div>
                     </div>
                 ) : (
                    <div className="space-y-4">
                        {/* Group 1: Langkah, Durasi Aktif, Kalori Makanan, Kalori Dibakar (urutan sesuai kartu) */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Langkah</label><SwipeInput language={lang?.id || 'ID'} value={formBio.steps || ''} onChange={(val) => setFormBio({...formBio, steps: val})} step={100} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.steps, "5000")} /></div>
                            <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Durasi Aktif (mnt)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.activeMinutes || ''} onChange={(val) => setFormBio({...formBio, activeMinutes: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.activeMinutes, "30")} /></div>
                            <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Kalori Makanan (kcal)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.nutritionCalories || ''} onChange={(val) => setFormBio({...formBio, nutritionCalories: val})} step={10} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.nutritionCalories, "2000")} /></div>
                            <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Kalori Dibakar (kcal)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.activityCalories || ''} onChange={(val) => setFormBio({...formBio, activityCalories: val})} step={10} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.activityCalories, "300")} /></div>
                        </div>

                        {/* Group 2: Durasi Tidur & Skor Energi */}
                        <div className="grid grid-cols-2 gap-2.5">
                            {/* Tidur */}
                            <div>
                                <label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Tidur (Jam/Menit)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <SwipeInput language={lang?.id || 'ID'} value={sleepH || ''} onChange={handleSleepH} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center pr-4`} placeholder={ph(lastSleepH, "7")} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold pointer-events-none">h</span>
                                    </div>
                                    <div className="relative">
                                        <SwipeInput language={lang?.id || 'ID'} value={sleepM || ''} onChange={handleSleepM} step={5} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center pr-4`} placeholder={ph(lastSleepM, "0")} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold pointer-events-none">m</span>
                                    </div>
                                </div>
                            </div>

                            {/* Skor Energi */}
                            <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Energy Score</label><SwipeInput language={lang?.id || 'ID'} value={formBio.energyScore || ''} onChange={(val) => setFormBio({...formBio, energyScore: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.energyScore, "80")} /></div>
                        </div>

                        {/* Group 3: Tensi */}
                        <div>
                            <label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Tensi (Sys/Dia)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <SwipeInput language={lang?.id || 'ID'} value={bpSys || ''} onChange={handleBPSys} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(lastBpSys, "120")} />
                                <SwipeInput language={lang?.id || 'ID'} value={bpDia || ''} onChange={handleBPDia} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(lastBpDia, "80")} />
                            </div>
                        </div>

                        {/* Group 4: Detak Jantung (Avg / Min / Max) */}
                        <div>
                            <label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>Detak Jantung (Avg / Min / Max)</label>
                            <div className="grid grid-cols-3 gap-2">
                                <SwipeInput language={lang?.id || 'ID'} value={formBio.heartRate || ''} onChange={(val) => setFormBio({...formBio, heartRate: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.heartRate, "75")} />
                                <SwipeInput language={lang?.id || 'ID'} value={formBio.minHeartRate || ''} onChange={(val) => setFormBio({...formBio, minHeartRate: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.minHeartRate, "60")} />
                                <SwipeInput language={lang?.id || 'ID'} value={formBio.maxHeartRate || ''} onChange={(val) => setFormBio({...formBio, maxHeartRate: val})} step={1} min={0} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.maxHeartRate, "100")} />
                            </div>
                        </div>

                        {/* Group 5: SpO2 */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div><label className={`block ${t.textMuted} text-xs mb-0.5 truncate`}>SpO2 (%)</label><SwipeInput language={lang?.id || 'ID'} value={formBio.oxygenSaturation || ''} onChange={(val) => setFormBio({...formBio, oxygenSaturation: val})} step={1} min={0} max={100} soundEnabled={soundEnabled} className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} py-2 px-3 rounded-lg outline-none font-bold text-sm text-center`} placeholder={ph(bioData?.oxygenSaturation, "98")} /></div>
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
