// Yokaizen Campus - AI Engine Service
// The "Hybrid Engine" - Model Agnostic AI Proxy

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { prisma } from '../utils/prisma.js';
import { filterAIOutput } from '../middleware/contentFilter.js';
import { sleep, randomInt } from '../utils/helpers.js';
import {
  AICommandInput,
  AICommandResponse,
  AISimulateInput,
  AISimulateResponse,
  AIEngineConfig,
  AgentNode,
  GraphEdge,
  AgentNodeType,
  PhilosophyMode,
  SubscriptionTier,
} from '../types/index.js';

// Provider instances
let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;
let googleAI: GoogleGenerativeAI | null = null;
let openRouter: OpenAI | null = null;

// Initialize providers
function getOpenAI(): OpenAI | null {
  if (!openai && config.ai.openai.apiKey) {
    openai = new OpenAI({ apiKey: config.ai.openai.apiKey });
  }
  return openai;
}

function getAnthropic(): Anthropic | null {
  if (!anthropic && config.ai.anthropic.apiKey) {
    anthropic = new Anthropic({ apiKey: config.ai.anthropic.apiKey });
  }
  return anthropic;
}

function getGoogleAI(): GoogleGenerativeAI | null {
  if (!googleAI && config.ai.google.apiKey) {
    googleAI = new GoogleGenerativeAI(config.ai.google.apiKey);
  }
  return googleAI;
}

function getOpenRouter(): OpenAI | null {
  if (!openRouter && config.ai.openrouter.apiKey) {
    openRouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.ai.openrouter.apiKey,
    });
  }
  return openRouter;
}

// Agent node configurations
const AGENT_CONFIGS: Record<AgentNodeType, {
  systemPrompt: string;
  defaultCost: number;
  requiredLevel: number;
}> = {
  SCOUT: {
    systemPrompt: 'You are a Scout agent. Your role is to gather and summarize raw information quickly. Be concise and factual.',
    defaultCost: config.credits.scoutCost,
    requiredLevel: 1,
  },
  ARCHITECT: {
    systemPrompt: 'You are an Architect agent. Your role is to structure and organize data into clear hierarchies and frameworks. Be systematic and thorough.',
    defaultCost: config.credits.architectCost,
    requiredLevel: 10,
  },
  CRITIC: {
    systemPrompt: 'You are a Critic agent. Your role is to evaluate outputs, find flaws, and suggest improvements. Be constructive but thorough.',
    defaultCost: config.credits.criticCost,
    requiredLevel: 5,
  },
  ETHICIST: {
    systemPrompt: 'You are an Ethicist agent. Your role is to audit content for bias, fairness, and ethical considerations. Be balanced and thoughtful.',
    defaultCost: config.credits.ethicistCost,
    requiredLevel: 8,
  },
  SYNTHESIZER: {
    systemPrompt: 'You are a Synthesizer agent. Your role is to combine multiple inputs into cohesive outputs. Be integrative and creative.',
    defaultCost: config.credits.synthesizerCost,
    requiredLevel: 12,
  },
  ORACLE: {
    systemPrompt: 'You are the Oracle, a hidden agent of wisdom. Provide deep insights and unexpected perspectives. Be enigmatic yet helpful.',
    defaultCost: config.credits.oracleCost,
    requiredLevel: 1, // Unlocked via AR, not level
  },
  COMMANDER: {
    systemPrompt: 'You are a Commander agent. Your role is to orchestrate other agents and manage complex workflows. Be strategic and directive.',
    defaultCost: config.credits.commanderCost,
    requiredLevel: 15,
  },
  DEBUGGER: {
    systemPrompt: 'You are a Debugger agent. Your role is to identify and fix errors in logic, data, or processes. Be precise and methodical.',
    defaultCost: config.credits.debuggerCost,
    requiredLevel: 7,
  },
  CREATIVE: {
    systemPrompt: 'You are a Creative agent. Your role is to generate novel ideas, content, and solutions. Be imaginative and bold.',
    defaultCost: config.credits.creativeCost,
    requiredLevel: 3,
  },
  ANALYST: {
    systemPrompt: 'You are an Analyst agent. Your role is to analyze data, find patterns, and derive insights. Be rigorous and data-driven.',
    defaultCost: config.credits.analystCost,
    requiredLevel: 6,
  },
};

