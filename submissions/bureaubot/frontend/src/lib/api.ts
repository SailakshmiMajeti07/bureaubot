import axios from "axios";

export type BureauBotResponse = {
  intent: string;
  tool: string;
  response: string;
  next_steps: string[];
  confidence: number;
  escalation_required: boolean;
  result: {
    data: Record<string, unknown>;
    warnings: string[];
    sources: { title: string; url: string; official?: boolean }[];
  };
};

export type UserType = {
  id: string;
  email: string;
  full_name: string | null;
  role: "USER" | "ADMIN";
  is_active: boolean;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserType;
};

export type ServiceType = {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string;
  official_portal_url: string;
  eligibility_rules: string[];
  required_documents: string[];
  workflow: string[];
  processing_time: string | null;
  fees: string | null;
  state: string;
  status: string;
};

export type ApplicationType = {
  id: string;
  user_id: string;
  service_id: number;
  reference_number: string;
  status: string;
  created_at: string;
};

export type DocumentType = {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  storage_key: string | null;
  verification_status: string;
  created_at: string;
};

export type ReminderType = {
  id: string;
  user_id: string;
  application_id: string | null;
  message: string;
  scheduled_for: string;
  channel: string;
  status: string;
  created_at: string;
};

export type ChatHistoryType = {
  id: string;
  user_id: string | null;
  message: string;
  intent: string;
  response: Record<string, unknown>;
  created_at: string;
};

