

// DeepSeek API Integration
// In a real production environment, the API Key should be handled via a secure backend proxy
// if using the "Managed/Pro" tier. For this demo, we simulate the "Managed" auth.

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const MOCK_SYSTEM_KEY = 'sk-deepseek-mock-system-key-12345'; // Simulation of a backend injected key

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const generateDeepSeek = async (
  messages: DeepSeekMessage[], 
  jsonMode: boolean = false,
  customKey?: string
): Promise<any> => {

  const apiKey = customKey || MOCK_SYSTEM_KEY;

  // Since we don't have a real DeepSeek key in this static demo, 
  // we will simulate the network call structure but fallback to mock data if the call fails (which it will without a real key).
  
  try {
    // Note: This fetch will likely 401 in this demo environment without a real key.
    // We catch the error and return simulated DeepSeek responses for the UX flow.
    
    // Check if we are in "simulation" mode for the demo
    if (apiKey.includes('mock')) {
       await new Promise(r => setTimeout(r, 1500)); // Network latency
       return generateMockResponse(messages);
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        response_format: jsonMode ? { type: 'json_object' } : undefined,
        stream: false
      })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.warn("DeepSeek Call Failed (Simulating fallback):", error);
    return generateMockResponse(messages);
  }
};

// Helper to generate context-aware mock responses for the demo
const generateMockResponse = (messages: DeepSeekMessage[]): string => {
    const lastMsg = messages[messages.length - 1].content.toLowerCase();
    
    if (lastMsg.includes('json') || lastMsg.includes('break down')) {
        return JSON.stringify({
            nodes: [
                { label: "DeepSeek Scout", type: "SCOUT", description: "Analyzing deep web data." },
                { label: "DeepSeek Logic", type: "ARCHITECT", description: "Reasoning about patterns." }
            ],
            connections: [{ fromIndex: 0, toIndex: 1 }]
        });
    }

    if (lastMsg.includes('confidence')) {
        return JSON.stringify({
            output: "DeepSeek V3 analysis complete. Logic verified.",
            confidence: 98
        });
    }

    return "DeepSeek V3: Query processed. Optimization nominal.";
};