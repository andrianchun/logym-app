import { Trophy, Flame, Dumbbell, Zap, Target, Star, Crown } from 'lucide-react';
import React from 'react';

// Achievements definitions
export const ACHIEVEMENTS = [
  {
    id: 'first_workout',
    title: 'Langkah Pertama',
    description: 'Menyelesaikan kuesioner profil pertamamu.',
    icon: (props) => <Target {...props} />,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30'
  },
  {
    id: 'streak_3',
    title: 'Konsisten (3 Hari)',
    description: 'Menyelesaikan latihan selama 3 hari berturut-turut.',
    icon: (props) => <Flame {...props} />,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30'
  },
  {
    id: 'streak_7',
    title: 'Terbakar Api (7 Hari)',
    description: 'Menyelesaikan latihan selama 7 hari berturut-turut.',
    icon: (props) => <Flame {...props} />,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30'
  },
  {
    id: 'workout_10',
    title: 'Pemula Tangguh',
    description: 'Telah menyelesaikan total 10 sesi latihan.',
    icon: (props) => <Dumbbell {...props} />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  {
    id: 'workout_50',
    title: 'Rutin & Disiplin',
    description: 'Telah menyelesaikan total 50 sesi latihan.',
    icon: (props) => <Trophy {...props} />,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
  {
    id: 'heavy_lifter',
    title: 'Besi Tua',
    description: 'Mengangkat total volume lebih dari 5.000 kg dalam satu sesi.',
    icon: (props) => <Zap {...props} />,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30'
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Menyelesaikan latihan sebelum jam 7 pagi.',
    icon: (props) => <Star {...props} />,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30'
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Menyelesaikan latihan setelah jam 9 malam.',
    icon: (props) => <Crown {...props} />,
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    borderColor: 'border-indigo-400/30'
  }
];

export const checkAchievements = (history, currentAchievements = [], newlyFinishedWorkout = null) => {
  const newUnlocks = [];
  
  if (!history) return newUnlocks;

  const dates = Object.keys(history).sort();
  const totalWorkouts = dates.reduce((acc, date) => acc + (history[date].workouts?.filter(w => w.status === 'completed').length || 0), 0);

  const has = (id) => currentAchievements.includes(id) || newUnlocks.some(a => a.id === id);
  const unlock = (id) => {
    if (!has(id)) {
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) newUnlocks.push(ach);
    }
  };

  if (totalWorkouts >= 10) unlock('workout_10');
  if (totalWorkouts >= 50) unlock('workout_50');

  let currentStreak = 0;
  let maxStreak = 0;
  let lastDateObj = null;

  dates.forEach(dateStr => {
    const workouts = history[dateStr].workouts?.filter(w => w.status === 'completed') || [];
    if (workouts.length > 0) {
      const d = new Date(dateStr);
      if (!lastDateObj) {
        currentStreak = 1;
      } else {
        const diffTime = Math.abs(d - lastDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, currentStreak);
      lastDateObj = d;
    }
  });

  if (maxStreak >= 3) unlock('streak_3');
  if (maxStreak >= 7) unlock('streak_7');

  if (newlyFinishedWorkout) {
    let totalVolume = 0;
    Object.values(newlyFinishedWorkout.log || {}).forEach(sets => {
      sets.forEach(s => {
        if (s.weight && s.reps) totalVolume += (parseFloat(s.weight) * parseInt(s.reps));
      });
    });
    if (totalVolume >= 5000) unlock('heavy_lifter');

    const finishDate = new Date(newlyFinishedWorkout.endTime || Date.now());
    const hour = finishDate.getHours();
    
    if (hour < 7) unlock('early_bird');
    if (hour >= 21) unlock('night_owl');
  }

  return newUnlocks;
};