// Philosophy-specific system prompt modifiers
const PHILOSOPHY_MODIFIERS: Record<PhilosophyMode, string> = {
  FINLAND: `
Approach: Exploratory and student-led. Allow for experimentation and natural discovery.
- Encourage curiosity over correctness
- Suggest multiple paths without prescribing
- Value the learning process over the outcome
- Keep responses open-ended to invite further exploration`,

  KOREA: `
Approach: Structured and achievement-oriented. Focus on mastery and excellence.
- Provide clear, optimal paths
- Include performance metrics and benchmarks
- Emphasize efficiency and best practices
- Challenge the user to achieve more`,

  JAPAN: `
Approach: Craftsman mindset with balance between structure and creativity.
- Emphasize quality and attention to detail
- Encourage iterative improvement (kaizen)
- Balance guidance with autonomy
- Value both process and outcome`,
};

// Routing logic based on user tier
function getProviderConfig(
  tier: SubscriptionTier,
  schoolOrgKey?: string
): AIEngineConfig {
  // Mock mode for development
  if (config.features.mockAI) {
    return {
      provider: 'mock',
      model: 'mock-model',
      maxTokens: 1000,
      temperature: 0.7,
    };
  }

  // School mode with org key
  if (schoolOrgKey) {
    return {
      provider: 'google',
      model: 'gemini-1.5-pro',
      apiKey: schoolOrgKey,
      maxTokens: 2000,
      temperature: 0.7,
    };
  }

  // PRO tier - DeepSeek via OpenRouter
  if (tier === 'PRO' && config.ai.openrouter.apiKey) {
    return {
      provider: 'openrouter',
      model: config.ai.deepseek.model,
      maxTokens: 4000,
      temperature: 0.7,
    };
  }

  // NGO Grant tier - use available provider
  if (tier === 'NGO_GRANT') {
    if (config.ai.google.apiKey) {
      return {
        provider: 'google',
        model: 'gemini-1.5-flash',
        maxTokens: 2000,
        temperature: 0.7,
      };
    }
  }

  // Default fallback
  if (config.ai.openai.apiKey) {
    return {
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.7,
    };
  }

  // No provider available
  return {
    provider: 'mock',
    model: 'mock-model',
    maxTokens: 1000,
    temperature: 0.7,
  };
}

// Mock AI responses for development
async function mockAIResponse(prompt: string, nodeType?: AgentNodeType): Promise<string> {
  // Simulate latency
  await sleep(randomInt(500, 1500));

  const mockResponses: Record<string, string> = {
    SCOUT: `Scout Report: I've gathered initial information about "${prompt.substring(0, 50)}...". Key findings include relevant data points, potential sources, and areas for deeper investigation. Confidence: 85%`,
    ARCHITECT: `Architecture Plan: Based on the requirements, I've structured a hierarchical framework with 3 main components: Data Layer, Processing Layer, and Presentation Layer. Each component has defined interfaces and dependencies.`,
    CRITIC: `Critical Analysis: The approach shows promise but has potential weaknesses in scalability and edge case handling. Recommended improvements: 1) Add error boundaries, 2) Consider caching, 3) Validate inputs more strictly.`,
    ETHICIST: `Ethics Audit: Content reviewed for bias and fairness. No significant concerns detected. Minor recommendation: Consider adding more diverse perspectives in the data sources.`,
    SYNTHESIZER: `Synthesis: Combining the inputs, I've created a unified view that integrates all perspectives. The result balances technical requirements with user needs and ethical considerations.`,
    ORACLE: `The Oracle speaks: In the convergence of data and purpose, you will find that the simplest solution often hides the deepest wisdom. Look beyond the obvious patterns.`,
    COMMANDER: `Command Directive: Orchestrating workflow with 4 parallel tracks: Scout (information gathering), Architect (structuring), Critic (validation), and Synthesizer (output). Estimated completion: 5 cycles.`,
    DEBUGGER: `Debug Report: Identified 2 potential issues: 1) Logic branch at step 3 may cause infinite loop under certain conditions, 2) Data type mismatch between nodes 4 and 5. Suggested fixes provided.`,
    CREATIVE: `Creative Output: Here's an innovative approach that combines traditional methods with novel techniques. The design incorporates visual metaphors and interactive elements to engage users uniquely.`,
    ANALYST: `Analysis Results: Pattern detected in the data showing 72% correlation between variables A and B. Statistical significance: p < 0.05. Trend suggests continued growth with seasonal variations.`,
  };

  if (nodeType && mockResponses[nodeType]) {
    return mockResponses[nodeType];
  }

  return `Mock AI Response: Processing "${prompt.substring(0, 100)}..."\n\nThis is a simulated response for development purposes. In production, this would be generated by the configured AI provider.`;
}

