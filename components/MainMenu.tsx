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
            op: Math.random() * 0.12 + 0.03,
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
                        background: 'radial-gradient(circle, rgba(255,213,79,0.9) 0%, rgba(255,152,0,0.3) 100%)',
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
            {/* Translucent overlay — lets the 3D classroom show through */}
            <div className="absolute inset-0 bg-[#1C110A]/80 backdrop-blur-md" />

            {/* Subtle warm vignette on top */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D0907]/60 via-transparent to-[#1C110A]/40 pointer-events-none" />

            {/* Ambient radial glows */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 60% 40% at 50% 32%, rgba(255,152,0,0.09) 0%, transparent 70%)',
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 35% 25% at 50% 48%, rgba(255,213,79,0.05) 0%, transparent 70%)',
            }} />

            <FloatingOrbs />

            {/* Content */}
            <div className={`relative z-10 flex flex-col items-center w-full max-w-xl px-8 transition-all duration-[1200ms] ease-out ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

                {/* Brand */}
                <h1
                    className="font-brand font-bold text-white tracking-tight select-none leading-none mb-3"
                    style={{
                        fontSize: 'clamp(5rem, 12vw, 8rem)',
                        animation: 'elix-glow 4s ease-in-out infinite',
                    }}
                >
                    elix
                </h1>

                {/* Tagline with rotating word */}
                <div className="mb-12 text-center">
                    <p className="text-white/40 text-lg sm:text-xl font-display font-medium mb-4 tracking-wide">
                        explain like I'm
                    </p>
                    <div className="relative h-12 flex items-center justify-center overflow-hidden">
                        <span
                            key={wordIndex}
                            className="elix-word-enter inline-block px-5 py-1.5 rounded-2xl font-brand font-bold text-xl sm:text-2xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,213,79,0.14) 0%, rgba(255,152,0,0.08) 100%)',
                                border: '1px solid rgba(255,213,79,0.18)',
                                color: '#FFD54F',
                            }}
                        >
                            {WORDS[wordIndex]}
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mb-8" />

                {/* Stats */}
                {userStats.totalSessions > 0 && (
                    <div
                        className="w-full max-w-sm bg-white/[0.04] backdrop-blur-2xl rounded-2xl px-5 py-3.5 mb-6 border border-white/[0.06]"
                        style={{ animation: 'elix-fade-up 0.8s ease 0.3s both' }}
                    >
                        <div className="flex items-center justify-around">
                            <div className="flex items-center gap-2">
                                <Flame size={16} className="text-orange-400" />
                                <span className="font-brand font-bold text-sm text-white/80">{userStats.currentStreak}</span>
                                <span className="text-[10px] text-white/30 uppercase tracking-wider">streak</span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-2">
                                <Coins size={16} className="text-yellow-400" />
                                <span className="font-brand font-bold text-sm text-white/80">{userStats.coins}</span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-2">
                                <Trophy size={16} className="text-amber-300/80" />
                                <span className="font-brand font-bold text-sm text-white/80">{userStats.totalSessions}</span>
                            </div>
                        </div>
                        {recentSessions.length > 0 && (
                            <div className="space-y-1.5 border-t border-white/[0.06] pt-2.5 mt-3">
                                {recentSessions.map(s => (
                                    <div key={s.id} className="flex items-center justify-between text-xs">
                                        <span className="font-display truncate max-w-[160px] text-white/40">{s.topic}</span>
                                        <span className="font-brand font-bold text-white/70">{s.grade}</span>
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
                                className={`group relative w-full py-3.5 px-6 rounded-2xl font-brand font-semibold text-base transition-all duration-300 active:scale-[0.97] flex items-center justify-between
                                    ${btn.primary
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-900/30 hover:shadow-xl hover:shadow-orange-900/40 hover:scale-[1.02]'
                                        : 'bg-white/[0.06] text-white/70 border border-white/[0.08] hover:bg-white/[0.1] hover:text-white hover:border-white/[0.15]'
                                    }`}
                                style={{ animation: `elix-fade-up 0.6s ease ${0.4 + i * 0.1}s both` }}
                            >
                                <span>{btn.label}</span>
                                <Icon
                                    size={18}
                                    className={`transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''} ${btn.primary ? 'text-white/90' : 'text-white/40 group-hover:text-white/60'}`}
                                />
                            </button>
                        );
                    })}
                </div>

                {/* Version */}
                <p className="mt-12 text-white/[0.12] text-[10px] tracking-[0.3em] uppercase font-brand">
                    v0.2.0 alpha
                </p>
            </div>
        </div>
    );
};
