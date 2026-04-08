import { useEffect, useState } from "react";
import { getMyBids } from "@/services/bid-endpoints";
import { Badge } from "@/components/ui/badge";

interface Bid {
  _id: string;
  loadId: string;
  priceUSD: number;
  estimatedDeliveryHours: number;
  status: string;
  createdAt: string;
}

const BID_STATUS_COLORS: Record<string, string> = {
  Pending: "bg-slate-700 text-slate-300",
  Accepted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function MyBids() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyBids()
      .then(setBids)
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
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">My Bids</h1>
        <p className="text-slate-400 mt-1">Track all the bids you've placed on loads.</p>
      </div>

      {bids.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg">No bids placed yet.</p>
          <p className="text-sm mt-1">Browse available loads to start bidding.</p>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-800/60">
            {bids.map((bid) => (
              <div
                key={bid._id}
                className="p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-5">
                  <div className="h-11 w-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">
                    💰
                  </div>
                  <div>
                    <p className="text-white font-medium">${bid.priceUSD.toLocaleString()}</p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Est. delivery: {bid.estimatedDeliveryHours}h · Load: ...{bid.loadId.slice(-6)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className={BID_STATUS_COLORS[bid.status] || ""}>
                    {bid.status}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {new Date(bid.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
