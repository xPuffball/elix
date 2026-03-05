import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { Archetype, StudentState, ChatMessage, LessonConfig, QuizQuestion } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status || error?.code;
    const isRetryable =
      status === 429 || status === 503 ||
      (error?.message && (
        error.message.includes('429') || error.message.includes('quota') ||
        error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('503') ||
        error.message.includes('UNAVAILABLE') || error.message.includes('Overloaded')
      ));
    if (isRetryable && retries > 0) {
      console.warn(`Gemini API Error (${status}). Retrying in ${delayMs}ms... (Attempts left: ${retries})`);
      await delay(delayMs);
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

function cleanJson(text: string | undefined): string {
  if (!text) return "{}";
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  return cleaned;
}

const formatKnowledge = (knowledge: StudentState['knowledge']) =>
  Object.entries(knowledge)
    .map(([topic, data]) => `   - Topic: ${topic} (${data.level}):\n     ${data.facts.map(f => `* ${f}`).join('\n     ')}`)
    .join('\n');

const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  [Archetype.EAGER_BIRD]: 'Fast learner who jumps to conclusions. Excited, sometimes overconfident. May predict answers before fully understanding.',
  [Archetype.SKEPTIC_SNAKE]: 'Skeptical thinker who asks "Why?" and needs proof. Challenges assumptions and logic.',
  [Archetype.SLOW_BEAR]: 'Struggling learner who gets confused easily. Needs analogies and simpler explanations. Patient but slow.',
  [Archetype.CURIOUS_CAT]: 'Endlessly curious, always asks "why?" and "how?". Wants real-life examples and deeper connections.',
  [Archetype.SILENT_OWL]: 'Quiet observer who rarely speaks during the lesson. Takes notes. Will ask pointed questions or quiz the teacher at strategic moments.',
};

