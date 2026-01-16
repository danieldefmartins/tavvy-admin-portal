import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LayoutDashboard, 
  MapPin, 
  Zap, 
  Upload, 
  LogOut,
  Menu,
  X,
  Clock,
  CheckCircle2,
  ChevronRight,
  Layers
} from "lucide-react";

// Sidebar Navigation Items
const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/places", icon: MapPin, label: "Places" },
  { href: "/quick-entry", icon: Zap, label: "Quick Entry" },
  { href: "/batch-upload", icon: Upload, label: "Batch Upload" },
  { href: "/signals", icon: Layers, label: "Signals" },
];

// Sidebar Component
function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 
        bg-[#0F1233]
        border-r border-slate-700/50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <img src="/tavvy-icon.png" alt="TavvY" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-white">TavvY</h1>
              <p className="text-xs text-slate-400">Admin Portal</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200 cursor-pointer
                  ${isActive 
                    ? 'bg-gradient-to-r from-orange-500/20 to-blue-500/20 text-orange-400 border border-orange-500/30' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }
                `}>
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-orange-400' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 mb-3 px-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500/30 to-blue-500/30 flex items-center justify-center">
              <span className="text-orange-400 font-semibold text-sm">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || 'Admin'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.email || 'admin@tavvy.com'}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-700/50"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}

// Main Dashboard Content
function DashboardContent() {
  const { data: placesCount, isLoading: placesLoading } = trpc.places.getCount.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.stats.getMyStats.useQuery();
  const { data: activityLog, isLoading: activityLoading } = trpc.stats.getActivityLog.useQuery();
  const { data: batchJobs, isLoading: batchLoading } = trpc.stats.getBatchJobs.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Welcome to the TavvY Admin Portal</p>
        </div>
        <div className="flex gap-3">
          <Link href="/quick-entry">
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
              <Zap className="mr-2 h-4 w-4" />
              Quick Entry
            </Button>
          </Link>
          <Link href="/batch-upload">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white">
              <Upload className="mr-2 h-4 w-4" />
              Batch Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#1a1f4e]/50 border-slate-700/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Places</CardTitle>
            <MapPin className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            {placesLoading ? (
              <Skeleton className="h-8 w-20 bg-slate-700" />
            ) : (
              <div className="text-2xl font-bold text-white">{placesCount?.toLocaleString() || 0}</div>
            )}
            <p className="text-xs text-slate-500">In the database</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1f4e]/50 border-slate-700/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">My Reviews</CardTitle>
            <Zap className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20 bg-slate-700" />
            ) : (
              <div className="text-2xl font-bold text-white">{stats?.total_reviews || 0}</div>
            )}
            <p className="text-xs text-slate-500">Total submitted</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1f4e]/50 border-slate-700/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Signals Today</CardTitle>
            <Zap className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20 bg-slate-700" />
            ) : (
              <div className="text-2xl font-bold text-white">{stats?.reviews_today || 0}</div>
            )}
            <p className="text-xs text-slate-500">Submitted today</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1f4e]/50 border-slate-700/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Batch Jobs</CardTitle>
            <Upload className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            {batchLoading ? (
              <Skeleton className="h-8 w-20 bg-slate-700" />
            ) : (
              <div className="text-2xl font-bold text-white">{batchJobs?.length || 0}</div>
            )}
            <p className="text-xs text-slate-500">Completed imports</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card className="bg-[#1a1f4e]/50 border-slate-700/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-slate-400">Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/quick-entry">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20">
                    <Zap className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Add Quick Review</p>
                    <p className="text-xs text-slate-400">Submit a single place review</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-orange-400 transition-colors" />
              </div>
            </Link>

            <Link href="/batch-upload">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                    <Upload className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Batch Import</p>
                    <p className="text-xs text-slate-400">Upload multiple reviews at once</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>

            <Link href="/places">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-blue-500/20">
                    <MapPin className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Browse Places</p>
                    <p className="text-xs text-slate-400">View and manage all places</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-orange-400 transition-colors" />
              </div>
            </Link>

            <Link href="/signals">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                    <Layers className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Manage Signals</p>
                    <p className="text-xs text-slate-400">View signal categories</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-[#1a1f4e]/50 border-slate-700/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-slate-400">Your latest actions</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-slate-700" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 bg-slate-700 mb-1" />
                      <Skeleton className="h-3 w-1/2 bg-slate-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityLog && activityLog.length > 0 ? (
              <div className="space-y-3">
                {activityLog.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                    <div className="p-1.5 rounded-full bg-gradient-to-br from-orange-500/20 to-blue-500/20 mt-0.5">
                      <CheckCircle2 className="h-3 w-3 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{activity.action}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 rounded-full bg-slate-800/50 w-fit mx-auto mb-3">
                  <Clock className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm">No recent activity</p>
                <p className="text-slate-500 text-xs mt-1">Start by adding a review!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main Home Component with Layout
export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0F1233]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#0F1233]/95 backdrop-blur border-b border-slate-700/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/tavvy-icon.png" alt="TavvY" className="h-8 w-8 object-contain" />
              <span className="font-bold text-white">TavvY</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <DashboardContent />
        </main>
      </div>
    </div>
  );
}
