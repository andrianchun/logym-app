export const equipmentOptions = ["Assisted", "Band", "Barbell", "Body Weight", "Bosu Ball", "Cable", "Dumbbell", "Elliptical Machine", "EZ Barbell", "Hammer", "Kettlebell", "Leverage Machine", "Machine", "Medicine Ball", "Olympic Barbell", "Resistance Band", "Roller", "Rope", "Rowing Machine", "Skierg", "Sled Machine", "Smith Machine", "Stability Ball", "Stationary Bike", "Stepmill Machine", "Tire", "Trap Bar", "Treadmill", "Upper Body Ergometer", "Weighted", "Wheel Roller", "Lainnya"];
export const levelOptions = ["beginner", "intermediate", "advanced"];

export const exerciseTypeLabels = {
  weight: 'Beban & Repetisi',
  reps: 'Repetisi',
  time: 'Durasi',
  cardio: 'Kardio (Jarak & Waktu)',
};

export const defaultMasterExercises = [
  { id: 101, name: 'Smith Machine Incline Bench Press', target: ['Dada Atas', 'Deltoid Depan', 'Triceps'], type: 'weight', defaultWeight: 10, equipment: 'Smith Machine', level: 'intermediate', ytVideo: 'https://youtu.be/VXaBbUYMfIs?si=pOB-MkazqZiMP_KX' },
  { id: 102, name: 'Cable Seated Row', target: ['Punggung Atas', 'Biceps'], type: 'weight', defaultWeight: 10, equipment: 'Cable', level: 'beginner', ytVideo: 'https://youtu.be/qD1WZ5pSuvk?si=JbbritEwFpnqjPHz' },
  { id: 103, name: 'Flat Dumbbell Bench Press', target: ['Dada Tengah', 'Triceps'], type: 'weight', defaultWeight: 10, equipment: 'Dumbbell', level: 'beginner', ytVideo: 'https://youtu.be/WbCEvFA0NJs?si=n6uJrVnL8SbZLnii' },
  { id: 104, name: 'Cable Lateral Raise', target: ['Deltoid Samping'], type: 'weight', defaultWeight: 20, equipment: 'Cable', level: 'beginner', ytVideo: 'https://youtu.be/9ilIKuy6B0g?si=d4LHAcUC86am2QQA' },
  { id: 105, name: 'Cable Triceps Pushdown', target: ['Triceps'], type: 'weight', defaultWeight: 20, equipment: 'Cable', level: 'beginner', ytVideo: 'https://youtu.be/1FjkhpZsaxc?si=UF5-0LJTCd_pEhy3 https://youtu.be/u36jNfqh8_U?si=AEMeWXqnBvpOWNOj https://youtu.be/9qupVR7pKtk?si=FtLIHZmKuqXcK0ne' },
  { id: 106, name: 'Dumbbell Biceps Curl', target: ['Biceps'], type: 'weight', defaultWeight: 20, equipment: 'Dumbbell', level: 'beginner', ytVideo: 'https://youtu.be/MKWBV29S6c0?si=JV1BM77vAR6VuQYG https://youtu.be/_aoad2yuP5w?si=PRXDFoozz45AB_VO' },
  { id: 107, name: 'Cardio', target: ['Cardio'], type: 'cardio', defaultWeight: 0, duration: 15, equipment: 'Stationary Bike', level: 'beginner', ytVideo: '' },
  { id: 108, name: 'Smith Machine Squat', target: ['Quads', 'Hams', 'Glutes'], type: 'weight', defaultWeight: 0, equipment: 'Smith Machine', level: 'intermediate', ytVideo: 'https://youtu.be/iKCJCydYYrE?si=ICtqLU9ov9eFaHfL https://youtu.be/LwsG-1xgP2E?si=Ptr7dUVcsJFKMLYC' },
  { id: 109, name: 'Romanian Deadlift (RDL)', target: ['Hams', 'Glutes'], type: 'weight', defaultWeight: 5, equipment: 'Barbell', level: 'intermediate', ytVideo: 'https://youtu.be/xY8BywOKkLQ?si=B1A9ulZ-Cz67GNw6' },
  { id: 110, name: 'Dumbbell Walking Lunges', target: ['Quads', 'Hams', 'Glutes'], type: 'weight', defaultWeight: 5, equipment: 'Dumbbell', level: 'intermediate', ytVideo: 'https://youtu.be/mJilHWIBWO8?si=2NCYOofB0EUrY22X' },
  { id: 111, name: 'Standing Calf Raise', target: ['Calves'], type: 'weight', defaultWeight: 10, equipment: 'Machine', level: 'beginner', ytVideo: 'https://youtu.be/wdOkFomQNp8?si=PWlxiKYPBMlfLoek' },
  { id: 112, name: 'Cable Crunch', target: ['Core'], type: 'weight', defaultWeight: 40, equipment: 'Cable', level: 'intermediate', ytVideo: 'https://youtu.be/K2m0jj6RfYg?si=CZMLt6PF0Yxvgb6V' },
  { id: 113, name: 'Lat Pulldown', target: ['Lats', 'Biceps'], type: 'weight', defaultWeight: 40, equipment: 'Machine', level: 'beginner', ytVideo: 'https://youtu.be/bNmvKpJSWKM?si=E7zZ3a3qeG4Ij7bb https://youtu.be/7Cjc_aXoQ_I?si=ZqhPV5iSMoTOLSIf' },
  { id: 114, name: 'Dumbbell Shoulder Press', target: ['Deltoid Depan', 'Triceps'], type: 'weight', defaultWeight: 5, equipment: 'Dumbbell', level: 'intermediate', ytVideo: 'https://youtu.be/k6tzKisR3NY?si=g67rT52vc6oWjiFC https://youtu.be/E7ngsffMPR0?si=FJGsgUxb7aoAZ_ub' },
  { id: 124, name: 'Dumbbell Shrug', target: ['Traps', 'Leher'], type: 'weight', defaultWeight: 15, equipment: 'Dumbbell', level: 'beginner', ytVideo: 'https://youtu.be/rFsSeClGnNA?si=EfUCHpJdjSbWFObO https://youtu.be/2BrmhGze7sk?si=PSt1tUQjaI2liYby' },
  { id: 115, name: 'SM Flat Bench Press', target: ['Dada Tengah', 'Triceps'], type: 'weight', defaultWeight: 7.5, equipment: 'Smith Machine', level: 'beginner', ytVideo: 'https://youtu.be/gQ3afio08V8?si=DfCKjmSAhUMXjMl_' },
  { id: 116, name: 'Cross Cable Rear Delt', target: ['Deltoid Belakang'], type: 'weight', defaultWeight: 5, equipment: 'Cable', level: 'advanced', ytVideo: 'https://youtu.be/cGXBVOc5xIk?si=ve9zzcNdiyNqYF5I https://youtu.be/IeOqdw9WI90?si=J4oHxFNn7257r3ak' },
  { id: 117, name: 'Overhead Cable Triceps Extension', target: ['Triceps'], type: 'weight', defaultWeight: 40, equipment: 'Cable', level: 'intermediate', ytVideo: 'https://youtu.be/9Ark9S11uXw?si=pEAe5tf66v5yUToU https://youtu.be/NTk0Igxqcsk?si=zX7dHQL0VyHURoC_' },
  { id: 118, name: 'Biceps Cable Curl', target: ['Biceps'], type: 'weight', defaultWeight: 30, equipment: 'Cable', level: 'beginner', ytVideo: 'https://youtu.be/CrbTqNOlFgE?si=xKanrhppuvUAudTj' },
  { id: 119, name: 'DB Bulgarian Split Squat', target: ['Quads', 'Hams', 'Glutes'], type: 'weight', defaultWeight: 30, equipment: 'Dumbbell', level: 'advanced', ytVideo: 'https://youtu.be/or1frhkjBDc?si=FR7v-hKp_QP4-Rpn' },
  { id: 120, name: 'SM Romanian Deadlift (RDL)', target: ['Hams', 'Glutes'], type: 'weight', defaultWeight: 20, equipment: 'Smith Machine', level: 'beginner', ytVideo: 'https://youtu.be/xWnlfJaQZ3k?si=z0FRk3rh4UO7JdUC' },
  { id: 121, name: 'Cable Pull-Through', target: ['Hams', 'Glutes'], type: 'weight', defaultWeight: 20, equipment: 'Cable', level: 'intermediate', ytVideo: 'https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G' },
  { id: 122, name: 'Seated Dumbbell Calf Raise', target: ['Calves'], type: 'weight', defaultWeight: 30, equipment: 'Dumbbell', level: 'beginner', ytVideo: 'https://youtu.be/ar8nav0jGoE?si=owieb0xbPHFg7zMA' },
  // PENTING: `duration` untuk type 'time' satuannya DETIK (diseed ke set.d), sedangkan untuk
  // type 'cardio' satuannya MENIT. Nilai lama di sini ditulis seolah menit (Plank 1, Pilates 20,
  // Yoga 10) sehingga hitung mundurnya jadi 1 detik. Sudah dikonversi ke detik.
  { id: 123, name: 'Plank', target: ['Core'], type: 'time', defaultWeight: 0, duration: 30, equipment: 'Body Weight', level: 'beginner', ytVideo: 'https://youtu.be/xe2MXatLTUw?si=U5L4UwgiNv19R7lh' },
  { id: 125, name: 'Dumbbell Wrist Curl', target: ['Forearm'], type: 'weight', defaultWeight: 5, equipment: 'Dumbbell', level: 'beginner', ytVideo: 'https://youtu.be/0-c4s051u6E?si=K-4Z9iKq2d8r0N1M' },
  { id: 126, name: 'Treadmill Running', target: ['Cardio'], type: 'cardio', defaultWeight: 0, duration: 15, equipment: 'Treadmill', level: 'beginner', ytVideo: '' },
  { id: 127, name: 'Stationary Bike', target: ['Cardio'], type: 'cardio', defaultWeight: 0, duration: 15, equipment: 'Stationary Bike', level: 'beginner', ytVideo: '' },
  { id: 128, name: 'Aerobic', target: ['Cardio'], type: 'cardio', defaultWeight: 0, duration: 20, equipment: 'Body Weight', level: 'beginner', ytVideo: '' },
  { id: 129, name: 'HIIT', target: ['Cardio', 'Core'], type: 'cardio', defaultWeight: 0, duration: 15, equipment: 'Body Weight', level: 'advanced', ytVideo: '' },
  { id: 130, name: 'Pilates', target: ['Core'], type: 'time', defaultWeight: 0, duration: 1200, equipment: 'Body Weight', level: 'intermediate', ytVideo: '' },
  { id: 131, name: 'Yoga / Relaksasi', target: ['Core'], type: 'time', defaultWeight: 0, duration: 600, equipment: 'Body Weight', level: 'beginner', ytVideo: '' },
  { id: 132, name: 'Elliptical', target: ['Cardio'], type: 'cardio', defaultWeight: 0, duration: 15, equipment: 'Elliptical Machine', level: 'beginner', ytVideo: '' },
  { id: 133, name: 'Jump Rope', target: ['Cardio'], type: 'cardio', defaultWeight: 0, duration: 5, equipment: 'Rope', level: 'intermediate', ytVideo: '' },
  { id: 134, name: 'Dumbbell Goblet Squat', target: ['Quads', 'Glutes'], type: 'weight', defaultWeight: 10, equipment: 'Dumbbell', level: 'beginner', ytVideo: 'https://youtu.be/MeIiIdhgPgl' },
  { id: 135, name: 'Barbell Bench Press', target: ['Dada Tengah', 'Triceps', 'Deltoid Depan'], type: 'weight', defaultWeight: 20, equipment: 'Barbell', level: 'intermediate', ytVideo: 'https://youtu.be/rT7DgCr-3pg' },
  { id: 136, name: 'Swimming (Renang)', target: ['Cardio', 'Core', 'Lats'], type: 'cardio', defaultWeight: 0, duration: 30, equipment: 'Pool', level: 'intermediate', ytVideo: '' },
  { id: 137, name: 'Jogging / Running', target: ['Cardio', 'Quads', 'Calves'], type: 'cardio', defaultWeight: 0, duration: 20, equipment: 'Body Weight', level: 'beginner', ytVideo: '' },
  { id: 138, name: 'Walking / Jalan Kaki', target: ['Cardio'], type: 'cardio', defaultWeight: 0, duration: 30, equipment: 'Body Weight', level: 'beginner', ytVideo: '' },
  { id: 139, name: 'Cycling / Sepeda', target: ['Cardio', 'Quads'], type: 'cardio', defaultWeight: 0, duration: 30, equipment: 'Bicycle', level: 'beginner', ytVideo: '' }
];

