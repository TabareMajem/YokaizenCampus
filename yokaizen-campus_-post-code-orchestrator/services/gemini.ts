
import { GoogleGenAI, Type } from "@google/genai";
import { AgentType, AgentNode, PhilosophyMode, Language, CollapseEvent, AIProvider } from "../types";
import { API } from "./api";
import { TERMS } from "../translations";

// Helper to determine if we should use backend proxy (default) or BYOK mode
const useBackendProxy = () => {
  // Default to using backend proxy unless user has their own API key
  const hasOwnKey = localStorage.getItem('gemini_api_key');
  return !hasOwnKey;
};

const getPreferredProvider = (): AIProvider => {
  const p = localStorage.getItem('ai_provider');
  return (p as AIProvider) || AIProvider.GEMINI;
};

const getAiClient = () => {
  const apiKey = localStorage.getItem('gemini_api_key') || '';
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// --- HYBRID GENERATION FUNCTION ---
// Routes between Backend Proxy (default) and BYOK mode (client direct)
async function generateHybrid(model: string, prompt: string, schema?: any): Promise<any> {

  // Always try backend proxy first (production mode)
  if (useBackendProxy()) {
    console.log("[AI Service] Routing via Backend Proxy...");
    try {
      const result = await API.ai.command(prompt, 'JAPAN');
      return { text: typeof result === 'string' ? result : JSON.stringify(result) };
    } catch (error) {
      console.error("[AI Service] Backend proxy failed, checking for BYOK fallback...", error);
      // Fall through to BYOK if backend fails
    }
  }

  // BYOK MODE (Direct Client)
  const ai = getAiClient();
  if (!ai) throw new Error("API_KEY_MISSING");

  const config: any = {};
  if (schema) {
    config.responseMimeType = "application/json";
    config.responseSchema = schema;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });
    return response;
  } catch (error: any) {
    console.error("[AI Service] Direct AI Call Failed:", error);
    // Throw a clean string instead of the raw Google error object which can crash the UI component parsing
    throw new Error(error.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'API_ERROR');
  }
}

export const generateChaosEvent = async (context: string, language: Language): Promise<CollapseEvent> => {
  const T = TERMS[language].CHAOS_MESSAGES;
  const events: CollapseEvent[] = [
    {
      id: 'chaos-1',
      type: 'DATA_CORRUPTION',
      message: `${T.DATA_CORRUPTION_TITLE}: ${T.DATA_CORRUPTION_DESC}`,
      affectedNodeTypes: [AgentType.HISTORIAN, AgentType.SCOUT],
      duration: 30
    },
    {
      id: 'chaos-2',
      type: 'API_FAILURE',
      message: `${T.API_FAILURE_TITLE}: ${T.API_FAILURE_DESC}`,
      affectedNodeTypes: [AgentType.SCOUT, AgentType.BUILDER],
      duration: 15
    },
    {
      id: 'chaos-3',
      type: 'SECURITY_BREACH',
      message: `${T.SECURITY_BREACH_TITLE}: ${T.SECURITY_BREACH_DESC}`,
      affectedNodeTypes: [AgentType.SECURITY, AgentType.ARCHITECT],
      duration: 45
    }
  ];
  return events[Math.floor(Math.random() * events.length)];
};

export const generateLessonPlan = async (topic: string, philosophy: PhilosophyMode, language: Language): Promise<any> => {
  try {
    // Use backend API
    if (useBackendProxy()) {
      const prompt = `Create a Quest for students on: "${topic}" in ${language} language with philosophy: ${philosophy}`;
      const result = await API.ai.command(prompt, philosophy);
      return result;
    }

    // BYOK fallback
    const prompt = `You are the 'Antigravity Engine', an educational AI for a futuristic classroom.
      Create a 'Quest' for students based on the topic: "${topic}".
      Philosophy Mode: ${philosophy}
      Language: ${language} (Output STRICTLY in this language)
      Return JSON with: 'title', 'objective', 'context'.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        objective: { type: Type.STRING },
        context: { type: Type.STRING },
      }
    };

    const response = await generateHybrid('gemini-2.5-flash', prompt, schema);

    let text = response.text || "";
    if (text.startsWith("```json")) {
      text = text.replace(/```json\n?|```/g, "").trim();
    }

    if (text) return JSON.parse(text);
    throw new Error("No response");

  } catch (error: any) {
    if (error.message === 'API_KEY_MISSING') {
      return {
        title: "Backend Connection",
        objective: "Connected to Backend",
        context: "Using backend AI proxy for generation."
      };
    }
    console.error("Lesson Gen Error", error);
    throw error;
  }
}

