

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { PhilosophyMode, Language, User, AuditLogEntry, ClassroomStudentSummary } from '../types';
import { TERMS } from '../translations';
import { generateLessonPlan } from '../services/gemini';
import { API } from '../services/api';
import { SettingsModal } from './SettingsModal';
import { AITutorModal } from './AITutorModal';
import { TimelinePlayer } from './TimelinePlayer';
import {
  Sliders, Activity, Users, Send, BookOpen,
  BarChart3, Eye, ShieldAlert, Pause,
  Terminal, Globe, LogOut, Settings, Sparkles, FileJson, Info, X, Play, Save, CheckCircle2
} from 'lucide-react';

interface TeacherViewProps {
  currentMode: PhilosophyMode;
  onModeChange: (mode: PhilosophyMode) => void;
  onSwitchToStudent: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  user: User;
  onLogout: () => void;
}

type Tab = 'LIVEOPS' | 'CURRICULUM' | 'SYSTEM';

export const TeacherView: React.FC<TeacherViewProps> = ({ currentMode, onModeChange, onSwitchToStudent, language, onLanguageChange, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('LIVEOPS');
  const [topic, setTopic] = useState("");
  const [generatedLesson, setGeneratedLesson] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAthenaOpen, setIsAthenaOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [students, setStudents] = useState<ClassroomStudentSummary[]>([]);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const T = TERMS[language];
  const TT = TERMS[language].TEACHER;
  const TC = TERMS[language].COMMON;

  useEffect(() => {
    // Initial data fetch
    const fetchStatus = async () => {
      try {
        const data = await API.classroom.getLiveStatus();
        setStudents(data);
      } catch (e) {
        console.error("Failed to fetch classroom status");
      }
    };
    fetchStatus();

    // Connect WebSocket for real-time grid updates
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    // Clean up trailing /api/v1 if it exists in env, since socket.io typically binds to the root URL
    const socketUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token: localStorage.getItem('access_token') }
    });

    socket.on('connect', () => console.log('Live Grid WS Connected'));

    socket.on('classroom_status_update', (data: ClassroomStudentSummary[]) => {
      setStudents(data);
    });

    socket.on('disconnect', () => console.log('Live Grid WS Disconnected'));

    return () => {
      socket.disconnect();
    };
  }, []);

  const studentHistory: AuditLogEntry[] = JSON.parse(localStorage.getItem('last_student_history') || '[]');

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    try {
      const plan = await generateLessonPlan(topic, currentMode, language);
      setGeneratedLesson(plan);
    } catch (e) {
      showToast(TC.GEN_FAILED, 'error');
    }
    setIsGenerating(false);
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg) return;
    try {
      await API.classroom.broadcastMessage(broadcastMsg);
      setBroadcastMsg("");
      showToast(TC.BROADCAST_SENT);
    } catch (e) {
      showToast("Failed to send broadcast", 'error');
    }
  };

  const handleDeploy = async () => {
    if (!generatedLesson) return;
    try {
      await API.graph.create(undefined, generatedLesson.title);
      showToast(TC.DEPLOYED_MSG);
    } catch (e) {
      showToast("Deploy failed", "error");
    }
  };

  const handleSaveDraft = async () => {
    if (!generatedLesson) return;
    try {
      await API.graph.create(undefined, `${generatedLesson.title} (Draft)`);
      showToast(TC.DRAFT_SAVED);
    } catch (e) {
      showToast("Save draft failed", "error");
    }
  };

  const getLocalizedAction = (action: string) => {
    // @ts-ignore
    return T.STUDENT_ACTIONS?.[action] || action;
  };

  const getLocalizedStatus = (status: string) => {
    if (status === 'FLOW') return T.FLOW;
    if (status === 'STUCK') return T.STUCK;
    return status;
  };

  const getThemeColor = () => {
    switch (currentMode) {
      case PhilosophyMode.FINLAND: return "text-amber-500 border-amber-500/50 bg-amber-500/10";
      case PhilosophyMode.KOREA: return "text-red-500 border-red-500/50 bg-red-500/10";
      default: return "text-cyan-500 border-cyan-500/50 bg-cyan-500/10";
    }
  };

  return (
    <div className={`w-full h-full font-mono flex flex-col overflow-hidden transition-colors duration-500 ${currentMode === PhilosophyMode.FINLAND ? 'bg-[#1c1917] text-stone-300 font-serif' : 'bg-slate-950 text-slate-200'}`}>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} language={language} />
      <AITutorModal isOpen={isAthenaOpen} onClose={() => setIsAthenaOpen(false)} language={language} contextData={{ students: students, mode: currentMode }} />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-500 text-white'
          }`}>
          {toast.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Top Bar */}
      <div className={`flex justify-between items-center px-4 md:px-6 py-4 border-b ${currentMode === PhilosophyMode.KOREA ? 'border-red-900 bg-red-950/10' : 'border-slate-800 bg-slate-900/50'}`}>
        <div className="flex items-center gap-4">
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 border border-slate-700 rounded text-slate-400">
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
              {/* Re-using Settings icon as Menu for now if Menu icon not imported, or added Menu icon to import list */}
            </button>
          </div>
          <div className={`p-2 rounded ${getThemeColor()}`}>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-widest">{T.BRIDGE_COMMAND}</h1>
            <p className="text-[10px] opacity-60 uppercase hidden md:block">{user.name} // {user.role}</p>
          </div>
        </div>

        <div className="flex gap-2 md:gap-4 items-center">
          {/* Language Selector */}
          <div className="relative group hidden md:block">
            <button className="px-3 py-2 border border-slate-700 hover:bg-slate-800 text-xs rounded transition-colors flex items-center gap-2">
              <Globe className="w-3 h-3" /> {language}
            </button>
            <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded shadow-xl hidden group-hover:block z-50">
              {Object.values(Language).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang as Language)}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 text-slate-300"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:flex bg-slate-900 rounded p-1 border border-slate-700">
            {(['LIVEOPS', 'CURRICULUM', 'SYSTEM'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeTab === tab ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {T[tab]}
              </button>
            ))}
          </div>

          <button onClick={() => setIsSettingsOpen(true)} className="p-2 border border-slate-700 hover:bg-slate-800 rounded transition-colors hidden md:block" title="Settings">
            <Settings className="w-4 h-4" />
          </button>

          <button onClick={onSwitchToStudent} className="px-3 md:px-4 py-2 border border-slate-700 hover:bg-slate-800 text-xs rounded transition-colors flex items-center gap-2">
            <Eye className="w-3 h-3" /> <span className="hidden md:inline">{T.STUDENT_VIEW}</span>
          </button>

          <button onClick={onLogout} className="p-2 text-slate-500 hover:text-white transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-6 p-0 md:p-6 overflow-hidden relative">

        {/* LEFT COLUMN: CONTEXT (Mobile: Hidden unless menu open, or re-arranged) */}
        {/* On Mobile, we might want to hide this or move it. Let's make it a sidebar overlay on mobile. */}
        <div className={`
             absolute md:relative inset-0 z-20 bg-black/95 md:bg-transparent
             md:col-span-3 flex flex-col gap-6 p-6 md:p-0
             transition-transform duration-300 md:transform-none
             ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="md:hidden flex justify-end mb-4">
            <button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6 text-white" /></button>
          </div>

          {/* Athena Trigger */}
          <button
            onClick={() => { setIsAthenaOpen(true); setIsMobileMenuOpen(false); }}
            className="relative overflow-hidden group p-1 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-white/20 group-hover:bg-transparent transition-colors"></div>
            <div className="relative bg-slate-900 rounded-lg p-4 flex items-center gap-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-300 animate-pulse" />
              </div>
              <div className="text-left">
                <div className="font-bold text-white text-sm">{TERMS[language].ATHENA.TITLE}</div>
                <div className="text-[10px] text-purple-200 opacity-80">{TERMS[language].ATHENA.SUB}</div>
              </div>
            </div>
          </button>

          {/* Mobile Tabs */}
          <div className="md:hidden flex flex-col gap-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Navigation</h3>
            {(['LIVEOPS', 'CURRICULUM', 'SYSTEM'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }}
                className={`p-3 text-left text-sm font-bold rounded border ${activeTab === tab ? 'bg-slate-800 border-white text-white' : 'border-slate-800 text-slate-500'}`}
              >
                {T[tab]}
              </button>
            ))}
          </div>

          {/* Global Stats */}
          <div className={`p-4 rounded-lg border flex flex-col gap-4 ${currentMode === PhilosophyMode.KOREA ? 'bg-black border-red-900' : 'bg-slate-900 border-slate-800'}`}>
            <h3 className="text-xs font-bold opacity-50 flex items-center gap-2"><BarChart3 className="w-3 h-3" /> {T.CLASS_VELOCITY}</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold">84%</span>
              <span className="text-xs text-emerald-500 mb-1">+12% vs avg</span>
            </div>
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full w-[84%] ${currentMode === PhilosophyMode.KOREA ? 'bg-red-600' : 'bg-emerald-500'}`}></div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`p-4 rounded-lg border flex-1 ${currentMode === PhilosophyMode.KOREA ? 'bg-black border-red-900' : 'bg-slate-900 border-slate-800'}`}>
            <h3 className="text-xs font-bold opacity-50 flex items-center gap-2 mb-4"><Terminal className="w-3 h-3" /> {T.BROADCAST}</h3>
            <div className="flex gap-2 mb-4">
              <input
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Message..."
                className="w-full bg-transparent border-b border-slate-700 p-2 text-sm focus:outline-none focus:border-white"
              />
              <button onClick={handleBroadcast} className="p-2 hover:bg-white/10 rounded"><Send className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              <button className="w-full py-2 border border-slate-700 hover:bg-slate-800 rounded text-xs flex items-center justify-center gap-2">
                <Pause className="w-3 h-3" /> {T.FREEZE}
              </button>
              <button className={`w-full py-2 border rounded text-xs flex items-center justify-center gap-2 ${currentMode === PhilosophyMode.KOREA ? 'border-red-500 text-red-500 hover:bg-red-900/20' : 'border-slate-700 hover:bg-slate-800'}`}>
                <ShieldAlert className="w-3 h-3" /> {T.AUDIT}
              </button>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: MAIN VIEW */}
        <div className="col-span-1 md:col-span-6 flex flex-col overflow-hidden p-4 md:p-0">

          {/* Dashboard Guide */}
          {showGuide && (
            <div className="mb-4 bg-indigo-900/30 border border-indigo-500/30 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-sm text-indigo-200 mb-1">{T.HINTS.TEACHER_GUIDE_TITLE}</h3>
                <p className="text-xs text-indigo-300/80 leading-relaxed">{T.HINTS.TEACHER_GUIDE_DESC}</p>
              </div>
              <button onClick={() => setShowGuide(false)} className="text-indigo-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          )}

          {activeTab === 'LIVEOPS' && (
            <div className={`h-full rounded-xl border p-4 md:p-6 flex flex-col ${currentMode === PhilosophyMode.KOREA ? 'bg-black border-red-900' : 'bg-slate-900 border-slate-800'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold flex items-center gap-2"><Users className="w-4 h-4" /> {TT.LIVE_GRID}</h2>
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {T.FLOW}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> {T.STUCK}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-2">
                {students.map(student => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`aspect-square rounded-lg p-3 flex flex-col justify-between transition-all relative overflow-hidden group
                        ${selectedStudent?.id === student.id ? 'ring-2 ring-white' : ''}
                        ${student.status === 'STUCK' ? 'bg-rose-900/20 border border-rose-500/30 hover:bg-rose-900/40' : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-800'}
                      `}
                  >
                    {student.status === 'STUCK' && <div className="absolute inset-0 bg-rose-500/10 animate-pulse"></div>}
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold opacity-70">{student.name}</span>
                      {student.status === 'FLOW' && <Activity className="w-3 h-3 text-emerald-500" />}
                      {student.status === 'STUCK' && <ShieldAlert className="w-3 h-3 text-rose-500" />}
                    </div>
                    <div className="space-y-1">
                      <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                        <div className={`h-full ${student.sentiment > 70 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${student.sentiment}%` }}></div>
                      </div>
                      <div className="text-[10px] opacity-50 flex justify-between">
                        <span>{student.agentsActive} Active</span>
                        <span>{student.sentiment}%</span>
                      </div>
                      <div className="text-[9px] opacity-40 truncate">
                        {getLocalizedAction(student.lastAction)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'CURRICULUM' && (
            <div className={`h-full rounded-xl border p-4 md:p-6 flex flex-col ${currentMode === PhilosophyMode.KOREA ? 'bg-black border-red-900' : 'bg-slate-900 border-slate-800'}`}>
              <h2 className="font-bold flex items-center gap-2 mb-6"><BookOpen className="w-4 h-4" /> {TT.BUILDER_TITLE}</h2>

              <div className="flex flex-col md:flex-row gap-2 mb-6">
                <input
                  className="flex-1 bg-slate-950 border border-slate-700 rounded p-3 text-sm focus:border-purple-500 focus:outline-none"
                  placeholder={TT.TOPIC_PLACEHOLDER}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 md:py-0 rounded font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <FileJson className="w-4 h-4" />}
                  {T.GENERATE}
                </button>
              </div>

              <div className="flex-1 bg-slate-950 rounded border border-slate-800 p-6 overflow-y-auto">
                {generatedLesson ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-purple-400 font-bold text-xl uppercase tracking-wider">{generatedLesson.title}</div>
                      <div className="px-2 py-1 bg-purple-900/30 border border-purple-500/50 rounded text-xs text-purple-200">
                        {TT.GENERATED_BY}
                      </div>
                    </div>
                    <div className="mb-6 p-4 bg-slate-900 rounded border-l-2 border-purple-500">
                      <div className="text-xs uppercase opacity-50 mb-1">{TT.OBJECTIVE}</div>
                      <div className="text-slate-300 italic">"{generatedLesson.objective}"</div>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <div className="text-xs uppercase opacity-50 mb-2">{TT.CONTEXT}</div>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{generatedLesson.context}</p>
                    </div>
                    <div className="mt-8 flex gap-4">
                      <button
                        onClick={handleDeploy}
                        className="flex-1 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-400 rounded flex items-center justify-center gap-2 font-bold transition-all"
                      >
                        <Play className="w-4 h-4" /> {T.DEPLOY}
                      </button>
                      <button
                        onClick={handleSaveDraft}
                        className="px-4 py-3 border border-slate-700 hover:bg-slate-800 rounded text-slate-400 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> {T.SAVE_DRAFT}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                    <BookOpen className="w-12 h-12 mb-4" />
                    <p>{TT.TOPIC_PLACEHOLDER}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'SYSTEM' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center">
                  <Sliders className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold">{TT.PHILOSOPHY_CONFIG}</h2>
                <p className="text-slate-500">
                  {TT.PHILOSOPHY_DESC}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAILS (Hidden on Mobile unless needed, or stacked below) */}
        <div className="md:col-span-3 flex flex-col gap-6 p-4 md:p-0 border-t md:border-t-0 border-slate-800 mt-4 md:mt-0">

          {/* Philosophy Slider (Always Visible) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-4 ${currentMode === PhilosophyMode.KOREA ? 'bg-black border-red-900' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center gap-2 opacity-80">
              <Sliders className="w-4 h-4" />
              <h2 className="font-bold text-sm">{T.PHILOSOPHY_TITLE}</h2>
            </div>

            <div className="space-y-2">
              {[
                { mode: PhilosophyMode.FINLAND, label: 'FINLAND', sub: TT.PHIL_SUB_FIN, color: 'amber' },
                { mode: PhilosophyMode.JAPAN, label: 'JAPAN', sub: TT.PHIL_SUB_JAP, color: 'cyan' },
                { mode: PhilosophyMode.KOREA, label: 'KOREA', sub: TT.PHIL_SUB_KOR, color: 'red' },
              ].map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => onModeChange(opt.mode)}
                  className={`w-full p-3 rounded border text-left transition-all duration-300 relative overflow-hidden group
                      ${currentMode === opt.mode
                      ? (opt.mode === PhilosophyMode.KOREA ? 'bg-red-900/20 border-red-500' : opt.mode === PhilosophyMode.FINLAND ? 'bg-amber-900/20 border-amber-500' : 'bg-cyan-900/20 border-cyan-500')
                      : 'border-transparent hover:bg-white/5 opacity-50 hover:opacity-100'}
                    `}
                >
                  <div className="relative z-10">
                    <div className="font-bold text-sm">{opt.label}</div>
                    <div className="text-[10px] opacity-70">{opt.sub}</div>
                  </div>
                  {currentMode === opt.mode && <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] ${opt.mode === PhilosophyMode.KOREA ? 'bg-red-500 text-red-500' : opt.mode === PhilosophyMode.FINLAND ? 'bg-amber-500 text-amber-500' : 'bg-cyan-500 text-cyan-500'}`}></div>}
                </button>
              ))}
            </div>
          </div>

          {/* Ghost Mode Detail / Timeline */}
          <div className={`h-96 md:h-auto md:flex-1 p-4 rounded-xl border relative overflow-hidden ${currentMode === PhilosophyMode.KOREA ? 'bg-black border-red-900' : 'bg-slate-900 border-slate-800'}`}>
            {selectedStudent ? (
              <div className="animate-in fade-in duration-300 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-4">
                  <div>
                    <div className="text-[10px] opacity-50 uppercase tracking-wider">{TT.GHOST_MODE}</div>
                    <h3 className="font-bold text-lg">{selectedStudent.name}</h3>
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedStudent.status === 'STUCK' ? 'bg-rose-500 text-black' : 'bg-emerald-500 text-black'}`}>
                    {getLocalizedStatus(selectedStudent.status)}
                  </div>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto">
                  <TimelinePlayer history={studentHistory} language={language} />

                  <div className="bg-slate-950 p-3 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500 mb-1">{TT.INTERVENTION}</div>
                    <button className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/50 rounded text-xs mb-2">
                      {TT.BTN_HINT}
                    </button>
                    <button className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/50 rounded text-xs">
                      {TT.BTN_FAIL}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <Eye className="w-8 h-8 mb-2" />
                <p className="text-xs">{TT.SELECT_STUDENT}</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};