export const defaultPrograms = [
  { id: 'prog-1', planId: 'custom', planName: 'Program Default', assignedDays: ['Sel'], name: 'Upper 1', exercises: [ { id: 101, name: 'Smith Machine Incline Bench Press', sets: 4, reps: 12, target: ['Dada Atas', 'Deltoid Depan', 'Triceps'], type: 'weight', defaultWeight: 10, equipment: 'Smith Machine', ytVideo: 'https://youtu.be/VXaBbUYMfIs?si=pOB-MkazqZiMP_KX' }, { id: 102, name: 'Cable Seated Row', sets: 4, reps: 12, target: ['Punggung Atas', 'Biceps'], type: 'weight', defaultWeight: 10, equipment: 'Cable', ytVideo: 'https://youtu.be/qD1WZ5pSuvk?si=JbbritEwFpnqjPHz' }, { id: 103, name: 'Flat Dumbbell Bench Press', sets: 3, reps: 12, target: ['Dada Tengah', 'Triceps'], type: 'weight', defaultWeight: 10, equipment: 'Dumbbell', ytVideo: 'https://youtu.be/WbCEvFA0NJs?si=n6uJrVnL8SbZLnii' }, { id: 104, name: 'Cable Lateral Raise', sets: 3, reps: 12, target: ['Deltoid Samping'], type: 'weight', defaultWeight: 20, equipment: 'Cable', ytVideo: 'https://youtu.be/9ilIKuy6B0g?si=d4LHAcUC86am2QQA' }, { id: 105, name: 'Cable Triceps Pushdown', sets: 3, reps: 10, target: ['Triceps'], type: 'weight', defaultWeight: 20, equipment: 'Cable', ytVideo: 'https://youtu.be/1FjkhpZsaxc?si=UF5-0LJTCd_pEhy3 https://youtu.be/u36jNfqh8_U?si=AEMeWXqnBvpOWNOj https://youtu.be/9qupVR7pKtk?si=FtLIHZmKuqXcK0ne' }, { id: 106, name: 'Dumbbell Biceps Curl', sets: 3, reps: 10, target: ['Biceps'], type: 'weight', defaultWeight: 20, equipment: 'Dumbbell', ytVideo: 'https://youtu.be/MKWBV29S6c0?si=JV1BM77vAR6VuQYG https://youtu.be/_aoad2yuP5w?si=PRXDFoozz45AB_VO' }, { id: 107, name: 'Cardio', sets: 1, reps: 0, duration: 15, target: ['Cardio'], type: 'cardio', defaultWeight: 0, equipment: 'Stationary Bike', ytVideo: '' }, ] },
  { id: 'prog-2', planId: 'custom', planName: 'Program Default', assignedDays: ['Rab'], name: 'Lower 1', exercises: [ { id: 108, name: 'Smith Machine Squat', sets: 3, reps: 10, target: ['Quads', 'Hams', 'Glutes'], type: 'weight', defaultWeight: 0, equipment: 'Smith Machine', ytVideo: 'https://youtu.be/iKCJCydYYrE?si=ICtqLU9ov9eFaHfL https://youtu.be/LwsG-1xgP2E?si=Ptr7dUVcsJFKMLYC' }, { id: 109, name: 'Romanian Deadlift (RDL)', sets: 4, reps: 12, target: ['Hams', 'Glutes'], type: 'weight', defaultWeight: 5, equipment: 'Barbell', ytVideo: 'https://youtu.be/xY8BywOKkLQ?si=B1A9ulZ-Cz67GNw6' }, { id: 110, name: 'Dumbbell Walking Lunges', sets: 3, reps: 12, target: ['Quads', 'Hams', 'Glutes'], type: 'weight', defaultWeight: 5, equipment: 'Dumbbell', ytVideo: 'https://youtu.be/mJilHWIBWO8?si=2NCYOofB0EUrY22X' }, { id: 111, name: 'Standing Calf Raise', sets: 4, reps: 12, target: ['Calves'], type: 'weight', defaultWeight: 10, equipment: 'Machine', ytVideo: 'https://youtu.be/wdOkFomQNp8?si=PWlxiKYPBMlfLoek' }, { id: 112, name: 'Cable Crunch', sets: 4, reps: 20, target: ['Core'], type: 'weight', defaultWeight: 40, equipment: 'Cable', ytVideo: 'https://youtu.be/K2m0jj6RfYg?si=CZMLt6PF0Yxvgb6V' }, ] },
  { id: 'prog-3', planId: 'custom', planName: 'Program Default', assignedDays: ['Jum'], name: 'Upper 2', exercises: [ { id: 113, name: 'Lat Pulldown', sets: 4, reps: 12, target: ['Lats', 'Biceps'], type: 'weight', defaultWeight: 40, equipment: 'Machine', ytVideo: 'https://youtu.be/bNmvKpJSWKM?si=E7zZ3a3qeG4Ij7bb https://youtu.be/7Cjc_aXoQ_I?si=ZqhPV5iSMoTOLSIf' }, { id: 114, name: 'Dumbbell Shoulder Press', sets: 4, reps: 12, target: ['Deltoid Depan', 'Triceps'], type: 'weight', defaultWeight: 5, equipment: 'Dumbbell', ytVideo: 'https://youtu.be/k6tzKisR3NY?si=g67rT52vc6oWjiFC https://youtu.be/E7ngsffMPR0?si=FJGsgUxb7aoAZ_ub' }, { id: 124, name: 'Dumbbell Shrug', sets: 4, reps: 12, target: ['Traps', 'Leher'], type: 'weight', defaultWeight: 15, equipment: 'Dumbbell', ytVideo: 'https://youtu.be/rFsSeClGnNA?si=EfUCHpJdjSbWFObO https://youtu.be/2BrmhGze7sk?si=PSt1tUQjaI2liYby' }, { id: 115, name: 'SM Flat Bench Press', sets: 3, reps: 12, target: ['Dada Tengah', 'Triceps'], type: 'weight', defaultWeight: 7.5, equipment: 'Smith Machine', ytVideo: 'https://youtu.be/gQ3afio08V8?si=DfCKjmSAhUMXjMl_' }, { id: 116, name: 'Cross Cable Rear Delt', sets: 4, reps: 12, target: ['Deltoid Belakang'], type: 'weight', defaultWeight: 5, equipment: 'Cable', ytVideo: 'https://youtu.be/cGXBVOc5xIk?si=ve9zzcNdiyNqYF5I https://youtu.be/IeOqdw9WI90?si=J4oHxFNn7257r3ak' }, { id: 117, name: 'Overhead Cable Triceps Extension', sets: 3, reps: 12, target: ['Triceps'], type: 'weight', defaultWeight: 40, equipment: 'Cable', ytVideo: 'https://youtu.be/9Ark9S11uXw?si=pEAe5tf66v5yToU https://youtu.be/NTk0Igxqcsk?si=zX7dHQL0VyHURoC_' }, { id: 118, name: 'Biceps Cable Curl', sets: 3, reps: 12, target: ['Biceps'], type: 'weight', defaultWeight: 30, equipment: 'Cable', ytVideo: 'https://youtu.be/CrbTqNOlFgE?si=xKanrhppuvUAudTj' }, { id: 125, name: 'Dumbbell Wrist Curl', sets: 3, reps: 15, target: ['Forearm'], type: 'weight', defaultWeight: 5, equipment: 'Dumbbell', ytVideo: 'https://youtu.be/0-c4s051u6E?si=K-4Z9iKq2d8r0N1M' }, ] },
  { id: 'prog-4', planId: 'custom', planName: 'Program Default', assignedDays: ['Min'], name: 'Lower 2', exercises: [ { id: 119, name: 'DB Bulgarian Split Squat', sets: 3, reps: 10, target: ['Quads', 'Hams', 'Glutes'], type: 'weight', defaultWeight: 30, equipment: 'Dumbbell', ytVideo: 'https://youtu.be/or1frhkjBDc?si=FR7v-hKp_QP4-Rpn' }, { id: 120, name: 'SM Romanian Deadlift (RDL)', sets: 4, reps: 12, target: ['Hams', 'Glutes'], type: 'weight', defaultWeight: 20, equipment: 'Smith Machine', ytVideo: 'https://youtu.be/xWnlfJaQZ3k?si=z0FRk3rh4UO7JdUC' }, { id: 121, name: 'Cable Pull-Through', sets: 3, reps: 12, target: ['Hams', 'Glutes'], type: 'weight', defaultWeight: 20, equipment: 'Cable', ytVideo: 'https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G' }, { id: 122, name: 'Seated Dumbbell Calf Raise', sets: 4, reps: 20, target: ['Calves'], type: 'weight', defaultWeight: 30, equipment: 'Dumbbell', ytVideo: 'https://youtu.be/ar8nav0jGoE?si=owieb0xbPHFg7zMA' }, { id: 123, name: 'Plank', sets: 3, duration: 30, reps: 0, target: ['Core'], type: 'time', defaultWeight: 0, equipment: 'Body Weight', ytVideo: 'https://youtu.be/xe2MXatLTUw?si=U5L4UwgiNv19R7lh' }, ] }
];

