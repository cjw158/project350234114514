
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PlayerStats, LogEntry, AIResponseData, Language, Identity } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

const GAME_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The story segment. MUST be detailed, descriptive, and literary.",
    },
    statUpdates: {
      type: Type.OBJECT,
      description: "Changes to the player's status.",
      properties: {
        hpChange: { type: Type.INTEGER, description: "Change in Health." },
        qiChange: { type: Type.INTEGER, description: "Change in Qi." },
        goldChange: { type: Type.INTEGER, description: "Change in Spirit Stones." },
        newRealm: { type: Type.STRING, description: "New cultivation rank." },
        newLocation: { type: Type.STRING, description: "New location name." },
        setSpiritRoot: { type: Type.STRING, description: "Set the player's spirit root (only if not set)." },
        inventoryAdd: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Items gained." },
        inventoryRemove: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Items lost." },
      },
    },
    choices: {
      type: Type.ARRAY,
      description: "3 to 4 distinct choices driving the plot forward.",
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "The choice text." },
          actionType: { type: Type.STRING, description: "Action category." },
        },
        required: ["text", "actionType"],
      },
    },
    isGameOver: { type: Type.BOOLEAN, description: "True if the player dies." },
  },
  required: ["narrative", "choices"],
};

const getSystemInstruction = (lang: Language) => {
  const isZh = lang === 'zh';
  
  return `
    You are a master novelist of Xianxia (Cultivation) literature, acting as the Game Master.
    
    LANGUAGE: Output STRICTLY in ${isZh ? "Simplified Chinese (简体中文)" : "English"}.
    
    CORE PHILOSOPHY:
    1. **Story First:** This is not just a stat manager. It is a text adventure novel. Focus on plot, atmosphere, and character.
    2. **Cause and Effect (Karma):** Every event must have a reason. Explain the background. Why is the player here? Who are their enemies?
    3. **Detailed World:** The world is "The Great Desolate Nine Provinces" (洪荒九洲). It is cruel, vast, and ancient.
    4. **Show, Don't Tell:** Don't say "You are sad." Describe the rain masking the tears on the face.
    
    WRITING STYLE (${isZh ? "CHINESE" : "ENGLISH"}):
    ${isZh 
      ? "- 风格：正统修仙网文风格。用词苍凉、大气。多用成语。描述要细腻（环境、心理、动作）。\n- 战斗：不要只说“你攻击了”。要描述功法名称、灵气光芒、空气震荡。\n- 剧情：要有起承转合。开局必须交代前因后果。" 
      : "- Style: High Fantasy, archaic, mystical. Use terms like 'Daoist', 'Cultivator', 'Qi', 'Meridians'.\n- Combat: Visceral and flashy. Describe the techniques."}

    MECHANICS:
    - If the player chooses an identity, the opening must establish their background story heavily.
    - If 'hp' <= 0, isGameOver = true.
    - Determine the player's 'Spirit Root' (affinity) based on their identity and luck in the first turn if not assigned.
  `;
};

export const startGame = async (name: string, identity: Identity, lang: Language): Promise<AIResponseData> => {
  const prompt = `
    BEGIN NEW NOVEL / GAME.
    
    **Character Profile:**
    - Name: ${name}
    - Identity/Background: ${lang === 'zh' ? identity.nameZh : identity.nameEn}
    - Identity Description: ${lang === 'zh' ? identity.descZh : identity.descEn}
    
    **Instruction for the Opening (Chapter 1):**
    1. **World Intro:** Briefly introduce the "Nine Provinces" or the specific region (Sect/Village/Ruins) they are in.
    2. **The Predicament:** Start *in media res*. The character is facing a crisis, a turning point, or a moment of awakening related to their Identity.
       - Example: If a servant, maybe they broke a treasure. If a noble, maybe their clan was just wiped out.
    3. **The Awakening:** They realize they can cultivate, or find an item, or make a decision that changes their fate.
    4. **Status:** Determine their Spirit Root based on the story (don't ask, just assign it via statUpdates.setSpiritRoot).
    
    Output the narrative and offer 3 critical choices for the first step of their path.
  `;

  return callGemini(prompt, lang);
};

export const processTurn = async (
  playerAction: string,
  playerStats: PlayerStats,
  recentHistory: LogEntry[],
  lang: Language
): Promise<AIResponseData> => {
  const historyContext = recentHistory
    .slice(-6) // More context for better continuity
    .map((h) => `${h.role.toUpperCase()}: ${h.text}`)
    .join("\n");

  const prompt = `
    **Current Status:**
    Name: ${playerStats.name} (Identity: ${playerStats.identity})
    Realm: ${playerStats.realm}
    Spirit Root: ${playerStats.spiritRoot}
    HP: ${playerStats.hp}/${playerStats.maxHp} | Qi: ${playerStats.qi}/${playerStats.maxQi}
    Location: ${playerStats.location}
    Inventory: ${playerStats.inventory.join(", ")}
    
    **Recent Story:**
    ${historyContext}

    **Player Action:** ${playerAction}
    
    **Instructions:**
    - Continue the story naturally.
    - If exploring, describe the environment vividly.
    - If fighting, make it thrilling.
    - If interacting, give NPCs personality.
    - Update stats logically based on the narrative.
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
        temperature: 0.9, // High creativity for storytelling
        thinkingConfig: { thinkingBudget: 1024 } // Use thinking for better plot coherence
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");

    return JSON.parse(text) as AIResponseData;
  } catch (error) {
    console.error("GenAI Error:", error);
    const isZh = lang === 'zh';
    return {
      narrative: isZh ? "天道紊乱，命运的长河出现了一丝波澜……（请重试）" : "The Dao is turbulent. Ripples disturb the river of fate... (Please try again)",
      choices: [{ text: isZh ? "凝神静气 (重试)" : "Focus Qi (Retry)", actionType: "meditate" }],
      statUpdates: {},
    };
  }
}
