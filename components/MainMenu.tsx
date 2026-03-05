import React, { useState } from 'react';
import { useGameStore } from '../store';
import { GameMode } from '../types';
import { BookOpen, Settings, Info, LogIn, Flame, Coins, Trophy } from 'lucide-react';

export const MainMenu = () => {
    const { setMode, userStats } = useGameStore();
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

    const buttons = [
        { id: 'start', label: 'Enter Classroom', icon: LogIn, primary: true, action: () => setMode(GameMode.FREE_ROAM) },
        { id: 'lessons', label: 'Quick Lesson', icon: BookOpen, primary: false, action: () => setMode(GameMode.LESSON_SETUP) },
        { id: 'settings', label: 'Settings', icon: Settings, primary: false, action: () => {} },
        { id: 'about', label: 'About', icon: Info, primary: false, action: () => {} },
    ];

    const recentSessions = userStats.sessionHistory.slice(0, 3);

    return (
        <div className="absolute inset-0 z-50 pointer-events-auto flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-[#3E2723]/70 via-transparent to-[#5D4037]/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#3E2723]/50 via-transparent to-transparent" />

            <div className="relative z-10 flex flex-col items-center gap-2 max-w-md w-full px-8">
                <div className="mb-4 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-cozy-brown/90 border-4 border-[#FFD54F] shadow-2xl flex items-center justify-center mb-5">
                        <span className="text-4xl">📚</span>
                    </div>
                    <h1 className="font-display font-bold text-5xl text-white tracking-wide"
                        style={{ textShadow: '0 3px 0 #5D4037, 0 6px 12px rgba(0,0,0,0.4)' }}>
                        CozyClassroom
                    </h1>
                    <p className="font-display text-[#FFD54F] text-lg mt-2 tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                        Learn by Teaching
                    </p>
                </div>

                {/* Stats Panel */}
                {userStats.totalSessions > 0 && (
                    <div className="w-full max-w-xs bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-2 border border-white/15">
                        <div className="flex items-center justify-around mb-3">
                            <div className="flex items-center gap-1.5 text-white/90">
                                <Flame size={18} className="text-orange-400" />
                                <span className="font-display font-bold text-sm">{userStats.currentStreak}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-white/90">
                                <Coins size={18} className="text-yellow-400" />
                                <span className="font-display font-bold text-sm">{userStats.coins}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-white/90">
                                <Trophy size={18} className="text-blue-300" />
                                <span className="font-display font-bold text-sm">{userStats.totalSessions}</span>
                            </div>
                        </div>
                        {recentSessions.length > 0 && (
                            <div className="space-y-1.5">
                                {recentSessions.map(s => (
                                    <div key={s.id} className="flex items-center justify-between text-xs text-white/70">
                                        <span className="font-display truncate max-w-[150px]">{s.topic}</span>
                                        <span className="font-display font-bold text-white/90">{s.grade}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-[#FFD54F]/50 to-transparent mb-4" />

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    {buttons.map((btn) => {
                        const Icon = btn.icon;
                        const isHovered = hoveredBtn === btn.id;
                        return (
                            <button key={btn.id} onClick={btn.action}
                                onMouseEnter={() => setHoveredBtn(btn.id)} onMouseLeave={() => setHoveredBtn(null)}
                                className={`relative w-full py-3.5 px-6 rounded-2xl font-display font-bold text-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-3
                                    ${btn.primary ? 'bg-cozy-green text-white shadow-lg shadow-green-900/30 border-2 border-white/30' : 'bg-cozy-brown/85 text-white/90 shadow-md border-2 border-white/15'}
                                    ${isHovered ? (btn.primary ? 'scale-105 shadow-xl shadow-green-900/40 bg-green-500' : 'scale-105 shadow-lg bg-cozy-brown') : ''}
                                `}>
                                <Icon size={20} className={btn.primary ? 'text-white' : 'text-white/70'} />
                                {btn.label}
                            </button>
                        );
                    })}
                </div>

                <p className="mt-8 text-white/30 text-xs font-display tracking-widest">v0.2.0 alpha</p>
            </div>
        </div>
    );
};
