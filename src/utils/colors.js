export const PROGRAM_COLORS = [
  { bg: 'bg-amber-500 dark:bg-blue-500', text: 'text-amber-500 dark:text-blue-500', bgSoft: 'bg-amber-500/10 dark:bg-blue-500/20', border: 'border-amber-500/30 dark:border-blue-500/30' },
  { bg: 'bg-orange-500 dark:bg-sky-500', text: 'text-orange-500 dark:text-sky-500', bgSoft: 'bg-orange-500/10 dark:bg-sky-500/20', border: 'border-orange-500/30 dark:border-sky-500/30' },
  { bg: 'bg-yellow-500 dark:bg-indigo-500', text: 'text-yellow-500 dark:text-indigo-500', bgSoft: 'bg-yellow-500/10 dark:bg-indigo-500/20', border: 'border-yellow-500/30 dark:border-indigo-500/30' },
  { bg: 'bg-rose-500 dark:bg-cyan-500', text: 'text-rose-500 dark:text-cyan-500', bgSoft: 'bg-rose-500/10 dark:bg-cyan-500/20', border: 'border-rose-500/30 dark:border-cyan-500/30' },
  { bg: 'bg-amber-600 dark:bg-blue-400', text: 'text-amber-600 dark:text-blue-400', bgSoft: 'bg-amber-600/10 dark:bg-blue-400/20', border: 'border-amber-600/30 dark:border-blue-400/30' },
  { bg: 'bg-orange-400 dark:bg-sky-400', text: 'text-orange-400 dark:text-sky-400', bgSoft: 'bg-orange-400/10 dark:bg-sky-400/20', border: 'border-orange-400/30 dark:border-sky-400/30' },
  { bg: 'bg-yellow-600 dark:bg-indigo-400', text: 'text-yellow-600 dark:text-indigo-400', bgSoft: 'bg-yellow-600/10 dark:bg-indigo-400/20', border: 'border-yellow-600/30 dark:border-indigo-400/30' },
  { bg: 'bg-red-500 dark:bg-teal-500', text: 'text-red-500 dark:text-teal-500', bgSoft: 'bg-red-500/10 dark:bg-teal-500/20', border: 'border-red-500/30 dark:border-teal-500/30' },
  { bg: 'bg-amber-400 dark:bg-blue-600', text: 'text-amber-400 dark:text-blue-600', bgSoft: 'bg-amber-400/10 dark:bg-blue-600/20', border: 'border-amber-400/30 dark:border-blue-600/30' },
  { bg: 'bg-orange-600 dark:bg-violet-500', text: 'text-orange-600 dark:text-violet-500', bgSoft: 'bg-orange-600/10 dark:bg-violet-500/20', border: 'border-orange-600/30 dark:border-violet-500/30' }
];

export const getProgramColor = (programId) => {
  if (!programId || programId === 'adhoc') return PROGRAM_COLORS[2]; // fallback
  let hash = 0;
  for (let i = 0; i < programId.length; i++) {
    hash = programId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PROGRAM_COLORS.length;
  return PROGRAM_COLORS[index];
};