export const defaultWarmupVideos = "https://youtu.be/_6-k5-w1bZw https://youtu.be/khOmp34A_tA https://youtu.be/9UYVecB2_08";
export const defaultCooldownVideos = "https://youtu.be/NUIMZ4IcBy8 https://youtu.be/YQAkbKxJnaQ";

export const muscleDictionary = {
  'chest_upper': { EN: 'Upper Chest', ID: 'Dada Atas' },
  'chest_mid': { EN: 'Mid Chest', ID: 'Dada Tengah' },
  'chest_lower': { EN: 'Lower Chest', ID: 'Dada Bwh' },
  'back_upper': { EN: 'Upper Back', ID: 'Punggung Atas' },
  'lats': { EN: 'Lats', ID: 'Punggung Bwh' },
  'deltoid_front': { EN: 'Front Delt', ID: 'Bahu Dpn' },
  'deltoid_lateral': { EN: 'Lateral Delt', ID: 'Bahu Samping' },
  'deltoid_rear': { EN: 'Rear Delt', ID: 'Bahu Blk' },
  'trapezius': { EN: 'Traps', ID: 'Traps' },
  'neck': { EN: 'Neck', ID: 'Leher' },
  'biceps': { EN: 'Biceps', ID: 'Biceps' },
  'triceps': { EN: 'Triceps', ID: 'Triceps' },
  'forearm': { EN: 'Forearm', ID: 'Lengan Bawah' },
  'quadriceps': { EN: 'Quads', ID: 'Paha Dpn' },
  'hamstring': { EN: 'Hamstrings', ID: 'Paha Blk' },
  'glutes': { EN: 'Glutes', ID: 'Bokong' },
  'adductors': { EN: 'Adductors', ID: 'Paha Dlm' },
  'abductors': { EN: 'Abductors', ID: 'Paha Luar' },
  'calves': { EN: 'Calves', ID: 'Betis' },
  'core': { EN: 'Core / Abs', ID: 'Perut / Core' },
  'cardio': { EN: 'Cardio', ID: 'Kardio' },
  'full_body': { EN: 'Full Body', ID: 'Seluruh Tubuh' }
};

