import { defaultMasterExercises } from './constants';

const getEx = (id, sets, reps, supersetId = null) => {
  const ex = defaultMasterExercises.find(e => e.id === id);
  if (!ex) return null;
  return { ...ex, id: Date.now() + Math.random(), originalId: id, sets, reps, ...(supersetId && { supersetId }) };
};

export const PROGRAM_PLANS = [
  {
    planId: 'plan_fb_1',
    name: 'Full Body Maintenance',
    description: 'Sangat cocok untuk yang super sibuk. Melatih seluruh otot utama dalam satu sesi padat.',
    goal: ['general', 'fat_loss', 'muscle_gain'],
    experience: ['beginner', 'intermediate'],
    daysPerWeek: 1,
    routines: [
      {
        name: 'Full Body Complete',
        restTime: 90,
        exercises: [
          getEx(108, 3, 10, "A"), // Squat
          getEx(115, 3, 10, "A"), // Flat Bench
          getEx(113, 3, 12, "B"), // Lat Pulldown
          getEx(114, 3, 12, "B"), // DB Shoulder Press
          getEx(109, 3, 10), // RDL
          getEx(112, 3, 15), // Cable Crunch
        ].filter(Boolean)
      }
    ]
  },
  {
    planId: 'plan_fb_2',
    name: 'Full Body Split',
    description: 'Latihan seluruh tubuh 2 kali seminggu untuk menjaga kebugaran tanpa menyita banyak waktu.',
    goal: ['general', 'fat_loss', 'muscle_gain'],
    experience: ['beginner', 'intermediate'],
    daysPerWeek: 2,
    routines: [
      {
        name: 'Full Body A',
        restTime: 90,
        exercises: [
          getEx(108, 3, 10), // Squat
          getEx(115, 3, 10), // Flat Bench
          getEx(113, 3, 12), // Lat Pulldown
          getEx(106, 3, 12), // Biceps Curl
          getEx(112, 3, 15), // Cable Crunch
        ].filter(Boolean)
      },
      {
        name: 'Full Body B',
        restTime: 90,
        exercises: [
          getEx(109, 3, 10), // RDL
          getEx(101, 3, 10), // Incline Bench
          getEx(102, 3, 12), // Seated Row
          getEx(114, 3, 12), // DB Shoulder Press
          getEx(105, 3, 12), // Triceps Pushdown
        ].filter(Boolean)
      }
    ]
  },
  {
    planId: 'plan_fb_3',
    name: 'Full Body Foundation',
    description: 'Sangat cocok untuk pemula. Melatih seluruh otot tubuh 3 kali seminggu untuk adaptasi maksimal.',
    goal: ['muscle_gain', 'fat_loss', 'general'],
    experience: ['beginner'],
    daysPerWeek: 3,
    routines: [
      {
        name: 'Full Body A',
        restTime: 90,
        exercises: [
          getEx(108, 3, 10), // Squat
          getEx(115, 3, 10), // Flat Bench
          getEx(113, 3, 12), // Lat Pulldown
          getEx(114, 3, 12), // DB Shoulder Press
          getEx(106, 3, 12), // Biceps Curl
          getEx(112, 3, 15), // Cable Crunch
        ].filter(Boolean)
      },
      {
        name: 'Full Body B',
        restTime: 90,
        exercises: [
          getEx(109, 3, 10), // RDL
          getEx(101, 3, 10), // Incline Bench
          getEx(102, 3, 12), // Seated Row
          getEx(104, 3, 15), // Lateral Raise
          getEx(105, 3, 12), // Triceps Pushdown
          getEx(111, 3, 15), // Calf Raise
        ].filter(Boolean)
      },
      {
        name: 'Full Body C',
        restTime: 90,
        exercises: [
          getEx(119, 3, 10), // Split Squat
          getEx(103, 3, 10), // DB Flat Bench
          getEx(113, 3, 12), // Lat Pulldown (Repeat)
          getEx(116, 3, 15), // Rear Delt
          getEx(106, 3, 12), // Biceps Curl
          getEx(112, 3, 15), // Cable Crunch
        ].filter(Boolean)
      }
    ]
  },
  {
    planId: 'plan_ul_4',
    name: 'Upper/Lower Split',
    description: 'Membagi fokus tubuh atas dan bawah. Ideal untuk pemulihan dan hipertrofi.',
    goal: ['muscle_gain', 'fat_loss'],
    experience: ['intermediate', 'beginner'],
    daysPerWeek: 4,
    routines: [
      {
        name: 'Upper A',
        restTime: 120,
        exercises: [
          getEx(115, 3, 8),  // Flat Bench
          getEx(113, 3, 10), // Lat Pulldown
          getEx(101, 3, 10), // Incline Bench
          getEx(102, 3, 12), // Seated Row
          getEx(104, 3, 15), // Lateral Raise
          getEx(106, 3, 12), // Biceps
        ].filter(Boolean)
      },
      {
        name: 'Lower A',
        restTime: 120,
        exercises: [
          getEx(108, 4, 8),  // Squat
          getEx(109, 3, 10), // RDL
          getEx(119, 3, 12), // Split Squat
          getEx(111, 4, 15), // Calf Raise
          getEx(112, 3, 15), // Crunch
        ].filter(Boolean)
      },
      {
        name: 'Upper B',
        restTime: 120,
        exercises: [
          getEx(114, 3, 10), // Shoulder Press
          getEx(113, 3, 10), // Lat Pulldown
          getEx(103, 3, 10), // DB Flat Bench
          getEx(102, 3, 12), // Seated Row
          getEx(105, 3, 12), // Triceps
          getEx(116, 3, 15), // Rear Delt
        ].filter(Boolean)
      },
      {
        name: 'Lower B',
        restTime: 120,
        exercises: [
          getEx(120, 4, 8),  // SM RDL
          getEx(108, 3, 10), // Squat
          getEx(110, 3, 12), // Walking Lunges
          getEx(122, 4, 15), // Seated Calf Raise
          getEx(123, 3, 1),  // Plank
        ].filter(Boolean)
      }
    ]
  },
  {
    planId: 'plan_bro_5',
    name: 'Bro Split',
    description: 'Fokus pada satu grup otot besar setiap hari. Klasik dan efektif untuk bodybuilding.',
    goal: ['muscle_gain'],
    experience: ['intermediate', 'advanced'],
    daysPerWeek: 5,
    routines: [
      {
        name: 'Chest Day',
        restTime: 120,
        exercises: [
          getEx(115, 4, 8),  // Flat Bench
          getEx(101, 4, 10), // Incline Bench
          getEx(103, 3, 12), // DB Flat Bench
        ].filter(Boolean)
      },
      {
        name: 'Back Day',
        restTime: 120,
        exercises: [
          getEx(113, 4, 10), // Lat Pulldown
          getEx(102, 4, 10), // Seated Row
        ].filter(Boolean)
      },
      {
        name: 'Legs Day',
        restTime: 120,
        exercises: [
          getEx(108, 4, 8),  // Squat
          getEx(109, 4, 10), // RDL
          getEx(111, 4, 15), // Calf Raise
        ].filter(Boolean)
      },
      {
        name: 'Shoulders Day',
        restTime: 120,
        exercises: [
          getEx(114, 4, 10), // Shoulder Press
          getEx(104, 4, 15), // Lateral Raise
          getEx(116, 4, 15), // Rear Delt
        ].filter(Boolean)
      },
      {
        name: 'Arms & Abs',
        restTime: 120,
        exercises: [
          getEx(106, 4, 12), // Biceps Curl
          getEx(105, 4, 12), // Triceps Pushdown
          getEx(112, 4, 15), // Crunch
        ].filter(Boolean)
      }
    ]
  },
  {
    planId: 'plan_ppl_6',
    name: 'Push/Pull/Legs',
    description: 'Volume tinggi untuk stimulasi otot maksimal. Direkomendasikan untuk yang sudah berpengalaman.',
    goal: ['muscle_gain'],
    experience: ['advanced', 'intermediate'],
    daysPerWeek: 6,
    routines: [
      {
        name: 'Push A',
        restTime: 120,
        exercises: [
          getEx(115, 4, 8),  // Flat Bench
          getEx(101, 3, 10), // Incline Bench
          getEx(114, 3, 10), // Shoulder Press
          getEx(104, 4, 15), // Lateral Raise
          getEx(105, 3, 12), // Triceps Pushdown
        ].filter(Boolean)
      },
      {
        name: 'Pull A',
        restTime: 120,
        exercises: [
          getEx(113, 4, 10), // Lat Pulldown
          getEx(102, 3, 10), // Seated Row
          getEx(116, 3, 15), // Rear Delt
          getEx(124, 3, 12), // Shrugs
          getEx(106, 4, 10), // Biceps Curl
        ].filter(Boolean)
      },
      {
        name: 'Legs A',
        restTime: 120,
        exercises: [
          getEx(108, 4, 8),  // Squat
          getEx(109, 3, 10), // RDL
          getEx(110, 3, 12), // Lunges
          getEx(111, 4, 15), // Calf Raise
        ].filter(Boolean)
      },
      {
        name: 'Push B',
        restTime: 120,
        exercises: [
          getEx(101, 4, 10), // Incline Bench
          getEx(103, 3, 10), // DB Bench
          getEx(104, 4, 15), // Lateral Raise
          getEx(117, 3, 12), // Overhead Triceps
        ].filter(Boolean)
      },
      {
        name: 'Pull B',
        restTime: 120,
        exercises: [
          getEx(102, 4, 10), // Seated Row
          getEx(113, 3, 10), // Lat Pulldown
          getEx(116, 3, 15), // Rear Delt
          getEx(118, 4, 12), // Cable Curl
        ].filter(Boolean)
      },
      {
        name: 'Legs B',
        restTime: 120,
        exercises: [
          getEx(120, 4, 10), // SM RDL
          getEx(119, 3, 10), // Split Squat
          getEx(122, 4, 15), // Seated Calf Raise
          getEx(112, 4, 15), // Crunch
        ].filter(Boolean)
      }
    ]
  },
  {
    planId: 'plan_beast_7',
    name: 'Beast Mode (with Active Recovery)',
    description: 'Sangat ekstrim. 6 hari latihan intensif ditambah 1 hari pemulihan aktif (Peregangan/Core) agar terhindar dari Overtraining.',
    goal: ['muscle_gain', 'general'],
    experience: ['advanced'],
    daysPerWeek: 7,
    routines: [
      {
        name: 'Push Heavy',
        restTime: 120,
        exercises: [
          getEx(115, 4, 8),  // Flat Bench
          getEx(114, 4, 10), // Shoulder Press
        ].filter(Boolean)
      },
      {
        name: 'Pull Heavy',
        restTime: 120,
        exercises: [
          getEx(113, 4, 10), // Lat Pulldown
          getEx(102, 4, 10), // Seated Row
        ].filter(Boolean)
      },
      {
        name: 'Legs Heavy',
        restTime: 120,
        exercises: [
          getEx(108, 4, 8),  // Squat
          getEx(109, 4, 10), // RDL
        ].filter(Boolean)
      },
      {
        name: 'Push Hypertrophy',
        restTime: 90,
        exercises: [
          getEx(101, 3, 12), // Incline Bench
          getEx(104, 4, 15), // Lateral Raise
          getEx(105, 3, 15), // Triceps
        ].filter(Boolean)
      },
      {
        name: 'Pull Hypertrophy',
        restTime: 90,
        exercises: [
          getEx(102, 3, 12), // Seated Row
          getEx(116, 4, 15), // Rear Delt
          getEx(106, 3, 15), // Biceps
        ].filter(Boolean)
      },
      {
        name: 'Legs Hypertrophy',
        restTime: 90,
        exercises: [
          getEx(119, 3, 12), // Split Squat
          getEx(111, 4, 20), // Calf Raise
          getEx(112, 4, 15), // Crunch
        ].filter(Boolean)
      },
      {
        name: 'Active Recovery & Core',
        restTime: 60,
        exercises: [
          getEx(123, 3, 1),  // Plank
          getEx(112, 3, 20), // Crunch (Light)
        ].filter(Boolean)
      }
    ]
  }
];
