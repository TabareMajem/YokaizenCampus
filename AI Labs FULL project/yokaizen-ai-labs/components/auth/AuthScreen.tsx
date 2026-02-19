
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { Smartphone, ChevronRight, AlertTriangle, Phone, Hash, Mail, Lock, User } from 'lucide-react';
import { Scanlines, Vignette, Noise } from '../ui/Visuals';
import { ValueProposition } from '../onboarding/ValueProposition';
import { audio } from '../../services/audioService';
import { TRANSLATIONS } from '../../translations';
import { detectBrowserLanguage } from '../../constants';
import { Language } from '../../types';

// Google Icon SVG component
const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

export const AuthScreen = () => {
    const { signInWithPhone, verifyOtp, signInWithGoogle, signInWithEmail, registerWithEmail } = useAuth();
    const lang: Language = detectBrowserLanguage(); // Use detected language since user is not logged in

    const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['EN']?.[key] || key;

    // UI States
    const [bootSequence, setBootSequence] = useState(true);
    const [bootLog, setBootLog] = useState<string[]>([]);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState<'SELECT' | 'PHONE' | 'EMAIL' | 'REGISTER'>('SELECT');
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Form States
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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

        // Basic formatting check
        if (phoneNumber.length < 5) {
            setError("Please enter a valid phone number");
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
        } catch (e: any) {
            console.error(e);
            setError(t('auth.connection_failed') + ": " + e.message);
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
        } catch (e: any) {
            setError(e instanceof Error ? e.message : t('auth.invalid_code'));
            audio.playError();
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setIsLoading(true);
        audio.playClick();
        try {
            await signInWithGoogle();
            audio.playSuccess();
        } catch (e: any) {
            console.error("Auth Fail:", e);
            if (e.code === 'auth/unauthorized-domain') {
                setError("Domain not authorized in Firebase Console. Please add this domain.");
            } else {
                setError(e.message || 'Google sign-in failed');
            }
            audio.playError();
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        audio.playClick();
        try {
            if (authMode === 'REGISTER') {
                await registerWithEmail(email, password);
            } else {
                await signInWithEmail(email, password);
            }
            audio.playSuccess();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Authentication failed');
            audio.playError();
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER: BOOT SCREEN ---
    if (bootSequence) {
        return (
            <div className="h-[100dvh] w-full bg-black text-white font-mono p-4 md:p-8 flex flex-col justify-end z-[100] relative overflow-hidden">
                <Scanlines />
                <div className="absolute inset-0 flex items-center justify-center text-white p-6">
                    <Logo size={80} animated />
                </div>
                <div className="space-y-1 z-10 text-[10px] md:text-xs uppercase tracking-widest pb-safe">
                    {bootLog.map((log, i) => (
                        <div key={i} className="flex items-center opacity-50">
                            <span className="mr-2 md:mr-4 text-gray-600">::</span>
                            <span className="typing-effect">{log}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- RENDER: MAIN LANDING ---
    return (
        <div className="h-[100dvh] w-full bg-[#050505] flex flex-col relative overflow-hidden font-sans select-none touch-none">
            {/* INVISIBLE RECAPTCHA CONTAINER */}
            <div id="recaptcha-container"></div>

            {/* AMBIENCE */}
            <Scanlines />
            <Vignette color="#000000" />
            <Noise opacity={0.12} />

            {/* PARALLAX CONTAINER (Desktop Only) */}
            <div
                className="absolute inset-0 pointer-events-none transition-transform duration-75 ease-out hidden md:block"
                style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)` }}
            >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.02] scale-[3] text-white">
                    <Logo size={800} />
                </div>
            </div>

            {/* --- HERO SECTION --- */}
            <div className={`relative z-10 flex-1 flex flex-col items-center justify-center p-6 transition-all duration-500 ${showAuthModal ? 'blur-md scale-95 opacity-50 lg:mr-[480px]' : ''}`}>

                {/* Brand Mark */}
                <div className="mb-8 md:mb-12 relative group cursor-default animate-in fade-in zoom-in duration-1000 w-full max-w-lg">
                    <div className="flex items-center justify-center mb-6 md:mb-8 text-white">
                        <div className="group-hover:scale-110 transition-transform duration-500 shadow-[0_0_50px_rgba(255,255,255,0.2)] rounded-full p-4 md:p-6 bg-black/20 backdrop-blur-sm border border-white/5">
                            <Logo size={window.innerWidth < 768 ? 100 : 140} />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-5xl md:text-9xl font-black text-white tracking-tighter leading-none mb-2 mix-blend-difference text-center relative italic">
                        <span className="relative inline-block">
                            YOKAI
                            <span className="absolute top-0 left-0 text-red-500 opacity-0 group-hover:opacity-50 animate-glitch-1">YOKAI</span>
                        </span>
                        <span className="text-gray-700 ml-1">ZEN</span>
                    </h1>

                    {/* Subtitle */}
                    <div className="hidden md:flex items-center justify-center space-x-4 text-xs md:text-sm font-mono text-gray-500 tracking-[0.8em] uppercase mt-4 border-t border-white/10 pt-4 w-full">
                        <span>{t('auth.slogan_1')}</span>
                        <div className="w-1 h-1 bg-electric rounded-full"></div>
                        <span>{t('auth.slogan_2')}</span>
                        <div className="w-1 h-1 bg-electric rounded-full"></div>
                        <span>{t('auth.slogan_3')}</span>
                    </div>

                    <div className="md:hidden text-[10px] font-mono text-gray-500 tracking-[0.5em] uppercase text-center mt-4 flex items-center justify-center gap-2">
                        <span>NEURAL</span>
                        <div className="w-0.5 h-0.5 bg-electric rounded-full"></div>
                        <span>PROTOCOL</span>
                    </div>
                </div>

                {/* Start Button */}
                <button
                    onClick={() => { setShowAuthModal(true); audio.playClick(); }}
                    className="group relative px-10 md:px-16 py-5 md:py-6 bg-white text-black font-black text-lg md:text-xl tracking-widest uppercase transition-all duration-200 overflow-hidden hover:bg-electric hover:text-white mb-20 md:mb-0"
                    style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}
                    onMouseEnter={() => audio.playHover()}
                >
                    <span className="relative z-10 flex items-center">
                        {t('auth.initialize')} <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>

                {/* Value Proposition Section */}
                <div className="hidden md:block w-full animate-in fade-in slide-in-from-bottom duration-1000 delay-500">
                    <ValueProposition t={t} />
                </div>

                {/* Version Tag */}
                <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 font-mono text-[9px] md:text-[10px] text-gray-600 flex flex-col items-start pb-safe">
                    <span className="text-white font-bold">SYS.VER.9.5.0</span>
                    <span className="opacity-50">SECURE_CHANNEL: LIVE</span>
                    <span className="opacity-50 uppercase tracking-tighter">Mobile-First Optimized</span>
                </div>
            </div>

            {/* --- AUTH OVERLAY (SLIDE IN) --- */}
            {showAuthModal && (
                <div className="absolute inset-y-0 right-0 w-full md:w-[480px] bg-[#050505] border-l border-white/10 shadow-2xl z-[60] animate-in slide-in-from-right md:slide-in-from-right duration-300 md:duration-500 flex flex-col pb-safe">

                    {/* Modal Header */}
                    <div className="p-6 md:p-8 flex justify-between items-center border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 md:relative">
                        <div className="flex items-center space-x-3">
                            <Smartphone size={20} className="text-electric animate-pulse" />
                            <span className="text-[10px] md:text-xs font-black text-white tracking-[0.3em] uppercase font-mono">
                                {t('auth.secure_uplink')}
                            </span>
                        </div>
                        <button
                            onClick={() => { setShowAuthModal(false); setAuthMode('SELECT'); setStep('PHONE'); setError(''); }}
                            className="w-10 h-10 flex items-center justify-center border border-white/10 hover:bg-white hover:text-black transition-all rounded-full bg-white/5 active:scale-90"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Form Container */}
                    <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">

                        {/* === METHOD SELECTION === */}
                        {authMode === 'SELECT' && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
                                        ACCESS YOKAIZEN
                                    </h2>
                                    <p className="text-xs text-gray-500 font-mono">Choose your authentication method</p>
                                </div>

                                {/* Google Sign-In */}
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 px-6 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    <GoogleIcon />
                                    Continue with Google
                                </button>

                                <div className="flex items-center gap-4 text-gray-600 font-mono text-xs">
                                    <div className="flex-1 h-px bg-gray-800" />
                                    <span>OR</span>
                                    <div className="flex-1 h-px bg-gray-800" />
                                </div>

                                {/* Email Sign-In */}
                                <button
                                    onClick={() => { setAuthMode('EMAIL'); audio.playClick(); }}
                                    className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 px-6 rounded-lg font-bold text-sm border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-all active:scale-95"
                                >
                                    <Mail size={18} />
                                    Continue with Email
                                </button>

                                {/* Phone Sign-In */}
                                <button
                                    onClick={() => { setAuthMode('PHONE'); audio.playClick(); }}
                                    className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 px-6 rounded-lg font-bold text-sm border border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-all active:scale-95"
                                >
                                    <Phone size={18} />
                                    Continue with Phone
                                </button>

                                {error && (
                                    <div className="bg-red-950/30 border-l-2 border-red-500 p-3 flex items-center space-x-3 text-red-400 text-xs font-mono animate-shake">
                                        <AlertTriangle size={14} />
                                        <span>ERROR: {error}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* === EMAIL AUTH === */}
                        {(authMode === 'EMAIL' || authMode === 'REGISTER') && (
                            <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in slide-in-from-right">
                                <div className="text-center mb-4">
                                    <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">
                                        {authMode === 'REGISTER' ? 'CREATE ACCOUNT' : 'EMAIL LOGIN'}
                                    </h2>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-electric font-bold uppercase tracking-wider flex items-center">
                                        <Mail size={10} className="mr-1" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-black border-b-2 border-gray-800 text-white py-3 px-2 text-lg focus:border-electric focus:outline-none transition-all placeholder-gray-800 font-mono hover:border-gray-600 focus:bg-white/5"
                                        placeholder="operative@yokaizen.ai"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-electric font-bold uppercase tracking-wider flex items-center">
                                        <Lock size={10} className="mr-1" /> Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-black border-b-2 border-gray-800 text-white py-3 px-2 text-lg focus:border-electric focus:outline-none transition-all placeholder-gray-800 font-mono hover:border-gray-600 focus:bg-white/5"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-950/30 border-l-2 border-red-500 p-3 flex items-center space-x-3 text-red-400 text-xs font-mono animate-shake">
                                        <AlertTriangle size={14} />
                                        <span>ERROR: {error}</span>
                                    </div>
                                )}

                                <Button type="submit" fullWidth size="lg" variant="primary" disabled={isLoading || !email || !password} className="shadow-[0_0_30px_rgba(196,95,255,0.2)] rounded-sm font-black tracking-widest h-14 text-lg border border-white/20 hover:border-white/50">
                                    {isLoading ? t('auth.decrypting') : (authMode === 'REGISTER' ? 'CREATE ACCOUNT' : 'LOGIN')}
                                </Button>

                                <div className="text-center space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode(authMode === 'REGISTER' ? 'EMAIL' : 'REGISTER'); setError(''); }}
                                        className="text-xs text-electric hover:text-white underline"
                                    >
                                        {authMode === 'REGISTER' ? 'Already have an account? Login' : "Don't have an account? Register"}
                                    </button>
                                    <button type="button" onClick={() => { setAuthMode('SELECT'); setError(''); }} className="block w-full text-xs text-gray-500 hover:text-white underline">
                                        ← Back to options
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* === PHONE AUTH === */}
                        {authMode === 'PHONE' && step === 'PHONE' && (
                            <form onSubmit={handlePhoneSubmit} className="space-y-6 animate-in slide-in-from-right">
                                <div className="mb-4 text-center">
                                    <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">
                                        {t('auth.transmit_id')}
                                    </h2>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-electric font-bold uppercase tracking-wider flex items-center">
                                        <Phone size={10} className="mr-1" /> {t('auth.phone_freq')}
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
                                <div className="text-center">
                                    <button type="button" onClick={() => { setAuthMode('SELECT'); setError(''); }} className="text-xs text-gray-500 hover:text-white underline">
                                        ← Back to options
                                    </button>
                                </div>
                            </form>
                        )}

                        {authMode === 'PHONE' && step === 'OTP' && (
                            <form onSubmit={handleOtpSubmit} className="space-y-6 animate-in slide-in-from-right">
                                <div className="mb-4 text-center">
                                    <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">
                                        {t('auth.verify_signal')}
                                    </h2>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-electric font-bold uppercase tracking-wider flex items-center">
                                        <Hash size={10} className="mr-1" /> {t('auth.enc_key')}
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