export const muscleOptions = Object.keys(muscleDictionary);

export const normalizeMuscleKey = (str) => {
  if (!str) return 'full_body';
  if (typeof str !== 'string') str = String(str);
  if (muscleDictionary[str]) return str;
  const s = str.toLowerCase().trim();
  if (s.includes('dada atas') || s.includes('upper chest')) return 'chest_upper';
  if (s.includes('dada tengah') || s.includes('mid chest')) return 'chest_mid';
  if (s.includes('dada bawah') || s.includes('lower chest')) return 'chest_lower';
  if (s.includes('punggung atas') || s.includes('upper back') || s.includes('mid back') || s.includes('middle back') || s.includes('punggung tengah')) return 'back_upper';
  if (s.includes('lats') || s.includes('sayap') || s.includes('lower back') || s.includes('punggung bawah')) return 'lats';
  if (s.includes('forearm') || s.includes('lengan bawah')) return 'forearm';
  if (s.includes('deltoid depan') || s.includes('front delt')) return 'deltoid_front';
  if (s.includes('deltoid samping') || s.includes('lateral delt') || s === 'lateral') return 'deltoid_lateral';
  if (s.includes('deltoid belakang') || s.includes('rear delt') || s === 'rear') return 'deltoid_rear';
  if (s.includes('traps') || s.includes('trapezius')) return 'trapezius';
  if (s.includes('leher') || s.includes('neck')) return 'neck';
  if (s.includes('biceps')) return 'biceps';
  if (s.includes('triceps')) return 'triceps';
  if (s.includes('quads') || s.includes('paha depan')) return 'quadriceps';
  if (s.includes('hams') || s.includes('paha belakang')) return 'hamstring';
  if (s.includes('glutes') || s.includes('bokong')) return 'glutes';
  if (s.includes('adductors') || s.includes('paha dlm') || s.includes('paha dalam')) return 'adductors';
  if (s.includes('abductors') || s.includes('paha luar')) return 'abductors';
  if (s.includes('calves') || s.includes('betis')) return 'calves';
  if (s.includes('core') || s.includes('abs') || s.includes('perut') || s.includes('abdominal')) return 'core';
  if (s.includes('cardio') || s.includes('kardio')) return 'cardio';
  return 'full_body';
};

