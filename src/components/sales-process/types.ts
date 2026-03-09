import type { Dispatch, SetStateAction } from "react";
import type { Lead, SalesProcess, Stage } from "@/lib/api";
import type {
  ActiveStatusFilter,
  DateFilterType,
  StatusFilter,
} from "@/hooks/useSalesProcessFilters";

export type SortOrder = "asc" | "desc" | null;

export type SalesProcessWithStageId = SalesProcess & {
  stage_id?: number | null;
  source_stage_name?: string | null;
};

export type GespraechType = "erstgespraech" | "zweitgespraech";
export type SalesProcessFormStep = 0 | 1 | 2 | 3 | 4 | 5;
export type SalesProcessSource = "" | "organic" | "paid";

export interface SalesProcessFormData {
  name: string;
  email: string;
  phone: string;
  source: SalesProcessSource;
  stageId: number | null;
  erstgespraechDate: Date | null;
  zweitgespraechDate: Date | null;
  salesProcessId?: number;
  zweitgespraechResult: boolean | null;
  abschluss: boolean | null;
  revenue: string;
  contractDuration: string;
  contractStart: Date | null;
  contractFrequency:
    | ""
    | "monthly"
    | "bi-monthly"
    | "quarterly"
    | "one-time"
    | "bi-yearly";
  clientId?: number;
  leadId?: number;
  completedAt: string | null;
}

export interface SalesProcessWorkflowFormProps {
  showForm: boolean;
  title: string;
  formStep: SalesProcessFormStep;
  setFormStep: Dispatch<SetStateAction<SalesProcessFormStep>>;
  gespraechType: GespraechType;
  setGespraechType: Dispatch<SetStateAction<GespraechType>>;
  formData: SalesProcessFormData;
  setFormData: Dispatch<SetStateAction<SalesProcessFormData>>;
  stages: Stage[];
  isStartPending: boolean;
  isPatchPending: boolean;
  canSubmit: boolean;
  isFollowUpFuture: boolean;
  onClose: () => void;
  onErstgespraechSave: () => void | Promise<void>;
  onZweitgespraechStart: () => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
  onSelectLead: (lead: Lead | null) => void;
}

export interface SalesProcessTableProps {
  statusFilter: StatusFilter;
  setActiveStatusFilters: Dispatch<SetStateAction<ActiveStatusFilter[]>>;
  activeStatusFilters: ActiveStatusFilter[];
  activeSourceFilters: string[];
  setActiveSourceFilters: Dispatch<SetStateAction<string[]>>;
  toggleStatusFilter: (value: ActiveStatusFilter) => void;
  toggleSourceFilter: (value: string) => void;
  dateFilter: DateFilterType;
  setDateFilter: Dispatch<SetStateAction<DateFilterType>>;
  paginatedSales: SalesProcessWithStageId[];
  stages: Stage[];
  highlightId: number | null;
  onShowDetails: (entry: SalesProcessWithStageId) => void;
  onPlanFollowUp: (entry: SalesProcessWithStageId) => void;
  onEnterResult: (entry: SalesProcessWithStageId) => void;
  onEnterClosing: (entry: SalesProcessWithStageId) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
