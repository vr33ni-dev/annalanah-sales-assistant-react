import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Phone,
  FileText,
  Target,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getClients,
  getContracts,
  getSalesProcesses,
  getStages,
  Client,
  Contract,
  SalesProcess,
  Stage,
} from "@/lib/api";

// // Mock data - aligned with actual application data
// const mockData = {
//   totalRevenue: "€6,050",        // Max (3,200) + Thomas (2,850)
//   totalClients: 5,               // Actual number of clients
//   appearanceRate: "75%",         // 3 out of 4 who had calls appeared
//   closingRate: "50%",           // 2 out of 4 who had calls closed
//   avgDealValue: "€3,025",       // (3,200 + 2,850) / 2
//   upcomingStages: 2,            // Munich & Berlin upcoming
//   pendingCalls: 1,              // Only Anna Schmidt has scheduled call
//   activeContracts: 2            // Max & Thomas
// };

export default function Dashboard() {
  const {
    data: clients = [],
    isLoading: loadingClients,
    isError: errorClients,
  } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: getClients,
  });

  const {
    data: contracts = [],
    isLoading: loadingContracts,
    isError: errorContracts,
  } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: getContracts,
  });

  const {
    data: salesProcesses = [],
    isLoading: loadingSales,
    isError: errorSales,
  } = useQuery<SalesProcess[]>({
    queryKey: ["salesProcesses"],
    queryFn: getSalesProcesses,
  });

  const {
    data: stages = [],
    isLoading: loadingStages,
    isError: errorStages,
  } = useQuery<Stage[]>({
    queryKey: ["stages"],
    queryFn: getStages,
  });

  const loading =
    loadingClients || loadingContracts || loadingSales || loadingStages;
  const error = errorClients || errorContracts || errorSales || errorStages;

  if (loading) return <div className="p-6">Loading…</div>;
  if (error)
    return <div className="p-6 text-red-500">Error loading dashboard data</div>;

  const rows = contracts ?? []; // ← default to array
  const totalRevenueNumber = rows.reduce(
    (sum, c) => sum + (c.revenue_total ?? 0),
    0
  );
  const totalRevenue = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(totalRevenueNumber);
  const totalClients = clients.length;

  const callsWithDate = salesProcesses.filter((sp) => !!sp.zweitgespraech_date);
  const appeared = salesProcesses.filter(
    (sp) => sp.zweitgespraech_result === true
  ).length;
  const appearanceRate = callsWithDate.length
    ? `${Math.round((appeared / callsWithDate.length) * 100)}%`
    : "—";

  const closed = salesProcesses.filter((sp) => sp.abschluss === true).length;
  const closingRate = callsWithDate.length
    ? `${Math.round((closed / callsWithDate.length) * 100)}%`
    : "—";

  const now = Date.now();
  const upcomingStages = stages.filter(
    (s) => s.date && new Date(s.date).getTime() > now
  ).length;
  const pendingCalls = salesProcesses.filter(
    (sp) =>
      sp.zweitgespraech_date && new Date(sp.zweitgespraech_date).getTime() > now
  ).length;
  const activeContracts = contracts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Geschäftsübersicht und wichtige Kennzahlen
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Gesamtumsatz"
          value={totalRevenue}
          change="+12% vom letzten Monat"
          changeType="positive"
          icon={DollarSign}
          description="Gesamtumsatz aller Zeiten"
        />

        <KPICard
          title="Kunden Gesamt"
          value={totalClients}
          change="+1 neue diesen Monat"
          changeType="positive"
          icon={Users}
          description="Gesamte Einträge"
        />

        <KPICard
          title="Erscheinungsquote"
          value={appearanceRate}
          change="+2% vs letztem Monat"
          changeType="positive"
          icon={Target}
          description="Show-up Rate für Gespräche"
        />

        <KPICard
          title="Abschlussquote"
          value={closingRate}
          change="+8% vs letztem Monat"
          changeType="positive"
          icon={TrendingUp}
          description="Deal Abschlussrate"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Abgeschlossene Zweitgespräche"
          value={closed}
          change="+1 diese Woche"
          changeType="positive"
          icon={Phone}
          description="Zweitgespräche durchgeführt"
        />

        <KPICard
          title="Kommende Bühnen"
          value={upcomingStages}
          description="Events diesen Monat"
          icon={Calendar}
        />

        <KPICard
          title="Ausstehende Zweitgespräche"
          value={pendingCalls}
          description="Zweitgespräch geplant"
          icon={Phone}
        />

        <KPICard
          title="Aktive Verträge"
          value={activeContracts}
          description="Umsatz generierend"
          icon={FileText}
        />
      </div>

      {/* Dashboard Header with ROI per Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ROI pro Bühne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
                <span className="font-medium">Hamburg Workshop</span>
                <span className="text-success font-bold">+480% ROI</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-warning/10 rounded-lg">
                <span className="font-medium">Munich Seminar</span>
                <span className="text-warning font-bold">Pending</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                <span className="font-medium">Berlin Conference</span>
                <span className="text-primary font-bold">Upcoming</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Kürzliche Aktivitäten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Neueste Kundeninteraktionen
              </div>
              <div className="space-y-2">
                {contracts.slice(0, 2).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 bg-accent/30 rounded"
                  >
                    <span>{`Contract #${c.id} - Client ${c.client_id}`}</span>
                    <Badge className="bg-success text-success-foreground">
                      {new Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: "EUR",
                      }).format(c.revenue_total ?? 0)}
                    </Badge>
                  </div>
                ))}
                {salesProcesses.slice(0, 1).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 bg-accent/30 rounded"
                  >
                    <span>{`SP #${s.id} - ${s.stage}`}</span>
                    <Badge variant="outline">
                      {s.zweitgespraech_date ?? "—"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
