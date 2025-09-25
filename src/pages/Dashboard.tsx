import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { Button } from "@/components/ui/button";
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

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-success-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Contract signed</p>
                  <p className="text-xs text-muted-foreground">Max Mustermann - €3,200</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Phone className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Zweitgespräch completed</p>
                  <p className="text-xs text-muted-foreground">Anna Schmidt - Interested</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-warning flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-warning-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Stage event created</p>
                  <p className="text-xs text-muted-foreground">Hamburg Workshop - €500 budget</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-16 flex flex-col gap-1">
                <Users className="w-5 h-5" />
                <span className="text-xs">Add Client</span>
              </Button>
              
              <Button variant="outline" className="h-16 flex flex-col gap-1">
                <Phone className="w-5 h-5" />
                <span className="text-xs">Log Call</span>
              </Button>
              
              <Button variant="outline" className="h-16 flex flex-col gap-1">
                <Calendar className="w-5 h-5" />
                <span className="text-xs">New Stage</span>
              </Button>
              
              <Button variant="outline" className="h-16 flex flex-col gap-1">
                <DollarSign className="w-5 h-5" />
                <span className="text-xs">Add Revenue</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}