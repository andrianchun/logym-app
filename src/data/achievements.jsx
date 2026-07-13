import { Trophy, Flame, Dumbbell, Zap, Target, Star, Crown, Shield, Users, MessageSquare, Save, UserCheck, Calendar } from 'lucide-react';
import React from 'react';

// Achievements definitions
export const ACHIEVEMENTS = [
  // RANK (Sesi Latihan)
  {
    id: 'first_workout',
    title: 'Awakening',
    description: 'Menyelesaikan sesi latihan pertama.',
    imageUrl: '/badges/badge_awakening.png',
    fallbackIcon: (props) => <Target {...props} />,
    color: 'text-emerald-500', bg: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30',
    target: 1, metric: 'Sesi',
    action: { label: 'Mulai Latihan', tab: 'workout' },
    calculateProgress: (ctx) => ctx.totalWorkouts || 0
  },
  {
    id: 'workout_10',
    title: 'Noble',
    description: 'Menyelesaikan total 10 sesi latihan.',
    imageUrl: '/badges/badge_noble.png',
    fallbackIcon: (props) => <Shield {...props} />,
    color: 'text-blue-500', bg: 'bg-blue-500/10', borderColor: 'border-blue-500/30',
    target: 10, metric: 'Sesi',
    action: { label: 'Lanjutkan Latihan', tab: 'workout' },
    calculateProgress: (ctx) => ctx.totalWorkouts || 0
  },
  {
    id: 'workout_50',
    title: 'Kesatria',
    description: 'Menyelesaikan total 50 sesi latihan.',
    imageUrl: '/badges/badge_kesatria.png',
    fallbackIcon: (props) => <Shield {...props} />,
    color: 'text-purple-500', bg: 'bg-purple-500/10', borderColor: 'border-purple-500/30',
    target: 50, metric: 'Sesi',
    action: { label: 'Mulai Latihan', tab: 'workout' },
    calculateProgress: (ctx) => ctx.totalWorkouts || 0
  },
  {
    id: 'workout_100',
    title: 'Veteran',
    description: 'Menyelesaikan total 100 sesi latihan.',
    imageUrl: '/badges/badge_veteran.png',
    fallbackIcon: (props) => <Trophy {...props} />,
    color: 'text-rose-500', bg: 'bg-rose-500/10', borderColor: 'border-rose-500/30',
    target: 100, metric: 'Sesi',
    action: { label: 'Mulai Latihan', tab: 'workout' },
    calculateProgress: (ctx) => ctx.totalWorkouts || 0
  },
  {
    id: 'workout_500',
    title: 'Elite',
    description: 'Menyelesaikan total 500 sesi latihan.',
    imageUrl: '/badges/badge_elite.png',
    fallbackIcon: (props) => <Crown {...props} />,
    color: 'text-cyan-500', bg: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30',
    target: 500, metric: 'Sesi',
    action: { label: 'Mulai Latihan', tab: 'workout' },
    calculateProgress: (ctx) => ctx.totalWorkouts || 0
  },
  {
    id: 'workout_1000',
    title: 'Grand',
    description: 'Menyelesaikan total 1.000 sesi latihan.',
    imageUrl: '/badges/badge_grand.png',
    fallbackIcon: (props) => <Crown {...props} />,
    color: 'text-red-500', bg: 'bg-red-500/10', borderColor: 'border-red-500/30',
    target: 1000, metric: 'Sesi',
    action: { label: 'Mulai Latihan', tab: 'workout' },
    calculateProgress: (ctx) => ctx.totalWorkouts || 0
  },
  {
    id: 'workout_2500',
    title: 'Raja',
    description: 'Menyelesaikan total 2.500 sesi latihan.',
    imageUrl: '/badges/badge_raja.png',
    fallbackIcon: (props) => <Crown {...props} />,
    color: 'text-yellow-400', bg: 'bg-yellow-400/10', borderColor: 'border-yellow-400/30',
    target: 2500, metric: 'Sesi',
    action: { label: 'Mulai Latihan', tab: 'workout' },
    calculateProgress: (ctx) => ctx.totalWorkouts || 0
  },
  {
    id: 'workout_5000',
    title: 'Dewa',
    description: 'Menyelesaikan total 5.000 sesi latihan.',
    imageUrl: '/badges/badge_dewa.png',
    fallbackIcon: (props) => <Crown {...props} />,
    color: 'text-amber-500', bg: 'bg-amber-500/10', borderColor: 'border-amber-500/30',
    target: 5000, metric: 'Sesi',
    action: { label: 'Mulai Latihan', tab: 'workout' },
    calculateProgress: (ctx) => ctx.totalWorkouts || 0
  },

  // STREAK
  {
    id: 'streak_3',
    title: 'Ignition',
    description: 'Menyelesaikan latihan selama 3 hari berturut-turut.',
    imageUrl: '/badges/badge_streak.png',
    fallbackIcon: (props) => <Flame {...props} />,
    color: 'text-orange-500', bg: 'bg-orange-500/10', borderColor: 'border-orange-500/30',
    target: 3, metric: 'Hari',
    action: { label: 'Pertahankan Streak!', tab: 'workout' },
    calculateProgress: (ctx) => ctx.maxStreak || 0
  },
  {
    id: 'streak_7',
    title: 'Relentless',
    description: 'Menyelesaikan latihan selama 7 hari berturut-turut.',
    imageUrl: '/badges/badge_streak.png',
    fallbackIcon: (props) => <Flame {...props} />,
    color: 'text-rose-500', bg: 'bg-rose-500/10', borderColor: 'border-rose-500/30',
    target: 7, metric: 'Hari',
    action: { label: 'Pertahankan Streak!', tab: 'workout' },
    calculateProgress: (ctx) => ctx.maxStreak || 0
  },
  {
    id: 'streak_14',
    title: 'Iron Will',
    description: 'Menyelesaikan latihan selama 14 hari berturut-turut.',
    imageUrl: '/badges/badge_streak.png',
    fallbackIcon: (props) => <Flame {...props} />,
    color: 'text-purple-500', bg: 'bg-purple-500/10', borderColor: 'border-purple-500/30',
    target: 14, metric: 'Hari',
    action: { label: 'Lanjutkan Streak!', tab: 'workout' },
    calculateProgress: (ctx) => ctx.maxStreak || 0
  },
  {
    id: 'streak_30',
    title: 'Immortal',
    description: 'Menyelesaikan latihan selama 30 hari berturut-turut.',
    imageUrl: '/badges/badge_streak.png',
    fallbackIcon: (props) => <Flame {...props} />,
    color: 'text-blue-500', bg: 'bg-blue-500/10', borderColor: 'border-blue-500/30',
    target: 30, metric: 'Hari',
    action: { label: 'Lanjutkan Streak!', tab: 'workout' },
    calculateProgress: (ctx) => ctx.maxStreak || 0
  },

  // VOLUME
  {
    id: 'heavy_lifter',
    title: 'Behemoth',
    description: 'Mengangkat total volume 5.000 kg dalam satu sesi.',
    imageUrl: '/badges/badge_volume.png',
    fallbackIcon: (props) => <Zap {...props} />,
    color: 'text-yellow-500', bg: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30',
    target: 5000, metric: 'Kg',
    action: { label: 'Push The Limit', tab: 'workout' },
    calculateProgress: (ctx) => ctx.maxVolume || 0
  },
  {
    id: 'volume_10k',
    title: 'Leviathan',
    description: 'Mengangkat total volume 10.000 kg dalam satu sesi.',
    imageUrl: '/badges/badge_volume.png',
    fallbackIcon: (props) => <Zap {...props} />,
    color: 'text-orange-500', bg: 'bg-orange-500/10', borderColor: 'border-orange-500/30',
    target: 10000, metric: 'Kg',
    action: { label: 'Push The Limit', tab: 'workout' },
    calculateProgress: (ctx) => ctx.maxVolume || 0
  },
  {
    id: 'volume_20k',
    title: 'Colossus',
    description: 'Mengangkat total volume 20.000 kg dalam satu sesi.',
    imageUrl: '/badges/badge_volume.png',
    fallbackIcon: (props) => <Zap {...props} />,
    color: 'text-red-500', bg: 'bg-red-500/10', borderColor: 'border-red-500/30',
    target: 20000, metric: 'Kg',
    action: { label: 'Push The Limit', tab: 'workout' },
    calculateProgress: (ctx) => ctx.maxVolume || 0
  },

  // TIME
  {
    id: 'early_bird',
    title: 'Dawnbreaker',
    description: 'Menyelesaikan latihan sebelum jam 7 pagi.',
    imageUrl: '/badges/badge_time.png',
    fallbackIcon: (props) => <Star {...props} />,
    color: 'text-amber-400', bg: 'bg-amber-400/10', borderColor: 'border-amber-400/30',
    target: 1, metric: 'Sesi Pagi',
    action: { label: 'Bangun Pagi!', tab: 'workout' },
    calculateProgress: (ctx) => ctx.earlyBirdCount || 0
  },
  {
    id: 'night_owl',
    title: 'Nightstalker',
    description: 'Menyelesaikan latihan setelah jam 9 malam.',
    imageUrl: '/badges/badge_time.png',
    fallbackIcon: (props) => <Star {...props} />,
    color: 'text-indigo-400', bg: 'bg-indigo-400/10', borderColor: 'border-indigo-400/30',
    target: 1, metric: 'Sesi Malam',
    action: { label: 'Latihan Malam', tab: 'workout' },
    calculateProgress: (ctx) => ctx.nightOwlCount || 0
  },
  {
    id: 'abyssal_shadow',
    title: 'Abyssal Shadow',
    description: 'Menyelesaikan latihan di atas jam 12 malam.',
    imageUrl: '/badges/badge_time.png',
    fallbackIcon: (props) => <Star {...props} />,
    color: 'text-purple-600', bg: 'bg-purple-600/10', borderColor: 'border-purple-600/30',
    target: 1, metric: 'Sesi Tengah Malam',
    action: { label: 'Latihan Midnight', tab: 'workout' },
    calculateProgress: (ctx) => ctx.midnightCount || 0
  },

  // SOCIAL
  {
    id: 'social_post_1',
    title: 'Herald',
    description: 'Membagikan 1 post ke Feed Komunitas.',
    imageUrl: '/badges/badge_social.png',
    fallbackIcon: (props) => <Users {...props} />,
    color: 'text-blue-400', bg: 'bg-blue-400/10', borderColor: 'border-blue-400/30',
    target: 1, metric: 'Post',
    action: { label: 'Share Sesuatu', tab: 'komunitas' },
    calculateProgress: (ctx) => ctx.postCount || 0
  },
  {
    id: 'social_post_10',
    title: 'Voice of the Realm',
    description: 'Membagikan 10 post ke Feed Komunitas.',
    imageUrl: '/badges/badge_social.png',
    fallbackIcon: (props) => <Users {...props} />,
    color: 'text-sky-500', bg: 'bg-sky-500/10', borderColor: 'border-sky-500/30',
    target: 10, metric: 'Post',
    action: { label: 'Share Sesuatu', tab: 'komunitas' },
    calculateProgress: (ctx) => ctx.postCount || 0
  },
  {
    id: 'social_follow_1',
    title: 'Allied Forces',
    description: 'Mengikuti (follow) 1 pengguna lain.',
    imageUrl: '/badges/badge_social.png',
    fallbackIcon: (props) => <Users {...props} />,
    color: 'text-emerald-400', bg: 'bg-emerald-400/10', borderColor: 'border-emerald-400/30',
    target: 1, metric: 'Following',
    action: { label: 'Cari Teman', tab: 'komunitas' },
    calculateProgress: (ctx) => ctx.followingCount || 0
  },
  {
    id: 'social_follow_50',
    title: 'Legion Commander',
    description: 'Mengikuti 50 pengguna.',
    imageUrl: '/badges/badge_social.png',
    fallbackIcon: (props) => <Users {...props} />,
    color: 'text-emerald-600', bg: 'bg-emerald-600/10', borderColor: 'border-emerald-600/30',
    target: 50, metric: 'Following',
    action: { label: 'Cari Teman', tab: 'komunitas' },
    calculateProgress: (ctx) => ctx.followingCount || 0
  },
  {
    id: 'social_followers_10',
    title: 'Charismatic Leader',
    description: 'Di-follow oleh 10 pengguna.',
    imageUrl: '/badges/badge_social.png',
    fallbackIcon: (props) => <Users {...props} />,
    color: 'text-pink-500', bg: 'bg-pink-500/10', borderColor: 'border-pink-500/30',
    target: 10, metric: 'Followers',
    action: { label: 'Aktif di Komunitas', tab: 'komunitas' },
    calculateProgress: (ctx) => ctx.followersCount || 0
  },
  {
    id: 'social_followers_100',
    title: 'Idol of the Realm',
    description: 'Di-follow oleh 100 pengguna.',
    imageUrl: '/badges/badge_social.png',
    fallbackIcon: (props) => <Users {...props} />,
    color: 'text-rose-600', bg: 'bg-rose-600/10', borderColor: 'border-rose-600/30',
    target: 100, metric: 'Followers',
    action: { label: 'Aktif di Komunitas', tab: 'komunitas' },
    calculateProgress: (ctx) => ctx.followersCount || 0
  },

  // FEATURES
  {
    id: 'feature_ai_1',
    title: 'Seeker of Wisdom',
    description: 'Berinteraksi dengan AI Gym Coach.',
    imageUrl: '/badges/badge_feature.png',
    fallbackIcon: (props) => <MessageSquare {...props} />,
    color: 'text-violet-500', bg: 'bg-violet-500/10', borderColor: 'border-violet-500/30',
    target: 1, metric: 'Pesan',
    action: { label: 'Tanya Coach', tab: 'ai' },
    calculateProgress: (ctx) => ctx.aiChatCount || 0
  },
  {
    id: 'feature_program_1',
    title: 'Architect of Fate',
    description: 'Membuat atau menyimpan program latihan custom.',
    imageUrl: '/badges/badge_feature.png',
    fallbackIcon: (props) => <Save {...props} />,
    color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', borderColor: 'border-fuchsia-500/30',
    target: 1, metric: 'Program',
    action: { label: 'Buat Program', tab: 'workout' },
    calculateProgress: (ctx) => ctx.customProgramCount || 0
  },
  {
    id: 'feature_profile_complete',
    title: 'Soul Forged',
    description: 'Melengkapi identitas data diri di profil.',
    imageUrl: '/badges/badge_feature.png',
    fallbackIcon: (props) => <UserCheck {...props} />,
    color: 'text-teal-500', bg: 'bg-teal-500/10', borderColor: 'border-teal-500/30',
    target: 1, metric: 'Selesai',
    action: { label: 'Lengkapi Profil', tab: 'edit_profile' },
    calculateProgress: (ctx) => ctx.isProfileComplete ? 1 : 0
  },

  // VETERAN (WAKTU BERGABUNG)
  {
    id: 'veteran_30d',
    title: 'Enduring Soul',
    description: 'Telah bergabung dengan Logym selama 30 hari.',
    imageUrl: '/badges/badge_feature.png',
    fallbackIcon: (props) => <Calendar {...props} />,
    color: 'text-indigo-500', bg: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30',
    target: 30, metric: 'Hari',
    action: { label: 'Lanjutkan!', tab: 'progress' },
    calculateProgress: (ctx) => ctx.accountAgeDays || 0
  },
  {
    id: 'veteran_365d',
    title: 'Ancient Guardian',
    description: 'Telah bergabung dengan Logym selama 1 Tahun.',
    imageUrl: '/badges/badge_feature.png',
    fallbackIcon: (props) => <Calendar {...props} />,
    color: 'text-yellow-600', bg: 'bg-yellow-600/10', borderColor: 'border-yellow-600/30',
    target: 365, metric: 'Hari',
    action: { label: 'Lanjutkan!', tab: 'progress' },
    calculateProgress: (ctx) => ctx.accountAgeDays || 0
  }
];

