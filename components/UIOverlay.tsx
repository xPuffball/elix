import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { GameMode, Archetype, LessonConfig } from '../types';
import { generateStudentReaction, generateLessonSummary } from '../services/geminiService';
import { DialogueSystem } from './DialogueSystem';
import { Settings, Play, BookOpen, MessageCircle, X, Award, Smile, Frown, Meh, Mic, MicOff, BrainCircuit, StopCircle, Send, ChevronDown, ChevronRight, Pencil, Flame, Coins, Keyboard, ShoppingBag, Type } from 'lucide-react';
import { CustomizeHUD } from './CustomizeHUD';
import { MainMenu } from './MainMenu';
import { LessonSetupWizard } from './LessonSetupWizard';
import { PopQuiz } from './PopQuiz';
import { SettingsModal } from './SettingsModal';
import { Shop } from './Shop';

const GRADE_COINS: Record<string, number> = { S: 100, A: 75, B: 50, C: 25, D: 10 };

const InteractionPrompt = ({ label }: { label: string }) => (
    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-xl border-2 border-cozy-brown animate-bounce flex items-center gap-2 z-50">
        <div className="bg-cozy-brown text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">E</div>
        <span className="font-display text-cozy-brown font-bold text-lg">{label}</span>
    </div>
);

const VoiceInput = ({ onSend, isThinking }: { onSend: (text: string) => void, isThinking: boolean }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcriptBuffer, setTranscriptBuffer] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<any>(null);
    const SILENCE_TIMEOUT = 2500;

    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let finalPhrase = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalPhrase += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalPhrase) {
                    setTranscriptBuffer(prev => {
                        const newVal = prev + finalPhrase;
                        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = setTimeout(() => {
                            handleSend(newVal);
                        }, SILENCE_TIMEOUT);
                        return newVal;
                    });
                }
            };

            recognition.onerror = (event: any) => {
                if (event.error === 'not-allowed') {
                    setErrorMsg("Mic Access Denied");
                    setIsListening(false);
                }
            };

            recognition.onstart = () => { setErrorMsg(''); setIsListening(true); };
            recognition.onend = () => {
                if (isListening && !errorMsg) {
                    try { recognition.start(); } catch(e) {}
                }
            };

            recognitionRef.current = recognition;
        }
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            if (transcriptBuffer.trim().length > 0) handleSend(transcriptBuffer);
        } else {
            setErrorMsg("");
            try { recognitionRef.current.start(); } catch (e) {}
        }
    };

    const handleSend = (text: string) => {
        if (!text.trim()) return;
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        onSend(text.trim());
        setTranscriptBuffer('');
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            <div className={`w-full max-w-2xl bg-black/60 backdrop-blur-md rounded-2xl p-6 min-h-[100px] flex flex-col items-center justify-center transition-all duration-500 ${(isListening || transcriptBuffer || isThinking) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                <p className={`text-2xl font-display font-medium text-center leading-relaxed ${errorMsg ? 'text-red-300' : 'text-white'}`}>
                    {errorMsg || transcriptBuffer || (isThinking ? "Students are thinking..." : "Listening...")}
                </p>
                {transcriptBuffer && !isThinking && (
                    <button onClick={() => handleSend(transcriptBuffer)}
                        className="mt-4 bg-white text-black px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                        <Send size={16} /> Send Now
                    </button>
                )}
            </div>
            <button onClick={toggleListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 border-4 border-white ${isListening ? 'bg-red-500 animate-pulse' : 'bg-cozy-brown hover:bg-brown-600'} ${errorMsg ? 'bg-red-800' : ''}`}>
                {isListening ? <StopCircle className="text-white w-8 h-8" /> : <Mic className="text-white w-8 h-8" />}
            </button>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">{isListening ? "Listening..." : "Tap to Teach"}</p>
        </div>
    );
};

