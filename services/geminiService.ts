import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Archetype, StudentState, ChatMessage } from "../types";

const getSystemInstruction = (students: StudentState[], topic: string, context: string) => `
You are simulating a classroom of cute animal students. The user is the teacher.
Topic: ${topic}
Context Material: ${context}

Students:
${students.map(s => `- ${s.name} (${s.archetype}): Knowledge Level ${s.knowledgeLevel}/100. Mood: ${s.mood}`).join('\n')}

Archetype Behaviors:
- EAGER_BIRD (Pip): Chirpy, guesses answers before you finish, enthusiastic.
- SKEPTIC_SNAKE (Sasha): Hisses slightly, asks for evidence, doubts simplifications.
- SLOW_BEAR (Barnaby): Slow talker, asks for "honey-sweet" analogies, easily confused by jargon.

Goal:
React to the teacher's voice input.
1. Choose ONE student to respond OR provide a general class reaction.
2. If the teacher explains well, increase the student's knowledge.
3. If the teacher is unclear, the student should express confusion.
4. Students should ask questions to "active recall" the teacher.

Output JSON format ONLY.
`;

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
      speakerId: { type: Type.STRING, description: "ID of the student speaking, or 'system' for general class narration." },
      text: { type: Type.STRING, description: "The dialogue or action description." },
      moodChange: { type: Type.STRING, description: "New mood for the speaker: happy, confused, neutral, sleeping" },
      knowledgeDelta: { type: Type.INTEGER, description: "Change in knowledge (e.g. +5, -2, 0)" },
      isQuestion: { type: Type.BOOLEAN, description: "Is the student asking a clarifying question?" },
      reactionEmoji: { type: Type.STRING, description: "A single emoji representing the reaction (e.g. 💡, ❓, 😴, ❤️)" }
    },
    required: ["speakerId", "text", "moodChange", "knowledgeDelta", "isQuestion", "reactionEmoji"],
  };

  try {
    const chatHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...chatHistory,
        { role: 'user', parts: [{ text: input }] }
      ],
      config: {
        systemInstruction: getSystemInstruction(students, topic, context),
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      speakerId: 'system',
      text: "The class murmurs thoughtfully...",
      moodChange: 'neutral',
      knowledgeDelta: 0,
      isQuestion: false,
      reactionEmoji: "🤔"
    };
  }
};

export const chatWithStudent = async (student: StudentState, userMessage: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
    You are ${student.name}, a cute ${student.archetype.toLowerCase().replace('_', ' ')} student.
    Your personality:
    - EAGER_BIRD: Chirpy, fast, enthusiastic.
    - SKEPTIC_SNAKE: Suspicious, scientific, hisses on 's' sounds.
    - SLOW_BEAR: Slow, sweet, loves honey analogies.

    The teacher (user) has approached your desk to talk 1-on-1.
    Current Knowledge Level: ${student.knowledgeLevel}/100.
    Learned Concepts: ${student.learnedConcepts.join(', ')}.

    User says: "${userMessage}"
    
    Respond in character (max 2 sentences). Be cute!
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        return response.text;
    } catch (e) {
        return "...";
    }
};

export const generateLessonSummary = async (topic: string, history: ChatMessage[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Convert history to string block
    const transcript = history.map(h => `${h.speakerName || 'Teacher'}: ${h.text}`).join('\n');

    const prompt = `
    Analyze this teaching session on "${topic}".
    Transcript:
    ${transcript}

    Provide a JSON summary with:
    1. A short encouraging comment (2 sentences).
    2. A list of 3 key concepts covered.
    3. A "Teacher Grade" (S, A, B, C).
    `;

    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            comment: { type: Type.STRING },
            keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
            grade: { type: Type.STRING }
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return { comment: "Great effort!", keyConcepts: ["Teaching"], grade: "B" };
    }
};