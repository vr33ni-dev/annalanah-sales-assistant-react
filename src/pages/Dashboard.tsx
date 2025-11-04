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
  type Client,
  type Contract,
  type SalesProcess,
  type Stage,
} from "@/lib/api";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { asArray } from "@/lib/safe";
import StageCard from "./StageCard";

export default function Dashboard() {
  const { enabled } = useAuthEnabled();

  const {
    data: clients = [],
    isFetching: loadingClients,
    isError: errorClients,
  } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: getClients,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Client>,
  });

  const {
    data: contracts = [],
    isFetching: loadingContracts,
    isError: errorContracts,
  } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: getContracts,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Contract>,
  });

  const {
    data: salesProcesses = [],
    isFetching: loadingSales,
    isError: errorSales,
  } = useQuery<SalesProcess[]>({
    queryKey: ["salesProcesses"],
    queryFn: getSalesProcesses,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<SalesProcess>,
  });

  const {
    data: stages = [],
    isFetching: loadingStages,
    isError: errorStages,
  } = useQuery<Stage[]>({
    queryKey: ["stages"],
    queryFn: getStages,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Stage>,
  });

  const initialLoading =
    (loadingClients && clients.length === 0) ||
    (loadingContracts && contracts.length === 0) ||
    (loadingSales && salesProcesses.length === 0) ||
    (loadingStages && stages.length === 0);

  const anyError = errorClients || errorContracts || errorSales || errorStages;

  if (initialLoading) return <div className="p-6">Loading…</div>;
  if (anyError)
    return <div className="p-6 text-red-500">Error loading dashboard data</div>;

  // KPIs (arrays guaranteed)
  const totalRevenueNumber = contracts.reduce(
    (sum, c) => sum + (c.revenue_total ?? 0),
    0
  );
  const totalRevenue = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(totalRevenueNumber);
  const totalClients = clients.length;

  const callsWithDate = salesProcesses.filter((sp) => !!sp.follow_up_date);
  const appeared = salesProcesses.filter(
    (sp) => sp.follow_up_result === true
  ).length;
  const appearanceRate = callsWithDate.length
    ? `${Math.round((appeared / callsWithDate.length) * 100)}%`
    : "—";

  const closed = salesProcesses.filter((sp) => sp.closed === true).length;
  const closingRate = callsWithDate.length
    ? `${Math.round((closed / callsWithDate.length) * 100)}%`
    : "—";

  const now = Date.now();
  const upcomingStages = stages.filter(
    (s) => s.date && new Date(s.date).getTime() > now
  ).length;
  const pendingCalls = salesProcesses.filter(
    (sp) => sp.follow_up_date && new Date(sp.follow_up_date).getTime() > now
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
          <CardHeader>Workshops</CardHeader>
          <StageCard />
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
                    <span>{`Vertrag #${c.id} - Client ${c.client_id}`}</span>
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
                    <span>{`Verkaufsprozess #${s.id} - ${s.stage}`}</span>
                    <Badge variant="outline">{s.follow_up_date ?? "—"}</Badge>
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
