export enum SpiritRoot {
  METAL = "Metal (Jin)",
  WOOD = "Wood (Mu)",
  WATER = "Water (Shui)",
  FIRE = "Fire (Huo)",
  EARTH = "Earth (Tu)",
  HEAVENLY = "Heavenly (Tian)"
}

export interface PlayerStats {
  name: string;
  spiritRoot: SpiritRoot;
  realm: string; // e.g., "Qi Condensation Layer 1"
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  gold: number;
  inventory: string[];
  location: string;
}

export interface Choice {
  id: string;
  text: string;
  actionType: 'explore' | 'meditate' | 'combat' | 'talk' | 'travel';
}

export interface LogEntry {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
}

export interface GameState {
  player: PlayerStats;
  turn: number;
  isGameOver: boolean;
  history: LogEntry[];
  currentChoices: Choice[];
  isLoading: boolean;
}

// AI Response Schema Type
export interface AIResponseData {
  narrative: string;
  statUpdates?: {
    hpChange?: number;
    qiChange?: number;
    goldChange?: number;
    newRealm?: string; // If they breakthrough
    newLocation?: string;
    inventoryAdd?: string[];
    inventoryRemove?: string[];
  };
  choices: {
    text: string;
    actionType: string; // mapped to Choice actionType
  }[];
  isGameOver?: boolean;
}
