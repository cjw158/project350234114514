
import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlayerStats, GameState, LogEntry, AIResponseData, Choice, Language, Identity } from './types';
import { startGame, processTurn } from './services/geminiService';
import GameLog from './components/GameLog';
import { Button, ProgressBar, Divider } from './components/UIComponents';

// --- Game Data & Translations ---

const IDENTITIES: Identity[] = [
  {
    id: 'orphan',
    nameEn: "Village Orphan",
    nameZh: "山村孤儿",
    descEn: "You found a mysterious ring in the mud. You have no background, but fate is on your side.",
    descZh: "你在泥潭中捡到一枚神秘古戒。虽出身卑微，无依无靠，却似乎背负着某种上古因果。"
  },
  {
    id: 'noble',
    nameEn: "Fallen Noble",
    nameZh: "落魄世家",
    descEn: "Your clan was wiped out by a rival sect. You survived with a family heirloom and a heart full of vengeance.",
    descZh: "昔日辉煌的家族一夜之间被仇敌灭门。你带着家传信物苟活于世，心中只有复仇的怒火。"
  },
  {
    id: 'disciple',
    nameEn: "Outer Disciple",
    nameZh: "宗门杂役",
    descEn: "You are the lowest rank in the Azure Cloud Sect. Bullied by seniors, you work hard hoping for a breakthrough.",
    descZh: "身在青云门，命如蝼蚁。每日负责挑水砍柴，受尽白眼，却在后山禁地意外窥见一丝天机。"
  },
  {
    id: 'rogue',
    nameEn: "Rogue Cultivator",
    nameZh: "江湖散修",
    descEn: "You trust no one. You fight for every scrap of resource in the wild. Your survival instincts are unmatched.",
    descZh: "以天为盖地为庐。不入宗门，不拜神佛。在刀尖上舔血，只为争夺那天地间的一线生机。"
  }
];

