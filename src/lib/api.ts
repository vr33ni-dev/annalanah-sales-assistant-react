// src/lib/api.ts
import axios from "axios";

declare global {
  interface Window {
    __LOGGING_OUT?: boolean;
    __AUTH_BASE__?: string;
  }
}

function getApiBase(): string {
  if (import.meta.env.PROD) {
    const raw = (import.meta.env.VITE_API_BASE || "").trim();
    if (!raw) throw new Error("VITE_API_BASE is not set in production build");
    const url = new URL(raw);
    return url.origin;
  }
  return "";
}

export const AUTH_BASE = getApiBase();
window.__AUTH_BASE__ = AUTH_BASE;
console.log("[api] AUTH_BASE =", AUTH_BASE || "(dev-proxy)");

const api = axios.create({
  baseURL: `${AUTH_BASE}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// (Optional) now it's safe to log:
console.log("[api] axios baseURL =", api.defaults.baseURL);

function suppressAuthRedirectNow(): boolean {
  // 1) URL flag set by logout
  const params = new URLSearchParams(window.location.search);
  if (params.get("auth") === "logged_out") return true;

  // 2) short-lived session flag set by logout
  const untilStr = sessionStorage.getItem("suppressAuthRedirectUntil");
  const until = untilStr ? Number(untilStr) : 0;
  return Date.now() < until;
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    const reqUrl = err?.config?.url || "";

    const isMeProbe = reqUrl.endsWith("/me") || reqUrl.endsWith("/api/me");
    const onPublicRoute =
      window.location.pathname === "/login" || window.location.pathname === "/";
    const isAuthRoute = reqUrl.includes("/auth/");
    if (
      status === 401 &&
      !isMeProbe &&
      !isAuthRoute &&
      !window.__LOGGING_OUT && // don't redirect during logout
      !onPublicRoute &&
      !suppressAuthRedirectNow() // ⬅️ use it here
    ) {
      const returnTo = encodeURIComponent(window.location.href);
      window.location.href = `${AUTH_BASE}/auth/google?redirect=${returnTo}`;
      return;
    }
    return Promise.reject(err);
  }
);

export default api;

/* ------------------------------------------------------------------ */
/* Helpers */
const asArray = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

/* Clients */
export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: string;
  source_stage_name: string | null;
  status: string;
}

export const getClients = async (): Promise<Client[]> => {
  const { data } = await api.get("/clients");
  return asArray<Client>(data);
};

export const getClientById = async (id: string | number): Promise<Client> => {
  const { data } = await api.get(`/clients/${id}`);
  return data as Client;
};

export const createClient = async (
  payload: Partial<Client>
): Promise<Client> => {
  const { data } = await api.post("/clients", payload);
  return data as Client;
};

export const updateClient = async (
  id: string | number,
  payload: Partial<Client>
): Promise<Client> => {
  const { data } = await api.put(`/clients/${id}`, payload);
  return data as Client;
};

export const deleteClient = async (id: string | number): Promise<void> => {
  await api.delete(`/clients/${id}`);
};

/* Sales processes */
export interface SalesProcess {
  id: number;
  client_id: number;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  client_source?: "organic" | "paid" | null;
  stage: "zweitgespraech" | "abschluss" | "lost";
  zweitgespraech_date?: string | null;
  zweitgespraech_result?: boolean | null;
  abschluss?: boolean | null;
  revenue?: number | null; // null unless abschluss === true
  stage_id?: number | null;
}

export const getSalesProcesses = async (): Promise<SalesProcess[]> => {
  const { data } = await api.get("/sales");
  return asArray<SalesProcess>(data);
};

export const getSalesProcessById = async (
  id: string | number
): Promise<SalesProcess> => {
  const { data } = await api.get(`/sales/${id}`);
  return data as SalesProcess;
};

export const createSalesProcess = async (
  payload: Partial<SalesProcess>
): Promise<SalesProcess> => {
  const { data } = await api.post("/sales", payload);
  return data as SalesProcess;
};

// Narrow the update payload to only fields the backend accepts on PATCH
export type SalesProcessUpdateRequest = {
  zweitgespraech_result?: boolean | null;
  abschluss?: boolean | null;
  revenue?: number | null;
  contract_duration_months?: number;
  contract_start_date?: string; // YYYY-MM-DD
  contract_frequency?: "monthly" | "bi-monthly" | "quarterly";
};

export const updateSalesProcess = async (
  id: string | number,
  payload: SalesProcessUpdateRequest
): Promise<SalesProcess> => {
  const { data } = await api.patch(`/sales/${id}`, payload);
  return data as SalesProcess;
};

export interface StartSalesProcessRequest {
  name: string;
  email: string;
  phone: string;
  source: string;
  source_stage_id?: number | null;
  zweitgespraech_date?: string | null;
}

export interface StartSalesProcessResponse {
  sales_process_id: number;
  client: Client;
  sales_process: SalesProcess;
}

/**
 * POST /sales/start
 * backend creates a client and sales_process and returns
 * { sales_process_id, client, sales_process }
 */
export const startSalesProcess = async (
  payload: StartSalesProcessRequest
): Promise<void> => {
  await api.post("/sales/start", payload); // don't expect JSON back
};

/* Contracts */
export interface Contract {
  id: number;
  client_id: number;
  client_name: string;
  sales_process_id: number;
  start_date: string;
  end_date?: string | null;
  duration_months: number;
  revenue_total: number;
  payment_frequency: string;
  monthly_amount: number;
  paid_months: number;
  paid_amount_total: number;
  next_due_date?: string | null;
}

export const getContracts = async (): Promise<Contract[]> => {
  const { data } = await api.get("/contracts");
  return asArray<Contract>(data);
};

export const getContractById = async (
  id: string | number
): Promise<Contract> => {
  const { data } = await api.get(`/contracts/${id}`);
  return data as Contract;
};

export const createContract = async (
  payload: Partial<Contract>
): Promise<Contract> => {
  const { data } = await api.post("/contracts", payload);
  return data as Contract;
};

export const updateContract = async (
  id: string | number,
  payload: Partial<Contract>
): Promise<Contract> => {
  const { data } = await api.patch(`/contracts/${id}`, payload);
  return data as Contract;
};

/* Stages */
export interface Stage {
  id: number;
  name: string;
  date?: string | null;
  ad_budget?: number | null;
  registrations?: number | null;
  participants?: number | null;
}

export const getStages = async (): Promise<Stage[]> => {
  const { data } = await api.get("/stages");
  return asArray<Stage>(data);
};

export const getStageById = async (id: string | number): Promise<Stage> => {
  const { data } = await api.get(`/stages/${id}`);
  return data as Stage;
};

export const createStage = async (payload: Partial<Stage>): Promise<Stage> => {
  const { data } = await api.post("/stages", payload);
  return data as Stage;
};

/**
 * PATCH /stages/{id}/stats
 * backend returns 204 No Content; use void return
 */
export interface UpdateStageStatsRequest {
  registrations?: number | null;
  participants?: number | null;
}
export const updateStageStats = async (
  id: string | number,
  payload: UpdateStageStatsRequest
): Promise<void> => {
  await api.patch(`/stages/${id}/stats`, payload);
};

/* Stage participants & assignments */
export interface AddStageParticipantExisting {
  client_id: number;
  attended: boolean;
}
export interface AddStageParticipantLead {
  lead_name: string;
  lead_email?: string;
  lead_phone?: string;
  attended: boolean;
}
export type AddStageParticipantRequest =
  | AddStageParticipantExisting
  | AddStageParticipantLead;

export const addStageParticipant = async (
  stageId: string | number,
  payload: AddStageParticipantRequest
): Promise<void> => {
  await api.post(`/stages/${stageId}/participants`, payload);
};

export interface UpdateStageParticipantRequest {
  attended?: boolean;
}
export const updateStageParticipant = async (
  stageId: string | number,
  participantId: string | number,
  payload: UpdateStageParticipantRequest
): Promise<void> => {
  await api.patch(`/stages/${stageId}/participants/${participantId}`, payload);
};

/**
 * POST /api/stages/{id}/assign-client
 * body: { client_id: number } -> backend returns 201 Created with no body
 */
export const assignClientToStage = async (
  stageId: string | number,
  payload: { client_id: number }
): Promise<void> => {
  await api.post(`/stages/${stageId}/assign-client`, payload);
};

/* Cashflow */
export interface CashflowRow {
  month: string; // "2025-10"
  confirmed: number;
  potential: number;
  expected: number;
}

const isCashflowRow = (x: unknown): x is CashflowRow =>
  typeof x === "object" &&
  x !== null &&
  typeof (x as { month?: unknown }).month === "string" &&
  typeof (x as { confirmed?: unknown }).confirmed === "number" &&
  typeof (x as { potential?: unknown }).potential === "number" &&
  typeof (x as { expected?: unknown }).expected === "number";

export const getCashflowForecast = async (): Promise<CashflowRow[]> => {
  const { data } = await api.get("/cashflow/forecast");
  const arr = asArray<unknown>(data);
  return arr.filter(isCashflowRow);
};
