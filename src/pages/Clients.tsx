import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Filter,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Client, getClients } from "@/lib/api";

const stageLabels = {
  erstgespraech: "First Call",
  zweitgespraech: "Second Call",
  abschluss: "Closed",
  verloren: "Lost",
};

const sourceLabels = {
  organic: "Organic",
  paid: "Paid Ads",
};

const statusColors = {
  follow_up_scheduled: "bg-warning text-warning-foreground", // Zweitgespräch geplant
  awaiting_response: "bg-primary text-primary-foreground", // Zweitgespräch erledigt, Entscheidung ausstehend
  active: "bg-success text-success-foreground", // Vertrag abgeschlossen
  lost: "bg-destructive text-destructive-foreground", // Abgelehnt nach Zweitgespräch
  inactive: "bg-muted text-muted-foreground", // Inaktiv
};

const statusLabels = {
  follow_up_scheduled: "Zweitgespräch geplant",
  awaiting_response: "Antwort ausstehend",
  active: "Kunde",
  lost: "Verloren",
  inactive: "Inaktiv",
};

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: clients = [],
    isLoading: loadingClients,
    isError: errorClients,
  } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: getClients,
  });

  // helper to lowercase safely
  const toLower = (v: unknown) => (v ?? "").toString().toLowerCase();

  const filteredClients = (clients ?? [])
    .filter(Boolean)
    .filter(
      (client) =>
        toLower(client.name).includes(toLower(searchTerm)) ||
        toLower(client.email).includes(toLower(searchTerm))
    );

  const loading = loadingClients;
  const error = errorClients;

  if (loading) return <div className="p-6">Loading…</div>;
  if (error)
    return <div className="p-6 text-red-500">Error loading dashboard data</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kunden</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Kundendatenbank und Beziehungen
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-xs text-muted-foreground">Gesamt Einträge</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {
                    clients.filter((c) => c.status === "follow_up_scheduled")
                      .length
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  Zweitgespräche geplant
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {
                    clients.filter((c) =>
                      ["awaiting_response", "active", "lost"].includes(c.status)
                    ).length
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  Zweitgespräche erledigt
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {clients.filter((c) => c.status === "active").length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Abgeschlossene Kunden
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Client Database</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source (Organic/Paid)</TableHead>
                <TableHead>Linked Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {sourceLabels[client.source as keyof typeof sourceLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {client.source_stage_name ? (
                      <Badge variant="secondary">
                        {client.source_stage_name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        statusColors[client.status as keyof typeof statusColors]
                      }
                    >
                      {statusLabels[client.status as keyof typeof statusLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View Sales Process"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Add Note">
                        <Calendar className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
