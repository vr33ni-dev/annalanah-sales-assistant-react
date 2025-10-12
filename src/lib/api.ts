// src/lib/api.ts
import axios from "axios";

function getApiBase() {
  if (import.meta.env.DEV) return ""; // dev proxy → /api
  const raw = (import.meta.env.VITE_API_BASE || "").trim();
  if (!raw) {
    // Fail fast so you notice misconfig instead of silently calling Pages
    throw new Error("VITE_API_BASE is not set in production build");
  }
  const url = new URL(raw); // validates & strips paths
  return url.origin; // e.g. https://api-yourapp.onrender.com
}

export const AUTH_BASE = getApiBase(); // "" in dev, "https://...render.com" in prod
const api = axios.create({
  baseURL: `${AUTH_BASE}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const returnTo = encodeURIComponent(window.location.href);
      window.location.href = `${AUTH_BASE}/auth/google?redirect=${returnTo}`;
      return;
    }
    return Promise.reject(err);
  }
);

export default api;

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
  const { data } = await api.get<Client[]>("/clients");
  return data;
};

export const getClientById = async (id: string | number): Promise<Client> => {
  const { data } = await api.get<Client>(`/clients/${id}`);
  return data;
};

export const createClient = async (
  payload: Partial<Client>
): Promise<Client> => {
  const { data } = await api.post<Client>("/clients", payload);
  return data;
};

export const updateClient = async (
  id: string | number,
  payload: Partial<Client>
): Promise<Client> => {
  const { data } = await api.put<Client>(`/clients/${id}`, payload);
  return data;
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
  const { data } = await api.get<SalesProcess[]>("/sales");
  return data;
};

export const getSalesProcessById = async (
  id: string | number
): Promise<SalesProcess> => {
  const { data } = await api.get<SalesProcess>(`/sales/${id}`);
  return data;
};

export const createSalesProcess = async (
  payload: Partial<SalesProcess>
): Promise<SalesProcess> => {
  const { data } = await api.post<SalesProcess>("/sales", payload);
  return data;
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
  const { data } = await api.patch<SalesProcess>(`/sales/${id}`, payload);
  return data;
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
): Promise<StartSalesProcessResponse> => {
  const { data } = await api.post<StartSalesProcessResponse>(
    "/sales/start",
    payload
  );
  return data;
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
  const { data } = await api.get<Contract[]>("/contracts");
  return data;
};

export const getContractById = async (
  id: string | number
): Promise<Contract> => {
  const { data } = await api.get<Contract>(`/contracts/${id}`);
  return data;
};

export const createContract = async (
  payload: Partial<Contract>
): Promise<Contract> => {
  const { data } = await api.post<Contract>("/contracts", payload);
  return data;
};

export const updateContract = async (
  id: string | number,
  payload: Partial<Contract>
): Promise<Contract> => {
  const { data } = await api.patch<Contract>(`/contracts/${id}`, payload);
  return data;
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
  const { data } = await api.get<Stage[]>("/stages");
  return data;
};

export const getStageById = async (id: string | number): Promise<Stage> => {
  const { data } = await api.get<Stage>(`/stages/${id}`);
  return data;
};

export const createStage = async (payload: Partial<Stage>): Promise<Stage> => {
  const { data } = await api.post<Stage>("/stages", payload);
  return data;
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
/**
 * POST /api/stages/{id}/participants
 *
 * Two valid request shapes:
 *  - Existing client: { client_id: number, attended: boolean }
 *  - Lead (no client): { lead_name: string, lead_email?: string, lead_phone?: string, attended: boolean }
 *
 * Backend returns 201 Created with no body -> use void
 */
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

/**
 * PATCH /api/stages/{id}/participants/{participant_id}
 * body: { attended?: boolean } -> backend returns 204 No Content
 */
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

export interface CashflowRow {
  month: string; // "2025-10"
  confirmed: number;
  potential: number;
  expected: number;
}

export const getCashflowForecast = async (): Promise<CashflowRow[]> => {
  const { data } = await api.get<CashflowRow[]>("/cashflow/forecast");
  return data;
};
