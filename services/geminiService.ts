import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PlayerStats, LogEntry, AIResponseData, Choice, SpiritRoot } from "../types";

// Initialize the client
// NOTE: In a real production app, use a backend proxy. For this demo, we use env var directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

// The Response Schema for structured game updates
const GAME_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The story segment describing what happens. Be descriptive, use Xianxia terminology (Dao, Qi, Sects, etc.).",
    },
    statUpdates: {
      type: Type.OBJECT,
      description: "Changes to the player's status.",
      properties: {
        hpChange: { type: Type.INTEGER, description: "Change in Health (negative for damage)." },
        qiChange: { type: Type.INTEGER, description: "Change in Qi (positive for meditation/pills)." },
        goldChange: { type: Type.INTEGER, description: "Change in Spirit Stones/Gold." },
        newRealm: { type: Type.STRING, description: "New cultivation rank if a breakthrough occurs (e.g. Qi Condensation Layer 2)." },
        newLocation: { type: Type.STRING, description: "New location name if the player moved." },
        inventoryAdd: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Items gained." },
        inventoryRemove: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Items lost/consumed." },
      },
    },
    choices: {
      type: Type.ARRAY,
      description: "3 to 4 available actions for the player.",
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "The text description of the choice." },
          actionType: { type: Type.STRING, description: "One of: explore, meditate, combat, talk, travel" },
        },
        required: ["text", "actionType"],
      },
    },
    isGameOver: { type: Type.BOOLEAN, description: "True if the player has died." },
  },
  required: ["narrative", "choices"],
};

const SYSTEM_INSTRUCTION = `
You are the Dungeon Master (Daoist Master) of a vast, immersive Xianxia (Cultivation) text adventure game. 
The world is "The Nine Provinces".
Themes: Pursuit of Immortality, Ruthless Sects, Ancient Ruins, Alchemy, Spirit Beasts, Tribulations.

Your goal is to narrate the player's journey based on their actions.
1. Tone: Mythical, archaic, grand. Use terms like "fellow daoist", "courting death", "jade slip", "spiritual pressure".
2. Mechanics: 
   - Meditation restores Qi but takes time.
   - Combat is dangerous. Describe techniques (e.g., "Azure Dragon Fist").
   - Realms: Mortal -> Qi Condensation (Layers 1-9) -> Foundation Establishment -> Golden Core -> Nascent Soul -> Deity Transformation.
   - Provide difficult choices. The path to heaven is against the will of nature.
3. Continuity: Keep track of the player's location and inventory implicitly through the context provided.

Important:
- If 'hp' drops to 0 or below, set isGameOver to true.
- Provide 3 or 4 distinct choices each turn.
- If the user meditates, usually give positive Qi.
- If the user finds an artifact, add it to inventory.
`;

export const startGame = async (name: string, root: SpiritRoot): Promise<AIResponseData> => {
  const prompt = `
    New Game Started.
    Player Name: ${name}
    Spirit Root: ${root}
    
    Describe the opening scene. The player starts as a humble mortal or low-level disciple in the 'Azure Cloud Sect' outer court. 
    They have just awakened to their potential.
    Give them their initial stats implicitly (set hp to 100, qi to 10 in your mind, but return 0 change for now).
  `;

  return callGemini(prompt, []);
};

export const processTurn = async (
  playerAction: string,
  playerStats: PlayerStats,
  recentHistory: LogEntry[]
): Promise<AIResponseData> => {
  // Compress history to last 5 turns to save tokens but keep context
  const historyContext = recentHistory
    .slice(-5)
    .map((h) => `${h.role.toUpperCase()}: ${h.text}`)
    .join("\n");

  const prompt = `
    Current Status:
    Name: ${playerStats.name}
    Realm: ${playerStats.realm}
    HP: ${playerStats.hp}/${playerStats.maxHp}
    Qi: ${playerStats.qi}/${playerStats.maxQi}
    Location: ${playerStats.location}
    Inventory: ${playerStats.inventory.join(", ")}
    
    Recent History:
    ${historyContext}

    Player Action: ${playerAction}
    
    Narrate the outcome of this action. Update stats accordingly.
  `;

  return callGemini(prompt, []);
};

async function callGemini(prompt: string, history: any[]): Promise<AIResponseData> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt, // We are passing context manually in the prompt for stateless REST feel, though chat interface is also valid.
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: GAME_RESPONSE_SCHEMA,
        temperature: 0.8, // High creativity for stories
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from the Dao.");
    }

    return JSON.parse(text) as AIResponseData;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback response to prevent crash
    return {
      narrative: "The heavens are clouded. The connection to the Dao is severed (API Error). Please try again.",
      choices: [{ text: "Try Again", actionType: "meditate" }],
      statUpdates: {},
    };
  }
}
