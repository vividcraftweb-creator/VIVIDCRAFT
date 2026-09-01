import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, LayoutDashboard, Search, Users } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background glow decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-6 relative z-10 glass-card bg-white/5 border border-white/10 p-8 sm:p-12 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary/30 to-blue-500/30 border border-white/20 text-primary font-bold text-4xl shadow-lg mx-auto">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Page Not Found
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-medium rounded-xl px-6 py-2.5 shadow-lg shadow-primary/25 transition-all hover:scale-105"
          >
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>Return Home</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl px-6 py-2.5 transition-all hover:scale-105"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </Button>
        </div>

        {/* Helpful links */}
        <div className="pt-6 border-t border-white/10">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-4 font-semibold">
            Quick Navigation
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <Link
              href="/jobs"
              className="flex items-center gap-1.5 hover:text-white transition-colors hover:underline"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Explore Art & Jobs</span>
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              href="/freelancers"
              className="flex items-center gap-1.5 hover:text-white transition-colors hover:underline"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Discover Artists</span>
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 hover:text-white transition-colors hover:underline"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Admin Panel</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
