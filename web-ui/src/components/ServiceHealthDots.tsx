import { useEffect, useState } from "react";
import {
  checkAllServices,
  type ServiceHealth,
} from "@/services/health-endpoints";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ServiceHealthDots() {
  const [health, setHealth] = useState<ServiceHealth[]>([]);

  const fetchHealth = async () => {
    const results = await checkAllServices();
    setHealth(results);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getDotStyle = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-emerald-500 shadow-emerald-500/50";
      case "degraded":
        return "bg-amber-500 shadow-amber-500/50";
      case "unhealthy":
        return "bg-red-500 shadow-red-500/50";
      case "offline":
        return "bg-slate-500 animate-pulse";
      default:
        return "bg-slate-600 animate-pulse";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-emerald-400";
      case "degraded":
        return "text-amber-400";
      case "unhealthy":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
      {health.map((h) => (
        <Tooltip key={h.key}>
          <TooltipTrigger asChild>
            <div
              className={`h-2.5 w-2.5 rounded-full shadow-sm cursor-default transition-colors ${getDotStyle(h.status)}`}
            />
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-slate-800 border-slate-700 text-slate-200 max-w-xs"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-xs text-white">{h.label}</p>
                <span className={`text-[10px] font-medium uppercase ${getStatusLabel(h.status)}`}>
                  {h.status}
                </span>
              </div>
              {h.status !== "offline" && (
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <p>
                    DB:{" "}
                    <span className={h.checks.mongodb.status === "healthy" ? "text-emerald-400" : "text-red-400"}>
                      {h.checks.mongodb.message}
                    </span>
                  </p>
                  <p>
                    Memory:{" "}
                    <span
                      className={
                        h.checks.memory.status === "healthy"
                          ? "text-emerald-400"
                          : h.checks.memory.status === "degraded"
                            ? "text-amber-400"
                            : "text-red-400"
                      }
                    >
                      {h.checks.memory.message}
                    </span>
                  </p>
                  <p>Uptime: {formatUptime(h.uptime)} · v{h.version}</p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