export const decomposeCommand = async (command: string, philosophy: PhilosophyMode, language: Language): Promise<any> => {
  try {
    // Use backend API for command decomposition
    if (useBackendProxy()) {
      const result = await API.ai.command(command, philosophy);
      return result;
    }

    // BYOK fallback
    let modifier = "";
    if (philosophy === PhilosophyMode.KOREA) modifier = "Minimize agent count. Prioritize efficiency and speed.";
    if (philosophy === PhilosophyMode.FINLAND) modifier = "Encourage creative agent use. Allow redundancy.";

    const prompt = `You are a System Architect for 'The Bridge'. Break down: "${command}" into AI Agents.
      Constraint: ${modifier}
      Language: ${language} (Output node labels and descriptions STRICTLY in this language, but KEEP keys in English: 'nodes', 'connections')
      Available Types: SCOUT, PATTERN_MATCHER, HISTORIAN, BUILDER, AUDITOR, ARCHITECT.
      Return JSON: 'nodes' (label, type, description) and 'connections' (fromIndex, toIndex).`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              type: { type: Type.STRING },
              description: { type: Type.STRING },
            }
          }
        },
        connections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fromIndex: { type: Type.INTEGER },
              toIndex: { type: Type.INTEGER },
            }
          }
        }
      }
    };

    const response = await generateHybrid('gemini-2.5-flash', prompt, schema);

    let text = response.text || "";
    if (text.startsWith("```json")) {
      text = text.replace(/```json\n?|```/g, "").trim();
    }

    if (text) return JSON.parse(text);
    throw new Error("No text response");

  } catch (error) {
    console.error("Command Decomposition Error:", error);
    throw error;
  }
};

export interface SimulationResult {
  text: string;
  confidence: number;
  toolUsed?: string;
  toolResult?: string;
}

export const simulateAgentTask = async (agent: AgentNode, inputContext: string, philosophy: PhilosophyMode, language: Language): Promise<SimulationResult> => {

  try {
    // Use backend API for simulation
    if (useBackendProxy()) {
      const result = await API.ai.simulate(agent.id, agent.type, agent.config.prompt, inputContext);
      return {
        text: result.output || result.text || "Simulation completed.",
        confidence: result.confidence || 85,
        toolUsed: result.toolUsed,
        toolResult: result.toolResult
      };
    }

    // BYOK fallback
    let persona = "Helpful and neutral.";
    if (philosophy === PhilosophyMode.KOREA) persona = "Strict, terse, highly critical.";
    if (philosophy === PhilosophyMode.FINLAND) persona = "Playful, encouraging, creative.";

    const prompt = `You are an AI Agent in a simulation.
      Type: ${agent.type}
      Persona: ${persona}
      Language: ${language}
      Task: ${agent.config.prompt}
      Input Data: ${inputContext}
      Generate a response object with 'output' and 'confidence' (0-100).`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        output: { type: Type.STRING },
        confidence: { type: Type.INTEGER }
      }
    };

    const response = await generateHybrid('gemini-2.5-flash', prompt, schema);

    let text = response.text || "";
    if (text.startsWith("```json")) {
      text = text.replace(/```json\n?|```/g, "").trim();
    }

    const json = JSON.parse(text || '{}');

    return {
      text: json.output || "No output generated.",
      confidence: json.confidence || 85
    };
  } catch (e: any) {
    if (e.message === 'API_KEY_MISSING') {
      return { text: "Using Backend AI Proxy.", confidence: 85 };
    }
    return {
      text: "Agent Malfunction due to Connection Error.",
      confidence: 0
    };
  }
};

export const askAthena = async (action: string, contextData: any, language: Language): Promise<string> => {
  try {
    const mode = contextData?.mode || 'JAPAN';
    // Use backend for Athena insights
    if (useBackendProxy()) {
      const prompt = `ATHENA insight request: ${action} with context: ${JSON.stringify(contextData)}`;
      const result = await API.ai.command(prompt, mode);
      return typeof result === 'string' ? result : JSON.stringify(result);
    }

    const prompt = `You are ATHENA, a high-level AI teaching assistant.
            Philosophy Mode: ${mode}
            Language: ${language}
            Action Required: ${action}
            Context Data: ${JSON.stringify(contextData)}
            Provide a concise, actionable response.`;

    const response = await generateHybrid('gemini-2.5-flash', prompt);
    return response.text || "Athena is processing...";
  } catch (e) {
    return "Athena connection in progress...";
  }
}