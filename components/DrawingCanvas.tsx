import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Send, Trash2, Minus, Plus } from 'lucide-react';

interface DrawingCanvasProps {
  onSend: (imageData: string) => void;
  onClose: () => void;
}

const COLORS = ['#1a1a1a', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSend, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [color, setColor] = useState('#1a1a1a');
  const [brushSize, setBrushSize] = useState(3);
  const [hasContent, setHasContent] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const colorRef = useRef(color);
  const brushRef = useRef(brushSize);

  colorRef.current = color;
  brushRef.current = brushSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    lastPos.current = pos;
    isDrawingRef.current = true;
    setHasContent(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !lastPos.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth = brushRef.current;
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [getPos]);

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    lastPos.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasContent(false);
  };

  const handleSend = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    onSend(base64);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 anim-scale-in"
      style={{ backgroundColor: 'rgba(235, 225, 205, 0.95)', pointerEvents: 'auto' }}>
      <div className="bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-2xl shadow-[0_8px_40px_rgba(139,90,43,0.2)] border border-[#E8D5B7] w-full max-w-3xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 flex justify-between items-center border-b border-[#E8D5B7]">
          <h3 className="font-brand font-bold text-[#5D3A1A] text-lg">Draw & Send</h3>
          <div className="flex items-center gap-2">
            <button onClick={clearCanvas}
              className="text-[#A08060] hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all" title="Clear">
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="text-[#A08060] hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-[#E8D5B7] flex items-center gap-4">
          <div className="flex gap-1.5">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-all border-2 ${color === c ? 'border-amber-500 scale-110 shadow-md' : 'border-[#E8D5B7] hover:scale-105'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="h-6 w-px bg-[#E8D5B7]" />
          <div className="flex items-center gap-2">
            <button onClick={() => setBrushSize(s => Math.max(1, s - 1))}
              className="text-[#8B6E4E] hover:text-[#5D3A1A] p-1 rounded-lg hover:bg-[#FFF0DC] transition-all">
              <Minus size={14} />
            </button>
            <div className="flex items-center justify-center w-8">
              <div className="rounded-full bg-[#5D3A1A]" style={{ width: Math.min(brushSize * 2, 20), height: Math.min(brushSize * 2, 20) }} />
            </div>
            <button onClick={() => setBrushSize(s => Math.min(20, s + 1))}
              className="text-[#8B6E4E] hover:text-[#5D3A1A] p-1 rounded-lg hover:bg-[#FFF0DC] transition-all">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="p-4 flex-1">
          <canvas ref={canvasRef}
            className="w-full rounded-xl border border-[#E8D5B7] cursor-crosshair touch-none"
            style={{ height: 380 }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        </div>

        <div className="px-5 py-3 border-t border-[#E8D5B7] flex justify-end">
          <button onClick={handleSend} disabled={!hasContent}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-brand font-bold transition-all btn-press ${hasContent ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-[0_2px_12px_rgba(245,158,11,0.3)]' : 'bg-[#E8D5B7] text-[#C4A882] cursor-not-allowed'}`}>
            <Send size={16} /> Send Drawing
          </button>
        </div>
      </div>
    </div>
  );
};
