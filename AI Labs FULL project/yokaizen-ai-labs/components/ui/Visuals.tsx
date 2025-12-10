
import React from 'react';

export const Scanlines = () => (
  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-20">
    <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]" />
    <div className="w-full h-2 bg-white/10 absolute top-0 animate-scan" />
  </div>
);

export const Vignette = ({ color = 'black' }: { color?: string }) => (
  <div 
    className="absolute inset-0 pointer-events-none z-20"
    style={{ background: `radial-gradient(circle, transparent 50%, ${color} 100%)` }}
  />
);

export const GlitchText = ({ text, as = 'div', className = '' }: { text: string, as?: any, className?: string }) => {
  const Component = as;
  return (
    <Component className={`relative inline-block ${className} group`}>
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-red-500 opacity-0 group-hover:opacity-70 animate-pulse translate-x-[1px]">{text}</span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-cyan-500 opacity-0 group-hover:opacity-70 animate-pulse -translate-x-[1px]">{text}</span>
    </Component>
  );
};

export const HologramOverlay = () => (
  <div className="absolute inset-0 pointer-events-none z-0 opacity-30 mix-blend-screen">
    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.1)_50%)] bg-[length:100%_4px]" />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent animate-pulse-slow" />
  </div>
);

export const Noise = ({ opacity = 0.05 }) => (
  <div 
    className="absolute inset-0 pointer-events-none z-0"
    style={{ 
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='${opacity}'/%3E%3C/svg%3E")` 
    }}
  />
);
