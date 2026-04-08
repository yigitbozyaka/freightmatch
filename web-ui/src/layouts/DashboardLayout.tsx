import { Outlet, Navigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import ServiceHealthDots from "@/components/ServiceHealthDots";

export default function DashboardLayout() {
  const { user, loading, logout } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left: Logo + Health */}
              <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                    F
                  </div>
                  <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-indigo-400 to-purple-400">
                    FreightMatch
                  </span>
                </Link>
                <ServiceHealthDots />
              </div>

              {/* Right: User info + Sign out */}
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-slate-400">Logged in as </span>
                  <span className="font-medium text-indigo-400">{user.email}</span>
                  <span className="ml-2 px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-sm px-3 py-1.5 rounded-md hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-colors border border-transparent hover:border-red-500/20"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}
