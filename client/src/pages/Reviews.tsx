import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  MessageSquare,
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
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
} from "lucide-react";

export default function Reviews() {
  const [page, setPage] = useState(0);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const limit = 50;

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.reviewModeration.getStats.useQuery();
  const { data: reviewsData, isLoading: reviewsLoading, refetch: refetchReviews } = trpc.reviewModeration.getAll.useQuery({
    limit,
    offset: page * limit,
    status: filterStatus !== "all" ? filterStatus : undefined,
    minRating: filterRating !== "all" ? parseInt(filterRating) : undefined,
    maxRating: filterRating !== "all" ? parseInt(filterRating) : undefined,
  });
  const { data: reportedData, isLoading: reportedLoading, refetch: refetchReported } = trpc.reviewModeration.getReported.useQuery({
    limit,
    offset: page * limit,
  });
  const { data: flaggedData, isLoading: flaggedLoading, refetch: refetchFlagged } = trpc.reviewModeration.getFlagged.useQuery({
    limit,
    offset: page * limit,
  });
  const { data: reviewDetails, isLoading: reviewLoading } = trpc.reviewModeration.getById.useQuery(
    { id: selectedReviewId! },
    { enabled: !!selectedReviewId }
  );
  const { data: reviewReports } = trpc.reviewModeration.getReports.useQuery(
    { reviewId: selectedReviewId! },
    { enabled: !!selectedReviewId }
  );

  // Mutations
  const approveMutation = trpc.reviewModeration.approve.useMutation({
    onSuccess: () => {
      toast.success("Review approved");
      refetchAll();
    },
    onError: (error) => toast.error(`Failed to approve: ${error.message}`),
  });

  const rejectMutation = trpc.reviewModeration.reject.useMutation({
    onSuccess: () => {
      toast.success("Review rejected");
      refetchAll();
      setShowRejectDialog(false);
      setRejectReason("");
    },
    onError: (error) => toast.error(`Failed to reject: ${error.message}`),
  });

  const deleteMutation = trpc.reviewModeration.delete.useMutation({
    onSuccess: () => {
      toast.success("Review deleted");
      refetchAll();
      setShowDeleteDialog(false);
      setShowReviewDialog(false);
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });

  const dismissReportsMutation = trpc.reviewModeration.dismissReports.useMutation({
    onSuccess: () => {
      toast.success("Reports dismissed");
      refetchAll();
    },
    onError: (error) => toast.error(`Failed to dismiss reports: ${error.message}`),
  });

  const refetchAll = () => {
    refetchReviews();
    refetchReported();
    refetchFlagged();
  };

  const handleViewReview = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setShowReviewDialog(true);
  };

  const handleDeleteReview = () => {
    if (!selectedReviewId) return;
    deleteMutation.mutate({ id: selectedReviewId });
  };

  const handleRejectReview = () => {
    if (!selectedReviewId || !rejectReason) return;
    rejectMutation.mutate({ id: selectedReviewId, reason: rejectReason });
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

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case "reported":
        return reportedData;
      case "flagged":
        return flaggedData;
      default:
        return reviewsData;
    }
  };

  const getCurrentLoading = () => {
    switch (activeTab) {
      case "reported":
        return reportedLoading;
      case "flagged":
        return flaggedLoading;
      default:
        return reviewsLoading;
    }
  };

  const currentData = getCurrentData();
  const reviews = currentData?.reviews || [];
  const totalReviews = currentData?.total || 0;
  const totalPages = Math.ceil(totalReviews / limit);
  const isLoading = getCurrentLoading();

  const renderReviewTable = (reviewList: typeof reviews) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rating</TableHead>
          <TableHead>Review</TableHead>
          <TableHead>Place</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Reports</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reviewList.map((review) => (
          <TableRow key={review.id}>
            <TableCell>
              {renderStars(review.rating)}
            </TableCell>
            <TableCell>
              <p className="max-w-[300px] truncate">
                {review.review_text || <span className="text-muted-foreground italic">No text</span>}
              </p>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[120px]">{review.place_name || "Unknown"}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[120px]">{review.user_email || "Unknown"}</span>
              </div>
            </TableCell>
            <TableCell>
              {getStatusBadge(review.status, review.is_flagged)}
            </TableCell>
            <TableCell>
              {review.report_count && review.report_count > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <Flag className="h-3 w-3" />
                  {review.report_count}
                </Badge>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </TableCell>
            <TableCell>
              <span className="text-sm">{formatDate(review.created_at)}</span>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleViewReview(review.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => approveMutation.mutate({ id: review.id })}
                    className="text-green-600"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedReviewId(review.id);
                      setShowRejectDialog(true);
                    }}
                    className="text-orange-600"
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Reject
                  </DropdownMenuItem>
                  {review.report_count && review.report_count > 0 && (
                    <DropdownMenuItem
                      onClick={() => dismissReportsMutation.mutate({ reviewId: review.id })}
                    >
                      <ShieldAlert className="h-4 w-4 mr-2" />
                      Dismiss Reports
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedReviewId(review.id);
                      setShowDeleteDialog(true);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
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
          <h1 className="text-3xl font-bold tracking-tight">Review Moderation</h1>
          <p className="text-muted-foreground">
            Review and moderate user-submitted reviews
          </p>
        </div>
        <Button onClick={refetchAll} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalReviews?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold flex items-center gap-2">
                {stats?.averageRating ? stats.averageRating.toFixed(1) : "0"}
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </div>
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
              <div className="text-2xl font-bold text-green-600">{stats?.approvedReviews?.toLocaleString() || 0}</div>
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
              <div className="text-2xl font-bold text-orange-600">{stats?.reportedReviews?.toLocaleString() || 0}</div>
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
              <div className="text-2xl font-bold text-red-600">{stats?.flaggedReviews?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(0); }}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Reviews</TabsTrigger>
            <TabsTrigger value="reported" className="gap-2">
              Reported
              {stats?.reportedReviews && stats.reportedReviews > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.reportedReviews}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="flagged" className="gap-2">
              Flagged
              {stats?.flaggedReviews && stats.flaggedReviews > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.flaggedReviews}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {activeTab === "all" && (
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRating} onValueChange={(v) => { setFilterRating(v); setPage(0); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Reviews</CardTitle>
              <CardDescription>
                {totalReviews > 0 ? `Showing ${page * limit + 1}-${Math.min((page + 1) * limit, totalReviews)} of ${totalReviews} reviews` : "No reviews found"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reviews found</p>
                </div>
              ) : (
                <>
                  {renderReviewTable(reviews)}
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
                Reported Reviews
              </CardTitle>
              <CardDescription>
                Reviews that have been flagged by users for review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (reportedData?.reviews || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No reported reviews to review</p>
                </div>
              ) : (
                renderReviewTable(reportedData?.reviews || [])
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flagged" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Flagged Reviews
              </CardTitle>
              <CardDescription>
                Reviews that have been flagged for policy violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {flaggedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (flaggedData?.reviews || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No flagged reviews to review</p>
                </div>
              ) : (
                renderReviewTable(flaggedData?.reviews || [])
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Details Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Review content and reports
            </DialogDescription>
          </DialogHeader>

          {reviewLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : reviewDetails ? (
            <div className="space-y-6">
              {/* Rating */}
              <div className="flex items-center gap-4">
                {renderStars(reviewDetails.rating)}
                <span className="text-2xl font-bold">{reviewDetails.rating}/5</span>
                {getStatusBadge(reviewDetails.status, reviewDetails.is_flagged)}
              </div>

              {/* Review Text */}
              <div>
                <Label className="text-muted-foreground">Review</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  {reviewDetails.review_text || <span className="text-muted-foreground italic">No review text provided</span>}
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Place</Label>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {reviewDetails.place_name || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reviewer</Label>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {reviewDetails.user_email || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{formatDate(reviewDetails.created_at)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Updated</Label>
                  <p className="font-medium">{formatDate(reviewDetails.updated_at)}</p>
                </div>
              </div>

              {reviewDetails.flag_reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <Label className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Flag Reason
                  </Label>
                  <p className="mt-1 text-red-800">{reviewDetails.flag_reason}</p>
                </div>
              )}

              {/* Reports Section */}
              {reviewReports && reviewReports.length > 0 && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4 text-orange-500" />
                    Reports ({reviewReports.length})
                  </Label>
                  <div className="mt-2 space-y-2">
                    {reviewReports.map((report) => (
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
                  onClick={() => approveMutation.mutate({ id: reviewDetails.id })}
                  disabled={approveMutation.isPending}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="text-orange-600"
                  onClick={() => {
                    setSelectedReviewId(reviewDetails.id);
                    setShowRejectDialog(true);
                  }}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                {reviewReports && reviewReports.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => dismissReportsMutation.mutate({ reviewId: reviewDetails.id })}
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
            <p className="text-muted-foreground">Review not found</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Review</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this review
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
              onClick={handleRejectReview}
              disabled={!rejectReason || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReview}
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
