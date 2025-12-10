
import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface PreloaderProps {
  onComplete: () => void;
  assets: string[];
}

export const Preloader: React.FC<PreloaderProps> = ({ onComplete, assets }) => {
  const [progress, setProgress] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = (src: string) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = resolve; // Continue even if one fails
      });
    };

    const loadAll = async () => {
      if (assets.length === 0) {
          if (isMounted) onComplete();
          return;
      }

      for (let i = 0; i < assets.length; i++) {
        await loadImage(assets[i]);
        if (isMounted) {
            setLoadedCount(prev => prev + 1);
            setProgress(((i + 1) / assets.length) * 100);
        }
      }
      
      // Artificial delay for smooth boot effect
      setTimeout(() => {
          if (isMounted) onComplete();
      }, 500);
    };

    loadAll();

    return () => { isMounted = false; };
  }, [assets]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center font-mono">
        <div className="relative mb-8">
            <Logo size={80} animated />
            <div className="absolute inset-0 bg-electric/20 blur-xl rounded-full animate-pulse"></div>
        </div>
        
        <div className="w-64 space-y-2">
            <div className="flex justify-between text-xs text-electric font-bold">
                <span>SYSTEM_BOOT</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-electric transition-all duration-100 ease-linear shadow-[0_0_10px_#C45FFF]" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="text-[10px] text-gray-500 text-center pt-2">
                LOADING ASSETS ({loadedCount}/{assets.length})
            </div>
        </div>
    </div>
  );
};
