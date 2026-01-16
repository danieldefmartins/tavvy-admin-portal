import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { MapPin, Zap, Upload, BarChart3, Clock, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: placesCount, isLoading: placesLoading } = trpc.places.getCount.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.stats.getMyStats.useQuery();
  const { data: activityLog, isLoading: activityLoading } = trpc.stats.getActivityLog.useQuery();
  const { data: batchJobs, isLoading: batchLoading } = trpc.stats.getBatchJobs.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the TavvY Admin Portal</p>
        </div>
        <div className="flex gap-3">
          <Link href="/quick-entry">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Zap className="mr-2 h-4 w-4" />
              Quick Entry
            </Button>
          </Link>
          <Link href="/batch-upload">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Batch Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Places</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {placesLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{placesCount?.toLocaleString() || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">In the database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Reviews</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total_reviews || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Total submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signals Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.reviews_today || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Submitted today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batch Jobs</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {batchLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{batchJobs?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Completed imports</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest signal submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activityLog && activityLog.length > 0 ? (
              <div className="space-y-3">
                {activityLog.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{activity.signalSlug}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.placeId.substring(0, 20)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        x{activity.tapCount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {activity.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No activity yet</p>
                <p className="text-sm">Start by submitting some signals!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Recent Batch Jobs
            </CardTitle>
            <CardDescription>Your CSV import history</CardDescription>
          </CardHeader>
          <CardContent>
            {batchLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : batchJobs && batchJobs.length > 0 ? (
              <div className="space-y-3">
                {batchJobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{job.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.totalRows} rows
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        job.status === "completed" 
                          ? "bg-emerald-500/10 text-emerald-500" 
                          : job.status === "processing"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-red-500/10 text-red-500"
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No batch jobs yet</p>
                <p className="text-sm">Upload a CSV to get started!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for field reps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/places">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <MapPin className="h-6 w-6" />
                <span>Browse Places</span>
              </Button>
            </Link>
            <Link href="/quick-entry">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Zap className="h-6 w-6" />
                <span>Quick Signal Entry</span>
              </Button>
            </Link>
            <Link href="/signals">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <BarChart3 className="h-6 w-6" />
                <span>View Signals</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
