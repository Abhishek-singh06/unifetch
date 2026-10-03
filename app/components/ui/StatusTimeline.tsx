import { Check } from "lucide-react";

type StageStatus = "done" | "active" | "pending";

interface Stage {
  label: string;
  status: StageStatus;
}

function getStages(taskStatus: string): Stage[] {
  const statuses = [
    "OPEN",
    "NEGOTIATING",
    "AGREED",
    "PAYMENT_PENDING",
    "PAID",
    "IN PROGRESS",
    "COMPLETED",
  ];

  const labels = [
    "Requested",
    "Accepted",
    "Reward Agreed",
    "Payment Details Shared",
    "Paid",
    "In Progress",
    "Completed",
  ];

  const currentIndex = statuses.indexOf(taskStatus.toUpperCase());

  return labels.map((label, idx) => {
    let status: StageStatus;
    if (currentIndex === -1) {
      status = idx === 0 ? "active" : "pending";
    } else if (idx < currentIndex) {
      status = "done";
    } else if (idx === currentIndex) {
      status = "active";
    } else {
      status = "pending";
    }
    return { label, status };
  });
}

export function StatusTimeline({ taskStatus }: { taskStatus: string }) {
  const stages = getStages(taskStatus);

  return (
    <div className="space-y-1.5">
      {stages.map((stage, idx) => (
        <div key={stage.label} className="flex items-center gap-3">
          <div className="flex flex-col items-center shrink-0 w-5">
            {idx > 0 && (
              <div
                className={`w-[2px] h-3 -mt-1.5 mb-0.5 rounded-full ${
                  stages[idx - 1].status === "done"
                    ? "bg-[#10b981]"
                    : "bg-[rgba(255,255,255,0.08)]"
                }`}
              />
            )}
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all duration-200 ${
                stage.status === "done"
                  ? "bg-[#10b981] border-[#10b981]"
                  : stage.status === "active"
                  ? "bg-[#10b981]/20 border-[#10b981] animate-pulse"
                  : "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)]"
              }`}
            >
              {stage.status === "done" && (
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              )}
              {stage.status === "active" && (
                <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              )}
            </div>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              stage.status === "done"
                ? "text-[#10b981]"
                : stage.status === "active"
                ? "text-white"
                : "text-[rgba(255,255,255,0.25)]"
            }`}
          >
            {stage.label}
            {stage.status === "active" && (
              <span className="ml-2 text-[8px] text-[#10b981] font-extrabold">
                -
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
