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
    user: language === 'zh' ? '此心' : 'Heart',
    ai: language === 'zh' ? '天道' : 'The Dao',
    loading: language === 'zh' ? '天机演化...' : 'The Dao unfolds...'
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar relative z-10">
      <div className="max-w-3xl mx-auto pt-4 pb-12">
        {history.map((entry) => (
          <div 
            key={entry.id} 
            className={`
              flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700
              ${entry.role === 'user' ? 'items-end' : 'items-start'}
            `}
          >
            <div className="flex items-center gap-2 mb-1 opacity-50">
              {entry.role === 'ai' && <div className="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_5px_orange]" />}
              <span className="text-[10px] uppercase tracking-widest font-serif text-stone-400">
                {entry.role === 'user' ? labels.user : labels.ai}
              </span>
              {entry.role === 'user' && <div className="w-1 h-1 rounded-full bg-stone-500" />}
            </div>
            
            <div className={`
              max-w-[95%] md:max-w-[85%] leading-loose text-lg md:text-xl
              ${entry.role === 'user' 
                ? 'text-stone-400 italic font-serif text-right' 
                : 'text-stone-200 font-serif text-justify drop-shadow-md'}
            `}>
              {entry.text}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-80">
            <div className="w-12 h-12 border-2 border-stone-800 border-t-amber-600 rounded-full animate-spin"></div>
            <div className="text-amber-700/80 font-serif text-xs tracking-[0.3em] animate-pulse">
              {labels.loading}
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-8" />
      </div>
    </div>
  );
};

export default GameLog;