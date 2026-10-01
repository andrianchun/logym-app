import fs from 'fs';
import path from 'path';

// Files to transform (exclude ShareCardGenerator - it renders to image with intentional px sizes)
const FILES = [
  'src/pages/CalendarTab.jsx',
  'src/components/ImmersiveWorkout.jsx',
  'src/components/SharedProfileView.jsx',
  'src/modals/AdminDashboardModal.jsx',
  'src/pages/CommunityTab.jsx',
  'src/pages/ProgramTab.jsx',
  'src/components/GymAIChat.jsx',
  'src/data/achievements.jsx',
  'src/utils/colors.js',
  'src/components/DashboardModals.jsx',
  'src/components/EmptyWorkoutState.jsx',
  'src/pages/ProgressTab.jsx',
  'src/modals/SettingsModal.jsx',
  'src/components/ExerciseDetailModal.jsx',
  'src/components/Header.jsx',
  'src/modals/BugReportModal.jsx',
  'src/pages/DatabaseTab.jsx',
  'src/App.jsx',
  'src/components/BleDeviceCard.jsx',
  'src/components/AlternativeExerciseModal.jsx',
  'src/components/CoachLogyFloat.jsx',
  'src/components/ModerationPanel.jsx',
  'src/components/SharedSteps.jsx',
  'src/components/UnifiedExerciseCard.jsx',
  'src/modals/ProfileModal.jsx',
  'src/components/GymManagerModal.jsx',
  'src/components/DeveloperTools.jsx',
  'src/components/FloatingTimer.jsx',
  'src/components/MuscleProgress.jsx',
  'src/components/WellnessCheckModal.jsx',
  'src/components/BottomNav.jsx',
  'src/components/CreatePostModal.jsx',
  'src/components/FilterChips.jsx',
  'src/components/GeneralVideosModal.jsx',
  'src/components/PwaInstallPrompt.jsx',
  'src/components/UnifiedBadge.jsx',
  'src/components/UpdaterAlert.jsx',
  'src/modals/AddExerciseModal.jsx',
  'src/modals/LibManagerModal.jsx',
  'src/utils/hrZones.js',
  'src/components/AchievementPopup.jsx',
  'src/components/DashboardChart.jsx',
  'src/components/FollowListModal.jsx',
  'src/components/NotificationPanel.jsx',
  'src/components/WorkoutHeader.jsx',
  'src/pages/AuthPage.jsx',
  'src/pages/WorkoutTab.jsx',
];

let totalArb = 0;
let totalCol = 0;
const results = [];

for (const file of FILES) {
  if (!fs.existsSync(file)) {
    results.push({ file, status: 'SKIP (not found)' });
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');
  const origContent = content;

  // Count before
  const arbBefore = (content.match(/text-\[\d+[^\]]*\]/g) || []).length;
  const colBefore = (content.match(/\b(zinc|neutral|gray|orange|yellow|purple)-[a-z0-9/]+/g) || []).length;

  // 1. Typography: arbitrary px → text-xs
  content = content.replace(/text-\[1[0-3]px\]/g, 'text-xs');  // 10-13px → xs
  content = content.replace(/text-\[[7-9]px\]/g, 'text-xs');    // 7-9px → xs
  content = content.replace(/text-\[14px\]/g, 'text-sm');       // 14px → sm (if any)
  content = content.replace(/text-\[15px\]/g, 'text-sm');       // 15px → sm (if any)

  // 2. Colors: zinc → slate
  content = content.replace(/\bzinc-50\b/g, 'slate-50');
  content = content.replace(/\bzinc-100\b/g, 'slate-100');
  content = content.replace(/\bzinc-200\b/g, 'slate-200');
  content = content.replace(/\bzinc-300\b/g, 'slate-300');
  content = content.replace(/\bzinc-400\b/g, 'slate-400');
  content = content.replace(/\bzinc-500\b/g, 'slate-500');
  content = content.replace(/\bzinc-600\b/g, 'slate-600');
  content = content.replace(/\bzinc-700\b/g, 'slate-700');
  content = content.replace(/\bzinc-800\b/g, 'slate-800');
  content = content.replace(/\bzinc-900\b/g, 'slate-900');

  // neutral → slate
  content = content.replace(/\bneutral-(\d+)/g, 'slate-$1');

  // gray → slate
  content = content.replace(/\bgray-(\d+)/g, 'slate-$1');

  // orange → amber (design.md: warning/rest = amber)
  content = content.replace(/\borange-(\d+)/g, 'amber-$1');

  // yellow → amber
  content = content.replace(/\byellow-(\d+)/g, 'amber-$1');

  // purple → violet (design.md: AI = violet)
  content = content.replace(/\bpurple-(\d+)/g, 'violet-$1');

  if (content !== origContent) {
    fs.writeFileSync(file, content, 'utf8');
  }

  // Count after
  const arbAfter = (content.match(/text-\[\d+[^\]]*\]/g) || []).length;
  const colAfter = (content.match(/\b(zinc|neutral|gray|orange|yellow|purple)-[a-z0-9/]+/g) || []).length;

  totalArb += arbBefore;
  totalCol += colBefore;

  if (arbBefore > 0 || colBefore > 0) {
    results.push({
      file,
      arbBefore,
      arbAfter,
      colBefore,
      colAfter,
      status: (arbAfter === 0 && colAfter === 0) ? '✅ CLEAN' : `⚠️ ${arbAfter} arb, ${colAfter} col remaining`
    });
  }
}

console.log(`\n=== BATCH TRANSFORM COMPLETE ===`);
console.log(`Total arbitrary fonts processed: ${totalArb}`);
console.log(`Total non-standard colors processed: ${totalCol}`);
console.log(`\nResults:`);
results.forEach(r => {
  if (r.arbBefore || r.colBefore) {
    console.log(`  ${r.file}: ${r.arbBefore}→${r.arbAfter} arb, ${r.colBefore}→${r.colAfter} col → ${r.status}`);
  }
});
