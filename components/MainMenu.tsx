import React, { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../store';
import { GameMode } from '../types';
import { BookOpen, Settings, Flame, Coins, Trophy, ArrowRight } from 'lucide-react';

const WORDS = [
    "a 5-year-old",
    "a curious cat",
    "an astronaut",
    "a grandma",
    "a time traveler",
    "a pirate",
    "a goldfish",
    "a robot",
    "a detective",
    "a mad scientist",
];

const FloatingOrbs = () => {
    const orbs = useMemo(() =>
        Array.from({ length: 22 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 6 + 2,
            dur: Math.random() * 30 + 20,
            delay: -(Math.random() * 30),
            op: Math.random() * 0.08 + 0.02,
        })), []
    );

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {orbs.map(o => (
                <div
                    key={o.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${o.x}%`,
                        top: `${o.y}%`,
                        width: o.size,
                        height: o.size,
                        background: 'radial-gradient(circle, rgba(217,168,100,0.6) 0%, rgba(196,168,130,0.15) 100%)',
                        opacity: o.op,
                        animation: `elix-float ${o.dur}s ease-in-out ${o.delay}s infinite`,
                    }}
                />
            ))}
        </div>
    );
};

export const MainMenu = () => {
    const { setMode, userStats } = useGameStore();
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
    const [wordIndex, setWordIndex] = useState(0);
    const [show, setShow] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setShow(true));
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            setWordIndex(i => (i + 1) % WORDS.length);
        }, 2800);
        return () => clearInterval(id);
    }, []);

    const buttons = [
        { id: 'start', label: 'Start Learning', icon: ArrowRight, primary: true, action: () => setMode(GameMode.FREE_ROAM) },
        { id: 'lessons', label: 'Quick Lesson', icon: BookOpen, primary: false, action: () => setMode(GameMode.LESSON_SETUP) },
        { id: 'settings', label: 'Settings', icon: Settings, primary: false, action: () => setMode(GameMode.SETTINGS) },
    ];

    const recentSessions = userStats.sessionHistory.slice(0, 3);

    return (
        <div className="absolute inset-0 z-50 pointer-events-auto flex items-center justify-center overflow-hidden">
            {/* Translucent overlay — warm frosted glass lets 3D classroom peek through */}
            <div className="absolute inset-0 bg-[#F5EDDA]/85 backdrop-blur-xl" />

            {/* Subtle warm vignette on top */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#E8D5B7]/40 via-transparent to-[#FFF9F0]/30 pointer-events-none" />

            {/* Ambient radial glows */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 60% 40% at 50% 32%, rgba(255,152,0,0.06) 0%, transparent 70%)',
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 35% 25% at 50% 48%, rgba(255,213,79,0.04) 0%, transparent 70%)',
            }} />

            <FloatingOrbs />

            {/* Content */}
            <div className={`relative z-10 flex flex-col items-center w-full max-w-xl px-5 sm:px-8 transition-all duration-[1200ms] ease-out ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

                {/* Brand */}
                <h1
                    className="font-brand font-bold text-[#5D3A1A] tracking-tight select-none leading-none mb-3"
                    style={{
                        fontSize: 'clamp(5rem, 12vw, 8rem)',
                        textShadow: '0 2px 30px rgba(139,90,43,0.08)',
                    }}
                >
                    elix
                </h1>

                {/* Tagline with rotating word */}
                <div className="mb-8 sm:mb-12 text-center">
                    <p className="text-[#A08060] text-lg sm:text-xl font-display font-medium mb-4 tracking-wide">
                        explain like I'm
                    </p>
                    <div className="relative h-12 flex items-center justify-center overflow-hidden">
                        <span
                            key={wordIndex}
                            className="elix-word-enter inline-block px-5 py-1.5 rounded-2xl font-brand font-bold text-xl sm:text-2xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(255,152,0,0.06) 100%)',
                                border: '1px solid rgba(217,168,100,0.3)',
                                color: '#B45309',
                            }}
                        >
                            {WORDS[wordIndex]}
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#D4B896] to-transparent mb-5 sm:mb-8" />

                {/* Stats */}
                {userStats.totalSessions > 0 && (
                    <div
                        className="w-full max-w-sm bg-[#FFF9F0]/60 backdrop-blur-xl rounded-2xl px-5 py-3.5 mb-6 border border-[#E8D5B7]/60 shadow-[0_2px_12px_rgba(139,90,43,0.06)]"
                        style={{ animation: 'elix-fade-up 0.8s ease 0.3s both' }}
                    >
                        <div className="flex items-center justify-around">
                            <div className="flex items-center gap-2">
                                <Flame size={16} className="text-orange-500" />
                                <span className="font-brand font-bold text-sm text-[#5D3A1A]">{userStats.currentStreak}</span>
                                <span className="text-[10px] text-[#A08060] uppercase tracking-wider">streak</span>
                            </div>
                            <div className="w-px h-4 bg-[#E8D5B7]" />
                            <div className="flex items-center gap-2">
                                <Coins size={16} className="text-amber-500" />
                                <span className="font-brand font-bold text-sm text-[#5D3A1A]">{userStats.coins}</span>
                            </div>
                            <div className="w-px h-4 bg-[#E8D5B7]" />
                            <div className="flex items-center gap-2">
                                <Trophy size={16} className="text-amber-600" />
                                <span className="font-brand font-bold text-sm text-[#5D3A1A]">{userStats.totalSessions}</span>
                            </div>
                        </div>
                        {recentSessions.length > 0 && (
                            <div className="space-y-1.5 border-t border-[#E8D5B7]/50 pt-2.5 mt-3">
                                {recentSessions.map(s => (
                                    <div key={s.id} className="flex items-center justify-between text-xs">
                                        <span className="font-display truncate max-w-[160px] text-[#A08060]">{s.topic}</span>
                                        <span className="font-brand font-bold text-[#6B4226]">{s.grade}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col gap-3 w-full max-w-sm">
                    {buttons.map((btn, i) => {
                        const Icon = btn.icon;
                        const isHovered = hoveredBtn === btn.id;
                        return (
                            <button
                                key={btn.id}
                                onClick={btn.action}
                                onMouseEnter={() => setHoveredBtn(btn.id)}
                                onMouseLeave={() => setHoveredBtn(null)}
                                className={`group relative w-full py-3.5 px-6 rounded-2xl font-brand font-semibold text-base flex items-center justify-between hover-lift btn-press
                                    ${btn.primary
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_6px_24px_rgba(245,158,11,0.35)]'
                                        : 'bg-[#FFF9F0]/50 text-[#6B4226] border border-[#E8D5B7]/60 hover:bg-[#FFF9F0]/80 hover:text-[#5D3A1A] hover:border-[#D4B896]'
                                    }`}
                                style={{ animation: `elix-fade-up 0.6s ease ${0.4 + i * 0.1}s both` }}
                            >
                                <span>{btn.label}</span>
                                <Icon
                                    size={18}
                                    className={`transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''} ${btn.primary ? 'text-white/90' : 'text-[#A08060] group-hover:text-[#6B4226]'}`}
                                />
                            </button>
                        );
                    })}
                </div>

                {/* Version */}
                <p className="mt-6 sm:mt-12 text-[#C4A882] text-[10px] tracking-[0.3em] uppercase font-brand">
                    v0.2.0 alpha
                </p>
            </div>
        </div>
    );
};
