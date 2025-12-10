
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { Smartphone, ChevronRight, AlertTriangle, Phone, Hash } from 'lucide-react';
import { Scanlines, Vignette, Noise } from '../ui/Visuals';
import { audio } from '../../services/audioService';
import { TRANSLATIONS } from '../../translations';
import { detectBrowserLanguage } from '../../constants';
import { Language } from '../../types';

export const AuthScreen = () => {
  const { signInWithPhone, verifyOtp } = useAuth();
  const lang: Language = detectBrowserLanguage(); // Use detected language since user is not logged in
  
  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['EN']?.[key] || key;
  
  // UI States
  const [bootSequence, setBootSequence] = useState(true);
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Form States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- BOOT SEQUENCE ---
  useEffect(() => {
    const logs = [
      "SYSTEM: YOKAIZEN_OS LOADING...",
      "MOUNTING: SPIRIT_ENGINE...",
      "CONNECTING: NEURAL_NET...",
      "SECURE_CHANNEL: OPEN.",
    ];

    let delay = 0;
    logs.forEach((log, i) => {
      delay += 300;
      setTimeout(() => {
        setBootLog(prev => [...prev, log]);
        if (i < 2) audio.playTyping();
      }, delay);
    });

    setTimeout(() => {
        setBootSequence(false);
        audio.playSuccess(); // Boot sound
    }, delay + 500);
  }, []);

  // --- MOUSE PARALLAX ---
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!phoneNumber.startsWith('+')) {
          setError("Format: +1 555 000 0000");
          audio.playError();
          return;
      }
      setIsLoading(true);
      audio.playClick();
      try {
          const vid = await signInWithPhone(phoneNumber);
          setVerificationId(vid);
          setStep('OTP');
          audio.playSuccess();
      } catch (e) {
          setError(t('auth.connection_failed'));
          audio.playError();
      } finally {
          setIsLoading(false);
      }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      audio.playClick();
      try {
          await verifyOtp(verificationId, otp, phoneNumber);
          audio.playSuccess();
      } catch (e) {
          setError(t('auth.invalid_code'));
          audio.playError();
      } finally {
          setIsLoading(false);
      }
  };

  // --- RENDER: BOOT SCREEN ---
  if (bootSequence) {
    return (
      <div className="h-screen w-full bg-black text-white font-mono p-8 flex flex-col justify-end z-[100] relative overflow-hidden">
        <Scanlines />
        <div className="absolute inset-0 flex items-center justify-center text-white">
            <Logo size={64} animated />
        </div>
        <div className="space-y-1 z-10 text-xs uppercase tracking-widest">
          {bootLog.map((log, i) => (
            <div key={i} className="flex items-center opacity-50">
              <span className="mr-4 text-gray-600">::</span>
              <span className="typing-effect">{log}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN LANDING ---
  return (
    <div className="min-h-screen w-full bg-[#050505] flex flex-col relative overflow-hidden font-sans select-none">
      {/* AMBIENCE */}
      <Scanlines />
      <Vignette color="#000000" />
      <Noise opacity={0.12} />
      
      {/* PARALLAX CONTAINER */}
      <div 
        className="absolute inset-0 pointer-events-none transition-transform duration-75 ease-out"
        style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)` }}
      >
          {/* Huge Background Glyph */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.02] scale-[3] text-white">
              <Logo size={800} />
          </div>
      </div>

      {/* --- HERO SECTION --- */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center p-6 transition-all duration-500 ${showAuthModal ? 'blur-md scale-95 opacity-50' : ''}`}>
        
        {/* Brand Mark */}
        <div className="mb-12 relative group cursor-default animate-in fade-in zoom-in duration-1000">
          <div className="flex items-center justify-center mb-8 text-white">
             <div className="group-hover:scale-110 transition-transform duration-500 shadow-[0_0_50px_rgba(255,255,255,0.2)] rounded-full p-4">
                 <Logo size={140} />
             </div>
          </div>
          
          {/* Title */}
          <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter leading-none mb-2 mix-blend-difference text-center relative">
            <span className="relative inline-block">
                YOKAI
                <span className="absolute top-0 left-0 text-red-500 opacity-0 group-hover:opacity-50 animate-glitch-1">YOKAI</span>
            </span>
            <span className="text-gray-700">ZEN</span>
          </h1>
          
          {/* Subtitle */}
          <div className="flex items-center justify-center space-x-4 text-xs md:text-sm font-mono text-gray-500 tracking-[0.8em] uppercase mt-4 border-t border-white/10 pt-4 w-full max-w-lg mx-auto">
            <span>{t('auth.slogan_1')}</span>
            <div className="w-1 h-1 bg-electric rounded-full"></div>
            <span>{t('auth.slogan_2')}</span>
            <div className="w-1 h-1 bg-electric rounded-full"></div>
            <span>{t('auth.slogan_3')}</span>
          </div>
        </div>

        {/* Start Button */}
        <button 
            onClick={() => { setShowAuthModal(true); audio.playClick(); }}
            className="group relative px-16 py-6 bg-white text-black font-black text-xl tracking-widest uppercase transition-all duration-200 overflow-hidden hover:bg-electric hover:text-white"
            style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}
            onMouseEnter={() => audio.playHover()}
        >
            <span className="relative z-10 flex items-center">
                {t('auth.initialize')} <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>

        {/* Version Tag */}
        <div className="absolute bottom-8 left-8 font-mono text-[10px] text-gray-600 flex flex-col items-start">
            <span className="text-white font-bold">SYS.VER.9.4.2</span>
            <span>SECURE_CONNECTION: TRUE</span>
            <span>LATENCY: 12ms</span>
        </div>
      </div>

      {/* --- AUTH OVERLAY (SLIDE IN) --- */}
      {showAuthModal && (
        <div className="absolute inset-y-0 right-0 w-full md:w-[480px] bg-[#080808] border-l border-white/10 shadow-2xl z-[60] animate-in slide-in-from-right duration-300 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-8 pb-4 flex justify-between items-center border-b border-white/10 bg-black/50 backdrop-blur">
                <div className="flex items-center space-x-3">
                    <Smartphone size={24} className="text-electric" />
                    <span className="text-sm font-bold text-white tracking-widest uppercase font-mono">
                        {t('auth.secure_uplink')}
                    </span>
                </div>
                <button 
                    onClick={() => { setShowAuthModal(false); setStep('PHONE'); }} 
                    className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white hover:text-black transition-colors rounded-sm"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Form Container */}
            <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
                        {step === 'PHONE' ? t('auth.transmit_id') : t('auth.verify_signal')}
                    </h2>
                </div>

                {step === 'PHONE' && (
                    <form onSubmit={handlePhoneSubmit} className="space-y-6 animate-in slide-in-from-right">
                        <div className="space-y-2">
                            <label className="text-[10px] text-electric font-bold uppercase tracking-wider flex items-center">
                                <Phone size={10} className="mr-1"/> {t('auth.phone_freq')}
                            </label>
                            <input 
                                type="tel" 
                                required
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value)}
                                className="w-full bg-black border-b-2 border-gray-800 text-white py-3 px-2 text-xl focus:border-electric focus:outline-none transition-all placeholder-gray-800 font-mono tracking-wider hover:border-gray-600 focus:bg-white/5"
                                placeholder="+1 555 000 0000"
                            />
                        </div>
                        {error && (
                            <div className="bg-red-950/30 border-l-2 border-red-500 p-3 flex items-center space-x-3 text-red-400 text-xs font-mono animate-shake">
                                <AlertTriangle size={14} />
                                <span>ERROR: {error}</span>
                            </div>
                        )}
                        <Button type="submit" fullWidth size="lg" variant="primary" disabled={isLoading || !phoneNumber} className="shadow-[0_0_30px_rgba(196,95,255,0.2)] rounded-sm font-black tracking-widest h-14 text-lg border border-white/20 hover:border-white/50">
                            {isLoading ? t('auth.establishing') : t('auth.send_token')}
                        </Button>
                    </form>
                )}

                {step === 'OTP' && (
                    <form onSubmit={handleOtpSubmit} className="space-y-6 animate-in slide-in-from-right">
                        <div className="space-y-2">
                            <label className="text-[10px] text-electric font-bold uppercase tracking-wider flex items-center">
                                <Hash size={10} className="mr-1"/> {t('auth.enc_key')}
                            </label>
                            <input 
                                type="text" 
                                required
                                maxLength={6}
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                className="w-full bg-black border-b-2 border-gray-800 text-white py-3 px-2 text-3xl focus:border-electric focus:outline-none transition-all placeholder-gray-800 font-mono tracking-[1em] text-center hover:border-gray-600 focus:bg-white/5"
                                placeholder="000000"
                            />
                        </div>
                        {error && (
                            <div className="bg-red-950/30 border-l-2 border-red-500 p-3 flex items-center space-x-3 text-red-400 text-xs font-mono animate-shake">
                                <AlertTriangle size={14} />
                                <span>ERROR: {error}</span>
                            </div>
                        )}
                        <Button type="submit" fullWidth size="lg" variant="primary" disabled={isLoading || otp.length !== 6} className="shadow-[0_0_30px_rgba(196,95,255,0.2)] rounded-sm font-black tracking-widest h-14 text-lg border border-white/20 hover:border-white/50">
                            {isLoading ? t('auth.decrypting') : t('auth.access_system')}
                        </Button>
                        <div className="text-center">
                            <button type="button" onClick={() => setStep('PHONE')} className="text-xs text-gray-500 hover:text-white underline">
                                {t('auth.wrong_number')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            
            {/* Decorative Bottom Bar */}
            <div className="h-2 w-full bg-gradient-to-r from-electric via-purple-600 to-cyan-500"></div>
        </div>
      )}
    </div>
  );
};
