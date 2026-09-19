import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

interface BackendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendConfigModal: React.FC<BackendConfigModalProps> = ({ isOpen, onClose }) => {
  const {
    apiBaseUrl,
    updateApiBaseUrl,
    backendConnected,
    backendLatency,
    checkBackendHealth
  } = useVision();

  const [inputUrl, setInputUrl] = useState<string>(apiBaseUrl);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    updateApiBaseUrl(inputUrl);
    const ok = await checkBackendHealth();
    setTesting(false);
    setTestResult(ok ? 'Connected successfully!' : 'Failed to connect to backend.');
  };

  const handleSaveAndClose = () => {
    updateApiBaseUrl(inputUrl);
    onClose();
  };

  const handleResetDefault = () => {
    const defaultUrl = 'http://localhost:8000/api';
    setInputUrl(defaultUrl);
    updateApiBaseUrl(defaultUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#0E1526] border border-[#1F2F4A] p-6 shadow-2xl flex flex-col gap-4 text-on-surface">
        <div className="flex items-center justify-between border-b border-[#1F2F4A] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00D2FF]">settings_ethernet</span>
            <h2 className="text-base font-semibold font-mono text-white">VISION Backend Connection</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#141F36] text-[#8EA4B8] hover:text-white"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-[#06080F] border border-[#1F2F4A]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                backendConnected ? 'bg-[#10B981] animate-pulse' : 'bg-[#FF6B6B]'
              }`}
            />
            <span className="font-mono text-xs">
              {backendConnected === true
                ? 'Backend Connected (Live)'
                : backendConnected === false
                ? 'Backend Offline / Unreachable'
                : 'Checking connection...'}
            </span>
          </div>
          {backendLatency !== null && (
            <span className="font-mono text-xs text-[#00D2FF]">
              {backendLatency}ms
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs text-[#8EA4B8]">
            FastAPI API Base URL:
          </label>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://localhost:8000/api"
            className="w-full px-3 py-2 rounded-lg bg-[#06080F] border border-[#1F2F4A] text-xs font-mono text-white focus:outline-none focus:border-[#00D2FF]"
          />
          <span className="text-[11px] text-[#8EA4B8]">
            Default: <code className="text-sky-300">http://localhost:8000/api</code>
          </span>
        </div>

        {testResult && (
          <div
            className={`p-2 rounded text-xs font-mono ${
              testResult.includes('success')
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
            }`}
          >
            {testResult}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#1F2F4A] mt-2">
          <button
            onClick={handleResetDefault}
            className="text-xs text-[#8EA4B8] hover:text-white underline font-mono"
          >
            Reset Default
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-1.5 rounded-lg bg-[#141F36] hover:bg-[#1C2740] border border-[#1F2F4A] text-xs font-mono text-slate-200 transition-colors"
            >
              {testing ? 'Testing...' : 'Test / Ping'}
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-4 py-1.5 rounded-lg bg-[#00D2FF] hover:bg-cyan-400 text-slate-950 text-xs font-mono font-semibold transition-colors shadow-[0_0_12px_rgba(0,210,255,0.3)]"
            >
              Apply & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
