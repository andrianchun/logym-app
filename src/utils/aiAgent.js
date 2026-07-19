import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// Shared API keys sekarang hidup di backend (functions/.env), bukan di bundle client.
// Alur: key pribadi user dipanggil langsung dari browser; tanpa key -> proxy Cloud Functions.

// Narrow, conservative whitelist: only messages that are PURELY social filler with
// no digits/exercise-ish content skip the heavy context (workout logs / active
// programs / biometrics). Anything not an exact/near match falls through to full
// context — the default is always "include", never "guess and exclude".
const FILLER_WORD = '(sip|siap|oke|ok|okay|mantap|noted|got it|nice|keren|good)';
const TRIVIAL_MESSAGE_PATTERNS = [
    /^(hai|halo|hi|hey|hello|oi|woy|pagi|siang|sore|malam)[!.\s]*$/i,
    /^(makasih|thanks|thank you|thx|terima kasih)[!.\s]*(bro|coach|raiga)?[!.\s]*$/i,
    new RegExp(`^${FILLER_WORD}([\\s,]+${FILLER_WORD})*[!.\\s]*$`, 'i'),
    /^(wk)+[!.\s]*$/i,
    /^(ha){2,}[!.\s]*$/i,
    /^(he){2,}[!.\s]*$/i,
    /^lol[!.\s]*$/i,
    /^(gas|yoi|yo|bro|coach)[!.\s]*$/i,
];

// Only gates on messages under this many characters — anything longer is treated
// as potentially substantive and always gets full context.
export const isTrivialMessage = (text) => {
    const t = (text || '').trim();
    if (!t || t.length > 20) return false;
    if (/\d/.test(t)) return false; // any digit = might be asking about weight/reps/dates
    return TRIVIAL_MESSAGE_PATTERNS.some(re => re.test(t));
};

// ---- Smart context gating -------------------------------------------------------
// Beyond pure filler (isTrivialMessage), a lot of everyday questions ("apa itu deload",
// "kenapa DOMS bisa muncul", "gimana cara stretching yang benar") don't need the user's
// personal workout/biometric/program data to answer well. A wrong guess here just costs
// a slightly-too-generic answer (never a wrong one, since the model still knows it has
// no data), so this stays conservative like isTrivialMessage: only skip when there's a
// real positive signal the question is generic, default to INCLUDING data otherwise.
const PERSONAL_DATA_SIGNALS = [
    /\d/, // any digit: weight, reps, sets, dates, percentages
    /\b(latihan(ku|mu|nya)?|progres(s)?|progress(ku|mu)?|riwayat|rekap|history|hari ini|kemarin|minggu (ini|lalu|kemarin)|bulan (ini|lalu)|kg|berat( badan)?|tinggi( badan)?|bmi|body ?fat|lemak|otot|kalori|massa otot|\bset(ku)?\b|\brep(ku)?\b|beban(ku)?|angkat(anku)?|sesi(ku)?|jadwal(ku|mu)?|program(ku|mu)?|plan(ku|mu)?|plateau|stuck|stagnan|mentok)\b/i,
    /\b(aku|gue|gua|saya)\b.{0,15}\b(udah|sudah|belum|baru|lagi)\b/i, // "aku udah/belum ..." biasanya nanya progres sendiri
];

// Pertanyaan pengetahuan umum ("apa itu X", "kenapa X", "gimana cara X secara umum")
// tanpa sebutan data pribadi sama sekali — kandidat kuat buat skip context berat.
const GENERIC_QUESTION_SIGNALS = [
    /^(apa( itu| bedanya| sih)?|kenapa|mengapa|gimana( sih)?( cara)?|bagaimana( cara)?|kapan sebaiknya|boleh(kah)? gak?)\b/i,
];

export const needsPersonalContext = (text) => {
    const t = (text || '').trim();
    if (!t) return false;
    if (isTrivialMessage(t)) return false;
    if (PERSONAL_DATA_SIGNALS.some(re => re.test(t))) return true;
    if (GENERIC_QUESTION_SIGNALS.some(re => re.test(t)) && t.length <= 120) return false;
    return true; // ambiguous -> safe default is inclusive
};

// ---- App usage help (opt-in context) --------------------------------------------
// The base LLM has zero built-in knowledge of this specific app's UI/features — without
// this block it would either say "I don't know" or hallucinate an answer. Only attach it
// when the message actually looks like an app-usage question, so the (much more common)
// fitness/data questions never pay for it.
const APP_HELP_SIGNALS = [
    /\b(gimana|bagaimana)\b.{0,20}\bcara\b/i,
    /\bcara (pakai|pake|guna|menggunakan|akses|buka|atur|ganti|ubah|hapus|tambah|export|import|backup)\b/i,
    /\b(fitur|menu|tombol|tab)\b.{0,15}\b(apa|dimana|di ?mana)\b/i,
    /\b(dimana|di ?mana)\b.{0,20}\b(letak|pengaturan|setting|menu|tombol)\b/i,
    /\b(swipe|sinkronisasi|sinkron|backup|export|import data|notifikasi|reminder|pengingat|leaderboard|komunitas|database latihan|mode edit|ulangi 7 hari)\b/i,
];

export const needsAppHelpContext = (text) => {
    const t = (text || '').trim();
    if (!t) return false;
    return APP_HELP_SIGNALS.some(re => re.test(t));
};

export const APP_HELP_REFERENCE = `[App Feature Reference — LOGYM app, use ONLY to answer how-do-I-use-the-app questions]
- Cross-device sync: login with the same email/password on any device; Firestore cloud sync happens automatically within seconds.
- Swipe input: tap a set/reps/weight number once to activate it, then swipe up/down to change the value.
- Reorder programs/exercises: tap the pencil icon next to a program name to enter Edit Mode, then hold + drag the dots icon.
- Custom exercises: Database tab -> add/manage exercise -> can set name, target muscle, and a YouTube link.
- Copy last week's schedule: Calendar tab -> "+ Ulangi 7 Hari Lalu" button.
- Coach Raiga (this chat): can create a brand-new program or edit/progress an existing active one directly from chat requests; personality (santai/galak/serius/custom) is changed in Settings -> Lanjutan.
- Body composition photo scan: Dashboard -> Komposisi Tubuh card -> upload/scan a smart-scale app screenshot (Zepp Life, Mi Fit, Garmin, Huawei Health, etc.), AI extracts the numbers automatically.
- Community: share workouts/achievements to a feed, follow other users, search by username, weekly social-score leaderboard.
- Progress charts: toggle which exercises/muscle groups are plotted (max 6 at once), switch between "Per Latihan" and "Per Otot" view.
- Reminders: Settings -> Lanjutan -> set default time and enable notifications.
- Backup: Settings -> Lanjutan -> export/import a JSON file, in addition to automatic cloud sync.
- Units/theme/language: Settings -> Preferensi tab.
- A longer FAQ with the same tips lives in Settings -> FAQ tab.`;

