import React, { useState, useCallback, useEffect } from 'react';
import { AgentRoster } from './AgentRoster';
import { OutputStream } from './OutputStream';
import { NodeCanvas } from './NodeCanvas';
import { CommandInput } from './CommandInput';
import { Silica } from './Silica';
import { CentaurProfile } from './CentaurProfile';
import { CareerTree } from './CareerTree';
import { TutorialOverlay } from './TutorialOverlay';
import { SettingsModal } from './SettingsModal';
import { ChaosOverlay } from './ChaosOverlay';
import { AgentNode, Connection, NodeStatus, AgentType, PhilosophyMode, Language, SkillStats, User, CollapseEvent, AuditLogEntry } from '../types';
import { TERMS } from '../translations';
import { decomposeCommand, simulateAgentTask, generateChaosEvent, SimulationResult } from '../services/gemini';
import { API } from '../services/api';
import { ScanEye, Play, RefreshCw, Zap, ArrowLeft, Hexagon, LogOut, HelpCircle, Settings, Siren, Sparkles, ArrowRight, ZapOff, Coins, GitCommit } from 'lucide-react';

interface StudentViewProps {
  mode: PhilosophyMode;
  onSwitchToTeacher?: () => void;
  language: Language;
  user: User;
  onLogout: () => void;
}

const DEFAULT_STATS: SkillStats = {
  orchestration: 45,
  auditing: 20,
  resilience: 60,
  creativity: 75,
  efficiency: 30,
  ethics: 50
};

