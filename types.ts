export enum GameMode {
  MAIN_MENU = 'MAIN_MENU',
  FREE_ROAM = 'FREE_ROAM',
  DIALOGUE = 'DIALOGUE',
  LESSON_SETUP = 'LESSON_SETUP',
  TEACHING = 'TEACHING',
  DEBRIEF = 'DEBRIEF',
  POP_QUIZ = 'POP_QUIZ',
  CUSTOMIZE = 'CUSTOMIZE',
  SHOP = 'SHOP',
  SETTINGS = 'SETTINGS',
}

export enum Archetype {
  EAGER_BIRD = 'EAGER_BIRD',
  SKEPTIC_SNAKE = 'SKEPTIC_SNAKE',
  SLOW_BEAR = 'SLOW_BEAR',
  CURIOUS_CAT = 'CURIOUS_CAT',
  SILENT_OWL = 'SILENT_OWL',
}

export type KnowledgeLevel = 'Novice' | 'Curious' | 'Intermediate' | 'Advanced' | 'Expert';

export interface KnowledgeTopic {
  level: KnowledgeLevel;
  facts: string[];
}

export interface StudentState {
  id: string;
  name: string;
  archetype: Archetype;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  mood: 'happy' | 'confused' | 'sleeping' | 'neutral' | 'thinking';
  knowledge: Record<string, KnowledgeTopic>;
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
  imageData?: string;
  imageMime?: string;
}

export interface LessonAttachment {
  name: string;
  type: 'image' | 'text';
  mimeType: string;
  data: string;
}

export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'exam_review';
export type StudentKnowledgeLevel = 'knows_nothing' | 'basic_prerequisites' | 'same_level' | 'studied_once';
export type InterruptFrequency = 'rare' | 'moderate' | 'frequent';
export type QuestionDifficulty = 'easy' | 'mixed' | 'challenging';
export type SessionGoal = 'understand' | 'exam_prep' | 'practice_teaching' | 'fix_weak_areas';

export interface ExplanationStyle {
  askToSimplify: boolean;
  askForAnalogies: boolean;
  askForExamples: boolean;
  detectMissingSteps: boolean;
}

export interface LessonConfig {
  title: string;
  topic: string;
  context: string;
  attachments?: LessonAttachment[];
  learningGoal?: string;
  userLevel: UserLevel;
  activeStudentIds: string[];
  studentKnowledgeLevel: StudentKnowledgeLevel;
  interruptFrequency: InterruptFrequency;
  questionDifficulty: QuestionDifficulty;
  explanationStyle: ExplanationStyle;
  sessionGoal: SessionGoal;
  sessionLengthMin: number;
  enablePopQuiz: boolean;
  rememberProgress: boolean;
  rewardsMode: boolean;
}

export interface InteractionTarget {
  type: 'student' | 'podium' | 'desk' | 'door' | 'blackboard' | 'bookshelf';
  id?: string;
  label: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SessionRecord {
  id: string;
  date: string;
  topic: string;
  grade: string;
  durationMin: number;
  coinsEarned: number;
  quizScore?: number;
}

export interface UserStats {
  coins: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string | null;
  totalSessions: number;
  sessionHistory: SessionRecord[];
}

export enum FurnitureType {
  PODIUM = 'podium',
  TEACHER_DESK = 'teacher_desk',
  STUDENT_DESK = 'student_desk',
  BLACKBOARD = 'blackboard',
  BOOKSHELF = 'bookshelf',
  POTTED_PLANT = 'potted_plant',
  AREA_RUG = 'area_rug',
  WALL_CLOCK = 'wall_clock',
  DOOR = 'door',
}

export type CustomizeState = 'browsing' | 'placing' | 'selected';

export interface PlacedFurniture {
  id: string;
  type: FurnitureType;
  gridX: number;
  gridZ: number;
  rotation: 0 | 1 | 2 | 3;
}

export interface AppSettings {
  apiKey: string;
  inputMode: 'voice' | 'text';
  voiceLanguage: string;
  showGridInFreeRoam: boolean;
}

export interface WallpaperTheme {
  id: string;
  name: string;
  wallColor: string;
  trimColor: string;
  price: number;
}

export interface FloorTheme {
  id: string;
  name: string;
  floorColor: string;
  plankColor: string;
  price: number;
}

export interface ShopItem {
  type: 'furniture' | 'wallpaper' | 'floor';
  furnitureType?: FurnitureType;
  wallpaperId?: string;
  floorId?: string;
  name: string;
  price: number;
  description: string;
}
