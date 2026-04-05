import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Pencil,
  Save,
  X,
  Trash,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Client, deleteClient, getClients, updateClient } from "@/lib/api";
import { asArray } from "@/lib/safe";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockClients } from "@/lib/mockData";
import { CommentsDialog } from "@/components/comments/CommentsDialog";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";
import { formatDateOnly } from "@/helpers/date";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/hooks/use-toast";
import { ConfirmActionButton } from "../components/ConfirmActionButton";

const sourceLabels = {
  organic: "Organic",
  paid: "Paid Ads",
} as const;

const statusColors = {
  initial_call_scheduled: "bg-info text-info-foreground",
  follow_up_scheduled: "bg-warning text-warning-foreground",
  awaiting_response: "bg-primary text-primary-foreground",
  active: "bg-success text-success-foreground",
  lost: "bg-destructive text-destructive-foreground",
  inactive: "bg-muted text-muted-foreground",
} as const;

const statusLabels = {
  initial_call_scheduled: "Erstgespräch geplant",
  follow_up_scheduled: "Zweitgespräch geplant",
  awaiting_response: "Antwort ausstehend",
  active: "Kunde",
  lost: "Verloren",
  inactive: "Inaktiv",
} as const;

const FORMER_CLIENT_STATUSES = new Set(["inactive"]);
const CLIENT_STATUS_FILTER_OPTIONS = Object.keys(statusLabels) as Array<
  keyof typeof statusLabels
