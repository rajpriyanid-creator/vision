import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SessionData,
  SessionState,
  Exercise,
  TeachingAction,
  ResourceSelection,
  EvaluationResult,
  AgentEvent,
  HandoffEvent,
  StudentProfile,
  StudentSessionSummary
} from '../types/vision';
import { api, getApiBaseUrl, setApiBaseUrl } from '../api/client';

interface VisionContextType {
  runId: string | null;
  session: SessionData | null;
  currentState: SessionState | null;
  exercise: Exercise | null;
  teachingAction: TeachingAction | null;
  resourceSelection: ResourceSelection | null;
  evaluation: EvaluationResult | null;
  events: AgentEvent[];
  handoffs: HandoffEvent[];
  dag: any;
  conceptTitles: Record<string, string>;
  studentId: string;
  setStudentId: (id: string) => void;
  loading: boolean;
  loadingMessage: string;
  error: string | null;
  clearError: () => void;
  backendConnected: boolean | null;
  backendLatency: number | null;
  apiBaseUrl: string;
  updateApiBaseUrl: (url: string) => void;
  checkBackendHealth: () => Promise<boolean>;
  loadSession: (run_id: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
  refreshEvents: (customRunId?: string) => Promise<void>;
  isRefreshingEvents: boolean;
  startNewSession: (params: {
    student_id: string;
    subject: string;
    target_concept: string;
    course_id?: string;
    learner_level: string;
    learning_goal: string;
    n_parts?: number;
    user_notes?: string;
  }) => Promise<string | null>;
  submitPrereqSurvey: (responses: Record<string, string>) => Promise<boolean>;
  submitPrereqQuiz: (answers: Record<string, any>) => Promise<boolean>;
  beginPractice: (skip_lesson?: boolean) => Promise<boolean>;
  submitStep: (payload: {
    selected_option?: string;
    student_answer?: string;
    code_submission?: string;
  }) => Promise<boolean>;
  resumeHuman: (payload: {
    decision?: string;
    action?: string;
    notes?: string;
    selected_option?: string;
  }) => Promise<boolean>;
  resetCurrentSession: () => void;
  resetSession: () => void;
  studentProfile: StudentProfile | null;
  loadStudentProfile: (id?: string) => Promise<void>;
  studentSessions: StudentSessionSummary[];
  loadStudentSessions: (id?: string) => Promise<void>;
}

const VisionContext = createContext<VisionContextType | undefined>(undefined);

export const VisionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [runId, setRunId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paramRunId = urlParams.get('run_id') || urlParams.get('runId');
      if (paramRunId) return paramRunId;
      return localStorage.getItem('vision_current_run_id');
    }
    return null;
  });

  const [studentId, setStudentIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vision_student_id') || 'student_001';
    }
    return 'student_001';
  });

  const [session, setSession] = useState<SessionData | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isRefreshingEvents, setIsRefreshingEvents] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [backendLatency, setBackendLatency] = useState<number | null>(null);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(getApiBaseUrl);

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [studentSessions, setStudentSessions] = useState<StudentSessionSummary[]>([]);

  const setStudentId = (id: string) => {
    const clean = id.trim() || 'student_001';
    setStudentIdState(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vision_student_id', clean);
    }
  };

  const updateApiBaseUrl = (url: string) => {
    setApiBaseUrl(url);
    setApiBaseUrlState(getApiBaseUrl());
    checkBackendHealth();
  };

  const clearError = () => setError(null);

  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    const startTime = Date.now();
    try {
      await api.getHealth();
      setBackendConnected(true);
      setBackendLatency(Date.now() - startTime);
      // Auto-clear stale connection errors once live backend is verified
      setError((prev) => {
        if (prev && (prev.includes('Failed to connect') || prev.includes('localhost:8000') || prev.includes('check backend connection'))) {
          return null;
        }
        return prev;
      });
      return true;
    } catch {
      setBackendConnected(false);
      setBackendLatency(null);
      return false;
    }
  }, []);

  // Update session state and helper fields
  const applySessionData = useCallback((data: SessionData) => {
    setSession((prev) => (prev ? { ...prev, ...data } : data));
    if (data.run_id) {
      setRunId(data.run_id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('vision_current_run_id', data.run_id);
        const url = new URL(window.location.href);
        url.searchParams.set('run_id', data.run_id);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  const refreshEvents = useCallback(async (customRunId?: string) => {
    const activeRunId = customRunId || runId;
    if (!activeRunId) return;
    setIsRefreshingEvents(true);
    try {
      const evts = await api.getEvents(activeRunId);
      if (Array.isArray(evts) && evts.length > 0) {
        setEvents(evts);
      }
    } catch {
      // Non-fatal if events endpoint fails or session has no events yet
    } finally {
      setIsRefreshingEvents(false);
    }
  }, [runId]);

  const loadSession = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    setLoading(true);
    setLoadingMessage('Loading study session from backend...');
    setError(null);
    try {
      const data = await api.getSession(id);
      applySessionData(data);
      if (data.events && Array.isArray(data.events) && data.events.length > 0) {
        setEvents(data.events);
      } else {
        refreshEvents(id);
      }
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
      setLoading(false);
      return false;
    }
  }, [applySessionData, refreshEvents]);

  const refreshSession = useCallback(async () => {
    if (!runId) return;
    try {
      const data = await api.getSession(runId);
      applySessionData(data);
      refreshEvents(runId);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh session');
    }
  }, [runId, applySessionData, refreshEvents]);

  const startNewSession = async (params: {
    student_id: string;
    subject: string;
    target_concept: string;
    course_id?: string;
    learner_level: string;
    learning_goal: string;
    n_parts?: number;
    user_notes?: string;
  }): Promise<string | null> => {
    setLoading(true);
    setLoadingMessage('Initializing adaptive session with VISION backend...');
    setError(null);
    try {
      const newSession = await api.startSession(params);
      applySessionData(newSession);
      if (newSession.events && newSession.events.length > 0) {
        setEvents(newSession.events);
      } else if (newSession.run_id) {
        refreshEvents(newSession.run_id);
      }
      setLoading(false);
      return newSession.run_id;
    } catch (err: any) {
      setError(err.message || 'Failed to start session. Please check backend connection.');
      setLoading(false);
      return null;
    }
  };

  const beginPractice = async (skip_lesson: boolean = false): Promise<boolean> => {
    if (!runId) {
      setError('No active session ID');
      return false;
    }
    setLoading(true);
    setLoadingMessage('Tutor Agent is transitioning to practice...');
    setError(null);
    try {
      const updated = await api.beginPractice(runId, skip_lesson);
      applySessionData(updated);
      refreshEvents(runId);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to begin practice');
      setLoading(false);
      return false;
    }
  };

  const submitPrereqSurvey = async (survey_responses: Record<string, string>): Promise<boolean> => {
    if (!runId) {
      setError('No active session ID');
      return false;
    }
    setLoading(true);
    setLoadingMessage('Supervisor Agent is processing prerequisite readiness...');
    setError(null);
    try {
      const updated = await api.submitPrereqSurvey(runId, survey_responses);
      applySessionData(updated);
      refreshEvents(runId);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to submit prerequisite survey');
      setLoading(false);
      return false;
    }
  };

  const submitPrereqQuiz = async (answers: Record<string, any>): Promise<boolean> => {
    if (!runId) {
      setError('No active session ID');
      return false;
    }
    setLoading(true);
    setLoadingMessage('Supervisor Agent is evaluating diagnostic quiz (70% threshold)...');
    setError(null);
    try {
      const updated = await api.submitPrereqQuiz(runId, answers);
      applySessionData(updated);
      refreshEvents(runId);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to submit prerequisite quiz');
      setLoading(false);
      return false;
    }
  };

  const submitStep = async (payload: {
    selected_option?: string;
    student_answer?: string;
    code_submission?: string;
  }): Promise<boolean> => {
    if (!runId) {
      setError('No active session ID');
      return false;
    }
    setLoading(true);
    setLoadingMessage('Evaluation Agent is assessing your answer...');
    setError(null);
    try {
      const updated = await api.submitStep({
        run_id: runId,
        ...payload
      });
      applySessionData(updated);
      refreshEvents(runId);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to submit response');
      setLoading(false);
      return false;
    }
  };

  const resumeHuman = async (payload: {
    decision?: string;
    action?: string;
    notes?: string;
    selected_option?: string;
  }): Promise<boolean> => {
    if (!runId) {
      setError('No active session ID');
      return false;
    }
    setLoading(true);
    setLoadingMessage('Submitting human guidance to controller...');
    setError(null);
    try {
      const updated = await api.resumeHuman({
        run_id: runId,
        ...payload
      });
      applySessionData(updated);
      refreshEvents(runId);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to submit human resolution');
      setLoading(false);
      return false;
    }
  };

  const resetCurrentSession = () => {
    setRunId(null);
    setSession(null);
    setEvents([]);
    setError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vision_current_run_id');
      const url = new URL(window.location.href);
      url.searchParams.delete('run_id');
      url.searchParams.delete('runId');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const loadStudentProfile = useCallback(async (id?: string) => {
    const targetId = id || studentId;
    if (!targetId) return;
    try {
      const prof = await api.getStudentProfile(targetId);
      setStudentProfile(prof);
    } catch {
      // Non fatal if profile is not yet initialized
    }
  }, [studentId]);

  const loadStudentSessions = useCallback(async (id?: string) => {
    const targetId = id || studentId;
    if (!targetId) return;
    try {
      const sessList = await api.getStudentSessions(targetId);
      setStudentSessions(sessList);
    } catch {
      // Non fatal
    }
  }, [studentId]);

  // Initial check on load
  useEffect(() => {
    // Purge any stale localhost:8000 URL in browser storage
    if (typeof window !== 'undefined') {
      try {
        const savedUrl = localStorage.getItem('vision_api_base_url');
        if (savedUrl && (savedUrl.includes('localhost:8000') || savedUrl.includes('127.0.0.1:8000') || savedUrl.includes('localhost:3000'))) {
          localStorage.removeItem('vision_api_base_url');
          setApiBaseUrlState('/api');
        }
      } catch {
        // Ignore storage exceptions
      }
    }

    checkBackendHealth();
    // If run_id exists in URL or storage, reconstruct session
    if (runId) {
      loadSession(runId);
    }

    // Periodically verify connection
    const interval = setInterval(() => {
      checkBackendHealth();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentState = session?.current_state || null;
  const exercise = session?.exercise || null;
  const teachingAction = session?.teaching_action || null;
  const resourceSelection = session?.resource_selection || null;
  const evaluation = session?.evaluation || null;
  const handoffs = session?.handoffs || [];
  const dag = session?.dag || null;
  const conceptTitles = session?.concept_titles || {};

  return (
    <VisionContext.Provider
      value={{
        runId,
        session,
        currentState,
        exercise,
        teachingAction,
        resourceSelection,
        evaluation,
        events,
        handoffs,
        dag,
        conceptTitles,
        studentId,
        setStudentId,
        loading,
        loadingMessage,
        error,
        clearError,
        backendConnected,
        backendLatency,
        apiBaseUrl,
        updateApiBaseUrl,
        checkBackendHealth,
        loadSession,
        refreshSession,
        refreshEvents,
        isRefreshingEvents,
        startNewSession,
        submitPrereqSurvey,
        submitPrereqQuiz,
        beginPractice,
        submitStep,
        resumeHuman,
        resetCurrentSession,
        resetSession: resetCurrentSession,
        studentProfile,
        loadStudentProfile,
        studentSessions,
        loadStudentSessions
      }}
    >
      {children}
    </VisionContext.Provider>
  );
};

export const useVision = () => {
  const context = useContext(VisionContext);
  if (!context) {
    throw new Error('useVision must be used within a VisionProvider');
  }
  return context;
};
