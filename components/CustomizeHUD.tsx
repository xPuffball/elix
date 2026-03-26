import React, { useEffect } from 'react';
import { useGameStore } from '../store';
import { GameMode, FurnitureType } from '../types';
import { FURNITURE_CATALOG } from '../furnitureCatalog';
import { RotateCw, Trash2, X, Check } from 'lucide-react';

const FURNITURE_ICONS: Record<FurnitureType, string> = {
    [FurnitureType.PODIUM]: '🎤',
    [FurnitureType.TEACHER_DESK]: '🗄️',
    [FurnitureType.STUDENT_DESK]: '📖',
    [FurnitureType.BLACKBOARD]: '📋',
    [FurnitureType.BOOKSHELF]: '📚',
    [FurnitureType.POTTED_PLANT]: '🌱',
    [FurnitureType.AREA_RUG]: '🟫',
    [FurnitureType.WALL_CLOCK]: '🕐',
    [FurnitureType.DOOR]: '🚪',
};

export const CustomizeHUD = () => {
    const {
        setMode, inventory, customizeState, placingType, selectedItemId,
        startPlacing, cancelPlacing, removeFurniture, rotateGhost, placedFurniture, deselectItem,
    } = useGameStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'r') {
                rotateGhost();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedItemId) removeFurniture(selectedItemId);
            } else if (e.key === 'Escape') {
                if (placingType || selectedItemId) {
                    cancelPlacing();
                } else {
                    setMode(GameMode.FREE_ROAM);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItemId, placingType, rotateGhost, removeFurniture, cancelPlacing, setMode]);

    const selectedItem = selectedItemId ? placedFurniture.find(f => f.id === selectedItemId) : null;
    const selectedCatalog = selectedItem ? FURNITURE_CATALOG[selectedItem.type] : null;

    const groupedInventory = inventory.reduce<Record<string, number>>((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="absolute inset-0 pointer-events-none z-40">
            {/* Top Bar */}
            <div className="absolute top-4 left-0 right-0 flex justify-between items-start px-6 pointer-events-auto anim-slide-down">
                <div className="bg-gradient-to-br from-[#FFF9F0]/95 to-[#FFF0DC]/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-[0_2px_16px_rgba(139,90,43,0.12)] border border-[#E8D5B7] hover-lift">
                    <h2 className="font-brand font-bold text-[#5D3A1A] text-lg">Edit Classroom</h2>
                    <p className="text-xs text-[#A08060] font-brand mt-0.5">Click items to move, drag from inventory to place</p>
                </div>

                <button
                    onClick={() => setMode(GameMode.FREE_ROAM)}
                    className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white px-6 py-3 rounded-2xl font-brand font-bold text-lg shadow-[0_4px_16px_rgba(16,185,129,0.25)] btn-press hover-lift flex items-center gap-2"
                >
                    <Check size={20} /> Done
                </button>
            </div>

            {/* Toolbar (when item selected or placing) */}
            {(placingType || selectedItemId) && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 pointer-events-auto">
                    <div className="bg-gradient-to-r from-[#FFF9F0]/97 to-[#FFF0DC]/97 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(139,90,43,0.12)] border border-[#E8D5B7] px-4 py-3 flex items-center gap-3 anim-bounce-in">
                        <span className="font-brand font-bold text-[#5D3A1A] text-sm">
                            {placingType ? `Placing: ${FURNITURE_CATALOG[placingType].name}` : `Selected: ${selectedCatalog?.name}`}
                        </span>
                        <div className="w-px h-6 bg-[#E8D5B7]" />
                        <button
                            onClick={rotateGhost}
                            className="bg-[#FFF0DC] hover:bg-[#FFE8C8] text-[#6B4226] p-2 rounded-xl transition-colors flex items-center gap-1"
                            title="Rotate (R)"
                        >
                            <RotateCw size={18} /> <span className="text-xs font-brand font-bold">R</span>
                        </button>
                        {selectedItemId && (
                            <button
                                onClick={() => removeFurniture(selectedItemId)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-500 p-2 rounded-xl transition-colors flex items-center gap-1"
                                title="Delete (Del)"
                            >
                                <Trash2 size={18} /> <span className="text-xs font-brand font-bold">Del</span>
                            </button>
                        )}
                        <button
                            onClick={cancelPlacing}
                            className="bg-[#F5EDDA] hover:bg-[#EDE0C8] text-[#8B7355] p-2 rounded-xl transition-colors"
                            title="Cancel (Esc)"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Inventory Bar */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
                <div className="bg-gradient-to-t from-[#FFF9F0]/97 to-[#FFF3E0]/97 backdrop-blur-md border-t border-[#E8D5B7] px-6 py-4 anim-slide-up">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-brand font-bold text-[#A08060] uppercase tracking-wider">Inventory</p>
                        <p className="text-xs text-[#A08060] font-brand">Click furniture to select · R to rotate · Del to remove · Esc to cancel</p>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                        {Object.entries(groupedInventory).length === 0 && (
                            <p className="text-[#A08060] text-sm italic font-brand py-4">No items in inventory. Remove placed items to add them back.</p>
                        )}
                        {Object.entries(groupedInventory).map(([type, count]) => {
                            const ft = type as FurnitureType;
                            const catalog = FURNITURE_CATALOG[ft];
                            const isActive = placingType === ft;
                            return (
                                <button
                                    key={type}
                                    onClick={() => isActive ? cancelPlacing() : startPlacing(ft)}
                                    className={`
                                        flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border transition-all active:scale-95
                                        ${isActive
                                            ? 'bg-emerald-50 border-emerald-400 shadow-[0_2px_10px_rgba(16,185,129,0.15)]'
                                            : 'bg-[#FFF5EB] border-[#E8D5B7] hover:border-amber-500 hover:bg-[#FFF0DC]'
                                        }
                                    `}
                                >
                                    <span className="text-2xl">{FURNITURE_ICONS[ft] || '📦'}</span>
                                    <span className="font-brand font-bold text-[#5D3A1A] text-xs">{catalog.name}</span>
                                    {count > 1 && (
                                        <span className="text-[10px] bg-amber-700 text-white px-1.5 rounded-lg font-brand font-bold">x{count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
