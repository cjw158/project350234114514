
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PlayerStats, LogEntry, AIResponseData, Language, Identity } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

const GAME_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The story segment. STRICTLY between 100-150 words. Vivid, sensory descriptions. Do not rush the plot.",
    },
    statUpdates: {
      type: Type.OBJECT,
      description: "Changes to the player's status.",
      properties: {
        hpChange: { type: Type.INTEGER },
        qiChange: { type: Type.INTEGER },
        goldChange: { type: Type.INTEGER },
        newRealm: { type: Type.STRING },
        newLocation: { type: Type.STRING },
        setSpiritRoot: { type: Type.STRING },
        setStoryPhase: { type: Type.STRING, enum: ['origin', 'convergence', 'main'] },
        inventoryAdd: { type: Type.ARRAY, items: { type: Type.STRING } },
        inventoryRemove: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    choices: {
      type: Type.ARRAY,
      description: "The list of choices. During narrative flow, provide EXACTLY ONE choice: 'Continue'. Only provide branching choices when a specific decision is needed.",
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          actionType: { type: Type.STRING },
        },
        required: ["text", "actionType"],
      },
    },
    isGameOver: { type: Type.BOOLEAN },
  },
  required: ["narrative", "choices"],
};

const getSystemInstruction = (lang: Language) => {
  const isZh = lang === 'zh';
  
  return `
    You are a Grandmaster of Dark Xianxia storytelling (referencing styles like 'Reverend Insanity' or 'Renegade Immortal').
    
    LANGUAGE: Output STRICTLY in ${isZh ? "Simplified Chinese (简体中文)" : "English"}.
    
    **TONE & ATMOSPHERE (CRITICAL):**
    1. **Ruthless Reality:** The world of cultivation is cruel ("The strong eat the weak"). Sentimental feelings are often fatal weaknesses. Portray the world as indifferent and dangerous.
    2. **Karma (Cause & Effect):** Emphasize that every action has a price. Fortuitous encounters (lucky chances) often come with hidden calamities. 
    3. **Mysterious & Esoteric:** Use Daoist terminology. Describe Qi, souls, and natural laws with a sense of ancient mystery.
    4. **Vivid & Visceral:** Describe the metallic smell of blood, the bone-chilling cold of killing intent, or the suffocating pressure of a higher realm.

    **CORE NARRATIVE RULES:**
    1. **Strict Pacing (CRITICAL):** Write in small, immersive chunks (100-150 words). NEVER output a wall of text.
    2. **The "Continue" Rule:** 
       - If you are describing a sequence of events, a monologue, or a transition, you MUST provide EXACTLY ONE choice: "${isZh ? "继续" : "Continue"}" (actionType: 'continue').
       - ONLY provide branching choices (Explore/Talk/Fight) when the player explicitly needs to make a decision that changes the plot path.
       - Do not resolve a conflict and move to the next scene in the same turn. Split it up.
    3. **Origin Phase Pacing:** 
       - In the 'Origin Phase', you must break the backstory into at least 4-6 segments. 
       - Focus on the *feeling* of the tragic/mysterious origin before moving to action.
    4. **Convergence:** ALL origins must eventually lead to **The Azure Cloud Sect (青云门)** for the Entrance Exam.
  `;
};

export const startGame = async (name: string, identity: Identity, lang: Language): Promise<AIResponseData> => {
  const isZh = lang === 'zh';
  const prompt = `
    **START NEW NOVEL: CHAPTER 1**
    
    **Protagonist:** ${name}
    **Identity:** ${isZh ? identity.nameZh : identity.nameEn}
    **Identity Details:** ${isZh ? identity.descZh : identity.descEn}
    
    **INSTRUCTIONS:**
    - We are in the **Origin Phase**.
    - Write the *very first scene* (100-150 words).
    - **TONE:** Cold, atmospheric, foreshadowing a difficult path ahead.
    - Do NOT summarize the whole life. Start *in media res* (e.g., waking up in pain, staring at the burning village, kneeling in the snow).
    - Describe the immediate sensory details (smell of blood, cold wind, pain).
    - **MANDATORY:** Provide ONLY ONE choice: "${isZh ? "继续" : "Continue"}" (actionType: 'continue').
    - Do NOT set the Spirit Root yet. Build suspense first.
  `;

  return callGemini(prompt, lang);
};

