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
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-4 border-cozy-brown overflow-hidden max-h-[85vh] flex flex-col">
                <div className="p-6 pb-4 flex justify-between items-center border-b border-orange-100">
                    <h2 className="text-2xl font-display font-bold text-cozy-brown">Settings</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* API Key */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                            <Key size={16} /> Gemini API Key
                        </label>
                        <div className="flex gap-2">
                            <input type={showKey ? 'text' : 'password'} value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                className="flex-1 bg-orange-50 border-2 border-orange-200 rounded-xl p-3 focus:outline-none focus:border-cozy-brown font-mono text-sm"
                                placeholder="Enter your API key..." />
                            <button onClick={() => setShowKey(!showKey)}
                                className="bg-orange-50 border-2 border-orange-200 rounded-xl px-3 hover:bg-orange-100 transition-colors">
                                <Eye size={18} className="text-gray-500" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Stored locally, never sent to our servers</p>
                    </div>

                    {/* Default Input Mode */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                            Default Teaching Input
                        </label>
                        <div className="flex rounded-xl overflow-hidden border-2 border-orange-200">
                            <button onClick={() => updateSettings({ inputMode: 'voice' })}
                                className={`flex-1 py-2.5 font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors ${settings.inputMode === 'voice' ? 'bg-cozy-green text-white' : 'bg-orange-50 text-gray-600 hover:bg-orange-100'}`}>
                                <Mic size={16} /> Voice
                            </button>
                            <button onClick={() => updateSettings({ inputMode: 'text' })}
                                className={`flex-1 py-2.5 font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors ${settings.inputMode === 'text' ? 'bg-cozy-green text-white' : 'bg-orange-50 text-gray-600 hover:bg-orange-100'}`}>
                                <Type size={16} /> Text
                            </button>
                        </div>
                    </div>

                    {/* Voice Language */}
                    {settings.inputMode === 'voice' && (
                        <div>
                            <label className="text-sm font-bold text-gray-600 mb-2 block">Voice Language</label>
                            <select value={settings.voiceLanguage}
                                onChange={e => updateSettings({ voiceLanguage: e.target.value })}
                                className="w-full bg-orange-50 border-2 border-orange-200 rounded-xl p-3 focus:outline-none focus:border-cozy-brown font-display">
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
                    <div className="border-t border-orange-100 pt-4">
                        <label className="text-sm font-bold text-gray-600 mb-3 block">Data Management</label>
                        <div className="space-y-2">
                            {confirmReset === 'knowledge' ? (
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                                    <p className="text-sm text-red-700 font-bold mb-3">Reset all student memories? This cannot be undone.</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => { resetStudentKnowledge(); setConfirmReset(null); }}
                                            className="flex-1 bg-red-500 text-white py-2 rounded-lg font-display font-bold text-sm">Confirm Reset</button>
                                        <button onClick={() => setConfirmReset(null)}
                                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-display font-bold text-sm">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setConfirmReset('knowledge')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors text-left">
                                    <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><RotateCcw size={16} /> Reset Student Memories</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-100">
                        <h3 className="text-sm font-bold text-gray-600 mb-2">Your Stats</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-gray-500">Total Sessions</div>
                            <div className="font-display font-bold text-cozy-brown text-right">{userStats.totalSessions}</div>
                            <div className="text-gray-500">Total Coins</div>
                            <div className="font-display font-bold text-cozy-brown text-right">{userStats.coins}</div>
                            <div className="text-gray-500">Best Streak</div>
                            <div className="font-display font-bold text-cozy-brown text-right">{userStats.longestStreak} days</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-4 border-t border-orange-100">
                    <button onClick={handleClose}
                        className="w-full bg-cozy-brown text-white font-display font-bold text-lg py-3 rounded-xl hover:bg-brown-600 shadow-lg active:scale-95 transition-transform">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
