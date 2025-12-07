// Mock data for Lovable preview environment
import type { Client, Contract, SalesProcess, Stage } from "./api";
import { SALES_STAGE } from "@/constants/stages";

export const isLovablePreview = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.includes("lovableproject.com") || host.includes("lovable.app") || host.includes("webcontainer");
};

export const mockClients: Client[] = [
  { id: 1, name: "Max Mustermann", email: "max@example.com", phone: "+49 123 456789", source: "paid", source_stage_name: "Workshop Q1", status: "active" },
  { id: 2, name: "Anna Schmidt", email: "anna@example.com", phone: "+49 234 567890", source: "organic", source_stage_name: null, status: "active" },
  { id: 3, name: "Peter Weber", email: "peter@example.com", phone: "+49 345 678901", source: "paid", source_stage_name: "Workshop Q2", status: "completed", completed_at: "2024-11-15" },
  { id: 4, name: "Julia Fischer", email: "julia@example.com", phone: "+49 456 789012", source: "organic", source_stage_name: null, status: "active" },
  { id: 5, name: "Thomas Müller", email: "thomas@example.com", phone: "+49 567 890123", source: "paid", source_stage_name: "Workshop Q1", status: "active" },
];

export const mockContracts: Contract[] = [
  { id: 1, client_id: 1, client_name: "Max Mustermann", sales_process_id: 1, start_date: "2024-01-01", end_date_computed: "2024-12-31", duration_months: 12, revenue_total: 12000, payment_frequency: "monthly", monthly_amount: 1000, paid_months: 11, paid_amount_total: 11000, next_due_date: "2024-12-01" },
  { id: 2, client_id: 2, client_name: "Anna Schmidt", sales_process_id: 2, start_date: "2024-03-01", end_date_computed: "2024-08-31", duration_months: 6, revenue_total: 4500, payment_frequency: "monthly", monthly_amount: 750, paid_months: 6, paid_amount_total: 4500, next_due_date: null },
  { id: 3, client_id: 3, client_name: "Peter Weber", sales_process_id: 3, start_date: "2024-06-01", end_date_computed: "2025-05-31", duration_months: 12, revenue_total: 9600, payment_frequency: "quarterly", monthly_amount: 800, paid_months: 6, paid_amount_total: 4800, next_due_date: "2025-01-01" },
  { id: 4, client_id: 5, client_name: "Thomas Müller", sales_process_id: 5, start_date: "2024-09-01", end_date_computed: "2025-02-28", duration_months: 6, revenue_total: 6000, payment_frequency: "monthly", monthly_amount: 1000, paid_months: 3, paid_amount_total: 3000, next_due_date: "2024-12-15" },
];

export const mockSalesProcesses: SalesProcess[] = [
  { id: 1, client_id: 1, client_name: "Max Mustermann", client_email: "max@example.com", client_phone: "+49 123 456789", client_source: "paid", stage: SALES_STAGE.CLOSED, follow_up_date: "2024-01-10", follow_up_result: true, closed: true, revenue: 12000, stage_id: 1 },
  { id: 2, client_id: 2, client_name: "Anna Schmidt", client_email: "anna@example.com", client_phone: "+49 234 567890", client_source: "organic", stage: SALES_STAGE.CLOSED, follow_up_date: "2024-02-20", follow_up_result: true, closed: true, revenue: 4500, stage_id: null },
  { id: 3, client_id: 3, client_name: "Peter Weber", client_email: "peter@example.com", client_phone: "+49 345 678901", client_source: "paid", stage: SALES_STAGE.CLOSED, follow_up_date: "2024-05-15", follow_up_result: true, closed: true, revenue: 9600, stage_id: 2 },
  { id: 4, client_id: 4, client_name: "Julia Fischer", client_email: "julia@example.com", client_phone: "+49 456 789012", client_source: "organic", stage: SALES_STAGE.FOLLOW_UP, follow_up_date: "2024-12-20", follow_up_result: null, closed: false, revenue: null, stage_id: null },
  { id: 5, client_id: 5, client_name: "Thomas Müller", client_email: "thomas@example.com", client_phone: "+49 567 890123", client_source: "paid", stage: SALES_STAGE.CLOSED, follow_up_date: "2024-08-25", follow_up_result: true, closed: true, revenue: 6000, stage_id: 1 },
  { id: 6, client_id: 6, client_name: "Sarah Braun", client_email: "sarah@example.com", client_phone: "+49 678 901234", client_source: "paid", stage: SALES_STAGE.LOST, follow_up_date: "2024-10-10", follow_up_result: true, closed: false, revenue: null, stage_id: 3 },
];

export const mockStages: Stage[] = [
  { id: 1, name: "Workshop Q1 2024", date: "2024-03-15", ad_budget: 2500, registrations: 45, participants: 32 },
  { id: 2, name: "Workshop Q2 2024", date: "2024-06-20", ad_budget: 3000, registrations: 52, participants: 38 },
  { id: 3, name: "Workshop Q3 2024", date: "2024-09-18", ad_budget: 2800, registrations: 48, participants: 35 },
  { id: 4, name: "Workshop Q4 2024", date: "2024-12-12", ad_budget: 3200, registrations: 55, participants: 40 },
  { id: 5, name: "Workshop Q1 2025", date: "2025-03-20", ad_budget: 3500, registrations: 30, participants: null },
];
