import React from 'react';
import { useVision } from '../context/VisionContext';

export const SystemHealthBanner: React.FC = () => {
  const {
    systemHealth,
    checkSystemDiagnostics,
    isCheckingDiagnostics,
    backendConnected
  } = useVision();

  if (!systemHealth) return null;

  const { internetConnected, apiKeysConfigured, keyStatus, errors, warnings, missingEnvVars } = systemHealth;

  const hasBlockingError = !internetConnected || !apiKeysConfigured || keyStatus === 'quota_exceeded' || keyStatus === 'invalid' || backendConnected === false;

  if (!hasBlockingError && warnings.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-[#12080C] border-b border-rose-500/40 px-4 py-3 text-xs text-rose-200 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/50 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-rose-400 text-lg animate-pulse">
              {!internetConnected ? 'wifi_off' : !apiKeysConfigured ? 'key_off' : 'warning'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-mono font-bold text-rose-300 text-sm">
              <span>SYSTEM DIAGNOSTIC ALERT</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-[10px] uppercase tracking-wider text-rose-400 border border-rose-500/30">
                {!internetConnected ? 'OFFLINE NETWORK' : !apiKeysConfigured ? 'MISSING API KEY' : 'API KEY ERROR'}
              </span>
            </div>

            <div className="flex flex-col gap-1 font-sans text-xs text-slate-300">
              {!internetConnected && (
                <div className="flex items-center gap-1.5 text-rose-300 font-medium">
                  <span className="material-symbols-outlined text-xs">signal_wifi_off</span>
                  <span><strong>No Internet Connection:</strong> Your device appears to be offline. Internet is required to call AI models.</span>
                </div>
              )}

              {!apiKeysConfigured && (
                <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                  <span className="material-symbols-outlined text-xs">key</span>
                  <span><strong>Missing API Key in .env:</strong> Please open <code>.env</code> and set <code>GEMINI_API_KEY=your_key</code> or <code>OPENROUTER_API_KEY=your_key</code>.</span>
                </div>
              )}

              {apiKeysConfigured && keyStatus === 'quota_exceeded' && (
                <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                  <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                  <span><strong>Quota Exceeded / Rate Limited (HTTP 429):</strong> Your Gemini API key quota has been exhausted. Check your Google AI Studio plan.</span>
                </div>
              )}

              {apiKeysConfigured && keyStatus === 'invalid' && (
                <div className="flex items-center gap-1.5 text-rose-300 font-medium">
                  <span className="material-symbols-outlined text-xs">gpp_maybe</span>
                  <span><strong>Invalid API Key:</strong> The API key provided in <code>.env</code> was rejected by the provider (HTTP 401/403).</span>
                </div>
              )}

              {backendConnected === false && (
                <div className="flex items-center gap-1.5 text-rose-300 font-medium">
                  <span className="material-symbols-outlined text-xs">dns</span>
                  <span><strong>Backend Disconnected:</strong> Cannot connect to local Express server. Verify <code>npm run dev</code> is running.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={() => checkSystemDiagnostics()}
            disabled={isCheckingDiagnostics}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${isCheckingDiagnostics ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{isCheckingDiagnostics ? 'Re-checking...' : 'Re-check Environment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