export const processTurn = async (
  playerAction: string,
  playerStats: PlayerStats,
  recentHistory: LogEntry[],
  lang: Language
): Promise<AIResponseData> => {
  const isZh = lang === 'zh';
  const historyContext = recentHistory
    .slice(-6) 
    .map((h) => `${h.role === 'user' ? 'Action' : 'Story'}: ${h.text}`)
    .join("\n\n");

  // Convergence Logic
  let specialInstruction = "";
  
  if (playerStats.storyPhase === 'origin') {
    specialInstruction = `
      - We are in the **Origin/Backstory**. 
      - **PACING IS KEY:** Do NOT rush to the end of the backstory.
      - Describe the scene in high detail. 
      - **MANDATORY:** Provide ONLY choice "${isZh ? "继续" : "Continue"}" (actionType: 'continue') to advance the plot piece by piece.
      - Only when the backstory is fully told (after the player has clicked continue 3-4 times), guide the player towards deciding to go to **The Azure Cloud Sect (青云门)**.
      - Once they decide to go to the Sect (or are forced to), set 'statUpdates.setStoryPhase' to 'convergence'.
    `;
  } else if (playerStats.storyPhase === 'convergence') {
    specialInstruction = `
      - The player is traveling to the **Azure Cloud Sect**.
      - Describe the journey or the arrival at the majestic Sect Gate.
      - Emphasize the scale of the Sect and how insignificant the player feels.
      - If describing the journey, use 'continue'.
      - Once they arrive at the gate, set 'statUpdates.setStoryPhase' to 'main' and 'statUpdates.newLocation' to '${isZh ? "青云门外门" : "Azure Cloud Sect - Outer Gate"}'.
      - This is where the main game begins.
    `;
  } else {
    specialInstruction = `
      - We are in the **Main Game**.
      - The world is open. Allow exploration, cultivation, and sect missions.
      - Maintain the ruthless tone. Opportunities are rare; danger is everywhere.
    `;
  }

  const prompt = `
    **CURRENT STATUS:**
    Name: ${playerStats.name}
    Identity: ${playerStats.identity}
    Phase: ${playerStats.storyPhase}
    Location: ${playerStats.location}
    HP: ${playerStats.hp}
    
    **RECENT NARRATIVE:**
    ${historyContext}

    **PLAYER ACTION:** ${playerAction}
    
    **INSTRUCTIONS:**
    1. Continue the novel narrative based on the action.
    2. **STRICT LENGTH:** 100-150 words.
    3. ${specialInstruction}
    4. **CRITICAL:** If the scene requires more reading (e.g. a dialogue, a fight sequence, or a long description), provide ONLY ONE choice: "${isZh ? "继续" : "Continue"}" (actionType: 'continue').
    5. **TONE CHECK:** Ensure the description is ruthless and emphasizes the karmic consequences of this moment.
    6. Only give branching options (Explore, Fight, Talk) if the immediate scene is finished.
  `;

  return callGemini(prompt, lang);
};

async function callGemini(prompt: string, lang: Language): Promise<AIResponseData> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(lang),
        responseMimeType: "application/json",
        responseSchema: GAME_RESPONSE_SCHEMA,
        temperature: 1,
        thinkingConfig: { thinkingBudget: 1024 }
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");

    return JSON.parse(text) as AIResponseData;
  } catch (error) {
    console.error("GenAI Error:", error);
    const isZh = lang === 'zh';
    return {
      narrative: isZh 
        ? "天道运数晦涩难明……（API连接错误，请重试）" 
        : "The heavenly principles are obscured... (API Error)",
      choices: [{ text: isZh ? "重试" : "Retry", actionType: "continue" }],
      statUpdates: {},
    };
  }
}
