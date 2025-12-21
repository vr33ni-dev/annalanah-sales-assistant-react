import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Search, UserPlus, CheckCircle2 } from "lucide-react";
import { Lead, getLeads } from "@/lib/api";
import { asArray } from "@/lib/safe";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockLeads } from "@/lib/mockData";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const sourceLabels: Record<string, string> = {
  organic: "Organic",
  paid: "Paid Ads",
};

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isFetching, error } = useMockableQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: getLeads,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (d) => asArray<Lead>(d),
    mockData: mockLeads,
  });

  const leads = data ?? [];

  const toLower = (v: unknown) => (v ?? "").toString().toLowerCase();

  const filteredLeads = leads.filter((lead) => {
    return (
      toLower(lead.name).includes(toLower(searchTerm)) ||
      toLower(lead.email).includes(toLower(searchTerm)) ||
      toLower(lead.phone).includes(toLower(searchTerm))
    );
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd.MM.yyyy", { locale: de });
    } catch {
      return dateStr;
    }
  };

  if (isFetching && leads.length === 0)
    return <div className="p-6">Loading…</div>;
  if (error)
    return <div className="p-6 text-destructive">Fehler beim Laden der Leads.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">
            Übersicht aller Leads und Interessenten
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gesamt Leads</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Konvertiert</p>
                <p className="text-2xl font-bold">
                  {leads.filter((l) => l.converted).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <UserPlus className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Offen</p>
                <p className="text-2xl font-bold">
                  {leads.filter((l) => !l.converted).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Leads durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
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
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erstellt am</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.email || "-"}</TableCell>
                  <TableCell>{lead.phone || "-"}</TableCell>
                  <TableCell>
                    {sourceLabels[lead.source ?? ""] ?? lead.source ?? "-"}
                  </TableCell>
                  <TableCell>{lead.source_stage_name || "-"}</TableCell>
                  <TableCell>
                    {lead.converted ? (
                      <Badge className="bg-success text-success-foreground">
                        Konvertiert
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Offen
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(lead.created_at)}</TableCell>
                </TableRow>
              ))}
              {filteredLeads.length === 0 && !isFetching && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Keine Leads gefunden.
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
