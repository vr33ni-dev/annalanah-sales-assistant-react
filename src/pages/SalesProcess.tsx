import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Phone, 
  Calendar as CalendarIcon, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  CalendarPlus,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Mock pipeline data
const salesProcessEntries = [
  {
    id: 1,
    name: "Max Mustermann",
    phone: "+49 123 456789",
    email: "max@example.com",
    stage: "Zweitgespräch",
    zweitgespraechDate: "2024-01-20",
    source: "bezahlt",
    linkedStage: "Hamburg Workshop",
    zweitgespraechResult: true,
    abschluss: null,
    revenue: null,
    contractDetails: null
  },
  {
    id: 2,
    name: "Anna Schmidt",
    phone: "+49 987 654321", 
    email: "anna@example.com",
    stage: "Geplant",
    zweitgespraechDate: "2024-01-25",
    source: "organisch",
    linkedStage: null,
    zweitgespraechResult: null,
    abschluss: null,
    revenue: null,
    contractDetails: null
  },
  {
    id: 3,
    name: "Thomas Weber",
    phone: "+49 555 123456",
    email: "thomas@example.com", 
    stage: "Abgeschlossen",
    zweitgespraechDate: "2024-01-10",
    source: "bezahlt",
    linkedStage: "Berlin Conference",
    zweitgespraechResult: true,
    abschluss: true,
    revenue: 2850,
    contractDetails: {
      duration: "12 Monate",
      startDate: "2024-01-15",
      frequency: "monatlich"
    }
  }
];

const stages = [
  "Hamburg Workshop",
  "Munich Seminar", 
  "Berlin Conference",
  "Frankfurt Event",
  "Cologne Meeting"
];

