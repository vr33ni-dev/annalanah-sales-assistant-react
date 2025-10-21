// src/lib/api.ts
import axios from "axios";

/**
 * Same-origin setup:
 * - In prod, the Static Site rewrites /api/* and /auth/* to your Go backend.
 * - In dev, Vite proxy handles /api and /auth (see vite.config.ts).
 * - No absolute hosts here → avoids third-party cookie issues.
 */

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Helpful log
console.log("[api] axios baseURL =", api.defaults.baseURL);

function suppressAuthRedirectNow(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get("auth") === "logged_out") return true;

  const untilStr = sessionStorage.getItem("suppressAuthRedirectUntil");
  const until = untilStr ? Number(untilStr) : 0;
  return Date.now() < until;
}

// Global 401 handler → kick off login (same-origin)
// src/lib/api.ts
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    const reqUrl = err?.config?.url || "";
    const isMeProbe = reqUrl.endsWith("/me") || reqUrl.endsWith("/api/me");
    const onPublicRoute =
      location.pathname === "/login" || location.pathname === "/";
    const isAuthRoute = reqUrl.includes("/auth/");

    if (
      status === 401 &&
      !isMeProbe &&
      !isAuthRoute &&
      !onPublicRoute &&
      Date.now() >=
        Number(sessionStorage.getItem("suppressAuthRedirectUntil") || 0)
    ) {
      location.href = `/auth/google?redirect=${encodeURIComponent(
        location.href
      )}`;
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
  revenue?: number | null;
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
 */
export const startSalesProcess = async (
  payload: StartSalesProcessRequest
): Promise<void> => {
  await api.post("/sales/start", payload);
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
 * PATCH /stages/{id}/stats — 204 No Content
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
 * POST /api/stages/{id}/assign-client — 201 Created
 */
export const assignClientToStage = async (
  stageId: string | number,
  payload: { client_id: number }
): Promise<void> => {
  await api.post(`/stages/${stageId}/assign-client`, payload);
};

// Settings
type Setting = {
  key: string;
  value_numeric?: number | null;
  value_text?: string | null;
  updated_at?: string;
};

export const getNumericSetting = async (
  key: string,
  fallback: number
): Promise<number> => {
  try {
    const { data } = await api.get<Setting>(
      `/settings/${encodeURIComponent(key)}`
    );
    const v =
      typeof data?.value_numeric === "number"
        ? data.value_numeric
        : Number(data?.value_text ?? NaN); // just in case you store numeric as text

    // use fallback if missing, NaN, or non-positive (prevents -100% ROI)
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
};

/* Cashflow */
export interface CashflowRow {
  month: string; // "2025-10"
  confirmed: number;
  potential: number;
}
const isCashflowRow = (x: unknown): x is CashflowRow =>
  typeof x === "object" &&
  x !== null &&
  typeof (x as { month?: unknown }).month === "string" &&
  typeof (x as { confirmed?: unknown }).confirmed === "number" &&
  typeof (x as { potential?: unknown }).potential === "number" &&
  typeof (x as { expected?: unknown }).expected === "number";

export const getCashflowForecast = async (): Promise<CashflowRow[]> => {
  const { data } = await api.get<CashflowRow[]>("/cashflow/forecast");
  return Array.isArray(data)
    ? data.map((r) => ({
        ...r,
        expected: r.confirmed + r.potential,
      }))
    : [];
};