export const formatTarget = (t, language = 'ID') => {
  // muscleDictionary keys-nya 'EN'/'ID' uppercase — normalisasi di sini supaya kalau ada
  // state bahasa kesimpan lowercase (pernah kejadian saat reset logout), badge target otot
  // tidak diam-diam kosong lagi.
  const langKey = (language || 'ID').toUpperCase();
  if (Array.isArray(t)) {
    return t.map(m => {
        const key = normalizeMuscleKey(m);
        return muscleDictionary[key] ? muscleDictionary[key][langKey] : m;
    }).join(', ');
  }
  const key = normalizeMuscleKey(t);
  return muscleDictionary[key] ? muscleDictionary[key][langKey] : (t || 'Lainnya');
};

export const getLocalYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Kartu "terjadwal" di WorkoutTab/CalendarTab dibikin dengan id komposit
// `projected_${programId}_${YYYY-MM-DD}`. Sebelumnya di-parse balik pakai
// `.replace('projected_','').split('_')[0]` — itu ngambil cuma SEGMEN PERTAMA sebelum
// underscore, jadi rusak buat program bikinan AI yang id-nya sendiri punya underscore
// (mis. `routine_ai_1783708143704_0` jadi kepotong cuma `routine`). Regex ini strip
// prefix & suffix tanggal SAJA, id di tengahnya (apa pun isinya) tetap utuh.
export const resolveProjectedProgramId = (id) => {
  return String(id || '')
    .replace(/^projected_/, '')
    .replace(/_\d{4}-\d{2}-\d{2}$/, '');
};

