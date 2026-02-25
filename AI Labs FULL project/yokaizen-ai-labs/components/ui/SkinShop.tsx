
import React from 'react';
import { Button } from './Button';
import { useToast } from '../../contexts/ToastContext';
import { GAME_SKINS } from '../../constants';
import { GameType, Skin, UserStats } from '../../types';
import { ShoppingBag, Check, Lock, Zap } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Canvas } from '@react-three/fiber';
import { Sparkles as DreiSparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

interface SkinShopProps {
    gameType: GameType;
    user: UserStats;
    onUpdateUser: (user: UserStats) => void;
    onClose: () => void;
}

export const SkinShop: React.FC<SkinShopProps> = ({ gameType, user, onUpdateUser, onClose }) => {

    const availableSkins = GAME_SKINS.filter(s => s.gameId === gameType);
    const { showToast } = useToast();

    const handleBuy = (skin: Skin) => {
        if (user.credits >= skin.cost) {
            onUpdateUser({
                ...user,
                credits: user.credits - skin.cost,
                unlockedSkins: [...user.unlockedSkins, skin.id]
            });
            audio.playSuccess();
        } else {
            audio.playError();
            showToast("Insufficient Credits", 'error');
        }
    };

    const handleEquip = (skin: Skin) => {
        const key = skin.type === 'TRAIL' ? `${gameType}_TRAIL` : gameType;
        onUpdateUser({
            ...user,
            equippedSkins: {
                ...user.equippedSkins,
                [key]: skin.id
            }
        });
        audio.playClick();
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col p-6 animate-in fade-in overflow-hidden backdrop-blur-xl">
            {/* AAA WebGL Background for Shop */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <DreiSparkles count={300} scale={12} size={2} speed={0.1} opacity={0.5} color="#fbbf24" />
                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2} />
                    </EffectComposer>
                </Canvas>
            </div>

            <div className="absolute inset-0 bg-[url('/assets/aaa/grid-pattern.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>

            <div className="relative z-10 flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <h2 className="text-3xl font-black text-white italic uppercase tracking-wider flex items-center drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                    <ShoppingBag className="mr-3 text-amber-400" size={32} /> Loadout Arsenal
                </h2>
                <div className="text-right bg-black/40 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Available Balance</div>
                    <div className="text-2xl font-mono text-cyan-400 font-bold flex items-center justify-end">
                        <Zap size={16} className="mr-1 text-cyan-500" /> {user.credits} <span className="text-sm ml-1 text-cyan-700">CR</span>
                    </div>
                </div>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 pb-20 custom-scrollbar pr-2">
                {availableSkins.map(skin => {
                    const isUnlocked = user.unlockedSkins.includes(skin.id);
                    const equipKey = skin.type === 'TRAIL' ? `${gameType}_TRAIL` : gameType;
                    const isEquipped = user.equippedSkins[equipKey] === skin.id;

                    const rarityColor = skin.rarity === 'LEGENDARY' ? 'amber' : skin.rarity === 'RARE' ? 'cyan' : 'gray';

                    return (
                        <div key={skin.id} className={`group relative p-5 rounded-2xl border flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 ${isEquipped ? 'border-green-500 bg-green-900/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : `border-${rarityColor}-500/30 bg-gray-900/60 hover:border-${rarityColor}-400 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]`}`}>
                            <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent rounded-2xl pointer-events-none"></div>

                            <div className="mb-6 w-24 h-24 flex items-center justify-center relative mt-2 group-hover:scale-110 transition-transform duration-500">
                                {skin.type === 'TRAIL' ? (
                                    <div className="w-12 h-12 rounded-full relative" style={{ backgroundColor: skin.assetUrl, boxShadow: `0 0 25px ${skin.assetUrl}` }}>
                                        <div className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ backgroundColor: skin.assetUrl }}></div>
                                    </div>
                                ) : (
                                    <img src={skin.assetUrl} className={`w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] ${!isUnlocked && 'grayscale opacity-50'}`} />
                                )}
                                {isEquipped && <div className="absolute -top-2 -right-2 bg-green-500 text-black rounded-full p-1.5 shadow-[0_0_15px_rgba(34,197,94,0.8)]"><Check size={14} strokeWidth={4} /></div>}
                                {!isUnlocked && <div className="absolute inset-0 flex items-center justify-center"><Lock size={32} className="text-gray-500 drop-shadow-md" /></div>}
                            </div>

                            <div className="text-sm font-black text-white mb-2 tracking-wide">{skin.name}</div>

                            <div className={`text-[9px] font-black tracking-widest uppercase mb-5 px-3 py-1 rounded w-full border border-current bg-${rarityColor}-500/10 text-${rarityColor}-400`}>
                                {skin.rarity} {skin.type === 'TRAIL' ? 'TRAIL' : 'SKIN'}
                            </div>

                            <div className="mt-auto w-full relative z-10">
                                {isUnlocked ? (
                                    <Button size="sm" fullWidth variant={isEquipped ? 'ghost' : 'secondary'} onClick={() => handleEquip(skin)} disabled={isEquipped} className={isEquipped ? 'opacity-50' : 'hover:scale-105'}>
                                        {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                                    </Button>
                                ) : (
                                    <Button size="sm" fullWidth variant={user.credits >= skin.cost ? 'primary' : 'ghost'} onClick={() => handleBuy(skin)} className="hover:scale-105 shadow-lg">
                                        <span className="flex items-center justify-center">{skin.cost === 0 ? 'FREE' : <><Zap size={14} className="mr-1" /> {skin.cost} CR</>}</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-6 mt-auto relative z-10 select-none">
                <Button fullWidth variant="ghost" onClick={onClose} className="border border-white/10 hover:bg-white/5 py-4 text-gray-400 hover:text-white uppercase tracking-widest text-xs font-bold transition-all">
                    Initialize Deployment (Return to Game)
                </Button>
            </div>
        </div>
    );
};
