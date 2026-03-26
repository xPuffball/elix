import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store';
import { GameMode, Archetype, LessonConfig } from '../types';
import { generateStudentReaction, generateLessonSummary } from '../services/geminiService';
import { DialogueSystem } from './DialogueSystem';
import { Settings, Play, BookOpen, MessageCircle, X, Award, Smile, Frown, Meh, Mic, MicOff, BrainCircuit, StopCircle, Send, ChevronDown, ChevronRight, Pencil, Flame, Coins, Keyboard, ShoppingBag, Type, Image as ImageIcon, PenTool, Paperclip } from 'lucide-react';
import { CustomizeHUD } from './CustomizeHUD';
import { MainMenu } from './MainMenu';
import { LessonSetupWizard } from './LessonSetupWizard';
import { PopQuiz } from './PopQuiz';
import { SettingsModal } from './SettingsModal';
import { Shop } from './Shop';
import { DrawingCanvas } from './DrawingCanvas';
import { VirtualJoystick } from './VirtualJoystick';
import { useIsMobile } from '../hooks/useMobile';

const GRADE_COINS: Record<string, number> = { S: 100, A: 75, B: 50, C: 25, D: 10 };

const InteractionPrompt = ({ label }: { label: string }) => (
    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50 anim-bounce-in">
        <div className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] px-5 py-2.5 rounded-2xl shadow-[0_4px_20px_rgba(139,90,43,0.18)] border border-[#E8D5B7] flex items-center gap-3" style={{ animation: 'elix-pulse-soft 2s ease-in-out infinite' }}>
            <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white w-7 h-7 rounded-lg flex items-center justify-center text-xs font-brand font-bold shadow-inner">E</div>
            <span className="font-brand text-[#5D3A1A] font-semibold text-base">{label}</span>
        </div>
    </div>
);