// Satu-satunya sumber daftar sesi per tanggal. WorkoutTab & CalendarTab dulu punya
// salinan logika ini masing-masing dan sudah keburu beda: versi WorkoutTab lupa baca
// `deletedProjected`, jadi sesi yang dihapus di kalender tetap nongol di tab latihan.
// Semua penambahan aturan harus di sini, jangan disalin lagi ke halaman.
const DAY_MAP = { 0: 'Min', 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab' };

// `deletedProjected` = penanda "sesi terjadwal ini sudah dihapus user" per tanggal.
// Bentuknya MAP ber-key programId (nilai `true`), alasannya sama persis dengan `workouts`:
// array tidak bisa di-merge Firestore, jadi dua device yang menghapus sesi berbeda di tanggal
// yang sama akan saling menimpa. Sebagai map, Firestore menggabungkan per-key.
// Data lama berbentuk array masih dibaca — normalisasi cuma di dua fungsi ini.
// Konsekuensi merge map: key yang tidak disebut dibiarkan hidup. Kalau nanti ada fitur
// "batalkan hapus", key-nya harus dikirim eksplisit sebagai deleteField(), sama seperti sesi.
export const deletedProjectedMap = (dp) => {
  if (Array.isArray(dp)) return Object.fromEntries(dp.map(id => [String(id), true]));
  if (dp && typeof dp === 'object') return { ...dp };
  return {};
};

export const hasDeletedProjected = (dayData) =>
  Object.keys(deletedProjectedMap(dayData?.deletedProjected)).length > 0;

/**
 * Cari latihan yang dimaksud sebuah KUNCI LOG, dari peta id -> latihan.
 *
 * Kunci log punya beberapa bentuk yang hidup berdampingan:
 *   "101"                                    id angka polos
 *   "101-prog-1"                             id angka + id sesi (sesi program)
 *   "3fa85f64-5717-4562-b3fc-2c963f66afa6"   id UUID (dari Tambah/Ganti Latihan)
 *   "3fa85f64-...-afa6-w1"                   id UUID + id sesi
 *   "123-1786258529614"                      latihan ekstra (id + stempel waktu)
 *
 * Cara lama `Number(key.split('-')[0])` benar HANYA untuk dua bentuk pertama. Untuk id UUID ia
 * memotong di tanda hubung pertama lalu `Number("3fa85f64")` = NaN, latihannya tidak ketemu, dan
 * seluruh datanya DIAM-DIAM HILANG dari grafik progres — bukan salah hitung, tapi tidak muncul
 * sama sekali. Setiap latihan yang pernah ditambahkan/diganti user kena.
 *
 * Di sini dicoba dari yang paling panjang: kunci utuh dulu, baru dikupas satu potong dari
 * belakang. Urutan itu penting — kalau dari yang terpendek, UUID akan tercocokkan ke potongan
 * pertamanya dan bisa nyasar ke latihan lain.
 */
export const resolveLoggedExercise = (logKey, exLookup) => {
  if (logKey === null || logKey === undefined || !exLookup) return undefined;
  const key = String(logKey);
  if (exLookup[key]) return exLookup[key];
  const parts = key.split('-');
  for (let i = parts.length - 1; i > 0; i--) {
    const head = parts.slice(0, i).join('-');
    if (exLookup[head]) return exLookup[head];
  }
  return undefined;
};

// Field bioData yang PEMILIKNYA Lomeal, bukan Logym. Lomeal menulis langsung ke history_years
// Logym (lihat lomeal-app/src/utils/biometricSync.js) untuk SEMUA hari yang berubah, termasuk hari
// lampau — jadi salurannya sudah benar dan Logym cukup berhenti menimpanya.
//
// Tanda tangannya: Lomeal menaruh boolean `true` di _manualFlags, sedangkan simpanan manual Logym
// sendiri menaruh ANGKA yang diketik user (lihat handleSaveManualData di DashboardTab). Perbedaan
// itulah yang dipakai membedakan pemiliknya tanpa perlu mengubah repo Lomeal.
//
// Kalau hari itu TIDAK dimiliki Lomeal, isian manual Logym tetap hidup — itu jalur untuk sumber
// lain (mis. MyFitnessPal lewat Health Connect).
export const isLomealOwned = (bioData, field) => bioData?._manualFlags?.[field] === true;

// Basis angka manual sebuah field, apa pun yang menuliskannya. Logym menyimpan angkanya di
// _manualFlags; Lomeal cuma menyimpan `true` di situ dan angkanya di bioData. Tanpa pembedaan ini
// `Number(true)` = 1, dan override kalori dari Lomeal runtuh jadi 1 kkal.
export const manualFieldValue = (bioData, field) => {
  const flag = bioData?._manualFlags?.[field];
  if (flag === undefined) return 0;
  if (flag === true) return Number(bioData?.[field]) || 0;
  return Number(flag) || 0;
};

export const getDayWorkouts = (history, programs, activePlanIds, dateStr) => {
  const dData = history?.[dateStr] || {};
  const historical = Array.isArray(dData.workouts) ? dData.workouts : [];
  const deletedProjected = deletedProjectedMap(dData.deletedProjected);

  const validHistorical = historical.filter(w => {
    if (w.status === 'completed' || w.programId === 'adhoc') {
      if (w.programId === 'adhoc' && (!w.exercises || w.exercises.length === 0)) return false;
      return true;
    }
    const p = programs.find(prog => prog.id === w.programId);
    if (!p) return false; // program aslinya sudah dihapus
    return activePlanIds.includes(p.planId || 'custom');
  });

  const result = [...validHistorical];

  if (activePlanIds.length > 0) {
    const dayName = DAY_MAP[new Date(dateStr).getDay()];
    programs
      .filter(p => activePlanIds.includes(p.planId || 'custom'))
      .filter(r => r.assignedDays && r.assignedDays.includes(dayName))
      .forEach(pr => {
        if (deletedProjected[String(pr.id)]) return;
        if (validHistorical.some(w => w.programId === pr.id)) return;
        result.push({
          id: `projected_${pr.id}_${dateStr}`,
          programId: pr.id,
          programName: pr.name,
          status: 'planned',
          isProjected: true,
          log: {}
        });
      });
  }

  // Pengaman render: buang id kembar (sisa program duplikat yang belum ke-upload bersih).
  const seen = new Set();
  return result.filter(w => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
};

export const getVideoId = (url) => {
  if (!url) return null;
  try {
    const srcMatch = url.match(/src="([^"]+)"/);
    const urlToParse = srcMatch ? srcMatch[1] : url;
    const match = urlToParse.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : null;
  } catch (e) { return null;  }
};