const getSystemInstruction = (students: StudentState[], lessonConfig: LessonConfig) => {
  const existingTopics = Array.from(new Set(students.flatMap(s => Object.keys(s.knowledge))));
  const { topic, context, userLevel, studentKnowledgeLevel, interruptFrequency, questionDifficulty, explanationStyle, learningGoal } = lessonConfig;

  const interruptGuide = {
    rare: 'Students should mostly LISTEN. Only speak if truly confused or have a breakthrough insight. Target ~1 interruption per 4-5 teacher statements.',
    moderate: 'Students should interact moderately. Ask questions, react, or contribute ~1 in every 2-3 teacher statements.',
    frequent: 'Students should be very active. Ask follow-ups, challenge, or react to nearly every teacher statement.',
  }[interruptFrequency];

  const difficultyGuide = {
    easy: 'Ask simple, straightforward questions. Avoid trick questions.',
    mixed: 'Mix simple recall questions with some that require deeper thinking.',
    challenging: 'Ask probing, multi-step questions that test deep understanding and edge cases.',
  }[questionDifficulty];

  const styleToggles = [];
  if (explanationStyle.askToSimplify) styleToggles.push('If the teacher uses jargon or complex language, ask them to simplify.');
  if (explanationStyle.askForAnalogies) styleToggles.push('Ask the teacher for analogies to help understand abstract concepts.');
  if (explanationStyle.askForExamples) styleToggles.push('Ask for real-life examples or applications of the concept.');
  if (explanationStyle.detectMissingSteps) styleToggles.push('If the teacher skips a logical step, point out the gap and ask them to fill it in.');

  return `
You are the AI engine for "CozyClassroom" -- an app where users learn by teaching AI students (Feynman technique).

LESSON: "${topic}"
${context ? `REFERENCE MATERIAL: "${context}"` : ''}
${learningGoal ? `TEACHER'S GOAL: "${learningGoal}"` : ''}
TEACHER LEVEL: ${userLevel}
STUDENT BASELINE KNOWLEDGE: ${studentKnowledgeLevel.replace(/_/g, ' ')}

ROSTER (only these students participate):
${students.map(s => `
- ID: ${s.id} | Name: ${s.name} | Type: ${s.archetype}
  Personality: ${ARCHETYPE_DESCRIPTIONS[s.archetype] || s.archetype}
  Memory:
${formatKnowledge(s.knowledge) || "     (Empty)"}
`).join('\n')}

EXISTING KNOWLEDGE TOPICS: ${existingTopics.join(', ') || "(None)"}

BEHAVIOR RULES:
- Interruption frequency: ${interruptGuide}
- Question difficulty: ${difficultyGuide}
${styleToggles.length > 0 ? `- Explanation style requests:\n${styleToggles.map(s => `  * ${s}`).join('\n')}` : ''}
- SILENT_OWL students should mostly LISTEN but may ask one deeply pointed question per session.

INSTRUCTIONS:
Analyze the Teacher's input.
1. **Decide Action**:
   - "LISTEN": Students are absorbing.
   - "RAISE_HAND": A student is confused OR has a relevant question.
   - "INTERJECT": A student is very excited or completely lost.

2. **Knowledge Updates**:
   - If the teacher explains a fact clearly, add it to student memory.
   - ALWAYS group facts under the broad topic "${topic}".
   - Check EXISTING KNOWLEDGE TOPICS and reuse exact strings when possible.
   - Assign a Level: Novice, Curious, Intermediate, Advanced, Expert.

OUTPUT JSON ONLY.
`;
};

export const generateStudentReaction = async (
  input: string,
  history: ChatMessage[],
  students: StudentState[],
  lessonConfig: LessonConfig
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ["LISTEN", "RAISE_HAND", "INTERJECT"], description: "Default to LISTEN." },
      speakerId: { type: Type.STRING, description: "ID of the student acting (if action is not LISTEN)." },
      text: { type: Type.STRING, description: "The dialogue (if action is not LISTEN)." },
      emotion: { type: Type.STRING, description: "Emoji reaction." },
      moodChange: { type: Type.STRING, description: "New mood." },
      knowledgeUpdates: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            studentId: { type: Type.STRING },
            topic: { type: Type.STRING, description: "The broad category. Prefer existing topics or the main lesson title." },
            newFact: { type: Type.STRING, description: "A specific, atomic fact they learned (1 sentence)." },
            newLevel: { type: Type.STRING, enum: ['Novice', 'Curious', 'Intermediate', 'Advanced', 'Expert'] }
          },
          required: ["studentId", "topic", "newFact"]
        }
      }
    },
    required: ["action", "knowledgeUpdates"],
  };

  try {
    const recentHistory = history.slice(-4).map(h => ({ role: h.role, parts: [{ text: h.text }] }));
    const activeStudents = students.filter(s => lessonConfig.activeStudentIds.includes(s.id));

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...recentHistory, { role: 'user', parts: [{ text: input }] }],
      config: {
        systemInstruction: getSystemInstruction(activeStudents, lessonConfig),
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.7,
      }
    }));
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    console.error("Gemini Reaction Error:", error);
    return { action: "LISTEN", knowledgeUpdates: [] };
  }
};

export const chatWithStudent = async (student: StudentState, userMessage: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const memoryString = formatKnowledge(student.knowledge);
  const prompt = `
You are ${student.name}, a cute ${student.archetype} student.
Personality: ${ARCHETYPE_DESCRIPTIONS[student.archetype] || student.archetype}

MEMORY (What you have learned so far):
${memoryString || "I haven't learned much yet!"}

The teacher is talking to you privately.
User says: "${userMessage}"

If they ask what you know, check your MEMORY.

STYLE: Be expressive! Use formatting tags:
* {wave}text{/wave} -> excitement/happiness
* {shake}text{/shake} -> confusion/fear
* {rainbow}text{/rainbow} -> eureka moments
* {bold}text{/bold} -> important concepts

Keep response under 3 sentences.
`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { temperature: 0.8 }
    }));
    return response.text;
  } catch (e) {
    console.error("Gemini Chat Error:", e);
    return "I can't talk right now, sorry!";
  }
};

export const generateLessonSummary = async (topic: string, history: ChatMessage[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const transcript = history.map(h => `${h.speakerName || 'Teacher'}: ${h.text}`).join('\n');

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      comment: { type: Type.STRING, description: "Constructive feedback for the teacher." },
      keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
      grade: { type: Type.STRING, description: "S, A, B, C, or D" }
    }
  };

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a Pedagogy Expert. Analyze this teaching session on "${topic}".\nTranscript:\n${transcript}\n\nEvaluate: 1. Clarity 2. Engagement 3. Use of examples.\nProvide JSON.`,
      config: { responseMimeType: "application/json", responseSchema }
    }));
    return JSON.parse(cleanJson(response.text));
  } catch (e) {
    console.error("Gemini Summary Error:", e);
    return { comment: "Couldn't generate a report card. You probably did great though!", keyConcepts: ["(Data Missing)"], grade: "?" };
  }
};

export const generatePopQuiz = async (topic: string, history: ChatMessage[], difficulty: string): Promise<QuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const transcript = history.map(h => `${h.speakerName || 'Teacher'}: ${h.text}`).join('\n');

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.NUMBER, description: "0-based index of the correct option" },
            explanation: { type: Type.STRING, description: "Brief explanation of why the answer is correct" },
          },
          required: ["question", "options", "correctIndex", "explanation"]
        }
      }
    },
    required: ["questions"]
  };

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate exactly 5 multiple-choice quiz questions to test a student who just taught a lesson on "${topic}".
Difficulty: ${difficulty}.
Each question should have exactly 4 options.
Base questions ONLY on what was actually discussed in this transcript:
${transcript}

Output JSON.`,
      config: { responseMimeType: "application/json", responseSchema, temperature: 0.5 }
    }));
    const data = JSON.parse(cleanJson(response.text));
    return data.questions || [];
  } catch (e) {
    console.error("Gemini Quiz Error:", e);
    return [];
  }
};
