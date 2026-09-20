import {
  SessionData,
  Course,
  ContextCheckResult,
  AgentEvent,
  StudentProfile,
  StudentSessionSummary
} from '../types/vision';

const envApiBase =
  typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL;

const DEFAULT_API_BASE =
  envApiBase && !envApiBase.includes('localhost:8000') && !envApiBase.includes('127.0.0.1:8000')
    ? envApiBase
    : '/api';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('vision_api_base_url');
      if (saved && (saved.includes('localhost:8000') || saved.includes('127.0.0.1:8000') || saved.includes('localhost:3000'))) {
        localStorage.removeItem('vision_api_base_url');
        return DEFAULT_API_BASE.replace(/\/+$/, '');
      }
      if (saved && saved.trim()) {
        return saved.trim().replace(/\/+$/, '');
      }
    } catch {
      // In case localStorage is blocked in sandboxed iframe
    }
  }
  return DEFAULT_API_BASE.replace(/\/+$/, '');
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (!url || !url.trim() || url.includes('localhost:8000') || url.includes('127.0.0.1:8000')) {
        localStorage.removeItem('vision_api_base_url');
      } else {
        localStorage.setItem('vision_api_base_url', url.trim().replace(/\/+$/, ''));
      }
    } catch {
      // Ignore localStorage write failures
    }
  }
}

export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errDetail = '';
      try {
        const errorJson = await response.json();
        errDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
      } catch {
        errDetail = await response.text();
      }

      throw {
        message: errDetail || `API request failed with status ${response.status}: ${response.statusText}`,
        status: response.status,
        details: errDetail
      } as ApiError;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err: any) {
    if (err.status) {
      throw err;
    }
    // Network / connection error
    throw {
      message: `Failed to connect to VISION backend at ${baseUrl}. (${err.message || 'NetworkError'})`,
      status: 0,
      details: err
    } as ApiError;
  }
}

export const api = {
  async getHealth(): Promise<{ status: string; version?: string; uptime?: number; timestamp?: string; [key: string]: any }> {
    return request<{ status: string; [key: string]: any }>('/health');
  },

  async getCourses(): Promise<Course[]> {
    const res = await request<Course[] | { courses: Course[] }>('/courses');
    if (Array.isArray(res)) {
      return res;
    }
    if (res && Array.isArray((res as any).courses)) {
      return (res as any).courses;
    }
    return [];
  },

  async checkContext(subject: string, target_concept: string): Promise<ContextCheckResult> {
    return request<ContextCheckResult>('/context/check', {
      method: 'POST',
      body: JSON.stringify({
        subject,
        target_concept
      })
    });
  },

  async startSession(params: {
    student_id: string;
    subject: string;
    target_concept: string;
    course_id?: string;
    learner_level: string;
    learning_goal: string;
    n_parts?: number;
    user_notes?: string;
  }): Promise<SessionData> {
    return request<SessionData>('/session/start', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async submitPrereqSurvey(run_id: string, survey_responses: Record<string, string>): Promise<SessionData> {
    return request<SessionData>('/session/prereq-survey', {
      method: 'POST',
      body: JSON.stringify({
        run_id,
        survey_responses
      })
    });
  },

  async submitPrereqQuiz(run_id: string, answers: Record<string, any>): Promise<SessionData> {
    return request<SessionData>('/session/prereq-quiz', {
      method: 'POST',
      body: JSON.stringify({
        run_id,
        answers
      })
    });
  },

  async beginPractice(run_id: string, skip_lesson: boolean = false): Promise<SessionData> {
    return request<SessionData>('/session/begin-practice', {
      method: 'POST',
      body: JSON.stringify({
        run_id,
        skip_lesson
      })
    });
  },

  async getSession(run_id: string): Promise<SessionData> {
    return request<SessionData>(`/session/${encodeURIComponent(run_id)}`);
  },

  async submitStep(params: {
    run_id: string;
    selected_option?: string;
    student_answer?: string;
    code_submission?: string;
  }): Promise<SessionData> {
    // Try POST /api/session/step first, if 404/405 try /api/session/{run_id}/step
    try {
      return await request<SessionData>('/session/step', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405) {
        return await request<SessionData>(`/session/${encodeURIComponent(params.run_id)}/step`, {
          method: 'POST',
          body: JSON.stringify(params)
        });
      }
      throw err;
    }
  },

  async resumeHuman(params: {
    run_id: string;
    decision?: string;
    action?: string;
    notes?: string;
    selected_option?: string;
    [key: string]: any;
  }): Promise<SessionData> {
    try {
      return await request<SessionData>('/session/human-resume', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    } catch (err: any) {
      if (err.status === 404 || err.status === 405) {
        return await request<SessionData>(`/session/${encodeURIComponent(params.run_id)}/human-resume`, {
          method: 'POST',
          body: JSON.stringify(params)
        });
      }
      throw err;
    }
  },

  async getWhy(run_id: string): Promise<{ why?: string; reason?: string; current_state?: string; target_concept?: string; [key: string]: any }> {
    return request<any>(`/session/${encodeURIComponent(run_id)}/why`);
  },

  async getEvents(run_id: string): Promise<AgentEvent[]> {
    const res = await request<AgentEvent[] | { events: AgentEvent[] }>(`/session/${encodeURIComponent(run_id)}/events`);
    if (Array.isArray(res)) {
      return res;
    }
    if (res && Array.isArray((res as any).events)) {
      return (res as any).events;
    }
    return [];
  },

  async getStudentProfile(student_id: string): Promise<StudentProfile> {
    return request<StudentProfile>(`/student/${encodeURIComponent(student_id)}/profile`);
  },

  async getStudentSessions(student_id: string): Promise<StudentSessionSummary[]> {
    const res = await request<StudentSessionSummary[] | { sessions: StudentSessionSummary[] }>(`/student/${encodeURIComponent(student_id)}/sessions`);
    if (Array.isArray(res)) {
      return res;
    }
    if (res && Array.isArray((res as any).sessions)) {
      return (res as any).sessions;
    }
    return [];
  }
};
