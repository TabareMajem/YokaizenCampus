
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { audio } from '../../services/audioService';
import { Brain, ArrowLeft, ArrowRight, Zap, Skull } from 'lucide-react';
import { Scanlines } from '../ui/Visuals';

interface MemoryDiveProps {
  onComplete: (score: number) => void;
}

export const MemoryDive: React.FC<MemoryDiveProps> = ({ onComplete }) => {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'OVER'>('START');
  const [lane, setLane] = useState(1); // 0, 1, 2
  const [score, setScore] = useState(0);
  
  const obstacles = useRef<{y: number, lane: number, type: 'BAD'|'GOOD'}[]>([]);
  const requestRef = useRef<number>(0);
  const speedRef = useRef(5);

  const startGame = () => {
      setGameState('PLAYING');
      setScore(0);
      obstacles.current = [];
      speedRef.current = 5;
      loop();
  };

  const loop = () => {
      setScore(s => s + 1);
      speedRef.current += 0.01;

      // Spawn
      if (Math.random() < 0.05) {
          obstacles.current.push({
              y: -100,
              lane: Math.floor(Math.random() * 3),
              type: Math.random() > 0.8 ? 'GOOD' : 'BAD'
          });
      }

      // Move
      obstacles.current.forEach(o => o.y += speedRef.current);

      // Collision
      let hit = false;
      obstacles.current.forEach(o => {
          if (o.y > 700 && o.y < 800 && o.lane === lane) {
              if (o.type === 'BAD') hit = true;
              else setScore(s => s + 500);
              o.y = 1000; // Remove
          }
      });

      obstacles.current = obstacles.current.filter(o => o.y < 1000);

      if (hit) {
          audio.playError();
          setGameState('OVER');
      } else {
          requestRef.current = requestAnimationFrame(loop);
      }
  };

  useEffect(() => {
      return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const move = (dir: -1 | 1) => {
      setLane(l => Math.max(0, Math.min(2, l + dir)));
      audio.playHover();
  };

  return (
    <div className="h-full bg-purple-950 relative overflow-hidden font-mono select-none">
        <Scanlines />
        
        {/* Tunnel Visual */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,#000_100%)] pointer-events-none z-10"></div>
        <div className="absolute inset-0 flex">
            {[0, 1, 2].map(i => (
                <div key={i} className={`flex-1 border-r border-purple-800/30 relative ${lane === i ? 'bg-purple-900/20' : ''}`}></div>
            ))}
        </div>

        {/* Objects */}
        {obstacles.current.map((o, i) => (
            <div 
                key={i} 
                className={`absolute w-16 h-16 left-0 transition-transform duration-75 flex items-center justify-center ${o.type === 'BAD' ? 'text-red-500' : 'text-cyan-400'}`}
                style={{ 
                    top: o.y, 
                    left: `${o.lane * 33.33}%`,
                    transform: `translateX(50%)`
                }}
            >
                {o.type === 'BAD' ? <Skull size={32} /> : <Brain size={32} />}
            </div>
        ))}

        {/* Player */}
        <div 
            className="absolute bottom-10 w-1/3 h-20 transition-all duration-100 flex justify-center z-20"
            style={{ left: `${lane * 33.33}%` }}
        >
            <div className="w-12 h-12 bg-white rounded-full shadow-[0_0_30px_white] animate-pulse"></div>
        </div>

        {/* UI */}
        <div className="absolute top-4 left-4 text-white text-2xl font-black italic z-30">{score}</div>

        {gameState === 'START' && (
            <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center animate-in zoom-in">
                <h1 className="text-4xl font-black text-white mb-4">NEURAL DIVE</h1>
                <Button size="lg" variant="primary" onClick={startGame}>JACK IN</Button>
            </div>
        )}

        {gameState === 'OVER' && (
            <div className="absolute inset-0 bg-red-900/90 z-50 flex flex-col items-center justify-center animate-in zoom-in">
                <h1 className="text-4xl font-black text-white mb-4">CRASHED</h1>
                <div className="text-2xl mb-8">SCORE: {score}</div>
                <Button variant="secondary" onClick={() => onComplete(score > 1000 ? 100 : 50)}>EJECT</Button>
            </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute inset-0 flex z-40">
            <div className="flex-1" onClick={() => move(-1)}></div>
            <div className="flex-1" onClick={() => move(1)}></div>
        </div>
    </div>
  );
};
