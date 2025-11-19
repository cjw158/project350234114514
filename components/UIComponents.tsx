
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-4 py-2 rounded border transition-all duration-200 font-serif tracking-wide disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-stone-800 border-amber-700 text-amber-500 hover:bg-stone-700 hover:text-amber-400 hover:border-amber-500 shadow-[0_0_10px_rgba(180,83,9,0.1)]",
    secondary: "bg-stone-900 border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200",
    danger: "bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50 hover:text-red-300",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const ProgressBar: React.FC<{ value: number; max: number; color: string; label: string }> = ({ value, max, color, label }) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  return (
    <div className="w-full mb-2">
      <div className="flex justify-between text-[10px] md:text-xs text-stone-400 mb-1 font-serif">
        <span>{label}</span>
        <span>{value} / {max}</span>
      </div>
      <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden border border-stone-700">
        <div 
          className={`h-full transition-all duration-500 ${color}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const Divider: React.FC = () => (
  <div className="flex items-center my-3 md:my-4 opacity-50">
    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-amber-800 to-transparent"></div>
    <div className="mx-2 text-amber-900 text-[10px] md:text-xs">✦</div>
    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-amber-800 to-transparent"></div>
  </div>
);
