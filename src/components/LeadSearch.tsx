import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, UserPlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Lead, getLeads } from "@/lib/api";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockLeads } from "@/lib/mockData";
import { asArray } from "@/lib/safe";
import { Badge } from "@/components/ui/badge";

interface LeadSearchProps {
  onSelectLead: (lead: Lead | null) => void;
  selectedLeadId?: number | null;
}

export function LeadSearch({ onSelectLead, selectedLeadId }: LeadSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { data: leads = [] } = useMockableQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: getLeads,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (d) => asArray<Lead>(d),
    mockData: mockLeads,
  });

  // Only show non-converted leads
  const availableLeads = useMemo(
    () => leads.filter((lead) => !lead.converted),
    [leads]
  );

  const selectedLead = useMemo(
    () => availableLeads.find((lead) => lead.id === selectedLeadId),
    [availableLeads, selectedLeadId]
  );

  const handleSelect = (lead: Lead) => {
    if (selectedLeadId === lead.id) {
      onSelectLead(null);
    } else {
      onSelectLead(lead);
    }
    setOpen(false);
  };

  const handleClear = () => {
    onSelectLead(null);
    setSearchValue("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between bg-background border-input hover:bg-accent"
            >
              {selectedLead ? (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  {selectedLead.name}
                  {selectedLead.email && (
                    <span className="text-muted-foreground text-xs">
                      ({selectedLead.email})
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Search className="w-4 h-4" />
                  Lead suchen...
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 bg-popover border shadow-md z-50" align="start">
            <Command>
              <CommandInput
                placeholder="Name oder Email eingeben..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>Kein Lead gefunden.</CommandEmpty>
                <CommandGroup heading="Verfügbare Leads">
                  {availableLeads.map((lead) => (
                    <CommandItem
                      key={lead.id}
                      value={`${lead.name} ${lead.email ?? ""}`}
                      onSelect={() => handleSelect(lead)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedLeadId === lead.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{lead.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {lead.source === "paid" ? "Paid" : "Organic"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {lead.email ?? "Keine Email"} • {lead.phone ?? "Kein Telefon"}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedLead && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Löschen
          </Button>
        )}
      </div>
      {selectedLead && (
        <p className="text-xs text-muted-foreground">
          Lead-Daten werden übernommen. Du kannst sie unten anpassen.
        </p>
      )}
      {!selectedLead && availableLeads.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {availableLeads.length} offene Leads verfügbar. Oder gib neue Daten ein.
        </p>
      )}
    </div>
  );
}