export const AI_MODELS = [
    // Google Gemini - IDs verified against the live v1beta ListModels endpoint.
    // Free-tier (AQ./AIza no-billing) keys only have quota on the flash/flash-lite tiers.
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash ✦', provider: 'google' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', provider: 'google' },
    { id: 'gemini-flash-latest', name: 'Gemini Flash (Latest)', provider: 'google' },
    { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite (Latest)', provider: 'google' },
    { id: 'gemini-pro-latest', name: 'Gemini Pro (Latest)', provider: 'google' },
    // OpenAI GPT
    { id: 'gpt-4o', name: 'GPT-4o ✦', provider: 'openai' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
    // Anthropic Claude
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5 ✦', provider: 'anthropic' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'anthropic' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'anthropic' },
];

// Detect which provider an API key belongs to
export const detectKeyProvider = (key) => {
    const k = (key || '').trim();
    if (k.startsWith('sk-ant')) return 'anthropic';
    if (k.startsWith('sk-')) return 'openai';
    if (k.startsWith('AIza')) return 'google'; // Gemini keys start with AIza
    if (k.startsWith('AQ.')) return 'google'; // Gemini express-mode keys start with AQ.
    return null;
};

// Returns all models so the UI is consistent. The chat logic will handle missing keys.
export const getAvailableModels = () => {
    return AI_MODELS;
};

// Canned, persona-flavored notification copy — deliberately NOT AI-generated per notification.
// Local notifications are scheduled ahead of time (sometimes days out) with no guarantee the
// device is online or the app is running when they fire, so the text has to be baked in up
// front. Multiple variants per persona/type avoid the same line repeating every single day.
// {placeholders} are filled in by getRaigaNotification().
export const RAIGA_NOTIF_TEMPLATES = {
    prep: {
        santai: [
            ['Bro, gas siap-siap!', '{program} lu tinggal 30 menit lagi. Cus ambil botol minum sama towel, kita gaspol bentar lagi.'],
            ['{program} sebentar lagi!', 'Tinggal 30 menit sebelum {program}. Mulai pemanasan ringan yuk biar gak kaget pas mulai.'],
        ],
        galak: [
            ['30 menit lagi. Jangan mager.', '{program} dimulai 30 menit lagi. Udah ganti baju belum? Jangan sampe gue cariin alasan lu.'],
            ['Gak ada alasan.', '30 menit sebelum {program}. Siap-siap sekarang, jangan nunggu mepet.'],
        ],
        serius: [
            ['Pengingat sesi latihan', 'Sesi {program} dimulai dalam 30 menit. Silakan siapkan peralatan dan mulai pemanasan ringan.'],
        ],
    },
    start: {
        santai: [
            ['Waktunya gas, bro!', '{program} lu mulai sekarang. Buka LOGYM, kita rapihin set pertama bareng-bareng.'],
            ['Cus mulai!', 'Ini waktunya {program}. Jangan ditunda-tunda ya, momentum penting bro.'],
        ],
        galak: [
            ['Sekarang. Gerak.', '{program} lu mulai detik ini juga. Gak ada alasan nunda-nunda lagi, langsung buka app dan mulai.'],
        ],
        serius: [
            ['Sesi latihan dimulai', '{program} dijadwalkan mulai sekarang. Silakan buka aplikasi untuk memulai sesi.'],
        ],
    },
    missed: {
        santai: [
            ['Kangen sama beban lu gak?', 'Udah {days} hari nih lu absen, bro. Gapapa kalo capek, tapi jangan sampe momentum ilang ya. Balik yuk!'],
        ],
        galak: [
            ['{days} hari. Cukup.', 'Udah {days} hari lu bolos tanpa kabar. Progress gak nunggu lu santai-santai. Balik sekarang, gak pake drama.'],
        ],
        serius: [
            ['Konsistensi menurun', 'Sudah {days} hari sejak sesi latihan terakhir. Disarankan untuk kembali ke jadwal guna menjaga progres.'],
        ],
    },
    insight: {
        santai: [
            ['Eh, {exName} lu stuck nih', '{exName} lu flat {weeks} minggu di {maxWeight}kg bro. Gue ada ide buat naikin lagi, cek chat yuk!'],
        ],
        galak: [
            ['{exName} lu mandek. Perbaiki.', '{weeks} minggu {exName} lu gak naik-naik dari {maxWeight}kg. Ini bukan plateau biasa, ini lu yang kurang niat. Buka chat sekarang.'],
        ],
        serius: [
            ['Plateau terdeteksi: {exName}', '{exName} stagnan selama {weeks} minggu di {maxWeight}kg. Rekomendasi penyesuaian program tersedia di chat.'],
        ],
    },
};

// 'custom' has no fixed voice (it's a freeform LLM instruction, not something we can render
// without calling the API) — notifications fall back to 'santai' for that persona.
export const getRaigaNotification = (type, persona, vars = {}) => {
    const pool = RAIGA_NOTIF_TEMPLATES[type]?.[persona] || RAIGA_NOTIF_TEMPLATES[type]?.santai || [];
    if (pool.length === 0) return null;
    const [titleTpl, bodyTpl] = pool[Math.floor(Math.random() * pool.length)];
    const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
    return { title: fill(titleTpl), body: fill(bodyTpl) };
};

// A key that hit a rate limit / error is benched for a few minutes, not forever —
// free-tier quotas reset per minute/day, so permanent "exhausted" was wrong.
export const KEY_COOLDOWN_MS = 5 * 60 * 1000;

// keyStatuses values are the epoch-ms timestamp of the last failure
// (legacy 'exhausted' strings are ignored, i.e. treated as recovered).
export const isKeyCoolingDown = (statusVal) =>
    typeof statusVal === 'number' && (Date.now() - statusVal) < KEY_COOLDOWN_MS;

export const getProviderStatus = (provider, userApiKeys, keyStatuses) => {
    const keys = Array.isArray(userApiKeys) ? userApiKeys : [userApiKeys];
    const validKeys = keys.filter(k => k && typeof k === 'string' && k.trim() !== '');
    const providerKeys = validKeys.filter(k => detectKeyProvider(k) === provider);

    // Tanpa key pribadi, backend proxy selalu jadi fallback — tidak pernah 'missing'
    if (providerKeys.length === 0) return 'ready';

    let exhaustedCount = 0;
    providerKeys.forEach(k => {
        if (isKeyCoolingDown(keyStatuses?.[k.trim()])) exhaustedCount++;
    });

    // Semua key pribadi cooling down pun tetap 'warning' saja, karena backend jadi cadangan
    if (exhaustedCount > 0) return 'warning';
    return 'ready';
};

// Preset personality tone instructions. 'custom' is a placeholder — the actual
// instruction comes from the user's own customInstruction text at call time.
export const PERSONA_PRESETS = {
    santai: {
        label: 'Santai & Konyol',
        instruction: 'You must communicate in Indonesian using a relaxed, friendly, and "bro" style tone (use words like lu/gue, bro, asyik, santai). Be highly encouraging, a bit goofy/funny, but straight to the point. Do not be overly formal.'
    },
    galak: {
        label: 'Galak & Keras',
        instruction: 'You must communicate in Indonesian with a tough, drill-sergeant tone — firm, blunt, zero-nonsense, occasionally teasing the user for being lazy or making excuses. Still Indonesian informal (lu/gue is fine), but push hard, not sweet-talk. Never actually insulting or demeaning — tough love, not cruelty.'
    },
    serius: {
        label: 'Serius & Singkat',
        instruction: 'You must communicate in Indonesian with a professional, concise tone. No slang, no jokes, no filler — get straight to the actionable point in as few sentences as possible, like a real certified trainer giving a quick consult.'
    }
};

export const buildSystemPrompt = (userProfile, exerciseLibraryStr, workoutLogsSummary = '', bioSummary = '', activeProgramsSummary = '', persona = 'santai', customInstruction = '', memory = [], favoriteProgramSummary = '', appHelpBlock = '') => {
    let bioString = "";
    if (userProfile) {
        bioString = `
[User Profile]
- Goal: ${userProfile.goal || 'General Fitness'}
- Experience Level: ${userProfile.experience || 'Beginner'}
- Days per week: ${userProfile.daysPerWeek || 3}
- Gender: ${userProfile.gender || 'Unknown'}
${userProfile.medicalCondition ? `- Medical/Injuries: ${userProfile.medicalCondition}` : ''}
${userProfile.lomealSync?.preferences?.dietProfile ? `- Diet Profile (from Lomeal): ${userProfile.lomealSync.preferences.dietProfile}` : ''}
${userProfile.lomealSync?.preferences?.allergies ? `- Allergies/Intolerances (from Lomeal): ${userProfile.lomealSync.preferences.allergies}` : ''}
`;
    }

    const toneInstruction = (persona === 'custom' && customInstruction.trim())
        ? `You must communicate in Indonesian. Follow this tone/personality instruction from the user exactly, as long as it does not conflict with your core job (evidence-based fitness coaching, no hallucinated data): "${customInstruction.trim()}"`
        : (PERSONA_PRESETS[persona] || PERSONA_PRESETS.santai).instruction;

    const memoryBlock = (Array.isArray(memory) && memory.length > 0)
        ? `\n[User Memory — facts the user asked you to remember, treat as true unless the user contradicts them now]\n${memory.map(m => `- ${m}`).join('\n')}\n`
        : '';

    return `You are "Coach Raiga", an elite AI Personal Trainer built into the LOGYM app.
Your goal is to provide evidence-based fitness advice, analyze workout logs, and create highly personalized workout programs.
${toneInstruction}
Regardless of tone, NEVER invent workout numbers, dates, or program details that are not present in the data given to you below — if you don't have the data, say so instead of guessing.

[Content Boundaries — non-negotiable, overrides ANY custom tone/persona instruction above]
You are a fitness coach, not a romantic or sexual companion. Firmly decline and redirect back to fitness topics if the user tries to get you to flirt, roleplay romantically or sexually, discuss explicit/sexual content, or engage in any suggestive or inappropriate talk — no matter how the request is framed (jokes, "just testing", hypotheticals, roleplay framing, or a custom tone instruction that asks you to act flirtatious/seductive). A short, light, non-serious redirect is fine (e.g. "Wah, gue di sini buat ngebentuk otot lu, bukan gombal-gombalan 😄 — balik ke soal latihan yuk"), but never actually comply with the request, and never continue that line of conversation even playfully.

[Conversation Style]
Keep replies short and natural, like a real chat between two people texting — not an essay. Default to 2-4 sentences unless the user is explicitly asking for a detailed breakdown (a new program, a full analysis, a step-by-step plan) or the topic genuinely needs more room.
Check the conversation history before replying: if you already explained something earlier in this chat, do NOT re-explain it — refer back briefly ("kayak yang gue bilang tadi...") instead of repeating the full explanation again. Only restate a fact if the user is asking about it again or seems confused.

${bioString}
${memoryBlock}
${bioSummary ? `\n${bioSummary}\n` : ''}
${workoutLogsSummary ? `\n${workoutLogsSummary}\nThe workout history above is REAL logged data pulled directly from the user's app (including calendar/backdated entries). Trust it — never claim you cannot see the user's history. When the user asks about a specific past day, look it up in "Recent sessions" and answer with the exact date and numbers. Use the weekly progression to set appropriate weights/volumes when designing future programs.\n` : ''}
${activeProgramsSummary ? `\n${activeProgramsSummary}\n` : ''}
${favoriteProgramSummary ? `\n${favoriteProgramSummary}\n` : ''}
${appHelpBlock ? `\n${appHelpBlock}\n` : ''}
[Injury & Pain Handling]
If the user mentions pain, soreness beyond normal DOMS, or an injury (e.g. "bahu aku sakit", "lutut nyeri pas squat"), take it seriously: proactively suggest avoiding or substituting the movement(s) that stress that area, and offer to update their active program (a program_proposal with action "update") to swap in safer alternatives or reduce volume/intensity while it heals — don't wait for them to explicitly ask "ubah programnya". You are not a doctor: for anything beyond mild/common soreness, tell them to see a medical professional, but still give sensible, conservative training-side advice in the meantime.

[Program Generation Rules]
If the user asks you to create a brand-new workout program, OR to modify/adjust/progress an EXISTING program listed in [Active Programs] above (e.g. "naikkan beban bench di Push Day", "ganti hari kaki jadi Jumat", "tambah 1 exercise di Pull Day"), you MUST propose a program using the JSON format below.
When proposing a program, include your explanation first, and then append a JSON block enclosed strictly within <program_proposal> and </program_proposal> tags at the very end of your response.
Do NOT use markdown code blocks (\`\`\`json) inside the tags.
The JSON must exactly match this schema:
{
  "action": "create" | "update",
  "targetPlanId": "String — REQUIRED and must exactly match one of the planId values from [Active Programs] when action is \\"update\\". Omit or leave empty when action is \\"create\\".",
  "planName": "String — a short program name WITHOUT any day-count/frequency wording (no \\"3 Hari\\", \\"3x Seminggu\\", etc — that's redundant with daysPerWeek/routines and should never appear in the name itself). E.g. \\"Full Body Gainz\\", not \\"Full Body Gainz 3 Hari\\".",
  "description": "String",
  "daysPerWeek": Number,
  "routines": [
     {
        "name": "String — just the focus/theme (e.g. \"Power & Strength\", \"Push Day\"). NEVER prefix or suffix it with the day of the week (e.g. do not output \"Push Day (Senin)\" or \"Hari 1: Push\"). assignedDays already conveys which day this is, so any mention of the day inside the routine name is STRICTLY FORBIDDEN.",
        "assignedDays": ["String array — WAJIB DIISI. Gunakan singkatan hari Indonesia: Sen, Sel, Rab, Kam, Jum, Sab, Min. Distribusikan sesuai daysPerWeek user. Hanya kosongkan jika user secara eksplisit tidak menyebutkan jadwal apapun."],
        "exercises": [
           { "name": "String (Must match closely with an exercise in the library)", "sets": Number, "reps": Number }
        ]
     }
  ]
}

Rules for "update": include ALL routines the plan should have after the edit (this is a full replace of that plan's routines, not a merge) — so copy over unchanged routines exactly as they are in [Active Programs] and only change what the user asked for. Keep the same planName unless the user asked to rename it.
Rules for "create": always use action "create" with no targetPlanId when the user wants a separate new program rather than editing one that exists.

Available Exercise Library (Use these names as closely as possible):
${exerciseLibraryStr}

Only use the <program_proposal> tags if you are explicitly generating or editing a program for the user to use in the app. Otherwise, just reply with normal text.`;
};

/**
 * Latest known biometrics (weight/height/body-fat/etc) plus a simple trend, read
 * straight from history[date].bioData (same field the Dashboard/Vision-extract write to).
 */
export const summarizeBiometrics = (historyObj, userProfile, days = 90) => {
    if (!historyObj || Object.keys(historyObj).length === 0) {
        if (userProfile?.weight || userProfile?.height) {
            return `[Latest Biometrics]\nWeight: ${userProfile.weight || '-'}kg | Height: ${userProfile.height || '-'}cm`;
        }
        return '';
    }

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const hasCoreData = (b) => b && (Number(b.weight) > 0 || Number(b.bodyFat) > 0 || Number(b.musclePercent) > 0 || Number(b.bmr) > 0 || Number(b.bodyScore) > 0);

    const dates = Object.keys(historyObj)
        .filter(d => !isNaN(new Date(d).getTime()) && new Date(d).getTime() >= cutoff)
        .sort((a, b) => a.localeCompare(b)); // oldest -> newest

    let latest = null, latestDate = null, oldest = null;
    dates.forEach(d => {
        const b = historyObj[d]?.bioData;
        if (hasCoreData(b)) {
            if (!oldest) oldest = b;
            latest = b;
            latestDate = d;
        }
    });

    if (!latest) {
        if (userProfile?.weight || userProfile?.height) {
            return `[Latest Biometrics]\nWeight: ${userProfile.weight || '-'}kg | Height: ${userProfile.height || '-'}cm`;
        }
        return '';
    }

    const w = latest.weight || userProfile?.weight;
    const h = latest.height || userProfile?.height;
    let line = `[Latest Biometrics — as of ${latestDate}]\n`;
    line += `Weight: ${w || '-'}kg | Height: ${h || '-'}cm`;
    if (latest.bmi) line += ` | BMI: ${latest.bmi}${latest.bmiStatus ? ` (${latest.bmiStatus})` : ''}`;
    if (latest.bodyFat) line += ` | Body Fat: ${latest.bodyFat}%`;
    if (latest.musclePercent) line += ` | Muscle: ${latest.musclePercent}%`;
    if (latest.bmr) line += ` | BMR: ${latest.bmr}kcal`;

    if (oldest && oldest !== latest && oldest.weight && latest.weight) {
        const delta = (Number(latest.weight) - Number(oldest.weight)).toFixed(1);
        if (Math.abs(delta) >= 0.5) {
            line += `\nWeight trend (last ${days}d): ${oldest.weight}kg -> ${latest.weight}kg (${delta > 0 ? '+' : ''}${delta}kg)`;
        }
    }

    return line;
};

/**
 * Lists the user's currently active programs (grouped by planId, matching how
 * ProgramTab renders them) so the AI can reference real planId/exercise data when
 * the user asks to edit/progress an existing program instead of creating a new one.
 */
export const summarizeActivePrograms = (programs, activePlanIds) => {
    if (!Array.isArray(programs) || programs.length === 0) return '';

    const grouped = programs.reduce((acc, prog) => {
        const key = prog.planId || 'custom';
        if (!Array.isArray(activePlanIds) || activePlanIds.length === 0 || activePlanIds.includes(key)) {
            if (!acc[key]) acc[key] = { planId: key, planName: prog.planName || 'Program Default', planLevel: prog.planLevel, routines: [] };
            acc[key].routines.push(prog);
        }
        return acc;
    }, {});

    const plans = Object.values(grouped);
    if (plans.length === 0) return '';

    let summary = `[Active Programs — use the exact planId value as targetPlanId when the user asks to edit one of these]\n`;
    plans.forEach(plan => {
        summary += `Plan "${plan.planName}" (planId: ${plan.planId}${plan.planLevel ? `, level: ${plan.planLevel}` : ''}):\n`;
        plan.routines.forEach(r => {
            const days = r.assignedDays?.length ? ` (${r.assignedDays.join(', ')})` : '';
            const exList = (r.exercises || []).map(ex => `${ex.name} ${ex.sets}x${ex.reps}`).join(', ');
            summary += `  - ${r.name}${days}: ${exList}\n`;
        });
    });

    return summary;
};

/**
 * Programs have no explicit "favorite" flag (only individual exercises do, in the
 * Database tab) — so this derives a de-facto favorite purely from actual usage: how
 * often each program name shows up in completed workout sessions. Gives the AI a
 * light usage signal without needing a new favorite-toggle feature.
 */
export const summarizeFavoriteProgram = (historyObj, days = 90) => {
    if (!historyObj || Object.keys(historyObj).length === 0) return '';

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const counts = {};

    Object.keys(historyObj).forEach(dateStr => {
        const t = new Date(dateStr).getTime();
        if (isNaN(t) || t < cutoff) return;
        const day = historyObj[dateStr];
        const workouts = day?.workouts || (day?.status ? [day] : []);
        workouts.forEach(w => {
            if (w?.status !== 'completed' || !w.programName) return;
            counts[w.programName] = (counts[w.programName] || 0) + 1;
        });
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return '';

    const [topName, topCount] = entries[0];
    if (topCount < 2) return ''; // one-off session isn't a real signal yet

    return `[Favorite Program — derived from actual usage, not a manual flag] "${topName}" is the program the user runs most often (${topCount}x in the last ${days} days). Lean toward this when it's relevant (e.g. defaults, progression suggestions), but confirm with the user before assuming — and use [Active Programs] above for the real exercise/planId data.`;
};

/**
 * Detects exercises that have plateaued (no weight increase for N consecutive weeks).
 * Returns array of { name, weeks, maxWeight, lastDate } sorted by weeks stagnant descending.
 * Pure rule-based — no AI call required.
 */
export const detectPlateaus = (historyObj, minWeeks = 3, maxResults = 3) => {
    if (!historyObj || Object.keys(historyObj).length === 0) return [];

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const cutoff = now - 16 * WEEK_MS; // look at last 16 weeks

    const weeklyMax = {}; // name -> { [weekIdx]: maxKg }
    const lastSeen = {}; // name -> last dateStr with data

    Object.keys(historyObj).forEach(dateStr => {
        const t = new Date(dateStr).getTime();
        if (isNaN(t) || t < cutoff) return;
        const day = historyObj[dateStr];
        const workouts = day?.workouts || (day?.status ? [day] : []);
        workouts.forEach(w => {
            if (w?.status !== 'completed') return;
            const rawLog = (w.log && Object.keys(w.log).length > 0) ? (w.log.exerciseLogs || w.log) : null;
            if (!rawLog) return;

            const weekIdx = Math.floor((now - t) / WEEK_MS); // 0 = current week
            Object.entries(rawLog).forEach(([, sets]) => {
                const setList = Array.isArray(sets) ? sets : Object.values(sets || {});
                setList.forEach(s => {
                    if (!s || s.skipped) return;
                    const name = s.exerciseName || w.exercises?.find(e => String(e.id) === String(s.exId))?.name;
                    if (!name) return;
                    const wt = parseFloat(s.w !== undefined ? s.w : s.weight) || 0;
                    if (wt <= 0) return;
                    if (!weeklyMax[name]) weeklyMax[name] = {};
                    if (wt > (weeklyMax[name][weekIdx] || 0)) weeklyMax[name][weekIdx] = wt;
                    if (!lastSeen[name] || dateStr > lastSeen[name]) lastSeen[name] = dateStr;
                });
            });
        });
    });

    // Also try resolving from exercise-keyed logs (common format)
    Object.keys(historyObj).forEach(dateStr => {
        const t = new Date(dateStr).getTime();
        if (isNaN(t) || t < cutoff) return;
        const day = historyObj[dateStr];
        const workouts = day?.workouts || (day?.status ? [day] : []);
        workouts.forEach(w => {
            if (w?.status !== 'completed') return;
            const rawLog = (w.log && Object.keys(w.log).length > 0) ? (w.log.exerciseLogs || w.log) : null;
            if (!rawLog) return;
            const weekIdx = Math.floor((now - t) / WEEK_MS);
            const exMap = {};
            ;(w.exercises || []).concat(w.overriddenExercises || []).forEach(e => { if (e?.id) exMap[String(e.id)] = e.name; });
            Object.entries(rawLog).forEach(([exId, sets]) => {
                const name = exMap[String(exId)];
                if (!name) return;
                const setList = Array.isArray(sets) ? sets : Object.values(sets || {});
                setList.forEach(s => {
                    if (!s || s.skipped) return;
                    const wt = parseFloat(s.w !== undefined ? s.w : s.weight) || 0;
                    if (wt <= 0) return;
                    if (!weeklyMax[name]) weeklyMax[name] = {};
                    if (wt > (weeklyMax[name][weekIdx] || 0)) weeklyMax[name][weekIdx] = wt;
                    if (!lastSeen[name] || dateStr > lastSeen[name]) lastSeen[name] = dateStr;
                });
            });
        });
    });

    const plateaus = [];
    Object.entries(weeklyMax).forEach(([name, wkMap]) => {
        const weeks = Object.keys(wkMap).map(Number).sort((a, b) => a - b); // ascending (0=current)
        if (weeks.length < minWeeks) return;

        // Check N most recent consecutive weeks
        let flatStreak = 1;
        for (let i = 1; i < weeks.length; i++) {
            // Only count consecutive weeks (gap <= 1)
            if (weeks[i] - weeks[i - 1] > 1) { flatStreak = 1; continue; }
            if (wkMap[weeks[i]] <= wkMap[weeks[i - 1]]) {
                flatStreak++;
            } else {
                flatStreak = 1;
            }
        }
        if (flatStreak >= minWeeks) {
            const allVals = Object.values(wkMap);
            plateaus.push({
                name,
                weeks: flatStreak,
                maxWeight: Math.max(...allVals),
                lastDate: lastSeen[name] || ''
            });
        }
    });

    return plateaus
        .sort((a, b) => b.weeks - a.weeks)
        .slice(0, maxResults);
};

/**
 * Pre-processes raw history JSON into a lightweight token-efficient string.
 * Reads the app's real data model (history[date].workouts[].log — the same shape
 * ProgressTab charts use): log keys are exercise-instance ids resolved to names via
 * the library/program index, sets use { w, r, d, done, skipped } fields.
 * Output: per-session detail for recent dates + chronological weekly progression,
 * so the AI can both answer "what did I do last Tuesday" and plan future programs.
 */
export const summarizeWorkoutLogs = (historyObj, exerciseLibrary = [], programs = [], maxWeeks = 12) => {
    if (!historyObj || Object.keys(historyObj).length === 0) return "No workout history.";

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const cutoff = now - maxWeeks * WEEK_MS;

    // Index id -> exercise (library ids + every program-instance exercise id)
    const exIndex = {};
    (exerciseLibrary || []).forEach(ex => { if (ex && ex.id !== undefined) exIndex[String(ex.id)] = ex; });
    (programs || []).forEach(p => (p?.exercises || []).forEach(ex => {
        if (ex && ex.id !== undefined && !exIndex[String(ex.id)]) exIndex[String(ex.id)] = ex;
    }));

    const resolveExercise = (idStr, workout) => {
        const key = String(idStr);
        const local = [...(workout?.overriddenExercises || []), ...(workout?.exercises || [])]
            .find(e => String(e?.id) === key);
        if (local) return local;
        if (exIndex[key]) return exIndex[key];
        // Instance ids embed the library id as prefix, e.g. "123-abc" / "123_r0_e1"
        const base = key.split(/[-_]/)[0];
        return exIndex[base] || null;
    };

    const weekIdx = (t) => Math.floor((now - t) / WEEK_MS); // 0 = current week

    const sessions = [];
    const exerciseStats = {}; // name -> { weeklyMax: {idx: kg}, totalSets, maxWeight }
    const sessionsPerWeek = {};

    Object.keys(historyObj).forEach(dateStr => {
        const t = new Date(dateStr).getTime();
        if (isNaN(t) || t < cutoff) return;
        const day = historyObj[dateStr];
        // New shape: day.workouts[]; legacy shape: the day object itself is the workout
        const workouts = day?.workouts || (day?.status ? [day] : []);

        workouts.forEach(w => {
            if (w?.status !== 'completed') return;
            const rawLog = (w.log && Object.keys(w.log).length > 0) ? (w.log.exerciseLogs || w.log) : null;
            if (!rawLog) return;

            const sessionExercises = [];
            Object.entries(rawLog).forEach(([exId, sets]) => {
                const setList = Array.isArray(sets) ? sets : Object.values(sets || {});
                const doneSets = setList.filter(s => s && !s.skipped && (s.done || s.w || s.weight || s.r || s.reps));
                if (doneSets.length === 0) return;
                const ex = resolveExercise(exId, w);
                if (!ex?.name) return;

                let topWeight = 0, topReps = 0;
                doneSets.forEach(s => {
                    const wt = parseFloat(s.w !== undefined ? s.w : s.weight) || 0;
                    const rp = parseInt(s.r !== undefined ? s.r : s.reps) || 0;
                    if (wt > topWeight) topWeight = wt;
                    if (rp > topReps) topReps = rp;
                });
                sessionExercises.push({ name: ex.name, sets: doneSets.length, topWeight, topReps });

                if (!exerciseStats[ex.name]) exerciseStats[ex.name] = { weeklyMax: {}, totalSets: 0, maxWeight: 0 };
                const st = exerciseStats[ex.name];
                st.totalSets += doneSets.length;
                if (topWeight > st.maxWeight) st.maxWeight = topWeight;
                const wk = weekIdx(t);
                if (topWeight > (st.weeklyMax[wk] || 0)) st.weeklyMax[wk] = topWeight;
            });

            if (sessionExercises.length === 0) return;
            const wk = weekIdx(t);
            sessionsPerWeek[wk] = (sessionsPerWeek[wk] || 0) + 1;
            sessions.push({ dateStr, t, programName: w.programName || 'Workout', exercises: sessionExercises });
        });
    });

    if (sessions.length === 0) return "User has not logged any completed workouts yet.";

    sessions.sort((a, b) => b.t - a.t);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

    let summary = `[Workout History Context — real logged data from the app]\n`;
    summary += `Today: ${todayStr} (${dayNames[new Date().getDay()]})\n`;
    summary += `Completed sessions in last ${maxWeeks} weeks: ${sessions.length}\n\n`;

    summary += `Recent sessions (newest first):\n`;
    sessions.slice(0, 8).forEach(s => {
        const exStr = s.exercises.map(e => {
            let detail = `${e.sets} set`;
            if (e.topWeight > 0) detail += `, top ${e.topWeight}kg`;
            else if (e.topReps > 0) detail += `, max ${e.topReps} reps`;
            return `${e.name} (${detail})`;
        }).join(', ');
        summary += `- ${s.dateStr} ${dayNames[new Date(s.dateStr).getDay()]} — ${s.programName}: ${exStr}\n`;
    });

    const oldestWeek = Math.max(...Object.keys(sessionsPerWeek).map(Number));
    const weekSeq = [];
    for (let wk = oldestWeek; wk >= 0; wk--) weekSeq.push(wk);

    summary += `\nSessions per week (oldest→newest): ${weekSeq.map(wk => sessionsPerWeek[wk] || 0).join(', ')}\n`;
    summary += `Weekly max weight (kg) per exercise, oldest→newest ('-' = not trained that week):\n`;
    Object.entries(exerciseStats)
        .filter(([, st]) => st.maxWeight > 0) // bodyweight/timed exercises sudah tercakup di daftar sesi
        .sort((a, b) => b[1].totalSets - a[1].totalSets)
        .slice(0, 8)
        .forEach(([name, st]) => {
            const seq = weekSeq.map(wk => st.weeklyMax[wk] !== undefined ? st.weeklyMax[wk] : '-').join(', ');
            summary += `- ${name}: [${seq}] (${st.totalSets} sets, all-time max ${st.maxWeight}kg)\n`;
        });

    return summary;
};

export const checkOverallAIStatus = (userApiKeys, keyStatuses) => {
    // If no keys, we rely on backend proxy which is assumed 'ready' unless it repeatedly fails (not tracked in keyStatuses right now).
    const keys = Array.isArray(userApiKeys) ? userApiKeys : [userApiKeys];
    
    // Inject local environment variables if available
    const envKeys = [
        import.meta.env.VITE_GEMINI_API_KEY,
        import.meta.env.VITE_OPENAI_API_KEY,
        import.meta.env.VITE_ANTHROPIC_API_KEY
    ].filter(k => k && typeof k === 'string' && k.trim() !== '');
    
    const validKeys = [...keys, ...envKeys].filter(k => k && typeof k === 'string' && k.trim() !== '');
    if (validKeys.length === 0) return 'ready'; // backend fallback

    // Kita tidak memblokir UI di awal (karena ada fallback backend proxy).
    // Biarkan aplikasi mencoba memanggil AI. Jika backend juga limit/mati, exception akan dilempar
    // dan ditangkap dengan anggun oleh masing-masing UI (try-catch).
    return 'ready';
};

export async function chatWithAI(messages, userApiKeys = [], setKeyStatuses = null, onChunk = null) {
    const keys = Array.isArray(userApiKeys) ? userApiKeys : [userApiKeys];
    
    // Inject local environment variables if available
    const envKeys = [
        import.meta.env.VITE_GEMINI_API_KEY,
        import.meta.env.VITE_OPENAI_API_KEY,
        import.meta.env.VITE_ANTHROPIC_API_KEY
    ].filter(k => k && typeof k === 'string' && k.trim() !== '');

    const validKeys = [...keys, ...envKeys].filter(k => k && typeof k === 'string' && k.trim() !== '');
    
    const providers = ['google', 'openai', 'anthropic'];
    let lastError = null;

    // Try each valid key in order
    for (let i = 0; i < validKeys.length; i++) {
        const key = validKeys[i].trim();
        const aiProvider = detectKeyProvider(key);
        if (!aiProvider || !providers.includes(aiProvider)) continue;

        try {
            if (aiProvider === 'google') {
                const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
                const history = messages.filter(m => m.role !== 'system').map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }]
                }));

                const payload = {
                    system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
                    contents: history
                };

                const googleModels = AI_MODELS.filter(m => m.provider === 'google').map(m => m.id);
                const preferredModel = 'gemini-3.5-flash';
                const modelFallbackChain = [preferredModel, ...googleModels.filter(m => m !== preferredModel)];
                for (let mIdx = 0; mIdx < modelFallbackChain.length; mIdx++) {
                    const model = modelFallbackChain[mIdx];
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${onChunk ? 'streamGenerateContent?alt=sse&' : 'generateContent?'}key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const isLastModel = mIdx === modelFallbackChain.length - 1;
                    if ((res.status === 404 || res.status === 403 || res.status === 400 || res.status === 429 || res.status === 503) && !isLastModel) {
                        continue;
                    }
                    if (!res.ok) {
                        if (res.status === 429) throw new Error('RATE_LIMIT_EXCEEDED');
                        const errText = await res.text();
                        throw new Error(`Google API Error (${res.status}): ${errText.substring(0, 100)}`);
                    }

                    if (onChunk) {
                        const reader = res.body.getReader();
                        const decoder = new TextDecoder();
                        let fullText = '';
                        while (true) {
                            const { value, done } = await reader.read();
                            if (done) break;
                            const chunkStr = decoder.decode(value);
                            const lines = chunkStr.split('\n');
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const dataStr = line.substring(6).trim();
                                    if (dataStr === '[DONE]' || !dataStr) continue;
                                    try {
                                        const data = JSON.parse(dataStr);
                                        const textDelta = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                        if (textDelta) {
                                            fullText += textDelta;
                                            onChunk(textDelta);
                                        }
                                    } catch (e) {}
                                }
                            }
                        }
                        return fullText;
                    } else {
                        const data = await res.json();
                        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    }
                }
                throw new Error('All Gemini models failed for this key.');
            }
            else if (aiProvider === 'openai') {
                const openaiModels = AI_MODELS.filter(m => m.provider === 'openai').map(m => m.id);
                const model = 'gpt-4o-mini';

                // Stored AI replies use role 'model' (Gemini convention); OpenAI only accepts 'assistant'
                const normalizedMessages = messages.map(m => ({
                    role: m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant',
                    content: m.content
                }));
                const payload = { model, messages: normalizedMessages };
                if (onChunk) payload.stream = true;

                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(`OpenAI API Error (${res.status}): ${errText.substring(0, 100)}`);
                }

                if (onChunk) {
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    let fullText = '';
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        const chunkStr = decoder.decode(value);
                        const lines = chunkStr.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.substring(6).trim();
                                if (dataStr === '[DONE]' || !dataStr) continue;
                                try {
                                    const data = JSON.parse(dataStr);
                                    const textDelta = data.choices?.[0]?.delta?.content || '';
                                    if (textDelta) {
                                        fullText += textDelta;
                                        onChunk(textDelta);
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                    return fullText;
                } else {
                    const data = await res.json();
                    return data.choices?.[0]?.message?.content || '';
                }
            }
            else if (aiProvider === 'anthropic') {
                const anthropicModels = AI_MODELS.filter(m => m.provider === 'anthropic').map(m => m.id);
                const model = 'claude-sonnet-4-5';

                const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
                const history = messages.filter(m => m.role !== 'system').map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content
                }));

                const payload = { model, max_tokens: 4096, system: systemPrompt, messages: history };
                if (onChunk) payload.stream = true;

                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': key,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(`Anthropic API Error (${res.status}): ${errText.substring(0, 100)}`);
                }

                if (onChunk) {
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    let fullText = '';
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        const chunkStr = decoder.decode(value);
                        const lines = chunkStr.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.substring(6).trim();
                                if (!dataStr) continue;
                                try {
                                    const data = JSON.parse(dataStr);
                                    if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                                        const textDelta = data.delta.text || '';
                                        fullText += textDelta;
                                        onChunk(textDelta);
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                    return fullText;
                } else {
                    const data = await res.json();
                    return data.content?.find(b => b.type === 'text')?.text || '';
                }
            }
        } catch (err) {
            console.error(`AI Chat Error (Key ${i + 1}/${validKeys.length}):`, err);
            lastError = err;
            
            const errMsg = err.message || '';
            const statusMatch = errMsg.match(/\((\d{3})\)/);
            const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
            const isFallbackable =
                (statusCode !== null && (statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 429 || statusCode >= 500)) ||
                errMsg.includes('RATE_LIMIT_EXCEEDED') || errMsg.includes('overloaded') ||
                errMsg.includes('Failed to fetch') || errMsg.includes('All Gemini models failed');

            if (isFallbackable && setKeyStatuses) {
                setKeyStatuses(prev => ({ ...prev, [key]: Date.now() }));
            }

            if (!isFallbackable) throw err;
        }
    }

    // Tanpa key pribadi, atau semua key pribadi gagal: pakai backend proxy (shared keys di server)
    try {
        const call = httpsCallable(functions, 'aiChat', { timeout: 120000 });
        const res = await call({ messages });
        return res.data?.text || '';
    } catch (backendErr) {
        console.error('AI backend proxy error:', backendErr);
        throw new Error(backendErr.message || (lastError ? lastError.message : `Semua jalur AI gagal. Coba lagi nanti.`));
    }
}