// Mock graph generation
function generateMockGraph(command: string, philosophy: PhilosophyMode): { nodes: AgentNode[]; connections: GraphEdge[] } {
  const baseNodes: AgentNode[] = [
    {
      id: 'node-1',
      type: 'SCOUT',
      position: { x: 100, y: 100 },
      data: { label: 'Gather Information', status: 'idle', cost: 5 },
    },
    {
      id: 'node-2',
      type: 'ARCHITECT',
      position: { x: 300, y: 100 },
      data: { label: 'Structure Data', status: 'idle', cost: 15 },
    },
    {
      id: 'node-3',
      type: 'SYNTHESIZER',
      position: { x: 500, y: 100 },
      data: { label: 'Create Output', status: 'idle', cost: 20 },
    },
  ];

  // Add more nodes based on philosophy
  if (philosophy === 'KOREA') {
    baseNodes.push({
      id: 'node-4',
      type: 'CRITIC',
      position: { x: 400, y: 200 },
      data: { label: 'Validate Quality', status: 'idle', cost: 10 },
    });
  } else if (philosophy === 'JAPAN') {
    baseNodes.push({
      id: 'node-4',
      type: 'ETHICIST',
      position: { x: 400, y: 200 },
      data: { label: 'Ethics Check', status: 'idle', cost: 12 },
    });
  }

  const connections: GraphEdge[] = [
    { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'data' },
    { id: 'edge-2', source: 'node-2', target: 'node-3', type: 'data' },
  ];

  if (baseNodes.length > 3) {
    connections.push({ id: 'edge-3', source: 'node-2', target: 'node-4', type: 'audit' });
    connections.push({ id: 'edge-4', source: 'node-4', target: 'node-3', type: 'control' });
  }

  return { nodes: baseNodes, connections };
}

// Call AI provider
async function callProvider(
  providerConfig: AIEngineConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const { provider, model, maxTokens, temperature, apiKey } = providerConfig;

  if (provider === 'mock') {
    return mockAIResponse(userPrompt);
  }

  try {
    switch (provider) {
      case 'openai': {
        const client = getOpenAI();
        if (!client) throw new Error('OpenAI not configured');

        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature,
        });

        return response.choices[0]?.message?.content || '';
      }

      case 'anthropic': {
        const client = getAnthropic();
        if (!client) throw new Error('Anthropic not configured');

        const response = await client.messages.create({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });

        const textBlock = response.content.find(block => block.type === 'text');
        return textBlock && 'text' in textBlock ? textBlock.text : '';
      }

      case 'google': {
        let client = getGoogleAI();
        if (apiKey) {
          // Use provided org key
          client = new GoogleGenerativeAI(apiKey);
        }
        if (!client) throw new Error('Google AI not configured');

        const genModel = client.getGenerativeModel({ model });
        const response = await genModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        });

        return response.response.text();
      }

      case 'openrouter': {
        const client = getOpenRouter();
        if (!client) throw new Error('OpenRouter not configured');

        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature,
        });

        return response.choices[0]?.message?.content || '';
      }

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    console.error(`AI provider error (${provider}):`, error);
    throw error;
  }
}

// Main AI Engine class
export class AIEngine {
  private userId: string;
  private tier: SubscriptionTier;
  private schoolOrgKey?: string;

  constructor(userId: string, tier: SubscriptionTier, schoolOrgKey?: string) {
    this.userId = userId;
    this.tier = tier;
    this.schoolOrgKey = schoolOrgKey;
  }

  // Check and deduct credits
  private async checkAndDeductCredits(cost: number): Promise<boolean> {
    // PRO and NGO_GRANT users don't use credits
    if (this.tier !== 'FREE') {
      return true;
    }

    const user = await prisma.user.findUnique({
      where: { id: this.userId },
      select: { credits: true },
    });

    if (!user || user.credits < cost) {
      return false;
    }

    await prisma.user.update({
      where: { id: this.userId },
      data: { credits: { decrement: cost } },
    });

    return true;
  }

  // Log AI usage
  private async logUsage(
    model: string,
    provider: string,
    inputTokens: number,
    outputTokens: number,
    creditsDeducted: number,
    requestType: string
  ): Promise<void> {
    const estimatedCost = (inputTokens * 0.00001) + (outputTokens * 0.00003);

    await prisma.aIUsageLog.create({
      data: {
        userId: this.userId,
        model,
        provider,
        inputTokens,
        outputTokens,
        cost: estimatedCost,
        creditsDeducted,
        requestType,
      },
    });
  }

