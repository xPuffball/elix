import React, { useState } from 'react';
import { useGameStore } from '../store';
import { GameMode, FurnitureType } from '../types';
import { X, Coins, ShoppingBag, Paintbrush, Grid3x3, Check } from 'lucide-react';
import { WALLPAPER_THEMES, FLOOR_THEMES, FURNITURE_PRICES } from '../shopCatalog';
import { FURNITURE_CATALOG } from '../furnitureCatalog';

type ShopTab = 'furniture' | 'wallpaper' | 'floor';

export const Shop = () => {
    const {
        setMode, userStats, spendCoins, inventory,
        ownedWallpapers, ownedFloors, activeWallpaper, activeFloor,
        setActiveWallpaper, setActiveFloor, addOwnedWallpaper, addOwnedFloor,
    } = useGameStore();
    const [tab, setTab] = useState<ShopTab>('furniture');
    const [message, setMessage] = useState('');

    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 2000);
    };

    const buyFurniture = (type: FurnitureType) => {
        const price = FURNITURE_PRICES[type];
        if (!price) return;
        if (userStats.coins < price) {
            showMessage('Not enough coins!');
            return;
        }
        const success = spendCoins(price);
        if (success) {
            useGameStore.setState((s) => ({ inventory: [...s.inventory, type] }));
            showMessage(`Purchased ${FURNITURE_CATALOG[type].name}!`);
        }
    };

    const buyWallpaper = (id: string) => {
        const wp = WALLPAPER_THEMES.find(w => w.id === id);
        if (!wp || ownedWallpapers.includes(id)) return;
        if (userStats.coins < wp.price) {
            showMessage('Not enough coins!');
            return;
        }
        const success = spendCoins(wp.price);
        if (success) {
            addOwnedWallpaper(id);
            showMessage(`Purchased ${wp.name}!`);
        }
    };

    const buyFloor = (id: string) => {
        const fl = FLOOR_THEMES.find(f => f.id === id);
        if (!fl || ownedFloors.includes(id)) return;
        if (userStats.coins < fl.price) {
            showMessage('Not enough coins!');
            return;
        }
        const success = spendCoins(fl.price);
        if (success) {
            addOwnedFloor(id);
            showMessage(`Purchased ${fl.name}!`);
        }
    };

    const tabs: { id: ShopTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
        { id: 'furniture', label: 'Furniture', icon: Grid3x3 },
        { id: 'wallpaper', label: 'Wallpapers', icon: Paintbrush },
        { id: 'floor', label: 'Floors', icon: ShoppingBag },
    ];

    return (
        <div className="absolute inset-0 bg-[#F5EDDA]/75 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-3xl w-full max-w-2xl shadow-[0_8px_40px_rgba(139,90,43,0.15)] border border-[#E8D5B7] overflow-hidden max-h-[85vh] flex flex-col anim-scale-in">
                {/* Header */}
                <div className="p-6 pb-4 flex justify-between items-center border-b border-[#E8D5B7] bg-gradient-to-r from-[#FFF9F0] to-[#FFF0DC]">
                    <div>
                        <h2 className="text-2xl font-brand font-bold text-[#5D3A1A]">Shop</h2>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Coins size={16} className="text-amber-500" />
                            <span className="font-brand font-bold text-sm text-[#6B4226]">{userStats.coins} coins</span>
                        </div>
                    </div>
                    <button onClick={() => setMode(GameMode.FREE_ROAM)} className="text-[#A08060] hover:text-rose-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#E8D5B7]">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex-1 py-3 font-brand font-bold text-sm flex items-center justify-center gap-2 transition-all ${tab === t.id ? 'bg-[#FFF5EB] text-[#5D3A1A] border-b-2 border-amber-500' : 'text-[#A08060] hover:text-[#6B4226]'}`}>
                                <Icon size={16} /> {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Toast */}
                {message && (
                    <div className="mx-6 mt-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 rounded-xl font-brand font-bold text-sm text-center shadow-[0_2px_10px_rgba(16,185,129,0.2)]">
                        {message}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {tab === 'furniture' && (
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(FURNITURE_PRICES).map(([type, price], idx) => {
                                const ft = type as FurnitureType;
                                const cat = FURNITURE_CATALOG[ft];
                                const count = inventory.filter(i => i === ft).length;
                                return (
                                    <div key={ft} className={`bg-[#FFF5EB] rounded-xl border border-[#E8D5B7] p-4 flex flex-col gap-2 card-hover anim-slide-up anim-delay-${Math.min(idx + 1, 5)}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-brand font-bold text-[#5D3A1A]">{cat.name}</h3>
                                                <p className="text-xs text-[#A08060] font-brand">Size: {cat.size[0]}x{cat.size[1]}</p>
                                            </div>
                                            {count > 0 && (
                                                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg text-xs font-brand font-bold border border-emerald-200">
                                                    x{count}
                                                </span>
                                            )}
                                        </div>
                                        <button onClick={() => buyFurniture(ft)}
                                            className={`mt-auto flex items-center justify-center gap-1.5 py-2 rounded-xl font-brand font-bold text-sm transition-all active:scale-95 ${
                                                userStats.coins >= price!
                                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 hover:from-amber-500 hover:to-amber-600 shadow-[0_2px_8px_rgba(245,158,11,0.2)]'
                                                    : 'bg-[#E8D5B7] text-[#A08060] cursor-not-allowed'
                                            }`}>
                                            <Coins size={14} /> {price}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {tab === 'wallpaper' && (
                        <div className="grid grid-cols-2 gap-3">
                            {WALLPAPER_THEMES.map(wp => {
                                const owned = ownedWallpapers.includes(wp.id);
                                const isActive = activeWallpaper === wp.id;
                                return (
                                    <div key={wp.id} className={`rounded-xl border p-4 flex flex-col gap-2 ${isActive ? 'border-amber-500 bg-amber-50 shadow-[0_2px_10px_rgba(245,158,11,0.12)]' : 'border-[#E8D5B7] bg-[#FFF5EB]'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg border border-[#E8D5B7] shadow-sm" style={{ background: wp.wallColor }} />
                                            <div className="w-3 h-10 rounded-sm" style={{ background: wp.trimColor }} />
                                        </div>
                                        <h3 className="font-brand font-bold text-[#5D3A1A] text-sm">{wp.name}</h3>
                                        {owned ? (
                                            isActive ? (
                                                <div className="mt-auto flex items-center justify-center gap-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-brand font-bold text-xs">
                                                    <Check size={14} /> Active
                                                </div>
                                            ) : (
                                                <button onClick={() => setActiveWallpaper(wp.id)}
                                                    className="mt-auto py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 text-white font-brand font-bold text-xs hover:from-amber-700 hover:to-amber-900 transition-all active:scale-95">
                                                    Use
                                                </button>
                                            )
                                        ) : (
                                            <button onClick={() => buyWallpaper(wp.id)}
                                                className={`mt-auto flex items-center justify-center gap-1.5 py-2 rounded-xl font-brand font-bold text-xs transition-all active:scale-95 ${
                                                    userStats.coins >= wp.price
                                                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 hover:from-amber-500 hover:to-amber-600'
                                                        : 'bg-[#E8D5B7] text-[#A08060] cursor-not-allowed'
                                                }`}>
                                                <Coins size={12} /> {wp.price}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {tab === 'floor' && (
                        <div className="grid grid-cols-2 gap-3">
                            {FLOOR_THEMES.map(fl => {
                                const owned = ownedFloors.includes(fl.id);
                                const isActive = activeFloor === fl.id;
                                return (
                                    <div key={fl.id} className={`rounded-xl border p-4 flex flex-col gap-2 ${isActive ? 'border-amber-500 bg-amber-50 shadow-[0_2px_10px_rgba(245,158,11,0.12)]' : 'border-[#E8D5B7] bg-[#FFF5EB]'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg border border-[#E8D5B7] shadow-sm" style={{ background: fl.floorColor }} />
                                            <div className="w-10 h-3 rounded-sm" style={{ background: fl.plankColor }} />
                                        </div>
                                        <h3 className="font-brand font-bold text-[#5D3A1A] text-sm">{fl.name}</h3>
                                        {owned ? (
                                            isActive ? (
                                                <div className="mt-auto flex items-center justify-center gap-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-brand font-bold text-xs">
                                                    <Check size={14} /> Active
                                                </div>
                                            ) : (
                                                <button onClick={() => setActiveFloor(fl.id)}
                                                    className="mt-auto py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 text-white font-brand font-bold text-xs hover:from-amber-700 hover:to-amber-900 transition-all active:scale-95">
                                                    Use
                                                </button>
                                            )
                                        ) : (
                                            <button onClick={() => buyFloor(fl.id)}
                                                className={`mt-auto flex items-center justify-center gap-1.5 py-2 rounded-xl font-brand font-bold text-xs transition-all active:scale-95 ${
                                                    userStats.coins >= fl.price
                                                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 hover:from-amber-500 hover:to-amber-600'
                                                        : 'bg-[#E8D5B7] text-[#A08060] cursor-not-allowed'
                                                }`}>
                                                <Coins size={12} /> {fl.price}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-6 pt-4 border-t border-[#E8D5B7]">
                    <button onClick={() => setMode(GameMode.FREE_ROAM)}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-brand font-bold text-lg py-3 rounded-2xl hover:from-amber-700 hover:to-amber-900 shadow-[0_4px_16px_rgba(139,90,43,0.25)] active:scale-[0.98] transition-all">
                        Done Shopping
                    </button>
                </div>
            </div>
        </div>
    );
};
