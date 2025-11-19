
export type Language = 'en' | 'zh';

export interface Identity {
  id: string;
  nameEn: string;
  nameZh: string;
  descEn: string;
  descZh: string;
}

export interface PlayerStats {
  name: string;
  identity: string;
  spiritRoot: string; // AI generated now
  realm: string;
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
  actionType: 'explore' | 'meditate' | 'combat' | 'talk' | 'travel' | 'story';
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
  language: Language;
}

// AI Response Schema Type
export interface AIResponseData {
  narrative: string;
  statUpdates?: {
    hpChange?: number;
    qiChange?: number;
    goldChange?: number;
    newRealm?: string; 
    newLocation?: string;
    setSpiritRoot?: string; // New field to set root dynamically
    inventoryAdd?: string[];
    inventoryRemove?: string[];
  };
  choices: {
    text: string;
    actionType: string;
  }[];
  isGameOver?: boolean;
}
