import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { loadEnvFromFile } from './envValidator';

let aiInstance: GoogleGenAI | null = null;
let currentApiKey = '';
let lastModelLiveStatus = false;
let lastModelError: string | null = null;
let lastModelCheckTime = 0;

export function getGemini(): GoogleGenAI | null {
  loadEnvFromFile();
  const apiKey = (process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) {
    lastModelLiveStatus = false;
    lastModelError = 'Neither GEMINI_API_KEY nor OPENROUTER_API_KEY set in .env file';
    aiInstance = null;
    currentApiKey = '';
    return null;
  }
  if (!aiInstance || currentApiKey !== apiKey) {
    try {
      aiInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      currentApiKey = apiKey;
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

export async function checkGeminiHealth(): Promise<{
  live: boolean;
  status: 'live' | 'degraded' | 'offline';
  model: string;
  error?: string | null;
}> {
  loadEnvFromFile();
  const apiKey = (process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) {
    return {
      live: false,
      status: 'offline',
      model: 'deterministic-fallback',
      error: 'Missing API Key in .env (GEMINI_API_KEY or OPENROUTER_API_KEY required)'
    };
  }

  // Cache live check for 10 seconds
  const now = Date.now();
  if (now - lastModelCheckTime < 10000 && lastModelLiveStatus) {
    return {
      live: lastModelLiveStatus,
      status: lastModelLiveStatus ? 'live' : 'degraded',
      model: SUPPORTED_MODELS[0],
      error: lastModelError
    };
  }

  const ai = getGemini();
  if (!ai) {
    return {
      live: false,
      status: 'offline',
      model: 'deterministic-fallback',
      error: lastModelError || 'AI client unavailable'
    };
  }

  try {
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Model health probe timed out (check internet connection)')), 5000)
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

export function getGeminiStatus(): {
  live: boolean;
  status: 'live' | 'degraded' | 'offline';
  model: string;
  error?: string | null;
} {
  loadEnvFromFile();
  const hasKey = Boolean((process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || '').trim());
  if (!hasKey) {
    return {
      live: false,
      status: 'offline',
      model: 'deterministic-fallback',
      error: 'Missing API Key in .env file'
    };
  }
  return {
    live: lastModelLiveStatus,
    status: lastModelLiveStatus ? 'live' : (lastModelError ? 'degraded' : 'offline'),
    model: SUPPORTED_MODELS[0],
    error: lastModelError
  };
}

export async function generateWithGemini(
  prompt: string,
  systemInstruction?: string
): Promise<string | null> {
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
