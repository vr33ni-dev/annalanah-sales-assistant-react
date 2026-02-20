import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Pencil, Save, X, Trash } from "lucide-react";
import { Client, getClients } from "@/lib/api";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { asArray } from "@/lib/safe";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockClients } from "@/lib/mockData";
import { CommentsDialog } from "@/components/comments/CommentsDialog";

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

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});

  const queryClient = useQueryClient();

  const { data, isFetching, error } = useMockableQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: getClients,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (d) => asArray<Client>(d),
    mockData: mockClients,
  });

  const clients = data ?? [];

  const toLower = (v: unknown) => (v ?? "").toString().toLowerCase();

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      toLower(c.name).includes(toLower(searchTerm)) ||
      toLower(c.email).includes(toLower(searchTerm));
    const matchesMonth = filterMonth
      ? c.completed_at?.startsWith(filterMonth)
      : true;
    return matchesSearch && matchesMonth;
  });

  const handleEdit = (client: Client) => {
    setEditingClientId(client.id);
    setEditedClient(client);
  };

  const handleSave = async () => {
    if (!editingClientId) return;

    // ✅ validation: require completed_at if Kunde
    if (editedClient.status === "active" && !editedClient.completed_at) {
      alert("Bitte das Abschlussdatum angeben (erforderlich für Kunden).");
      return;
    }

    const payload = {
      id: editingClientId,
      ...editedClient,
    };

    await fetch(`/api/clients/${editingClientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setEditingClientId(null);
    queryClient.invalidateQueries({ queryKey: ["clients"] });
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
        <Input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="w-40"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Quelle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Abgeschlossen am</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
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
                  <TableCell>
                    {editingClientId === client.id ? (
                      <select
                        className="border rounded px-2 py-1"
                        value={editedClient.source || ""}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            source: e.target.value,
                          })
                        }
                      >
                        <option value="organic">Organic</option>
                        <option value="paid">Paid Ads</option>
                      </select>
                    ) : (
                      (sourceLabels[
                        client.source as keyof typeof sourceLabels
                      ] ?? client.source)
                    )}
                  </TableCell>

                  <TableCell>
                    {editingClientId === client.id ? (
                      <select
                        className="border rounded px-2 py-1"
                        value={editedClient.status || ""}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            status: e.target.value,
                          })
                        }
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
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
                    )}
                  </TableCell>

                  <TableCell>
                    {editingClientId === client.id ? (
                      <div className="relative w-[180px]">
                        <Input
                          type="date"
                          value={editedClient.completed_at?.slice(0, 10) || ""}
                          onChange={(e) =>
                            setEditedClient({
                              ...editedClient,
                              completed_at: e.target.value || null,
                            })
                          }
                          disabled={editedClient.status !== "active"}
                          required={editedClient.status === "active"} // ✅ required if Kunde
                          className={`pr-8 ${
                            editedClient.status !== "active"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        />
                        {editedClient.status === "active" &&
                          editedClient.completed_at && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditedClient({
                                  ...editedClient,
                                  completed_at: null,
                                })
                              }
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    ) : client.completed_at ? (
                      new Date(client.completed_at).toISOString().split("T")[0]
                    ) : (
                      "-"
                    )}
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
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "Kunde wirklich löschen?",
                            );
                            if (!confirmed) return;

                            await fetch(`/api/clients/${client.id}`, {
                              method: "DELETE",
                            });

                            queryClient.invalidateQueries({
                              queryKey: ["clients"],
                            });
                            queryClient.invalidateQueries({
                              queryKey: ["sales"],
                            });
                            queryClient.invalidateQueries({
                              queryKey: ["contracts"],
                            });
                          }}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredClients.length === 0 && !isFetching && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Keine Einträge gefunden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
