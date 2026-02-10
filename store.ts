import { create } from 'zustand';
import { Archetype, GameMode, InteractionTarget, LessonConfig, StudentState, ChatMessage } from './types';

interface GameState {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  
  students: StudentState[];
  updateStudent: (id: string, updates: Partial<StudentState>) => void;
  
  playerPos: [number, number, number];
  setPlayerPos: (pos: [number, number, number]) => void;

  interactionTarget: InteractionTarget | null;
  setInteractionTarget: (target: InteractionTarget | null) => void;

  activeLesson: LessonConfig | null;
  setActiveLesson: (config: LessonConfig | null) => void;

  chatHistory: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  mode: GameMode.FREE_ROAM,
  setMode: (mode) => set({ mode }),

  students: [
    { 
      id: 'pip', 
      name: 'Pip', 
      archetype: Archetype.EAGER_BIRD, 
      color: '#FFD54F', 
      position: [-2, 0, -2], 
      rotation: [0, Math.PI / 4, 0],
      knowledgeLevel: 10,
      mood: 'happy',
      learnedConcepts: []
    },
    { 
      id: 'barnaby', 
      name: 'Barnaby', 
      archetype: Archetype.SLOW_BEAR, 
      color: '#8D6E63', 
      position: [2, 0, -2],
      rotation: [0, -Math.PI / 4, 0],
      knowledgeLevel: 5,
      mood: 'neutral',
      learnedConcepts: []
    },
    { 
      id: 'sasha', 
      name: 'Sasha', 
      archetype: Archetype.SKEPTIC_SNAKE, 
      color: '#81C784', 
      position: [0, 0, -4],
      rotation: [0, 0, 0],
      knowledgeLevel: 15,
      mood: 'neutral',
      learnedConcepts: []
    },
  ],
  updateStudent: (id, updates) => set((state) => ({
    students: state.students.map((s) => s.id === id ? { ...s, ...updates } : s)
  })),

  playerPos: [0, 0, 4],
  setPlayerPos: (pos) => set({ playerPos: pos }),

  interactionTarget: null,
  setInteractionTarget: (target) => set({ interactionTarget: target }),

  activeLesson: null,
  setActiveLesson: (config) => set({ activeLesson: config }),

  chatHistory: [],
  addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [] }),
}));