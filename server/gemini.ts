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

const SUPPORTED_MODELS = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

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
      model: 'gemini-3.6-flash',
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
      model: 'gemini-3.6-flash',
      contents: 'ping'
    });

    await Promise.race([probePromise, timeoutPromise]);
    lastModelLiveStatus = true;
    lastModelError = null;
    lastModelCheckTime = now;
    return {
      live: true,
      status: 'live',
      model: 'gemini-3.6-flash'
    };
  } catch (err: any) {
    lastModelLiveStatus = false;
    lastModelError = err?.message || 'Failed to contact model API';
    lastModelCheckTime = now;
    return {
      live: false,
      status: 'degraded',
      model: 'gemini-3.6-flash',
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
    model: 'gemini-3.6-flash',
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
      lastModelError = e instanceof Error ? e.message : String(e);
      lastModelLiveStatus = false;
      console.warn(`Gemini call with model ${modelName} failed:`, lastModelError);
    }
  }

  return null;
}
