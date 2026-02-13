import { Archetype } from '../types';

let audioContext: AudioContext | null = null;

const getContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

export const playSpeechBlip = (archetype: Archetype) => {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    
    // Configure sound based on Archetype
    let freq = 400;
    let type: OscillatorType = 'sine';
    let duration = 0.05;

    switch (archetype) {
        case Archetype.EAGER_BIRD:
            freq = 800 + Math.random() * 200; // High pitch
            type = 'triangle';
            duration = 0.03; // Fast
            break;
        case Archetype.SLOW_BEAR:
            freq = 150 + Math.random() * 50; // Low pitch
            type = 'square';
            duration = 0.08; // Slow
            break;
        case Archetype.SKEPTIC_SNAKE:
            freq = 300 + Math.random() * 50;
            type = 'sawtooth';
            duration = 0.05;
            break;
    }

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    
    // Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
};