import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; // shadcn calendar

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
};

export function DateRangePicker({ value, onChange, className }: Props) {
  const displayed =
    value?.from && value?.to
      ? `${format(value.from, "dd.MM.yyyy")} – ${format(
          value.to,
          "dd.MM.yyyy"
        )}`
      : "Zeitraum wählen";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-start text-left font-normal ${className}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayed}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 min-w-[600px]"
        align="start"
        sideOffset={8}
      >
        <Calendar
          mode="range"
          numberOfMonths={2}
          showOutsideDays={false}
          selected={value}
          onSelect={(r) => onChange(r ?? { from: undefined, to: undefined })}
        />
      </PopoverContent>
    </Popover>
  );
}
