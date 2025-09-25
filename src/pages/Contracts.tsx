import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  DollarSign, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Users
} from "lucide-react";

// Mock contracts data
const mockContracts = [
  {
    id: 1,
    client: "Max Mustermann",
    startDate: "2024-01-15",
    duration: 12,
    totalValue: 3200,
    frequency: "monthly",
    monthlyAmount: 267,
    status: "active",
    nextPayment: "2024-02-15",
    paidMonths: 1
  },
  {
    id: 2,
    client: "Thomas Weber",
    startDate: "2024-01-10",
    duration: 6,
    totalValue: 2850,
    frequency: "monthly",
    monthlyAmount: 475,
    status: "active",
    nextPayment: "2024-02-10",
    paidMonths: 1
  },
  {
    id: 3,
    client: "Sarah Schmidt",
    startDate: "2023-12-01",
    duration: 24,
    totalValue: 4800,
    frequency: "monthly",
    monthlyAmount: 200,
    status: "overdue",
    nextPayment: "2024-01-01",
    paidMonths: 2
  }
];

// Mock cashflow forecast data
const cashflowForecast = [
  { month: "Feb 2024", expected: 942, confirmed: 742, potential: 200 },
  { month: "Mar 2024", expected: 942, confirmed: 942, potential: 0 },
  { month: "Apr 2024", expected: 1142, confirmed: 942, potential: 200 },
  { month: "May 2024", expected: 1142, confirmed: 942, potential: 200 },
  { month: "Jun 2024", expected: 1142, confirmed: 942, potential: 200 },
];

const statusColors = {
  active: "bg-success text-success-foreground",
  pending: "bg-warning text-warning-foreground",
  overdue: "bg-destructive text-destructive-foreground",
  completed: "bg-muted text-muted-foreground"
};

export default function Contracts() {
  const totalRevenue = mockContracts.reduce((sum, contract) => sum + contract.totalValue, 0);
  const monthlyRecurring = mockContracts.filter(c => c.status === 'active').reduce((sum, contract) => sum + contract.monthlyAmount, 0);
  const activeContracts = mockContracts.filter(c => c.status === 'active').length;
  const avgContractValue = totalRevenue / mockContracts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contracts & Cashflow</h1>
          <p className="text-muted-foreground">Track contracts and revenue forecasting</p>
        </div>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Contract Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{monthlyRecurring.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Monthly Recurring</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeContracts}</p>
                <p className="text-xs text-muted-foreground">Active Contracts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{Math.round(avgContractValue).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Avg Contract Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Active Contracts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Monthly Amount</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Next Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockContracts.map((contract) => {
                const progressPercent = (contract.paidMonths / contract.duration) * 100;
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.client}</TableCell>
                    <TableCell>{contract.startDate}</TableCell>
                    <TableCell>{contract.duration} months</TableCell>
                    <TableCell>€{contract.totalValue.toLocaleString()}</TableCell>
                    <TableCell>€{contract.monthlyAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={progressPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {contract.paidMonths}/{contract.duration} months
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {contract.nextPayment}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[contract.status as keyof typeof statusColors]}>
                        {contract.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cashflow Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Cashflow Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cashflowForecast.map((month, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{month.month}</span>
                    <span className="font-bold">€{month.expected.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-success">Confirmed</span>
                      <span>€{month.confirmed.toLocaleString()}</span>
                    </div>
                    {month.potential > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-warning">Potential</span>
                        <span>€{month.potential.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <Progress value={(month.confirmed / month.expected) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                <CheckCircle className="w-8 h-8 text-success" />
                <div className="flex-1">
                  <p className="font-medium">On Track</p>
                  <p className="text-sm text-muted-foreground">
                    {mockContracts.filter(c => c.status === 'active').length} contracts paying on time
                  </p>
                </div>
                <p className="font-bold text-success">€{monthlyRecurring.toLocaleString()}</p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-8 h-8 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium">Overdue</p>
                  <p className="text-sm text-muted-foreground">
                    {mockContracts.filter(c => c.status === 'overdue').length} contracts require attention
                  </p>
                </div>
                <p className="font-bold text-destructive">€200</p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
                <Clock className="w-8 h-8 text-warning" />
                <div className="flex-1">
                  <p className="font-medium">Due Soon</p>
                  <p className="text-sm text-muted-foreground">
                    2 payments due in next 7 days
                  </p>
                </div>
                <p className="font-bold text-warning">€742</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}