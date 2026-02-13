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
                absolute top-0 right-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 z-40 border-l-4 border-orange-200
                ${isMemoryOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-display font-bold text-xl text-cozy-brown flex items-center gap-2">
                            <BrainCircuit /> Memory
                        </h2>
                        <button onClick={() => setIsMemoryOpen(false)} className="text-gray-400 hover:text-red-500">
                            <X size={24}/>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                         {Object.entries(student.knowledge).map(([topic, rawData], idx) => {
                             const data = rawData as KnowledgeTopic;
                             return (
                                <div key={idx} className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-gray-700 text-sm">{topic}</span>
                                        <span className="text-xs bg-white px-2 py-1 rounded-full border border-orange-200 text-cozy-brown font-bold">{data.level}</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {data.facts.map((fact, i) => (
                                            <li key={i} className="text-xs text-gray-600 flex gap-2">
                                                <span className="text-cozy-green">•</span> {fact}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                        {Object.keys(student.knowledge).length === 0 && (
                            <p className="text-gray-400 text-center italic text-sm mt-10">Thinking empty thoughts...</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Dialogue UI */}
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-end pb-8">
                {/* Controls Area (Pointer Events Auto) */}
                <div className="w-full max-w-4xl mx-auto px-4 pointer-events-auto flex flex-col gap-4">
                    
                    {/* Top Controls */}
                    <div className="flex justify-end gap-2 mb-2">
                        <button 
                            onClick={() => setIsMemoryOpen(!isMemoryOpen)}
                            className="bg-white text-cozy-brown px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 hover:bg-orange-50 border-2 border-orange-100 transition-all active:scale-95"
                        >
                            <BrainCircuit size={18} /> {isMemoryOpen ? 'Hide Memory' : 'Check Memory'}
                        </button>
                        <button 
                            onClick={onClose}
                            className="bg-red-400 text-white px-4 py-2 rounded-full shadow-lg font-bold hover:bg-red-500 border-2 border-red-400 transition-all active:scale-95"
                        >
                            Goodbye
                        </button>
                    </div>

                    {/* Dialogue Box */}
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-4 border-white overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
                        {/* Name Tag */}
                        <div className="bg-orange-100 px-8 py-2 w-fit rounded-br-2xl border-r-2 border-b-2 border-white">
                             <h2 className="font-display font-bold text-2xl text-cozy-brown">{student.name}</h2>
                        </div>

                        <div className="p-8 min-h-[140px] flex items-start">
                             <p className="font-display text-xl text-gray-700 leading-relaxed w-full">
                                {renderTypewriterText()}
                                {isTyping && <span className="inline-block w-2 h-5 bg-cozy-brown ml-1 animate-pulse"/>}
                             </p>
                        </div>

                        {/* Input Area */}
                        <div className="bg-gray-50 p-4 flex gap-2 border-t border-gray-100">
                            <input
                                className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-cozy-brown font-display text-lg"
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
                                className="bg-cozy-brown text-white p-4 rounded-xl hover:bg-brown-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
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
