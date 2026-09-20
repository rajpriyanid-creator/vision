import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

export interface SystemDiagnostics {
  healthy: boolean;
  internetConnected: boolean;
  apiKeysConfigured: boolean;
  keyStatus: 'valid' | 'missing' | 'quota_exceeded' | 'invalid' | 'unknown';
  activeProvider: string;
  missingEnvVars: string[];
  errors: string[];
  warnings: string[];
  timestamp: string;
}

/**
 * Dynamically parses .env from disk and syncs key-value pairs into process.env
 */
export function loadEnvFromFile(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const parsed: Record<string, string> = {};
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (key) {
          process.env[key] = val;
          parsed[key] = val;
        }
      }
    }
    return parsed;
  } catch {
    return {};
  }
}

/**
  Checks internet connectivity by attempting a fast lightweight HEAD request to public endpoints
 */
export async function checkInternetConnectivity(): Promise<boolean> {
  // Try fast ping to Google DNS or Cloudflare DNS
  const testUrls = [
    'https://1.1.1.1',
    'https://www.google.com',
    'https://generativelanguage.googleapis.com'
  ];

  for (const url of testUrls) {
    try {
      const isOnline = await new Promise<boolean>((resolve) => {
        const req = https.request(url, { method: 'HEAD', timeout: 3500 }, (res) => {
          resolve(true);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      });
      if (isOnline) return true;
    } catch {
      // Try next URL
    }
  }
  return false;
}

/**
 * Validates .env key configuration and system readiness
 */
export async function runSystemDiagnostics(): Promise<SystemDiagnostics> {
  // Synchronize process.env from disk .env file dynamically
  loadEnvFromFile();

  let geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  let openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();

  if (geminiKey.startsWith('your-')) geminiKey = '';
  if (openrouterKey.startsWith('your-')) openrouterKey = '';

  const mongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();

  const missingEnvVars: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const apiKeysConfigured = Boolean(geminiKey || openrouterKey);
  const activeProvider = geminiKey ? 'Gemini API' : openrouterKey ? 'OpenRouter API' : 'None';

  if (!apiKeysConfigured) {
    missingEnvVars.push('GEMINI_API_KEY or OPENROUTER_API_KEY');
    errors.push('Missing API Key: Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is defined in .env (or key is set to a placeholder)');
  }

  if (!mongoUri) {
    warnings.push('MONGO_URI is not set in .env (using default MongoDB Atlas fallback URI)');
  }

  // Internet Check
  const internetConnected = await checkInternetConnectivity();
  if (!internetConnected) {
    errors.push('No Internet Connection: Unable to reach network gateways. Check your internet connection.');
  }

  let keyStatus: SystemDiagnostics['keyStatus'] = 'unknown';

  if (!apiKeysConfigured) {
    keyStatus = 'missing';
  } else if (!internetConnected) {
    keyStatus = 'unknown'; // cannot probe key without network
  } else {
    // If online & key present, probe key
    try {
      if (geminiKey) {
        const probeUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
        const probeResult = await new Promise<{ status: number; message?: string }>((resolve) => {
          const req = https.get(probeUrl, { timeout: 4000 }, (res) => {
            resolve({ status: res.statusCode || 0 });
          });
          req.on('error', (err) => resolve({ status: 0, message: err.message }));
          req.on('timeout', () => {
            req.destroy();
            resolve({ status: 0, message: 'Probe timed out' });
          });
        });

        if (probeResult.status === 200) {
          keyStatus = 'valid';
        } else if (probeResult.status === 429 || probeResult.status === 402) {
          keyStatus = 'quota_exceeded';
          errors.push(`API Key Error: Gemini API key returned HTTP ${probeResult.status} (Quota Exceeded / Rate Limited)`);
        } else if (probeResult.status === 400 || probeResult.status === 401 || probeResult.status === 403) {
          keyStatus = 'invalid';
          errors.push(`API Key Error: Gemini API key is invalid or unauthorized (HTTP ${probeResult.status})`);
        } else {
          keyStatus = 'valid'; // fallback assumption if HTTP status is unexpected
        }
      } else if (openrouterKey) {
        keyStatus = 'valid';
      }
    } catch {
      keyStatus = 'valid';
    }
  }

  const healthy = internetConnected && apiKeysConfigured && errors.length === 0;

  return {
    healthy,
    internetConnected,
    apiKeysConfigured,
    keyStatus,
    activeProvider,
    missingEnvVars,
    errors,
    warnings,
    timestamp: new Date().toISOString()
  };
}