const ThinkingIndicator = ({ studentNames }: { studentNames: string[] }) => {
  const [dotCount, setDotCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDotCount(d => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);

  const dots = '.'.repeat(dotCount);
  const name = studentNames.length === 1
    ? studentNames[0]
    : studentNames.length <= 3
      ? studentNames.slice(0, -1).join(', ') + ' & ' + studentNames[studentNames.length - 1]
      : 'Everyone';

  return (
    <div className="w-full max-w-2xl mx-auto anim-slide-up">
      <div className="bg-[#FFF9F0]/90 backdrop-blur-xl rounded-2xl p-5 border border-[#E8D5B7] shadow-[0_8px_32px_rgba(139,90,43,0.12)]">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {studentNames.slice(0, 3).map((n, i) => (
              <div key={n} className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-2 border-[#FFF9F0] flex items-center justify-center text-white text-xs font-brand font-bold shadow-sm"
                style={{ animationDelay: `${i * 150}ms`, animation: 'elix-bounce-in 0.4s ease-out both' }}>
                {n[0]}
              </div>
            ))}
          </div>
          <div className="flex-1">
            <p className="font-brand font-semibold text-[#5D3A1A] text-sm">{name} {studentNames.length === 1 ? 'is' : 'are'} thinking{dots}</p>
            <div className="flex gap-1 mt-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-amber-400"
                  style={{ animation: `elix-bounce-in 0.6s ease-in-out ${i * 0.15}s infinite alternate` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ImagePreviewBubble = ({ dataUrl, onRemove }: { dataUrl: string; onRemove: () => void }) => (
  <div className="relative inline-block group">
    <img src={dataUrl} alt="Attached" className="h-16 w-16 object-cover rounded-xl border border-[#E8D5B7] shadow-sm" />
    <button onClick={onRemove}
      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
      <X size={10} />
    </button>
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
            <div className={`w-full max-w-2xl bg-[#FFF9F0]/90 backdrop-blur-xl rounded-2xl p-6 min-h-[100px] flex flex-col items-center justify-center transition-all duration-500 border border-[#E8D5B7] shadow-[0_8px_32px_rgba(139,90,43,0.12)] ${(isListening || transcriptBuffer || isThinking) ? 'opacity-100 translate-y-0 anim-slide-up' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                <p className={`text-2xl font-brand font-medium text-center leading-relaxed ${errorMsg ? 'text-rose-500' : 'text-[#5D3A1A]'}`}>
                    {errorMsg || transcriptBuffer || (isThinking ? "Students are thinking..." : "Listening...")}
                </p>
                {transcriptBuffer && !isThinking && (
                    <button onClick={() => handleSend(transcriptBuffer)}
                        className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-xl font-brand font-bold flex items-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-all shadow-[0_2px_10px_rgba(245,158,11,0.3)] btn-press">
                        <Send size={16} /> Send Now
                    </button>
                )}
            </div>
            <button onClick={toggleListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(139,90,43,0.2)] transition-all transform active:scale-90 border-4 ${isListening ? 'bg-gradient-to-br from-red-400 to-rose-500 animate-pulse border-rose-200' : 'bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 border-amber-200/50'} ${errorMsg ? 'bg-red-800' : ''}`}>
                {isListening ? <StopCircle className="text-white w-8 h-8" /> : <Mic className="text-white w-8 h-8" />}
            </button>
            <p className="text-[#8B7355] font-brand font-bold text-xs uppercase tracking-[0.15em]">{isListening ? "Listening..." : "Tap to Teach"}</p>
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
            <div className="w-full max-w-2xl bg-[#FFF9F0]/90 backdrop-blur-xl rounded-2xl p-4 border border-[#E8D5B7] shadow-[0_8px_32px_rgba(139,90,43,0.12)] anim-slide-up">
                {isThinking ? (
                    <p className="text-[#8B6E4E] font-brand text-lg text-center py-4">Students are thinking...</p>
                ) : (
                    <div className="flex gap-2">
                        <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                            onKeyDown={handleKeyDown} rows={2}
                            className="flex-1 bg-[#FFF5EB] text-[#4A2C17] border border-[#E8D5B7] rounded-xl p-3 resize-none focus:outline-none focus:border-amber-500 font-brand placeholder-[#C4A882]"
                            placeholder="Type your explanation here..." />
                        <button onClick={handleSubmit} disabled={!text.trim() || isThinking}
                            className={`px-4 rounded-xl font-brand font-bold transition-all btn-press ${text.trim() ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-[0_2px_10px_rgba(245,158,11,0.25)]' : 'bg-[#E8D5B7] text-[#C4A882] cursor-not-allowed'}`}>
                            <Send size={20} />
                        </button>
                    </div>
                )}
            </div>
            <p className="text-[#8B7355] font-brand font-bold text-xs uppercase tracking-[0.15em]">Shift+Enter for new line</p>
        </div>
    );
};

const TeachingHUD = () => {
    const { activeLesson, students, updateStudent, addStudentKnowledge, chatHistory, addChatMessage, setMode, raiseHand, studentInterject, settings } = useGameStore();
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingNames, setThinkingNames] = useState<string[]>([]);
    const [knowledgeFeedback, setKnowledgeFeedback] = useState<{fact: string, student: string} | null>(null);
    const [inputMode, setInputMode] = useState<'voice' | 'text'>(settings.inputMode);
    const [showDrawing, setShowDrawing] = useState(false);
    const [pendingImage, setPendingImage] = useState<{data: string, mime: string, preview: string} | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (knowledgeFeedback) {
            const t = setTimeout(() => setKnowledgeFeedback(null), 3000);
            return () => clearTimeout(t);
        }
    }, [knowledgeFeedback]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            setPendingImage({ data: base64, mime: file.type, preview: dataUrl });
        };
        reader.readAsDataURL(file);
        if (imageInputRef.current) imageInputRef.current.value = '';
    }, []);

    const handleDrawingSend = useCallback((base64: string) => {
        setPendingImage({ data: base64, mime: 'image/png', preview: `data:image/png;base64,${base64}` });
        setShowDrawing(false);
    }, []);

    const handleTeacherInput = async (text: string) => {
        if (!text.trim() || isThinking || !activeLesson) return;

        const imageData = pendingImage?.data;
        const imageMime = pendingImage?.mime;
        const userMsg = {
            role: 'user' as const,
            text,
            ...(imageData && imageMime ? { imageData, imageMime } : {}),
        };
        addChatMessage(userMsg);
        setPendingImage(null);

        const activeStudentNames = students
            .filter(s => activeLesson.activeStudentIds.includes(s.id))
            .map(s => s.name);

        setIsThinking(true);
        setThinkingNames(activeStudentNames);

        activeStudentNames.forEach(name => {
            const s = students.find(st => st.name === name);
            if (s) updateStudent(s.id, { mood: 'thinking' });
        });

        const reaction = await generateStudentReaction(
            text, chatHistory, students, activeLesson,
            imageData, imageMime,
            {
                onThinking: () => {},
                onComplete: () => {},
            }
        );
        setIsThinking(false);
        setThinkingNames([]);

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
                else updateStudent(student.id, { mood: 'neutral' });
                if (reaction.action === "RAISE_HAND") raiseHand(student.id, reaction.text);
                else if (reaction.action === "INTERJECT") studentInterject(student.id, reaction.text);
            }
        }

        students
            .filter(s => activeLesson.activeStudentIds.includes(s.id))
            .forEach(s => {
                if (s.id !== reaction.speakerId) {
                    updateStudent(s.id, { mood: reaction.moodChange === 'confused' ? 'neutral' : (s.mood === 'thinking' ? 'neutral' : s.mood) });
                }
            });
    };

    const activeStudents = activeLesson
        ? students.filter(s => activeLesson.activeStudentIds.includes(s.id))
        : students;

    return (
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="bg-gradient-to-r from-[#FFF9F0]/95 to-[#FFF3E0]/95 backdrop-blur-md p-3 sm:p-4 pointer-events-auto flex justify-between items-center shadow-[0_2px_16px_rgba(139,90,43,0.1)] border-b border-[#E8D5B7] anim-slide-down">
                <div className="min-w-0 flex-1 mr-2">
                    <h1 className="text-lg sm:text-2xl font-brand font-bold text-[#5D3A1A] truncate">{activeLesson?.title || activeLesson?.topic}</h1>
                    <p className="text-[#A08060] text-xs sm:text-sm font-brand hidden sm:block">Teach by explaining simply. Answer their questions!</p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button onClick={() => setInputMode(m => m === 'voice' ? 'text' : 'voice')}
                        className="bg-[#FFF0DC] hover:bg-[#FFE8C8] p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-[#E8D5B7] transition-colors" title={`Switch to ${inputMode === 'voice' ? 'text' : 'voice'} input`}>
                        {inputMode === 'voice' ? <Keyboard size={16} className="text-[#8B5A2B]" /> : <Mic size={16} className="text-[#8B5A2B]" />}
                    </button>
                    <button onClick={() => setMode(GameMode.DEBRIEF)} className="bg-gradient-to-r from-red-400 to-rose-500 hover:from-red-500 hover:to-rose-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold font-brand text-sm sm:text-base shadow-[0_2px_8px_rgba(239,68,68,0.25)] transition-all">
                        End
                    </button>
                </div>
            </div>

            {knowledgeFeedback && (
                <div className="absolute top-32 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.3)] animate-bounce z-50 flex items-center gap-2 max-w-lg">
                    <BrainCircuit size={20} className="shrink-0" />
                    <span className="font-brand font-bold truncate">{knowledgeFeedback.student} learned: "{knowledgeFeedback.fact}"</span>
                </div>
            )}

            <div className="absolute top-16 sm:top-24 right-2 sm:right-4 space-y-1.5 sm:space-y-2 pointer-events-auto">
                {activeStudents.map((s, i) => (
                    <div key={s.id} className={`bg-gradient-to-r from-[#FFF9F0]/90 to-[#FFF3E0]/90 backdrop-blur-sm px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl shadow-[0_2px_10px_rgba(139,90,43,0.08)] border border-[#E8D5B7] w-28 sm:w-52 flex items-center justify-between card-hover anim-slide-right anim-delay-${i + 1}`}>
                        <span className="font-brand font-bold text-[#5D3A1A] text-xs sm:text-sm truncate">{s.name}</span>
                        <div className="flex gap-1 sm:gap-2 text-xs shrink-0 ml-1">
                            {s.mood === 'happy' && <Smile size={14} className="text-emerald-500" />}
                            {s.mood === 'confused' && <Frown size={14} className="text-rose-400" />}
                            {s.mood === 'neutral' && <Meh size={14} className="text-amber-400" />}
                            {s.mood === 'thinking' && (
                                <div className="flex gap-0.5 items-center">
                                    {[0, 1, 2].map(j => (
                                        <div key={j} className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-amber-400"
                                            style={{ animation: `elix-bounce-in 0.5s ease-in-out ${j * 0.12}s infinite alternate` }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex-1"></div>

            <div className="p-3 sm:p-6 pointer-events-auto max-w-xl mx-auto w-full pb-6 sm:pb-12">
                {isThinking ? (
                    <ThinkingIndicator studentNames={thinkingNames} />
                ) : (
                    <>
                        {pendingImage && (
                            <div className="flex justify-center mb-3">
                                <ImagePreviewBubble dataUrl={pendingImage.preview} onRemove={() => setPendingImage(null)} />
                            </div>
                        )}

                        {inputMode === 'voice'
                            ? <VoiceInput onSend={handleTeacherInput} isThinking={isThinking} />
                            : <TextInput onSend={handleTeacherInput} isThinking={isThinking} />
                        }

                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                        <div className="flex justify-center gap-2 mt-3">
                            <button onClick={() => imageInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9F0]/80 border border-[#E8D5B7] text-[#8B6E4E] hover:bg-[#FFF0DC] hover:border-amber-400 transition-all font-brand text-xs font-semibold" title="Attach an image">
                                <ImageIcon size={14} /> Image
                            </button>
                            <button onClick={() => setShowDrawing(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9F0]/80 border border-[#E8D5B7] text-[#8B6E4E] hover:bg-[#FFF0DC] hover:border-amber-400 transition-all font-brand text-xs font-semibold" title="Draw something">
                                <PenTool size={14} /> Draw
                            </button>
                        </div>
                    </>
                )}
            </div>

            {showDrawing && <DrawingCanvas onSend={handleDrawingSend} onClose={() => setShowDrawing(false)} />}
        </div>
    );
};

const StarRating = ({ stars, max = 5 }: { stars: number; max?: number }) => (
    <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
            <span key={i} className={`text-lg ${i < stars ? 'text-amber-400' : 'text-[#E8D5B7]'}`}>★</span>
        ))}
    </div>
);

const BLOOM_COLORS: Record<string, string> = {
    Remember: 'from-gray-400 to-gray-500',
    Understand: 'from-blue-400 to-blue-500',
    Apply: 'from-green-400 to-green-500',
    Analyze: 'from-yellow-400 to-amber-500',
    Evaluate: 'from-orange-400 to-orange-500',
    Create: 'from-purple-400 to-purple-500',
};

const DebriefScreen = () => {
    const { activeLesson, chatHistory, students, setMode, clearChat, userStats, recordSession } = useGameStore();
    const [summary, setSummary] = useState<any>(null);
    const [recorded, setRecorded] = useState(false);
    const [tab, setTab] = useState<'reviews' | 'insights'>('reviews');

    useEffect(() => {
        const fetchSummary = async () => {
            if (activeLesson) {
                const activeStudents = students
                    .filter(s => activeLesson.activeStudentIds.includes(s.id))
                    .map(s => ({ id: s.id, name: s.name, archetype: s.archetype }));
                const result = await generateLessonSummary(activeLesson.topic, chatHistory, activeStudents);
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
    const avgStars = summary?.studentReviews?.length
        ? (summary.studentReviews.reduce((s: number, r: any) => s + (r.stars || 0), 0) / summary.studentReviews.length).toFixed(1)
        : '—';

    return (
        <div className="absolute inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto" style={{ backgroundColor: 'rgba(235, 225, 205, 0.92)' }}>
            <div className="max-w-3xl w-full my-4 sm:my-8 mx-3 sm:mx-auto">
                {summary ? (
                    <div className="space-y-4 anim-pop">
                        {/* Header card */}
                        <div className="bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-2xl sm:rounded-3xl shadow-[0_8px_40px_rgba(139,90,43,0.15)] border border-[#E8D5B7] p-5 sm:p-8">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-brand font-bold text-[#5D3A1A]">Class Dismissed!</h2>
                                    <p className="text-[#A08060] text-sm font-brand mt-0.5">{activeLesson?.topic}</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-4xl sm:text-5xl font-brand font-bold text-amber-600">{summary.grade}</div>
                                    {activeLesson?.rewardsMode && (
                                        <div className="flex items-center gap-1 text-amber-700 font-brand font-bold text-sm mt-1">
                                            <Coins size={14} className="text-amber-500" /> +{baseCoins + streakBonus}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <p className="text-[#5D3A1A] font-brand leading-relaxed text-sm sm:text-base mb-4">{summary.summary}</p>

                            <div className="flex flex-wrap gap-2">
                                {summary.keyConcepts?.map((c: string, i: number) => (
                                    <span key={i} className="bg-[#FFF5EB] px-2.5 py-1 rounded-lg text-xs font-brand font-bold text-[#6B4226] border border-[#E8D5B7]">{c}</span>
                                ))}
                            </div>

                            {/* Quick stats row */}
                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#E8D5B7]">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-amber-400 text-lg">★</span>
                                    <span className="font-brand font-bold text-[#5D3A1A] text-lg">{avgStars}</span>
                                    <span className="text-[#A08060] text-xs font-brand">avg rating</span>
                                </div>
                                <div className="w-px h-5 bg-[#E8D5B7]" />
                                <div className="flex items-center gap-1.5">
                                    <span className="font-brand font-bold text-[#5D3A1A] text-sm">{summary.confidenceScore}%</span>
                                    <span className="text-[#A08060] text-xs font-brand">confidence</span>
                                </div>
                                <div className="w-px h-5 bg-[#E8D5B7]" />
                                <div className={`px-2.5 py-0.5 rounded-lg text-white text-xs font-brand font-bold bg-gradient-to-r ${BLOOM_COLORS[summary.bloomLevel] || 'from-gray-400 to-gray-500'}`}>
                                    {summary.bloomLevel}
                                </div>
                                {userStats.currentStreak > 1 && (
                                    <>
                                        <div className="w-px h-5 bg-[#E8D5B7]" />
                                        <div className="flex items-center gap-1">
                                            <Flame size={14} className="text-orange-500" />
                                            <span className="font-brand font-bold text-sm text-orange-600">{userStats.currentStreak} day streak</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Tab switcher */}
                        <div className="flex gap-2">
                            <button onClick={() => setTab('reviews')}
                                className={`flex-1 py-2.5 rounded-xl font-brand font-bold text-sm transition-all ${tab === 'reviews' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_2px_12px_rgba(245,158,11,0.25)]' : 'bg-[#FFF9F0] text-[#8B6E4E] border border-[#E8D5B7] hover:bg-[#FFF0DC]'}`}>
                                Student Reviews ({summary.studentReviews?.length || 0})
                            </button>
                            <button onClick={() => setTab('insights')}
                                className={`flex-1 py-2.5 rounded-xl font-brand font-bold text-sm transition-all ${tab === 'insights' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_2px_12px_rgba(245,158,11,0.25)]' : 'bg-[#FFF9F0] text-[#8B6E4E] border border-[#E8D5B7] hover:bg-[#FFF0DC]'}`}>
                                Academic Insights
                            </button>
                        </div>

                        {/* Reviews tab */}
                        {tab === 'reviews' && (
                            <div className="space-y-3">
                                {summary.studentReviews?.map((r: any, i: number) => (
                                    <div key={i} className={`bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-2xl shadow-[0_2px_12px_rgba(139,90,43,0.08)] border border-[#E8D5B7] p-4 sm:p-5 anim-slide-up`}
                                        style={{ animationDelay: `${i * 0.1}s` }}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white font-brand font-bold text-sm shadow-sm">
                                                    {r.studentName?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <span className="font-brand font-bold text-[#5D3A1A] text-sm">{r.studentName}</span>
                                                    <StarRating stars={r.stars || 3} />
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-brand font-bold border ${
                                                (r.stars || 3) >= 4
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : (r.stars || 3) >= 3
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-rose-50 text-rose-600 border-rose-200'
                                            }`}>{r.tag}</span>
                                        </div>
                                        <p className="font-brand text-[#4A2C17] text-sm leading-relaxed">"{r.review}"</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Insights tab */}
                        {tab === 'insights' && (
                            <div className="space-y-3">
                                {/* Confidence breakdown */}
                                <div className="bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-2xl shadow-[0_2px_12px_rgba(139,90,43,0.08)] border border-[#E8D5B7] p-4 sm:p-5 anim-slide-up">
                                    <h3 className="font-brand font-bold text-[#5D3A1A] text-sm mb-3">Teaching Confidence</h3>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex-1 h-3 bg-[#E8D5B7] rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000"
                                                style={{ width: `${summary.confidenceScore}%` }} />
                                        </div>
                                        <span className="font-brand font-bold text-[#5D3A1A] text-lg w-12 text-right">{summary.confidenceScore}%</span>
                                    </div>
                                    <p className="font-brand text-xs text-[#A08060]">
                                        {summary.confidenceScore >= 80 ? 'You explained with clarity and conviction!' :
                                         summary.confidenceScore >= 60 ? 'Decent clarity, but some areas felt uncertain.' :
                                         summary.confidenceScore >= 40 ? 'Several spots felt vague or hedging — try explaining more directly.' :
                                         'You seemed unsure about much of the material. Review and try again!'}
                                    </p>
                                </div>

                                {/* Bloom's taxonomy */}
                                <div className="bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-2xl shadow-[0_2px_12px_rgba(139,90,43,0.08)] border border-[#E8D5B7] p-4 sm:p-5 anim-slide-up" style={{ animationDelay: '0.1s' }}>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-brand font-bold text-[#5D3A1A] text-sm">Bloom's Taxonomy Level</h3>
                                        <a href="https://en.wikipedia.org/wiki/Bloom%27s_taxonomy" target="_blank" rel="noopener noreferrer"
                                            className="font-brand text-[10px] text-amber-600 hover:text-amber-700 underline underline-offset-2">
                                            What's this?
                                        </a>
                                    </div>
                                    <div className="flex gap-1">
                                        {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map((level, i) => {
                                            const bloomOrder = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
                                            const reached = bloomOrder.indexOf(summary.bloomLevel) >= i;
                                            return (
                                                <div key={level} className="flex-1 flex flex-col items-center gap-1">
                                                    <div className={`w-full h-2 rounded-full ${reached ? `bg-gradient-to-r ${BLOOM_COLORS[level]}` : 'bg-[#E8D5B7]'}`} />
                                                    <span className={`font-brand text-[9px] sm:text-[10px] font-bold ${reached ? 'text-[#5D3A1A]' : 'text-[#C4A882]'}`}>
                                                        {level.slice(0, 3)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="font-brand text-xs text-[#A08060] mt-2">
                                        You reached <strong className="text-[#5D3A1A]">{summary.bloomLevel}</strong> — {
                                            summary.bloomLevel === 'Create' ? 'the highest level! You synthesized new ideas.' :
                                            summary.bloomLevel === 'Evaluate' ? 'you critically assessed and justified ideas.' :
                                            summary.bloomLevel === 'Analyze' ? 'you broke down concepts and examined relationships.' :
                                            summary.bloomLevel === 'Apply' ? 'you applied knowledge to situations. Try analyzing deeper!' :
                                            summary.bloomLevel === 'Understand' ? 'you explained concepts. Try applying them to examples!' :
                                            'you recalled facts. Try explaining the "why" behind them!'
                                        }
                                    </p>
                                </div>

                                {/* Review suggestions */}
                                {summary.reviewTopics?.length > 0 && (
                                    <div className="bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-2xl shadow-[0_2px_12px_rgba(139,90,43,0.08)] border border-[#E8D5B7] p-4 sm:p-5 anim-slide-up" style={{ animationDelay: '0.2s' }}>
                                        <h3 className="font-brand font-bold text-[#5D3A1A] text-sm mb-3 flex items-center gap-2">
                                            <BookOpen size={16} className="text-amber-600" /> Suggested Review Topics
                                        </h3>
                                        <div className="space-y-1.5">
                                            {summary.reviewTopics.map((t: string, i: number) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                                                    <span className="font-brand text-sm text-[#4A2C17]">{t}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="space-y-3 pt-2">
                            <button onClick={handleClose}
                                className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-brand font-bold text-lg py-3.5 rounded-2xl hover:from-amber-700 hover:to-amber-900 shadow-[0_4px_16px_rgba(139,90,43,0.25)] btn-press hover-lift transition-all">
                                {activeLesson?.enablePopQuiz ? 'Take Quiz' : 'Return to Lobby'}
                            </button>
                            {activeLesson?.enablePopQuiz && (
                                <button onClick={handleSkip}
                                    className="w-full text-[#A08060] hover:text-[#6B4226] font-brand font-bold text-sm py-2 transition-colors">
                                    Skip Quiz
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-3xl shadow-[0_8px_40px_rgba(139,90,43,0.15)] border border-[#E8D5B7] p-8 text-center anim-pop">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                        <p className="mt-4 text-[#A08060] font-brand text-lg">Your students are writing reviews...</p>
                        <p className="text-[#C4A882] font-brand text-sm mt-1">Analyzing your teaching performance</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const UIOverlay = () => {
    const { mode, interactionTarget, setMode, userStats } = useGameStore();
    const isMobile = useIsMobile();

    const handleInteract = useCallback(() => {
        if (mode === GameMode.FREE_ROAM && interactionTarget) {
            if (interactionTarget.type === 'podium') setMode(GameMode.LESSON_SETUP);
            else if (interactionTarget.type === 'student') setMode(GameMode.DIALOGUE);
            else if (interactionTarget.type === 'desk') setMode(GameMode.SETTINGS);
            else if (interactionTarget.type === 'door') setMode(GameMode.MAIN_MENU);
            else if (interactionTarget.type === 'multiplayer_door') setMode(GameMode.MULTIPLAYER);
        }
    }, [mode, interactionTarget, setMode]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'e') handleInteract();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleInteract]);

    return (
        <>
            {mode === GameMode.FREE_ROAM && (
                <>
                    <div className="absolute top-3 sm:top-5 left-3 sm:left-5 flex items-center gap-1.5 sm:gap-2.5 anim-slide-down">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-[0_4px_16px_rgba(245,158,11,0.35)] hover-lift relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <h1 className="font-brand font-bold text-white text-lg sm:text-xl tracking-tight relative">elix</h1>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <div className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-[0_2px_10px_rgba(139,90,43,0.1)] border border-[#E8D5B7] flex items-center gap-1 sm:gap-1.5 hover-lift anim-delay-1">
                                <Coins size={13} className="text-amber-500 sm:w-[15px] sm:h-[15px]" />
                                <span className="font-brand font-bold text-xs sm:text-sm text-[#6B4226]">{userStats.coins}</span>
                            </div>
                            {userStats.currentStreak > 0 && (
                                <div className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-[0_2px_10px_rgba(139,90,43,0.1)] border border-[#E8D5B7] flex items-center gap-1 sm:gap-1.5 hover-lift anim-delay-2">
                                    <Flame size={13} className="text-orange-500 sm:w-[15px] sm:h-[15px]" />
                                    <span className="font-brand font-bold text-xs sm:text-sm text-[#6B4226]">{userStats.currentStreak}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute top-3 sm:top-5 right-3 sm:right-5 flex items-center gap-1.5 sm:gap-2 anim-slide-down">
                        <button onClick={() => setMode(GameMode.SHOP)}
                            className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] hover:from-[#FFF0DC] hover:to-[#FFE8C8] px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-[0_2px_12px_rgba(139,90,43,0.12)] border border-[#E8D5B7] hover-lift flex items-center gap-1.5 sm:gap-2 group anim-delay-1">
                            <ShoppingBag size={16} className="text-[#8B5A2B] group-hover:text-amber-700 transition-colors sm:w-[18px] sm:h-[18px]" />
                            <span className="font-brand font-semibold text-[#6B4226] text-xs sm:text-sm hidden sm:inline">Shop</span>
                        </button>
                        <button onClick={() => setMode(GameMode.CUSTOMIZE)}
                            className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] hover:from-[#FFF0DC] hover:to-[#FFE8C8] px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-[0_2px_12px_rgba(139,90,43,0.12)] border border-[#E8D5B7] hover-lift flex items-center gap-1.5 sm:gap-2 group anim-delay-2">
                            <Pencil size={16} className="text-[#8B5A2B] group-hover:text-amber-700 transition-colors sm:w-[18px] sm:h-[18px]" />
                            <span className="font-brand font-semibold text-[#6B4226] text-xs sm:text-sm hidden sm:inline">Edit Room</span>
                        </button>
                    </div>

                    {!isMobile && (
                        <div className="absolute bottom-5 left-5 text-[#8B7355] bg-[#FFF9F0]/70 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-brand border border-[#E8D5B7]/50 anim-slide-up anim-delay-3">
                            WASD to move · E to interact
                        </div>
                    )}

                    {isMobile && (
                        <div className="absolute bottom-6 left-6 z-40 anim-slide-up">
                            <VirtualJoystick />
                        </div>
                    )}

                    {isMobile && interactionTarget && (
                        <button onClick={handleInteract}
                            className="absolute bottom-8 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(245,158,11,0.4)] active:scale-90 transition-transform anim-bounce-in"
                            style={{ animation: 'elix-pulse-soft 2s ease-in-out infinite' }}>
                            <span className="font-brand font-bold text-xl">E</span>
                        </button>
                    )}

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
            {mode === GameMode.MULTIPLAYER && <MultiplayerLobby />}
            {mode === GameMode.DIALOGUE && interactionTarget?.type === 'student' && interactionTarget.id && (
                <DialogueSystem studentId={interactionTarget.id} onClose={() => setMode(GameMode.FREE_ROAM)} />
            )}
        </>
    );
};

const MultiplayerLobby = () => {
    const { setMode } = useGameStore();
    const placeholderRooms = [
        { name: "Jaemin's Biology Lab", topic: 'Cellular Respiration', players: 3, rating: 4.2 },
        { name: "Nathaly's Physics Room", topic: 'Quantum Mechanics', players: 1, rating: 4.8 },
        { name: "Jenna's History Class", topic: 'The French Revolution', players: 5, rating: 3.9 },
        { name: "Jenn's Math Studio", topic: 'Linear Algebra', players: 2, rating: 4.5 },
    ];

    return (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(235, 225, 205, 0.92)' }}>
            <div className="bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl shadow-[0_8px_40px_rgba(139,90,43,0.15)] border border-[#E8D5B7] overflow-hidden max-h-[95vh] sm:max-h-[85vh] flex flex-col anim-scale-in">
                <div className="p-5 sm:p-6 border-b border-[#E8D5B7] flex justify-between items-center">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-brand font-bold text-[#5D3A1A]">Other Classrooms</h2>
                        <p className="text-sm text-[#A08060] font-brand mt-0.5">Visit and learn from other teachers</p>
                    </div>
                    <button onClick={() => setMode(GameMode.FREE_ROAM)} className="text-[#A08060] hover:text-rose-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
                    {/* Coming soon banner */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white text-center shadow-[0_4px_16px_rgba(245,158,11,0.25)] mb-4">
                        <p className="font-brand font-bold text-lg">Coming Soon!</p>
                        <p className="font-brand text-sm text-white/80 mt-1">Multiplayer classrooms are under development. Here's a preview of what's coming.</p>
                    </div>

                    {placeholderRooms.map((room, i) => (
                        <div key={i}
                            className={`bg-[#FFF5EB] rounded-2xl border border-[#E8D5B7] p-4 flex items-center justify-between opacity-75 anim-slide-up`}
                            style={{ animationDelay: `${i * 0.08}s` }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center text-white font-brand font-bold shadow-sm text-sm">
                                    {room.name[0]}
                                </div>
                                <div>
                                    <p className="font-brand font-bold text-[#5D3A1A] text-sm">{room.name}</p>
                                    <p className="font-brand text-xs text-[#A08060]">{room.topic} · {room.players} watching</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1">
                                    <span className="text-amber-400">★</span>
                                    <span className="font-brand font-bold text-sm text-[#5D3A1A]">{room.rating}</span>
                                </div>
                                <button disabled className="mt-1 px-3 py-1 rounded-lg bg-[#E8D5B7] text-[#A08060] text-xs font-brand font-bold cursor-not-allowed">
                                    Join
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-5 sm:p-6 border-t border-[#E8D5B7]">
                    <button onClick={() => setMode(GameMode.FREE_ROAM)}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-brand font-bold text-lg py-3 rounded-2xl hover:from-amber-700 hover:to-amber-900 shadow-[0_4px_16px_rgba(139,90,43,0.25)] btn-press hover-lift transition-all">
                        Back to Classroom
                    </button>
                </div>
            </div>
        </div>
    );
};
