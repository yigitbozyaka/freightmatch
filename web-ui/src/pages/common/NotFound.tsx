import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-white tracking-tight">404</h1>
      <p className="text-slate-400 mt-2 text-lg">Page not found.</p>
      <Link to="/" className="mt-6">
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
          ← Back to Home
        </Button>
      </Link>
    </div>
  );
}
