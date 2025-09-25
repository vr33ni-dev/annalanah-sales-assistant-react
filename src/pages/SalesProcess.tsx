import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Phone, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Plus
} from "lucide-react";

// Mock pipeline data
const pipelineStages = [
  {
    id: "leads",
    name: "New Leads",
    count: 15,
    value: 0,
    color: "bg-muted"
  },
  {
    id: "first-call",
    name: "First Call",
    count: 8,
    value: 22800,
    color: "bg-warning"
  },
  {
    id: "second-call", 
    name: "Zweitgespräch",
    count: 5,
    value: 14250,
    color: "bg-primary"
  },
  {
    id: "closed",
    name: "Abschluss",
    count: 3,
    value: 8550,
    color: "bg-success"
  }
];

const recentActivities = [
  {
    id: 1,
    client: "Max Mustermann",
    action: "Zweitgespräch completed",
    outcome: "Interested - sending proposal",
    date: "2024-01-15",
    type: "success"
  },
  {
    id: 2,
    client: "Anna Schmidt", 
    action: "First call scheduled",
    outcome: "Meeting set for Friday",
    date: "2024-01-14",
    type: "pending"
  },
  {
    id: 3,
    client: "Thomas Weber",
    action: "Contract signed",
    outcome: "€2,850 deal closed",
    date: "2024-01-13",
    type: "success"
  }
];

export default function SalesProcess() {
  const [selectedStage, setSelectedStage] = useState("second-call");

  const totalValue = pipelineStages.reduce((sum, stage) => sum + stage.value, 0);
  const totalDeals = pipelineStages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Process</h1>
          <p className="text-muted-foreground">Track your sales pipeline and activities</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Call
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Log Activity
          </Button>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {pipelineStages.map((stage) => (
          <Card 
            key={stage.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedStage === stage.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedStage(stage.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <span className="text-2xl font-bold">{stage.count}</span>
              </div>
              <h3 className="font-medium text-sm mb-1">{stage.name}</h3>
              <p className="text-xs text-muted-foreground">
                {stage.value > 0 ? `€${stage.value.toLocaleString()}` : 'No value yet'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">€{totalValue.toLocaleString()}</div>
              <div className="flex items-center gap-2 text-sm">
                <Progress value={75} className="flex-1" />
                <span className="text-muted-foreground">75% to goal</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Erscheinungsquote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">73%</div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-muted-foreground">+3% vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Abschlussquote  
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">42%</div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-muted-foreground">-2% vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Sales Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-4 bg-accent/30 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activity.type === 'success' ? 'bg-success text-success-foreground' :
                  activity.type === 'pending' ? 'bg-warning text-warning-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {activity.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                   activity.type === 'pending' ? <Clock className="w-5 h-5" /> :
                   <Phone className="w-5 h-5" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{activity.client}</h4>
                    <Badge variant="outline" className="text-xs">
                      {activity.date}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.action}</p>
                  <p className="text-sm font-medium">{activity.outcome}</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Calendar className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}