// ---------------------------------------------------------------------------
// HYBRID ENGINE: Deterministic Program Generator
// Tries to build a workout plan from templates without calling the LLM.
// Returns a plan object on success, or null if constraints are too tight.
// ---------------------------------------------------------------------------

// Map injury → exercises to EXCLUDE (by name substring, case-insensitive)
const INJURY_EXCLUSIONS = {
    'lutut':        ['squat', 'lunge', 'leg press', 'step up', 'jump', 'running', 'lari'],
    'punggung bawah': ['deadlift', 'good morning', 'hyperextension', 'bent over', 'row barbell'],
    'bahu':         ['overhead press', 'shoulder press', 'upright row', 'lateral raise', 'military press'],
    'pergelangan tangan': ['wrist curl', 'push up', 'bench press', 'plank', 'burpee'],
    'leher':        ['neck', 'behind neck', 'shrug'],
    'siku':         ['tricep', 'curl', 'push up', 'bench press'],
    'pinggul':      ['hip thrust', 'hip hinge', 'sumo', 'lunge'],
    'hamstring':    ['deadlift', 'leg curl', 'nordic curl'],
};

const isInjured = (exName, injuries = []) => {
    const n = exName.toLowerCase();
    return injuries.some(inj => {
        const key = Object.keys(INJURY_EXCLUSIONS).find(k => inj.toLowerCase().includes(k));
        return key && INJURY_EXCLUSIONS[key].some(bad => n.includes(bad));
    });
};

