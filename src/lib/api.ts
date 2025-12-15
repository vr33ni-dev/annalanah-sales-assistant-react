// src/lib/api.ts
import { SALES_STAGE } from "@/constants/stages";
import { STAGE_LABELS } from "@/constants/labels";
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
  completed_at?: string | null;
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

/* Leads */
export type Lead = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  source_stage_id?: number | null;
  created_at?: string | null;
};

export const createLead = async (payload: Partial<Lead>): Promise<Lead> => {
  const { data } = await api.post("/leads", payload);
  return data as Lead;
};

/* Sales processes */
export interface SalesProcess {
  id: number;
  client_id: number;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  client_source?: "organic" | "paid" | null;
  stage: (typeof SALES_STAGE)[keyof typeof SALES_STAGE];
  follow_up_date?: string | null;
  follow_up_result?: boolean | null;
  closed?: boolean | null;
  revenue?: number | null;
  stage_id?: number | null;
}

export async function getSalesProcesses(): Promise<
  (SalesProcess & { stage_label: string })[]
> {
  const res = await fetch("/api/sales");
  if (!res.ok)
    throw new Error(`Failed to fetch sales processes: ${res.status}`);

  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid data format");

  return (data as Partial<SalesProcess>[]).map((sp) => {
    const stage = (sp.stage ?? SALES_STAGE.LOST) as SalesProcess["stage"];
    return {
      id: sp.id ?? 0,
      client_id: sp.client_id ?? 0,
      client_name: sp.client_name ?? "",
      client_email: sp.client_email ?? null,
      client_phone: sp.client_phone ?? null,
      client_source: sp.client_source ?? null,
      stage,
      stage_label: STAGE_LABELS[stage] || stage,
      follow_up_date: sp.follow_up_date ?? null,
      follow_up_result: sp.follow_up_result ?? null,
      closed: sp.closed ?? null,
      revenue: sp.revenue ?? null,
      stage_id: sp.stage_id ?? null,
    };
  });
}

export const getSalesProcessById = async (
  id: string | number
): Promise<SalesProcess> => {
  const { data } = await api.get(`/sales/${id}`);
  return data as SalesProcess;
};

// Narrow the update payload to only fields the backend accepts on PATCH
export type SalesProcessUpdateRequest = {
  follow_up_result?: boolean | null;
  closed?: boolean | null;
  revenue?: number | null;
  contract_duration_months?: number;
  contract_start_date?: string;
  contract_frequency?: "monthly" | "bi-monthly" | "quarterly";
  completed_at?: string;
};

export const updateSalesProcess = async (
  id: string | number,
  payload: SalesProcessUpdateRequest
): Promise<SalesProcess> => {
  const { data } = await api.patch(`/sales/${id}`, payload);
  return data as SalesProcess;
};

export type StartSalesProcessRequest = {
  name: string;
  email: string;
  phone: string;
  source: string;
  source_stage_id?: number | null;
  follow_up_date: string;
  lead_id?: number | null;
  merge_strategy?: "keep_existing" | "overwrite";
};

export interface StartSalesProcessResponse {
  sales_process_id: number;
  client: Client;
  sales_process: SalesProcess;
}

/**
 * POST /sales/start
 */
export async function startSalesProcess(
  payload: StartSalesProcessRequest
): Promise<StartSalesProcessResponse> {
  const res = await fetch("/api/sales/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw {
      response: {
        status: res.status,
        data,
      },
    };
  }

  return data;
}

/* Upsells */
export type UpsellResult = "verlaengerung" | "keine_verlaengerung" | "offen";

// Data RECEIVED from backend
export interface ContractUpsell {
  id: number;
  sales_process_id: number;
  client_id: number;
  upsell_date: string | null;
  upsell_result: UpsellResult;
  upsell_revenue: number | null;
  previous_contract_id: number | null;
  new_contract_id: number | null;
  created_at: string;
  updated_at: string;
  contract_start_date: string | null;
  contract_duration_months: number | null;
  contract_frequency: "monthly" | "bi-monthly" | "quarterly" | null;
}

// Data SENT to backend (request body)
export type CreateOrUpdateUpsellRequest = {
  upsell_date?: string | null;
  upsell_result?: UpsellResult;
  upsell_revenue?: number | null;

  contract_start_date?: string | null;
  contract_duration_months?: number | null;
  contract_frequency?: "monthly" | "bi-monthly" | "quarterly" | null;
};

export type UpsellAnalytics = {
  verlangerung_count: number;
  keine_verlaengerung_count: number;
  scheduled_count: number;
  verlangerungsquote: number | null;
  umsatz_sum: number;
};

/* Contracts */
export interface Contract {
  id: number;
  client_id: number;
  client_name: string;
  sales_process_id: number;
  start_date: string;
  end_date_computed?: string | null;
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

export const updateStageInfo = async (
  id: string | number,
  payload: Partial<Pick<Stage, "name" | "date" | "ad_budget">>
): Promise<void> => {
  await api.patch(`/stages/${id}`, payload);
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

// Upsells
/** GET /sales/{id}/upsell */
export const getUpsellForSalesProcess = async (
  salesProcessId: number
): Promise<ContractUpsell[]> => {
  const { data } = await api.get(`/sales/${salesProcessId}/upsell`);
  return data as ContractUpsell[];
};

/** PATCH /sales/{id}/upsell */
export const createOrUpdateUpsell = async (
  salesProcessId: number,
  payload: CreateOrUpdateUpsellRequest
): Promise<{
  upsell_id: number;
  updated: boolean;
  new_contract_id?: number | null;
}> => {
  const { data } = await api.patch(`/sales/${salesProcessId}/upsell`, payload);
  return data;
};

/** GET /sales/upsells/list */
export const listUpsellCategories = async () => {
  const { data } = await api.get(`/sales/upsells/list`);
  return data as {
    scheduled: ContractUpsell[];
    successful: ContractUpsell[];
    unsuccessful: ContractUpsell[];
  };
};

// Flattened list of all upsells
export const getUpsells = async () => {
  const data = await listUpsellCategories();

  return [
    ...(data.scheduled ?? []),
    ...(data.successful ?? []),
    ...(data.unsuccessful ?? []),
  ];
};

/** GET /sales/upsells/analytics */
export const getUpsellAnalytics = async () => {
  const { data } = await api.get(`/sales/upsells/analytics`);
  return data;
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
  contract_id?: number;
}

export const getCashflowForecast = async (
  contractId?: number
): Promise<CashflowRow[]> => {
  const url = contractId
    ? `/cashflow/forecast?contract_id=${contractId}`
    : `/cashflow/forecast`;

  const { data } = await api.get<CashflowRow[]>(url);

  if (!Array.isArray(data)) return [];

  return data.map((r) => ({
    ...r,
    expected: (r.confirmed ?? 0) + (r.potential ?? 0),
  }));
};

/* Natural Language Querying */
export interface NLQResponse {
  sql: string;
  rows: Record<string, unknown>[];
  columns?: string[];
  error?: string;
  answer?: string;
}

export const runNLQ = async (question: string): Promise<NLQResponse> => {
  const { data } = await api.post<NLQResponse>("/nlq", { question });
  return data;
};
