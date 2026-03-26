import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store';
import { chatWithStudent } from '../services/geminiService';
import { playSpeechBlip } from '../utils/audio';
import { Archetype, KnowledgeTopic } from '../types';
import { ChevronRight, BrainCircuit, X, Send, ChevronDown } from 'lucide-react';

// --- Text Parser for Effects ---

type TextSegment = {
    text: string;
    effect: 'none' | 'wave' | 'shake' | 'rainbow' | 'bold';
};

const parseText = (input: string): TextSegment[] => {
    const regex = /\{(wave|shake|rainbow|bold)\}(.*?)\{\/\1\}|([^{]+)/g;
    const segments: TextSegment[] = [];
    let match;

    while ((match = regex.exec(input)) !== null) {
        if (match[2]) {
            // Matched a tag
            segments.push({
                text: match[2],
                effect: match[1] as any
            });
        } else if (match[3]) {
            // Matched plain text
            segments.push({
                text: match[3],
                effect: 'none'
            });
        }
    }
    return segments;
};

// --- Sub-components ---

interface AnimatedCharProps {
    char: string;
    effect: string;
    index: number;
}

const AnimatedChar: React.FC<AnimatedCharProps> = ({ char, effect, index }) => {
    if (char === ' ') return <span>&nbsp;</span>;
    
    let className = "inline-block";
    let style: React.CSSProperties = {};

    if (effect === 'bold') {
        className += " font-bold text-cozy-brown";
    } else if (effect === 'wave') {
        style = { animation: `wave 1s infinite ease-in-out ${index * 0.1}s` };
        className += " text-cozy-blue";
    } else if (effect === 'shake') {
        style = { animation: `shake 0.5s infinite ${Math.random()}s` };
        className += " text-red-500 font-bold";
    } else if (effect === 'rainbow') {
        className += " animate-pulse text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 font-bold";
    }

    return <span className={className} style={style}>{char}</span>;
};

// --- Main Dialogue Component ---

export const DialogueSystem = ({ studentId, onClose }: { studentId: string, onClose: () => void }) => {
    const { students, setMode } = useGameStore();
    const student = students.find(s => s.id === studentId);
    
    // UI State
    const [isMemoryOpen, setIsMemoryOpen] = useState(false);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<{sender: 'user' | 'model', text: string}[]>([]);
    const [loading, setLoading] = useState(false);

    // Typewriter State
    const [fullText, setFullText] = useState("Hi there! I'm ready to learn!");
    const [displayedCharCount, setDisplayedCharCount] = useState(0);
    const [isTyping, setIsTyping] = useState(false);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);

    // Parse current text into segments for rendering
    const segments = useMemo(() => parseText(fullText), [fullText]);
    const plainText = useMemo(() => segments.map(s => s.text).join(''), [segments]);

    // Initial greeting
    useEffect(() => {
        if (student) {
            setFullText(`Hi! I'm ${student.name}. Ask me anything about what we've learned!`);
            setDisplayedCharCount(0);
            setIsTyping(true);
        }
    }, [studentId]);

    // Typewriter Effect Loop
    useEffect(() => {
        if (isTyping && displayedCharCount < plainText.length) {
            const timeout = setTimeout(() => {
                setDisplayedCharCount(prev => prev + 1);
                
                // Play sound occasionally (every 2nd or 3rd char) to not be annoying
                if (displayedCharCount % 2 === 0 && student) {
                    playSpeechBlip(student.archetype);
                }

            }, 40); // Typing speed
            return () => clearTimeout(timeout);
        } else {
            setIsTyping(false);
        }
    }, [isTyping, displayedCharCount, plainText, student]);

    const handleSend = async () => {
        if (!input.trim() || !student) return;
        
        const userMsg = input.trim();
        setInput('');
        setLoading(true);
        setIsTyping(false); 
        
        // Optimistic UI update for user message? We don't show user bubbles, just AI response usually in VN style.
        // But let's show it in history if we had a history log. 
        // For this style, we just wipe the text box and wait for response.
        setFullText("..."); 
        setDisplayedCharCount(3);

        const response = await chatWithStudent(student, userMsg);
        
        setFullText(response);
        setDisplayedCharCount(0);
        setIsTyping(true);
        setLoading(false);
    };

    if (!student) return null;

    // Helper to get slice of text based on global char index
    const renderTypewriterText = () => {
        let charsRenderedSoFar = 0;
        const result = [];

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const segLength = seg.text.length;
            
            // If we have passed this entire segment already
            if (charsRenderedSoFar + segLength <= displayedCharCount) {
                result.push(
                    <span key={i}>
                        {seg.text.split('').map((c, idx) => (
                            <AnimatedChar key={idx} char={c} effect={seg.effect} index={idx} />
                        ))}
                    </span>
                );
                charsRenderedSoFar += segLength;
            } 
            // If we are currently inside this segment
            else if (charsRenderedSoFar < displayedCharCount) {
                const charsToRender = displayedCharCount - charsRenderedSoFar;
                const partialText = seg.text.slice(0, charsToRender);
                result.push(
                    <span key={i}>
                        {partialText.split('').map((c, idx) => (
                            <AnimatedChar key={idx} char={c} effect={seg.effect} index={idx} />
                        ))}
                    </span>
                );
                charsRenderedSoFar += charsToRender;
                break; // Stop rendering here
            } else {
                break; // Haven't reached this segment yet
            }
        }
        return result;
    }

    return (
        <>
            {/* Custom Styles for Animations */}
            <style>{`
                @keyframes wave {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
            `}</style>

            {/* Side Panel: Memory (Slide in from right) */}
            <div className={`
                absolute top-0 right-0 h-full w-80 bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] shadow-[−8px_0_24px_rgba(139,90,43,0.15)] transform transition-transform duration-300 z-40 border-l border-[#E8D5B7]
                ${isMemoryOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-brand font-bold text-xl text-[#5D3A1A] flex items-center gap-2">
                            <BrainCircuit className="text-amber-600" /> Memory
                        </h2>
                        <button onClick={() => setIsMemoryOpen(false)} className="text-[#A08060] hover:text-rose-500 transition-colors">
                            <X size={22}/>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                         {Object.entries(student.knowledge).map(([topic, rawData], idx) => {
                             const data = rawData as KnowledgeTopic;
                             return (
                                <div key={idx} className="bg-[#FFF5EB] rounded-xl p-3 border border-[#E8D5B7]">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-brand font-bold text-[#5D3A1A] text-sm">{topic}</span>
                                        <span className="text-xs bg-[#FFF9F0] px-2 py-1 rounded-lg border border-[#E8D5B7] text-amber-700 font-brand font-bold">{data.level}</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {data.facts.map((fact, i) => (
                                            <li key={i} className="text-xs text-[#6B4226] flex gap-2">
                                                <span className="text-emerald-500">•</span> {fact}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                        {Object.keys(student.knowledge).length === 0 && (
                            <p className="text-[#A08060] text-center italic text-sm font-brand mt-10">Thinking empty thoughts...</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Dialogue UI */}
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-end pb-8">
                {/* Controls Area (Pointer Events Auto) */}
                <div className="w-full max-w-4xl mx-auto px-4 pointer-events-auto flex flex-col gap-4">
                    
                    {/* Top Controls */}
                    <div className="flex justify-end gap-2 mb-2 anim-slide-down">
                        <button 
                            onClick={() => setIsMemoryOpen(!isMemoryOpen)}
                            className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DC] text-[#5D3A1A] px-4 py-2 rounded-xl shadow-[0_2px_12px_rgba(139,90,43,0.12)] font-brand font-bold flex items-center gap-2 hover:from-[#FFF0DC] hover:to-[#FFE8C8] border border-[#E8D5B7] hover-lift"
                        >
                            <BrainCircuit size={18} className="text-amber-600" /> {isMemoryOpen ? 'Hide Memory' : 'Check Memory'}
                        </button>
                        <button 
                            onClick={onClose}
                            className="bg-gradient-to-r from-red-400 to-rose-500 text-white px-4 py-2 rounded-xl shadow-[0_2px_10px_rgba(239,68,68,0.2)] font-brand font-bold hover:from-red-500 hover:to-rose-600 btn-press hover-lift"
                        >
                            Goodbye
                        </button>
                    </div>

                    {/* Dialogue Box */}
                    <div className="bg-gradient-to-b from-[#FFF9F0]/97 to-[#FFF3E0]/97 backdrop-blur-md rounded-3xl shadow-[0_8px_32px_rgba(139,90,43,0.15)] border border-[#E8D5B7] overflow-hidden anim-slide-up">
                        {/* Name Tag */}
                        <div className="bg-gradient-to-r from-[#FFF0DC] to-[#FFE8C8] px-8 py-2 w-fit rounded-br-2xl border-r border-b border-[#E8D5B7]">
                             <h2 className="font-brand font-bold text-2xl text-[#5D3A1A]">{student.name}</h2>
                        </div>

                        <div className="p-8 min-h-[140px] flex items-start">
                             <p className="font-brand text-xl text-[#4A2C17] leading-relaxed w-full">
                                {renderTypewriterText()}
                                {isTyping && <span className="inline-block w-2 h-5 bg-amber-700 ml-1 animate-pulse rounded-sm"/>}
                             </p>
                        </div>

                        {/* Input Area */}
                        <div className="bg-[#FFF5EB] p-4 flex gap-2 border-t border-[#E8D5B7]">
                            <input
                                className="flex-1 bg-[#FFF9F0] border border-[#E8D5B7] rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 font-brand text-lg text-[#4A2C17] placeholder-[#C4A882]"
                                placeholder={`Say something to ${student.name}...`}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                disabled={isTyping || loading}
                                autoFocus
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={!input || isTyping || loading}
                                className="bg-gradient-to-r from-amber-600 to-amber-800 text-white p-4 rounded-xl hover:from-amber-700 hover:to-amber-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-[0_2px_8px_rgba(139,90,43,0.2)]"
                            >
                                <Send size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
