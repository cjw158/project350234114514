import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlayerStats, GameState, LogEntry, AIResponseData, Choice, Language, Identity } from './types';
import { startGame, processTurn } from './services/geminiService';
import GameLog from './components/GameLog';
import { Button, GlassPanel, TabSystem, ProgressBar, KarmaBar, StatRow, Divider, Badge } from './components/UIComponents';

// --- Game Data & Translations ---
// Moved outside component to prevent recreation on every render

const IDENTITIES: Identity[] = [
  {
    id: 'orphan',
    nameEn: "Village Orphan",
    nameZh: "山村孤儿",
    descEn: "Found in the mud with a mysterious ring. No past, only a burning will to survive.",
    descZh: "泥潭中捡到一枚神秘古戒。虽出身卑微，无依无靠，却背负着上古因果。"
  },
  {
    id: 'noble',
    nameEn: "Fallen Noble",
    nameZh: "落魄世家",
    descEn: "Your clan was wiped out. You carry a blood debt and a broken sword.",
    descZh: "家族一夜被灭。你带着家传残剑苟活，心中只有复仇的怒火。"
  },
  {
    id: 'disciple',
    nameEn: "Outer Disciple",
    nameZh: "宗门杂役",
    descEn: "Lowest rank in the sect. Mocked by all, but you found a secret manual.",
    descZh: "青云门下蝼蚁。每日挑水砍柴，受尽白眼，却意外窥见一丝天机。"
  },
  {
    id: 'rogue',
    nameEn: "Rogue Cultivator",
    nameZh: "江湖散修",
    descEn: "A lone wolf. You fight for every resource and trust no one.",
    descZh: "以天为盖地为庐。不拜神佛，只信手中长刀，争那一线生机。"
  }
];

const TEXT = {
  en: {
    title: "ETERNAL DAO",
    subtitle: "Xianxia Chronicles",
    enterName: "Daoist Name",
    placeholder: "Enter Name...",
    start: "Begin Journey",
    continueGame: "Resume Path",
    stats: "Attributes",
    bag: "Inventory",
    journal: "Destiny",
    hp: "Vitality",
    qi: "Spirit Qi",
    karma: "Karma",
    gold: "Spirit Stones",
    location: "Location",
    realm: "Realm",
    root: "Root",
    empty: "The void contains nothing.",
    gameOver: "Karma Severed",
    reincarnate: "Reincarnate",
    thinking: "Divining...",
    tabStats: "Status",
    tabBag: "Bag",
    tabLog: "Sect",
    navMain: "Main",
    turn: "Cycle",
    error: "API Key Missing"
  },
  zh: {
    title: "永恒仙途",
    subtitle: "修仙录 · 逆天改命",
    enterName: "道号 / 姓名",
    placeholder: "输入尊讳...",
    start: "开启轮回",
    continueGame: "再续前缘",
    stats: "属性",
    bag: "储物",
    journal: "天命",
    hp: "气血",
    qi: "灵力",
    karma: "善恶",
    gold: "灵石",
    location: "所在",
    realm: "境界",
    root: "灵根",
    empty: "空空如也",
    gameOver: "身死道消",
    reincarnate: "转世重修",
    thinking: "推演天机...",
    tabStats: "状态",
    tabBag: "行囊",
    tabLog: "宗门",
    navMain: "主页",
    turn: "轮回",
    error: "缺少 API Key"
  }
};

const INITIAL_STATS: PlayerStats = {
  name: "",
  identity: "",
  spiritRoot: "???",
  realm: "Mortal",
  hp: 100,
  maxHp: 100,
  qi: 0,
  maxQi: 100,
  gold: 0,
  karma: 0,
  inventory: [],
  location: "Unknown",
  storyPhase: 'origin'
};

const SAVE_KEY = 'xianxia_save_v2';

type Tab = 'stats' | 'inventory' | 'journal';

