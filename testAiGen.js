
import { generateDynamicWorkout } from './src/utils/aiGenerator.js';
import { defaultMasterExercises } from './src/data/constants.js';

const userProfile = { goal: 'fat_loss', experience: 'intermediate', days: ['Senin', 'Kamis'], duration: 'short' };
const gymProfile = { equipment: 'all' };

const plan = generateDynamicWorkout(userProfile, gymProfile, defaultMasterExercises);
console.log(JSON.stringify(plan, null, 2));

