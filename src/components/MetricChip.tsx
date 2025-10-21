// src/components/MetricChip.tsx
import * as React from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Size = "md" | "lg";

type MetricChipProps = {
  icon: React.ReactNode;
  /** e.g. "bg-success/10 text-success" */
  iconBg?: string;
  /** Big number/value line (e.g. "€12,340") */
  value: React.ReactNode;
  /** Label under the value */
  label: string;
  /** Optional popover text. If omitted, label is plain text */
  popover?: string;
  /** Extra classes for the outer chip */
  className?: string;
  /** Chip size */
  size?: Size;
};

const sizeStyles: Record<
  Size,
  { chip: string; basis: string; iconBox: string; value: string; label: string }
> = {
  md: {
    chip: "h-14 px-3 py-2",
    basis: "basis-[240px]",
    iconBox: "w-7 h-7",
    value: "text-base",
    label: "text-[11px]",
  },
  lg: {
    chip: "h-16 px-4 py-3",
    basis: "basis-[280px]",
    iconBox: "w-9 h-9",
    value: "text-lg",
    label: "text-xs",
  },
};

/**
 * Uniform metric chip that wraps nicely in a flex row.
 * Default size is `lg` for a bit more presence.
 */
export function MetricChip({
  icon,
  iconBg = "bg-muted/50 text-foreground",
  value,
  label,
  popover,
  className = "",
  size = "lg",
}: MetricChipProps) {
  const sz = sizeStyles[size];

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-lg border",
        sz.chip,
        `${sz.basis} grow sm:grow-0`, // wrap nicely & keep comparable width
        className,
      ].join(" ")}
    >
      <div
        className={`${sz.iconBox} rounded-md flex items-center justify-center shrink-0 ${iconBg}`}
      >
        {icon}
      </div>

      <div className="min-w-0 leading-tight">
        <div className={`${sz.value} font-semibold truncate`}>{value}</div>

        {popover ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`${sz.label} text-muted-foreground cursor-pointer inline-flex items-center gap-1`}
                title={label}
              >
                <span className="truncate">{label}</span>
                <Info className="w-3.5 h-3.5 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="whitespace-pre-line text-xs max-w-xs">
              {popover}
            </PopoverContent>
          </Popover>
        ) : (
          <div className={`${sz.label} text-muted-foreground truncate`}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
