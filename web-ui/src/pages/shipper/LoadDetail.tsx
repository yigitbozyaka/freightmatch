import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLoadById, updateLoadStatus, deleteLoad } from "@/services/load-endpoints";
import { getBidsByLoad, acceptBid } from "@/services/bid-endpoints";
import { getRecommendations } from "@/services/match-endpoints";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Load {
  _id: string;
  title: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  deadlineHours: number;
  status: string;
  createdAt: string;
}

interface Bid {
  _id: string;
  carrierId: string;
  priceUSD: number;
  estimatedDeliveryHours: number;
  status: string;
}

interface Recommendation {
  carrierId: string;
  score: number;
  reason: string;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-700 text-slate-300",
  Posted: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  Matched: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  InTransit: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function LoadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getLoadById(id).then(setLoad),
      getBidsByLoad(id).then(setBids).catch(() => setBids([])),
      getRecommendations(id)
        .then((data) => setRecommendations(data.recommendations || []))
        .catch(() => setRecommendations([])),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const updated = await updateLoadStatus(id, newStatus);
      setLoad(updated);
      toast.success(`Load status updated to ${newStatus}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status.");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteLoad(id);
      toast.success("Load deleted.");
      navigate("/my-loads");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete load.");
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    try {
      await acceptBid(bidId);
      toast.success("Bid accepted!");
      // Refresh data
      if (id) {
        const [updatedLoad, updatedBids] = await Promise.all([
          getLoadById(id),
          getBidsByLoad(id),
        ]);
        setLoad(updatedLoad);
        setBids(updatedBids);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept bid.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!load) {
    return <p className="text-slate-400 text-center py-20">Load not found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{load.title}</h1>
          <p className="text-slate-400 mt-1">
            {load.origin} → {load.destination}
          </p>
        </div>
        <Badge variant="outline" className={`text-sm px-3 py-1 ${STATUS_COLORS[load.status] || ""}`}>
          {load.status}
        </Badge>
      </div>

      {/* Load Info */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Cargo Type</p>
              <p className="text-white mt-1">{load.cargoType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Weight</p>
              <p className="text-white mt-1">{load.weightKg.toLocaleString()} kg</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Deadline</p>
              <p className="text-white mt-1">{load.deadlineHours} hours</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Created</p>
              <p className="text-white mt-1">{new Date(load.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <Separator className="my-6 bg-slate-800" />

          {/* Status actions */}
          <div className="flex gap-3">
            {load.status === "Draft" && (
              <>
                <Button
                  onClick={() => handleStatusChange("Posted")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  🚀 Post Load
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Delete
                </Button>
              </>
            )}
            {load.status === "InTransit" && (
              <Button
                onClick={() => handleStatusChange("Delivered")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                ✅ Mark Delivered
              </Button>
            )}
            {["Draft", "Posted", "Matched"].includes(load.status) && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange("Cancelled")}
                className="border-slate-700 text-slate-400 hover:bg-slate-800"
              >
                Cancel Load
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bids + AI Recommendations side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bids */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              💰 Bids <span className="text-sm font-normal text-slate-400">({bids.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bids.length === 0 ? (
              <p className="text-slate-500 text-sm">No bids yet.</p>
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => (
                  <div
                    key={bid._id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-medium">${bid.priceUSD.toLocaleString()}</p>
                      <p className="text-sm text-slate-400">
                        Est. {bid.estimatedDeliveryHours}h · Carrier: {bid.carrierId.slice(-6)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          bid.status === "Accepted"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : bid.status === "Rejected"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-slate-700 text-slate-300"
                        }
                      >
                        {bid.status}
                      </Badge>
                      {bid.status === "Pending" && load.status === "Posted" && (
                        <Button
                          size="sm"
                          onClick={() => handleAcceptBid(bid._id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        >
                          Accept
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              🤖 AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No recommendations yet. Post the load to trigger AI matching.
              </p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div
                    key={rec.carrierId}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">
                        #{i + 1} · Carrier {rec.carrierId.slice(-6)}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                      >
                        Score: {rec.score}/100
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400">{rec.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
