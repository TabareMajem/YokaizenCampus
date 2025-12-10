
import React from 'react';

export const Logo: React.FC<{ size?: number, className?: string, animated?: boolean }> = ({ size = 40, className = "", animated = true }) => (
  <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
    {/* The Enso (Zen Circle) - Broken & Glitched */}
    <svg viewBox="0 0 100 100" className={`absolute inset-0 w-full h-full opacity-80 ${animated ? 'animate-spin-slow' : ''}`}>
      <path d="M 50 10 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_0_10px_currentColor]" />
      <path d="M 90 50 A 40 40 0 0 1 50 90" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 15" className="opacity-50" />
      <path d="M 50 90 A 40 40 0 0 1 10 50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <path d="M 10 50 A 40 40 0 0 1 40 10" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
    </svg>
    
    {/* The Sigil (Y / Torii Gate Abstract) */}
    <div className="relative z-10 w-1/2 h-1/2 flex flex-col items-center justify-center pointer-events-none">
       <div className="w-full h-[10%] bg-current mb-[10%] shadow-[0_0_15px_currentColor]"></div>
       <div className="w-3/4 h-[10%] bg-current mb-[20%] shadow-[0_0_15px_currentColor]"></div>
       <div className="flex space-x-[20%] h-full w-full justify-center">
           <div className="w-[10%] h-full bg-current shadow-[0_0_15px_currentColor]"></div>
           <div className="w-[10%] h-full bg-current shadow-[0_0_15px_currentColor]"></div>
       </div>
    </div>
  </div>
);