export type AdminDashboardType = {
  total_users: number;
  total_applications: number;
  total_services: number;
  active_services: number;
  applications_by_status: Record<string, number>;
  recent_users: UserType[];
  recent_applications: ApplicationType[];
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem("bureaubot_access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Auto Refresh Token on 401
let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/register") || originalRequest.url?.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem("bureaubot_refresh_token");
      if (!refreshToken) {
        localStorage.removeItem("bureaubot_access_token");
        localStorage.removeItem("bureaubot_refresh_token");
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post<TokenResponse>(`${apiUrl}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const { access_token, refresh_token: new_refresh } = res.data;
        localStorage.setItem("bureaubot_access_token", access_token);
        localStorage.setItem("bureaubot_refresh_token", new_refresh);

        api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
        originalRequest.headers["Authorization"] = `Bearer ${access_token}`;

        processQueue(null, access_token);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("bureaubot_access_token");
        localStorage.removeItem("bureaubot_refresh_token");
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Helper Workflow Function
export async function postToBureauBot(path: string, payload: Record<string, unknown>): Promise<BureauBotResponse> {
  const res = await api.post<BureauBotResponse>(path, payload);
  return res.data;
}

// Auth API Calls
export async function registerApi(data: { email: string; password: string; full_name?: string }): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/auth/register", data);
  return res.data;
}

export async function loginApi(data: { email: string; password: string }): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/auth/login", data);
  return res.data;
}

export async function adminLoginApi(data: { email: string; password: string }): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/admin/login", data);
  return res.data;
}

export async function logoutApi(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Silent fail on logout
  }
}

export async function getMeApi(): Promise<UserType> {
  const res = await api.get<UserType>("/auth/me");
  return res.data;
}

// User Profile & Data APIs
export async function updateUserProfileApi(data: { full_name?: string; email?: string }): Promise<UserType> {
  const res = await api.put<UserType>("/users/me", data);
  return res.data;
}

export async function getUserDocumentsApi(): Promise<DocumentType[]> {
  const res = await api.get<DocumentType[]>("/users/me/documents");
  return res.data;
}

export async function createUserDocumentApi(data: { application_id?: string; document_type: string; file_name: string; storage_key?: string }): Promise<DocumentType> {
  const res = await api.post<DocumentType>("/users/me/documents", data);
  return res.data;
}

export async function getUserRemindersApi(): Promise<ReminderType[]> {
  const res = await api.get<ReminderType[]>("/users/me/reminders");
  return res.data;
}

export async function createUserReminderApi(data: { message: string; scheduled_for: string; application_id?: string; channel?: string }): Promise<ReminderType> {
  const res = await api.post<ReminderType>("/users/me/reminders", data);
  return res.data;
}

export async function getUserChatHistoryApi(): Promise<ChatHistoryType[]> {
  const res = await api.get<ChatHistoryType[]>("/users/me/chat-history");
  return res.data;
}

// Admin APIs
export async function getAdminUsersApi(): Promise<UserType[]> {
  const res = await api.get<UserType[]>("/admin/users");
  return res.data;
}

export async function getAdminApplicationsApi(): Promise<ApplicationType[]> {
  const res = await api.get<ApplicationType[]>("/admin/applications");
  return res.data;
}

export async function getAdminServicesApi(): Promise<ServiceType[]> {
  const res = await api.get<ServiceType[]>("/admin/services");
  return res.data;
}

export async function createAdminServiceApi(data: Partial<ServiceType>): Promise<ServiceType> {
  const res = await api.post<ServiceType>("/admin/services", data);
  return res.data;
}

export async function updateAdminServiceApi(id: number, data: Partial<ServiceType>): Promise<ServiceType> {
  const res = await api.put<ServiceType>(`/admin/services/${id}`, data);
  return res.data;
}

export async function deleteAdminServiceApi(id: number): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/admin/services/${id}`);
  return res.data;
}

export async function getAdminDashboardApi(): Promise<AdminDashboardType> {
  const res = await api.get<AdminDashboardType>("/admin/dashboard");
  return res.data;
}

// Service & Application Public APIs
export async function getServicesListApi(): Promise<ServiceType[]> {
  const res = await api.get<ServiceType[]>("/services");
  return res.data;
}

export async function getServiceByCodeApi(code: string): Promise<ServiceType> {
  const res = await api.get<ServiceType>(`/services/${code}`);
  return res.data;
}

export async function createApplicationApi(data: { user_id: string; service_code: string; reference_number: string }): Promise<ApplicationType> {
  const res = await api.post<ApplicationType>("/applications", data);
  return res.data;
}

// Mutagent Lifecycle APIs & Types
export interface MutagentAgentType {
  name: string;
  status: string;
  accuracy: number;
  previous_accuracy?: number;
  problem?: string | null;
  improvement?: string | null;
  prompt_version: string;
  description: string;
}

export interface MutagentEvaluationType {
  id: number;
  test_name: string;
  input: string;
  expected: string[];
  status: string;
  previous_status?: string;
  agent: string;
  details?: string;
  diagnosis?: string;
  improvement_applied?: string;
}

export interface MutagentStatusType {
  service_code?: string;
  current_stage: string;
  prompt_version: string;
  active_spec: {
    scheme_name: string;
    goal: string;
    agents_required: string[];
  };
  agents: MutagentAgentType[];
  evaluations: MutagentEvaluationType[];
  lifecycle_history: { stage: string; timestamp: string; note: string }[];
  service_info?: any;
}

export async function getAgentSpecYamlApi(): Promise<string> {
  const res = await api.get("/mutagent/agentspec.yaml", { responseType: "text" });
  return res.data;
}

export async function getMutagentScenariosApi(): Promise<any> {
  const res = await api.get("/mutagent/scenarios");
  return res.data;
}

export async function getMutagentStatusApi(scenarioId: string = "scenario_scholarship_eligibility"): Promise<any> {
  const res = await api.get(`/mutagent/status?scenario_id=${encodeURIComponent(scenarioId)}`);
  return res.data;
}

export async function approveMutagentOptimizationApi(scenarioId: string = "scenario_scholarship_eligibility"): Promise<any> {
  const res = await api.post(`/mutagent/optimize/approve?scenario_id=${encodeURIComponent(scenarioId)}`);
  return res.data;
}



