/**
 * Axios API client with auth token injection and refresh logic.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8747";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// ── Request interceptor: attach Bearer token ──────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refresh_token: refreshToken });
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        processQueue(null, data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ── API helpers ───────────────────────────────────────────────────────────

export const authApi = {
  register: (data: Record<string, unknown>) => api.post("/api/auth/register", data),
  login:    (data: Record<string, unknown>) => api.post("/api/auth/login", data),
  me:       ()                              => api.get("/api/auth/me"),
};

export const practitionersApi = {
  getMe:   ()              => api.get("/api/practitioners/me"),
  patchMe: (data: unknown) => api.patch("/api/practitioners/me", data),
};

export const patientsApi = {
  list:                ()                          => api.get("/api/patients"),
  get:                 (id: number)                => api.get(`/api/patients/${id}`),
  create:              (data: unknown)             => api.post("/api/patients", data),
  update:              (id: number, data: unknown) => api.patch(`/api/patients/${id}`, data),
  updateHealthProfile: (id: number, data: unknown) => api.patch(`/api/patients/${id}/health-profile`, data),
  deactivate:          (id: number)                => api.delete(`/api/patients/${id}`),
};

export const plansApi = {
  get:              (patientId: number)               => api.get(`/api/patients/${patientId}/plan`),
  create:           (patientId: number, data: unknown) => api.post(`/api/patients/${patientId}/plan`, data),
  update:           (patientId: number, data: unknown) => api.patch(`/api/patients/${patientId}/plan`, data),
  addSupplement:    (patientId: number, data: unknown) => api.post(`/api/patients/${patientId}/plan/supplements`, data),
  removeSupplement: (psId: number)                    => api.delete(`/api/plans/supplements/${psId}`),
  addRecipe:        (patientId: number, data: unknown) => api.post(`/api/patients/${patientId}/plan/recipes`, data),
  removeRecipe:     (prId: number)                    => api.delete(`/api/plans/recipes/${prId}`),
};

export const supplementsApi = {
  list: (params?: { search?: string; category?: string; dosha?: string }) =>
    api.get("/api/supplements", { params }),
  get:         (id: number) => api.get(`/api/supplements/${id}`),
  uploadImage: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/api/supplements/${id}/image`, form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  deleteImage: (id: number) => api.delete(`/api/supplements/${id}/image`),
};

export const recipesApi = {
  list:   (params?: { search?: string; meal_type?: string; dosha?: string; mine?: boolean }) =>
    api.get("/api/recipes", { params }),
  get:    (id: number)                => api.get(`/api/recipes/${id}`),
  create: (data: unknown)             => api.post("/api/recipes", data),
  update: (id: number, data: unknown) => api.patch(`/api/recipes/${id}`, data),
  delete: (id: number)                => api.delete(`/api/recipes/${id}`),
};

export const checkinsApi = {
  list: (patientId: number, limit = 30) =>
    api.get(`/api/patients/${patientId}/checkins`, { params: { limit } }),
};

export const followupsApi = {
  list:   (params?: { completed?: boolean; patient_id?: number }) =>
    api.get("/api/followups", { params }),
  create: (data: unknown)             => api.post("/api/followups", data),
  update: (id: number, data: unknown) => api.patch(`/api/followups/${id}`, data),
  delete: (id: number)                => api.delete(`/api/followups/${id}`),
};

export const aiApi = {
  chat:                (data: unknown)        => api.post("/api/ai/chat", data),
  draftPlan:           (patientId: number)    => api.post(`/api/ai/draft-plan/${patientId}`, {}),
  insights:            (patientId: number)    => api.get(`/api/ai/insights/${patientId}`),
  interpretAssessment: (assessmentId: number) => api.post(`/api/ai/interpret-assessment/${assessmentId}`, {}),
  dashboardSummary:    ()                     => api.get("/api/ai/dashboard-summary"),
};

export const portalApi = {
  home:      (token: string)               => api.get(`/api/portal/${token}`),
  plan:      (token: string)               => api.get(`/api/portal/${token}/plan`),
  history:   (token: string)               => api.get(`/api/portal/${token}/history`),
  checkin:   (token: string, data: unknown) => api.post(`/api/portal/${token}/checkin`, data),
  followups: (token: string)               => api.get(`/api/portal/${token}/followups`),
};

export const notesApi = {
  list:    (patientId: number)                => api.get(`/api/patients/${patientId}/notes`),
  get:     (patientId: number, noteId: number) => api.get(`/api/patients/${patientId}/notes/${noteId}`),
  create:  (patientId: number, data: unknown)  => api.post(`/api/patients/${patientId}/notes`, data),
  update:  (patientId: number, noteId: number, data: unknown) => api.patch(`/api/patients/${patientId}/notes/${noteId}`, data),
  delete:  (patientId: number, noteId: number) => api.delete(`/api/patients/${patientId}/notes/${noteId}`),
  send:    (patientId: number, noteId: number) => api.post(`/api/patients/${patientId}/notes/${noteId}/send`),
  aiDraft: (patientId: number)                => api.post(`/api/patients/${patientId}/notes/ai-draft`, {}),
};

export const assessmentsApi = {
  list:   (patientId: number)                => api.get(`/api/patients/${patientId}/assessments`),
  get:    (patientId: number, id: number)    => api.get(`/api/patients/${patientId}/assessments/${id}`),
  create: (patientId: number, data: unknown) => api.post(`/api/patients/${patientId}/assessments`, data),
  delete: (patientId: number, id: number)    => api.delete(`/api/patients/${patientId}/assessments/${id}`),
};

export const yogaApi = {
  list:   (params?: { search?: string; category?: string; level?: string; dosha?: string }) =>
    api.get("/api/yoga-asanas", { params }),
  get:    (id: number)                => api.get(`/api/yoga-asanas/${id}`),
  create: (data: unknown)             => api.post("/api/yoga-asanas", data),
  update: (id: number, data: unknown) => api.patch(`/api/yoga-asanas/${id}`, data),
  delete: (id: number)                => api.delete(`/api/yoga-asanas/${id}`),
  videos: (asanaId: number)           => api.get(`/api/yoga-asanas/${asanaId}/videos`),
};

export const videosApi = {
  list:   (params?: { entity_type?: string; entity_id?: number }) =>
    api.get("/api/videos", { params }),
  create: (data: unknown)             => api.post("/api/videos", data),
  update: (id: number, data: unknown) => api.patch(`/api/videos/${id}`, data),
  delete: (id: number)                => api.delete(`/api/videos/${id}`),
};

export const planYogaApi = {
  list:    (planId: number)                => api.get(`/api/plans/${planId}/yoga`),
  assign:  (planId: number, data: unknown) => api.post(`/api/plans/${planId}/yoga`, data),
  update:  (planId: number, assignmentId: number, data: unknown) => api.patch(`/api/plans/${planId}/yoga/${assignmentId}`, data),
  remove:  (planId: number, assignmentId: number) => api.delete(`/api/plans/${planId}/yoga/${assignmentId}`),
  reorder: (planId: number, ids: number[]) => api.put(`/api/plans/${planId}/yoga/reorder`, { ids }),
};

export const pranayamaApi = {
  list:   (params?: { search?: string; category?: string; difficulty?: string; dosha?: string }) =>
    api.get("/api/pranayama", { params }),
  get:    (id: number)                => api.get(`/api/pranayama/${id}`),
  create: (data: unknown)             => api.post("/api/pranayama", data),
  update: (id: number, data: unknown) => api.patch(`/api/pranayama/${id}`, data),
  delete: (id: number)                => api.delete(`/api/pranayama/${id}`),
};

export const planPranayamaApi = {
  list:    (planId: number)                => api.get(`/api/plans/${planId}/pranayama`),
  assign:  (planId: number, data: unknown) => api.post(`/api/plans/${planId}/pranayama`, data),
  update:  (planId: number, assignmentId: number, data: unknown) => api.patch(`/api/plans/${planId}/pranayama/${assignmentId}`, data),
  remove:  (planId: number, assignmentId: number) => api.delete(`/api/plans/${planId}/pranayama/${assignmentId}`),
  reorder: (planId: number, ids: number[]) => api.put(`/api/plans/${planId}/pranayama/reorder`, { ids }),
};

export const billingApi = {
  createCheckoutSession: (tier: string) => api.post("/api/billing/checkout", { tier }),
  createPortalSession:   ()             => api.post("/api/billing/portal"),
  getSubscription:       ()             => api.get("/api/billing/subscription"),
};
