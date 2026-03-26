import React, { useState } from 'react';
import { useGameStore } from '../store';
import { GameMode } from '../types';
import { X, Key, Mic, Type, Eye, Trash2, RotateCcw } from 'lucide-react';

export const SettingsModal = () => {
    const { settings, updateSettings, setMode, resetStudentKnowledge, userStats } = useGameStore();
    const [apiKey, setApiKey] = useState(settings.apiKey);
    const [showKey, setShowKey] = useState(false);
    const [confirmReset, setConfirmReset] = useState<'knowledge' | null>(null);

    const handleSave = () => {
        updateSettings({ apiKey: apiKey.trim() });
    };

    const handleClose = () => {
        handleSave();
        setMode(GameMode.FREE_ROAM);
    };

    return (
        <div className="absolute inset-0 bg-[#F5EDDA]/75 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-3xl w-full max-w-lg shadow-[0_8px_40px_rgba(139,90,43,0.15)] border border-[#E8D5B7] overflow-hidden max-h-[85vh] flex flex-col anim-scale-in">
                <div className="p-6 pb-4 flex justify-between items-center border-b border-[#E8D5B7]">
                    <h2 className="text-2xl font-brand font-bold text-[#5D3A1A]">Settings</h2>
                    <button onClick={handleClose} className="text-[#A08060] hover:text-rose-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* API Key */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-brand font-bold text-[#6B4226] mb-2">
                            <Key size={16} /> Gemini API Key
                        </label>
                        <div className="flex gap-2">
                            <input type={showKey ? 'text' : 'password'} value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                className="flex-1 bg-[#FFF5EB] border border-[#E8D5B7] rounded-xl p-3 focus:outline-none focus:border-amber-500 font-mono text-sm text-[#4A2C17]"
                                placeholder="Enter your API key..." />
                            <button onClick={() => setShowKey(!showKey)}
                                className="bg-[#FFF5EB] border border-[#E8D5B7] rounded-xl px-3 hover:bg-[#FFF0DC] transition-colors">
                                <Eye size={18} className="text-[#8B6E4E]" />
                            </button>
                        </div>
                        <p className="text-xs text-[#A08060] font-brand mt-1">Stored locally, never sent to our servers</p>
                    </div>

                    {/* Default Input Mode */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-brand font-bold text-[#6B4226] mb-2">
                            Default Teaching Input
                        </label>
                        <div className="flex rounded-xl overflow-hidden border border-[#E8D5B7]">
                            <button onClick={() => updateSettings({ inputMode: 'voice' })}
                                className={`flex-1 py-2.5 font-brand font-bold text-sm flex items-center justify-center gap-2 transition-all ${settings.inputMode === 'voice' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-[#FFF5EB] text-[#8B6E4E] hover:bg-[#FFF0DC]'}`}>
                                <Mic size={16} /> Voice
                            </button>
                            <button onClick={() => updateSettings({ inputMode: 'text' })}
                                className={`flex-1 py-2.5 font-brand font-bold text-sm flex items-center justify-center gap-2 transition-all ${settings.inputMode === 'text' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-[#FFF5EB] text-[#8B6E4E] hover:bg-[#FFF0DC]'}`}>
                                <Type size={16} /> Text
                            </button>
                        </div>
                    </div>

                    {/* Voice Language */}
                    {settings.inputMode === 'voice' && (
                        <div>
                            <label className="text-sm font-brand font-bold text-[#6B4226] mb-2 block">Voice Language</label>
                            <select value={settings.voiceLanguage}
                                onChange={e => updateSettings({ voiceLanguage: e.target.value })}
                                className="w-full bg-[#FFF5EB] border border-[#E8D5B7] rounded-xl p-3 focus:outline-none focus:border-amber-500 font-brand text-[#4A2C17]">
                                <option value="en-US">English (US)</option>
                                <option value="en-GB">English (UK)</option>
                                <option value="es-ES">Spanish</option>
                                <option value="fr-FR">French</option>
                                <option value="de-DE">German</option>
                                <option value="ja-JP">Japanese</option>
                                <option value="ko-KR">Korean</option>
                                <option value="zh-CN">Chinese (Simplified)</option>
                            </select>
                        </div>
                    )}

                    {/* Data Management */}
                    <div className="border-t border-[#E8D5B7] pt-4">
                        <label className="text-sm font-brand font-bold text-[#6B4226] mb-3 block">Data Management</label>
                        <div className="space-y-2">
                            {confirmReset === 'knowledge' ? (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                                    <p className="text-sm text-rose-700 font-brand font-bold mb-3">Reset all student memories? This cannot be undone.</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => { resetStudentKnowledge(); setConfirmReset(null); }}
                                            className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white py-2 rounded-lg font-brand font-bold text-sm">Confirm Reset</button>
                                        <button onClick={() => setConfirmReset(null)}
                                            className="flex-1 bg-[#F5EDDA] text-[#6B4226] py-2 rounded-lg font-brand font-bold text-sm">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setConfirmReset('knowledge')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E8D5B7] bg-[#FFF5EB] hover:bg-[#FFF0DC] transition-colors text-left">
                                    <span className="text-sm font-brand font-bold text-[#5D3A1A] flex items-center gap-2"><RotateCcw size={16} /> Reset Student Memories</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="bg-[#FFF5EB] rounded-xl p-4 border border-[#E8D5B7]">
                        <h3 className="text-sm font-brand font-bold text-[#6B4226] mb-2">Your Stats</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-[#A08060] font-brand">Total Sessions</div>
                            <div className="font-brand font-bold text-[#5D3A1A] text-right">{userStats.totalSessions}</div>
                            <div className="text-[#A08060] font-brand">Total Coins</div>
                            <div className="font-brand font-bold text-[#5D3A1A] text-right">{userStats.coins}</div>
                            <div className="text-[#A08060] font-brand">Best Streak</div>
                            <div className="font-brand font-bold text-[#5D3A1A] text-right">{userStats.longestStreak} days</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-4 border-t border-[#E8D5B7]">
                    <button onClick={handleClose}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-brand font-bold text-lg py-3 rounded-2xl hover:from-amber-700 hover:to-amber-900 shadow-[0_4px_16px_rgba(139,90,43,0.25)] active:scale-[0.98] transition-all">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