export const getAchievementContext = (history, userProfile, extraData = {}) => {
  let totalWorkouts = 0;
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDateObj = null;
  let maxVolume = 0;
  let earlyBirdCount = 0;
  let nightOwlCount = 0;
  let midnightCount = 0;
  let firstWorkoutTime = null;

  if (history) {
    const dates = Object.keys(history).sort();
    
    dates.forEach(dateStr => {
      const workouts = history[dateStr].workouts?.filter(w => w.status === 'completed') || [];
      if (workouts.length > 0) {
        totalWorkouts += workouts.length;
        
        workouts.forEach(w => {
          let sessionVol = 0;
          Object.values(w.log || {}).forEach(sets => {
            sets.forEach(s => {
              if (s.weight && s.reps) sessionVol += (parseFloat(s.weight) * parseInt(s.reps));
            });
          });
          maxVolume = Math.max(maxVolume, sessionVol);
          
          if (w.endTime) {
            if (!firstWorkoutTime) firstWorkoutTime = w.endTime;
            const hour = new Date(w.endTime).getHours();
            if (hour < 7) earlyBirdCount++;
            else if (hour >= 21) nightOwlCount++;
            if (hour >= 0 && hour < 4) midnightCount++;
          }
        });
        
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
  }

  // Calculate Account Age
  let accountAgeDays = 0;
  if (firstWorkoutTime) {
    accountAgeDays = Math.floor((Date.now() - firstWorkoutTime) / (1000 * 60 * 60 * 24));
  } else if (userProfile?.createdAt) {
    accountAgeDays = Math.floor((Date.now() - userProfile.createdAt) / (1000 * 60 * 60 * 24));
  }

  // Profile Completeness
  const isProfileComplete = userProfile?.gender && userProfile?.dob && userProfile?.name ? true : false;

  return {
    totalWorkouts,
    maxStreak,
    maxVolume,
    earlyBirdCount,
    nightOwlCount,
    midnightCount,
    accountAgeDays,
    isProfileComplete,
    postCount: extraData?.postCount || 0,
    followingCount: extraData?.followingCount || 0,
    followersCount: extraData?.followersCount || 0,
    aiChatCount: extraData?.aiChatCount || 0,
    customProgramCount: extraData?.customProgramCount || 0
  };
};

export const checkAchievements = (history, currentAchievements = [], userProfile = null, extraData = {}) => {
  const newUnlocks = [];
  const ctx = getAchievementContext(history, userProfile, extraData);
  
  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = currentAchievements.includes(ach.id);
    if (!isUnlocked) {
      const progress = ach.calculateProgress(ctx);
      if (progress >= ach.target) {
        newUnlocks.push(ach);
      }
    }
  });

  return newUnlocks;
};
