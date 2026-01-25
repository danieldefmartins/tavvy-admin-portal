import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Star,
  ShieldAlert,
  ImageOff,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

export default function Photos() {
  const [page, setPage] = useState(0);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const limit = 50;

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.photos.getStats.useQuery();
  const { data: photosData, isLoading: photosLoading, refetch: refetchPhotos } = trpc.photos.getAll.useQuery({
    limit,
    offset: page * limit,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });
  const { data: reportedData, isLoading: reportedLoading, refetch: refetchReported } = trpc.photos.getReported.useQuery({
    limit,
    offset: page * limit,
  });
  const { data: flaggedData, isLoading: flaggedLoading, refetch: refetchFlagged } = trpc.photos.getFlagged.useQuery({
    limit,
    offset: page * limit,
  });
  const { data: photoDetails, isLoading: photoLoading } = trpc.photos.getById.useQuery(
    { id: selectedPhotoId! },
    { enabled: !!selectedPhotoId }
  );
  const { data: photoReports } = trpc.photos.getReports.useQuery(
    { photoId: selectedPhotoId! },
    { enabled: !!selectedPhotoId }
  );

  // Mutations
  const approveMutation = trpc.photos.approve.useMutation({
    onSuccess: () => {
      toast.success("Photo approved");
      refetchAll();
    },
    onError: (error) => toast.error(`Failed to approve: ${error.message}`),
  });

  const rejectMutation = trpc.photos.reject.useMutation({
    onSuccess: () => {
      toast.success("Photo rejected");
      refetchAll();
      setShowRejectDialog(false);
      setRejectReason("");
    },
    onError: (error) => toast.error(`Failed to reject: ${error.message}`),
  });

  const deleteMutation = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success("Photo deleted");
      refetchAll();
      setShowDeleteDialog(false);
      setShowPhotoDialog(false);
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });

  const setCoverMutation = trpc.photos.setCover.useMutation({
    onSuccess: () => {
      toast.success("Photo set as cover");
      refetchAll();
    },
    onError: (error) => toast.error(`Failed to set cover: ${error.message}`),
  });

  const dismissReportsMutation = trpc.photos.dismissReports.useMutation({
    onSuccess: () => {
      toast.success("Reports dismissed");
      refetchAll();
    },
    onError: (error) => toast.error(`Failed to dismiss reports: ${error.message}`),
  });

  const refetchAll = () => {
    refetchPhotos();
    refetchReported();
    refetchFlagged();
  };

  const handleViewPhoto = (photo: any) => {
    setSelectedPhotoId(photo.id);
    setSelectedPhoto(photo);
    setShowPhotoDialog(true);
  };

  const handleDeletePhoto = () => {
    if (!selectedPhotoId) return;
    deleteMutation.mutate({ id: selectedPhotoId });
  };

  const handleRejectPhoto = () => {
    if (!selectedPhotoId || !rejectReason) return;
    rejectMutation.mutate({ id: selectedPhotoId, reason: rejectReason });
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

  const getStatusBadge = (status: string | null, isFlagged: boolean) => {
    if (isFlagged) {
      return <Badge variant="destructive">Flagged</Badge>;
    }
    switch (status?.toLowerCase()) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Active</Badge>;
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case "reported":
        return reportedData;
      case "flagged":
        return flaggedData;
      default:
        return photosData;
    }
  };

  const getCurrentLoading = () => {
    switch (activeTab) {
      case "reported":
        return reportedLoading;
      case "flagged":
        return flaggedLoading;
      default:
        return photosLoading;
    }
  };

  const currentData = getCurrentData();
  const photos = currentData?.photos || [];
  const totalPhotos = currentData?.total || 0;
  const totalPages = Math.ceil(totalPhotos / limit);
  const isLoading = getCurrentLoading();

  const renderPhotoGrid = (photoList: typeof photos) => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {photoList.map((photo) => (
        <div
          key={photo.id}
          className="relative group cursor-pointer rounded-lg overflow-hidden bg-muted aspect-square"
          onClick={() => handleViewPhoto(photo)}
        >
          {photo.url || photo.thumbnail_url ? (
            <img
              src={photo.thumbnail_url || photo.url}
              alt=""
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          
          {/* Overlay with info */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
            <div className="flex justify-between items-start">
              {photo.is_cover && (
                <Badge className="bg-yellow-500">
                  <Star className="h-3 w-3 mr-1" />
                  Cover
                </Badge>
              )}
              {photo.report_count && photo.report_count > 0 && (
                <Badge variant="destructive">
                  <Flag className="h-3 w-3 mr-1" />
                  {photo.report_count}
                </Badge>
              )}
            </div>
            <div className="text-white text-xs">
              <p className="truncate">{photo.place_name || "Unknown Place"}</p>
              <p className="text-white/70 truncate">{photo.user_email || "Unknown User"}</p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="absolute top-2 left-2">
            {photo.is_flagged && (
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Photo Moderation</h1>
          <p className="text-muted-foreground">
            Review and moderate user-uploaded photos
          </p>
        </div>
        <Button onClick={refetchAll} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalPhotos?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats?.approvedPhotos?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reported</CardTitle>
            <Flag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">{stats?.reportedPhotos?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{stats?.flaggedPhotos?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(0); }}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Photos</TabsTrigger>
            <TabsTrigger value="reported" className="gap-2">
              Reported
              {stats?.reportedPhotos && stats.reportedPhotos > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.reportedPhotos}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="flagged" className="gap-2">
              Flagged
              {stats?.flaggedPhotos && stats.flaggedPhotos > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.flaggedPhotos}</Badge>
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
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Photos</CardTitle>
              <CardDescription>
                {totalPhotos > 0 ? `Showing ${page * limit + 1}-${Math.min((page + 1) * limit, totalPhotos)} of ${totalPhotos} photos` : "No photos found"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : photos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No photos found</p>
                </div>
              ) : (
                <>
                  {renderPhotoGrid(photos)}
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
                <Flag className="h-5 w-5 text-orange-500" />
                Reported Photos
              </CardTitle>
              <CardDescription>
                Photos that have been flagged by users for review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportedLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : (reportedData?.photos || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No reported photos to review</p>
                </div>
              ) : (
                renderPhotoGrid(reportedData?.photos || [])
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flagged" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Flagged Photos
              </CardTitle>
              <CardDescription>
                Photos that have been flagged for policy violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {flaggedLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : (flaggedData?.photos || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No flagged photos to review</p>
                </div>
              ) : (
                renderPhotoGrid(flaggedData?.photos || [])
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Photo Details Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Photo Details</DialogTitle>
            <DialogDescription>
              Review photo content and reports
            </DialogDescription>
          </DialogHeader>

          {photoLoading ? (
            <div className="space-y-4">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : photoDetails ? (
            <div className="space-y-6">
              {/* Photo Preview */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <img
                  src={photoDetails.url}
                  alt=""
                  className="w-full h-full object-contain"
                />
                {photoDetails.is_cover && (
                  <Badge className="absolute top-4 left-4 bg-yellow-500">
                    <Star className="h-3 w-3 mr-1" />
                    Cover Photo
                  </Badge>
                )}
              </div>

              {/* Photo Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Place</Label>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {photoDetails.place_name || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Uploaded By</Label>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {photoDetails.user_email || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(photoDetails.status, photoDetails.is_flagged)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Source</Label>
                  <p className="font-medium capitalize">{photoDetails.source || "User Upload"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{formatDate(photoDetails.created_at)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Updated</Label>
                  <p className="font-medium">{formatDate(photoDetails.updated_at)}</p>
                </div>
              </div>

              {photoDetails.caption && (
                <div>
                  <Label className="text-muted-foreground">Caption</Label>
                  <p className="mt-1">{photoDetails.caption}</p>
                </div>
              )}

              {photoDetails.flag_reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <Label className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Flag Reason
                  </Label>
                  <p className="mt-1 text-red-800">{photoDetails.flag_reason}</p>
                </div>
              )}

              {/* Reports Section */}
              {photoReports && photoReports.length > 0 && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4 text-orange-500" />
                    Reports ({photoReports.length})
                  </Label>
                  <div className="mt-2 space-y-2">
                    {photoReports.map((report) => (
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
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="text-green-600"
                  onClick={() => approveMutation.mutate({ id: photoDetails.id })}
                  disabled={approveMutation.isPending}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    setSelectedPhotoId(photoDetails.id);
                    setShowRejectDialog(true);
                  }}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                {!photoDetails.is_cover && (
                  <Button
                    variant="outline"
                    onClick={() => setCoverMutation.mutate({ id: photoDetails.id, placeId: photoDetails.place_id })}
                    disabled={setCoverMutation.isPending}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Set as Cover
                  </Button>
                )}
                {photoReports && photoReports.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => dismissReportsMutation.mutate({ photoId: photoDetails.id })}
                    disabled={dismissReportsMutation.isPending}
                  >
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Dismiss Reports
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-red-600 ml-auto"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Photo not found</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Photo</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this photo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectPhoto}
              disabled={!rejectReason || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePhoto}
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
