export const generateDynamicWorkout = (userProfile, gymProfile, exerciseLibrary) => {
  const { goal, experience, days, duration } = userProfile;
  const allowedEq = gymProfile ? gymProfile.equipment : 'all';
  
  // 1. Level & Equipment Filtering
  const levelOrder = { beginner: 1, intermediate: 2, advanced: 3 };
  const userLevelValue = levelOrder[experience] || 1;

  const validExercises = exerciseLibrary.filter(ex => {
    const exLevelValue = levelOrder[ex.level] || 1;
    if (exLevelValue > userLevelValue) return false;

    if (allowedEq !== 'all') {
      const eqArray = Array.isArray(allowedEq) ? allowedEq : [allowedEq];
      if (!eqArray.includes(ex.equipment) && ex.equipment !== 'Body Weight') {
        return false;
      }
    }
    return true;
  });

  // 2. Determine Split based on Days
  const daysCount = days ? days.length : 3;
  let splitPlan = [];
  
  if (daysCount <= 2) {
    const focusMuscles = ['Dada Tengah', 'Punggung Atas', 'Lats', 'Quads', 'Hams', 'Deltoid Depan', 'Biceps', 'Triceps'];
    splitPlan = days.map(d => ({ day: d, focus: 'Full Body', primaryMuscles: focusMuscles }));
  } else if (daysCount === 3) {
    splitPlan = [
      { day: days[0], focus: 'Push', primaryMuscles: ['Dada Tengah', 'Dada Atas', 'Deltoid Depan', 'Deltoid Samping', 'Triceps'] },
      { day: days[1], focus: 'Pull', primaryMuscles: ['Punggung Atas', 'Lats', 'Deltoid Belakang', 'Biceps'] },
      { day: days[2], focus: 'Legs & Core', primaryMuscles: ['Quads', 'Hams', 'Glutes', 'Calves', 'Core'] }
    ];
  } else if (daysCount === 4) {
    splitPlan = [
      { day: days[0], focus: 'Upper', primaryMuscles: ['Dada Tengah', 'Punggung Atas', 'Lats', 'Deltoid Depan', 'Deltoid Samping', 'Biceps', 'Triceps'] },
      { day: days[1], focus: 'Lower', primaryMuscles: ['Quads', 'Hams', 'Glutes', 'Calves', 'Core'] },
      { day: days[2], focus: 'Upper', primaryMuscles: ['Dada Atas', 'Lats', 'Punggung Atas', 'Deltoid Belakang', 'Triceps', 'Biceps'] },
      { day: days[3], focus: 'Lower', primaryMuscles: ['Hams', 'Glutes', 'Quads', 'Calves', 'Core'] }
    ];
  } else if (daysCount === 5 || daysCount === 6) {
    splitPlan = [
      { day: days[0], focus: 'Dada & Triceps', primaryMuscles: ['Dada Tengah', 'Dada Atas', 'Dada Bawah', 'Triceps'] },
      { day: days[1], focus: 'Punggung & Biceps', primaryMuscles: ['Punggung Atas', 'Lats', 'Traps', 'Biceps'] },
      { day: days[2], focus: 'Kaki', primaryMuscles: ['Quads', 'Hams', 'Glutes', 'Calves'] },
      { day: days[3], focus: 'Bahu', primaryMuscles: ['Deltoid Depan', 'Deltoid Samping', 'Deltoid Belakang', 'Traps'] },
      { day: days[4], focus: 'Lengan & Core', primaryMuscles: ['Biceps', 'Triceps', 'Forearm', 'Core'] },
    ];
    if (daysCount === 6) {
      splitPlan.push({ day: days[5], focus: 'Kelemahan / Full Body', primaryMuscles: ['Dada Tengah', 'Punggung Atas', 'Quads'] });
    }
  } else {
    splitPlan = [
      { day: days[0], focus: 'Push', primaryMuscles: ['Dada Tengah', 'Dada Atas', 'Deltoid Depan', 'Deltoid Samping', 'Triceps'] },
      { day: days[1], focus: 'Pull', primaryMuscles: ['Punggung Atas', 'Lats', 'Deltoid Belakang', 'Biceps'] },
      { day: days[2], focus: 'Legs', primaryMuscles: ['Quads', 'Hams', 'Glutes', 'Calves'] },
      { day: days[3], focus: 'Push', primaryMuscles: ['Dada Tengah', 'Dada Bawah', 'Deltoid Samping', 'Triceps'] },
      { day: days[4], focus: 'Pull', primaryMuscles: ['Punggung Atas', 'Lats', 'Biceps', 'Forearm'] },
      { day: days[5], focus: 'Legs', primaryMuscles: ['Hams', 'Glutes', 'Quads', 'Core'] },
      { day: days[6], focus: 'Active Recovery', primaryMuscles: ['Cardio', 'Core'] }
    ];
  }

  // 3. Goal specific variables
  let targetSets = 3;
  let targetReps = 10;
  let targetRest = 90;
  let targetRpe = 8;
  
  if (goal === 'muscle_gain') {
    targetSets = 4; targetReps = 10; targetRest = 90; targetRpe = 8;
  } else if (goal === 'fat_loss') {
    targetSets = 3; targetReps = 12; targetRest = 60; targetRpe = 8;
  } else if (goal === 'strength') {
    targetSets = 5; targetReps = 5; targetRest = 180; targetRpe = 9;
  } else {
    targetSets = 3; targetReps = 12; targetRest = 90; targetRpe = 7;
  }

  // 4. Memory Slate
  const usedExercises = new Set();
  
  const pickExercise = (targetMuscle, allowReuse = false) => {
    let available = validExercises.filter(ex => ex.target.includes(targetMuscle));
    
    // Strict level match preference
    let exactLevelMatch = available.filter(ex => (levelOrder[ex.level] || 1) === userLevelValue);
    if (exactLevelMatch.length > 0) available = exactLevelMatch;

    let unused = available.filter(ex => !usedExercises.has(ex.id));
    
    if (unused.length === 0) {
      if (allowReuse && available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
      }
      return null;
    }

    const picked = unused[Math.floor(Math.random() * unused.length)];
    usedExercises.add(picked.id);
    return picked;
  };

  const routines = [];
  let maxExercisesPerDay = 6;
  let useSuperset = false;
  if (duration === 'short') {
    maxExercisesPerDay = 4;
    useSuperset = true;
  } else if (duration === 'long') {
    maxExercisesPerDay = 8;
  }

  // 5. Generate Routines
  splitPlan.forEach((dayPlan, idx) => {
    const routineExs = [];
    const dayMuscles = [...dayPlan.primaryMuscles];
    let count = 0;

    // Active recovery day uses Cardio / Core time based sets
    if (dayPlan.focus === 'Active Recovery') {
      dayMuscles.forEach(muscle => {
        if (count >= 3) return;
        const ex = pickExercise(muscle, true);
        if (ex && !routineExs.find(e => e.id === ex.id)) {
          routineExs.push({
            ...ex,
            sets: 1, reps: 0, duration: ex.duration || 20, rest: 0, rpe: 5
          });
          count++;
        }
      });
    } else {
      dayMuscles.forEach(muscle => {
        if (count >= maxExercisesPerDay) return;
        const ex = pickExercise(muscle, true);
        if (ex && !routineExs.find(e => e.id === ex.id)) {
          routineExs.push({
            ...ex,
            sets: ex.type === 'time' ? 1 : targetSets,
            reps: ex.type === 'time' ? 0 : targetReps,
            duration: ex.type === 'time' ? (ex.duration || 15) : 0,
            rest: targetRest,
            rpe: targetRpe
          });
          count++;
        }
      });

      while (count < maxExercisesPerDay) {
        const muscle = dayMuscles[Math.floor(Math.random() * dayMuscles.length)];
        const ex = pickExercise(muscle, true);
        if (ex && !routineExs.find(e => e.id === ex.id)) {
          routineExs.push({
            ...ex,
            sets: ex.type === 'time' ? 1 : targetSets,
            reps: ex.type === 'time' ? 0 : targetReps,
            duration: ex.type === 'time' ? (ex.duration || 15) : 0,
            rest: targetRest,
            rpe: targetRpe
          });
          count++;
        } else {
          break;
        }
      }

      // Superset
      if (useSuperset && routineExs.length >= 2) {
        const compounds = ['Smith Machine Squat', 'Barbell Bench Press', 'SM Flat Bench Press', 'Romanian Deadlift (RDL)', 'SM Romanian Deadlift (RDL)', 'DB Bulgarian Split Squat'];
        let paired = new Set();
        for (let i = 0; i < routineExs.length - 1; i++) {
          if (paired.has(i)) continue;
          if (compounds.includes(routineExs[i].name) || routineExs[i].type === 'time') continue;

          for (let j = i + 1; j < routineExs.length; j++) {
            if (paired.has(j)) continue;
            if (compounds.includes(routineExs[j].name) || routineExs[j].type === 'time') continue;

            const t1 = routineExs[i].target.join(' ');
            const t2 = routineExs[j].target.join(' ');
            
            let isPairable = false;
            if ((t1.includes('Biceps') && t2.includes('Triceps')) || (t1.includes('Triceps') && t2.includes('Biceps'))) isPairable = true;
            if ((t1.includes('Dada') && t2.includes('Punggung')) || (t1.includes('Punggung') && t2.includes('Dada'))) isPairable = true;
            if (t1 === t2) isPairable = true;

            if (isPairable) {
              routineExs[i].isSuperset = true;
              routineExs[i].supersetId = `ss-${idx}-${i}`;
              routineExs[j].isSuperset = true;
              routineExs[j].supersetId = `ss-${idx}-${i}`;
              paired.add(i);
              paired.add(j);
              break;
            }
          }
        }
      }
    }

    routines.push({
      id: `prog-${idx+1}`,
      name: `${dayPlan.focus} (${dayPlan.day})`,
      day: dayPlan.day,
      exercises: routineExs
    });
  });

  return {
    id: `plan-${Date.now()}`,
    daysPerWeek: daysCount,
    userGoal: goal,
    userExperience: experience,
    duration: duration,
    routines: routines
  };
};
