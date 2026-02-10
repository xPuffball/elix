import { create } from 'zustand';
import { Archetype, GameMode, InteractionTarget, LessonConfig, StudentState, ChatMessage, KnowledgeLevel } from './types';

interface GameState {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  
  students: StudentState[];
  updateStudent: (id: string, updates: Partial<StudentState>) => void;
  
  // Updated Action for Knowledge
  addStudentKnowledge: (id: string, topic: string, fact: string, newLevel?: KnowledgeLevel) => void;
  
  // Classroom Dynamics
  raiseHand: (studentId: string, response: string) => void;
  callOnStudent: (studentId: string) => void;
  studentInterject: (studentId: string, response: string) => void;
  clearStudentDialogue: (studentId: string) => void;
  
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

export const useGameStore = create<GameState>((set, get) => ({
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
      mood: 'happy',
      knowledge: {}
    },
    { 
      id: 'barnaby', 
      name: 'Barnaby', 
      archetype: Archetype.SLOW_BEAR, 
      color: '#8D6E63', 
      position: [2, 0, -2],
      rotation: [0, -Math.PI / 4, 0],
      mood: 'neutral',
      knowledge: {}
    },
    { 
      id: 'sasha', 
      name: 'Sasha', 
      archetype: Archetype.SKEPTIC_SNAKE, 
      color: '#81C784', 
      position: [0, 0, -4],
      rotation: [0, 0, 0],
      mood: 'neutral',
      knowledge: {}
    },
  ],
  
  updateStudent: (id, updates) => set((state) => ({
    students: state.students.map((s) => s.id === id ? { ...s, ...updates } : s)
  })),

  addStudentKnowledge: (id, topic, fact, newLevel) => set((state) => ({
    students: state.students.map((s) => {
      if (s.id !== id) return s;
      
      // Case-insensitive match to find existing topic key
      let targetKey = topic;
      const existingKey = Object.keys(s.knowledge).find(k => k.toLowerCase() === topic.toLowerCase());
      if (existingKey) {
        targetKey = existingKey;
      }
      
      const currentTopic = s.knowledge[targetKey] || { level: 'Novice', facts: [] };
      
      // Avoid duplicate facts
      const updatedFacts = currentTopic.facts.includes(fact) 
        ? currentTopic.facts 
        : [...currentTopic.facts, fact];

      return {
        ...s,
        knowledge: {
          ...s.knowledge,
          [targetKey]: {
            level: newLevel || currentTopic.level,
            facts: updatedFacts
          }
        }
      };
    })
  })),

  raiseHand: (studentId, response) => set((state) => ({
    students: state.students.map(s => 
      s.id === studentId ? { ...s, handRaised: true, pendingResponse: response } : s
    )
  })),

  callOnStudent: (studentId) => set((state) => {
    const student = state.students.find(s => s.id === studentId);
    if (!student || !student.pendingResponse) return state;

    const newHistory = [...state.chatHistory, {
        role: 'model' as const,
        text: student.pendingResponse,
        speakerName: student.name
    }];

    return {
        chatHistory: newHistory,
        students: state.students.map(s => 
            s.id === studentId ? { 
                ...s, 
                handRaised: false, 
                pendingResponse: undefined, 
                currentDialogue: student.pendingResponse,
                lastInteractionTime: Date.now()
            } : s
        )
    };
  }),

  studentInterject: (studentId, response) => set((state) => ({
    chatHistory: [...state.chatHistory, { role: 'model', text: response, speakerName: state.students.find(s => s.id === studentId)?.name }],
    students: state.students.map(s => 
        s.id === studentId ? {
            ...s,
            currentDialogue: response,
            lastInteractionTime: Date.now(),
            handRaised: false,
            pendingResponse: undefined
        } : s
    )
  })),

  clearStudentDialogue: (studentId) => set((state) => ({
    students: state.students.map(s => s.id === studentId ? { ...s, currentDialogue: undefined } : s)
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