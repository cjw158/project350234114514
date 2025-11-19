import React, { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlayerStats, GameState, SpiritRoot, LogEntry, AIResponseData, Choice } from './types';
import { startGame, processTurn } from './services/geminiService';
import GameLog from './components/GameLog';
import { Button, ProgressBar, Divider } from './components/UIComponents';

// Initial empty state
const INITIAL_STATS: PlayerStats = {
  name: "",
  spiritRoot: SpiritRoot.FIRE,
  realm: "Mortal",
  hp: 100,
  maxHp: 100,
  qi: 0,
  maxQi: 100,
  gold: 0,
  inventory: ["Coarse Linen Robe"],
  location: "Unknown"
};

const App: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [setupData, setSetupData] = useState<{name: string, root: SpiritRoot}>({ name: '', root: SpiritRoot.FIRE });
  
  const [gameState, setGameState] = useState<GameState>({
    player: INITIAL_STATS,
    turn: 0,
    isGameOver: false,
    history: [],
    currentChoices: [],
    isLoading: false,
  });

  // Check for API Key
  const hasApiKey = !!process.env.API_KEY;

  const handleStartGame = async () => {
    if (!setupData.name) return;
    
    setGameState(prev => ({ ...prev, isLoading: true }));
    setGameStarted(true);

    try {
      const aiData = await startGame(setupData.name, setupData.root);
      
      const initialPlayer: PlayerStats = {
        ...INITIAL_STATS,
        name: setupData.name,
        spiritRoot: setupData.root,
        realm: "Qi Condensation Layer 1",
        location: "Azure Cloud Sect (Outer Court)",
        qi: 10
      };

      updateGameStateFromAI(aiData, initialPlayer, true);
    } catch (e) {
      console.error(e);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleAction = async (choice: Choice) => {
    if (gameState.isLoading || gameState.isGameOver) return;

    // Optimistically update UI with user choice
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
      currentChoices: [] // Hide choices while thinking
    }));

    try {
      const aiData = await processTurn(choice.text, gameState.player, gameState.history);
      updateGameStateFromAI(aiData, gameState.player);
    } catch (e) {
      console.error(e);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const updateGameStateFromAI = (data: AIResponseData, currentPlayer: PlayerStats, isInit = false) => {
    // Calculate new stats
    const updates = data.statUpdates || {};
    const newPlayer = { ...currentPlayer };

    if (updates.hpChange) newPlayer.hp = Math.min(newPlayer.maxHp, Math.max(0, newPlayer.hp + updates.hpChange));
    if (updates.qiChange) newPlayer.qi = Math.min(newPlayer.maxQi, Math.max(0, newPlayer.qi + updates.qiChange));
    if (updates.goldChange) newPlayer.gold = Math.max(0, newPlayer.gold + updates.goldChange);
    if (updates.newRealm) {
      newPlayer.realm = updates.newRealm;
      newPlayer.maxHp += 50; // Simple scaling logic
      newPlayer.maxQi += 50;
      newPlayer.hp = newPlayer.maxHp; // Heal on breakthrough
      newPlayer.qi = newPlayer.maxQi;
    }
    if (updates.newLocation) newPlayer.location = updates.newLocation;
    
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

  // Render Login Screen if not started
  if (!gameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-200 p-4">
        <div className="max-w-md w-full bg-stone-900 border border-stone-800 p-8 rounded-xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif text-amber-600 mb-2 tracking-widest">XIANXIA</h1>
            <h2 className="text-xl text-stone-500 font-light">Path to Immortality</h2>
          </div>

          {!hasApiKey ? (
             <div className="bg-red-900/20 border border-red-900 p-4 rounded text-red-200 text-sm text-center">
               Error: API_KEY environment variable is missing.
             </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">Daoist Name</label>
                <input 
                  type="text"
                  className="w-full bg-black/30 border border-stone-700 rounded p-3 text-amber-100 focus:border-amber-600 focus:outline-none transition-colors"
                  placeholder="Enter your name..."
                  value={setupData.name}
                  onChange={(e) => setSetupData({...setupData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">Spirit Root Affinity</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(SpiritRoot).map((root) => (
                    <button
                      key={root}
                      onClick={() => setSetupData({...setupData, root})}
                      className={`p-2 text-xs border rounded transition-all ${
                        setupData.root === root 
                        ? 'bg-amber-900/40 border-amber-600 text-amber-200' 
                        : 'bg-transparent border-stone-800 text-stone-500 hover:border-stone-600'
                      }`}
                    >
                      {root}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full py-4 text-lg mt-4"
                onClick={handleStartGame}
                disabled={!setupData.name}
              >
                Begin Journey
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Game Layout
  return (
    <div className="flex flex-col md:flex-row h-screen bg-stone-950 overflow-hidden">
      
      {/* Left Panel: Narrative Log */}
      <div className="md:w-2/3 flex flex-col h-1/2 md:h-full border-r border-stone-800 relative">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-stone-950 to-transparent pointer-events-none z-10"></div>
        <GameLog history={gameState.history} isLoading={gameState.isLoading} />
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-stone-950 to-transparent pointer-events-none z-10"></div>
      </div>

      {/* Right Panel: Stats & Actions */}
      <div className="md:w-1/3 flex flex-col h-1/2 md:h-full bg-stone-900/80 backdrop-blur-sm p-6 border-t md:border-t-0 border-stone-800 overflow-y-auto">
        
        {/* Character Card */}
        <div className="mb-6 bg-black/40 p-4 rounded border border-stone-800">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl text-amber-500 font-serif">{gameState.player.name}</h2>
            <span className="text-xs text-stone-500">{gameState.player.spiritRoot}</span>
          </div>
          <div className="text-sm text-stone-300 font-serif mb-4">{gameState.player.realm}</div>
          
          <ProgressBar value={gameState.player.hp} max={gameState.player.maxHp} color="bg-red-700" label="Vitality (HP)" />
          <ProgressBar value={gameState.player.qi} max={gameState.player.maxQi} color="bg-blue-600" label="Spiritual Energy (Qi)" />
          
          <div className="grid grid-cols-2 gap-4 mt-4 text-xs text-stone-400">
            <div>
              <span className="block text-stone-600 uppercase tracking-wider">Location</span>
              <span className="text-stone-300">{gameState.player.location}</span>
            </div>
            <div>
              <span className="block text-stone-600 uppercase tracking-wider">Wealth</span>
              <span className="text-amber-400">{gameState.player.gold} Spirit Stones</span>
            </div>
          </div>
        </div>

        {/* Inventory (Collapsible or Small List) */}
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-stone-500 mb-2">Spatial Bag</h3>
          <div className="flex flex-wrap gap-2">
            {gameState.player.inventory.length === 0 ? (
              <span className="text-stone-600 text-sm italic">Empty</span>
            ) : (
              gameState.player.inventory.map((item, i) => (
                <span key={i} className="text-xs bg-stone-800 text-stone-300 px-2 py-1 rounded border border-stone-700">
                  {item}
                </span>
              ))
            )}
          </div>
        </div>

        <Divider />

        {/* Action Area */}
        <div className="flex-1 flex flex-col justify-end">
          {gameState.isGameOver ? (
            <div className="text-center space-y-4">
              <h2 className="text-3xl text-red-600 font-serif">Reincarnation Required</h2>
              <p className="text-stone-400">Your path to immortality has ended prematurely.</p>
              <Button onClick={() => window.location.reload()} variant="danger" className="w-full">
                Reincarnate
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-center text-stone-500 text-xs uppercase tracking-widest mb-2">
                {gameState.isLoading ? "Contemplating..." : "Choose your Path"}
              </h3>
              {gameState.currentChoices.map((choice) => (
                <Button
                  key={choice.id}
                  onClick={() => handleAction(choice)}
                  disabled={gameState.isLoading}
                  variant={choice.actionType === 'combat' ? 'danger' : 'primary'}
                  className="w-full text-left flex items-center justify-between group"
                >
                  <span>{choice.text}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500">
                     &rarr;
                  </span>
                </Button>
              ))}
              {gameState.currentChoices.length === 0 && !gameState.isLoading && (
                 <div className="text-center text-stone-600 text-sm">
                    Consulting the archives...
                 </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;
