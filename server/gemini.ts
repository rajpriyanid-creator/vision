import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;
let lastModelLiveStatus = false;
let lastModelError: string | null = null;
let lastModelCheckTime = 0;

export function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    lastModelLiveStatus = false;
    lastModelError = 'GEMINI_API_KEY environment variable not set';
    return null;
  }
  if (!aiInstance) {
    try {
      aiInstance = new GoogleGenAI({ apiKey });
    } catch (e: any) {
      lastModelLiveStatus = false;
      lastModelError = e?.message || 'Failed to initialize GoogleGenAI client';
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      live: false,
      status: 'offline',
      model: 'deterministic-fallback',
      error: 'No GEMINI_API_KEY configured'
    };
  }

  // Cache live check for 30 seconds
  const now = Date.now();
  if (now - lastModelCheckTime < 30000 && lastModelLiveStatus) {
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
      setTimeout(() => reject(new Error('Model health check timed out')), 5000)
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
    lastModelError = isQuota
      ? 'Gemini API free tier rate-limit/quota exceeded (safe fallback active)'
      : (err?.message || 'Failed to contact model API');
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
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  if (!hasKey) {
    return {
      live: false,
      status: 'offline',
      model: 'deterministic-fallback',
      error: 'No GEMINI_API_KEY provided (running in deterministic offline mode)'
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
        setTimeout(() => reject(new Error(`Timeout with model ${modelName}`)), 12000)
      );
      const generatePromise = (async () => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: systemInstruction ? { systemInstruction } : undefined
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
