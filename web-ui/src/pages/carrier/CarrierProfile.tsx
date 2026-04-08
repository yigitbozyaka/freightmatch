import { useEffect, useState } from "react";
import { getUserProfile, updateCarrierProfile } from "@/services/user-endpoints";
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

const TRUCK_TYPES = ["flatbed", "refrigerated", "dry-van", "tanker"];

export default function CarrierProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [form, setForm] = useState({
    truckType: "",
    capacityKg: "",
    homeCity: "",
  });

  useEffect(() => {
    getUserProfile()
      .then((data) => {
        if (data.carrierProfile) {
          setHasProfile(true);
          setForm({
            truckType: data.carrierProfile.truckType || "",
            capacityKg: String(data.carrierProfile.capacityKg || ""),
            homeCity: data.carrierProfile.homeCity || "",
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCarrierProfile({
        truckType: form.truckType,
        capacityKg: Number(form.capacityKg),
        homeCity: form.homeCity,
      });
      setHasProfile(true);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Carrier Profile</h1>
        <p className="text-slate-400 mt-1">
          {hasProfile
            ? "Update your truck type, capacity, and home city."
            : "Set up your carrier profile to start receiving matches."}
        </p>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Vehicle & Location</CardTitle>
          <CardDescription className="text-slate-400">
            This info is used by our AI matching engine to recommend you for relevant loads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Truck Type</Label>
              <Select
                value={form.truckType}
                onValueChange={(val) => setForm({ ...form, truckType: val })}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Select truck type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {TRUCK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Capacity (kg)</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 20000"
                required
                className="bg-slate-950 border-slate-800"
                value={form.capacityKg}
                onChange={(e) => setForm({ ...form, capacityKg: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Home City</Label>
              <Input
                placeholder="e.g. Chicago, IL"
                required
                className="bg-slate-950 border-slate-800"
                value={form.homeCity}
                onChange={(e) => setForm({ ...form, homeCity: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
            >
              {saving ? "Saving..." : hasProfile ? "Update Profile" : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
