
import React, { useEffect, useRef } from 'react';
import { LogEntry, Language } from '../types';

interface GameLogProps {
  history: LogEntry[];
  isLoading: boolean;
  language: Language;
}

const GameLog: React.FC<GameLogProps> = ({ history, isLoading, language }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isLoading]);

  const labels = {
    user: language === 'zh' ? '你' : 'You',
    ai: language === 'zh' ? '天道' : 'The Dao',
    loading: language === 'zh' ? '天机推演中...' : 'Consulting the Heavens...'
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar scroll-smooth">
      <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 pt-4 pb-8">
        {history.map((entry) => (
          <div 
            key={entry.id} 
            className={`
              p-3 md:p-4 rounded-lg border 
              ${entry.role === 'user' 
                ? 'bg-stone-900/50 border-stone-700 ml-4 md:ml-12 text-right' 
                : 'bg-black/20 border-stone-800 mr-4 md:mr-12 text-left shadow-lg'}
            `}
          >
            <div className="text-[10px] text-stone-500 mb-1 uppercase tracking-widest">
              {entry.role === 'user' ? labels.user : labels.ai}
            </div>
            <div className={`
              leading-relaxed whitespace-pre-wrap
              ${entry.role === 'user' 
                ? 'text-stone-300 italic text-base md:text-lg' 
                : 'text-stone-200 font-serif text-base md:text-lg'}
            `}>
              {entry.text}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-center items-center p-6 md:p-8 animate-pulse">
            <div className="text-amber-700 font-serif tracking-widest text-xs md:text-sm">{labels.loading}</div>
          </div>
        )}
        <div ref={bottomRef} className="h-2" />
      </div>
    </div>
  );
};

export default GameLog;
