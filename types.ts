export enum GameMode {
  FREE_ROAM = 'FREE_ROAM',
  DIALOGUE = 'DIALOGUE',
  LESSON_SETUP = 'LESSON_SETUP',
  TEACHING = 'TEACHING',
  DEBRIEF = 'DEBRIEF'
}

export enum Archetype {
  EAGER_BIRD = 'EAGER_BIRD', // Fast learner, jumps to conclusions
  SKEPTIC_SNAKE = 'SKEPTIC_SNAKE', // Asks "Why?", needs proof
  SLOW_BEAR = 'SLOW_BEAR', // Needs analogies, slow but retains well
}

export interface StudentState {
  id: string;
  name: string;
  archetype: Archetype;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  knowledgeLevel: number; // 0-100
  mood: 'happy' | 'confused' | 'sleeping' | 'neutral';
  learnedConcepts: string[]; // List of concepts they have mastered
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  speakerName?: string; // If model, which student?
  emotion?: string;
}

export interface LessonConfig {
  topic: string;
  context: string; // The "source material" or notes
}

export interface InteractionTarget {
  type: 'student' | 'podium';
  id?: string;
  label: string;
}