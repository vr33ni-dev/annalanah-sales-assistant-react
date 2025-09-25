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

// Mock data - replace with real data from your backend
const mockData = {
  totalRevenue: "€45,231",
  totalClients: 127,
  appearanceRate: "73%",
  closingRate: "42%",
  avgDealValue: "€2,850",
  upcomingStages: 3,
  pendingCalls: 8,
  activeContracts: 23
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Business overview and key metrics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={mockData.totalRevenue}
          change="+12% from last month"
          changeType="positive"
          icon={DollarSign}
          description="All-time revenue"
        />
        
        <KPICard
          title="Total Clients"
          value={mockData.totalClients}
          change="+5 new this month"
          changeType="positive"
          icon={Users}
          description="Active client base"
        />
        
        <KPICard
          title="Erscheinungsquote"
          value={mockData.appearanceRate}
          change="+3% vs last month"
          changeType="positive"
          icon={Target}
          description="Show-up rate for calls"
        />
        
        <KPICard
          title="Abschlussquote"
          value={mockData.closingRate}
          change="-2% vs last month"
          changeType="negative"
          icon={TrendingUp}
          description="Deal closing rate"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Avg Deal Value"
          value={mockData.avgDealValue}
          change="+€150 vs last month"
          changeType="positive"
          icon={DollarSign}
        />
        
        <KPICard
          title="Upcoming Stages"
          value={mockData.upcomingStages}
          description="Events this month"
          icon={Calendar}
        />
        
        <KPICard
          title="Pending Calls"
          value={mockData.pendingCalls}
          description="Zweitgespräch scheduled"
          icon={Phone}
        />
        
        <KPICard
          title="Active Contracts"
          value={mockData.activeContracts}
          description="Generating revenue"
          icon={FileText}
        />
      </div>

      {/* Dashboard Header with ROI per Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ROI per Stage
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
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Latest client interactions</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-accent/30 rounded">
                  <span>Max Mustermann - Contract signed</span>
                  <Badge className="bg-success text-success-foreground">€3,200</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-accent/30 rounded">
                  <span>Anna Schmidt - Call scheduled</span>
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