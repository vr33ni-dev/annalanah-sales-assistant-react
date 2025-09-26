import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Calendar, 
  DollarSign,
  Users,
  Target,
  TrendingUp,
  MapPin
} from "lucide-react";

// Mock stages data - shows leads converted = people who became customers
const mockStages = [
  {
    id: 1,
    name: "Hamburg Workshop",
    date: "2024-01-15",
    budget: 500,
    registrations: 25,
    participants: 18,
    leads: 3,
    leadsConverted: 2,  // Max & Thomas came from this event
    revenue: 6050,      // Combined revenue from Max + Thomas
    status: "completed"
  },
  {
    id: 2,
    name: "Munich Seminar",
    date: "2024-02-22",
    budget: 750,
    registrations: 32,
    participants: 0,
    leads: 0,
    leadsConverted: 0,
    revenue: 0,
    status: "upcoming"
  },
  {
    id: 3,
    name: "Berlin Conference",
    date: "2024-03-05",
    budget: 1200,
    registrations: 45,
    participants: 0,
    leads: 0,
    leadsConverted: 0,
    revenue: 0,
    status: "upcoming"
  }
];

const statusColors = {
  completed: "bg-success text-success-foreground",
  upcoming: "bg-warning text-warning-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

export default function Stages() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStages = mockStages.filter(stage =>
    stage.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBudget = mockStages.reduce((sum, stage) => sum + stage.budget, 0);
  const totalRegistrations = mockStages.reduce((sum, stage) => sum + stage.registrations, 0);
  const totalParticipants = mockStages.reduce((sum, stage) => sum + stage.participants, 0);
  const totalRevenue = mockStages.reduce((sum, stage) => sum + stage.revenue, 0);
  const showUpRate = totalRegistrations > 0 ? Math.round((totalParticipants / totalRegistrations) * 100) : 0;
  const roi = totalBudget > 0 ? Math.round(((totalRevenue - totalBudget) / totalBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bühnen & Events</h1>
          <p className="text-muted-foreground">Marketing-Events verwalten und Performance verfolgen</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Bühne erstellen
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{totalBudget.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Gesamt Werbebudget</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRegistrations}</p>
                <p className="text-xs text-muted-foreground">Gesamt Anmeldungen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{showUpRate}%</p>
                <p className="text-xs text-muted-foreground">Erscheinungsquote</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roi > 0 ? '+' : ''}{roi}%</p>
                <p className="text-xs text-muted-foreground">ROI</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stages Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Event Management</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Bühnen suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bühne Name</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Anmeldungen</TableHead>
                <TableHead>Teilnehmer</TableHead>
                <TableHead>Leads generiert</TableHead>
                <TableHead>Kunden gewonnen</TableHead>
                <TableHead>Umsatz</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStages.map((stage) => (
                <TableRow key={stage.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {stage.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {stage.date}
                    </div>
                  </TableCell>
                  <TableCell>€{stage.budget.toLocaleString()}</TableCell>
                  <TableCell>{stage.registrations}</TableCell>
                  <TableCell>
                    {stage.participants > 0 ? stage.participants : "-"}
                  </TableCell>
                  <TableCell>
                    {stage.leads > 0 ? stage.leads : "-"}
                  </TableCell>
                  <TableCell>
                    {stage.leadsConverted > 0 ? stage.leadsConverted : "-"}
                  </TableCell>
                  <TableCell>
                    {stage.revenue > 0 ? `€${stage.revenue.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[stage.status as keyof typeof statusColors]}>
                      {stage.status === 'completed' ? 'Abgeschlossen' : stage.status === 'upcoming' ? 'Geplant' : stage.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Kosten pro Teilnehmer
          </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockStages.filter(s => s.participants > 0).map((stage) => {
                const costPerParticipant = Math.round(stage.budget / stage.participants);
                return (
                  <div key={stage.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                    <div>
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-sm text-muted-foreground">{stage.participants} Teilnehmer</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">€{costPerParticipant}</p>
                      <p className="text-xs text-muted-foreground">pro Teilnehmer</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Generierter Umsatz
          </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockStages.filter(s => s.revenue > 0).map((stage) => {
                const roiPercent = Math.round(((stage.revenue - stage.budget) / stage.budget) * 100);
                return (
                  <div key={stage.id} className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                    <div>
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-sm text-muted-foreground">{stage.leadsConverted} Kunden gewonnen</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">€{stage.revenue.toLocaleString()}</p>
                      <p className="text-xs text-success">+{roiPercent}% ROI</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}