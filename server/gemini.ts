import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { loadEnvFromFile } from './envValidator';

let aiInstance: GoogleGenAI | null = null;
let currentApiKey = '';
let lastModelLiveStatus = false;
let lastModelError: string | null = null;
let lastModelCheckTime = 0;

export function getGemini(): GoogleGenAI | null {
  loadEnvFromFile();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!geminiKey || geminiKey.startsWith('your-')) {
    lastModelLiveStatus = false;
    lastModelError = 'No valid GEMINI_API_KEY set in .env file';
    aiInstance = null;
    currentApiKey = '';
    return null;
  }
  if (!aiInstance || currentApiKey !== geminiKey) {
    try {
      aiInstance = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      currentApiKey = geminiKey;
    } catch (e: any) {
      lastModelLiveStatus = false;
      lastModelError = e?.message || 'Failed to initialize GoogleGenAI client';
      aiInstance = null;
      currentApiKey = '';
      return null;
    }
  }
  return aiInstance;
}

const SUPPORTED_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

/**
 * OpenRouter API integration for hackathon keys starting with sk-or-v1-
 */
export async function generateWithOpenRouter(
  prompt: string,
  systemInstruction?: string
): Promise<string | null> {
  loadEnvFromFile();
  const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!openrouterKey || openrouterKey.startsWith('your-')) return null;

  const models = ['google/gemini-2.0-flash-001', 'google/gemini-2.5-flash', 'meta-llama/llama-3.3-70b-instruct'];

  for (const model of models) {
    try {
      const messages: Array<{ role: string; content: string }> = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'VISION Adaptive Engine'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && typeof text === 'string') {
          lastModelLiveStatus = true;
          lastModelError = null;
          return text.trim();
        }
      } else {
        const errText = await res.text();
        console.warn(`[OpenRouter API] Call with model ${model} failed (HTTP ${res.status}):`, errText);
      }
    } catch (err: any) {
      console.warn(`[OpenRouter API] Exception with ${model}:`, err?.message || err);
    }
  }
  return null;
}

export async function checkGeminiHealth(): Promise<{
  live: boolean;
  status: 'live' | 'degraded' | 'offline';
  model: string;
  error?: string | null;
}> {
  loadEnvFromFile();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();

  const hasValidGemini = Boolean(geminiKey && !geminiKey.startsWith('your-'));
  const hasValidOpenRouter = Boolean(openrouterKey && !openrouterKey.startsWith('your-'));

  if (!hasValidGemini && !hasValidOpenRouter) {
    return {
      live: false,
      status: 'offline',
      model: 'deterministic-fallback',
      error: 'Missing or placeholder API key in .env (Please insert valid GEMINI_API_KEY or OPENROUTER_API_KEY)'
    };
  }

  // Cache live check for 10 seconds
  const now = Date.now();
  if (now - lastModelCheckTime < 10000 && lastModelLiveStatus) {
    return {
      live: lastModelLiveStatus,
      status: lastModelLiveStatus ? 'live' : 'degraded',
      model: hasValidOpenRouter ? 'openrouter/gemini' : SUPPORTED_MODELS[0],
      error: lastModelError
    };
  }

  // Try OpenRouter first if openrouter key is present
  if (hasValidOpenRouter) {
    try {
      const probeResult = await generateWithOpenRouter('ping');
      if (probeResult) {
        lastModelLiveStatus = true;
        lastModelError = null;
        lastModelCheckTime = now;
        return {
          live: true,
          status: 'live',
          model: 'openrouter/gemini-2.0-flash'
        };
      }
    } catch {
      // Fall through to Gemini check
    }
  }

  if (hasValidGemini) {
    const ai = getGemini();
    if (ai) {
      try {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Model health probe timed out')), 5000)
        );
        const probePromise = ai.models.generateContent({
          model: SUPPORTED_MODELS[0],
          contents: 'ping'
        });

        await Promise.race([probePromise, timeoutPromise]);
        lastModelLiveStatus = true;
        lastModelError = null;
        lastModelCheckTime = now;
        return {
          live: true,
          status: 'live',
          model: SUPPORTED_MODELS[0]
        };
      } catch (err: any) {
        lastModelLiveStatus = false;
        const isQuota = err?.status === 429 || (err?.message && (err.message.includes('429') || err.message.includes('Quota') || err.message.includes('RESOURCE_EXHAUSTED')));
        const isNetwork = err?.code === 'ENOTFOUND' || err?.message?.includes('fetch failed') || err?.message?.includes('timed out');

        if (isNetwork) {
          lastModelError = 'Network Offline: Cannot reach LLM gateway. Please check your internet connection.';
        } else if (isQuota) {
          lastModelError = 'Gemini API quota/rate-limit exceeded (HTTP 429)';
        } else {
          lastModelError = err?.message || 'Failed to contact model API';
        }

        lastModelCheckTime = now;
        return {
          live: false,
          status: 'degraded',
          model: SUPPORTED_MODELS[0],
          error: lastModelError
        };
      }
    }
  }

  return {
    live: false,
    status: 'offline',
    model: 'deterministic-fallback',
    error: lastModelError || 'No valid active LLM provider reachable'
  };
}

export function getGeminiStatus(): {
  live: boolean;
  status: 'live' | 'degraded' | 'offline';
  model: string;
  error?: string | null;
} {
  loadEnvFromFile();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const hasKey = Boolean((geminiKey && !geminiKey.startsWith('your-')) || (openrouterKey && !openrouterKey.startsWith('your-')));

  if (!hasKey) {
    return {
      live: false,
      status: 'offline',
      model: 'deterministic-fallback',
      error: 'Missing valid API Key in .env file'
    };
  }
  return {
    live: lastModelLiveStatus,
    status: lastModelLiveStatus ? 'live' : (lastModelError ? 'degraded' : 'offline'),
    model: openrouterKey && !openrouterKey.startsWith('your-') ? 'openrouter/gemini' : SUPPORTED_MODELS[0],
    error: lastModelError
  };
}

export async function generateWithGemini(
  prompt: string,
  systemInstruction?: string
): Promise<string | null> {
  loadEnvFromFile();
  const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();

  // Try OpenRouter first if valid OpenRouter key is configured
  if (openrouterKey && !openrouterKey.startsWith('your-')) {
    const openRouterRes = await generateWithOpenRouter(prompt, systemInstruction);
    if (openRouterRes) return openRouterRes;
  }

  const ai = getGemini();
  if (!ai) {
    lastModelLiveStatus = false;
    return null;
  }

  for (const modelName of SUPPORTED_MODELS) {
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout with model ${modelName}`)), 25000)
      );
      const generatePromise = (async () => {
        const config: any = {};
        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }
        if (modelName === 'gemini-3.1-flash-lite') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: Object.keys(config).length > 0 ? config : undefined
        });
        return response.text?.trim() || null;
      })();

      const result = await Promise.race([generatePromise, timeoutPromise]);
      if (result) {
        lastModelLiveStatus = true;
        lastModelError = null;
        return result;
      }
    } catch (e: any) {
      const isQuota = e?.status === 429 || (e?.message && (e.message.includes('429') || e.message.includes('Quota') || e.message.includes('RESOURCE_EXHAUSTED')));
      if (isQuota) {
        lastModelError = `Gemini API quota/rate limit reached on ${modelName}`;
        console.warn(`[Gemini API] Quota/rate-limit on ${modelName}, attempting fallback.`);
      } else {
        lastModelError = e instanceof Error ? e.message : String(e);
        console.warn(`[Gemini API] Call with model ${modelName} failed:`, lastModelError);
      }
      lastModelLiveStatus = false;
    }
  }

  return null;
}
