export enum GameMode {
  FREE_ROAM = 'FREE_ROAM',
  DIALOGUE = 'DIALOGUE',
  LESSON_SETUP = 'LESSON_SETUP',
  TEACHING = 'TEACHING',
  DEBRIEF = 'DEBRIEF'
}

export enum Archetype {
  EAGER_BIRD = 'EAGER_BIRD', // Fast learner, jumps to conclusions. Technique: Prediction.
  SKEPTIC_SNAKE = 'SKEPTIC_SNAKE', // Asks "Why?", needs proof. Technique: First Principles.
  SLOW_BEAR = 'SLOW_BEAR', // Needs analogies. Technique: Simplification/Analogy.
}

export type KnowledgeLevel = 'Novice' | 'Curious' | 'Intermediate' | 'Advanced' | 'Expert';

export interface KnowledgeTopic {
  level: KnowledgeLevel;
  facts: string[]; // Specific snippets of knowledge
}

export interface StudentState {
  id: string;
  name: string;
  archetype: Archetype;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  mood: 'happy' | 'confused' | 'sleeping' | 'neutral' | 'thinking';
  
  // New Categorized Knowledge Structure
  knowledge: Record<string, KnowledgeTopic>; // Key = Topic Name (e.g., "Biology")
  
  // Interaction Fields
  handRaised?: boolean; 
  pendingResponse?: string; 
  currentDialogue?: string; 
  lastInteractionTime?: number; 
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  speakerName?: string; 
  emotion?: string;
}

export interface LessonConfig {
  topic: string;
  context: string; 
}

export interface InteractionTarget {
  type: 'student' | 'podium';
  id?: string;
  label: string;
}