export const StudentView: React.FC<StudentViewProps> = ({ mode, onSwitchToTeacher, language, user, onLogout }) => {
  const [nodes, setNodes] = useState<AgentNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [hasWarning, setHasWarning] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCareer, setShowCareer] = useState(false);
  const [stats, setStats] = useState<SkillStats>(DEFAULT_STATS);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [credits, setCreditsState] = useState(() => {
    const local = localStorage.getItem('student_credits');
    if (local) return parseInt(local, 10);
    return user.credits !== undefined ? user.credits : 500;
  }); // Gamified Budget

  const setCredits = (valueOrFn: number | ((prev: number) => number)) => {
    setCreditsState(prev => {
      const newVal = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
      localStorage.setItem('student_credits', newVal.toString());
      API.user.updateProfile({ credits: newVal }).catch(e => console.error("Failed to sync credits", e));
      return newVal;
    });
  };

  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);
  const [chaosEvent, setChaosEvent] = useState<CollapseEvent | null>(null);

  const T = TERMS[language];
  const TC = TERMS[language].COMMON;

  const currentQuest = {
    id: 'q1',
    title: T.QUEST_DEFAULT.TITLE,
    objective: T.QUEST_DEFAULT.OBJECTIVE,
    context: T.QUEST_DEFAULT.CONTEXT
  };

  useEffect(() => {
    localStorage.setItem('last_student_history', JSON.stringify(auditHistory));
  }, [auditHistory]);

  const logAction = (action: AuditLogEntry['action'], details: string) => {
    const entry: AuditLogEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      action,
      details,
      snapshot: { nodeCount: nodes.length, avgConfidence: 85 }
    };
    setAuditHistory(prev => [...prev, entry]);
  };

  const handleCommandSubmit = async (text: string) => {
    if (credits <= 10) {
      addLog(`${T.LOGS.ERR}: ${T.BUDGET.EMPTY}`);
      return;
    }

    setIsProcessing(true);
    addLog(`${T.LOGS.CMD}: "${text}"`);
    logAction('EDIT_PROMPT', `Input: ${text}`);
    setCredits(prev => Math.max(0, prev - 25)); // Deduct cost

    setStats(prev => ({
      ...prev,
      creativity: Math.min(100, prev.creativity + 2),
      orchestration: Math.min(100, prev.orchestration + 1)
    }));

    try {
      const graphData = await decomposeCommand(text, mode, language);

      const newNodes: AgentNode[] = graphData.nodes.map((n: any, i: number) => ({
        id: `node-${Date.now()}-${i}`,
        type: mapStringToAgentType(n.type),
        label: n.label,
        description: n.description,
        x: 200 + (i * 220),
        y: 250 + (Math.sin(i) * 120),
        status: NodeStatus.IDLE,
        config: { prompt: n.description, temperature: 0.7 },
        confidence: 100
      }));

      const newConnections: Connection[] = graphData.connections.map((c: any, i: number) => ({
        id: `conn-${Date.now()}-${i}`,
        from: newNodes[c.fromIndex]?.id,
        to: newNodes[c.toIndex]?.id
      })).filter((c: Connection) => c.from && c.to);

      setNodes(newNodes);
      setConnections(newConnections);
      // @ts-ignore
      logAction('CREATE_NODE', `${T.TIMELINE_ACTIONS.CREATE_NODE} (${newNodes.length})`);
    } catch (err: any) {
      addLog(`${T.LOGS.ERR}: ${err}`);
      if (err.message === 'API_KEY_MISSING') {
        setIsSettingsOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const executeSimulation = async () => {
    if (nodes.length === 0) return;
    if (credits < (nodes.length * 5)) {
      addLog(`${T.LOGS.ERR}: ${T.BUDGET.EMPTY}`);
      return;
    }

    setIsProcessing(true);
    setHasWarning(false);
    logAction('EXECUTE_GRAPH', T.LOGS.SIM_START);

    const updatedNodes = [...nodes];
    let previousOutput = currentQuest.context;

    for (let i = 0; i < updatedNodes.length; i++) {
      const node = updatedNodes[i];

      if (node.status === NodeStatus.OFFLINE) continue;

      setCredits(prev => Math.max(0, prev - 5)); // Cost per node execution

      node.status = NodeStatus.THINKING;
      setNodes([...updatedNodes]);

      await new Promise(r => setTimeout(r, 800));

      let result: SimulationResult = { text: "", confidence: 0 };
      let newStatus = NodeStatus.COMPLETE;

      if (chaosEvent && chaosEvent.affectedNodeTypes.includes(node.type)) {
        result.text = `SYSTEM ERROR: ${chaosEvent.message}`;
        result.confidence = 0;
        newStatus = NodeStatus.OFFLINE;
      } else if (node.type === AgentType.HISTORIAN && Math.random() > 0.8) {
        result.text = T.LOGS.CORRUPTION_MSG;
        result.confidence = 35;
        newStatus = NodeStatus.WARNING;
        setHasWarning(true);
      } else {
        result = await simulateAgentTask(node, previousOutput, mode, language);
        if (result.confidence < 50) setHasWarning(true);
        if (result.text.includes("API Key")) setIsSettingsOpen(true);
      }

      node.output = result.text;
      node.confidence = result.confidence;
      node.status = newStatus;
      node.toolUsed = result.toolUsed;
      node.toolResult = result.toolResult;

      previousOutput += `\nOutput: ${result.text}`;
      setNodes([...updatedNodes]);
    }

    setIsProcessing(false);
  };

  const triggerChaos = async () => {
    // Pass language here so the event text is localized
    const event = await generateChaosEvent("Random Failure", language);
    setChaosEvent(event);
    logAction('CHAOS_TRIGGERED', `Event: ${event.type}`);

    setStats(prev => ({ ...prev, resilience: Math.max(0, prev.resilience - 10) }));

    setNodes(prev => prev.map(n => {
      if (event.affectedNodeTypes.includes(n.type)) {
        return { ...n, status: NodeStatus.OFFLINE, confidence: 0 };
      }
      return n;
    }));
  };

  const resolveChaos = () => {
    setChaosEvent(null);
    setNodes(prev => prev.map(n => n.status === NodeStatus.OFFLINE ? { ...n, status: NodeStatus.IDLE } : n));
    setStats(prev => ({ ...prev, resilience: Math.min(100, prev.resilience + 15) }));
  };

  const handleFixNode = (nodeId: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          status: NodeStatus.COMPLETE,
          output: T.LOGS.REPAIRED_MSG,
          confidence: 100
        };
      }
      return n;
    }));
    setHasWarning(false);
    logAction('AUDIT_FIX', `Fixed node ${nodeId}`);
    addLog(`${T.LOGS.REPAIR}: ${nodeId}`);
    setCredits(prev => Math.min(1000, prev + 50)); // Reward for fixing

    setStats(prev => ({
      ...prev,
      auditing: Math.min(100, prev.auditing + 15),
      resilience: Math.min(100, prev.resilience + 5)
    }));
  };

  const handleNodeMove = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const mapStringToAgentType = (str: string): AgentType => {
    const s = str.toUpperCase();
    if (s.includes('SCOUT')) return AgentType.SCOUT;
    if (s.includes('HIST')) return AgentType.HISTORIAN;
    if (s.includes('AUDIT')) return AgentType.AUDITOR;
    if (s.includes('BUILD')) return AgentType.BUILDER;
    return AgentType.ARCHITECT;
  };

  const getContainerClass = () => {
    if (mode === PhilosophyMode.FINLAND) return "bg-[#292524] selection:bg-amber-500 selection:text-black font-serif";
    if (mode === PhilosophyMode.KOREA) return "bg-black selection:bg-red-600 selection:text-white font-mono";
    return "bg-slate-950 selection:bg-neon-blue selection:text-black font-sans";
  };

  const getHeaderClass = () => {
    if (mode === PhilosophyMode.FINLAND) return "bg-[#44403c] border-amber-900/50 shadow-lg";
    if (mode === PhilosophyMode.KOREA) return "bg-black border-red-900 border-b-2";
    return "glass-panel";
  };

  const suggestions = [
    T.HINTS.PRESET_1,
    T.HINTS.PRESET_2,
    T.HINTS.PRESET_3,
  ];

  return (
    <div className={`flex h-screen w-screen text-white overflow-hidden relative transition-all duration-700 ${getContainerClass()}`}>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} language={language} />
      <ChaosOverlay event={chaosEvent} onResolve={resolveChaos} language={language} />
      {showTutorial && <TutorialOverlay onComplete={() => setShowTutorial(false)} mode={mode} language={language} />}

      <Silica mode={mode} isProcessing={isProcessing} hasWarning={hasWarning} language={language} />

      {showProfile && (
        <CentaurProfile
          stats={stats}
          mode={mode}
          language={language}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showCareer && (
        <CareerTree
          level={user.level}
          mode={mode}
          language={language}
          onClose={() => setShowCareer(false)}
        />
      )}

      {/* Left Panel */}
      <div className="w-64 z-20 relative transition-all duration-300 hidden md:block">
        <AgentRoster mode={mode} language={language} />
      </div>

      {/* Center Canvas */}
      <div className="flex-1 relative z-10 flex flex-col">
        {/* Header */}
        <div className={`absolute top-4 left-4 right-4 h-16 rounded-lg flex items-center justify-between px-6 z-30 transition-all ${getHeaderClass()}`}>
          <div>
            <h1 className={`font-bold tracking-wider text-sm ${mode === PhilosophyMode.FINLAND ? 'text-amber-200' : mode === PhilosophyMode.KOREA ? 'text-red-500' : 'text-neon-blue'}`}>
              {T.QUEST}: {currentQuest.title.toUpperCase()}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {onSwitchToTeacher ? (
                <button onClick={onSwitchToTeacher} className="flex items-center gap-1 text-[10px] opacity-50 hover:opacity-100 hover:text-white transition-colors">
                  <ArrowLeft className="w-3 h-3" /> {TC.BACK}
                </button>
              ) : (
                <span className="text-[10px] opacity-30 uppercase">{T.COMMANDER}: {user.name}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Token/Budget Display */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${credits < 100 ? 'bg-red-900/50 border-red-500 text-red-500 animate-pulse' : 'bg-black/40 border-white/10'}`}>
              <Coins className="w-4 h-4" />
              <div className="flex flex-col items-end leading-none">
                <span className="font-mono text-xs font-bold">{credits}</span>
                <span className="text-[8px] opacity-50">{T.BUDGET.LABEL}</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-black/20 border border-white/5 text-[10px] font-mono opacity-60">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              {T.MODEL_INDICATOR || "GEMINI-2.5-FLASH"}
            </div>

            <button
              onClick={triggerChaos}
              className="p-2 rounded text-red-500 hover:bg-red-500/20"
              title="Trigger System Collapse (Sim)"
            >
              <Siren className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowCareer(true)}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${mode === PhilosophyMode.KOREA ? 'text-red-500' : 'text-white'}`}
              title="Career Path"
            >
              <GitCommit className="w-5 h-5 rotate-90" />
            </button>

            <button
              onClick={() => setShowProfile(true)}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${mode === PhilosophyMode.KOREA ? 'text-red-500' : 'text-white'}`}
              title="View Skill Tree"
            >
              <Hexagon className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowTutorial(true)}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${mode === PhilosophyMode.KOREA ? 'text-red-500' : 'text-white'}`}
              title="Help / Tutorial"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${mode === PhilosophyMode.KOREA ? 'text-red-500' : 'text-white'}`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-white/20 mx-2"></div>

            <button
              onClick={() => setIsAuditing(!isAuditing)}
              className={`flex items-center gap-2 px-4 py-2 rounded transition-all text-xs font-bold
                ${isAuditing
                  ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                  : 'border border-transparent bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              <ScanEye className="w-4 h-4" /> {isAuditing ? T.LENS_ACTIVE : T.LENS_INACTIVE}
            </button>

            <button
              onClick={executeSimulation}
              disabled={isProcessing || nodes.length === 0}
              className={`flex items-center gap-2 px-6 py-2 text-black font-bold rounded transition-colors text-xs
                ${mode === PhilosophyMode.KOREA
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]'
                  : mode === PhilosophyMode.FINLAND
                    ? 'bg-amber-200 hover:bg-white text-stone-900'
                    : 'bg-neon-blue hover:bg-cyan-300'}`}
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              {T.EXECUTE}
            </button>

            <button onClick={onLogout} className="ml-2 text-white/30 hover:text-white" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Empty State Overlay */}
        {nodes.length === 0 && !isProcessing && (
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-lg pointer-events-auto animate-in fade-in zoom-in duration-700">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-2 
                    ${mode === PhilosophyMode.KOREA ? 'border-red-600 bg-red-900/20 text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.3)]' : 'border-slate-600 bg-slate-800/50 text-slate-400'}
                 `}>
                <ZapOff className="w-8 h-8" />
              </div>
              <h2 className={`text-2xl font-bold mb-3 tracking-widest uppercase ${mode === PhilosophyMode.KOREA ? 'text-red-500' : 'text-white'}`}>
                {T.HINTS.STUDENT_EMPTY_TITLE}
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                {T.HINTS.STUDENT_EMPTY_DESC}
              </p>

              <div className="grid grid-cols-1 gap-3">
                {suggestions.map((suggestion: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleCommandSubmit(suggestion)}
                    className={`group p-4 rounded-lg border text-left transition-all hover:scale-[1.02] flex items-center justify-between
                            ${mode === PhilosophyMode.KOREA
                        ? 'bg-black border-red-900 text-red-500 hover:bg-red-900/20'
                        : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-neon-blue hover:text-white'}
                         `}
                  >
                    <span className="font-mono text-sm">{suggestion}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <NodeCanvas
          nodes={nodes}
          connections={connections}
          onNodeSelect={setSelectedNodeId}
          onNodeMove={handleNodeMove}
          selectedNodeId={selectedNodeId}
          isAuditing={isAuditing}
          mode={mode}
          language={language}
          onShowTutorial={() => setShowTutorial(true)}
        />

        <CommandInput onSubmit={handleCommandSubmit} isProcessing={isProcessing} mode={mode} language={language} />
      </div>

      {/* Right Panel */}
      <div className="w-80 z-20 relative transition-all duration-300 hidden xl:block">
        <OutputStream
          logs={logs}
          nodes={nodes}
          isAuditing={isAuditing}
          onFixApplied={handleFixNode}
          mode={mode}
          language={language}
        />
      </div>

      {/* Visual Effects for Modes */}
      {mode === PhilosophyMode.KOREA && (
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[60] bg-[length:100%_2px,3px_100%]"></div>
      )}

    </div>
  );
};