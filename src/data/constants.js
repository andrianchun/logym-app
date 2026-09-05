export const equipmentOptions = ["Assisted", "Band", "Barbell", "Body Weight", "Bosu Ball", "Cable", "Dumbbell", "Elliptical Machine", "EZ Barbell", "Hammer", "Kettlebell", "Leverage Machine", "Machine", "Medicine Ball", "Olympic Barbell", "Resistance Band", "Roller", "Rope", "Rowing Machine", "Skierg", "Sled Machine", "Smith Machine", "Stability Ball", "Stationary Bike", "Stepmill Machine", "Tire", "Trap Bar", "Treadmill", "Upper Body Ergometer", "Weighted", "Wheel Roller", "Lainnya"];
export const levelOptions = ["beginner", "intermediate", "advanced"];

export const defaultEquipmentConfig = {
  'Olympic Barbell': { baseWeight: 20, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Barbell': { baseWeight: 20, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'EZ Barbell': { baseWeight: 10, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Trap Bar': { baseWeight: 20, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Smith Machine': { baseWeight: 15, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Dumbbell': { baseWeight: 0, ratio: 1, inputRule: 'per_side', label: 'Beban 1 Sisi', placeholder: 'Ketikan beban 1 sisi' },
  'Kettlebell': { baseWeight: 0, ratio: 1, inputRule: 'per_side', label: 'Beban 1 Sisi', placeholder: 'Ketikan beban 1 sisi' },
  'Cable': { baseWeight: 0, ratio: 1, inputRule: 'per_side_or_pin', label: 'Beban 1 Sisi / Pin', placeholder: 'Ketikan beban 1 sisi / pin' },
  'Machine': { baseWeight: 0, ratio: 1, inputRule: 'pin_number', label: 'Angka di Pin', placeholder: 'Ketikan angka di pin' },
  'Leverage Machine': { baseWeight: 20, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Sled Machine': { baseWeight: 45, ratio: 1, inputRule: 'total_plates', label: 'Total Plat (2 Sisi)', placeholder: 'Ketikan total plat' },
  'Weighted': { baseWeight: 0, ratio: 1, isBodyweightPlus: true, inputRule: 'extra_weight', label: 'Beban Tambahan', placeholder: 'Ketikan beban tambahan' },
  'Body Weight': { baseWeight: 0, ratio: 1, inputRule: 'bodyweight', label: 'Berat Badan', placeholder: '0' },
  'Assisted': { baseWeight: 0, ratio: 1, inputRule: 'assisted', label: 'Bantuan Pin', placeholder: 'Beban bantuan' },
};

export const exerciseTypeLabels = {
  weight: 'Beban & Repetisi',
  reps: 'Repetisi',
  time: 'Durasi',
  cardio: 'Kardio (Jarak & Waktu)',
};

export const defaultMasterExercises = [
  {
    "id": 101,
    "name": "Smith Machine Incline Bench Press",
    "target": ["Dada Atas", "Deltoid Depan", "Triceps"],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Smith Machine",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/VXaBbUYMfIs?si=pOB-MkazqZiMP_KX",
    "videoUrl": "/exercise-assets/edb-Smith_Machine_Incline_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Incline_Bench_Press.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Smith_Machine_Incline_Bench_Press.webp",
    "gifUrl": "/exercise-assets/edb-Smith_Machine_Incline_Bench_Press.webp"
  },
  {
    "id": 102,
    "name": "Seated Cable Rows",
    "target": ["Punggung Atas", "Biceps"],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Cable",
    "level": "beginner",
    "ytVideo": "https://youtu.be/qD1WZ5pSuvk?si=JbbritEwFpnqjPHz",
    "videoUrl": "/exercise-assets/edb-Seated_Cable_Rows.mp4 /exercise-assets/youtube-backup/edb-Seated_Cable_Rows.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Seated_Cable_Rows.webp",
    "gifUrl": "/exercise-assets/edb-Seated_Cable_Rows.webp"
  },
  {
    "id": 103,
    "name": "Dumbbell Bench Press",
    "target": ["Dada Tengah", "Triceps"],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "https://youtu.be/WbCEvFA0NJs?si=n6uJrVnL8SbZLnii",
    "videoUrl": "/exercise-assets/edb-Dumbbell_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Bench_Press.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Dumbbell_Bench_Press.webp",
    "gifUrl": "/exercise-assets/edb-Dumbbell_Bench_Press.webp"
  },
  {
    "id": 104,
    "name": "Standing Cable Lateral Raise",
    "target": ["Deltoid Samping"],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Cable",
    "level": "beginner",
    "ytVideo": "https://youtu.be/9ilIKuy6B0g?si=d4LHAcUC86am2QQA",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Standing_Cable_Lateral_Raise.mp4",
    "thumbnailUrl": "/exercise-assets/youtube-backup/edb-Standing_Cable_Lateral_Raise.webp",
    "gifUrl": "/exercise-assets/youtube-backup/edb-Standing_Cable_Lateral_Raise.webp"
  },
  {
    "id": 105,
    "name": "Triceps Pushdown",
    "target": ["Triceps"],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Cable",
    "level": "beginner",
    "ytVideo": "https://youtu.be/1FjkhpZsaxc?si=UF5-0LJTCd_pEhy3 https://youtu.be/u36jNfqh8_U?si=AEMeWXqnBvpOWNOj https://youtu.be/9qupVR7pKtk?si=FtLIHZmKuqXcK0ne",
    "videoUrl": "/exercise-assets/edb-Triceps_Pushdown.mp4 /exercise-assets/youtube-backup/edb-Triceps_Pushdown.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Triceps_Pushdown.webp",
    "gifUrl": "/exercise-assets/edb-Triceps_Pushdown.webp"
  },
  {
    "id": 106,
    "name": "Dumbbell Alternate Bicep Curl",
    "target": ["Biceps"],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "https://youtu.be/MKWBV29S6c0?si=JV1BM77vAR6VuQYG https://youtu.be/_aoad2yuP5w?si=PRXDFoozz45AB_VO",
    "videoUrl": "/exercise-assets/edb-Dumbbell_Alternate_Bicep_Curl.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Alternate_Bicep_Curl.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Dumbbell_Alternate_Bicep_Curl.webp",
    "gifUrl": "/exercise-assets/edb-Dumbbell_Alternate_Bicep_Curl.webp"
  },
  {
    "id": 107,
    "name": "Cardio",
    "target": ["Cardio"],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 15,
    "equipment": "Stationary Bike",
    "level": "beginner",
    "ytVideo": ""
  },
  {
    "id": 108,
    "name": "Smith Machine Squat",
    "target": ["Quads", "Hams", "Glutes"],
    "type": "weight",
    "defaultWeight": 0,
    "equipment": "Smith Machine",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/iKCJCydYYrE?si=ICtqLU9ov9eFaHfL https://youtu.be/LwsG-1xgP2E?si=Ptr7dUVcsJFKMLYC",
    "videoUrl": "/exercise-assets/edb-Smith_Machine_Squat.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Squat.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Smith_Machine_Squat.webp",
    "gifUrl": "/exercise-assets/edb-Smith_Machine_Squat.webp"
  },
  {
    "id": 109,
    "name": "Romanian Deadlift",
    "target": ["Hams", "Glutes"],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Barbell",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/xY8BywOKkLQ?si=B1A9ulZ-Cz67GNw6",
    "videoUrl": "/exercise-assets/edb-Romanian_Deadlift.mp4 /exercise-assets/youtube-backup/edb-Romanian_Deadlift.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Romanian_Deadlift.webp",
    "gifUrl": "/exercise-assets/edb-Romanian_Deadlift.webp"
  },
  {
    "id": 110,
    "name": "Dumbbell Walking Lunges",
    "target": ["Quads", "Hams", "Glutes"],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Dumbbell",
    "level": "intermediate",
    "ytVideo": "",
    "videoUrl": "",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg"
  },
  {
    "id": 111,
    "name": "Rocking Standing Calf Raise",
    "target": ["Calves"],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Barbell",
    "level": "beginner",
    "ytVideo": "https://youtu.be/wdOkFomQNp8?si=PWlxiKYPBMlfLoek",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Rocking_Standing_Calf_Raise.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rocking_Standing_Calf_Raise/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rocking_Standing_Calf_Raise/0.jpg"
  },
  {
    "id": 112,
    "name": "Cable Crunch",
    "target": ["Core"],
    "type": "weight",
    "defaultWeight": 40,
    "equipment": "Cable",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/K2m0jj6RfYg?si=CZMLt6PF0Yxvgb6V",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Cable_Crunch.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crunch/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crunch/0.jpg"
  },
  {
    "id": 113,
    "name": "Wide-Grip Lat Pulldown",
    "target": ["Lats", "Biceps"],
    "type": "weight",
    "defaultWeight": 40,
    "equipment": "Machine",
    "level": "beginner",
    "ytVideo": "https://youtu.be/bNmvKpJSWKM?si=E7zZ3a3qeG4Ij7bb https://youtu.be/7Cjc_aXoQ_I?si=ZqhPV5iSMoTOLSIf",
    "videoUrl": "/exercise-assets/edb-Wide-Grip_Lat_Pulldown.mp4 /exercise-assets/youtube-backup/edb-Wide-Grip_Lat_Pulldown.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Wide-Grip_Lat_Pulldown.webp",
    "gifUrl": "/exercise-assets/edb-Wide-Grip_Lat_Pulldown.webp"
  },
  {
    "id": 114,
    "name": "Dumbbell Shoulder Press",
    "target": ["Deltoid Depan", "Triceps"],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Dumbbell",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/k6tzKisR3NY?si=g67rT52vc6oWjiFC https://youtu.be/E7ngsffMPR0?si=FJGsgUxb7aoAZ_ub",
    "videoUrl": "/exercise-assets/edb-Dumbbell_Shoulder_Press.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Shoulder_Press.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Dumbbell_Shoulder_Press.webp",
    "gifUrl": "/exercise-assets/edb-Dumbbell_Shoulder_Press.webp"
  },
  {
    "id": 124,
    "name": "Dumbbell Shrug",
    "target": ["Traps", "Leher"],
    "type": "weight",
    "defaultWeight": 15,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "https://youtu.be/rFsSeClGnNA?si=EfUCHpJdjSbWFObO https://youtu.be/2BrmhGze7sk?si=PSt1tUQjaI2liYby",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Dumbbell_Shrug.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shrug/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shrug/0.jpg"
  },
  {
    "id": 115,
    "name": "Smith Machine Bench Press",
    "target": ["Dada Tengah", "Triceps"],
    "type": "weight",
    "defaultWeight": 7.5,
    "equipment": "Smith Machine",
    "level": "beginner",
    "ytVideo": "https://youtu.be/gQ3afio08V8?si=DfCKjmSAhUMXjMl_",
    "videoUrl": "/exercise-assets/edb-Smith_Machine_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Bench_Press.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Smith_Machine_Bench_Press.webp",
    "gifUrl": "/exercise-assets/edb-Smith_Machine_Bench_Press.webp"
  },
  {
    "id": 116,
    "name": "Cable Rear Delt Fly",
    "target": ["Deltoid Belakang"],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Cable",
    "level": "advanced",
    "ytVideo": "https://youtu.be/cGXBVOc5xIk?si=ve9zzcNdiyNqYF5I",
    "videoUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly_1.mp4 /exercise-assets/edb-Cable_Rear_Delt_Fly_2.mp4 /exercise-assets/youtube-backup/edb-Cable_Rear_Delt_Fly_1.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly.webp",
    "gifUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly.webp"
  },
  {
    "id": 117,
    "name": "Cable Rope Overhead Triceps Extension",
    "target": ["Triceps"],
    "type": "weight",
    "defaultWeight": 40,
    "equipment": "Cable",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/9Ark9S11uXw?si=pEAe5tf66v5yUToU https://youtu.be/NTk0Igxqcsk?si=zX7dHQL0VyHURoC_",
    "videoUrl": "/exercise-assets/edb-Cable_Rope_Overhead_Triceps_Extension.mp4 /exercise-assets/youtube-backup/edb-Cable_Rope_Overhead_Triceps_Extension.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Cable_Rope_Overhead_Triceps_Extension.webp",
    "gifUrl": "/exercise-assets/edb-Cable_Rope_Overhead_Triceps_Extension.webp"
  },
  {
    "id": 118,
    "name": "Standing Biceps Cable Curl",
    "target": ["Biceps"],
    "type": "weight",
    "defaultWeight": 30,
    "equipment": "Cable",
    "level": "beginner",
    "ytVideo": "https://youtu.be/CrbTqNOlFgE?si=xKanrhppuvUAudTj",
    "videoUrl": "/exercise-assets/youtube-backup/edb-High_Cable_Curls.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Biceps_Cable_Curl/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Biceps_Cable_Curl/0.jpg"
  },
  {
    "id": 119,
    "name": "Split Squat with Dumbbells",
    "target": ["Quads", "Hams", "Glutes"],
    "type": "weight",
    "defaultWeight": 30,
    "equipment": "Dumbbell",
    "level": "advanced",
    "ytVideo": "https://youtu.be/or1frhkjBDc?si=FR7v-hKp_QP4-Rpn",
    "videoUrl": "/exercise-assets/edb-Split_Squat_with_Dumbbells.mp4 /exercise-assets/youtube-backup/edb-Split_Squat_with_Dumbbells.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Split_Squat_with_Dumbbells.webp",
    "gifUrl": "/exercise-assets/edb-Split_Squat_with_Dumbbells.webp"
  },
  {
    "id": 120,
    "name": "Smith Machine Romanian Deadlift",
    "target": ["Hams", "Glutes"],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Smith Machine",
    "level": "beginner",
    "ytVideo": "https://youtu.be/xWnlfJaQZ3k?si=z0FRk3rh4UO7JdUC",
    "videoUrl": "/exercise-assets/edb-Smith_Machine_Stiff-Legged_Deadlift.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Romanian_Deadlift.mp4",
    "thumbnailUrl": "/exercise-assets/edb-Smith_Machine_Stiff-Legged_Deadlift.webp",
    "gifUrl": "/exercise-assets/edb-Smith_Machine_Stiff-Legged_Deadlift.webp"
  },
  {
    "id": 121,
    "name": "Cable Hip Abduction",
    "target": ["Glutes"],
    "type": "weight",
    "defaultWeight": 15,
    "equipment": "Cable",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Pull_Through.mp4",
    "thumbnailUrl": "https://img.youtube.com/vi/sFQtAuiVwyo/hqdefault.jpg",
    "gifUrl": ""
  },
  {
    "id": 122,
    "name": "Seated Calf Raise",
    "target": ["Calves"],
    "type": "weight",
    "defaultWeight": 30,
    "equipment": "Machine",
    "level": "beginner",
    "ytVideo": "https://youtu.be/ar8nav0jGoE?si=owieb0xbPHFg7zMA",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Seated_Calf_Raise.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/0.jpg"
  },
  {
    "id": 123,
    "name": "Plank",
    "target": ["Core"],
    "type": "time",
    "defaultWeight": 0,
    "duration": 30,
    "equipment": "Body Weight",
    "level": "beginner",
    "ytVideo": "https://youtu.be/xe2MXatLTUw?si=U5L4UwgiNv19R7lh",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Plank.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg"
  },
  {
    "id": 125,
    "name": "Palms-Up Dumbbell Wrist Curl Over A Bench",
    "target": ["Forearm"],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench.mp4",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench/0.jpg"
  },
  {
    "id": 126,
    "name": "Treadmill",
    "target": ["Cardio"],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 15,
    "equipment": "Treadmill",
    "level": "beginner",
    "ytVideo": ""
  },
  {
    "id": 127,
    "name": "Stationary Bike",
    "target": ["Cardio"],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 15,
    "equipment": "Stationary Bike",
    "level": "beginner",
    "ytVideo": ""
  },
  {
    "id": 128,
    "name": "Aerobic",
    "target": ["Cardio"],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 20,
    "equipment": "Body Weight",
    "level": "beginner",
    "ytVideo": ""
  },
  {
    "id": 129,
    "name": "HIIT",
    "target": [
      "Cardio",
      "Core"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 15,
    "equipment": "Body Weight",
    "level": "advanced",
    "ytVideo": ""
  },
  {
    "id": 130,
    "name": "Pilates",
    "target": [
      "Core"
    ],
    "type": "time",
    "defaultWeight": 0,
    "duration": 1200,
    "equipment": "Body Weight",
    "level": "intermediate",
    "ytVideo": ""
  },
  {
    "id": 131,
    "name": "Yoga / Relaksasi",
    "target": [
      "Core"
    ],
    "type": "time",
    "defaultWeight": 0,
    "duration": 600,
    "equipment": "Body Weight",
    "level": "beginner",
    "ytVideo": ""
  },
  {
    "id": 132,
    "name": "Elliptical Trainer",
    "target": [
      "Cardio"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 15,
    "equipment": "Elliptical Machine",
    "level": "beginner",
    "ytVideo": ""
  },
  {
    "id": 133,
    "name": "Jump Rope",
    "target": [
      "Cardio"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 5,
    "equipment": "Rope",
    "level": "intermediate",
    "ytVideo": ""
  },
  {
    "id": 134,
    "name": "Goblet Squat",
    "target": [
      "Quads",
      "Glutes"
    ],
    "type": "weight",
    "defaultWeight": 10,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "https://youtu.be/MeIiIdhgPgl",
    "videoUrl": "/exercise-assets/youtube-backup/edb-Goblet_Squat.mp4"
  },
  {
    "id": 135,
    "name": "Barbell Bench Press - Medium Grip",
    "target": [
      "Dada Tengah",
      "Triceps",
      "Deltoid Depan"
    ],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Barbell",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/rT7DgCr-3pg",
    "videoUrl": "/exercise-assets/edb-Barbell_Bench_Press_-_Medium_Grip.mp4 /exercise-assets/youtube-backup/edb-Barbell_Bench_Press_-_Medium_Grip.mp4"
  },
  {
    "id": 136,
    "name": "Swimming (Renang)",
    "target": [
      "Cardio",
      "Core",
      "Lats"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 30,
    "equipment": "Pool",
    "level": "intermediate",
    "ytVideo": ""
  },
  {
    "id": 137,
    "name": "Jogging / Running",
    "target": [
      "Cardio",
      "Quads",
      "Calves"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 20,
    "equipment": "Body Weight",
    "level": "beginner",
    "ytVideo": ""
  },
  {
    "id": 138,
    "name": "Walking / Jalan Kaki",
    "target": [
      "Cardio"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 30,
    "equipment": "Body Weight",
    "level": "beginner",
    "ytVideo": ""
  },
  {
    "id": 139,
    "name": "Cycling / Sepeda",
    "target": [
      "Cardio",
      "Quads"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 30,
    "equipment": "Bicycle",
    "level": "beginner",
    "ytVideo": ""
  },
  {
    "id": 140,
    "name": "Pull Through",
    "target": [
      "Hams",
      "Glutes"
    ],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Cable",
    "level": "intermediate",
    "ytVideo": "https://youtu.be/03XwN3vR_2E",
    "videoUrl": "",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull_Through/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull_Through/0.jpg"
  },
  {
    "id": 141,
    "name": "Trail Running",
    "target": [
      "Cardio",
      "Quads",
      "Glutes",
      "Calves"
    ],
    "type": "cardio",
    "defaultWeight": 0,
    "duration": 30,
    "equipment": "Body Weight",
    "level": "intermediate",
    "ytVideo": ""
  },
  {
    "id": 142,
    "name": "Barbell Incline Bench Press - Medium Grip",
    "target": [
      "Chest",
      "Shoulders",
      "Triceps"
    ],
    "type": "weight",
    "defaultWeight": 20,
    "equipment": "Barbell",
    "level": "intermediate",
    "ytVideo": "",
    "videoUrl": "",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg"
  },
  {
    "id": 143,
    "name": "Side Lateral Raise",
    "target": ["Deltoid Samping"],
    "type": "weight",
    "defaultWeight": 5,
    "equipment": "Dumbbell",
    "level": "beginner",
    "ytVideo": "",
    "videoUrl": "",
    "thumbnailUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg",
    "gifUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg"
  }
];

export const cleanExerciseNameForMatching = (name) => {
  if (!name) return '';
  let str = String(name)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\brumanian\b/g, 'romanian')
    .replace(/\brdl\b/g, 'romanian deadlift')
    .replace(/\b(romanian deadlift)(\s+romanian deadlift)+\b/g, 'romanian deadlift')
    .replace(/\bsm\b/g, 'smith machine')
    .replace(/\bdumbell\b/g, 'dumbbell')
    .replace(/\bdumbel\b/g, 'dumbbell')
    .replace(/\bpull\s+thru\b/g, 'pull through')
    .replace(/\blat\s+pull\s*down\b/g, 'lat pulldown')
    .replace(/\bcross\s+cable\s+rear\s+delt(\s+fly)?\b/g, 'cable rear delt fly')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalisasi bentuk jamak/tunggal istilah umum
  str = str.replace(/\bbiceps\b/g, 'bicep')
           .replace(/\bcurls\b/g, 'curl')
           .replace(/\braises\b/g, 'raise')
           .replace(/\bpresses\b/g, 'press')
           .replace(/\bshrugs\b/g, 'shrug')
           .replace(/\blunges\b/g, 'lunge')
           .replace(/\bcrunches\b/g, 'crunch')
           .replace(/\bextensions\b/g, 'extension')
           .replace(/\brows\b/g, 'row');

  return str;
};

/**
 * Mencocokkan exercise dengan defaultMasterExercises atau daftar katalog lainnya secara cerdas.
 * Mendukung variasi nama seperti "Lat Pulldown" -> "Wide-Grip Lat Pulldown",
 * "Cross Cable Rear Delt" -> "Cable Rear Delt Fly", "Dumbbell Biceps Curl" -> "Dumbbell Alternate Bicep Curl",
 * "Cable Pull Through" -> "Pull Through", "Flat Dumbbell Bench Press" -> "Dumbbell Bench Press",
 * "Cable Lateral Raises" -> "Cable Seated Lateral Raise", "Rumanian Deadlift" -> "Romanian Deadlift", dll.
 */
export const findMatchingMasterExercise = (targetEx, masterList = defaultMasterExercises) => {
  if (!targetEx) return null;
  const rawId = targetEx.originalId || targetEx.id;
  const rawName = cleanExerciseNameForMatching(targetEx.name);

  // 1. Cocokkan berdasarkan ID
  if (rawId !== undefined && rawId !== null) {
    const byId = masterList.find(m => String(m.id || m.exerciseId) === String(rawId));
    if (byId) return byId;
  }

  if (!rawName) return null;

  // 2. Cocokkan nama persis / setelah normalisasi typo
  const byExact = masterList.find(m => cleanExerciseNameForMatching(m.name) === rawName);
  if (byExact) return byExact;

  // 2b. Cocokkan dari field aliases di masterList bila ada
  const byMasterAlias = masterList.find(m => Array.isArray(m.aliases) && m.aliases.some(a => cleanExerciseNameForMatching(a) === rawName));
  if (byMasterAlias) return byMasterAlias;

  // 3. Cocokkan ALIAS KANONIKAL RESMI SAJA (tanpa mencaplok variasi berbeda!)
  const canonicalAliases = {
    // Lat Pulldown
    'lat pulldown': 'Wide-Grip Lat Pulldown',
    'wide grip lat pulldown': 'Wide-Grip Lat Pulldown',
    'wide grip lat pull down': 'Wide-Grip Lat Pulldown',
    
    // Bench Press
    'flat dumbbell bench press': 'Dumbbell Bench Press',
    'dumbbell flat bench press': 'Dumbbell Bench Press',
    'db bench press': 'Dumbbell Bench Press',
    'barbell bench press': 'Barbell Bench Press - Medium Grip',
    'flat barbell bench press': 'Barbell Bench Press - Medium Grip',
    'barbell flat bench press': 'Barbell Bench Press - Medium Grip',
    'barbell incline bench press': 'Barbell Incline Bench Press - Medium Grip',
    'incline barbell bench press': 'Barbell Incline Bench Press - Medium Grip',
    'barbell incline bench press medium grip': 'Barbell Incline Bench Press - Medium Grip',
    'incline smith machine press': 'Smith Machine Incline Bench Press',
    'sm flat bench press': 'Smith Machine Bench Press',
    'smith machine flat bench press': 'Smith Machine Bench Press',

    // Deadlift
    'romanian deadlift': 'Romanian Deadlift',
    'rumanian deadlift': 'Romanian Deadlift',
    'rdl': 'Romanian Deadlift',
    'barbell rdl': 'Romanian Deadlift',
    'barbell romanian deadlift': 'Romanian Deadlift',
    'smith machine romanian deadlift': 'Smith Machine Romanian Deadlift',
    'smith machine stiff-legged deadlift': 'Smith Machine Romanian Deadlift',
    'smith machine stiff legged deadlift': 'Smith Machine Romanian Deadlift',
    'smith machine stiff leg deadlift': 'Smith Machine Romanian Deadlift',
    'smith machine stiff leg rdl': 'Smith Machine Romanian Deadlift',
    'smith machine stiff-legged rdl': 'Smith Machine Romanian Deadlift',
    'smith machine stiff leg romanian deadlift': 'Smith Machine Romanian Deadlift',
    'smith machine stiff legged romanian deadlift': 'Smith Machine Romanian Deadlift',
    'sm stiff leg deadlift': 'Smith Machine Romanian Deadlift',
    'sm stiff leg rdl': 'Smith Machine Romanian Deadlift',
    'sm stiff-legged deadlift': 'Smith Machine Romanian Deadlift',
    'smith rdl': 'Smith Machine Romanian Deadlift',
    'sm rdl': 'Smith Machine Romanian Deadlift',
    'sm romanian deadlift': 'Smith Machine Romanian Deadlift',
    'sm romanian deadlift rdl': 'Smith Machine Romanian Deadlift',
    'smith machine romanian deadlift rdl': 'Smith Machine Romanian Deadlift',

    // Lunges & Squats
    'dumbbell walking lunges': 'Dumbbell Walking Lunges',
    'dumbbell walking lunge': 'Dumbbell Walking Lunges',
    'walking lunges': 'Dumbbell Walking Lunges',
    'walking lunge': 'Dumbbell Walking Lunges',
    'db bulgarian split squat': 'Split Squat with Dumbbells',
    'dumbbell goblet squat': 'Goblet Squat',

    // Lateral Raise
    'standing cable lateral raise': 'Standing Cable Lateral Raise',
    'standing cable lateral raises': 'Standing Cable Lateral Raise',
    'cable lateral raise': 'Standing Cable Lateral Raise',
    'cable lateral raises': 'Standing Cable Lateral Raise',
    'cable side lateral raise': 'Standing Cable Lateral Raise',
    'cable side lateral raises': 'Standing Cable Lateral Raise',
    'side lateral raise': 'Side Lateral Raise',
    'side lateral raises': 'Side Lateral Raise',
    'dumbbell lateral raise': 'Side Lateral Raise',
    'dumbbell lateral raises': 'Side Lateral Raise',
    'dumbbell side lateral raise': 'Side Lateral Raise',
    'lateral raise': 'Side Lateral Raise',
    'lateral raises': 'Side Lateral Raise',

    // Delts / Rows / Pushdown / Pulls / Curls
    'cable rear delt fly': 'Cable Rear Delt Fly',
    'cross cable rear delt': 'Cable Rear Delt Fly',
    'cross cable rear delt fly': 'Cable Rear Delt Fly',
    'cable rear delt flyes': 'Cable Rear Delt Fly',
    'cable seated row': 'Seated Cable Rows',
    'cable seated rows': 'Seated Cable Rows',
    'seated cable row': 'Seated Cable Rows',
    'pull through': 'Pull Through',
    'cable pull through': 'Pull Through',
    'cable pull thru': 'Pull Through',
    'cable hip abduction': 'Cable Hip Abduction',
    'standing cable hip abduction': 'Cable Hip Abduction',
    'triceps pushdown': 'Triceps Pushdown',
    'cable triceps pushdown': 'Triceps Pushdown',
    'tricep pushdown': 'Triceps Pushdown',
    'overhead cable triceps extension': 'Cable Rope Overhead Triceps Extension',
    'dumbbell alternate bicep curl': 'Dumbbell Alternate Bicep Curl',
    'dumbbell alternating bicep curl': 'Dumbbell Alternate Bicep Curl',
    'dumbbell bicep curl': 'Dumbbell Alternate Bicep Curl',
    'dumbbell biceps curl': 'Dumbbell Alternate Bicep Curl',
    'bicep curl': 'Dumbbell Alternate Bicep Curl',
    'biceps curl': 'Dumbbell Alternate Bicep Curl',
    'bicep cable curl': 'Standing Biceps Cable Curl',
    'biceps cable curl': 'Standing Biceps Cable Curl',
    'cable bicep curl': 'Standing Biceps Cable Curl',
    'cable biceps curl': 'Standing Biceps Cable Curl',
    'standing cable curl': 'Standing Biceps Cable Curl',
    'standing bicep cable curl': 'Standing Biceps Cable Curl',
    'standing biceps cable curl': 'Standing Biceps Cable Curl',
    'high cable curl': 'High Cable Curls',
    'high cable curls': 'High Cable Curls',
    'dumbbell wrist curl': 'Palms-Up Dumbbell Wrist Curl Over A Bench',

    // Calves
    'standing calf raise': 'Rocking Standing Calf Raise',
    'seated dumbbell calf raise': 'Seated Calf Raise',

    // Cardio
    'treadmill': 'Treadmill',
    'treadmill running': 'Treadmill',
    'running on treadmill': 'Treadmill',
    'trail running': 'Trail Running',
    'trail run': 'Trail Running',
    'jogging': 'Jogging / Running',
    'running': 'Jogging / Running',
    'jogging running': 'Jogging / Running',
    'jogging / running': 'Jogging / Running',
  };

  const canonicalName = canonicalAliases[rawName];
  if (canonicalName) {
    const byCanonical = masterList.find(m => cleanExerciseNameForMatching(m.name) === cleanExerciseNameForMatching(canonicalName));
    if (byCanonical) return byCanonical;
  }

  return null;
};

/**
 * Menormalkan objek latihan ke nama dan atribut kanonikal master resmi.
 * Menjamin sinkronisasi nama tanpa menimpa variasi spesifik (seperti Deficit, Incline, Rope, Cable Curl, dll.):
 *  - "Lat Pulldown" -> "Wide-Grip Lat Pulldown"
 *  - "Cross Cable Rear Delt" -> "Cable Rear Delt Fly"
 *  - "Dumbbell Biceps Curl" / "Biceps Curl" -> "Dumbbell Alternate Bicep Curl" (bukan Cable Curl / Barbell Curl)
 *  - "Rumanian Deadlift" / "RDL" -> "Romanian Deadlift" (bukan Deficit RDL / Smith RDL)
 *  - "Flat Dumbbell Bench Press" -> "Dumbbell Bench Press" (bukan Incline DB Press)
 *  - "Cable Lateral Raises" -> "Standing Cable Lateral Raise" (bukan Dumbbell Lateral Raise / Seated Cable Raise)
 *  - "Cable Pull Through" -> "Pull Through"
 *  - "Cable Triceps Pushdown" -> "Triceps Pushdown" (bukan Rope Overhead Extension)
 */
export const canonicalizeExercise = (ex) => {
  if (!ex) return ex;
  const masterMatch = findMatchingMasterExercise(ex, defaultMasterExercises);
  let name = ex.name || '';
  const locName = cleanExerciseNameForMatching(name);

  // Exact alias mapping: HANYA ubah jika nama persis alias resminya
  if (locName === 'lat pulldown' || locName === 'wide grip lat pulldown' || locName === 'wide grip lat pull down') {
    name = 'Wide-Grip Lat Pulldown';
  } else if (locName === 'cable rear delt fly' || locName === 'cross cable rear delt' || locName === 'cross cable rear delt fly' || locName === 'cable rear delt flyes') {
    name = 'Cable Rear Delt Fly';
  } else if (locName === 'romanian deadlift from deficit' || locName === 'rdl from deficit' || locName === 'deficit rdl') {
    name = 'Romanian Deadlift from Deficit';
  } else if (
    locName === 'sm romanian deadlift' ||
    locName === 'smith machine romanian deadlift' ||
    locName === 'smith rdl' ||
    locName === 'sm rdl' ||
    locName === 'smith machine rdl' ||
    locName === 'sm romanian deadlift rdl' ||
    locName === 'smith machine stiff-legged deadlift' ||
    locName === 'smith machine stiff legged deadlift' ||
    locName === 'smith machine stiff leg deadlift' ||
    locName === 'smith machine stiff leg rdl' ||
    locName === 'smith machine stiff-legged rdl' ||
    locName === 'sm stiff leg deadlift' ||
    locName === 'sm stiff leg rdl' ||
    locName === 'sm stiff-legged deadlift' ||
    locName === 'smith machine stiff leg romanian deadlift' ||
    locName === 'smith machine stiff legged romanian deadlift'
  ) {
    name = 'Smith Machine Romanian Deadlift';
  } else if (locName === 'romanian deadlift' || locName === 'rumanian deadlift' || locName === 'rdl' || locName === 'barbell rdl' || locName === 'barbell romanian deadlift') {
    name = 'Romanian Deadlift';
  } else if (locName === 'flat dumbbell bench press' || locName === 'dumbbell flat bench press' || locName === 'db bench press') {
    name = 'Dumbbell Bench Press';
  } else if (locName === 'standing cable hip abduction' || locName === 'cable hip abduction' || locName === 'cable hip abductions') {
    name = 'Cable Hip Abduction';
  } else if (locName === 'cable pull through' || locName === 'cable pull thru' || locName === 'pull through') {
    name = 'Pull Through';
  } else if (locName === 'standing cable lateral raise' || locName === 'standing cable lateral raises' || locName === 'cable lateral raise' || locName === 'cable lateral raises' || locName === 'cable side lateral raise' || locName === 'cable side lateral raises') {
    name = 'Standing Cable Lateral Raise';
  } else if (locName === 'cable seated lateral raise' || locName === 'seated cable lateral raise' || locName === 'seated cable lateral raises') {
    name = 'Cable Seated Lateral Raise';
  } else if (locName === 'seated side lateral raise' || locName === 'seated dumbbell lateral raise' || locName === 'seated dumbbell lateral raises' || locName === 'seated lateral raise' || locName === 'seated lateral raises') {
    name = 'Seated Side Lateral Raise';
  } else if (locName === 'side lateral raise' || locName === 'side lateral raises' || locName === 'dumbbell lateral raise' || locName === 'dumbbell lateral raises' || locName === 'dumbbell side lateral raise' || locName === 'dumbbell side lateral raises' || locName === 'lateral raise' || locName === 'lateral raises') {
    name = 'Side Lateral Raise';
  } else if (locName === 'treadmill running' || locName === 'running on treadmill' || locName === 'treadmill') {
    name = 'Treadmill';
  } else if (locName === 'trail running' || locName === 'trail run') {
    name = 'Trail Running';
  } else if (locName === 'jogging' || locName === 'running' || locName === 'jogging running' || locName === 'jogging / running') {
    name = 'Jogging / Running';
  } else if (locName === 'cable triceps pushdown' || locName === 'triceps pushdown' || locName === 'tricep pushdown') {
    name = 'Triceps Pushdown';
  } else if (locName === 'dumbbell biceps curl' || locName === 'dumbbell bicep curl' || locName === 'biceps curl' || locName === 'bicep curl' || locName === 'dumbbell alternate bicep curl' || locName === 'dumbbell alternating bicep curl') {
    name = 'Dumbbell Alternate Bicep Curl';
  } else if (locName === 'dumbbell walking lunge' || locName === 'walking lunge') {
    name = 'Dumbbell Walking Lunges';
  } else if (locName === 'biceps cable curl' || locName === 'bicep cable curl' || locName === 'cable bicep curl' || locName === 'cable biceps curl' || locName === 'standing cable curl' || locName === 'standing bicep cable curl' || locName === 'standing biceps cable curl') {
    name = 'Standing Biceps Cable Curl';
  } else if (masterMatch && masterMatch.name && masterMatch.id === (ex.originalId || ex.id)) {
    name = masterMatch.name;
  }

  return {
    ...ex,
    name,
    videoUrl: masterMatch?.videoUrl || ex.videoUrl || '',
    thumbnailUrl: masterMatch?.thumbnailUrl || ex.thumbnailUrl || masterMatch?.gifUrl || ex.gifUrl || '',
    gifUrl: masterMatch?.gifUrl || ex.gifUrl || '',
    ytVideo: masterMatch?.ytVideo || ex.ytVideo || '',
    ...(masterMatch ? {
      target: (ex.target && ex.target.length > 0) ? ex.target : masterMatch.target,
      equipment: ex.equipment || masterMatch.equipment,
      type: ex.type || masterMatch.type,
    } : {})
  };
};

export const defaultPrograms = [
  {
    "id": "prog-1",
    "planId": "custom",
    "planName": "Program Default",
    "assignedDays": [
      "Sel"
    ],
    "name": "Upper 1",
    "exercises": [
      {
        "id": 101,
        "name": "Smith Machine Incline Bench Press",
        "sets": 4,
        "reps": 12,
        "target": [
          "Dada Atas",
          "Deltoid Depan",
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 10,
        "equipment": "Smith Machine",
        "ytVideo": "https://youtu.be/VXaBbUYMfIs?si=pOB-MkazqZiMP_KX",
        "videoUrl": "/exercise-assets/edb-Smith_Machine_Incline_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Incline_Bench_Press.mp4"
      },
      {
        "id": 102,
        "name": "Seated Cable Rows",
        "sets": 4,
        "reps": 12,
        "target": [
          "Punggung Atas",
          "Biceps"
        ],
        "type": "weight",
        "defaultWeight": 10,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/qD1WZ5pSuvk?si=JbbritEwFpnqjPHz",
        "videoUrl": "/exercise-assets/edb-Seated_Cable_Rows.mp4 /exercise-assets/youtube-backup/edb-Seated_Cable_Rows.mp4"
      },
      {
        "id": 103,
        "name": "Dumbbell Bench Press",
        "sets": 3,
        "reps": 12,
        "target": [
          "Dada Tengah",
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 10,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/WbCEvFA0NJs?si=n6uJrVnL8SbZLnii",
        "videoUrl": "/exercise-assets/edb-Dumbbell_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Bench_Press.mp4"
      },
      {
        "id": 104,
        "name": "Standing Cable Lateral Raise",
        "sets": 3,
        "reps": 12,
        "target": [
          "Deltoid Samping"
        ],
        "type": "weight",
        "defaultWeight": 10,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/9ilIKuy6B0g?si=d4LHAcUC86am2QQA",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Standing_Cable_Lateral_Raise.mp4"
      },
      {
        "id": 105,
        "name": "Triceps Pushdown",
        "sets": 3,
        "reps": 10,
        "target": [
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 20,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/1FjkhpZsaxc?si=UF5-0LJTCd_pEhy3 https://youtu.be/u36jNfqh8_U?si=AEMeWXqnBvpOWNOj https://youtu.be/9qupVR7pKtk?si=FtLIHZmKuqXcK0ne",
        "videoUrl": "/exercise-assets/edb-Triceps_Pushdown.mp4 /exercise-assets/youtube-backup/edb-Triceps_Pushdown.mp4"
      },
      {
        "id": 106,
        "name": "Dumbbell Alternate Bicep Curl",
        "sets": 3,
        "reps": 10,
        "target": [
          "Biceps"
        ],
        "type": "weight",
        "defaultWeight": 20,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/MKWBV29S6c0?si=JV1BM77vAR6VuQYG https://youtu.be/_aoad2yuP5w?si=PRXDFoozz45AB_VO",
        "videoUrl": "/exercise-assets/edb-Dumbbell_Alternate_Bicep_Curl.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Alternate_Bicep_Curl.mp4"
      },
      {
        "id": 107,
        "name": "Cardio",
        "sets": 1,
        "reps": 0,
        "duration": 15,
        "target": [
          "Cardio"
        ],
        "type": "cardio",
        "defaultWeight": 0,
        "equipment": "Stationary Bike",
        "ytVideo": ""
      }
    ]
  },
  {
    "id": "prog-2",
    "planId": "custom",
    "planName": "Program Default",
    "assignedDays": [
      "Rab"
    ],
    "name": "Lower 1",
    "exercises": [
      {
        "id": 108,
        "name": "Smith Machine Squat",
        "sets": 3,
        "reps": 10,
        "target": [
          "Quads",
          "Hams",
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 0,
        "equipment": "Smith Machine",
        "ytVideo": "https://youtu.be/iKCJCydYYrE?si=ICtqLU9ov9eFaHfL https://youtu.be/LwsG-1xgP2E?si=Ptr7dUVcsJFKMLYC",
        "videoUrl": "/exercise-assets/edb-Smith_Machine_Squat.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Squat.mp4"
      },
      {
        "id": 109,
        "name": "Romanian Deadlift",
        "sets": 4,
        "reps": 12,
        "target": [
          "Hams",
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 5,
        "equipment": "Barbell",
        "ytVideo": "https://youtu.be/xY8BywOKkLQ?si=B1A9ulZ-Cz67GNw6",
        "videoUrl": "/exercise-assets/edb-Romanian_Deadlift.mp4 /exercise-assets/youtube-backup/edb-Romanian_Deadlift.mp4"
      },
      {
        "id": 110,
        "name": "Dumbbell Walking Lunges",
        "sets": 3,
        "reps": 12,
        "target": [
          "Quads",
          "Hams",
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 5,
        "equipment": "Dumbbell",
        "ytVideo": "",
        "videoUrl": ""
      },
      {
        "id": 111,
        "name": "Rocking Standing Calf Raise",
        "sets": 4,
        "reps": 12,
        "target": [
          "Calves"
        ],
        "type": "weight",
        "defaultWeight": 10,
        "equipment": "Barbell",
        "ytVideo": "https://youtu.be/wdOkFomQNp8?si=PWlxiKYPBMlfLoek",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Rocking_Standing_Calf_Raise.mp4"
      },
      {
        "id": 112,
        "name": "Cable Crunch",
        "sets": 4,
        "reps": 20,
        "target": [
          "Core"
        ],
        "type": "weight",
        "defaultWeight": 40,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/K2m0jj6RfYg?si=CZMLt6PF0Yxvgb6V",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Cable_Crunch.mp4"
      }
    ]
  },
  {
    "id": "prog-3",
    "planId": "custom",
    "planName": "Program Default",
    "assignedDays": [
      "Jum"
    ],
    "name": "Upper 2",
    "exercises": [
      {
        "id": 113,
        "name": "Wide-Grip Lat Pulldown",
        "sets": 4,
        "reps": 12,
        "target": [
          "Lats",
          "Biceps"
        ],
        "type": "weight",
        "defaultWeight": 40,
        "equipment": "Machine",
        "ytVideo": "https://youtu.be/bNmvKpJSWKM?si=E7zZ3a3qeG4Ij7bb https://youtu.be/7Cjc_aXoQ_I?si=ZqhPV5iSMoTOLSIf",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Wide-Grip_Lat_Pulldown.mp4"
      },
      {
        "id": 114,
        "name": "Dumbbell Shoulder Press",
        "sets": 4,
        "reps": 12,
        "target": [
          "Deltoid Depan",
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 5,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/k6tzKisR3NY?si=g67rT52vc6oWjiFC https://youtu.be/E7ngsffMPR0?si=FJGsgUxb7aoAZ_ub",
        "videoUrl": "/exercise-assets/edb-Dumbbell_Shoulder_Press.mp4 /exercise-assets/youtube-backup/edb-Dumbbell_Shoulder_Press.mp4"
      },
      {
        "id": 124,
        "name": "Dumbbell Shrug",
        "sets": 4,
        "reps": 12,
        "target": [
          "Traps",
          "Leher"
        ],
        "type": "weight",
        "defaultWeight": 15,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/rFsSeClGnNA?si=EfUCHpJdjSbWFObO https://youtu.be/2BrmhGze7sk?si=PSt1tUQjaI2liYby",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Dumbbell_Shrug.mp4"
      },
      {
        "id": 115,
        "name": "Smith Machine Bench Press",
        "sets": 3,
        "reps": 12,
        "target": [
          "Dada Tengah",
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 7.5,
        "equipment": "Smith Machine",
        "ytVideo": "https://youtu.be/gQ3afio08V8?si=DfCKjmSAhUMXjMl_",
        "videoUrl": "/exercise-assets/edb-Smith_Machine_Bench_Press.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Bench_Press.mp4"
      },
      {
        "id": 116,
        "name": "Cable Rear Delt Fly",
        "sets": 4,
        "reps": 12,
        "target": [
          "Deltoid Belakang"
        ],
        "type": "weight",
        "defaultWeight": 5,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/cGXBVOc5xIk?si=ve9zzcNdiyNqYF5I https://youtu.be/IeOqdw9WI90?si=J4oHxFNn7257r3ak",
        "videoUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly_1.mp4 /exercise-assets/edb-Cable_Rear_Delt_Fly_2.mp4 /exercise-assets/youtube-backup/edb-Cable_Rear_Delt_Fly_1.mp4",
        "thumbnailUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly.webp",
        "gifUrl": "/exercise-assets/edb-Cable_Rear_Delt_Fly.webp"
      },
      {
        "id": 117,
        "name": "Cable Rope Overhead Triceps Extension",
        "sets": 3,
        "reps": 12,
        "target": [
          "Triceps"
        ],
        "type": "weight",
        "defaultWeight": 40,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/9Ark9S11uXw?si=pEAe5tf66v5yToU https://youtu.be/NTk0Igxqcsk?si=zX7dHQL0VyHURoC_",
        "videoUrl": "/exercise-assets/edb-Cable_Rope_Overhead_Triceps_Extension.mp4 /exercise-assets/youtube-backup/edb-Cable_Rope_Overhead_Triceps_Extension.mp4"
      },
      {
        "id": 118,
        "name": "Standing Biceps Cable Curl",
        "sets": 3,
        "reps": 12,
        "target": [
          "Biceps"
        ],
        "type": "weight",
        "defaultWeight": 30,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/CrbTqNOlFgE?si=xKanrhppuvUAudTj",
        "videoUrl": "/exercise-assets/youtube-backup/edb-High_Cable_Curls.mp4"
      },
      {
        "id": 125,
        "name": "Palms-Up Dumbbell Wrist Curl Over A Bench",
        "sets": 3,
        "reps": 15,
        "target": [
          "Forearm"
        ],
        "type": "weight",
        "defaultWeight": 5,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/0-c4s051u6E?si=K-4Z9iKq2d8r0N1M",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench.mp4"
      }
    ]
  },
  {
    "id": "prog-4",
    "planId": "custom",
    "planName": "Program Default",
    "assignedDays": [
      "Min"
    ],
    "name": "Lower 2",
    "exercises": [
      {
        "id": 119,
        "name": "Split Squat with Dumbbells",
        "sets": 3,
        "reps": 10,
        "target": [
          "Quads",
          "Hams",
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 30,
        "equipment": "Dumbbell",
        "ytVideo": "https://youtu.be/or1frhkjBDc?si=FR7v-hKp_QP4-Rpn",
        "videoUrl": "/exercise-assets/edb-Split_Squat_with_Dumbbells.mp4 /exercise-assets/youtube-backup/edb-Split_Squat_with_Dumbbells.mp4"
      },
      {
        "id": 120,
        "name": "Smith Machine Romanian Deadlift",
        "sets": 4,
        "reps": 12,
        "target": [
          "Hams",
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 20,
        "equipment": "Smith Machine",
        "ytVideo": "https://youtu.be/xWnlfJaQZ3k?si=z0FRk3rh4UO7JdUC",
        "videoUrl": "/exercise-assets/edb-Smith_Machine_Stiff-Legged_Deadlift.mp4 /exercise-assets/youtube-backup/edb-Smith_Machine_Romanian_Deadlift.mp4"
      },
      {
        "id": 121,
        "name": "Cable Hip Abduction",
        "sets": 3,
        "reps": 15,
        "target": [
          "Glutes"
        ],
        "type": "weight",
        "defaultWeight": 15,
        "equipment": "Cable",
        "ytVideo": "https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Pull_Through.mp4"
      },
      {
        "id": 122,
        "name": "Seated Calf Raise",
        "sets": 4,
        "reps": 20,
        "target": [
          "Calves"
        ],
        "type": "weight",
        "defaultWeight": 30,
        "equipment": "Machine",
        "ytVideo": "https://youtu.be/ar8nav0jGoE?si=owieb0xbPHFg7zMA",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Seated_Calf_Raise.mp4"
      },
      {
        "id": 123,
        "name": "Plank",
        "sets": 3,
        "duration": 30,
        "reps": 0,
        "target": [
          "Core"
        ],
        "type": "time",
        "defaultWeight": 0,
        "equipment": "Body Weight",
        "ytVideo": "https://youtu.be/xe2MXatLTUw?si=U5L4UwgiNv19R7lh",
        "videoUrl": "/exercise-assets/youtube-backup/edb-Plank.mp4"
      }
    ]
  }
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
export const exerciseAliasMap = {
  '101': 'edb-Smith_Machine_Incline_Bench_Press',
  '102': 'edb-Seated_Cable_Rows',
  '103': 'edb-Dumbbell_Bench_Press',
  '104': 'edb-Standing_Cable_Lateral_Raise',
  '105': 'edb-Triceps_Pushdown',
  '106': 'edb-Dumbbell_Alternate_Bicep_Curl',
  '107': 'edb-107',
  '108': 'edb-Smith_Machine_Squat',
  '109': 'edb-Romanian_Deadlift',
  '110': 'edb-Dumbbell_Lunges',
  '111': 'edb-Rocking_Standing_Calf_Raise',
  '112': 'edb-Cable_Crunch',
  '113': 'edb-Wide-Grip_Lat_Pulldown',
  '114': 'edb-Dumbbell_Shoulder_Press',
  '115': 'edb-Smith_Machine_Bench_Press',
  '116': 'edb-Cable_Rear_Delt_Fly',
  '117': 'edb-Cable_Rope_Overhead_Triceps_Extension',
  '118': 'edb-Standing_Biceps_Cable_Curl',
  '119': 'edb-Split_Squat_with_Dumbbells',
  '120': 'edb-Smith_Machine_Stiff-Legged_Deadlift',
  '121': 'edb-Cable_Hip_Abduction',
  '122': 'edb-Seated_Calf_Raise',
  '123': 'edb-Plank',
  '124': 'edb-Dumbbell_Shrug',
  '125': 'edb-Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench',
  '126': 'edb-126',
  '127': 'edb-127',
  '128': 'edb-128',
  '129': 'edb-129',
  '130': 'edb-130',
  '131': 'edb-131',
  '132': 'edb-Elliptical_Trainer',
  '133': 'edb-133',
  '134': 'edb-Goblet_Squat',
  '135': 'edb-Barbell_Bench_Press_-_Medium_Grip',
  '136': 'edb-136',
  '137': 'edb-137',
  '138': 'edb-138',
  '139': 'edb-139',
  '140': 'edb-Pull_Through',
  '141': 'edb-Trail_Running_Walking',
  '142': 'edb-Barbell_Incline_Bench_Press_-_Medium_Grip'
};

export const resolveLoggedExercise = (logKey, exLookup) => {
  if (logKey === null || logKey === undefined || !exLookup) return undefined;
  const key = String(logKey);
  if (exLookup[key]) return exLookup[key];
  if (exerciseAliasMap[key] && exLookup[exerciseAliasMap[key]]) {
    return exLookup[exerciseAliasMap[key]];
  }

  const parts = key.split('-');
  for (let i = parts.length - 1; i > 0; i--) {
    const head = parts.slice(0, i).join('-');
    if (exLookup[head]) return exLookup[head];
    if (exerciseAliasMap[head] && exLookup[exerciseAliasMap[head]]) {
      return exLookup[exerciseAliasMap[head]];
    }
  }
  return undefined;
};

/**
 * Pisahkan log satu HARI menjadi "milik sesi yang sedang disimpan" dan "sisa".
 *
 * `exerciseLogs`, `skippedExercises`, dan `extraExercises` adalah state SATU HARI, bukan satu
 * sesi. Dulu handleSaveWorkout memperlakukan semuanya sebagai milik sesi yang disimpan: log
 * treadmill di sesi Ekstra yang belum disimpan ikut ditulis ke `log` sesi beban, lalu
 * `extraExercises` dikosongkan — kartu Ekstra "Belum disimpan" di kalender lenyap dan
 * treadmillnya hilang permanen.
 *
 * Cara mengenali pemilik sebuah kunci:
 *  - Latihan ekstra: kuncinya PERSIS id di `extraExercises` (`${libId}-${stempelWaktu}`).
 *  - Sesi program: WorkoutTab merakit id majemuk `${ex.id}-${w.id}`, jadi kuncinya berakhiran
 *    `-${workoutId}`.
 *
 * Kalau tidak ada satu kunci pun yang cocok dengan sufiks itu (riwayat lama berkunci polos "101"),
 * SEMUA kunci non-ekstra dianggap milik sesi itu. Fallback ini disengaja: sesi yang tersimpan
 * dengan log kosong jauh lebih merusak daripada sesi yang lognya kelebihan.
 *
 * Lihat juga resolveLoggedExercise di atas soal lima bentuk kunci — jangan pernah
 * `key.split('-')[0]`.
 */
export const splitSessionLogs = (exerciseLogs, { progId, workoutId, extraExercises, sessionExercises } = {}) => {
  const semua = exerciseLogs || {};
  const idEkstra = new Set((extraExercises || []).map(ex => String(ex?.id)));
  const idSession = sessionExercises && sessionExercises.length > 0
    ? new Set(sessionExercises.map(ex => String(ex?.id)))
    : null;
  const kunci = Object.keys(semua);

  let milik;
  if (progId === 'extra') {
    milik = new Set(kunci.filter(k => idEkstra.has(String(k))));
  } else {
    const nonEkstra = kunci.filter(k => !idEkstra.has(String(k)));
    const sufiks = [workoutId, progId].filter(Boolean).map(id => `-${id}`);
    const cocok = sufiks.length > 0
      ? nonEkstra.filter(k => sufiks.some(s => String(k).endsWith(s)))
      : [];

    if (cocok.length > 0) {
      milik = new Set(cocok);
    } else if (idSession && idSession.size > 0) {
      milik = new Set(nonEkstra.filter(k => {
        const rawId = String(k).includes('-') ? String(k).slice(0, String(k).lastIndexOf('-')) : String(k);
        return idSession.has(String(k)) || idSession.has(rawId);
      }));
    } else {
      milik = new Set(nonEkstra);
    }
  }

  const milikSesi = {};
  const sisa = {};
  kunci.forEach(k => { (milik.has(k) ? milikSesi : sisa)[k] = semua[k]; });
  return { milikSesi, sisa };
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

/**
 * Payload ringkasan aktivitas Logym untuk disinkronkan ke dokumen root user (`logym_users/{uid}`)
 * agar aplikasi Lomeal dapat membaca jumlah sesi/latihan dan kalori terbakar hari ini secara live.
 */
export const buildLogymSyncPayload = (history, userWeight = 70, targetDateStr = null) => {
  const todayStr = targetDateStr || getLocalYMD(new Date());
  const todayData = history?.[todayStr] || {};
  const completedWorkouts = (todayData.workouts || []).filter(w => w?.status === 'completed');

  let completedExercisesCount = 0;
  completedWorkouts.forEach(w => {
    const exs = w.overriddenExercises || w.exercises || [];
    const log = w.log || {};
    exs.forEach(ex => {
      const sLog = log[ex.id] || Object.entries(log).find(([k]) => k === String(ex.id) || k.startsWith(`${ex.id}-`))?.[1];
      if (sLog && Object.values(sLog).some(s => s?.done && !s?.skipped)) {
        completedExercisesCount++;
      }
    });
  });

  const activityKcal = Number(todayData.bioData?.activityCalories) || 0;

  return {
    logymSync: {
      today: {
        ymd: todayStr,
        kcal: activityKcal,
        workoutCalories: activityKcal,
        workoutsCount: completedWorkouts.length,
        sessionsCount: completedWorkouts.length,
        exercisesCount: completedExercisesCount,
        updatedAt: Date.now()
      }
    }
  };
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

  // URUTAN: sesi program dulu, sesi Ekstra paling bawah.
  //
  // Dulu urutannya cuma "yang tersimpan dulu, yang terjadwal ditempel di belakang". Sesi Ekstra
  // adalah entri tersimpan, sedangkan sesi utama sering masih berstatus terjadwal — jadi Ekstra
  // naik ke atas sesi utamanya sendiri. Ekstra itu tambahan di luar program; tempatnya di bawah,
  // apa pun status sesi utamanya.
  const result = validHistorical.filter(w => w.programId !== 'adhoc');
  const ekstra = validHistorical.filter(w => w.programId === 'adhoc');

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

  result.push(...ekstra);

  // Pengaman render: buang id kembar (sisa program duplikat yang belum ke-upload bersih).
  const seen = new Set();
  return result.filter(w => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
};

/**
 * Berapa hari TERJADWAL yang dilewatkan, dihitung mundur dari kemarin.
 *
 * Versi lama menghitung "hari sejak latihan terakhir selesai", bukan hari terjadwal yang
 * dilewatkan — program 3x seminggu otomatis menembus ambang 2 hari SETIAP MINGGU, sehingga
 * notifikasi "kamu bolos" muncul terus padahal jadwalnya diikuti sempurna.
 *
 * Hari ini sengaja tidak dihitung: harinya belum selesai, latihannya belum tentu dilewatkan.
 *
 * Semua tanggal diurai sebagai waktu LOKAL. `new Date('YYYY-MM-DD')` diurai sebagai tengah
 * malam UTC sementara Date.now() waktu lokal — di WIB (+7) itu menggeser hitungan sampai
 * satu hari penuh.
 */
export const countMissedScheduledDays = (history, programs, activePlanIds, todayYmd, maxLookback = 60) => {
  const hariLokal = (ymd) => new Date(`${ymd}T00:00:00`);
  const ymdOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Tanpa riwayat sama sekali, tidak ada yang bisa "dilewatkan": user baru bukan pembolos.
  // Tanpa batas ini, penelusuran berjalan sampai maxLookback dan menuduh pemakai hari pertama
  // sudah bolos belasan hari.
  const tanggalRiwayat = Object.keys(history || {}).sort();
  if (tanggalRiwayat.length === 0) return 0;
  const palingAwal = tanggalRiwayat[0];

  let missed = 0;
  const cursor = hariLokal(todayYmd);
  for (let i = 0; i < maxLookback; i++) {
    cursor.setDate(cursor.getDate() - 1); // mulai dari KEMARIN
    const ymd = ymdOf(cursor);
    if (ymd < palingAwal) break;                                // sebelum user mulai memakai app
    const workouts = getDayWorkouts(history, programs, activePlanIds, ymd);
    if (workouts.length === 0) continue;                        // hari istirahat, bukan bolos
    if (workouts.some(w => w.status === 'completed')) break;    // ketemu hari latihan — berhenti
    missed++;
  }
  return missed;
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

/**
 * Saring pustaka menurut alat yang tersedia di gym aktif.
 *
 * DUA KEKECUALIAN, dan keduanya memperbaiki latihan yang selama ini hilang diam-diam:
 *
 * 1. BODY WEIGHT SELALU ADA. Kamu tidak pernah kekurangan badanmu sendiri. Selama ini Plank,
 *    Aerobic, HIIT, Pilates, Yoga, Jogging, dan Walking ikut lenyap dari "Ganti Latihan" begitu
 *    sebuah gym tidak mencentang "Body Weight" — sehingga plank cuma bisa dimasukkan lewat
 *    Latihan Ekstra dan tidak bisa menggantikan latihan yang sudah ada.
 *
 * 2. ALAT YANG TIDAK ADA DI equipmentOptions TIDAK PERNAH DISEMBUNYIKAN. Kalau sebuah nilai tidak
 *    bisa dicentang di GymManagerModal, ketidakhadirannya di daftar gym bukan keputusan user —
 *    itu cuma nilai yang tidak dikenal. Menyaringnya berarti menyembunyikan selamanya tanpa ada
 *    setelan apa pun yang bisa mengembalikannya. Yang kena: "Swimming (Renang)" (alat `Pool`)
 *    dan "Cycling / Sepeda" (alat `Bicycle`), plus SEMUA latihan online — translateEquipment
 *    mengembalikan Title Case dari nilai API apa pun, jadi sebagian besar jatuh di luar 32 opsi.
 */
export const filterByGymEquipment = (list, activeGym) => {
  const alat = activeGym?.equipment;
  if (alat === 'all' || !Array.isArray(alat)) return list || [];
  const dikenal = new Set(equipmentOptions);
  return (list || []).filter((ex) => {
    const eq = ex?.equipment;
    if (eq === 'Body Weight') return true;
    if (!dikenal.has(eq)) return true;
    return alat.includes(eq);
  });
};

/**
 * Deretan tanggal untuk strip kalender mingguan, `jumlahMinggu` minggu sekaligus.
 *
 * Di layar lebar satu baris tujuh hari menyisakan ruang kosong yang sia-sia, jadi jumlah
 * minggunya mengikuti lebar layar. Minggu tambahan diambil ke BELAKANG (minggu-minggu sebelumnya),
 * bukan ke depan: yang berguna saat menyisir catatan latihan adalah apa yang sudah dikerjakan,
 * bukan hari yang belum datang. Minggu berisi `baseDate` selalu jadi yang TERAKHIR.
 *
 * @param {Date} baseDate tanggal acuan
 * @param {number} weekStartDay 0 = Minggu, 1 = Senin
 * @param {number} jumlahMinggu berapa minggu dirender
 * @returns {Date[]} 7 x jumlahMinggu tanggal, urut lama -> baru
 */
export const weekStripDates = (baseDate, weekStartDay = 0, jumlahMinggu = 1) => {
  const n = Math.max(1, Math.floor(Number(jumlahMinggu) || 1));
  const dasar = baseDate instanceof Date && !Number.isNaN(baseDate.getTime()) ? baseDate : new Date();
  const geser = (dasar.getDay() - weekStartDay + 7) % 7;
  const mulai = new Date(dasar.getFullYear(), dasar.getMonth(), dasar.getDate() - geser - (n - 1) * 7);
  const keluar = [];
  for (let i = 0; i < n * 7; i++) {
    keluar.push(new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate() + i));
  }
  return keluar;
};
