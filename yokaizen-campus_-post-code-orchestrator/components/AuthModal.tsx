import React, { useState, useRef } from 'react';
import { UserRole, Language } from '../types';
import { useAuth } from '../context/AuthContext';
import { TERMS } from '../translations';
import { ShieldCheck, UserPlus, LogIn, AlertCircle, Globe, Eye, EyeOff, Zap } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Sparkles, Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const AnimatedSphere = ({ isLogin }: { isLogin: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1, 64, 64]} scale={isLogin ? 1.6 : 1.8}>
        <MeshDistortMaterial
          color={isLogin ? "#00f0ff" : "#b026ff"}
          emissive={isLogin ? "#00f0ff" : "#b026ff"}
          emissiveIntensity={1.5}
          distort={0.4}
          speed={3}
          roughness={0.1}
          metalness={0.9}
          clearcoat={1}
        />
      </Sphere>
    </Float>
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, language, setLanguage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();

  const T = TERMS[language].AUTH;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isForgotPassword) {
      if (!email) {
        setError('Email is required');
        return;
      }
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setResetSent(true);
      } catch (err: any) {
        setError(err.message || 'Reset failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!isLogin && !name) {
      setError('Name is required for registration');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const themeColor = isLogin ? 'text-neon-blue' : 'text-neon-purple';
  const themeBorder = isLogin ? 'border-neon-blue' : 'border-neon-purple';
  const themeBg = isLogin ? 'bg-neon-blue' : 'bg-neon-purple';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans overflow-hidden">

      {/* 3D WebGL Background Layer */}
      <div className="absolute inset-0 bg-black z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={2} color={isLogin ? "#00f0ff" : "#b026ff"} />
          <pointLight position={[-10, -10, -10]} intensity={2} color="#ffffff" />

          <AnimatedSphere isLogin={isLogin} />
          <Sparkles count={300} scale={12} size={3} speed={0.4} opacity={0.6} color={isLogin ? "#00f0ff" : "#b026ff"} />

          <EffectComposer>
            <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} height={300} intensity={2.5} />
            <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003, 0.003)} />
          </EffectComposer>
        </Canvas>
        {/* Subtle overlay to guarantee text legibility */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
      </div>

      {/* Main Glassmorphism Panel */}
      <div className={`relative z-10 w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-700 ${isLogin ? 'shadow-neon-blue/20' : 'shadow-neon-purple/20'}`}>

        {/* Dynamic Top Gradient Bar */}
        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${isLogin ? 'from-transparent via-neon-blue to-transparent' : 'from-transparent via-neon-purple to-transparent'}`}></div>

        {/* Global Language Selector */}
        <div className="absolute top-5 right-5 z-50">
          <div className="relative group">
            <button className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
              <Globe className="w-5 h-5" />
            </button>
            <div className="absolute top-full right-0 mt-2 w-36 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl hidden group-hover:block max-h-56 overflow-y-auto z-50">
              {Object.values(Language).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang as Language)}
                  className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${language === lang ? themeColor : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8 pt-2">
            <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-5 border shadow-lg ${isLogin ? 'bg-neon-blue/10 border-neon-blue/50 shadow-neon-blue/20' : 'bg-neon-purple/10 border-neon-purple/50 shadow-neon-purple/20'}`}>
              <ShieldCheck className={`w-10 h-10 ${themeColor}`} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-widest uppercase">
              {isForgotPassword ? (T.RESET_PASSWORD || 'RESET PASSWORD') : (isLogin ? T.SECURITY_CLEARANCE : T.REGISTRATION)}
            </h2>
            <p className="text-white/60 text-xs sm:text-sm mt-2 uppercase tracking-widest font-bold">
              {isForgotPassword ? (T.RESET_SUBTITLE || 'Recover Access') : T.SUBTITLE}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isForgotPassword ? (
              resetSent ? (
                <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50">
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{T.RESET_SENT || 'Reset Link Sent'}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{T.RESET_DESC || 'If an account exists for this email, you will receive instructions to reset your password.'}</p>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
                    className="mt-6 w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all border border-white/10"
                  >
                    {T.BACK_TO_LOGIN || 'Back to Login'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-white/60 text-sm mb-6 text-center">{T.RESET_INST || 'Enter your email to receive a password reset link.'}</p>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-white/70 mb-2 uppercase tracking-widest">{T.EMAIL}</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full bg-black/30 border border-white/20 rounded-xl p-4 text-white focus:${themeBorder} focus:bg-black/50 focus:outline-none transition-all placeholder-white/30 text-base`}
                      placeholder="cadet@bridge.edu"
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-white text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 mt-8 text-base tracking-widest uppercase"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : (T.SEND_RESET || 'Send Reset Link')}
                  </button>

                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(false); setError(''); }}
                      className="text-white/50 text-xs sm:text-sm hover:text-white transition-colors underline decoration-white/30 underline-offset-8 uppercase tracking-widest font-bold"
                    >
                      {T.BACK_TO_LOGIN || 'Back to Login'}
                    </button>
                  </div>
                </div>
              )
            ) : (
              // Login / Register Flow
              <>
                {!isLogin && (
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-white/70 mb-2 uppercase tracking-widest">{T.NAME}</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full bg-black/30 border border-white/20 rounded-xl p-4 text-white focus:${themeBorder} focus:bg-black/50 focus:outline-none transition-all placeholder-white/30 text-base`}
                      placeholder="e.g. Maverick"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-white/70 mb-2 uppercase tracking-widest">{T.EMAIL}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-black/30 border border-white/20 rounded-xl p-4 text-white focus:${themeBorder} focus:bg-black/50 focus:outline-none transition-all placeholder-white/30 text-base`}
                    placeholder="cadet@bridge.edu"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-widest">
                      {T.PASSWORD || 'Password'}
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(''); }}
                        className={`text-[10px] sm:text-xs font-bold ${themeColor} hover:text-white transition-colors uppercase tracking-widest`}
                      >
                        {T.FORGOT_PASSWORD || 'Forgot?'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full bg-black/30 border border-white/20 rounded-xl p-4 pr-12 text-white focus:${themeBorder} focus:bg-black/50 focus:outline-none transition-all placeholder-white/30 text-base tracking-widest`}
                      placeholder="••••••••"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {!isLogin && (
                    <p className="text-[10px] sm:text-xs text-white/50 mt-2 font-bold tracking-widest">MINIMUM 8 CHARACTERS</p>
                  )}
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-white/70 mb-2 uppercase tracking-widest">Clearance Level</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.STUDENT)}
                        className={`flex-1 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest border transition-all ${role === UserRole.STUDENT ? 'bg-neon-blue/20 border-neon-blue text-white shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-black/30 border-white/10 text-white/50 hover:border-white/30'}`}
                      >
                        STUDENT
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.TEACHER)}
                        className={`flex-1 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest border transition-all ${role === UserRole.TEACHER ? 'bg-neon-purple/20 border-neon-purple text-white shadow-[0_0_15px_rgba(176,38,255,0.3)]' : 'bg-black/30 border-white/10 text-white/50 hover:border-white/30'}`}
                      >
                        TEACHER
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 mt-8 rounded-xl font-black text-lg tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 ${loading ? 'bg-white/20 text-white/50 cursor-not-allowed' : `bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.5)] hover:shadow-[0_0_30px_rgba(255,255,255,1)] hover:${themeColor}`}`}
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    isLogin ? <><LogIn className="w-5 h-5" /> {T.ACCESS_SYSTEM}</> : <><UserPlus className="w-5 h-5" /> {T.REGISTER}</>
                  )}
                </button>

                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(''); setPassword(''); }}
                    className="text-white/50 text-xs sm:text-sm hover:text-white transition-colors underline decoration-white/30 underline-offset-8 uppercase tracking-widest font-bold"
                  >
                    {isLogin ? T.SWITCH_REGISTER : T.SWITCH_LOGIN}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};