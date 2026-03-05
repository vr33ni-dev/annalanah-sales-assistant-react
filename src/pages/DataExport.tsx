import { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import {
  getAggregatedCashflowExportUrl,
  getRawExportUrl,
  type RawExportTable,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";

function triggerDownload(url: string, filename?: string) {
  const link = document.createElement("a");
  link.href = url;
  if (filename) link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function filenameFromContentDisposition(
  value: string | null,
): string | undefined {
  if (!value) return undefined;
  const quoted = value.match(/filename="([^"]+)"/i)?.[1];
  if (quoted) return quoted;
  const plain = value.match(/filename=([^;]+)/i)?.[1]?.trim();
  return plain;
}

const rawButtons: { table: RawExportTable; label: string }[] = [
  { table: "clients", label: "Kunden (raw)" },
  { table: "contracts", label: "Verträge (raw)" },
  { table: "cashflow_entries", label: "Cashflow Einträge (raw)" },
];

export default function DataExport() {
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");

  const invalidRange = useMemo(() => {
    if (!fromMonth || !toMonth) return false;
    return fromMonth > toMonth;
  }, [fromMonth, toMonth]);

  const downloadCsv = async (url: string, label: string) => {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const filename = filenameFromContentDisposition(
        res.headers.get("content-disposition"),
      );

      triggerDownload(objectUrl, filename);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

      toast({
        title: "Export gestartet",
        description: `${label} wird heruntergeladen.`,
      });
    } catch (error) {
      toast({
        title: "Export fehlgeschlagen",
        description:
          error instanceof Error
            ? error.message
            : "Die Datei konnte nicht heruntergeladen werden.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Data Export</h1>
      </div>

      <Tabs defaultValue="raw" className="w-full">
        <TabsList>
          <TabsTrigger value="raw">Rohdaten-Tabellen</TabsTrigger>
          <TabsTrigger value="report">Aggregierter Bericht</TabsTrigger>
        </TabsList>

        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Rohdaten-Tabellen</CardTitle>
              <CardDescription>
                Exportiere einzelne Rohdaten-Tabellen als CSV.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rawButtons.map((item) => (
                <Button
                  key={item.table}
                  variant="outline"
                  className="justify-start"
                  onClick={() =>
                    downloadCsv(getRawExportUrl(item.table), item.label)
                  }
                >
                  <Download className="w-4 h-4" />
                  {item.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>Aggregierter Cashflow-Report</CardTitle>
              <CardDescription>
                Exportiere den aggregierten Cashflow-Report als CSV. Der
                Zeitraum-Filter ist optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="export-from-month">Von (YYYY-MM)</Label>
                  <Input
                    id="export-from-month"
                    type="month"
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-to-month">Bis (YYYY-MM)</Label>
                  <Input
                    id="export-to-month"
                    type="month"
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                  />
                </div>
              </div>

              {invalidRange && (
                <p className="text-sm text-destructive">
                  Der "To"-Monat muss größer oder gleich "From" sein.
                </p>
              )}

              <Button
                onClick={() => {
                  if (invalidRange) {
                    toast({
                      title: "Ungültiger Datumsbereich",
                      description:
                        'Der "To"-Monat muss größer oder gleich "From" sein.',
                      variant: "destructive",
                    });
                    return;
                  }

                  downloadCsv(
                    getAggregatedCashflowExportUrl(fromMonth, toMonth),
                    "Aggregated Cashflow Report",
                  );
                }}
                disabled={invalidRange}
              >
                <Download className="w-4 h-4" />
                Export Aggregated CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