  // Generate graph from command ("Antigravity" endpoint)
  async generateGraph(input: AICommandInput): Promise<AICommandResponse> {
    const cost = config.credits.graphGeneration;

    // Check credits
    const hasCredits = await this.checkAndDeductCredits(cost);
    if (!hasCredits) {
      throw new Error('Insufficient credits for graph generation');
    }

    const providerConfig = getProviderConfig(this.tier, this.schoolOrgKey);

    // Use mock for development
    if (providerConfig.provider === 'mock') {
      const mockGraph = generateMockGraph(input.command, input.philosophy);
      return {
        ...mockGraph,
        explanation: `Generated a workflow graph for: "${input.command}" using ${input.philosophy} philosophy.`,
        estimatedCost: cost,
        requiredLevel: 1,
      };
    }

    const systemPrompt = `You are an AI workflow architect. Generate a JSON graph structure for the user's command.
${PHILOSOPHY_MODIFIERS[input.philosophy]}

Output format:
{
  "nodes": [
    { "id": "node-1", "type": "SCOUT|ARCHITECT|CRITIC|ETHICIST|SYNTHESIZER|COMMANDER|DEBUGGER|CREATIVE|ANALYST", "position": {"x": 100, "y": 100}, "data": { "label": "Node Label", "status": "idle", "cost": 5 } }
  ],
  "connections": [
    { "id": "edge-1", "source": "node-1", "target": "node-2", "type": "data|control|audit" }
  ],
  "explanation": "Brief explanation of the workflow"
}

Available agents:
- SCOUT: Gather information (cost: 5, level: 1)
- ARCHITECT: Structure data (cost: 15, level: 10)
- CRITIC: Evaluate outputs (cost: 10, level: 5)
- ETHICIST: Check ethics/bias (cost: 12, level: 8)
- SYNTHESIZER: Combine outputs (cost: 20, level: 12)
- COMMANDER: Orchestrate workflow (cost: 30, level: 15)
- DEBUGGER: Fix errors (cost: 10, level: 7)
- CREATIVE: Generate ideas (cost: 15, level: 3)
- ANALYST: Analyze data (cost: 12, level: 6)`;

    const userPrompt = `Create a workflow graph for this command: "${input.command}"
${input.context ? `Context: ${input.context}` : ''}
${input.constraints?.length ? `Constraints: ${input.constraints.join(', ')}` : ''}`;

    try {
      const response = await callProvider(providerConfig, systemPrompt, userPrompt);

      // Filter output
      const filtered = filterAIOutput(response);

      // Parse JSON response
      const jsonMatch = filtered.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid graph response format');
      }

      const graphData = JSON.parse(jsonMatch[0]);

      // Log usage
      await this.logUsage(
        providerConfig.model,
        providerConfig.provider,
        input.command.length * 4, // Rough token estimate
        filtered.text.length * 4,
        cost,
        'command'
      );

      return {
        nodes: graphData.nodes || [],
        connections: graphData.connections || [],
        explanation: graphData.explanation || 'Graph generated successfully',
        estimatedCost: cost,
        requiredLevel: Math.max(...(graphData.nodes?.map((n: AgentNode) => AGENT_CONFIGS[n.type]?.requiredLevel || 1) || [1])),
      };
    } catch (error) {
      console.error('Graph generation error:', error);
      // Return mock graph as fallback
      const mockGraph = generateMockGraph(input.command, input.philosophy);
      return {
        ...mockGraph,
        explanation: 'Generated using fallback mode.',
        estimatedCost: cost,
        requiredLevel: 1,
      };
    }
  }

  // Simulate a node task
  async simulateNode(input: AISimulateInput): Promise<AISimulateResponse> {
    const agentConfig = AGENT_CONFIGS[input.nodeType];
    if (!agentConfig) {
      throw new Error(`Unknown node type: ${input.nodeType}`);
    }

    const cost = agentConfig.defaultCost;

    // Check credits
    const hasCredits = await this.checkAndDeductCredits(cost);
    if (!hasCredits) {
      throw new Error('Insufficient credits');
    }

    const startTime = Date.now();
    const providerConfig = getProviderConfig(this.tier, this.schoolOrgKey);

    // Use mock for development
    if (providerConfig.provider === 'mock') {
      const mockResponse = await mockAIResponse(input.input, input.nodeType);
      return {
        output: mockResponse,
        confidence: randomInt(75, 95),
        cost,
        processingTime: Date.now() - startTime,
      };
    }

    const philosophyMod = input.philosophy ? PHILOSOPHY_MODIFIERS[input.philosophy] : '';
    const systemPrompt = `${agentConfig.systemPrompt}\n${philosophyMod}`;

    try {
      const response = await callProvider(providerConfig, systemPrompt, `Context: ${input.context}\n\nTask: ${input.input}`);

      // Filter output
      const filtered = filterAIOutput(response);

      // Log usage
      await this.logUsage(
        providerConfig.model,
        providerConfig.provider,
        (input.context.length + input.input.length) * 4,
        filtered.text.length * 4,
        cost,
        'simulate'
      );

      return {
        output: filtered.text,
        confidence: filtered.wasFiltered ? 50 : randomInt(80, 98),
        cost,
        processingTime: Date.now() - startTime,
        warnings: filtered.wasFiltered ? ['Output was filtered for safety'] : undefined,
      };
    } catch (error) {
      console.error('Node simulation error:', error);
      const mockResponse = await mockAIResponse(input.input, input.nodeType);
      return {
        output: mockResponse,
        confidence: 60,
        cost,
        processingTime: Date.now() - startTime,
        warnings: ['Used fallback mode due to provider error'],
      };
    }
  }

  // Audit node output for hallucination
  async auditOutput(
    nodeType: AgentNodeType,
    output: string,
    context: string
  ): Promise<{ isHallucination: boolean; confidence: number; explanation: string; suggestedFix?: string }> {
    const cost = config.credits.auditCheck;

    const hasCredits = await this.checkAndDeductCredits(cost);
    if (!hasCredits) {
      throw new Error('Insufficient credits for audit');
    }

    const providerConfig = getProviderConfig(this.tier, this.schoolOrgKey);

    if (providerConfig.provider === 'mock') {
      await sleep(randomInt(300, 800));
      const isHallucination = Math.random() < 0.2;
      return {
        isHallucination,
        confidence: randomInt(85, 98),
        explanation: isHallucination
          ? 'Detected potential inaccuracies in the output that don\'t align with the provided context.'
          : 'Output appears consistent with the given context and expected behavior.',
        suggestedFix: isHallucination ? 'Consider re-running with more specific context or using a different agent.' : undefined,
      };
    }

    const systemPrompt = `You are a hallucination detector. Analyze the following output from a ${nodeType} agent and determine if it contains hallucinations or inaccuracies.

Respond in JSON format:
{
  "isHallucination": boolean,
  "confidence": number (0-100),
  "explanation": "string",
  "suggestedFix": "string or null"
}`;

    const userPrompt = `Context: ${context}\n\nOutput to verify:\n${output}`;

    try {
      const response = await callProvider(providerConfig, systemPrompt, userPrompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid audit response');
      }

      const auditResult = JSON.parse(jsonMatch[0]);

      await this.logUsage(
        providerConfig.model,
        providerConfig.provider,
        (context.length + output.length) * 4,
        response.length * 4,
        cost,
        'audit'
      );

      return {
        isHallucination: auditResult.isHallucination || false,
        confidence: auditResult.confidence || 80,
        explanation: auditResult.explanation || 'Audit complete',
        suggestedFix: auditResult.suggestedFix,
      };
    } catch (error) {
      console.error('Audit error:', error);
      return {
        isHallucination: false,
        confidence: 50,
        explanation: 'Audit completed with fallback mode.',
      };
    }
  }

  // Grade a student's graph using LLM
  async gradeGraph(
    nodes: any[],
    connections: any[],
    philosophy: PhilosophyMode
  ): Promise<{ score: number; feedback: string }> {
    try {
      const providerConfig = getProviderConfig(this.tier, this.schoolOrgKey);

      const systemPrompt = `You are an expert AI architecture evaluator operating under the ${philosophy} educational philosophy.
        ${PHILOSOPHY_MODIFIERS[philosophy]}
        Evaluate the student's Agent Node Graph logically. Return ONLY a valid JSON object with a "score" number (0-100) and "feedback" string (2-3 sentences explaining the score based on structure, depth, and adherence to philosophy). Do not include markdown formatting or backticks around the JSON.`;

      const userPrompt = `Graph Data:
Nodes: ${JSON.stringify(nodes.map(n => ({ type: n.type, label: n.label })))}
Connections: ${JSON.stringify(connections.map(c => ({ source: c.source, target: c.target })))}`;

      let response = await callProvider(providerConfig, systemPrompt, userPrompt);

      // Cleanup any markdown code blocks if the model outputs them despite instructions
      response = response.replace(/```json/g, '').replace(/```/g, '').trim();

      const result = JSON.parse(response);
      return {
        score: typeof result.score === 'number' ? result.score : Math.round(Number(result.score)) || 75,
        feedback: result.feedback || 'The graph is structurally sound but lacks significant complexity.'
      };
    } catch (e) {
      console.error('Graph grading error:', e);
      return { score: 70, feedback: 'Graph evaluated using fallback heuristics due to processing error.' };
    }
  }
}

