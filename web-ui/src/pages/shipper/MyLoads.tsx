import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyLoads } from "@/services/load-endpoints";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Load {
  _id: string;
  title: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-700 text-slate-300",
  Posted: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  Matched: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  InTransit: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function MyLoads() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyLoads()
      .then(setLoads)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">My Loads</h1>
          <p className="text-slate-400 mt-1">View and manage all the loads you've created.</p>
        </div>
        <Link to="/create-load">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
            + New Load
          </Button>
        </Link>
      </div>

      {loads.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg">No loads yet.</p>
          <p className="text-sm mt-1">Create your first load to get started.</p>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-800/60">
            {loads.map((load) => (
              <Link
                key={load._id}
                to={`/loads/${load._id}`}
                className="p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors group block"
              >
                <div className="flex items-center gap-5">
                  <div className="h-11 w-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg group-hover:border-indigo-500/50 transition-colors">
                    📦
                  </div>
                  <div>
                    <h3 className="text-white font-medium group-hover:text-indigo-300 transition-colors">
                      {load.title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {load.origin} → {load.destination} · {load.cargoType} · {load.weightKg.toLocaleString()} kg
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className={STATUS_COLORS[load.status] || ""}>
                    {load.status}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {new Date(load.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
