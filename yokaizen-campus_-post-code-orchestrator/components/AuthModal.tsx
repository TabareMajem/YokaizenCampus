import React, { useState } from 'react';
import { UserRole, Language } from '../types';
import { useAuth } from '../context/AuthContext';
import { TERMS } from '../translations';
import { ShieldCheck, UserPlus, LogIn, AlertCircle, Globe, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, language, setLanguage }) => {
  const [isLogin, setIsLogin] = useState(true);
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

    // Validation
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue to-neon-purple"></div>

        {/* Lang Selector */}
        <div className="absolute top-4 right-4 z-50">
          <div className="relative group">
            <button className="text-slate-500 hover:text-white"><Globe className="w-4 h-4" /></button>
            <div className="absolute top-full right-0 mt-2 w-32 bg-slate-950 border border-slate-700 rounded shadow-xl hidden group-hover:block max-h-48 overflow-y-auto">
              {Object.values(Language).map((lang) => (
                <button key={lang} onClick={() => setLanguage(lang as Language)} className="w-full text-left px-3 py-2 text-[10px] hover:bg-slate-800 text-slate-300">
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4 ring-2 ring-slate-700">
              <ShieldCheck className="w-8 h-8 text-neon-blue" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-widest">
              {isLogin ? T.SECURITY_CLEARANCE : T.REGISTRATION}
            </h2>
            <p className="text-slate-400 text-xs mt-2 uppercase tracking-wide">
              {T.SUBTITLE}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">{T.NAME}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-neon-blue focus:outline-none transition-colors"
                  placeholder="e.g. Maverick"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">{T.EMAIL}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-neon-blue focus:outline-none transition-colors"
                placeholder="cadet@bridge.edu"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                {T.PASSWORD || 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-3 pr-10 text-white focus:border-neon-blue focus:outline-none transition-colors"
                  placeholder="••••••••"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Clearance Level</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.STUDENT)}
                    className={`p-3 rounded text-xs font-bold border transition-all ${role === UserRole.STUDENT ? 'bg-neon-blue/20 border-neon-blue text-white' : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                  >
                    STUDENT
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.TEACHER)}
                    className={`p-3 rounded text-xs font-bold border transition-all ${role === UserRole.TEACHER ? 'bg-neon-purple/20 border-neon-purple text-white' : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                  >
                    TEACHER
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-900/20 border border-rose-500/50 rounded text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-bold rounded hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              ) : (
                isLogin ? <><LogIn className="w-4 h-4" /> {T.ACCESS_SYSTEM}</> : <><UserPlus className="w-4 h-4" /> {T.REGISTER}</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setPassword(''); }}
              className="text-slate-500 text-xs hover:text-white transition-colors underline decoration-slate-700 underline-offset-4"
            >
              {isLogin ? T.SWITCH_REGISTER : T.SWITCH_LOGIN}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};