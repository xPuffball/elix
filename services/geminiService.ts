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
  [Archetype.SLOW_BEAR]: 'Struggling learner who gets confused easily. Needs analogies and simpler explanations. Patient but slow.',
  [Archetype.CURIOUS_CAT]: 'Endlessly curious, always asks "why?" and "how?". Wants real-life examples and deeper connections.',
  [Archetype.SILENT_OWL]: 'Quiet, chill koala who observes carefully and rarely speaks. Takes mental notes. When they do speak, it is a deeply thoughtful or pointed question that tests the teacher.',
};

const getSystemInstruction = (students: StudentState[], lessonConfig: LessonConfig) => {
  const existingTopics = Array.from(new Set(students.flatMap(s => Object.keys(s.knowledge))));
  const { topic, context, attachments, userLevel, studentKnowledgeLevel, interruptFrequency, questionDifficulty, explanationStyle, learningGoal } = lessonConfig;

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

  const textAttachments = (attachments || [])
    .filter(a => a.type === 'text')
    .map(a => `--- Attached: ${a.name} ---\n${a.data}\n--- End ---`)
    .join('\n\n');

  const hasImageAttachments = (attachments || []).some(a => a.type === 'image');

  return `
You are the AI engine for "elix" -- an app where users learn by teaching AI students (Feynman technique).

LESSON: "${topic}"
${context ? `TEACHER'S NOTES: "${context}"` : ''}
${textAttachments ? `\nATTACHED REFERENCE MATERIALS:\n${textAttachments}` : ''}
${hasImageAttachments ? '\nThe teacher has also attached reference images. Use them as additional context for the lesson.' : ''}
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
- SILENT_OWL (koala) students should mostly LISTEN but may ask one deeply pointed question per session. When they speak, make it count.

CRITICAL DIALOGUE QUALITY RULES:
- Students must ask questions DIRECTLY about the specific content the teacher is explaining. Reference concrete details from the teacher's explanation.
- NEVER use bizarre or contrived analogies. If a student asks for an analogy, ask for one naturally (e.g. "Can you give an example?" not "Is it like a dancing unicorn?").
- Each student's voice must match their personality:
  * EAGER_BIRD: Enthusiastic but sometimes jumps ahead. Might say "Oh! So does that mean [specific inference]?" — always tied to the actual content.
  * SLOW_BEAR: Genuinely confused about specific parts. Might say "Wait, I'm lost — you said [X], but how does that connect to [Y]?" — references real content.
  * CURIOUS_CAT: Asks practical follow-ups. "Why does that happen?" or "Where would we actually see this?" — grounded and relevant.
  * SILENT_OWL: Rare but incisive. Might ask "But what about [edge case]?" or "How does this hold up when [specific condition]?" — tests the teacher's understanding.
- NEVER generate questions like "Is it like a river flowing uphill?" or "So it's basically magic?" — these are not helpful.
- Questions should be the kind a real student in a classroom would ask about THIS specific topic.
- Keep dialogue concise (1-2 sentences max). Sound natural, not scripted.

INSTRUCTIONS:
Analyze the Teacher's input. If the teacher provides an image, reference what you see in the image.
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

export interface StreamCallbacks {
  onThinking?: (studentName?: string) => void;
  onComplete?: (result: any) => void;
}

export const generateStudentReaction = async (
  input: string,
  history: ChatMessage[],
  students: StudentState[],
  lessonConfig: LessonConfig,
  imageData?: string,
  imageMime?: string,
  callbacks?: StreamCallbacks,
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
    const activeStudents = students.filter(s => lessonConfig.activeStudentIds.includes(s.id));
    callbacks?.onThinking?.();

    const recentHistory = history.slice(-6).map(h => {
      const parts: any[] = [{ text: h.text }];
      if (h.imageData && h.imageMime) {
        parts.push({ inlineData: { mimeType: h.imageMime, data: h.imageData } });
      }
      return { role: h.role, parts };
    });

    const userParts: any[] = [{ text: input }];
    if (imageData && imageMime) {
      userParts.push({ inlineData: { mimeType: imageMime, data: imageData } });
    }

    const imageAttachmentParts = (lessonConfig.attachments || [])
      .filter(a => a.type === 'image')
      .map(a => ({ inlineData: { mimeType: a.mimeType, data: a.data } }));

    const systemInstruction = getSystemInstruction(activeStudents, lessonConfig);

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...(imageAttachmentParts.length > 0
          ? [{ role: 'user' as const, parts: [{ text: 'Reference images for this lesson:' }, ...imageAttachmentParts] },
             { role: 'model' as const, parts: [{ text: 'I see the reference images. I will use them as context.' }] }]
          : []),
        ...recentHistory,
        { role: 'user' as const, parts: userParts },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.65,
      }
    }));

    const result = JSON.parse(cleanJson(response.text));
    callbacks?.onComplete?.(result);
    return result;
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
      model: "gemini-2.5-flash",
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
      model: "gemini-2.5-flash",
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
      model: "gemini-2.5-flash",
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