const TextInput = ({ onSend, isThinking }: { onSend: (text: string) => void, isThinking: boolean }) => {
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = () => {
        if (!text.trim() || isThinking) return;
        onSend(text.trim());
        setText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-full max-w-2xl bg-black/60 backdrop-blur-md rounded-2xl p-4">
                {isThinking ? (
                    <p className="text-white font-display text-lg text-center py-4">Students are thinking...</p>
                ) : (
                    <div className="flex gap-2">
                        <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                            onKeyDown={handleKeyDown} rows={2}
                            className="flex-1 bg-white/10 text-white border border-white/20 rounded-xl p-3 resize-none focus:outline-none focus:border-white/40 font-display placeholder-white/40"
                            placeholder="Type your explanation here..." />
                        <button onClick={handleSubmit} disabled={!text.trim() || isThinking}
                            className={`px-4 rounded-xl font-bold transition-all ${text.trim() ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/20 text-white/40 cursor-not-allowed'}`}>
                            <Send size={20} />
                        </button>
                    </div>
                )}
            </div>
            <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Shift+Enter for new line</p>
        </div>
    );
};

const TeachingHUD = () => {
    const { activeLesson, students, updateStudent, addStudentKnowledge, chatHistory, addChatMessage, setMode, raiseHand, studentInterject, settings } = useGameStore();
    const [isThinking, setIsThinking] = useState(false);
    const [knowledgeFeedback, setKnowledgeFeedback] = useState<{fact: string, student: string} | null>(null);
    const [inputMode, setInputMode] = useState<'voice' | 'text'>(settings.inputMode);

    useEffect(() => {
        if (knowledgeFeedback) {
            const t = setTimeout(() => setKnowledgeFeedback(null), 3000);
            return () => clearTimeout(t);
        }
    }, [knowledgeFeedback]);

    const handleTeacherInput = async (text: string) => {
        if (!text.trim() || isThinking || !activeLesson) return;
        const userMsg = { role: 'user' as const, text };
        addChatMessage(userMsg);
        setIsThinking(true);

        const reaction = await generateStudentReaction(text, chatHistory, students, activeLesson);
        setIsThinking(false);

        if (reaction.knowledgeUpdates?.length > 0) {
            reaction.knowledgeUpdates.forEach((update: any) => {
                addStudentKnowledge(update.studentId, update.topic, update.newFact, update.newLevel);
                const sName = students.find(s => s.id === update.studentId)?.name || 'Student';
                setKnowledgeFeedback({ fact: update.newFact, student: sName });
            });
        }

        if (reaction.action !== "LISTEN" && reaction.speakerId) {
            const student = students.find(s => s.id === reaction.speakerId);
            if (student) {
                if (reaction.moodChange) updateStudent(student.id, { mood: reaction.moodChange as any });
                if (reaction.action === "RAISE_HAND") raiseHand(student.id, reaction.text);
                else if (reaction.action === "INTERJECT") studentInterject(student.id, reaction.text);
            }
        }
    };

    const activeStudents = activeLesson
        ? students.filter(s => activeLesson.activeStudentIds.includes(s.id))
        : students;

    return (
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md p-4 pointer-events-auto flex justify-between items-center shadow-sm border-b-2 border-orange-100">
                <div>
                    <h1 className="text-2xl font-display font-bold text-cozy-brown">{activeLesson?.title || activeLesson?.topic}</h1>
                    <p className="text-gray-500 text-sm">Teach by explaining simply. Answer their questions!</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setInputMode(m => m === 'voice' ? 'text' : 'voice')}
                        className="bg-orange-50 hover:bg-orange-100 p-2 rounded-xl border border-orange-200 transition-colors" title={`Switch to ${inputMode === 'voice' ? 'text' : 'voice'} input`}>
                        {inputMode === 'voice' ? <Keyboard size={18} className="text-cozy-brown" /> : <Mic size={18} className="text-cozy-brown" />}
                    </button>
                    <button onClick={() => setMode(GameMode.DEBRIEF)} className="bg-red-400 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold font-display shadow-sm">
                        End Class
                    </button>
                </div>
            </div>

            {knowledgeFeedback && (
                <div className="absolute top-32 left-1/2 transform -translate-x-1/2 bg-cozy-green text-white px-6 py-3 rounded-full shadow-xl animate-bounce z-50 flex items-center gap-2 max-w-lg">
                    <BrainCircuit size={20} className="shrink-0" />
                    <span className="font-bold truncate">{knowledgeFeedback.student} learned: "{knowledgeFeedback.fact}"</span>
                </div>
            )}

            <div className="absolute top-24 right-4 space-y-2 pointer-events-auto">
                {activeStudents.map(s => (
                    <div key={s.id} className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl shadow-sm border border-orange-100 w-56 transition-all flex items-center justify-between">
                        <span className="font-display font-bold text-gray-700 text-sm">{s.name}</span>
                        <div className="flex gap-2 text-xs">
                            {s.mood === 'happy' && <Smile size={16} className="text-green-500" />}
                            {s.mood === 'confused' && <Frown size={16} className="text-red-500" />}
                            {s.mood === 'neutral' && <Meh size={16} className="text-yellow-500" />}
                            {s.mood === 'thinking' && <span className="text-lg">🤔</span>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex-1"></div>

            <div className="p-6 pointer-events-auto max-w-xl mx-auto w-full pb-12">
                {inputMode === 'voice'
                    ? <VoiceInput onSend={handleTeacherInput} isThinking={isThinking} />
                    : <TextInput onSend={handleTeacherInput} isThinking={isThinking} />
                }
            </div>
        </div>
    );
};

const DebriefScreen = () => {
    const { activeLesson, chatHistory, setMode, clearChat, userStats, recordSession } = useGameStore();
    const [summary, setSummary] = useState<any>(null);
    const [recorded, setRecorded] = useState(false);

    useEffect(() => {
        const fetchSummary = async () => {
            if (activeLesson) {
                const result = await generateLessonSummary(activeLesson.topic, chatHistory);
                setSummary(result);
            }
        };
        fetchSummary();
    }, []);

    useEffect(() => {
        if (summary && !recorded && activeLesson) {
            const baseCoins = GRADE_COINS[summary.grade] || 10;
            const streakBonus = userStats.currentStreak * 10;
            const totalCoins = activeLesson.rewardsMode ? baseCoins + streakBonus : 0;
            recordSession(activeLesson.topic, summary.grade, activeLesson.sessionLengthMin, totalCoins);
            setRecorded(true);
        }
    }, [summary, recorded]);

    const handleClose = () => {
        if (activeLesson?.enablePopQuiz) {
            setMode(GameMode.POP_QUIZ);
        } else {
            clearChat();
            setMode(GameMode.FREE_ROAM);
        }
    };

    const handleSkip = () => {
        clearChat();
        setMode(GameMode.FREE_ROAM);
    };

    const baseCoins = summary ? (GRADE_COINS[summary.grade] || 10) : 0;
    const streakBonus = userStats.currentStreak * 10;

    return (
        <div className="absolute inset-0 bg-cozy-bg z-50 flex flex-col items-center justify-center p-8 overflow-y-auto">
            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 border-4 border-cozy-pink animate-in zoom-in">
                <div className="flex justify-center mb-6">
                    <Award size={64} className="text-yellow-400" />
                </div>
                <h2 className="text-4xl font-display font-bold text-center text-cozy-brown mb-2">Class Dismissed!</h2>
                <p className="text-center text-gray-500 text-xl mb-8">Here is how you did teaching "{activeLesson?.topic}"</p>

                {summary ? (
                    <div className="space-y-6">
                        <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-700 mb-1">Teacher's Grade</h3>
                                <div className="text-5xl font-display font-bold text-cozy-blue">{summary.grade}</div>
                            </div>
                            {activeLesson?.rewardsMode && (
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-yellow-600 font-display font-bold text-lg">
                                        <Coins size={20} /> +{baseCoins}
                                    </div>
                                    {streakBonus > 0 && (
                                        <div className="flex items-center gap-1 text-orange-500 font-display font-bold text-sm mt-1">
                                            <Flame size={14} /> +{streakBonus} streak bonus
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {userStats.currentStreak > 1 && (
                            <div className="bg-gradient-to-r from-orange-400 to-red-400 p-4 rounded-2xl text-white text-center">
                                <div className="flex items-center justify-center gap-2 font-display font-bold text-lg">
                                    <Flame size={24} /> {userStats.currentStreak} day streak!
                                </div>
                            </div>
                        )}

                        <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-100">
                            <h3 className="font-bold text-gray-700 mb-2">Feedback</h3>
                            <p className="text-lg text-gray-600 italic">"{summary.comment}"</p>
                        </div>

                        <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-100">
                            <h3 className="font-bold text-gray-700 mb-2">Concepts Covered</h3>
                            <div className="flex flex-wrap gap-2">
                                {summary.keyConcepts?.map((c: string, i: number) => (
                                    <span key={i} className="bg-white px-3 py-1 rounded-full text-sm font-bold text-cozy-brown border border-orange-200">{c}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cozy-brown mx-auto"></div>
                        <p className="mt-4 text-gray-400">Grading papers...</p>
                    </div>
                )}

                <div className="mt-8 space-y-3">
                    <button onClick={handleClose}
                        className="w-full bg-cozy-brown text-white font-display font-bold text-xl py-4 rounded-xl hover:bg-brown-600 shadow-lg active:scale-95 transition-transform">
                        {activeLesson?.enablePopQuiz ? 'Take Quiz' : 'Return to Lobby'}
                    </button>
                    {activeLesson?.enablePopQuiz && (
                        <button onClick={handleSkip}
                            className="w-full text-gray-400 hover:text-gray-600 font-display font-bold text-sm py-2 transition-colors">
                            Skip Quiz
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const UIOverlay = () => {
    const { mode, interactionTarget, setMode, userStats } = useGameStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'e') {
                if (mode === GameMode.FREE_ROAM && interactionTarget) {
                    if (interactionTarget.type === 'podium') setMode(GameMode.LESSON_SETUP);
                    else if (interactionTarget.type === 'student') setMode(GameMode.DIALOGUE);
                    else if (interactionTarget.type === 'desk') setMode(GameMode.SETTINGS);
                    else if (interactionTarget.type === 'door') setMode(GameMode.MAIN_MENU);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, interactionTarget, setMode]);

    return (
        <>
            {mode === GameMode.FREE_ROAM && (
                <>
                    <div className="absolute top-6 left-6 flex items-center gap-3">
                        <div className="bg-white p-3 rounded-2xl shadow-md border-2 border-orange-100">
                            <h1 className="font-display font-bold text-cozy-brown text-xl">CozyClassroom</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-white px-3 py-2 rounded-xl shadow-md border-2 border-orange-100 flex items-center gap-1.5">
                                <Coins size={16} className="text-yellow-500" />
                                <span className="font-display font-bold text-sm text-gray-700">{userStats.coins}</span>
                            </div>
                            {userStats.currentStreak > 0 && (
                                <div className="bg-white px-3 py-2 rounded-xl shadow-md border-2 border-orange-100 flex items-center gap-1.5">
                                    <Flame size={16} className="text-orange-500" />
                                    <span className="font-display font-bold text-sm text-gray-700">{userStats.currentStreak}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute top-6 right-6 flex items-center gap-2">
                        <button onClick={() => setMode(GameMode.SHOP)}
                            className="bg-white hover:bg-orange-50 p-3 rounded-2xl shadow-md border-2 border-orange-200 transition-all active:scale-95 flex items-center gap-2">
                            <ShoppingBag size={20} className="text-cozy-brown" />
                            <span className="font-display font-bold text-cozy-brown text-sm">Shop</span>
                        </button>
                        <button onClick={() => setMode(GameMode.CUSTOMIZE)}
                            className="bg-white hover:bg-orange-50 p-3 rounded-2xl shadow-md border-2 border-orange-200 transition-all active:scale-95 flex items-center gap-2">
                            <Pencil size={20} className="text-cozy-brown" />
                            <span className="font-display font-bold text-cozy-brown text-sm">Edit Room</span>
                        </button>
                    </div>

                    <div className="absolute bottom-6 left-6 text-gray-500 bg-white/50 p-2 rounded-lg text-sm backdrop-blur-sm">
                        WASD to Move • E to Interact
                    </div>

                    {interactionTarget && <InteractionPrompt label={interactionTarget.label} />}
                </>
            )}

            {mode === GameMode.MAIN_MENU && <MainMenu />}
            {mode === GameMode.CUSTOMIZE && <CustomizeHUD />}
            {mode === GameMode.LESSON_SETUP && <LessonSetupWizard />}
            {mode === GameMode.TEACHING && <TeachingHUD />}
            {mode === GameMode.DEBRIEF && <DebriefScreen />}
            {mode === GameMode.POP_QUIZ && <PopQuiz />}
            {mode === GameMode.SETTINGS && <SettingsModal />}
            {mode === GameMode.SHOP && <Shop />}
            {mode === GameMode.DIALOGUE && interactionTarget?.type === 'student' && interactionTarget.id && (
                <DialogueSystem studentId={interactionTarget.id} onClose={() => setMode(GameMode.FREE_ROAM)} />
            )}
        </>
    );
};
