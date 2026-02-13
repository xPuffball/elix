import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { Archetype, StudentState, ChatMessage } from "../types";

// Helper for exponential backoff retry logic
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status || error?.code;
    const isRetryable = 
      status === 429 || 
      status === 503 || 
      (error?.message && (
        error.message.includes('429') || 
        error.message.includes('quota') || 
        error.message.includes('RESOURCE_EXHAUSTED') ||
        error.message.includes('503') ||
        error.message.includes('UNAVAILABLE') ||
        error.message.includes('Overloaded')
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
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return cleaned;
}

const formatKnowledge = (knowledge: StudentState['knowledge']) => {
    return Object.entries(knowledge)
        .map(([topic, data]) => `   - Topic: ${topic} (${data.level}):\n     ${data.facts.map(f => `* ${f}`).join('\n     ')}`)
        .join('\n');
};

const getSystemInstruction = (students: StudentState[], lessonTopic: string, context: string) => {
    // Collect all existing topics across all students to encourage re-use
    const existingTopics = Array.from(new Set(students.flatMap(s => Object.keys(s.knowledge))));

    return `
You are the AI engine for "CozyClassroom".
CURRENT LESSON TOPIC: "${lessonTopic}"
Context: "${context}"

Teacher = User. Students = AI Agents.
GOAL: Students learn by listening. They only speak if confused or if they have a "lightbulb moment".

ROSTER:
${students.map(s => `
- ID: ${s.id} | Name: ${s.name} | Type: ${s.archetype}
  - Memory:
${formatKnowledge(s.knowledge) || "     (Empty)"}
`).join('\n')}

EXISTING KNOWLEDGE TOPICS: ${existingTopics.join(', ') || "(None)"}

INSTRUCTIONS:
Analyze the Teacher's input.
1. **Decide Action**:
   - "LISTEN": The teacher is lecturing. Students are absorbing.
   - "RAISE_HAND": A student is confused OR has a relevant question.
   - "INTERJECT": A student is SUPER excited (Eager Bird) or completely lost (Skeptic) and interrupts immediately.

2. **Knowledge Updates**:
   - If the teacher explains a fact clearly, the student should add it to their memory.
   - **CRITICAL - TOPIC GROUPING**:
     - ALWAYS group facts under BROAD, general headers. 
     - **AVOID** granular topics like "${lessonTopic} Basics", "${lessonTopic} Intro", "Probability Events", "Math of Probability".
     - **PREFER** the exact string "${lessonTopic}" for all facts related to the current lesson.
     - Check "EXISTING KNOWLEDGE TOPICS". If a topic fits there, use that exact string.
   - Assign a new "Level" based on how deep their understanding is now (Novice, Curious, Intermediate, Advanced, Expert).

OUTPUT JSON ONLY.
`;
}

export const generateStudentReaction = async (
  input: string,
  history: ChatMessage[],
  students: StudentState[],
  topic: string,
  context: string
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
            newLevel: { type: Type.STRING, enum: ['Novice', 'Curious', 'Intermediate', 'Advanced', 'Expert'], description: "Their new proficiency level in this topic." }
          },
          required: ["studentId", "topic", "newFact"]
        }
      }
    },
    required: ["action", "knowledgeUpdates"],
  };

  try {
    const chatHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    const recentHistory = chatHistory.slice(-4); 

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...recentHistory,
        { role: 'user', parts: [{ text: input }] }
      ],
      config: {
        systemInstruction: getSystemInstruction(students, topic, context),
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7, 
      }
    }));

    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    console.error("Gemini Reaction Error:", error);
    return {
      action: "LISTEN",
      knowledgeUpdates: []
    };
  }
};

export const chatWithStudent = async (student: StudentState, userMessage: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const memoryString = formatKnowledge(student.knowledge);

    const prompt = `
    You are ${student.name}, a cute ${student.archetype} student.
    
    MEMORY (What you have learned so far):
    ${memoryString || "I haven't learned much yet!"}

    The teacher is talking to you privately.
    User says: "${userMessage}"
    
    If they ask what you know, check your MEMORY.
    
    STYLE GUIDELINES:
    - You are a character in a visual novel.
    - Be expressive!
    - **CRITICAL**: You MUST use these formatting tags to show your emotion:
       * {wave}text{/wave} -> For excitement, happiness, or singing.
       * {shake}text{/shake} -> For confusion, fear, or emphasis.
       * {rainbow}text{/rainbow} -> For "Eureka!" moments or when you are proud of an answer.
       * {bold}text{/bold} -> For important concepts.
    
    Example: "I am {wave}so happy{/wave} you asked! I think the answer is {bold}Photosynthesis{/bold}!"
    
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

    const prompt = `
    Act as a Pedagogy Expert. Analyze this teaching session on "${topic}".
    Transcript:
    ${transcript}

    Evaluate the Teacher's performance based on:
    1. Clarity of explanation.
    2. Engagement with student questions.
    3. Use of examples.

    Provide JSON.
    `;

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
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        }));
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        console.error("Gemini Summary Error:", e);
        // Throwing error here to ensure the UI knows it failed, or return a clearer error object
        return { 
            comment: "I couldn't generate a report card due to connection issues. You probably did great though!", 
            keyConcepts: ["(Data Missing)"], 
            grade: "?" 
        };
    }
};