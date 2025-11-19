
export type Language = 'en' | 'zh';

export interface Identity {
  id: string;
  nameEn: string;
  nameZh: string;
  descEn: string;
  descZh: string;
}

export type StoryPhase = 'origin' | 'convergence' | 'main';

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
  karma: number; // -100 (Demonic) to 100 (Righteous)
  inventory: string[];
  location: string;
  storyPhase: StoryPhase; // Tracks if we are in the specific origin story or main world
}

export interface Choice {
  id: string;
  text: string;
  actionType: 'explore' | 'meditate' | 'combat' | 'talk' | 'travel' | 'story' | 'continue';
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
    karmaChange?: number;
    newRealm?: string; 
    newLocation?: string;
    setSpiritRoot?: string; // New field to set root dynamically
    inventoryAdd?: string[];
    inventoryRemove?: string[];
    setStoryPhase?: StoryPhase; // AI decides when to move to next phase
  };
  choices: {
    text: string;
    actionType: string;
  }[];
  isGameOver?: boolean;
}
