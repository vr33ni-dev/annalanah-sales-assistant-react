// stageCard.tsx
import { useQuery } from "@tanstack/react-query";
import { getStages, Stage, getNumericSetting } from "@/lib/api";
import { CardContent } from "@/components/ui/card";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { mockStages } from "@/lib/mockData";

type Row = {
  id: number;
  name: string;
  date?: string | null;
  ad_budget: number;
  registrations: number;
  participants: number;
  status: "done" | "pending" | "upcoming";
  roiPct?: number; // only when ad_budget > 0
};

function toStatus(s: Stage): Row["status"] {
  const d = s.date ? new Date(s.date) : null;
  const today = new Date();
  const inFuture = d ? d.getTime() > today.setHours(0, 0, 0, 0) : true;
  if (inFuture) return "upcoming";
  if ((s.participants ?? 0) > 0) return "done";
  return "pending";
}

export default function StageCard() {
  const { useMockData } = useAuthEnabled();
  
  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ["stages"],
    queryFn: getStages,
    staleTime: 60_000,
    enabled: !useMockData,
  });

  // Assumption: average revenue per participant (EUR/USD). Configure in /api/settings/avg_revenue_per_participant
  const { data: avgRev, isLoading: settingLoading } = useQuery({
    queryKey: ["avg_revenue_per_participant"],
    queryFn: () => getNumericSetting("avg_revenue_per_participant", 250),
    staleTime: 5 * 60_000,
    enabled: !useMockData,
  });

  const effectiveStages = useMockData ? mockStages : stages;
  const effectiveAvgRev = useMockData ? 250 : avgRev;
  const isLoading = useMockData ? false : (stagesLoading || settingLoading);

  if (isLoading)
    return <CardContent>Loading…</CardContent>;
  if (!effectiveStages?.length) return <CardContent>Keine Bühnen geplant.</CardContent>;

  const rows: Row[] = effectiveStages.map((s) => {
    const adBudget = Number(s.ad_budget ?? 0);
    const participants = Number(s.participants ?? 0);
    const status = toStatus(s);

    let roiPct: number | undefined;
    if (adBudget > 0 && effectiveAvgRev != null) {
      const revenue = participants * effectiveAvgRev;
      const roi = (revenue - adBudget) / adBudget; // e.g. 0.48 = +48%
      roiPct = Math.round(roi * 100);
    }

    return {
      id: s.id,
      name: s.name,
      date: s.date ?? undefined,
      ad_budget: adBudget,
      registrations: Number(s.registrations ?? 0),
      participants,
      status,
      roiPct,
    };
  });

  const chip = (row: Row) => {
    switch (row.status) {
      case "done":
        return (
          <span className="text-success font-bold">
            {row.roiPct != null
              ? row.roiPct >= 0
                ? `+${row.roiPct}% ROI`
                : `${row.roiPct}% ROI`
              : "Done"}
          </span>
        );
      case "pending":
        return <span className="text-warning font-bold">Pending</span>;
      default:
        return <span className="text-primary font-bold">Upcoming</span>;
    }
  };

  const rowClasses = (row: Row) =>
    `flex justify-between items-center p-3 rounded-lg ${
      row.status === "done"
        ? "bg-success/10"
        : row.status === "pending"
        ? "bg-warning/10"
        : "bg-primary/10"
    }`;

  return (
    <CardContent>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className={rowClasses(row)}
            title={row.date ? `Date: ${row.date}` : ""}
          >
            <span className="font-medium">{row.name}</span>
            {chip(row)}
          </div>
        ))}
      </div>
    </CardContent>
  );
}