export default function SalesProcess() {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(1); // 1: Geplant, 2: Ergebnis, 3: Abschluss
  const [date, setDate] = useState();
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    zweitgespraechDate: null,
    source: "",
    linkedStage: "",
    zweitgespraechResult: null,
    abschluss: null,
    revenue: "",
    duration: "",
    startDate: null,
    frequency: ""
  });

  const getStageColor = (stage) => {
    switch (stage) {
      case "Geplant":
        return "bg-warning text-warning-foreground";
      case "Zweitgespräch":
        return "bg-primary text-primary-foreground";
      case "Abgeschlossen":
        return "bg-success text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleFormSubmit = () => {
    // This would integrate with your backend
    console.log("Form submitted:", formData);
    setShowForm(false);
    setFormStep(1);
    setFormData({
      name: "",
      zweitgespraechDate: null,
      source: "",
      linkedStage: "",
      zweitgespraechResult: null,
      abschluss: null,
      revenue: "",
      duration: "",
      startDate: null,
      frequency: ""
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Verkaufsprozess</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Verkaufspipeline und Aktivitäten</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => {
              setShowForm(true);
              setFormStep(1);
            }}
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Zweitgespräch planen
          </Button>
        </div>
      </div>

      {/* Workflow Form */}
      {showForm && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {formStep === 1 && "Schritt 1: Zweitgespräch planen"}
              {formStep === 2 && "Schritt 2: Zweitgespräch Ergebnis"}
              {formStep === 3 && "Schritt 3: Abschluss"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Zweitgespräch geplant */}
            {formStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (Vor- und Nachname)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Max Mustermann"
                    className="bg-success/5 border-success/30 focus:border-success"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Datum des Zweitgesprächs</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-success/5 border-success/30 focus:border-success",
                          !formData.zweitgespraechDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.zweitgespraechDate ? (
                          format(formData.zweitgespraechDate, "PPP", { locale: de })
                        ) : (
                          <span>Datum auswählen</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.zweitgespraechDate}
                        onSelect={(date) => setFormData({...formData, zweitgespraechDate: date})}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Quelle</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({...formData, source: value})}>
                    <SelectTrigger className="bg-success/5 border-success/30 focus:border-success">
                      <SelectValue placeholder="Quelle auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organisch">Organisch</SelectItem>
                      <SelectItem value="bezahlt">Bezahlt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.source === "bezahlt" && (
                  <div className="space-y-2">
                    <Label>Bühne auswählen</Label>
                    <Select value={formData.linkedStage} onValueChange={(value) => setFormData({...formData, linkedStage: value})}>
                      <SelectTrigger className="bg-success/5 border-success/30 focus:border-success">
                        <SelectValue placeholder="Bühne auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="col-span-full flex gap-3">
                  <Button onClick={() => setFormStep(2)} disabled={!formData.name || !formData.zweitgespraechDate || !formData.source}>
                    Weiter zu Ergebnis
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Zweitgespräch Ergebnis */}
            {formStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2">Kunde: {formData.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Zweitgespräch am: {formData.zweitgespraechDate && format(formData.zweitgespraechDate, "PPP", { locale: de })}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Ist der Kunde erschienen?</Label>
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={formData.zweitgespraechResult === true}
                      onCheckedChange={(checked) => setFormData({...formData, zweitgespraechResult: checked})}
                    />
                    <span className="text-sm">
                      {formData.zweitgespraechResult === true ? "Ja, erschienen" : 
                       formData.zweitgespraechResult === false ? "Nein, nicht erschienen" : "Bitte auswählen"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => setFormStep(1)} variant="outline">
                    Zurück
                  </Button>
                  <Button 
                    onClick={() => setFormStep(3)} 
                    disabled={formData.zweitgespraechResult === null}
                  >
                    Weiter zu Abschluss
                  </Button>
                  <Button variant="outline" onClick={handleFormSubmit}>
                    Speichern & Beenden
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Abschluss */}
            {formStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2">Kunde: {formData.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Erschienen: {formData.zweitgespraechResult ? "Ja" : "Nein"}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Abschluss erfolgreich?</Label>
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={formData.abschluss === true}
                      onCheckedChange={(checked) => setFormData({...formData, abschluss: checked})}
                    />
                    <span className="text-sm">
                      {formData.abschluss === true ? "Ja, Vertrag abgeschlossen" : 
                       formData.abschluss === false ? "Nein, kein Abschluss" : "Bitte auswählen"}
                    </span>
                  </div>
                </div>

                {formData.abschluss && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-success/10 rounded-lg">
                    <div className="space-y-2">
                      <Label>Umsatz (€)</Label>
                      <Input
                        type="number"
                        value={formData.revenue}
                        onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                        placeholder="2850"
                        className="bg-success/5 border-success/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Vertragsdauer</Label>
                      <Select value={formData.duration} onValueChange={(value) => setFormData({...formData, duration: value})}>
                        <SelectTrigger className="bg-success/5 border-success/30">
                          <SelectValue placeholder="Dauer auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3 Monate">3 Monate</SelectItem>
                          <SelectItem value="6 Monate">6 Monate</SelectItem>
                          <SelectItem value="12 Monate">12 Monate</SelectItem>
                          <SelectItem value="24 Monate">24 Monate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Startdatum</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-success/5 border-success/30",
                              !formData.startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.startDate ? (
                              format(formData.startDate, "PPP", { locale: de })
                            ) : (
                              <span>Startdatum auswählen</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.startDate}
                            onSelect={(date) => setFormData({...formData, startDate: date})}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Zahlungsfrequenz</Label>
                      <Select value={formData.frequency} onValueChange={(value) => setFormData({...formData, frequency: value})}>
                        <SelectTrigger className="bg-success/5 border-success/30">
                          <SelectValue placeholder="Frequenz auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monatlich">Monatlich</SelectItem>
                          <SelectItem value="quartalsweise">Quartalsweise</SelectItem>
                          <SelectItem value="halbjährlich">Halbjährlich</SelectItem>
                          <SelectItem value="jährlich">Jährlich</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={() => setFormStep(2)} variant="outline">
                    Zurück
                  </Button>
                  <Button onClick={handleFormSubmit}>
                    Speichern & Abschließen
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sales Process Pipeline Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Verkaufspipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kunde</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zweitgespräch Datum</TableHead>
                <TableHead>Ergebnis</TableHead>
                <TableHead>Quelle</TableHead>
                <TableHead>Verknüpfte Bühne</TableHead>
                <TableHead>Umsatz</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesProcessEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{entry.name}</div>
                      <div className="text-xs text-muted-foreground">{entry.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStageColor(entry.stage)}>
                      {entry.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      {entry.zweitgespraechDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.zweitgespraechResult === true && (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Erschienen
                      </Badge>
                    )}
                    {entry.zweitgespraechResult === false && (
                      <Badge className="bg-destructive text-destructive-foreground">
                        <XCircle className="w-3 h-3 mr-1" />
                        Nicht erschienen
                      </Badge>
                    )}
                    {entry.zweitgespraechResult === null && (
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        Ausstehend
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.source === "bezahlt" ? "default" : "secondary"}>
                      {entry.source === "bezahlt" ? "Bezahlt" : "Organisch"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.linkedStage ? (
                      <Badge variant="outline">{entry.linkedStage}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.revenue ? (
                      <span className="font-medium text-success">€{entry.revenue.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {entry.stage === "Geplant" && (
                        <Button size="sm" variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          Ergebnis eingeben
                        </Button>
                      )}
                      {entry.stage === "Zweitgespräch" && (
                        <Button size="sm" variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          Abschluss eingeben
                        </Button>
                      )}
                      {entry.stage === "Abgeschlossen" && (
                        <Button size="sm" variant="outline" className="bg-success/10 text-success border-success/20">
                          Vertrag anzeigen
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Pipeline Wert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">€45,900</div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{width: '75%'}}></div>
                </div>
                <span className="text-muted-foreground">75% zum Ziel</span>
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
                <span className="text-muted-foreground">+3% vs letztem Monat</span>
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
                <span className="text-muted-foreground">-2% vs letztem Monat</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}