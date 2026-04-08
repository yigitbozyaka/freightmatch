import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createLoad } from "@/services/load-endpoints";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CARGO_TYPES = [
  "Electronics",
  "Furniture",
  "Food & Perishable",
  "Machinery",
  "Chemicals",
  "Textiles",
  "Automotive Parts",
  "Construction Materials",
  "Other",
];

export default function CreateLoad() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    origin: "",
    destination: "",
    cargoType: "",
    weightKg: "",
    deadlineHours: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createLoad({
        ...form,
        weightKg: Number(form.weightKg),
        deadlineHours: Number(form.deadlineHours),
      });
      toast.success("Load created successfully!");
      navigate("/my-loads");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create load.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Create Load</h1>
        <p className="text-slate-400 mt-1">Post a new freight load for carriers to bid on.</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Load Details</CardTitle>
          <CardDescription className="text-slate-400">
            Fill in the cargo information below. The load will start as a Draft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Electronics shipment to LA"
                required
                className="bg-slate-950 border-slate-800"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origin</Label>
                <Input
                  placeholder="e.g. New York, NY"
                  required
                  className="bg-slate-950 border-slate-800"
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input
                  placeholder="e.g. Los Angeles, CA"
                  required
                  className="bg-slate-950 border-slate-800"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cargo Type</Label>
              <Select
                value={form.cargoType}
                onValueChange={(val) => setForm({ ...form, cargoType: val })}
                required
              >
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Select cargo type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {CARGO_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  required
                  min={1}
                  className="bg-slate-950 border-slate-800"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline (hours)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 48"
                  required
                  min={1}
                  className="bg-slate-950 border-slate-800"
                  value={form.deadlineHours}
                  onChange={(e) => setForm({ ...form, deadlineHours: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
              >
                {loading ? "Creating..." : "Create Load"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/my-loads")}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
