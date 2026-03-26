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
            <div className="bg-gradient-to-r from-[#FFF9F0]/95 to-[#FFF3E0]/95 backdrop-blur-md p-4 pointer-events-auto flex justify-between items-center shadow-[0_2px_16px_rgba(139,90,43,0.1)] border-b border-[#E8D5B7] anim-slide-down">
                <div>
                    <h1 className="text-2xl font-brand font-bold text-[#5D3A1A]">{activeLesson?.title || activeLesson?.topic}</h1>
                    <p className="text-[#A08060] text-sm font-brand">Teach by explaining simply. Answer their questions!</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setInputMode(m => m === 'voice' ? 'text' : 'voice')}
                        className="bg-[#FFF0DC] hover:bg-[#FFE8C8] p-2.5 rounded-xl border border-[#E8D5B7] transition-colors" title={`Switch to ${inputMode === 'voice' ? 'text' : 'voice'} input`}>
                        {inputMode === 'voice' ? <Keyboard size={18} className="text-[#8B5A2B]" /> : <Mic size={18} className="text-[#8B5A2B]" />}
                    </button>
                    <button onClick={() => setMode(GameMode.DEBRIEF)} className="bg-gradient-to-r from-red-400 to-rose-500 hover:from-red-500 hover:to-rose-600 text-white px-4 py-2 rounded-xl font-bold font-brand shadow-[0_2px_8px_rgba(239,68,68,0.25)] transition-all">
                        End Class
                    </button>
                </div>
            </div>

            {knowledgeFeedback && (
                <div className="absolute top-32 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.3)] animate-bounce z-50 flex items-center gap-2 max-w-lg">
                    <BrainCircuit size={20} className="shrink-0" />
                    <span className="font-brand font-bold truncate">{knowledgeFeedback.student} learned: "{knowledgeFeedback.fact}"</span>
                </div>
            )}

            <div className="absolute top-24 right-4 space-y-2 pointer-events-auto">
                {activeStudents.map((s, i) => (
                    <div key={s.id} className={`bg-gradient-to-r from-[#FFF9F0]/90 to-[#FFF3E0]/90 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-[0_2px_10px_rgba(139,90,43,0.08)] border border-[#E8D5B7] w-52 flex items-center justify-between card-hover anim-slide-right anim-delay-${i + 1}`}>
                        <span className="font-brand font-bold text-[#5D3A1A] text-sm">{s.name}</span>
                        <div className="flex gap-2 text-xs">
                            {s.mood === 'happy' && <Smile size={16} className="text-emerald-500" />}
                            {s.mood === 'confused' && <Frown size={16} className="text-rose-400" />}
                            {s.mood === 'neutral' && <Meh size={16} className="text-amber-400" />}
                            {s.mood === 'thinking' && (
                                <div className="flex gap-0.5 items-center">
                                    {[0, 1, 2].map(j => (
                                        <div key={j} className="w-1.5 h-1.5 rounded-full bg-amber-400"
                                            style={{ animation: `elix-bounce-in 0.5s ease-in-out ${j * 0.12}s infinite alternate` }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex-1"></div>

            <div className="p-6 pointer-events-auto max-w-xl mx-auto w-full pb-12">
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
        <div className="absolute inset-0 bg-[#F5EDDA]/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 overflow-y-auto">
            <div className="max-w-2xl w-full bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-3xl shadow-[0_8px_40px_rgba(139,90,43,0.15)] p-8 border border-[#E8D5B7] anim-pop">
                <div className="flex justify-center mb-5">
                    <div className="bg-gradient-to-br from-amber-300 to-amber-500 w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_4px_16px_rgba(245,158,11,0.3)]">
                        <Award size={36} className="text-white" />
                    </div>
                </div>
                <h2 className="text-4xl font-brand font-bold text-center text-[#5D3A1A] mb-2 anim-slide-up anim-delay-1">Class Dismissed!</h2>
                <p className="text-center text-[#A08060] text-lg font-brand mb-8">Here's how you did teaching "{activeLesson?.topic}"</p>

                {summary ? (
                    <div className="space-y-5">
                        <div className="bg-gradient-to-r from-[#FFF5EB] to-[#FFF0DC] p-6 rounded-2xl border border-[#E8D5B7] flex items-center justify-between">
                            <div>
                                <h3 className="font-brand font-bold text-[#8B6E4E] text-sm mb-1">Teacher's Grade</h3>
                                <div className="text-5xl font-brand font-bold text-amber-600">{summary.grade}</div>
                            </div>
                            {activeLesson?.rewardsMode && (
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 text-amber-700 font-brand font-bold text-lg">
                                        <Coins size={20} className="text-amber-500" /> +{baseCoins}
                                    </div>
                                    {streakBonus > 0 && (
                                        <div className="flex items-center gap-1 text-orange-600 font-brand font-bold text-sm mt-1">
                                            <Flame size={14} /> +{streakBonus} streak bonus
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {userStats.currentStreak > 1 && (
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 rounded-2xl text-white text-center shadow-[0_4px_16px_rgba(245,158,11,0.25)]">
                                <div className="flex items-center justify-center gap-2 font-brand font-bold text-lg">
                                    <Flame size={24} /> {userStats.currentStreak} day streak!
                                </div>
                            </div>
                        )}

                        <div className="bg-[#FFF5EB] p-6 rounded-2xl border border-[#E8D5B7]">
                            <h3 className="font-brand font-bold text-[#8B6E4E] text-sm mb-2">Feedback</h3>
                            <p className="text-base text-[#5D3A1A] font-brand leading-relaxed italic">"{summary.comment}"</p>
                        </div>

                        <div className="bg-[#FFF5EB] p-6 rounded-2xl border border-[#E8D5B7]">
                            <h3 className="font-brand font-bold text-[#8B6E4E] text-sm mb-3">Concepts Covered</h3>
                            <div className="flex flex-wrap gap-2">
                                {summary.keyConcepts?.map((c: string, i: number) => (
                                    <span key={i} className="bg-[#FFF9F0] px-3 py-1.5 rounded-xl text-sm font-brand font-bold text-[#6B4226] border border-[#E8D5B7]">{c}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                        <p className="mt-4 text-[#A08060] font-brand">Grading papers...</p>
                    </div>
                )}

                <div className="mt-8 space-y-3">
                    <button onClick={handleClose}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-brand font-bold text-xl py-4 rounded-2xl hover:from-amber-700 hover:to-amber-900 shadow-[0_4px_16px_rgba(139,90,43,0.25)] btn-press hover-lift transition-all">
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
                    <div className="absolute top-5 left-5 flex items-center gap-2.5 anim-slide-down">
                        <div className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] px-4 py-2.5 rounded-2xl shadow-[0_2px_12px_rgba(139,90,43,0.12)] border border-[#E8D5B7] hover-lift">
                            <h1 className="font-brand font-bold text-[#5D3A1A] text-xl tracking-tight">elix</h1>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] px-3 py-2 rounded-xl shadow-[0_2px_10px_rgba(139,90,43,0.1)] border border-[#E8D5B7] flex items-center gap-1.5 hover-lift anim-delay-1">
                                <Coins size={15} className="text-amber-500" />
                                <span className="font-brand font-bold text-sm text-[#6B4226]">{userStats.coins}</span>
                            </div>
                            {userStats.currentStreak > 0 && (
                                <div className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] px-3 py-2 rounded-xl shadow-[0_2px_10px_rgba(139,90,43,0.1)] border border-[#E8D5B7] flex items-center gap-1.5 hover-lift anim-delay-2">
                                    <Flame size={15} className="text-orange-500" />
                                    <span className="font-brand font-bold text-sm text-[#6B4226]">{userStats.currentStreak}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute top-5 right-5 flex items-center gap-2 anim-slide-down">
                        <button onClick={() => setMode(GameMode.SHOP)}
                            className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] hover:from-[#FFF0DC] hover:to-[#FFE8C8] px-4 py-2.5 rounded-2xl shadow-[0_2px_12px_rgba(139,90,43,0.12)] border border-[#E8D5B7] hover-lift flex items-center gap-2 group anim-delay-1">
                            <ShoppingBag size={18} className="text-[#8B5A2B] group-hover:text-amber-700 transition-colors" />
                            <span className="font-brand font-semibold text-[#6B4226] text-sm">Shop</span>
                        </button>
                        <button onClick={() => setMode(GameMode.CUSTOMIZE)}
                            className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] hover:from-[#FFF0DC] hover:to-[#FFE8C8] px-4 py-2.5 rounded-2xl shadow-[0_2px_12px_rgba(139,90,43,0.12)] border border-[#E8D5B7] hover-lift flex items-center gap-2 group anim-delay-2">
                            <Pencil size={18} className="text-[#8B5A2B] group-hover:text-amber-700 transition-colors" />
                            <span className="font-brand font-semibold text-[#6B4226] text-sm">Edit Room</span>
                        </button>
                    </div>

                    <div className="absolute bottom-5 left-5 text-[#8B7355] bg-[#FFF9F0]/70 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-brand border border-[#E8D5B7]/50 anim-slide-up anim-delay-3">
                        WASD to move · E to interact
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