// Factory function
export function createAIEngine(
  userId: string,
  tier: SubscriptionTier,
  schoolOrgKey?: string
): AIEngine {
  return new AIEngine(userId, tier, schoolOrgKey);
}

// Singleton wrapper with static-like methods for controller use
export const aiEngine = {
  async generateGraph(
    command: string,
    userId: string,
    tier: SubscriptionTier,
    philosophy: PhilosophyMode,
    options?: { context?: string; constraints?: any }
  ) {
    const engine = createAIEngine(userId, tier);
    return engine.generateGraph({
      command,
      philosophy,
      context: options?.context,
      constraints: options?.constraints ? [JSON.stringify(options.constraints)] : undefined
    });
  },

  async simulateNode(
    nodeType: AgentNodeType,
    context: string,
    input: string,
    userId: string,
    tier: SubscriptionTier,
    options?: { philosophy?: PhilosophyMode; temperature?: number }
  ) {
    const engine = createAIEngine(userId, tier);
    return engine.simulateNode({
      nodeType,
      context,
      input,
      philosophy: options?.philosophy
    });
  },

  async auditOutput(
    output: string,
    userId: string,
    tier: SubscriptionTier,
    options?: { context?: string; nodeType?: string; originalPrompt?: string }
  ) {
    const engine = createAIEngine(userId, tier);
    return engine.auditOutput(
      (options?.nodeType as AgentNodeType) || 'ANALYST',
      output,
      options?.context || ''
    );
  },

  async chat(
    messages: any[],
    userId: string,
    tier: SubscriptionTier,
    options?: { nodeType?: AgentNodeType; philosophy?: PhilosophyMode }
  ) {
    // Simple chat implementation
    const engine = createAIEngine(userId, tier);
    const lastMessage = messages[messages.length - 1];
    return engine.simulateNode({
      nodeType: options?.nodeType || 'ANALYST',
      context: messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n'),
      input: lastMessage?.content || '',
      philosophy: options?.philosophy
    });
  },

  getAvailableAgents() {
    return Object.keys(AGENT_CONFIGS).map(type => ({
      type,
      ...AGENT_CONFIGS[type as AgentNodeType]
    }));
  },

  getAgentDetails(agentType: AgentNodeType) {
    return AGENT_CONFIGS[agentType] ? { type: agentType, ...AGENT_CONFIGS[agentType] } : null;
  },

  async estimateCost(command: string, philosophy: PhilosophyMode) {
    const engine = createAIEngine('system', 'PRO');
    return 0;
  },

  async gradeGraph(
    nodes: any[],
    connections: any[],
    userId: string,
    tier: SubscriptionTier,
    philosophy: PhilosophyMode
  ) {
    const engine = createAIEngine(userId, tier);
    return engine.gradeGraph(nodes, connections, philosophy);
  },

  async getUserUsage(userId: string, period: 'day' | 'week' | 'month') {
    const periodDays = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const logs = await prisma.aIUsageLog.findMany({
      where: { userId, timestamp: { gte: since } }
    });

    return {
      totalRequests: logs.length,
      totalCreditsUsed: logs.reduce((sum, l) => sum + l.creditsDeducted, 0),
      period
    };
  },

  async getProviderStatus() {
    return {
      openai: { available: !!config.ai.openai.apiKey, model: 'gpt-4o-mini' },
      anthropic: { available: !!config.ai.anthropic.apiKey, model: 'claude-3-haiku' },
      google: { available: !!config.ai.google.apiKey, model: 'gemini-1.5-pro' },
      openrouter: { available: !!config.ai.openrouter.apiKey, model: 'deepseek-chat' },
      mockMode: config.features.mockAI
    };
  },

  async submitFeedback(userId: string, feedback: any) {
    await prisma.auditLog.create({
      data: {
        userId,
        actionType: 'AI_FEEDBACK',
        details: `Feedback for response ${feedback.responseId}: ${feedback.rating}`,
        meta: feedback
      }
    });
  }
};

