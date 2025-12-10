import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, hoverEffect = false }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        glass-panel rounded-xl p-4 
        ${hoverEffect ? 'hover:border-electric/50 transition-colors cursor-pointer active:scale-[0.98] duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};