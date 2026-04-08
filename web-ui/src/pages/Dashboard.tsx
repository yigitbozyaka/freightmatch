import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SHIPPER_ACTIONS = [
  {
    icon: "📦",
    title: "Post New Load",
    description: "Create a new freight load for carriers to bid on.",
    to: "/create-load",
  },
  {
    icon: "📋",
    title: "My Loads",
    description: "View and manage all your posted loads.",
    to: "/my-loads",
  },
];

const CARRIER_ACTIONS = [
  {
    icon: "🔍",
    title: "Browse Available Loads",
    description: "Discover posted loads and place your bids.",
    to: "/available-loads",
  },
  {
    icon: "💰",
    title: "My Bids",
    description: "Track the status of all your placed bids.",
    to: "/my-bids",
  },
  {
    icon: "🚛",
    title: "My Profile",
    description: "Update your truck type, capacity, and home city.",
    to: "/carrier-profile",
  },
];

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const actions = user?.role === "Shipper" ? SHIPPER_ACTIONS : CARRIER_ACTIONS;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="text-slate-400 mt-1">
          {user?.role === "Shipper"
            ? "Manage your freight loads and review incoming bids."
            : "Find loads, place bids, and manage your carrier profile."}
        </p>
      </div>

      <div className={`grid gap-6 ${actions.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
        {actions.map((action) => (
          <Link key={action.to} to={action.to} className="group">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900 transition-all duration-300 cursor-pointer h-full hover:shadow-[0_0_30px_rgba(99,102,241,0.08)]">
              <CardHeader className="flex flex-col items-center text-center py-12 px-8">
                <span className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {action.icon}
                </span>
                <CardTitle className="text-xl text-white group-hover:text-indigo-300 transition-colors">
                  {action.title}
                </CardTitle>
                <CardDescription className="text-slate-400 mt-2">
                  {action.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
