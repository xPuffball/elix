import React, { useRef, useState, useCallback, useEffect } from 'react';

export interface JoystickInput {
  x: number;
  z: number;
  active: boolean;
}

const joystickState: JoystickInput = { x: 0, z: 0, active: false };
export const getJoystickState = () => joystickState;

export const VirtualJoystick: React.FC = () => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const RADIUS = 44;

  const handleStart = useCallback((clientX: number, clientY: number, id?: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    if (id !== undefined) touchIdRef.current = id;
    setActive(true);
    handleMove(clientX, clientY);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, RADIUS);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clamped;
    const ny = Math.sin(angle) * clamped;
    setKnobPos({ x: nx, y: ny });
    const norm = clamped / RADIUS;
    joystickState.x = (nx / RADIUS) * norm;
    joystickState.z = (ny / RADIUS) * norm;
    joystickState.active = norm > 0.1;
  }, []);

  const handleEnd = useCallback(() => {
    setKnobPos({ x: 0, y: 0 });
    setActive(false);
    touchIdRef.current = null;
    joystickState.x = 0;
    joystickState.z = 0;
    joystickState.active = false;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    handleStart(t.clientX, t.clientY, t.identifier);
  }, [handleStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        return;
      }
    }
  }, [handleMove]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        handleEnd();
        return;
      }
    }
  }, [handleEnd]);

  return (
    <div
      ref={baseRef}
      className="touch-none select-none"
      style={{ width: 120, height: 120, position: 'relative' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={handleEnd}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: 120, height: 120,
          left: 0, top: 0,
          background: 'radial-gradient(circle, rgba(139,90,43,0.12) 0%, rgba(139,90,43,0.06) 100%)',
          border: '2px solid rgba(139,90,43,0.15)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 48, height: 48,
          left: 60 - 24 + knobPos.x,
          top: 60 - 24 + knobPos.y,
          background: active
            ? 'linear-gradient(135deg, #f59e0b, #ea580c)'
            : 'linear-gradient(135deg, rgba(245,158,11,0.6), rgba(234,88,12,0.4))',
          boxShadow: active
            ? '0 4px 16px rgba(245,158,11,0.4)'
            : '0 2px 8px rgba(139,90,43,0.15)',
          transition: active ? 'none' : 'all 0.2s ease-out',
        }}
      />
    </div>
  );
};
