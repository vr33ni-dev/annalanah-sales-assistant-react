import { useMutation, useQueryClient } from "@tanstack/react-query";
import { STAGE_LABELS } from "@/constants/stages";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockClients, mockSalesProcesses, mockStages } from "@/lib/mockData";
import { asArray } from "@/lib/safe";
import {
  Client,
  SalesProcess,
  SalesProcessUpdateRequest,
  Stage,
  StartSalesProcessRequest,
  StartSalesProcessResponse,
  getClients,
  getSalesProcesses,
  getStages,
  startSalesProcess,
  updateSalesProcess,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { isFetchError, StartSalesProcessError } from "@/types/apiError";
import type { MergeConflicts } from "@/types/merge";
import type { SalesProcessWithStageId } from "@/hooks/useSalesProcessFilters";

type SalesProcessCacheItem = SalesProcess & { stage_label: string };

interface ClientExistsPayload {
  clientId: number;
  hasActiveContract: boolean;
  conflicts: MergeConflicts;
  originalPayload: StartSalesProcessRequest;
}

interface UseSalesProcessDataOptions {
  onStartSuccess: () => void;
  onClientHasActiveContract: (clientId: number) => void;
  onClientExists: (payload: ClientExistsPayload) => void;
  showErrorToast: (title: string, err: unknown) => void;
}

export function useSalesProcessData({
  onStartSuccess,
  onClientHasActiveContract,
  onClientExists,
  showErrorToast,
}: UseSalesProcessDataOptions) {
  const queryClient = useQueryClient();

  const {
    data: sales = [],
    isFetching: loadingSales,
    isError: errorSales,
  } = useMockableQuery<SalesProcessWithStageId[]>({
    queryKey: queryKeys.sales,
    queryFn: getSalesProcesses as unknown as () => Promise<
      SalesProcessWithStageId[]
    >,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<SalesProcessWithStageId>,
    mockData: mockSalesProcesses as SalesProcessWithStageId[],
  });

  const { data: clients = [] } = useMockableQuery<Client[]>({
    queryKey: queryKeys.clients(false),
    queryFn: () => getClients(false),
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Client>,
    mockData: mockClients,
  });

  const {
    data: stages = [],
    isFetching: loadingStages,
    isError: errorStages,
  } = useMockableQuery<Stage[]>({
    queryKey: queryKeys.stages,
    queryFn: getStages,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Stage>,
    mockData: mockStages,
  });

  const mStart = useMutation({
    mutationFn: startSalesProcess,
    onSuccess: (data: StartSalesProcessResponse) => {
      try {
        if (data.client) {
          queryClient.setQueryData<Client[]>(queryKeys.clients(false), (old) => {
            const prev = (old ?? []) as Client[];
            const idx = prev.findIndex(
              (client) => client.id === data.client.id,
            );
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...data.client };
              return next;
            }
            return [data.client, ...prev];
          });
        }
      } catch {
        // ignore cache update errors
      }

      try {
        const salesProcess = data.sales_process;
        if (salesProcess) {
          queryClient.setQueryData<SalesProcessCacheItem[]>(
            queryKeys.sales,
            (old) => {
              const prev: SalesProcessCacheItem[] = old ?? [];
              const item: SalesProcessCacheItem = {
                ...salesProcess,
                // Enrich with client fields the server may not denormalize
                client_name:
                  salesProcess.client_name || data.client?.name || "",
                client_email:
                  salesProcess.client_email ?? data.client?.email ?? null,
                client_phone:
                  salesProcess.client_phone ?? data.client?.phone ?? null,
                client_source:
                  salesProcess.client_source ?? data.client?.source ?? null,
                stage_label:
                  STAGE_LABELS[salesProcess.stage] || salesProcess.stage,
              };
              if (!prev.find((entry) => entry.id === item.id)) {
                return [item, ...prev];
              }
              return prev;
            },
          );
        }
      } catch {
        // ignore cache update errors
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onStartSuccess();
    },
    onError: (err: unknown) => {
      if (!isFetchError(err)) {
        showErrorToast("Fehler beim Anlegen", err);
        return;
      }

      const { status, data } = err.response;

      if (status !== 409 || typeof data !== "object" || data === null) {
        showErrorToast("Fehler beim Anlegen", err);
        return;
      }

      const apiError = data as StartSalesProcessError;

      if (apiError.error === "client_has_active_contract") {
        onClientHasActiveContract(apiError.client_id);
        return;
      }

      if (apiError.error === "client_exists") {
        onClientExists({
          clientId: apiError.client_id,
          hasActiveContract: apiError.has_active_contract ?? false,
          conflicts: apiError.conflicts ?? {},
          originalPayload: apiError.original_payload,
        });
        return;
      }

      showErrorToast("Fehler beim Anlegen", err);
    },
  });

  const mPatch = useMutation<
    Awaited<ReturnType<typeof updateSalesProcess>>,
    unknown,
    { id: number; payload: SalesProcessUpdateRequest }
  >({
    mutationFn: ({ id, payload }) => updateSalesProcess(id, payload),
    onSuccess: (data, vars) => {
      try {
        console.debug("mPatch.onSuccess - response:", data);

        queryClient.setQueryData<SalesProcessCacheItem[]>(
          queryKeys.sales,
          (old) => {
            const prev: SalesProcessCacheItem[] =
              (old as SalesProcessCacheItem[]) ?? [];
            return prev.map((item) => {
              if (item.id !== data.id) return item;
              const resolvedStage = data.stage ?? item.stage;
              const merged: SalesProcessCacheItem = {
                ...item,
                ...data,
                stage: resolvedStage,
                stage_label: STAGE_LABELS[resolvedStage] ?? resolvedStage,
              };
              console.debug("mPatch.onSuccess - merging item", {
                before: item,
                response: data,
                after: merged,
              });
              return merged;
            });
          },
        );
      } catch (err) {
        console.debug(
          "mPatch.onSuccess - cache update failed, invalidating",
          err,
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.sales });
      }

      if (vars.payload.closed === true) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contracts });
        queryClient.invalidateQueries({
          queryKey: queryKeys.contract(vars.id),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
    },
    onError: (err: unknown) => showErrorToast("Fehler beim Aktualisieren", err),
  });

  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const salesWithClientFallback = sales.map((entry) => {
    const client = clientsById.get(entry.client_id);
    const fallbackSource =
      entry.client_source ??
      (client?.source === "paid" || client?.source === "organic"
        ? client.source
        : null);
    const fallbackStageId =
      fallbackSource === "paid"
        ? (entry.stage_id ?? client?.source_stage_id ?? null)
        : null;
    const fallbackStageName =
      fallbackSource === "paid"
        ? (entry.source_stage_name ?? client?.source_stage_name ?? null)
        : null;

    return {
      ...entry,
      client_source: fallbackSource,
      stage_id: fallbackStageId,
      source_stage_name: fallbackStageName,
    };
  });

  return {
    sales: salesWithClientFallback,
    loadingSales,
    errorSales,
    stages,
    loadingStages,
    errorStages,
    mStart,
    mPatch,
  };
}
