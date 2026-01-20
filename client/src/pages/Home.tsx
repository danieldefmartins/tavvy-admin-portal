import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Zap, 
  Upload, 
  Clock,
  CheckCircle2,
  ChevronRight,
  Layers
} from "lucide-react";

export default function Home() {
  const { data: placesCount, isLoading: placesLoading } = trpc.places.getCount.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.stats.getMyStats.useQuery();
  const { data: activityLog, isLoading: activityLoading } = trpc.stats.getActivityLog.useQuery();
  const { data: batchJobs, isLoading: batchLoading } = trpc.stats.getBatchJobs.useQuery();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-white/60">Welcome to the Tavvy Admin Portal</p>
        </div>
        <div className="flex gap-3">
          <Link href="/quick-entry">
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20">
              <Zap className="mr-2 h-4 w-4" />
              Quick Entry
            </Button>
          </Link>
          <Link href="/batch-upload">
            <Button variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30">
              <Upload className="mr-2 h-4 w-4" />
              Batch Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Total Places</CardTitle>
            <MapPin className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            {placesLoading ? (
              <Skeleton className="h-8 w-20 bg-white/10" />
            ) : (
              <div className="text-2xl font-bold text-white">{placesCount?.toLocaleString() || 0}</div>
            )}
            <p className="text-xs text-white/40">In the database</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">My Reviews</CardTitle>
            <Zap className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20 bg-white/10" />
            ) : (
              <div className="text-2xl font-bold text-white">{stats?.total_reviews || 0}</div>
            )}
            <p className="text-xs text-white/40">Total submitted</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Signals Today</CardTitle>
            <Zap className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20 bg-white/10" />
            ) : (
              <div className="text-2xl font-bold text-white">{stats?.reviews_today || 0}</div>
            )}
            <p className="text-xs text-white/40">Submitted today</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Batch Jobs</CardTitle>
            <Upload className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            {batchLoading ? (
              <Skeleton className="h-8 w-20 bg-white/10" />
            ) : (
              <div className="text-2xl font-bold text-white">{batchJobs?.length || 0}</div>
            )}
            <p className="text-xs text-white/40">Completed imports</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-white/50">Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/quick-entry">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20">
                    <Zap className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Add Quick Review</p>
                    <p className="text-xs text-white/50">Submit a single place review</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-orange-400 transition-colors" />
              </div>
            </Link>

            <Link href="/batch-upload">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                    <Upload className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Batch Import</p>
                    <p className="text-xs text-white/50">Upload multiple reviews at once</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>

            <Link href="/places">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-blue-500/20">
                    <MapPin className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Browse Places</p>
                    <p className="text-xs text-white/50">View and manage all places</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-orange-400 transition-colors" />
              </div>
            </Link>

            <Link href="/signals">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                    <Layers className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Manage Signals</p>
                    <p className="text-xs text-white/50">View signal categories</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-[#1a1f4e]/60 border-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-white/50">Your latest actions</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 bg-white/10 mb-1" />
                      <Skeleton className="h-3 w-1/2 bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityLog && activityLog.length > 0 ? (
              <div className="space-y-3">
                {activityLog.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="p-1.5 rounded-full bg-gradient-to-br from-orange-500/20 to-blue-500/20 mt-0.5">
                      <CheckCircle2 className="h-3 w-3 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{activity.action}</p>
                      <p className="text-xs text-white/40 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 rounded-full bg-white/5 w-fit mx-auto mb-3">
                  <Clock className="h-6 w-6 text-white/30" />
                </div>
                <p className="text-white/50 text-sm">No recent activity</p>
                <p className="text-white/30 text-xs mt-1">Start by adding a review!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
