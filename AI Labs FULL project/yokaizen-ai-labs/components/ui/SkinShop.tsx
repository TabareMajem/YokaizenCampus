
import React from 'react';
import { Button } from './Button';
import { useToast } from '../../contexts/ToastContext';
import { GAME_SKINS } from '../../constants';
import { GameType, Skin, UserStats } from '../../types';
import { ShoppingBag, Check, Lock } from 'lucide-react';
import { audio } from '../../services/audioService';

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
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col p-6 animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white italic uppercase tracking-wider flex items-center">
                    <ShoppingBag className="mr-2 text-amber-400" /> Loadout
                </h2>
                <div className="text-right">
                    <div className="text-xs text-gray-400 font-bold uppercase">Balance</div>
                    <div className="text-xl font-mono text-cyan-400">{user.credits} CR</div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 pb-20">
                {availableSkins.map(skin => {
                    const isUnlocked = user.unlockedSkins.includes(skin.id);
                    const equipKey = skin.type === 'TRAIL' ? `${gameType}_TRAIL` : gameType;
                    const isEquipped = user.equippedSkins[equipKey] === skin.id;

                    return (
                        <div key={skin.id} className={`relative p-4 rounded-xl border-2 flex flex-col items-center text-center transition-all ${isEquipped ? 'border-green-500 bg-green-900/20' : 'border-gray-800 bg-gray-900/50'}`}>
                            <div className="mb-4 w-16 h-16 flex items-center justify-center relative">
                                {skin.type === 'TRAIL' ? (
                                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: skin.assetUrl, boxShadow: `0 0 15px ${skin.assetUrl}` }}></div>
                                ) : (
                                    <img src={skin.assetUrl} className="w-full h-full object-contain drop-shadow-md" />
                                )}
                                {isEquipped && <div className="absolute -top-2 -right-2 bg-green-500 text-black rounded-full p-1"><Check size={12} strokeWidth={4} /></div>}
                            </div>

                            <div className="text-sm font-bold text-white mb-1">{skin.name}</div>
                            <div className={`text-[9px] font-bold uppercase mb-4 px-2 py-0.5 rounded ${skin.rarity === 'LEGENDARY' ? 'bg-amber-500/20 text-amber-400' : skin.rarity === 'RARE' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-700 text-gray-400'}`}>
                                {skin.rarity} {skin.type === 'TRAIL' ? 'TRAIL' : 'SKIN'}
                            </div>

                            <div className="mt-auto w-full">
                                {isUnlocked ? (
                                    <Button size="sm" fullWidth variant={isEquipped ? 'ghost' : 'secondary'} onClick={() => handleEquip(skin)} disabled={isEquipped}>
                                        {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                                    </Button>
                                ) : (
                                    <Button size="sm" fullWidth variant="primary" onClick={() => handleBuy(skin)}>
                                        {skin.cost === 0 ? 'FREE' : `${skin.cost} CR`}
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-4 border-t border-white/10">
                <Button fullWidth variant="ghost" onClick={onClose}>RETURN TO GAME</Button>
            </div>
        </div>
    );
};
