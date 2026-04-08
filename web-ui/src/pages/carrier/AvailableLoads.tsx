import { useEffect, useState } from "react";
import { getAvailableLoads } from "@/services/load-endpoints";
import { createBid } from "@/services/bid-endpoints";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Load {
  _id: string;
  title: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  deadlineHours: number;
}

export default function AvailableLoads() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidTarget, setBidTarget] = useState<Load | null>(null);
  const [bidForm, setBidForm] = useState({ priceUSD: "", estimatedDeliveryHours: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchLoads = () => {
    getAvailableLoads()
      .then(setLoads)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLoads();
  }, []);

  const handleBid = async () => {
    if (!bidTarget) return;
    setSubmitting(true);
    try {
      await createBid({
        loadId: bidTarget._id,
        priceUSD: Number(bidForm.priceUSD),
        estimatedDeliveryHours: Number(bidForm.estimatedDeliveryHours),
      });
      toast.success("Bid placed successfully!");
      setBidTarget(null);
      setBidForm({ priceUSD: "", estimatedDeliveryHours: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to place bid.");
    } finally {
      setSubmitting(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-white tracking-tight">Available Loads</h1>
        <p className="text-slate-400 mt-1">Browse posted loads and place your bids.</p>
      </div>

      {loads.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg">No available loads right now.</p>
          <p className="text-sm mt-1">Check back later for new opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loads.map((load) => (
            <Card key={load._id} className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/30 transition-colors">
              <CardHeader>
                <CardTitle className="text-white text-lg">{load.title}</CardTitle>
                <CardDescription className="text-slate-400">
                  {load.origin} → {load.destination}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-slate-500">Cargo</p>
                    <p className="text-slate-200">{load.cargoType}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Weight</p>
                    <p className="text-slate-200">{load.weightKg.toLocaleString()} kg</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Deadline</p>
                    <p className="text-slate-200">{load.deadlineHours}h</p>
                  </div>
                </div>
                <Button
                  onClick={() => setBidTarget(load)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Place Bid
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bid Dialog */}
      <Dialog open={!!bidTarget} onOpenChange={() => setBidTarget(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle>Place a Bid</DialogTitle>
            <DialogDescription className="text-slate-400">
              {bidTarget?.title} — {bidTarget?.origin} → {bidTarget?.destination}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Your Price (USD)</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 2500"
                className="bg-slate-950 border-slate-800"
                value={bidForm.priceUSD}
                onChange={(e) => setBidForm({ ...bidForm, priceUSD: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Delivery (hours)</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 36"
                className="bg-slate-950 border-slate-800"
                value={bidForm.estimatedDeliveryHours}
                onChange={(e) => setBidForm({ ...bidForm, estimatedDeliveryHours: e.target.value })}
              />
            </div>
            <Button
              onClick={handleBid}
              disabled={submitting || !bidForm.priceUSD || !bidForm.estimatedDeliveryHours}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? "Submitting..." : "Submit Bid"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