const TEXT = {
  en: {
    title: "XIANXIA",
    subtitle: "Path to Immortality",
    enterName: "Daoist Name",
    placeholder: "Enter your name...",
    selectIdentity: "Choose your Origin",
    start: "Enter the Cycle of Reincarnation",
    hp: "Vitality",
    qi: "Spiritual Energy",
    location: "Location",
    wealth: "Spirit Stones",
    bag: "Inventory",
    empty: "Empty",
    gameOver: "Karmic End",
    gameOverDesc: "Your thread of fate has been severed.",
    reincarnate: "Reincarnate",
    thinking: "Weaving destiny...",
    choose: "Your Choice",
    error: "Error: Missing API_KEY"
  },
  zh: {
    title: "修仙录",
    subtitle: "逆天改命 · 证道长生",
    enterName: "道号 / 姓名",
    placeholder: "输入你的名字...",
    selectIdentity: "选择出身背景",
    start: "开启轮回",
    hp: "气血 (HP)",
    qi: "灵力 (Qi)",
    location: "所在",
    wealth: "灵石",
    bag: "储物袋",
    empty: "空空如也",
    gameOver: "身死道消",
    gameOverDesc: "仙路漫漫，终是一场空。",
    reincarnate: "转世重修",
    thinking: "推演天机中...",
    choose: "抉择",
    error: "错误：未找到 API_KEY"
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
  inventory: [],
  location: "Unknown"
};

// --- Main Component ---

const App: React.FC = () => {
  const [step, setStep] = useState<'language' | 'setup' | 'game'>('language');
  const [language, setLanguage] = useState<Language>('zh');
  const [setupData, setSetupData] = useState<{name: string, identity: Identity | null}>({ name: '', identity: null });
  
  const [gameState, setGameState] = useState<GameState>({
    player: INITIAL_STATS,
    turn: 0,
    isGameOver: false,
    history: [],
    currentChoices: [],
    isLoading: false,
    language: 'zh'
  });

  const t = TEXT[language];
  const hasApiKey = !!process.env.API_KEY;

  const handleStartGame = async () => {
    if (!setupData.name || !setupData.identity) return;
    
    setGameState(prev => ({ ...prev, isLoading: true, language }));
    setStep('game');

    try {
      const aiData = await startGame(setupData.name, setupData.identity, language);
      
      const initialPlayer: PlayerStats = {
        ...INITIAL_STATS,
        name: setupData.name,
        identity: language === 'zh' ? setupData.identity.nameZh : setupData.identity.nameEn,
        location: aiData.statUpdates?.newLocation || (language === 'zh' ? "未知之地" : "Unknown Realm"),
      };

      updateGameStateFromAI(aiData, initialPlayer, true);
    } catch (e) {
      console.error(e);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleAction = async (choice: Choice) => {
    if (gameState.isLoading || gameState.isGameOver) return;

    const userLog: LogEntry = {
      id: uuidv4(),
      role: 'user',
      text: choice.text,
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
      console.error(e);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const updateGameStateFromAI = (data: AIResponseData, currentPlayer: PlayerStats, isInit = false) => {
    const updates = data.statUpdates || {};
    const newPlayer = { ...currentPlayer };

    if (updates.hpChange) newPlayer.hp = Math.min(newPlayer.maxHp, Math.max(0, newPlayer.hp + updates.hpChange));
    if (updates.qiChange) newPlayer.qi = Math.min(newPlayer.maxQi, Math.max(0, newPlayer.qi + updates.qiChange));
    if (updates.goldChange) newPlayer.gold = Math.max(0, newPlayer.gold + updates.goldChange);
    
    // Narrative updates
    if (updates.newRealm) newPlayer.realm = updates.newRealm;
    if (updates.newLocation) newPlayer.location = updates.newLocation;
    if (updates.setSpiritRoot) newPlayer.spiritRoot = updates.setSpiritRoot;
    
    if (updates.inventoryAdd) {
      newPlayer.inventory = [...newPlayer.inventory, ...updates.inventoryAdd];
    }
    if (updates.inventoryRemove) {
      newPlayer.inventory = newPlayer.inventory.filter(item => !updates.inventoryRemove!.includes(item));
    }

    const aiLog: LogEntry = {
      id: uuidv4(),
      role: 'ai',
      text: data.narrative,
      timestamp: Date.now()
    };

    const newChoices: Choice[] = data.choices.map((c, idx) => ({
      id: uuidv4(),
      text: c.text,
      actionType: c.actionType as any
    }));

    setGameState(prev => ({
      ...prev,
      player: newPlayer,
      history: isInit ? [aiLog] : [...prev.history, aiLog],
      currentChoices: newChoices,
      isGameOver: data.isGameOver || newPlayer.hp <= 0,
      isLoading: false,
      turn: prev.turn + 1
    }));
  };

  // --- Renders ---

  if (step === 'language') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-200 p-4 font-serif">
        <div className="max-w-md w-full bg-stone-900 border border-stone-800 p-8 rounded-xl shadow-2xl text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-5xl text-amber-700 tracking-widest opacity-90">修仙</h1>
            <p className="text-stone-500 text-sm tracking-widest">PATH TO IMMORTALITY</p>
          </div>
          <div className="space-y-4">
             <Button onClick={() => { setLanguage('zh'); setStep('setup'); }} className="w-full py-4 text-xl border-stone-700 text-stone-300 hover:border-amber-700 hover:text-amber-500">
               简体中文 (Chinese)
             </Button>
             <Button onClick={() => { setLanguage('en'); setStep('setup'); }} className="w-full py-4 text-lg border-stone-800 text-stone-500 hover:text-stone-300">
               English
             </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-200 p-4 font-serif">
        <div className="max-w-2xl w-full bg-stone-900 border border-stone-800 p-8 rounded-xl shadow-2xl flex flex-col gap-6">
          <button onClick={() => setStep('language')} className="text-left text-stone-600 hover:text-amber-500 transition-colors">
             &larr; {language === 'zh' ? '返回' : 'Back'}
          </button>
          
          <div className="text-center border-b border-stone-800 pb-6">
            <h1 className="text-4xl text-amber-600 mb-2 tracking-widest">{t.title}</h1>
            <p className="text-stone-500">{t.subtitle}</p>
          </div>

          {!hasApiKey ? (
             <div className="bg-red-900/20 border border-red-900 p-4 text-red-300 text-center">{t.error}</div>
          ) : (
            <>
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-500 mb-2">{t.enterName}</label>
                <input 
                  type="text"
                  maxLength={12}
                  className="w-full bg-black/40 border border-stone-700 rounded p-4 text-lg text-amber-100 focus:border-amber-600 focus:outline-none transition-all"
                  placeholder={t.placeholder}
                  value={setupData.name}
                  onChange={(e) => setSetupData({...setupData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-500 mb-3">{t.selectIdentity}</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {IDENTITIES.map((id) => (
                    <button
                      key={id.id}
                      onClick={() => setSetupData({...setupData, identity: id})}
                      className={`p-4 border rounded text-left transition-all hover:bg-stone-800 group relative overflow-hidden ${
                        setupData.identity?.id === id.id 
                        ? 'bg-stone-800 border-amber-600' 
                        : 'bg-black/20 border-stone-800'
                      }`}
                    >
                      <div className={`font-bold mb-1 ${setupData.identity?.id === id.id ? 'text-amber-500' : 'text-stone-300'}`}>
                        {language === 'zh' ? id.nameZh : id.nameEn}
                      </div>
                      <div className="text-xs text-stone-500 leading-relaxed group-hover:text-stone-400">
                        {language === 'zh' ? id.descZh : id.descEn}
                      </div>
                      {setupData.identity?.id === id.id && (
                        <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-r-[20px] border-t-transparent border-r-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full py-4 text-xl mt-2 bg-amber-900/20 border-amber-800/50 text-amber-500 hover:bg-amber-900/40 hover:border-amber-600 hover:text-amber-200"
                onClick={handleStartGame}
                disabled={!setupData.name || !setupData.identity}
              >
                {t.start}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-stone-950 overflow-hidden font-serif">
      {/* Left: Story Log */}
      <div className="md:w-2/3 flex flex-col h-[60%] md:h-full relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-stone-950 via-stone-950/80 to-transparent pointer-events-none z-10" />
        <GameLog history={gameState.history} isLoading={gameState.isLoading} language={language} />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent pointer-events-none z-10" />
      </div>

      {/* Right: Stats & Controls */}
      <div className="md:w-1/3 flex flex-col h-[40%] md:h-full bg-stone-900 border-l border-stone-800 relative z-20 shadow-2xl">
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* Header Card */}
          <div className="mb-6 text-center">
            <h2 className="text-3xl text-amber-500 mb-1 tracking-widest">{gameState.player.name}</h2>
            <div className="text-xs text-stone-500 uppercase tracking-widest mb-4">
              {gameState.player.realm} • {gameState.player.spiritRoot}
            </div>
            <Divider />
          </div>

          {/* Stats Grid */}
          <div className="space-y-4 mb-6">
             <ProgressBar value={gameState.player.hp} max={gameState.player.maxHp} color="bg-red-800" label={t.hp} />
             <ProgressBar value={gameState.player.qi} max={gameState.player.maxQi} color="bg-cyan-700" label={t.qi} />
             
             <div className="grid grid-cols-2 gap-4 mt-4 bg-black/30 p-3 rounded border border-stone-800">
                <div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{t.location}</div>
                  <div className="text-sm text-stone-300 truncate">{gameState.player.location}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{t.wealth}</div>
                  <div className="text-sm text-amber-400">{gameState.player.gold}</div>
                </div>
             </div>
          </div>

          {/* Inventory */}
          <div className="mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest mb-2">{t.bag}</div>
            <div className="flex flex-wrap gap-2">
              {gameState.player.inventory.length === 0 ? (
                <span className="text-stone-700 text-xs italic">{t.empty}</span>
              ) : (
                gameState.player.inventory.map((item, i) => (
                  <span key={i} className="text-xs bg-stone-800 text-stone-400 px-2 py-1 rounded border border-stone-700 hover:border-stone-500 transition-colors cursor-help" title="Item">
                    {item}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800">
          {gameState.isGameOver ? (
            <div className="text-center space-y-3 animate-in fade-in duration-1000">
              <div className="text-red-600 text-xl font-bold tracking-widest">{t.gameOver}</div>
              <p className="text-stone-500 text-sm">{t.gameOverDesc}</p>
              <Button onClick={() => window.location.reload()} variant="danger" className="w-full mt-2">
                {t.reincarnate}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center text-stone-600 text-[10px] uppercase tracking-widest">
                 {gameState.isLoading ? t.thinking : t.choose}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {gameState.currentChoices.map((choice) => (
                  <Button
                    key={choice.id}
                    onClick={() => handleAction(choice)}
                    disabled={gameState.isLoading}
                    className="w-full text-left text-sm py-3 px-4 bg-stone-900 hover:bg-stone-800 border-stone-700 hover:border-amber-700/50 text-stone-300 hover:text-amber-100 transition-all duration-300 flex items-center justify-between group"
                  >
                    <span className="line-clamp-1">{choice.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
