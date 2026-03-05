import { create } from 'zustand';
import { Archetype, GameMode, InteractionTarget, LessonConfig, StudentState, ChatMessage, KnowledgeLevel, FurnitureType, PlacedFurniture, CustomizeState } from './types';
import { FURNITURE_CATALOG, DEFAULT_FURNITURE, canPlace } from './furnitureCatalog';

interface GameState {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  
  students: StudentState[];
  updateStudent: (id: string, updates: Partial<StudentState>) => void;
  addStudentKnowledge: (id: string, topic: string, fact: string, newLevel?: KnowledgeLevel) => void;
  
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

  // Furniture placement
  placedFurniture: PlacedFurniture[];
  inventory: FurnitureType[];
  customizeState: CustomizeState;
  placingType: FurnitureType | null;
  selectedItemId: string | null;
  ghostRotation: 0 | 1 | 2 | 3;
  hoveredCell: [number, number] | null;

  setHoveredCell: (cell: [number, number] | null) => void;
  startPlacing: (type: FurnitureType) => void;
  cancelPlacing: () => void;
  confirmPlacement: (gridX: number, gridZ: number) => void;
  selectItem: (id: string) => void;
  deselectItem: () => void;
  removeFurniture: (id: string) => void;
  rotateGhost: () => void;
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
      position: [-3, 0, -1],
      rotation: [0, 0, 0],
      mood: 'happy',
      knowledge: {}
    },
    { 
      id: 'barnaby', 
      name: 'Barnaby', 
      archetype: Archetype.SLOW_BEAR, 
      color: '#8D6E63', 
      position: [3, 0, -1],
      rotation: [0, 0, 0],
      mood: 'neutral',
      knowledge: {}
    },
    { 
      id: 'sasha', 
      name: 'Sasha', 
      archetype: Archetype.SKEPTIC_SNAKE, 
      color: '#81C784', 
      position: [0, 0, -1],
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
      let targetKey = topic;
      const existingKey = Object.keys(s.knowledge).find(k => k.toLowerCase() === topic.toLowerCase());
      if (existingKey) targetKey = existingKey;
      const currentTopic = s.knowledge[targetKey] || { level: 'Novice', facts: [] };
      const updatedFacts = currentTopic.facts.includes(fact) 
        ? currentTopic.facts 
        : [...currentTopic.facts, fact];
      return {
        ...s,
        knowledge: {
          ...s.knowledge,
          [targetKey]: { level: newLevel || currentTopic.level, facts: updatedFacts }
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
    return {
        chatHistory: [...state.chatHistory, { role: 'model' as const, text: student.pendingResponse, speakerName: student.name }],
        students: state.students.map(s => 
            s.id === studentId ? { ...s, handRaised: false, pendingResponse: undefined, currentDialogue: student.pendingResponse, lastInteractionTime: Date.now() } : s
        )
    };
  }),

  studentInterject: (studentId, response) => set((state) => ({
    chatHistory: [...state.chatHistory, { role: 'model', text: response, speakerName: state.students.find(s => s.id === studentId)?.name }],
    students: state.students.map(s => 
        s.id === studentId ? { ...s, currentDialogue: response, lastInteractionTime: Date.now(), handRaised: false, pendingResponse: undefined } : s
    )
  })),

  clearStudentDialogue: (studentId) => set((state) => ({
    students: state.students.map(s => s.id === studentId ? { ...s, currentDialogue: undefined } : s)
  })),

  playerPos: [0, 0, 2],
  setPlayerPos: (pos) => set({ playerPos: pos }),

  interactionTarget: null,
  setInteractionTarget: (target) => set({ interactionTarget: target }),

  activeLesson: null,
  setActiveLesson: (config) => set({ activeLesson: config }),

  chatHistory: [],
  addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [] }),

  // Furniture placement state
  placedFurniture: [...DEFAULT_FURNITURE],
  inventory: [FurnitureType.POTTED_PLANT, FurnitureType.BOOKSHELF, FurnitureType.STUDENT_DESK, FurnitureType.AREA_RUG],
  customizeState: 'browsing',
  placingType: null,
  selectedItemId: null,
  ghostRotation: 0,
  hoveredCell: null,

  setHoveredCell: (cell) => set({ hoveredCell: cell }),

  startPlacing: (type) => set({
    customizeState: 'placing',
    placingType: type,
    selectedItemId: null,
    ghostRotation: 0,
  }),

  cancelPlacing: () => set({
    customizeState: 'browsing',
    placingType: null,
    selectedItemId: null,
    ghostRotation: 0,
  }),

  confirmPlacement: (gridX, gridZ) => {
    const state = get();

    if (state.placingType) {
      const catalog = FURNITURE_CATALOG[state.placingType];
      if (!canPlace(gridX, gridZ, catalog.size, state.ghostRotation, state.placedFurniture)) return;

      const newItem: PlacedFurniture = {
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: state.placingType,
        gridX,
        gridZ,
        rotation: state.ghostRotation,
      };

      const idx = state.inventory.indexOf(state.placingType);
      const newInventory = [...state.inventory];
      if (idx >= 0) newInventory.splice(idx, 1);

      set({
        placedFurniture: [...state.placedFurniture, newItem],
        inventory: newInventory,
        placingType: null,
        customizeState: 'browsing',
        ghostRotation: 0,
      });
    } else if (state.selectedItemId) {
      const item = state.placedFurniture.find(f => f.id === state.selectedItemId);
      if (!item) return;
      const catalog = FURNITURE_CATALOG[item.type];
      if (!canPlace(gridX, gridZ, catalog.size, state.ghostRotation, state.placedFurniture, item.id)) return;

      set({
        placedFurniture: state.placedFurniture.map(f =>
          f.id === state.selectedItemId ? { ...f, gridX, gridZ, rotation: state.ghostRotation } : f
        ),
        selectedItemId: null,
        customizeState: 'browsing',
        ghostRotation: 0,
      });
    }
  },

  selectItem: (id) => {
    const state = get();
    const item = state.placedFurniture.find(f => f.id === id);
    if (!item) return;
    const catalog = FURNITURE_CATALOG[item.type];
    if (catalog.fixed) return;
    set({
      customizeState: 'selected',
      selectedItemId: id,
      placingType: null,
      ghostRotation: item.rotation,
    });
  },

  deselectItem: () => set({
    customizeState: 'browsing',
    selectedItemId: null,
    ghostRotation: 0,
  }),

  removeFurniture: (id) => {
    const state = get();
    const item = state.placedFurniture.find(f => f.id === id);
    if (!item) return;
    const catalog = FURNITURE_CATALOG[item.type];
    if (catalog.fixed) return;
    set({
      placedFurniture: state.placedFurniture.filter(f => f.id !== id),
      inventory: [...state.inventory, item.type],
      selectedItemId: null,
      customizeState: 'browsing',
    });
  },

  rotateGhost: () => set((state) => ({
    ghostRotation: ((state.ghostRotation + 1) % 4) as 0 | 1 | 2 | 3,
  })),
}));
