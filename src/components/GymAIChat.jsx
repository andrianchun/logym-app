import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, deleteDoc, getDocs, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Send, X, Check, Loader2, Dumbbell, Menu, Plus, MessageSquare, Trash2, Bookmark, ChevronDown, ChevronRight } from 'lucide-react';
import { buildSystemPrompt, summarizeWorkoutLogs, summarizeBiometrics, summarizeActivePrograms, summarizeFavoriteProgram, needsPersonalContext, needsAppHelpContext, APP_HELP_REFERENCE, chatWithAI, AI_MODELS, getAvailableModels, getProviderStatus, checkOverallAIStatus } from '../utils/aiAgent';
import renderMiniMarkdown from '../utils/miniMarkdown';
import { db } from '../firebase';

const THINKING_PHASES = ['Membaca riwayat latihanmu...', 'Menganalisis progress mingguan...', 'Menyusun jawaban...'];

import { FAQ_ITEMS } from '../utils/faqData';

// Jaring pengaman sisi client — instruksi prompt gak selalu 100% dipatuhi AI, jadi
// redundansi kayak "Full Body Gainz 3 Hari" atau "SEN: Day 1: Power & Strength" tetap
// dibersihkan di sini biar UI-nya konsisten apa pun yang di-generate.
const cleanPlanName = (name) => (name || '')
    .replace(/\s*[\(\-–]?\s*\d+\s*(hari|x\s*\/?\s*minggu|x\s*seminggu|days?)\s*\)?\s*$/i, '')
    .trim();

const cleanRoutineName = (name) => (name || '')
    .replace(/^(day|hari)\s*\d+\s*[:\-–]\s*/i, '')
    .trim();

