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
            <div className="absolute top-4 left-0 right-0 flex justify-between items-start px-6 pointer-events-auto">
                <div className="bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-lg border-2 border-orange-200">
                    <h2 className="font-display font-bold text-cozy-brown text-lg">Edit Classroom</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Click items to move, drag from inventory to place</p>
                </div>

                <button
                    onClick={() => setMode(GameMode.FREE_ROAM)}
                    className="bg-cozy-green hover:bg-green-500 text-white px-6 py-3 rounded-2xl font-display font-bold text-lg shadow-lg border-2 border-white transition-all active:scale-95 flex items-center gap-2"
                >
                    <Check size={20} /> Done
                </button>
            </div>

            {/* Toolbar (when item selected or placing) */}
            {(placingType || selectedItemId) && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 pointer-events-auto">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200 px-4 py-3 flex items-center gap-3">
                        <span className="font-display font-bold text-cozy-brown text-sm">
                            {placingType ? `Placing: ${FURNITURE_CATALOG[placingType].name}` : `Selected: ${selectedCatalog?.name}`}
                        </span>
                        <div className="w-px h-6 bg-orange-200" />
                        <button
                            onClick={rotateGhost}
                            className="bg-orange-100 hover:bg-orange-200 text-cozy-brown p-2 rounded-xl transition-colors flex items-center gap-1"
                            title="Rotate (R)"
                        >
                            <RotateCw size={18} /> <span className="text-xs font-bold">R</span>
                        </button>
                        {selectedItemId && (
                            <button
                                onClick={() => removeFurniture(selectedItemId)}
                                className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-xl transition-colors flex items-center gap-1"
                                title="Delete (Del)"
                            >
                                <Trash2 size={18} /> <span className="text-xs font-bold">Del</span>
                            </button>
                        )}
                        <button
                            onClick={cancelPlacing}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl transition-colors"
                            title="Cancel (Esc)"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Inventory Bar */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
                <div className="bg-white/95 backdrop-blur-md border-t-2 border-orange-200 px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inventory</p>
                        <p className="text-xs text-gray-400">Click furniture to select • R to rotate • Del to remove • Esc to cancel</p>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                        {Object.entries(groupedInventory).length === 0 && (
                            <p className="text-gray-400 text-sm italic py-4">No items in inventory. Remove placed items to add them back.</p>
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
                                        flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 transition-all active:scale-95
                                        ${isActive
                                            ? 'bg-cozy-green/20 border-cozy-green shadow-md'
                                            : 'bg-orange-50 border-orange-200 hover:border-cozy-brown hover:bg-orange-100'
                                        }
                                    `}
                                >
                                    <span className="text-2xl">{FURNITURE_ICONS[ft] || '📦'}</span>
                                    <span className="font-display font-bold text-cozy-brown text-xs">{catalog.name}</span>
                                    {count > 1 && (
                                        <span className="text-[10px] bg-cozy-brown text-white px-1.5 rounded-full font-bold">x{count}</span>
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
