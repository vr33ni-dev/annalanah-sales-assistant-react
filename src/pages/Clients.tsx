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
  Plus, 
  Search, 
  Filter,
  Phone,
  Mail,
  Calendar,
  TrendingUp
} from "lucide-react";

// Mock client data
const mockClients = [
  {
    id: 1,
    name: "Max Mustermann",
    email: "max@example.com",
    phone: "+49 123 456789",
    source: "organic",
    stage: "zweitgespraech",
    lastContact: "2024-01-15",
    revenue: 3200,
    status: "active"
  },
  {
    id: 2,
    name: "Anna Schmidt",
    email: "anna@example.com", 
    phone: "+49 987 654321",
    source: "paid",
    stage: "erstgespraech",
    lastContact: "2024-01-14",
    revenue: 0,
    status: "prospect"
  },
  {
    id: 3,
    name: "Thomas Weber",
    email: "thomas@example.com",
    phone: "+49 555 123456",
    source: "organic",
    stage: "abschluss",
    lastContact: "2024-01-13",
    revenue: 2850,
    status: "client"
  }
];

const stageLabels = {
  erstgespraech: "First Call",
  zweitgespraech: "Second Call",
  abschluss: "Closed",
  verloren: "Lost"
};

const sourceLabels = {
  organic: "Organic",
  paid: "Paid Ads"
};

const statusColors = {
  active: "bg-success text-success-foreground",
  prospect: "bg-warning text-warning-foreground", 
  client: "bg-primary text-primary-foreground",
  lost: "bg-destructive text-destructive-foreground"
};

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">Manage your client database and relationships</p>
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
                <p className="text-2xl font-bold">127</p>
                <p className="text-xs text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">23</p>
                <p className="text-xs text-muted-foreground">Active Prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-xs text-muted-foreground">Calls This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Mail className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">73%</p>
                <p className="text-xs text-muted-foreground">Response Rate</p>
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
                    <Badge variant="secondary">Hamburg Workshop</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[client.status as keyof typeof statusColors]}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" title="View Sales Process">
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