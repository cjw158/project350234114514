import React from 'react';

// --- Core Layout Components ---

export const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`glass-panel rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

export const TabSystem: React.FC<{ 
  tabs: { id: string; label: string; icon?: React.ReactNode }[]; 
  activeTab: string; 
  onTabChange: (id: string) => void;
}> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex border-b border-stone-800 bg-black/20">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 py-3 px-2 text-xs md:text-sm font-serif tracking-wider transition-all duration-300
              ${isActive 
                ? 'text-amber-500 bg-amber-900/10 border-b-2 border-amber-500' 
                : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/30 border-b-2 border-transparent'}
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

// --- Interactive Elements ---

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ethereal';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '', 
  ...props 
}) => {
  const baseStyle = "relative group overflow-hidden px-6 py-3 rounded-lg font-serif tracking-widest transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-gradient-to-r from-stone-900 to-stone-800 border border-amber-700/50 text-amber-500 hover:border-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    secondary: "bg-stone-900/50 border border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200",
    danger: "bg-red-950/30 border border-red-900/50 text-red-400 hover:border-red-500 hover:bg-red-900/40",
    ethereal: "bg-transparent border border-stone-600/30 text-stone-300 hover:bg-stone-800/30 hover:border-amber-500/30 backdrop-blur-sm"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} 
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      {/* Hover Glow Effect */}
      <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </button>
  );
};

// --- Data Display ---

export const StatRow: React.FC<{ label: string; value: string | number; subtext?: string }> = ({ label, value, subtext }) => (
  <div className="flex justify-between items-center py-2 border-b border-stone-800/50 last:border-0">
    <span className="text-stone-500 text-xs uppercase tracking-wider">{label}</span>
    <div className="text-right">
      <span className="text-stone-200 font-medium">{value}</span>
      {subtext && <div className="text-[10px] text-stone-600">{subtext}</div>}
    </div>
  </div>
);

export const ProgressBar: React.FC<{ value: number; max: number; color: string; label: string; icon?: string }> = ({ value, max, color, label, icon }) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  return (
    <div className="w-full mb-4 group">
      <div className="flex justify-between text-xs text-stone-400 mb-1.5 font-serif uppercase tracking-wide">
        <span className="flex items-center gap-1">
          {icon && <span className="opacity-70">{icon}</span>}
          {label}
        </span>
        <span className="group-hover:text-stone-200 transition-colors">{value} / {max}</span>
      </div>
      <div className="h-1.5 w-full bg-stone-950 rounded-full overflow-hidden border border-stone-800/50 relative">
        <div 
          className={`h-full transition-all duration-700 ease-out ${color} shadow-[0_0_10px_currentColor]`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const KarmaBar: React.FC<{ karma: number; label: string; minLabel: string; maxLabel: string }> = ({ karma, label, minLabel, maxLabel }) => {
  const clamped = Math.max(-100, Math.min(100, karma));
  const percentage = Math.abs(clamped) / 2; // Max width 50% of container
  
  const isEvil = clamped < 0;
  const isGood = clamped > 0;

  // Dynamic styles for the swirling effect
  const swirlingDark = `linear-gradient(45deg, #312e81, #000000, #4c1d95)`;
  const swirlingLight = `linear-gradient(45deg, #d97706, #fef3c7, #b45309)`;

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between text-[10px] text-stone-500 mb-1.5 font-serif uppercase tracking-widest">
        <span className={isEvil ? "text-indigo-400 animate-pulse" : ""}>{minLabel}</span>
        <span className="text-stone-400">{label}</span>
        <span className={isGood ? "text-amber-400 animate-pulse" : ""}>{maxLabel}</span>
      </div>
      
      <div className="relative h-2 w-full bg-stone-950 rounded-full border border-stone-800 overflow-hidden">
        {/* Center Marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-stone-700 z-10"></div>
        
        {/* Bar */}
        <div 
          className={`absolute top-0 bottom-0 transition-all duration-1000 ${
            isEvil ? 'right-1/2 rounded-l-full' : 
            isGood ? 'left-1/2 rounded-r-full' : ''
          }`}
          style={{ 
            width: `${percentage}%`,
            background: isEvil ? swirlingDark : isGood ? swirlingLight : 'none',
            boxShadow: isEvil ? '0 0 15px rgba(76, 29, 149, 0.5)' : isGood ? '0 0 15px rgba(217, 119, 6, 0.5)' : 'none',
            opacity: karma === 0 ? 0 : 1
          }}
        />
      </div>
      <div className="text-center text-[10px] mt-1 text-stone-600 font-mono">
        {karma === 0 ? "Balanced" : karma}
      </div>
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-stone-800 text-stone-300 border border-stone-700">
    {children}
  </span>
);

export const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="relative flex items-center my-6">
    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-stone-700 to-transparent"></div>
    {label && (
      <span className="mx-4 text-stone-600 text-xs uppercase tracking-[0.2em] font-serif">
        {label}
      </span>
    )}
    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-stone-700 to-transparent"></div>
  </div>
);