>;

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFormerClients, setShowFormerClients] = useState(false);
  const [activeStatusFilters, setActiveStatusFilters] = useState<
    Array<keyof typeof statusLabels>
  >([]);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});
  const [sortField, setSortField] = useState<"name" | "email" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const queryClient = useQueryClient();

  const { data, isFetching, error } = useMockableQuery<Client[]>({
    queryKey: queryKeys.clients(showFormerClients),
    queryFn: () => getClients(showFormerClients),
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (d) => asArray<Client>(d),
    mockData: mockClients,
  });

  const clients = data ?? [];

  const toggleStatusFilter = (status: keyof typeof statusLabels) => {
    setActiveStatusFilters((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  };

  // Switching modes clears status filters to avoid stale cross-mode selections.
  const onToggleShowFormer = (value: boolean) => {
    setShowFormerClients(value);
    setActiveStatusFilters([]);
  };

  const toLower = (v: unknown) => (v ?? "").toString().toLowerCase();

  const filteredClients = clients.filter((c) => {
    const clientStatus = c.status as keyof typeof statusLabels;
    const matchesSearch =
      toLower(c.name).includes(toLower(searchTerm)) ||
      toLower(c.email).includes(toLower(searchTerm));
    const matchesStatus =
      activeStatusFilters.length === 0
        ? true
        : activeStatusFilters.includes(clientStatus);
    const matchesFormer = showFormerClients
      ? FORMER_CLIENT_STATUSES.has(clientStatus)
      : !FORMER_CLIENT_STATUSES.has(clientStatus);

    return matchesSearch && matchesStatus && matchesFormer;
  });

  const handleSort = (field: "name" | "email") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedClients = sortField
    ? [...filteredClients].sort((a, b) => {
        const av = toLower(a[sortField]);
        const bv = toLower(b[sortField]);
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      })
    : filteredClients;

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    sortedClients,
    10,
  );

  const handleEdit = (client: Client) => {
    setEditingClientId(client.id);
    setEditedClient({ ...client });
  };

  const handleSave = async () => {
    if (!editingClientId) return;

    const validSource =
      editedClient.source === "organic" || editedClient.source === "paid"
        ? editedClient.source
        : null;

    const optimisticClient: Client = {
      id: editingClientId,
      name: editedClient.name ?? "",
      email: editedClient.email ?? "",
      phone: editedClient.phone ?? "",
      source: validSource,
      source_stage_id: editedClient.source_stage_id ?? null,
      source_stage_name: editedClient.source_stage_name ?? null,
      status: editedClient.status ?? "",
      completed_at: editedClient.completed_at ?? null,
    };

    const payload: Partial<Client> = { ...editedClient, source: validSource };

    let savedClient: Client;

    try {
      savedClient = await updateClient(editingClientId, payload);
      // Invalidate sales process queries so table updates with new client data
      queryClient.invalidateQueries({ queryKey: queryKeys.sales });
    } catch (e) {
      console.warn("[Clients] save failed (expected in preview):", e);
      toast({
        title: "Speichern fehlgeschlagen",
        description: "Der Kunde konnte nicht gespeichert werden.",
        variant: "destructive",
      });
      return;
    }

    queryClient.setQueryData<Client[]>(
      queryKeys.clients(showFormerClients),
      (current = []) =>
        current.map((client) =>
          client.id === editingClientId
            ? {
                ...client,
                ...optimisticClient,
                ...savedClient,
                source_stage_id:
                  savedClient.source_stage_id ??
                  optimisticClient.source_stage_id,
                source_stage_name:
                  savedClient.source_stage_name ??
                  optimisticClient.source_stage_name,
              }
            : client,
        ),
    );

    setEditingClientId(null);
    setEditedClient({});
    queryClient.invalidateQueries({
      queryKey: queryKeys.clients(showFormerClients),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.leads });
    toast({ title: "Kunde gespeichert" });
  };

  if (isFetching && clients.length === 0)
    return <div className="p-6">Loading…</div>;
  if (error)
    return <div className="p-6 text-red-500">Error loading clients.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Kundendatenbank
          </h1>
          <p className="text-muted-foreground">
            Verwaltung und Übersicht von Kunden und Leads.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border overflow-hidden text-sm">
            <button
              className={`px-3 py-1.5 transition-colors ${
                !showFormerClients
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => onToggleShowFormer(false)}
            >
              Aktive
            </button>
            <button
              className={`px-3 py-1.5 border-l transition-colors ${
                showFormerClients
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => onToggleShowFormer(true)}
            >
              Ehemalige
            </button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Kundensuche..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="[&_td]:py-2">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    className="flex items-center gap-1 font-semibold hover:text-primary"
                    onClick={() => handleSort("name")}
                  >
                    Name
                    {sortField === "name" ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 font-semibold hover:text-primary"
                    onClick={() => handleSort("email")}
                  >
                    Email
                    {sortField === "email" ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Quelle</TableHead>
                <TableHead>Bühne</TableHead>
                <TableHead>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 font-semibold hover:text-primary">
                        Status
                        <Filter className="w-3 h-3 opacity-70" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 border-b pb-2 mb-2">
                          <Checkbox
                            id="client-filter-all"
                            checked={activeStatusFilters.length === 0}
                            onCheckedChange={() => setActiveStatusFilters([])}
                          />
                          <label
                            htmlFor="client-filter-all"
                            className="text-sm font-medium"
                          >
                            Alle
                          </label>
                        </div>

                        {CLIENT_STATUS_FILTER_OPTIONS.filter((status) =>
                          showFormerClients
                            ? FORMER_CLIENT_STATUSES.has(status)
                            : !FORMER_CLIENT_STATUSES.has(status),
                        ).map((status) => (
                          <div
                            key={status}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`client-filter-${status}`}
                              checked={activeStatusFilters.includes(status)}
                              onCheckedChange={() => toggleStatusFilter(status)}
                            />
                            <label
                              htmlFor={`client-filter-${status}`}
                              className="text-sm"
                            >
                              {statusLabels[status]}
                            </label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableHead>
                <TableHead>Abgeschlossen am</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    {editingClientId === client.id ? (
                      <Input
                        value={editedClient.name || ""}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            name: e.target.value,
                          })
                        }
                      />
                    ) : (
                      client.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingClientId === client.id ? (
                      <Input
                        value={editedClient.email || ""}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            email: e.target.value,
                          })
                        }
                      />
                    ) : (
                      client.email
                    )}
                  </TableCell>
                  <TableCell>
                    {editingClientId === client.id ? (
                      <Input
                        value={editedClient.phone || ""}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            phone: e.target.value,
                          })
                        }
                      />
                    ) : (
                      client.phone
                    )}
                  </TableCell>
                  <TableCell
                    className={
                      editingClientId === client.id ? "opacity-40" : ""
                    }
                  >
                    {sourceLabels[client.source as keyof typeof sourceLabels] ??
                      client.source}
                  </TableCell>

                  <TableCell
                    className={
                      editingClientId === client.id ? "opacity-40" : ""
                    }
                  >
                    {client.source_stage_name || "–"}
                  </TableCell>

                  <TableCell
                    className={
                      editingClientId === client.id ? "opacity-40" : ""
                    }
                  >
                    <Badge
                      className={
                        statusColors[
                          client.status as keyof typeof statusColors
                        ] ?? "bg-muted"
                      }
                    >
                      {statusLabels[
                        client.status as keyof typeof statusLabels
                      ] ?? client.status}
                    </Badge>
                  </TableCell>

                  <TableCell
                    className={
                      editingClientId === client.id ? "opacity-40" : ""
                    }
                  >
                    {client.completed_at
                      ? formatDateOnly(client.completed_at)
                      : "-"}
                  </TableCell>

                  <TableCell className="flex gap-2">
                    {editingClientId === client.id ? (
                      <>
                        <Button size="sm" onClick={handleSave}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingClientId(null);
                            setEditedClient({});
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => handleEdit(client)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <CommentsDialog
                          entityType="client"
                          entityId={client.id}
                          entityName={client.name}
                        />
                        <ConfirmActionButton
                          title="Kunde löschen?"
                          description="Dieser Kunde wird dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden."
                          confirmLabel="Löschen"
                          onConfirm={async () => {
                            try {
                              await deleteClient(client.id);

                              queryClient.invalidateQueries({
                                queryKey: ["clients"],
                              });
                              queryClient.invalidateQueries({
                                queryKey: queryKeys.sales,
                              });
                              queryClient.invalidateQueries({
                                queryKey: queryKeys.contracts,
                              });
                              toast({ title: "Kunde gelöscht" });
                            } catch {
                              toast({
                                title: "Kunde konnte nicht gelöscht werden",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Button size="sm" variant="destructive">
                            <Trash className="w-4 h-4" />
                          </Button>
                        </ConfirmActionButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {paginatedItems.length === 0 && !isFetching && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground"
                  >
                    Keine Einträge gefunden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filteredClients.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {paginatedItems.length} von {filteredClients.length} Einträgen
              </span>
              <TablePagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