// Equipment capability map
const EQUIPMENT_ALLOWS = {
    all:         () => true,
    barbell:     (ex) => !['machine', 'cable', 'smith'].some(w => ex.toLowerCase().includes(w)),
    dumbbells:   (ex) => !['barbell', 'machine', 'cable', 'smith', 'bar '].some(w => ex.toLowerCase().includes(w)),
    bodyweight:  (ex) => ['push', 'pull', 'dip', 'plank', 'crunch', 'squat', 'lunge', 'burpee', 'mountain', 'sit'].some(w => ex.toLowerCase().includes(w)),
};

export const generateDeterministicProgram = (answers, userProfile, exerciseLibrary = [], programPlans = [], targetGym = null) => {
    try {
        const injuries   = answers.injuries   || [];
        const daysCount  = (answers.days      || []).length || 3;
        const goal       = (answers.goal      || '').toLowerCase();
        const experience = (answers.experience|| '').toLowerCase();
        const equipmentType = targetGym?.equipment || 'all';
        const equipCheck = EQUIPMENT_ALLOWS[equipmentType] || EQUIPMENT_ALLOWS.all;

        // Filter exercise library to safe exercises for this user
        const safeExercises = exerciseLibrary.filter(ex => {
            if (isInjured(ex.name, injuries)) return false;
            if (!equipCheck(ex.name)) return false;
            return true;
        });

        // Pick a template plan matching the user's goal + day count
        const matchingPlans = programPlans.filter(plan => {
            if (plan.daysPerWeek !== daysCount) return false;
            if (goal.includes('kurus') || goal.includes('turun') || goal.includes('fat loss')) {
                return plan.goal === 'fat_loss' || plan.goal === 'general_fitness';
            }
            if (goal.includes('otot') || goal.includes('massa') || goal.includes('gede') || goal.includes('muscle')) {
                return plan.goal === 'muscle_gain' || plan.goal === 'hypertrophy';
            }
            if (goal.includes('kuat') || goal.includes('strength')) {
                return plan.goal === 'strength';
            }
            return plan.goal === 'general_fitness';
        });

        const basePlan = matchingPlans[0] || programPlans.find(p => p.daysPerWeek === daysCount) || programPlans[0];
        if (!basePlan) return null;

        // Substitute unsafe exercises in each day with safe alternatives
        const days = (basePlan.days || []).map(day => ({
            ...day,
            exercises: (day.exercises || []).map(ex => {
                if (!isInjured(ex.name, injuries) && equipCheck(ex.name)) return ex;
                // Find a safe substitute from the library in the same muscle group
                const sub = safeExercises.find(s =>
                    s.muscle === ex.muscle && !day.exercises.some(e => e.name === s.name)
                );
                return sub ? { ...ex, name: sub.name, id: sub.id } : null;
            }).filter(Boolean),
        }));

        const suffix = injuries.length > 0 ? ' (Cedera-Aman)' : '';
        return {
            ...basePlan,
            name: `${basePlan.name}${suffix}`,
            days,
            isAI: false,
            generatedBy: 'deterministic',
        };
    } catch (e) {
        console.warn('[generateDeterministicProgram] error:', e);
        return null;
    }
};

