import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { 
  MapPin, 
  Zap, 
  Upload, 
  BarChart3, 
  Clock, 
  CheckCircle2,
  Users,
  Briefcase,
  Film,
  Image,
  MessageSquare,
  Flag,
  AlertTriangle,
  Shield,
  TrendingUp,
  Star
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: placesCount, isLoading: placesLoading } = trpc.places.getCount.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.stats.getMyStats.useQuery();
  const { data: activityLog, isLoading: activityLoading } = trpc.stats.getActivityLog.useQuery();
  const { data: batchJobs, isLoading: batchLoading } = trpc.stats.getBatchJobs.useQuery();
  
  // New moderation stats
  const { data: userStats, isLoading: userStatsLoading } = trpc.users.getStats.useQuery();
  const { data: proStats, isLoading: proStatsLoading } = trpc.pros.getStats.useQuery();
  const { data: storyStats, isLoading: storyStatsLoading } = trpc.stories.getStats.useQuery();
  const { data: photoStats, isLoading: photoStatsLoading } = trpc.photos.getStats.useQuery();
  const { data: reviewStats, isLoading: reviewStatsLoading } = trpc.reviews.getStats.useQuery();

  // Calculate total items needing attention
  const pendingItems = (storyStats?.reportedStories || 0) + 
                       (photoStats?.reportedPhotos || 0) + 
                       (reviewStats?.reportedReviews || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the Tavvy Admin Portal</p>
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

      {/* Alert Banner for Pending Moderation */}
      {pendingItems > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-800">
                    {pendingItems} items need moderation
                  </p>
                  <p className="text-sm text-orange-600">
                    Review reported content to maintain platform quality
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {(storyStats?.reportedStories || 0) > 0 && (
                  <Link href="/stories">
                    <Button size="sm" variant="outline" className="border-orange-300">
                      <Film className="h-4 w-4 mr-1" />
                      Stories ({storyStats?.reportedStories})
                    </Button>
                  </Link>
                )}
                {(photoStats?.reportedPhotos || 0) > 0 && (
                  <Link href="/photos">
                    <Button size="sm" variant="outline" className="border-orange-300">
                      <Image className="h-4 w-4 mr-1" />
                      Photos ({photoStats?.reportedPhotos})
                    </Button>
                  </Link>
                )}
                {(reviewStats?.reportedReviews || 0) > 0 && (
                  <Link href="/reviews">
                    <Button size="sm" variant="outline" className="border-orange-300">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Reviews ({reviewStats?.reportedReviews})
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Stats Cards */}
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
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {userStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{userStats?.totalUsers?.toLocaleString() || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {userStats?.verifiedUsers || 0} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Providers</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {proStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{proStats?.totalPros?.toLocaleString() || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {proStats?.verifiedPros || 0} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {reviewStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold flex items-center gap-2">
                {reviewStats?.totalReviews?.toLocaleString() || 0}
                {reviewStats?.averageRating && (
                  <span className="text-sm font-normal text-muted-foreground flex items-center">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 mr-1" />
                    {reviewStats.averageRating.toFixed(1)}
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {reviewStats?.approvedReviews || 0} approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stories</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {storyStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{storyStats?.totalStories?.toLocaleString() || 0}</div>
                <div className="flex gap-2 mt-2">
                  {(storyStats?.reportedStories || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <Flag className="h-3 w-3 mr-1" />
                      {storyStats?.reportedStories} reported
                    </Badge>
                  )}
                  {(storyStats?.flaggedStories || 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {storyStats?.flaggedStories} flagged
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Photos</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {photoStatsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{photoStats?.totalPhotos?.toLocaleString() || 0}</div>
                <div className="flex gap-2 mt-2">
                  {(photoStats?.reportedPhotos || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <Flag className="h-3 w-3 mr-1" />
                      {photoStats?.reportedPhotos} reported
                    </Badge>
                  )}
                  {(photoStats?.flaggedPhotos || 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {photoStats?.flaggedPhotos} flagged
                    </Badge>
                  )}
                </div>
              </>
            )}
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
              <>
                <div className="text-2xl font-bold">{stats?.reviews_today || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.total_reviews || 0} total submitted
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Frequently used admin tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Link href="/users">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Users className="h-5 w-5" />
                <span className="text-xs">Users</span>
              </Button>
            </Link>
            <Link href="/pros">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Briefcase className="h-5 w-5" />
                <span className="text-xs">Pros</span>
              </Button>
            </Link>
            <Link href="/stories">
              <Button variant="outline" className="w-full h-20 flex-col gap-2 relative">
                <Film className="h-5 w-5" />
                <span className="text-xs">Stories</span>
                {(storyStats?.reportedStories || 0) > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {storyStats?.reportedStories}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/photos">
              <Button variant="outline" className="w-full h-20 flex-col gap-2 relative">
                <Image className="h-5 w-5" />
                <span className="text-xs">Photos</span>
                {(photoStats?.reportedPhotos || 0) > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {photoStats?.reportedPhotos}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/reviews">
              <Button variant="outline" className="w-full h-20 flex-col gap-2 relative">
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs">Reviews</span>
                {(reviewStats?.reportedReviews || 0) > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {reviewStats?.reportedReviews}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/places/new/edit">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <MapPin className="h-5 w-5" />
                <span className="text-xs">Add Place</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
