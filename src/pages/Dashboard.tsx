import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Calendar,
  Phone,
  FileText,
  Target,
  BarChart3,
  Plus
} from "lucide-react";

// Mock data - aligned with actual application data
const mockData = {
  totalRevenue: "€6,050",        // Max (3,200) + Thomas (2,850)
  totalClients: 5,               // Actual number of clients
  appearanceRate: "75%",         // 3 out of 4 who had calls appeared
  closingRate: "50%",           // 2 out of 4 who had calls closed
  avgDealValue: "€3,025",       // (3,200 + 2,850) / 2
  upcomingStages: 2,            // Munich & Berlin upcoming
  pendingCalls: 1,              // Only Anna Schmidt has planned call
  activeContracts: 2            // Max & Thomas
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Geschäftsübersicht und wichtige Kennzahlen</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Gesamtumsatz"
          value={mockData.totalRevenue}
          change="+12% vom letzten Monat"
          changeType="positive"
          icon={DollarSign}
          description="Gesamtumsatz aller Zeiten"
        />
        
        <KPICard
          title="Kunden Gesamt"
          value={mockData.totalClients}
          change="+1 neue diesen Monat"
          changeType="positive"
          icon={Users}
          description="Gesamte Einträge"
        />
        
        <KPICard
          title="Erscheinungsquote"
          value={mockData.appearanceRate}
          change="+2% vs letztem Monat"
          changeType="positive"
          icon={Target}
          description="Show-up Rate für Gespräche"
        />
        
        <KPICard
          title="Abschlussquote"
          value={mockData.closingRate}
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
          value={3}
          change="+1 diese Woche"
          changeType="positive"
          icon={Phone}
          description="Zweitgespräche durchgeführt"
        />
        
        <KPICard
          title="Kommende Bühnen"
          value={mockData.upcomingStages}
          description="Events diesen Monat"
          icon={Calendar}
        />
        
        <KPICard
          title="Ausstehende Gespräche"
          value={mockData.pendingCalls}
          description="Zweitgespräch geplant"
          icon={Phone}
        />
        
        <KPICard
          title="Aktive Verträge"
          value={mockData.activeContracts}
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
              <div className="text-sm text-muted-foreground">Neueste Kundeninteraktionen</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-accent/30 rounded">
                  <span>Max Mustermann - Vertrag unterschrieben</span>
                  <Badge className="bg-success text-success-foreground">€3,200</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-accent/30 rounded">
                  <span>Anna Schmidt - Gespräch geplant</span>
                  <Badge variant="outline">Feb 20</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}