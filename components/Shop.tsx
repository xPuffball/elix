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
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border-4 border-yellow-400 overflow-hidden max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-6 pb-4 flex justify-between items-center border-b border-orange-100 bg-gradient-to-r from-yellow-50 to-orange-50">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-cozy-brown">Shop</h2>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Coins size={16} className="text-yellow-500" />
                            <span className="font-display font-bold text-sm text-gray-700">{userStats.coins} coins</span>
                        </div>
                    </div>
                    <button onClick={() => setMode(GameMode.FREE_ROAM)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-orange-100">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex-1 py-3 font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors ${tab === t.id ? 'bg-orange-50 text-cozy-brown border-b-2 border-cozy-brown' : 'text-gray-400 hover:text-gray-600'}`}>
                                <Icon size={16} /> {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Toast */}
                {message && (
                    <div className="mx-6 mt-4 bg-cozy-green text-white px-4 py-2 rounded-xl font-display font-bold text-sm text-center">
                        {message}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {tab === 'furniture' && (
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(FURNITURE_PRICES).map(([type, price]) => {
                                const ft = type as FurnitureType;
                                const cat = FURNITURE_CATALOG[ft];
                                const count = inventory.filter(i => i === ft).length;
                                return (
                                    <div key={ft} className="bg-orange-50 rounded-xl border-2 border-orange-200 p-4 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-display font-bold text-cozy-brown">{cat.name}</h3>
                                                <p className="text-xs text-gray-400">Size: {cat.size[0]}x{cat.size[1]}</p>
                                            </div>
                                            {count > 0 && (
                                                <span className="bg-cozy-green/20 text-cozy-green px-2 py-0.5 rounded-full text-xs font-bold">
                                                    x{count} owned
                                                </span>
                                            )}
                                        </div>
                                        <button onClick={() => buyFurniture(ft)}
                                            className={`mt-auto flex items-center justify-center gap-1.5 py-2 rounded-lg font-display font-bold text-sm transition-all active:scale-95 ${
                                                userStats.coins >= price!
                                                    ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
                                    <div key={wp.id} className={`rounded-xl border-2 p-4 flex flex-col gap-2 ${isActive ? 'border-cozy-green bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg border-2 border-white shadow-sm" style={{ background: wp.wallColor }} />
                                            <div className="w-3 h-10 rounded-sm" style={{ background: wp.trimColor }} />
                                        </div>
                                        <h3 className="font-display font-bold text-cozy-brown text-sm">{wp.name}</h3>
                                        {owned ? (
                                            isActive ? (
                                                <div className="mt-auto flex items-center justify-center gap-1 py-2 rounded-lg bg-cozy-green text-white font-display font-bold text-xs">
                                                    <Check size={14} /> Active
                                                </div>
                                            ) : (
                                                <button onClick={() => setActiveWallpaper(wp.id)}
                                                    className="mt-auto py-2 rounded-lg bg-cozy-brown text-white font-display font-bold text-xs hover:bg-brown-600 transition-all active:scale-95">
                                                    Use
                                                </button>
                                            )
                                        ) : (
                                            <button onClick={() => buyWallpaper(wp.id)}
                                                className={`mt-auto flex items-center justify-center gap-1.5 py-2 rounded-lg font-display font-bold text-xs transition-all active:scale-95 ${
                                                    userStats.coins >= wp.price
                                                        ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
                                    <div key={fl.id} className={`rounded-xl border-2 p-4 flex flex-col gap-2 ${isActive ? 'border-cozy-green bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg border-2 border-white shadow-sm" style={{ background: fl.floorColor }} />
                                            <div className="w-10 h-3 rounded-sm" style={{ background: fl.plankColor }} />
                                        </div>
                                        <h3 className="font-display font-bold text-cozy-brown text-sm">{fl.name}</h3>
                                        {owned ? (
                                            isActive ? (
                                                <div className="mt-auto flex items-center justify-center gap-1 py-2 rounded-lg bg-cozy-green text-white font-display font-bold text-xs">
                                                    <Check size={14} /> Active
                                                </div>
                                            ) : (
                                                <button onClick={() => setActiveFloor(fl.id)}
                                                    className="mt-auto py-2 rounded-lg bg-cozy-brown text-white font-display font-bold text-xs hover:bg-brown-600 transition-all active:scale-95">
                                                    Use
                                                </button>
                                            )
                                        ) : (
                                            <button onClick={() => buyFloor(fl.id)}
                                                className={`mt-auto flex items-center justify-center gap-1.5 py-2 rounded-lg font-display font-bold text-xs transition-all active:scale-95 ${
                                                    userStats.coins >= fl.price
                                                        ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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

                <div className="p-6 pt-4 border-t border-orange-100">
                    <button onClick={() => setMode(GameMode.FREE_ROAM)}
                        className="w-full bg-cozy-brown text-white font-display font-bold text-lg py-3 rounded-xl hover:bg-brown-600 shadow-lg active:scale-95 transition-transform">
                        Done Shopping
                    </button>
                </div>
            </div>
        </div>
    );
};
