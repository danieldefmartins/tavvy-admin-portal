import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Film,
  Image,
  MoreVertical,
  AlertTriangle,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
  Calendar,
  Flag,
  Clock,
  Play,
  ShieldAlert,
} from "lucide-react";

export default function Stories() {
  const [page, setPage] = useState(0);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [showStoryDialog, setShowStoryDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const limit = 50;

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.stories.getStats.useQuery();
  const { data: storiesData, isLoading: storiesLoading, refetch: refetchStories } = trpc.stories.getAll.useQuery({
    limit,
    offset: page * limit,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });
  const { data: reportedData, isLoading: reportedLoading, refetch: refetchReported } = trpc.stories.getReported.useQuery({
    limit,
    offset: page * limit,
  });
  const { data: selectedStory, isLoading: storyLoading } = trpc.stories.getById.useQuery(
    { id: selectedStoryId! },
    { enabled: !!selectedStoryId }
  );
  const { data: storyReports } = trpc.stories.getReports.useQuery(
    { storyId: selectedStoryId! },
    { enabled: !!selectedStoryId }
  );

  // Mutations
  const updateStatusMutation = trpc.stories.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Story status updated");
      refetchStories();
      refetchReported();
    },
    onError: (error) => toast.error(`Failed to update status: ${error.message}`),
  });

  const deleteMutation = trpc.stories.delete.useMutation({
    onSuccess: () => {
      toast.success("Story deleted");
      refetchStories();
      refetchReported();
      setShowDeleteDialog(false);
      setShowStoryDialog(false);
    },
    onError: (error) => toast.error(`Failed to delete story: ${error.message}`),
  });

  const dismissReportsMutation = trpc.stories.dismissReports.useMutation({
    onSuccess: () => {
      toast.success("Reports dismissed");
      refetchStories();
      refetchReported();
    },
    onError: (error) => toast.error(`Failed to dismiss reports: ${error.message}`),
  });

  const handleViewStory = (storyId: string) => {
    setSelectedStoryId(storyId);
    setShowStoryDialog(true);
  };

  const handleDeleteStory = () => {
    if (!selectedStoryId) return;
    deleteMutation.mutate({ id: selectedStoryId });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "removed":
        return <Badge variant="destructive">Removed</Badge>;
      case "expired":
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">Active</Badge>;
    }
  };

  const getMediaIcon = (mediaType: string | null) => {
    if (mediaType?.includes("video")) {
      return <Film className="h-4 w-4" />;
    }
    return <Image className="h-4 w-4" />;
  };

  const currentData = activeTab === "reported" ? reportedData : storiesData;
  const stories = currentData?.stories || [];
  const totalStories = currentData?.total || 0;
  const totalPages = Math.ceil(totalStories / limit);
  const isLoading = activeTab === "reported" ? reportedLoading : storiesLoading;

  const renderStoryTable = (storyList: typeof stories) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Preview</TableHead>
          <TableHead>Place</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Reports</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {storyList.map((story) => (
          <TableRow key={story.id}>
            <TableCell>
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {story.thumbnail_url || story.media_url ? (
                  <img
                    src={story.thumbnail_url || story.media_url}
                    alt=""
                    className="h-16 w-16 object-cover"
                  />
                ) : (
                  getMediaIcon(story.media_type)
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[150px]">{story.place_name || "Unknown Place"}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[150px]">{story.user_email || "Unknown User"}</span>
              </div>
            </TableCell>
            <TableCell>
              {getStatusBadge(story.status)}
            </TableCell>
            <TableCell>
              {story.report_count && story.report_count > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <Flag className="h-3 w-3" />
                  {story.report_count}
                </Badge>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </TableCell>
            <TableCell>
              <span className="text-sm">{formatDate(story.created_at)}</span>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleViewStory(story.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {story.status !== "removed" && (
                    <DropdownMenuItem
                      onClick={() => updateStatusMutation.mutate({ id: story.id, status: "removed" })}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Remove Story
                    </DropdownMenuItem>
                  )}
                  {story.status === "removed" && (
                    <DropdownMenuItem
                      onClick={() => updateStatusMutation.mutate({ id: story.id, status: "active" })}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Restore Story
                    </DropdownMenuItem>
                  )}
                  {story.report_count && story.report_count > 0 && (
                    <DropdownMenuItem
                      onClick={() => dismissReportsMutation.mutate({ storyId: story.id })}
                    >
                      <ShieldAlert className="h-4 w-4 mr-2" />
                      Dismiss Reports
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedStoryId(story.id);
                      setShowDeleteDialog(true);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Story Moderation</h1>
          <p className="text-muted-foreground">
            Review and moderate user-submitted stories
          </p>
        </div>
        <Button onClick={() => { refetchStories(); refetchReported(); }} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stories</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalStories?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats?.activeStories?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reported</CardTitle>
            <Flag className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{stats?.reportedStories?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Removed</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-gray-600">{stats?.removedStories?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(0); }}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Stories</TabsTrigger>
            <TabsTrigger value="reported" className="gap-2">
              Reported
              {stats?.reportedStories && stats.reportedStories > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.reportedStories}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {activeTab === "all" && (
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="removed">Removed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Stories</CardTitle>
              <CardDescription>
                {totalStories > 0 ? `Showing ${page * limit + 1}-${Math.min((page + 1) * limit, totalStories)} of ${totalStories} stories` : "No stories found"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : stories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stories found</p>
                </div>
              ) : (
                <>
                  {renderStoryTable(stories)}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {page + 1} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(0, page - 1))}
                          disabled={page === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                          disabled={page >= totalPages - 1}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reported" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Reported Stories
              </CardTitle>
              <CardDescription>
                Stories that have been flagged by users for review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (reportedData?.stories || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No reported stories to review</p>
                </div>
              ) : (
                renderStoryTable(reportedData?.stories || [])
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Story Details Dialog */}
      <Dialog open={showStoryDialog} onOpenChange={setShowStoryDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Story Details</DialogTitle>
            <DialogDescription>
              Review story content and reports
            </DialogDescription>
          </DialogHeader>

          {storyLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : selectedStory ? (
            <div className="space-y-6">
              {/* Media Preview */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {selectedStory.media_type?.includes("video") ? (
                  <video
                    src={selectedStory.media_url}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={selectedStory.media_url}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Story Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Place</Label>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedStory.place_name || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedStory.user_email || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedStory.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Media Type</Label>
                  <p className="font-medium flex items-center gap-2">
                    {getMediaIcon(selectedStory.media_type)}
                    {selectedStory.media_type || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{formatDate(selectedStory.created_at)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Expires</Label>
                  <p className="font-medium">{formatDate(selectedStory.expires_at)}</p>
                </div>
              </div>

              {selectedStory.caption && (
                <div>
                  <Label className="text-muted-foreground">Caption</Label>
                  <p className="mt-1">{selectedStory.caption}</p>
                </div>
              )}

              {selectedStory.tags && selectedStory.tags.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedStory.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Reports Section */}
              {storyReports && storyReports.length > 0 && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4 text-red-500" />
                    Reports ({storyReports.length})
                  </Label>
                  <div className="mt-2 space-y-2">
                    {storyReports.map((report) => (
                      <Card key={report.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{report.reason}</p>
                              <p className="text-sm text-muted-foreground">
                                Reported by: {report.reporter_email || "Unknown"}
                              </p>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(report.created_at)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedStory.status !== "removed" ? (
                  <Button
                    variant="destructive"
                    onClick={() => updateStatusMutation.mutate({ id: selectedStory.id, status: "removed" })}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Remove Story
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ id: selectedStory.id, status: "active" })}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Restore Story
                  </Button>
                )}
                {storyReports && storyReports.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => dismissReportsMutation.mutate({ storyId: selectedStory.id })}
                  >
                    Dismiss Reports
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-red-600 ml-auto"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Story not found</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this story? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStory}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
