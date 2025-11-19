import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface GameLogProps {
  history: LogEntry[];
  isLoading: boolean;
}

const GameLog: React.FC<GameLogProps> = ({ history, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6">
        {history.map((entry) => (
          <div 
            key={entry.id} 
            className={`
              p-4 rounded-lg border 
              ${entry.role === 'user' 
                ? 'bg-stone-900/50 border-stone-700 ml-12 text-right' 
                : 'bg-black/20 border-stone-800 mr-12 text-left shadow-lg'}
            `}
          >
            <div className="text-xs text-stone-500 mb-1 uppercase tracking-widest">
              {entry.role === 'user' ? 'You' : 'The Dao'}
            </div>
            <div className={`
              leading-relaxed text-lg whitespace-pre-wrap
              ${entry.role === 'user' ? 'text-stone-300 italic' : 'text-stone-200 font-serif'}
            `}>
              {entry.text}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-center items-center p-8 animate-pulse">
            <div className="text-amber-700 font-serif tracking-widest">Consulting the Heavens...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default GameLog;