export default function GymAIChat({
    isOpen,
    onClose,
    userApiKeys,
    userProfile,
    history,
    exerciseLibrary,
    programs,
    activePlanIds,
    plateauInsights = [],
    logiPersona = 'santai',
    logiCustomInstruction = '',
    logiMemory = [],
    setLogiMemory,
    onUnreadChange,
    onAcceptProgram,
    user,
    keyStatuses,
    setKeyStatuses,
    setShowSettings,
    setConfirmModal,
    avatarOrigin = null,  // { x, y } posisi tengah avatar di layar
}) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [expandedRoutines, setExpandedRoutines] = useState(() => new Set());
    const [thinkingPhaseIdx, setThinkingPhaseIdx] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Refs mirror isOpen/activeSessionId so the async handleSend closure always reads
    // the CURRENT value (not what it was when the request started) — needed to detect
    // "user closed the chat / switched sessions while a reply was still generating".
    const isOpenRef = useRef(isOpen);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    // Phase state machine — guarantees both open AND close animations fire reliably
    // closed → opening (mount, scale=0) → open (scale=1) → closing (scale=0) → closed (unmount)
    const [phase, setPhase] = useState('closed');
    const phaseTimer = useRef(null);

    useEffect(() => {
        clearTimeout(phaseTimer.current);
        if (isOpen) {
            setPhase('opening');
            phaseTimer.current = setTimeout(() => {
                setPhase('open');
                setTimeout(() => scrollToBottom('auto'), 50);
            }, 20);
        } else {
            setPhase('closing');
            phaseTimer.current = setTimeout(() => setPhase('closed'), 360);
        }
        return () => clearTimeout(phaseTimer.current);
    }, [isOpen]);

    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const activeSessionIdRef = useRef(activeSessionId);
    useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

    // Baseline serialization per session id — what's currently believed to be saved in
    // Firestore. Only sessions whose JSON differs from this get written, so editing one
    // session never rewrites every other session, and re-loading never re-triggers a write.
    const lastSavedSessionsRef = useRef({});

    // Cloud is the source of truth (survives logout/reinstall/device switch); localStorage is
    // just a fast local cache. Guests (no uid) never touch Firestore — local-only, as before.
    useEffect(() => {
        const uid = user?.uid;
        if (!uid) {
            const saved = localStorage.getItem('lyfit_ai_sessions_guest');
            let loaded = [];
            if (saved) { try { loaded = JSON.parse(saved); } catch (e) {} }
            lastSavedSessionsRef.current = {};
            setSessions(loaded);
            setActiveSessionId(loaded.length > 0 ? loaded[0].id : null);
            setMessages(loaded.length > 0 ? loaded[0].messages : []);
            return;
        }

        const sessionsKey = `lyfit_ai_sessions_${uid}`;
        const oldChatKey = `lyfit_ai_chat_${uid}`;
        let cancelled = false;

        (async () => {
            let loadedSessions = [];
            try {
                const snap = await getDocs(collection(db, 'users', uid, 'ai_sessions'));
                loadedSessions = snap.docs.map(d => d.data());
            } catch (err) {
                console.warn('Gagal memuat sesi chat dari cloud, pakai cache lokal:', err);
            }
            if (cancelled) return;

            if (loadedSessions.length === 0) {
                // Belum ada apa pun di cloud (belum pernah dipakai, atau baru pertama kali sejak
                // fitur sync ini ada) — pakai cache lokal, lalu unggah sekali sebagai migrasi.
                const savedSessions = localStorage.getItem(sessionsKey);
                if (savedSessions) {
                    try { loadedSessions = JSON.parse(savedSessions); } catch (e) {}
                }
                if (loadedSessions.length === 0) {
                    const oldChat = localStorage.getItem(oldChatKey);
                    if (oldChat) {
                        try {
                            const oldMessages = JSON.parse(oldChat);
                            if (oldMessages && oldMessages.length > 0) {
                                loadedSessions = [{ id: 'migrated-session', title: 'Obrolan Sebelumnya', messages: oldMessages, updatedAt: Date.now() }];
                                localStorage.removeItem(oldChatKey);
                            }
                        } catch (e) {}
                    }
                }
                loadedSessions.forEach(s => {
                    setDoc(doc(db, 'users', uid, 'ai_sessions', s.id), s).catch(err => console.warn('Migrasi sesi chat ke cloud gagal:', err));
                });
            }

            const baseline = {};
            loadedSessions.forEach(s => { baseline[s.id] = JSON.stringify(s); });
            lastSavedSessionsRef.current = baseline;

            setSessions(loadedSessions);
            if (loadedSessions.length > 0) localStorage.setItem(sessionsKey, JSON.stringify(loadedSessions));
            setActiveSessionId(loadedSessions.length > 0 ? loadedSessions[0].id : null);
            setMessages(loadedSessions.length > 0 ? loadedSessions[0].messages : []);
        })();

        return () => { cancelled = true; };
    }, [user?.uid]);

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const uid = user?.uid || 'guest';
        const sessionsKey = `lyfit_ai_sessions_${uid}`;
        if (sessions.length > 0) {
            localStorage.setItem(sessionsKey, JSON.stringify(sessions));
        } else {
             localStorage.removeItem(sessionsKey);
        }

        if (!user?.uid) return; // guest sessions stay local-only

        // Debounced + diffed, same shape as the rest of the app's Firestore sync — only turns
        // into a write when a session actually changed since the last save, never on every
        // streaming token (sessions[] is only touched at message-send/message-complete, not
        // per-chunk — see handleSend).
        const timer = setTimeout(() => {
            const baseline = lastSavedSessionsRef.current || {};
            const newBaseline = {};
            const currentIds = new Set();

            sessions.forEach(s => {
                currentIds.add(s.id);
                const json = JSON.stringify(s);
                newBaseline[s.id] = json;
                if (baseline[s.id] === json) return; // tidak berubah sejak save terakhir
                setDoc(doc(db, 'users', user.uid, 'ai_sessions', s.id), s).catch(err => console.error('Sync sesi chat gagal:', err));
            });

            Object.keys(baseline).forEach(id => {
                if (!currentIds.has(id)) {
                    deleteDoc(doc(db, 'users', user.uid, 'ai_sessions', id)).catch(err => console.error('Hapus sesi chat cloud gagal:', err));
                }
            });

            lastSavedSessionsRef.current = newBaseline;
        }, 2000);

        return () => clearTimeout(timer);
    }, [sessions, user?.uid]);

    // Lift "is there anything unread" up to App.jsx so the floating avatar can badge itself,
    // even while this whole panel is scaled to 0 / not visibly open.
    useEffect(() => {
        onUnreadChange?.(sessions.some(s => s.unread));
    }, [sessions, onUnreadChange]);

    // Proactive plateau insights (rule-based, from App.jsx) get delivered into ONE dedicated,
    // color-coded session — reused for every future insight until the user deletes it, at
    // which point the next insight starts a fresh one. Delivery happens independent of whether
    // this panel is open, so the badge is accurate even if the user never opens the floating bubble.
    const lastDeliveredInsightKeyRef = useRef(null);
    useEffect(() => {
        const top = plateauInsights?.[0];
        if (!top) return;
        const insightKey = `${top.name}_${top.weeks}_${top.maxWeight}`;
        if (lastDeliveredInsightKeyRef.current === insightKey) return;
        lastDeliveredInsightKeyRef.current = insightKey;

        const text = `Bro, **${top.name}** lu udah flat **${top.weeks} minggu** (top: ${top.maxWeight}kg). Kayaknya waktunya deload atau ganti variasi, gue bisa bantu!`;
        const aiMsg = { role: 'model', content: text, timestamp: Date.now() };

        setSessions(prev => {
            const existing = prev.find(s => s.origin === 'logi');
            if (existing) {
                const updated = { ...existing, messages: [...existing.messages, aiMsg], unread: true, updatedAt: Date.now() };
                if (isOpenRef.current && activeSessionIdRef.current === existing.id) {
                    setMessages(m => [...m, aiMsg]);
                    updated.unread = false;
                }
                return prev.map(s => s.id === existing.id ? updated : s);
            }
            const newSession = { id: 'logi_' + Date.now(), title: 'Coach Logi', origin: 'logi', unread: true, messages: [aiMsg], updatedAt: Date.now() };
            return [newSession, ...prev];
        });
    }, [plateauInsights]);

    // When the panel opens (any trigger — avatar tap, CTA, elsewhere), route straight into
    // the dedicated Logi session if it has something unread; otherwise leave whatever was
    // already active alone.
    const prevIsOpenRef = useRef(false);
    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            const unreadSession = sessions.find(s => s.unread);
            if (unreadSession) {
                setActiveSessionId(unreadSession.id);
                setMessages(unreadSession.messages);
                setSessions(prev => prev.map(s => s.id === unreadSession.id ? { ...s, unread: false } : s));
                setIsSidebarOpen(false);
            }
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, sessions]);

    // Rotating "what am I doing" phrase while waiting for the first token, replacing the
    // old separate "Coach sedang mengetik..." pill with something more informative.
    useEffect(() => {
        if (!isLoading) { setThinkingPhaseIdx(0); return; }
        const iv = setInterval(() => setThinkingPhaseIdx(i => Math.min(i + 1, THINKING_PHASES.length - 1)), 900);
        return () => clearInterval(iv);
    }, [isLoading]);

    const handleNewChat = () => {
        setActiveSessionId(null);
        setMessages([]);
        setIsSidebarOpen(false);
    };

    const handleFaqClick = (faq) => {
        let sid = activeSessionId;
        const userMsg = { role: 'user', content: faq.q, timestamp: Date.now() };
        const aiMsg = { role: 'model', content: faq.a, timestamp: Date.now() + 10 };

        setMessages(prev => [...prev, userMsg, aiMsg]);
        setTimeout(() => scrollToBottom(), 50);

        if (!sid) {
            sid = 'session_' + Date.now();
            setActiveSessionId(sid);
            setSessions(prev => [{
                id: sid,
                title: faq.q.slice(0, 30) + (faq.q.length > 30 ? '...' : ''),
                origin: 'user',
                messages: [userMsg, aiMsg],
                updatedAt: Date.now()
            }, ...prev]);
        } else {
            setSessions(prev => prev.map(s => {
                if (s.id === sid) {
                    return {
                        ...s,
                        title: s.messages.length === 0 ? faq.q.slice(0, 30) + (faq.q.length > 30 ? '...' : '') : s.title,
                        messages: [...s.messages, userMsg, aiMsg],
                        updatedAt: Date.now()
                    };
                }
                return s;
            }));
        }
    };

    const doDeleteChat = (id) => {
        const deletingSession = sessions.find(s => s.id === id);
        if (deletingSession?.origin === 'logi') lastDeliveredInsightKeyRef.current = null;
        const updated = sessions.filter(s => s.id !== id);
        setSessions(updated);
        if (activeSessionId === id) {
            if (updated.length > 0) {
                setActiveSessionId(updated[0].id);
                setMessages(updated[0].messages);
            } else {
                handleNewChat();
            }
        }
    };

    const handleDeleteChat = (e, id) => {
        e.stopPropagation();

        if (setConfirmModal) {
            setConfirmModal({
                isOpen: true,
                title: 'Hapus Chat?',
                message: 'Apakah Anda yakin ingin menghapus obrolan ini? Tindakan ini tidak dapat dibatalkan.',
                confirmText: 'Ya, Hapus',
                cancelText: 'Batal',
                onConfirm: () => {
                    doDeleteChat(id);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            });
        } else {
            doDeleteChat(id);
        }
    };

    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const isFirstScroll = useRef(true);
    useEffect(() => {
        if (isFirstScroll.current) {
            isFirstScroll.current = false;
            return;
        }
        scrollToBottom('smooth');
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        // Preemptive check dihapus agar selalu mencoba backend proxy

        const userMsg = { role: 'user', content: input.trim(), timestamp: Date.now() };

        let currentSessionId = activeSessionId;
        if (!currentSessionId) {
            const words = input.trim().split(' ');
            const title = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
            currentSessionId = 'session_' + Date.now();
            const newSession = { id: currentSessionId, title: title || 'Sesi Baru', messages: [userMsg], updatedAt: Date.now() };
            setSessions(prev => [newSession, ...prev]);
            setActiveSessionId(currentSessionId);
        } else {
            setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, userMsg], updatedAt: Date.now() } : s));
        }

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setIsLoading(true);

        // Rekam pertanyaan user ke inbox AI (jika cukup panjang) untuk kurasi FAQ
        if (userMsg.content.length > 15 && uid) {
            try {
                addDoc(collection(db, 'ai_inbox'), {
                    uid: uid,
                    email: userProfile?.email || 'unknown',
                    question: userMsg.content,
                    timestamp: serverTimestamp(),
                    isReviewed: false
                }).catch(e => console.error("Gagal merekam pertanyaan AI:", e));
            } catch (e) {
                // Abaikan error agar chat tetap berjalan
            }
        }

        // Declared outside try/catch so the catch block can still clean up the placeholder
        const tempId = 'temp_' + Date.now();

        try {
            // Trim exercise library: only names, max 150 exercises
            const exLibStr = exerciseLibrary
                .slice(0, 150)
                .map(ex => ex.name)
                .join(', ');

            // Cuma tarik data pribadi (riwayat, biometrik, program aktif) kalau pesannya
            // memang kelihatan butuh itu — basa-basi atau pertanyaan umum di luar
            // program/progress user gak usah, biar hemat token. Default aman: kalau ragu,
            // tetap disertakan (lihat needsPersonalContext).
            const needsContext = needsPersonalContext(userMsg.content);
            const logsSummary = needsContext ? summarizeWorkoutLogs(history, exerciseLibrary, programs) : '';
            const bioSummary = needsContext ? summarizeBiometrics(history, userProfile) : '';
            const activeProgramsSummary = needsContext ? summarizeActivePrograms(programs, activePlanIds) : '';
            const favoriteProgramSummary = needsContext ? summarizeFavoriteProgram(history) : '';
            // Referensi cara-pakai-app juga cuma nempel kalau pesannya kelihatan nanya soal fitur/navigasi app.
            const appHelpBlock = needsAppHelpContext(userMsg.content) ? APP_HELP_REFERENCE : '';
            const systemContent = buildSystemPrompt(userProfile, exLibStr, logsSummary, bioSummary, activeProgramsSummary, logiPersona, logiCustomInstruction, logiMemory, favoriteProgramSummary, appHelpBlock);

            // Keep only last 10 real messages; local error/warning bubbles never go to the API
            const recentHistory = messages.filter(m => !m.isError && !m.isSystemWarning).slice(-10);

            // Construct full API messages
            const apiMessages = [
                { role: 'system', content: systemContent },
                ...recentHistory.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: userMsg.content }
            ];

            // Buat placeholder sementara untuk efek mengetik (streaming)
            setMessages(prev => [...prev, { id: tempId, role: 'model', content: '', timestamp: Date.now() }]);

            // "Still viewing" is re-checked live (via refs) at every chunk and at completion —
            // if the user closes the panel or switches sessions mid-generation, we stop touching
            // the visible `messages` state and just deliver silently into `sessions` + flag unread.
            const isStillViewing = () => isOpenRef.current && activeSessionIdRef.current === currentSessionId;

            let streamedText = '';
            const reply = await chatWithAI(apiMessages, userApiKeys, setKeyStatuses, (chunk) => {
                streamedText += chunk;
                if (isStillViewing()) {
                    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: streamedText } : m));
                }
            });

            const aiMsg = { role: 'model', content: reply, timestamp: Date.now() };
            const stillViewing = isStillViewing();
            if (stillViewing) {
                setMessages(prev => prev.map(m => m.id === tempId ? aiMsg : m));
            }
            setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, aiMsg], updatedAt: Date.now(), unread: !stillViewing } : s));
        } catch (err) {
            console.error(err);
            if (isOpenRef.current && activeSessionIdRef.current === currentSessionId) {
                // Drop the empty thinking placeholder instead of leaving it dangling next to the error bubble
                let errorMsg = `Error: ${err.message}`;
                if (err.message.includes('quota') || err.message.includes('RATE_LIMIT') || err.message.includes('Semua jalur AI gagal')) {
                    errorMsg = `Server AI sedang sibuk/penuh, dan API Key pribadi Anda juga telah mencapai limit. Silakan perbarui di Pengaturan.`;
                }
                setMessages(prev => [...prev.filter(m => m.id !== tempId), { role: 'model', content: errorMsg, timestamp: Date.now(), isError: true }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveMemory = (text) => {
        if (!setLogiMemory) return;
        const trimmed = text.trim().slice(0, 160);
        setLogiMemory(prev => (prev || []).includes(trimmed) ? prev : [...(prev || []), trimmed]);
    };

    const autoResizeInput = () => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 128) + 'px';
    };

    // WhatsApp/Notion-style: Shift+Enter on a "- "/"* "/"1. " line continues the marker on
    // the next line (auto-incrementing numbers); Shift+Enter on an EMPTY marker line clears
    // it instead, ending the list. Plain Enter still sends (handled separately).
    const handleListContinuation = () => {
        const el = inputRef.current;
        if (!el) return false;
        const pos = el.selectionStart;
        const value = el.value;
        const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
        const currentLine = value.slice(lineStart, pos);
        const ul = currentLine.match(/^(\s*)([-*])\s+(.*)$/);
        const ol = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);

        if (ul) {
            const next = ul[3].trim() === ''
                ? value.slice(0, lineStart) + value.slice(pos)
                : value.slice(0, pos) + `\n${ul[1]}${ul[2]} ` + value.slice(pos);
            const caret = ul[3].trim() === '' ? lineStart : pos + `\n${ul[1]}${ul[2]} `.length;
            setInput(next);
            requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = caret; autoResizeInput(); });
            return true;
        }
        if (ol) {
            const marker = ol[3].trim() === '' ? '' : `\n${ol[1]}${parseInt(ol[2], 10) + 1}. `;
            const next = ol[3].trim() === ''
                ? value.slice(0, lineStart) + value.slice(pos)
                : value.slice(0, pos) + marker + value.slice(pos);
            const caret = ol[3].trim() === '' ? lineStart : pos + marker.length;
            setInput(next);
            requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = caret; autoResizeInput(); });
            return true;
        }
        return false;
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
            return;
        }
        if (e.key === 'Enter' && e.shiftKey) {
            if (handleListContinuation()) e.preventDefault();
        }
    };

    const renderMessageContent = (msg, msgIdx) => {
        if (msg.isError) {
            return <div className="text-red-400 text-sm">{msg.content}</div>;
        }

        if (msg.isSystemWarning) {
            return (
                <div className="flex flex-col gap-3">
                    <p className="text-sm">{msg.content}</p>
                    <button 
                        onClick={() => {
                            if (setShowSettings) setShowSettings('lanjutan');
                        }}
                        className="bg-blue-500 text-white font-bold text-xs py-2 px-4 rounded-xl self-start hover:bg-blue-600 active:scale-95 cursor-pointer relative z-50 pointer-events-auto"
                    >
                        Buka Pengaturan API
                    </button>
                </div>
            );
        }

        // Check for program proposal tags
        const tagStart = '<program_proposal>';
        const tagEnd = '</program_proposal>';
        
        let textPart = msg.content;
        let jsonPart = null;

        if (msg.content.includes(tagStart) && msg.content.includes(tagEnd)) {
            const startIndex = msg.content.indexOf(tagStart);
            const endIndex = msg.content.indexOf(tagEnd) + tagEnd.length;
            textPart = msg.content.substring(0, startIndex).trim();
            const jsonStr = msg.content.substring(startIndex + tagStart.length, msg.content.indexOf(tagEnd)).trim();
            
            try {
                jsonPart = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse program proposal JSON:", e);
                textPart += "\n\n[Error: Received invalid program format from AI]";
            }
        }

        return (
            <div className="space-y-3">
                {textPart && <div className="text-sm">{renderMiniMarkdown(textPart)}</div>}
                {jsonPart && (
                    <div className="bg-neutral-800/50 backdrop-blur-md border border-blue-500/30 rounded-xl p-4 space-y-3 mt-2 shadow-lg shadow-blue-500/10">
                        <div className="flex items-center gap-2 text-blue-400">
                            <Dumbbell size={18} />
                            <h4 className="font-bold text-sm">{jsonPart.action === 'update' ? 'Update Program' : 'Usulan Program'}</h4>
                        </div>
                        <div>
                            <p className="font-bold text-white text-base">{cleanPlanName(jsonPart.planName)}</p>
                            <p className="text-xs text-neutral-400 mt-1">{jsonPart.description}</p>
                        </div>
                        <div className="space-y-1">
                            {jsonPart.routines?.map((r, i) => {
                                const routineKey = `${msgIdx}-${i}`;
                                const isOpen = expandedRoutines.has(routineKey);
                                const daysLabel = r.assignedDays?.length ? r.assignedDays.join(', ').toUpperCase() : null;
                                return (
                                    <div key={i} className="bg-neutral-900 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setExpandedRoutines(prev => {
                                                const next = new Set(prev);
                                                if (next.has(routineKey)) next.delete(routineKey); else next.add(routineKey);
                                                return next;
                                            })}
                                            className="w-full text-xs text-neutral-300 flex justify-between items-start gap-2 p-2 text-left"
                                        >
                                            <span className="font-semibold text-blue-300">
                                                {daysLabel ? `${daysLabel}: ` : ''}{cleanRoutineName(r.name)}
                                            </span>
                                            <ChevronDown size={12} className={`shrink-0 mt-0.5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isOpen && (
                                            <div className="px-2 pb-2 space-y-1 animate-in fade-in duration-150">
                                                {(r.exercises || []).map((ex, j) => (
                                                    <div key={j} className="text-[11px] text-neutral-400 flex justify-between items-center bg-black/20 px-2 py-1.5 rounded-md">
                                                        <span className="text-neutral-200">{ex.name}</span>
                                                        <span className="font-mono shrink-0 ml-2">{ex.sets}x{ex.reps}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => {
                                onAcceptProgram(jsonPart);
                                onClose();
                            }}
                            className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={16} /> Simpan
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (phase === 'closed') return null;

    // transform-origin = posisi tengah avatar, supaya scale expand/collapse dari sana
    const ox = avatarOrigin?.x ?? window.innerWidth / 2;
    const oy = avatarOrigin?.y ?? window.innerHeight;

    const isAnimatingIn  = phase === 'open';
    const isAnimatingOut = phase === 'closing';

    // Scale: 0 saat opening/closing, 1 saat open
    const scaleVal = isAnimatingIn ? 'scale(1)' : 'scale(0)';

    return (
        <>
        {/* Backdrop terpisah — hanya fade, tidak di-scale supaya tidak ganggu transform */}
        <div
            className="fixed inset-0 z-[99] bg-black/70 backdrop-blur-sm"
            style={{
                opacity: isAnimatingIn ? 1 : 0,
                transition: isAnimatingIn
                    ? 'opacity 0.3s ease'
                    : 'opacity 0.28s ease',
                pointerEvents: isAnimatingIn ? 'auto' : 'none',
            }}
            onClick={onClose}
        />

        {/* Panel chat — di-scale dari titik avatar */}
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none"
            style={{
                transform: scaleVal,
                transformOrigin: `${ox}px ${oy}px`,
                // Buka: spring ringan. Tutup: ease-in cepat
                transition: isAnimatingOut
                    ? 'transform 0.3s cubic-bezier(0.4,0,1,1)'
                    : 'transform 0.38s cubic-bezier(0.34,1.15,0.64,1)',
            }}
        >
            <div className="pointer-events-auto flex flex-col w-full max-w-md h-[85vh] max-h-[800px] bg-neutral-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden relative">
            {isSidebarOpen && <div className="absolute inset-0 bg-black/60 z-[110] transition-opacity cursor-pointer" onClick={() => setIsSidebarOpen(false)} />}

            <div className={`absolute inset-y-0 left-0 w-64 bg-neutral-900 border-r border-white/10 z-[120] transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 border-b border-white/10">
                    <button onClick={handleNewChat} className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                        <Plus size={18} /> Chat Baru
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.sort((a, b) => b.updatedAt - a.updatedAt).map(session => (
                        <div
                            key={session.id}
                            onClick={() => {
                                setActiveSessionId(session.id);
                                setMessages(session.messages);
                                setIsSidebarOpen(false);
                                if (session.unread) setSessions(prev => prev.map(s => s.id === session.id ? { ...s, unread: false } : s));
                            }}
                            className={`w-full text-left p-3 rounded-xl flex items-center justify-between group cursor-pointer transition-colors ${activeSessionId === session.id ? 'bg-white/10 text-white' : session.origin === 'logi' ? 'bg-blue-500/10 hover:bg-blue-500/15 text-blue-100' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
                        >
                            <div className="flex items-center gap-2 truncate pr-2">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${session.origin === 'logi' ? 'bg-blue-400' : 'bg-neutral-600'}`} />
                                <span className="truncate text-sm font-medium">{session.title}</span>
                                {session.unread && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(e, session.id); }} className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Hapus">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col w-full h-full relative">

                {/* Lapisan warna di belakang chat — kasih backdrop-blur bubble sesuatu buat
                    di-blur, tanpa ini efek glassmorphism-nya gak kerasa (blur cuma nge-blur
                    warna gelap rata, jadi kelihatan solid biasa). */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-16 -left-12 w-64 h-64 rounded-full bg-blue-500/25 blur-3xl" />
                    <div className="absolute top-1/3 -right-16 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div className="absolute bottom-0 left-1/4 w-56 h-56 rounded-full bg-sky-400/15 blur-3xl" />
                </div>

                {/* HEADER */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full border-2 border-blue-400 shadow-md bg-zinc-900 shrink-0"
                            style={{ backgroundImage: 'url(/bg-program.webp)', backgroundSize: '450%', backgroundPosition: '52% 7%' }}
                        />
                        <div>
                            <h3 className="font-bold text-white leading-tight">Coach Logi</h3>
                            <div className="flex items-center gap-1 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500`}></span>
                                <span className="text-blue-400 text-[10px] font-mono">Online</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* CHAT AREA */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 mt-8 mb-4">
                            <div 
                                className="w-16 h-16 rounded-full border-2 border-blue-500 shadow-lg bg-zinc-900 shrink-0"
                                style={{ backgroundImage: 'url(/bg-program.webp)', backgroundSize: '450%', backgroundPosition: '52% 7%' }}
                            />
                            <div>
                                <p className="text-white font-bold">Tanya Apapun!</p>
                                <p className="text-xs text-neutral-400 max-w-[280px] mx-auto mt-1">Saya bisa menganalisa riwayat latihanmu dan membuat program khusus.</p>
                                <p className="text-xs text-neutral-500 mt-3 font-medium">Atau pilih FAQ instan berikut:</p>
                            </div>
                            <div className="w-full space-y-2 mt-4">
                                {FAQ_ITEMS.map((faq, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => handleFaqClick(faq)}
                                        className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-sm p-3 rounded-xl transition-colors group flex items-center justify-between"
                                    >
                                        <span className="flex-1 pr-2">{faq.q}</span>
                                        <ChevronRight size={16} className="text-neutral-600 group-hover:text-blue-400 transition-colors shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {messages.map((msg, idx) => {
                        const isThinkingPlaceholder = msg.role !== 'user' && msg.content === '' && isLoading && idx === messages.length - 1;
                        return (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2 items-end mb-2`}>
                            {msg.role !== 'user' && (
                                <div
                                    className="w-8 h-8 rounded-full border border-white/20 shadow-md shrink-0 mb-1"
                                    style={{ backgroundImage: 'url(/bg-program.webp)', backgroundSize: '450%', backgroundPosition: '52% 7%' }}
                                />
                            )}
                            {msg.role === 'user' && setLogiMemory && (
                                <button
                                    onClick={() => handleSaveMemory(msg.content)}
                                    title="Simpan sebagai memori"
                                    className={`p-1.5 rounded-full transition-colors mb-1 shrink-0 ${(logiMemory || []).includes(msg.content.trim().slice(0, 160)) ? 'text-blue-400' : 'text-neutral-600 hover:text-blue-400'}`}
                                >
                                    <Bookmark size={14} fill={(logiMemory || []).includes(msg.content.trim().slice(0, 160)) ? 'currentColor' : 'none'} />
                                </button>
                            )}
                            <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-gradient-to-b from-blue-500/30 to-blue-600/15 backdrop-blur-xl saturate-150 border border-blue-400/30 shadow-lg text-white rounded-tr-sm' : 'bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl saturate-150 text-neutral-100 border border-white/15 rounded-tl-sm shadow-lg shadow-black/20'}`}>
                                {isThinkingPlaceholder ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={16} className="text-blue-400 animate-spin shrink-0" />
                                        <span className="text-xs text-blue-300">{THINKING_PHASES[thinkingPhaseIdx]}</span>
                                    </div>
                                ) : (
                                    <>
                                        {renderMessageContent(msg, idx)}
                                        <div className={`text-[10px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* INPUT AREA */}
                <div className="p-4 pb-8 sm:pb-4 border-t border-white/10 bg-black/40 backdrop-blur-md z-10">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsSidebarOpen(true)} 
                            className="p-3 text-neutral-400 hover:text-white bg-white/5 border border-white/10 rounded-xl transition-colors shrink-0"
                            title="Menu Sesi Chat"
                        >
                            <Menu size={20} />
                        </button>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => { setInput(e.target.value); autoResizeInput(); }}
                            onKeyDown={handleInputKeyDown}
                            placeholder="Tanya Logi"
                            className="flex-1 bg-white/[0.04] backdrop-blur-sm text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/5 focus:border-blue-500/50 resize-none max-h-32"
                            rows={1}
                            style={{ minHeight: '44px' }}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="p-3 bg-blue-500/80 hover:bg-blue-600 backdrop-blur-md border border-blue-400/30 disabled:opacity-50 disabled:hover:bg-blue-500 text-white rounded-xl transition-colors shrink-0 flex items-center justify-center"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>

            </div>
            </div> {/* inner rounded box */}
        </div>
        </>
    );
}