const App: React.FC = () => {
  const [step, setStep] = useState<'start' | 'create' | 'game'>('start');
  const [language, setLanguage] = useState<Language>('zh');
  const [setupData, setSetupData] = useState<{name: string, identity: Identity | null}>({ name: '', identity: null });
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [saveSummary, setSaveSummary] = useState<string>("");
  
  const [gameState, setGameState] = useState<GameState>({
    player: INITIAL_STATS,
    turn: 1,
    isGameOver: false,
    history: [],
    currentChoices: [],
    isLoading: false,
    language: 'zh'
  });

  const t = TEXT[language];
  const hasApiKey = !!process.env.API_KEY;

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.player && !parsed.isGameOver) {
          setSaveSummary(`${parsed.player.name} [${parsed.player.realm}]`);
        }
      } catch (e) { localStorage.removeItem(SAVE_KEY); }
    }
  }, []);

  // Debounce localStorage saves to reduce expensive operations
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (step === 'game' && gameState.turn > 0 && !gameState.isLoading && !gameState.isGameOver) {
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Debounce save for 500ms
      saveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
      }, 500);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [gameState, step]);

  const handleLoadGame = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setGameState(parsed);
      setLanguage(parsed.language);
      setStep('game');
    }
  };

  const handleStartGame = async () => {
    if (!setupData.name || !setupData.identity) return;
    localStorage.removeItem(SAVE_KEY);
    setGameState(prev => ({ ...prev, isLoading: true, language }));
    setStep('game');

    try {
      const aiData = await startGame(setupData.name, setupData.identity, language);
      const initialPlayer: PlayerStats = {
        ...INITIAL_STATS,
        name: setupData.name,
        identity: language === 'zh' ? setupData.identity.nameZh : setupData.identity.nameEn,
        location: aiData.statUpdates?.newLocation || (language === 'zh' ? "尘世" : "Mortal World"),
        storyPhase: 'origin'
      };
      updateGameStateFromAI(aiData, initialPlayer, true);
    } catch (e) {
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleAction = useCallback(async (choice: Choice) => {
    if (gameState.isLoading || gameState.isGameOver) return;
    const userLog: LogEntry = {
      id: uuidv4(),
      role: 'user',
      text: choice.actionType === 'continue' ? (language === 'zh' ? '（继续）' : '(Continue)') : choice.text,
      timestamp: Date.now()
    };

    setGameState(prev => ({
      ...prev,
      history: [...prev.history, userLog],
      isLoading: true,
      currentChoices: [] 
    }));

    try {
      const aiData = await processTurn(choice.text, gameState.player, gameState.history, language);
      updateGameStateFromAI(aiData, gameState.player);
    } catch (e) {
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, [gameState.isLoading, gameState.isGameOver, gameState.player, gameState.history, language]);

  const updateGameStateFromAI = useCallback((data: AIResponseData, currentPlayer: PlayerStats, isInit = false) => {
    const updates = data.statUpdates || {};
    const newPlayer = { ...currentPlayer };

    if (updates.hpChange) newPlayer.hp = Math.min(newPlayer.maxHp, Math.max(0, newPlayer.hp + updates.hpChange));
    if (updates.qiChange) newPlayer.qi = Math.min(newPlayer.maxQi, Math.max(0, newPlayer.qi + updates.qiChange));
    if (updates.goldChange) newPlayer.gold = Math.max(0, newPlayer.gold + updates.goldChange);
    if (updates.karmaChange) newPlayer.karma = Math.max(-100, Math.min(100, newPlayer.karma + updates.karmaChange));
    if (updates.newRealm) newPlayer.realm = updates.newRealm;
    if (updates.newLocation) newPlayer.location = updates.newLocation;
    if (updates.setSpiritRoot) newPlayer.spiritRoot = updates.setSpiritRoot;
    if (updates.setStoryPhase) newPlayer.storyPhase = updates.setStoryPhase as any;
    
    // Optimize inventory operations
    if (updates.inventoryAdd) {
      newPlayer.inventory = newPlayer.inventory.concat(updates.inventoryAdd);
    }
    if (updates.inventoryRemove) {
      const removeSet = new Set(updates.inventoryRemove);
      newPlayer.inventory = newPlayer.inventory.filter(item => !removeSet.has(item));
    }

    const aiLog: LogEntry = { id: uuidv4(), role: 'ai', text: data.narrative, timestamp: Date.now() };
    const newChoices: Choice[] = data.choices.map(c => ({ id: uuidv4(), text: c.text, actionType: c.actionType as any }));

    setGameState(prev => ({
      ...prev,
      player: newPlayer,
      history: isInit ? [aiLog] : [...prev.history, aiLog],
      currentChoices: newChoices,
      isGameOver: data.isGameOver || newPlayer.hp <= 0,
      isLoading: false,
      turn: prev.turn + 1
    }));
  }, []);

  // --- Renders ---

  if (step === 'start') {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center z-10">
        <div className="space-y-6 max-w-lg w-full animate-in fade-in duration-1000">
          <div className="mb-12">
            <h1 className="text-6xl md:text-8xl font-cinzel text-amber-600 tracking-widest drop-shadow-[0_0_15px_rgba(217,119,6,0.5)] mb-4">
              {language === 'zh' ? '永恒仙途' : 'ETERNAL DAO'}
            </h1>
            <div className="h-px w-24 bg-amber-700 mx-auto mb-4" />
            <p className="text-stone-400 tracking-[0.3em] uppercase text-sm">{language === 'zh' ? '—— 修仙模拟器 ——' : 'PATH TO IMMORTALITY'}</p>
          </div>

          {saveSummary && (
            <Button variant="ethereal" fullWidth onClick={handleLoadGame}>
               {t.continueGame} <span className="text-stone-500 text-xs ml-2">[{saveSummary}]</span>
            </Button>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <Button variant="primary" onClick={() => { setLanguage('zh'); setStep('create'); }}>
              开始游戏
            </Button>
            <Button variant="primary" onClick={() => { setLanguage('en'); setStep('create'); }}>
              Start Game
            </Button>
          </div>
          
          {!hasApiKey && <div className="text-red-500 text-xs">{t.error}</div>}
        </div>
      </div>
    );
  }

  if (step === 'create') {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 z-10">
        <GlassPanel className="w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row">
          {/* Left: Controls */}
          <div className="p-8 md:w-1/2 space-y-8 border-b md:border-b-0 md:border-r border-stone-800">
            <div>
              <button onClick={() => setStep('start')} className="text-stone-600 hover:text-amber-500 text-sm tracking-widest mb-6">&larr; BACK</button>
              <h2 className="text-3xl text-stone-200 font-cinzel mb-2">{t.enterName}</h2>
              <input 
                type="text" 
                maxLength={12}
                className="w-full bg-transparent border-b border-stone-700 text-2xl text-amber-500 py-2 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-stone-800"
                placeholder={t.placeholder}
                value={setupData.name}
                onChange={e => setSetupData({...setupData, name: e.target.value})}
              />
            </div>

            <div>
              <h3 className="text-stone-500 text-xs uppercase tracking-widest mb-4">{t.realm}</h3>
              <div className="space-y-3">
                {IDENTITIES.map(id => (
                  <button 
                    key={id.id}
                    onClick={() => setSetupData({...setupData, identity: id})}
                    className={`w-full text-left p-4 rounded border transition-all ${
                      setupData.identity?.id === id.id 
                      ? 'bg-amber-900/20 border-amber-600 text-amber-100' 
                      : 'bg-transparent border-stone-800 text-stone-500 hover:border-stone-600'
                    }`}
                  >
                    <div className="font-bold tracking-wide">{language === 'zh' ? id.nameZh : id.nameEn}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Description */}
          <div className="p-8 md:w-1/2 flex flex-col justify-between bg-black/20">
            <div className="space-y-6">
              <div className="w-24 h-24 bg-stone-900 rounded-full border-2 border-stone-800 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <span className="text-4xl text-stone-700">?</span>
              </div>
              {setupData.identity ? (
                <div className="animate-in fade-in duration-500">
                  <h3 className="text-xl text-amber-500 text-center mb-4">{language === 'zh' ? setupData.identity.nameZh : setupData.identity.nameEn}</h3>
                  <p className="text-stone-400 leading-relaxed text-justify font-serif">
                    {language === 'zh' ? setupData.identity.descZh : setupData.identity.descEn}
                  </p>
                </div>
              ) : (
                <div className="text-center text-stone-700 italic">Select an origin...</div>
              )}
            </div>
            
            <Button 
              variant="primary" 
              fullWidth 
              disabled={!setupData.name || !setupData.identity}
              onClick={handleStartGame}
              className="mt-8"
            >
              {t.start}
            </Button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // --- MAIN GAME HUD ---

  const isContinue = gameState.currentChoices.length === 1 && gameState.currentChoices[0].actionType === 'continue';

  return (
    <div className="relative h-screen flex flex-col z-10 font-serif">
      {/* Top Bar */}
      <header className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-white/5 bg-black/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4 text-stone-400 text-xs tracking-widest uppercase">
          <span className="text-amber-600 font-bold">{t.turn} {gameState.turn}</span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline truncate">{gameState.player.location}</span>
        </div>
        <div className="text-stone-500 text-xs font-cinzel tracking-widest">
          {language === 'zh' ? '永恒仙途' : 'ETERNAL DAO'}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left: Narrative Stage */}
        <main className="flex-1 relative flex flex-col">
          <GameLog history={gameState.history} isLoading={gameState.isLoading} language={language} />
          
          {/* Bottom Action Deck (Mobile & Desktop) */}
          <div className="p-4 md:p-8 pb-8 md:pb-12 bg-gradient-to-t from-black/90 via-black/60 to-transparent shrink-0">
            {gameState.isGameOver ? (
               <div className="max-w-md mx-auto text-center space-y-4">
                 <div className="text-red-500 text-2xl tracking-[0.5em]">{t.gameOver}</div>
                 <Button variant="danger" fullWidth onClick={() => window.location.reload()}>{t.reincarnate}</Button>
               </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-3">
                {isContinue ? (
                  <Button 
                    variant="ethereal" 
                    fullWidth 
                    onClick={() => handleAction(gameState.currentChoices[0])}
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-900/20 py-4"
                  >
                    ✦ {gameState.currentChoices[0].text} ✦
                  </Button>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {gameState.currentChoices.map(c => (
                      <Button 
                        key={c.id} 
                        variant="secondary" 
                        onClick={() => handleAction(c)}
                        className="text-left justify-start"
                      >
                        <span className="w-6 text-stone-600 text-xs">➤</span> {c.text}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Right: Management Console (Hidden on mobile if needed, or stacked) */}
        <aside className="hidden md:flex w-[380px] border-l border-white/5 bg-black/20 backdrop-blur-md flex-col">
          {/* Character Header */}
          <div className="p-6 border-b border-white/5 text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-stone-800 to-black rounded-full border border-stone-600 flex items-center justify-center mb-3 shadow-lg">
               <span className="text-2xl text-amber-700 font-cinzel">{gameState.player.name.charAt(0)}</span>
            </div>
            <h2 className="text-xl text-amber-500 font-medium tracking-wide mb-1">{gameState.player.name}</h2>
            <div className="flex justify-center gap-2 text-[10px] text-stone-500 uppercase tracking-wider">
              <Badge>{gameState.player.realm}</Badge>
              <Badge>{gameState.player.spiritRoot}</Badge>
            </div>
          </div>

          {/* Tab System */}
          <TabSystem 
            tabs={[
              { id: 'stats', label: t.tabStats },
              { id: 'inventory', label: t.tabBag },
              { id: 'journal', label: t.tabLog }
            ]} 
            activeTab={activeTab} 
            onTabChange={(id) => setActiveTab(id as Tab)} 
          />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {activeTab === 'stats' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <ProgressBar label={t.hp} value={gameState.player.hp} max={gameState.player.maxHp} color="bg-red-700" icon="♥" />
                <ProgressBar label={t.qi} value={gameState.player.qi} max={gameState.player.maxQi} color="bg-cyan-600" icon="⚡" />
                <KarmaBar karma={gameState.player.karma} label={t.karma} minLabel="Demonic" maxLabel="Divine" />
                
                <Divider label={t.stats} />
                <StatRow label={t.gold} value={gameState.player.gold} />
                <StatRow label={t.realm} value={gameState.player.realm} />
                <StatRow label={t.root} value={gameState.player.spiritRoot} />
                <StatRow label={t.location} value={gameState.player.location} />
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-3 gap-2">
                  {gameState.player.inventory.length === 0 ? (
                    <div className="col-span-3 text-center text-stone-600 italic py-8 text-sm">{t.empty}</div>
                  ) : (
                    gameState.player.inventory.map((item, i) => (
                      <div key={i} className="aspect-square bg-stone-900/50 border border-stone-700/50 rounded flex items-center justify-center p-2 text-center">
                        <span className="text-xs text-stone-300 leading-tight">{item}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'journal' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                 <div className="p-4 border border-stone-800 bg-stone-900/30 rounded">
                   <div className="text-amber-700 text-xs uppercase tracking-widest mb-2">Current Phase</div>
                   <div className="text-stone-300 font-serif capitalize">{gameState.player.storyPhase}</div>
                 </div>
                 <div className="p-4 border border-stone-800 bg-stone-900/30 rounded">
                   <div className="text-amber-700 text-xs uppercase tracking-widest mb-2">Location</div>
                   <div className="text-stone-300 font-serif">{gameState.player.location}</div>
                 </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Stats Toggle (Floating FAB) - Optional if we wanted strict mobile parity, but standard layout is good for now */}
    </div>
  );
};

export default App;