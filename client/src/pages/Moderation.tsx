import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Flag, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  Eye,
  MessageSquare,
  Image,
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X
} from "lucide-react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type FlagStatus = "pending" | "reviewed" | "dismissed" | "actioned";
type QueueStatus = "pending" | "approved" | "rejected";

const flagStatusConfig: Record<FlagStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  reviewed: { label: "Reviewed", variant: "default" },
  dismissed: { label: "Dismissed", variant: "outline" },
  actioned: { label: "Actioned", variant: "destructive" },
};

const queueStatusConfig: Record<QueueStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const contentTypeIcons: Record<string, React.ReactNode> = {
  review: <MessageSquare className="h-4 w-4" />,
  photo: <Image className="h-4 w-4" />,
  post: <FileText className="h-4 w-4" />,
  default: <Flag className="h-4 w-4" />,
};

const contentTypes = ["review", "photo", "post", "comment", "profile"];
const flagReasons = ["spam", "inappropriate", "misleading", "harassment", "other"];

export default function Moderation() {
  const [view, setView] = useState<"flags" | "queue">("flags");
  const [flagFilter, setFlagFilter] = useState<FlagStatus | "all">("pending");
  const [queueFilter, setQueueFilter] = useState<QueueStatus | "all">("pending");
  
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);
  const [flagAction, setFlagAction] = useState<FlagStatus | null>(null);
  
  const [selectedQueueItem, setSelectedQueueItem] = useState<string | null>(null);
  const [queueAction, setQueueAction] = useState<QueueStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Search/filter state
  const [showFilters, setShowFilters] = useState(false);
  const [flagFilters, setFlagFilters] = useState({
    contentType: "",
    reason: "",
    contentId: "",
    flaggedBy: "",
  });
  const [queueFilters, setQueueFilters] = useState({
    itemType: "",
    itemId: "",
    submittedBy: "",
  });

  const { data: stats } = trpc.moderation.getStats.useQuery();

  const { data: flags, isLoading: flagsLoading, refetch: refetchFlags } = trpc.moderation.getFlags.useQuery(
    flagFilter === "all" ? undefined : { status: flagFilter }
  );

  const { data: queue, isLoading: queueLoading, refetch: refetchQueue } = trpc.moderation.getQueue.useQuery(
    queueFilter === "all" ? undefined : { status: queueFilter }
  );

  // Filter flags client-side
  const filteredFlags = useMemo(() => {
    if (!flags) return [];
    return flags.filter(flag => {
      if (flagFilters.contentType && flag.content_type !== flagFilters.contentType) return false;
      if (flagFilters.reason && !flag.reason?.toLowerCase().includes(flagFilters.reason.toLowerCase())) return false;
      if (flagFilters.contentId && !flag.content_id?.toLowerCase().includes(flagFilters.contentId.toLowerCase())) return false;
      if (flagFilters.flaggedBy && !flag.flagged_by?.toLowerCase().includes(flagFilters.flaggedBy.toLowerCase())) return false;
      return true;
    });
  }, [flags, flagFilters]);

  // Filter queue client-side
  const filteredQueue = useMemo(() => {
    if (!queue) return [];
    return queue.filter(item => {
      if (queueFilters.itemType && item.item_type !== queueFilters.itemType) return false;
      if (queueFilters.itemId && !item.item_id?.toLowerCase().includes(queueFilters.itemId.toLowerCase())) return false;
      if (queueFilters.submittedBy && !item.submitted_by?.toLowerCase().includes(queueFilters.submittedBy.toLowerCase())) return false;
      return true;
    });
  }, [queue, queueFilters]);

  const hasFlagFilters = Object.values(flagFilters).some(v => v.length > 0);
  const hasQueueFilters = Object.values(queueFilters).some(v => v.length > 0);
  const activeFilterCount = view === "flags" 
    ? Object.values(flagFilters).filter(v => v.length > 0).length
    : Object.values(queueFilters).filter(v => v.length > 0).length;

  const handleClearFilters = () => {
    if (view === "flags") {
      setFlagFilters({ contentType: "", reason: "", contentId: "", flaggedBy: "" });
    } else {
      setQueueFilters({ itemType: "", itemId: "", submittedBy: "" });
    }
  };

  const reviewFlagMutation = trpc.moderation.reviewFlag.useMutation({
    onSuccess: () => {
      toast.success("Flag reviewed successfully");
      refetchFlags();
      setSelectedFlag(null);
      setFlagAction(null);
    },
    onError: (error) => {
      toast.error(`Failed to review flag: ${error.message}`);
    },
  });

  const reviewQueueMutation = trpc.moderation.reviewQueueItem.useMutation({
    onSuccess: () => {
      toast.success("Item reviewed successfully");
      refetchQueue();
      setSelectedQueueItem(null);
      setQueueAction(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(`Failed to review item: ${error.message}`);
    },
  });

  const handleFlagAction = () => {
    if (!selectedFlag || !flagAction || flagAction === "pending") return;
    reviewFlagMutation.mutate({ id: selectedFlag, status: flagAction });
  };

  const handleQueueAction = () => {
    if (!selectedQueueItem || !queueAction || queueAction === "pending") return;
    reviewQueueMutation.mutate({ 
      id: selectedQueueItem, 
      status: queueAction,
      rejectionReason: queueAction === "rejected" ? rejectionReason : undefined
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moderation</h1>
        <p className="text-muted-foreground">
          Review flagged content and moderation queue
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Flags</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingFlags || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Queue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingModeration || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingClaims || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Overrides</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOverrides || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search/Filter Card */}
      <Card>
        <CardContent className="pt-6">
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Search & Filter
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              {(hasFlagFilters || hasQueueFilters) && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-2 text-muted-foreground">
                  <RotateCcw className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            <CollapsibleContent className="pt-4">
              {view === "flags" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select value={flagFilters.contentType} onValueChange={(v) => setFlagFilters({ ...flagFilters, contentType: v === "all" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {contentTypes.map(type => (
                          <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                      placeholder="Search by reason..."
                      value={flagFilters.reason}
                      onChange={(e) => setFlagFilters({ ...flagFilters, reason: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content ID</Label>
                    <Input
                      placeholder="Search by content ID..."
                      value={flagFilters.contentId}
                      onChange={(e) => setFlagFilters({ ...flagFilters, contentId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Flagged By</Label>
                    <Input
                      placeholder="Search by user..."
                      value={flagFilters.flaggedBy}
                      onChange={(e) => setFlagFilters({ ...flagFilters, flaggedBy: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Item Type</Label>
                    <Select value={queueFilters.itemType} onValueChange={(v) => setQueueFilters({ ...queueFilters, itemType: v === "all" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {contentTypes.map(type => (
                          <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Item ID</Label>
                    <Input
                      placeholder="Search by item ID..."
                      value={queueFilters.itemId}
                      onChange={(e) => setQueueFilters({ ...queueFilters, itemId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Submitted By</Label>
                    <Input
                      placeholder="Search by user..."
                      value={queueFilters.submittedBy}
                      onChange={(e) => setQueueFilters({ ...queueFilters, submittedBy: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {view === "flags" && hasFlagFilters && (
        <div className="flex flex-wrap gap-2">
          {flagFilters.contentType && (
            <Badge variant="secondary" className="gap-1">
              Type: {flagFilters.contentType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFlagFilters({ ...flagFilters, contentType: "" })} />
            </Badge>
          )}
          {flagFilters.reason && (
            <Badge variant="secondary" className="gap-1">
              Reason: {flagFilters.reason}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFlagFilters({ ...flagFilters, reason: "" })} />
            </Badge>
          )}
          {flagFilters.contentId && (
            <Badge variant="secondary" className="gap-1">
              Content: {flagFilters.contentId}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFlagFilters({ ...flagFilters, contentId: "" })} />
            </Badge>
          )}
          {flagFilters.flaggedBy && (
            <Badge variant="secondary" className="gap-1">
              By: {flagFilters.flaggedBy}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFlagFilters({ ...flagFilters, flaggedBy: "" })} />
            </Badge>
          )}
        </div>
      )}
      {view === "queue" && hasQueueFilters && (
        <div className="flex flex-wrap gap-2">
          {queueFilters.itemType && (
            <Badge variant="secondary" className="gap-1">
              Type: {queueFilters.itemType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setQueueFilters({ ...queueFilters, itemType: "" })} />
            </Badge>
          )}
          {queueFilters.itemId && (
            <Badge variant="secondary" className="gap-1">
              Item: {queueFilters.itemId}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setQueueFilters({ ...queueFilters, itemId: "" })} />
            </Badge>
          )}
          {queueFilters.submittedBy && (
            <Badge variant="secondary" className="gap-1">
              By: {queueFilters.submittedBy}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setQueueFilters({ ...queueFilters, submittedBy: "" })} />
            </Badge>
          )}
        </div>
      )}

      <Tabs value={view} onValueChange={(v) => setView(v as "flags" | "queue")}>
        <TabsList>
          <TabsTrigger value="flags">Content Flags</TabsTrigger>
          <TabsTrigger value="queue">Moderation Queue</TabsTrigger>
        </TabsList>

        {/* Content Flags Tab */}
        <TabsContent value="flags" className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <Select value={flagFilter} onValueChange={(v) => setFlagFilter(v as FlagStatus | "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Flags</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
                <SelectItem value="actioned">Actioned</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Showing {filteredFlags.length} of {flags?.length || 0} flags
            </span>
          </div>

          {flagsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFlags && filteredFlags.length > 0 ? (
            <div className="grid gap-4">
              {filteredFlags.map((flag) => (
                <Card key={flag.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                          {contentTypeIcons[flag.content_type] || contentTypeIcons.default}
                        </div>
                        <div>
                          <CardTitle className="text-lg capitalize">{flag.content_type} Flag</CardTitle>
                          <CardDescription>
                            Flagged {formatDate(flag.created_at)}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={flagStatusConfig[flag.status as FlagStatus]?.variant || "secondary"}>
                        {flagStatusConfig[flag.status as FlagStatus]?.label || flag.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Reason:</span>
                        <p className="text-sm text-muted-foreground">{flag.reason}</p>
                      </div>
                      {flag.note && (
                        <div>
                          <span className="text-sm font-medium">Note:</span>
                          <p className="text-sm text-muted-foreground">{flag.note}</p>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Content ID: {flag.content_id}
                        {flag.flagged_by && <span> • Flagged by: {flag.flagged_by}</span>}
                      </div>
                    </div>

                    {flag.status === "pending" && (
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedFlag(flag.id);
                            setFlagAction("reviewed");
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Mark Reviewed
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedFlag(flag.id);
                            setFlagAction("dismissed");
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedFlag(flag.id);
                            setFlagAction("actioned");
                          }}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Take Action
                        </Button>
                      </div>
                    )}

                    {flag.reviewed_at && (
                      <div className="mt-4 text-xs text-muted-foreground">
                        Reviewed on {formatDate(flag.reviewed_at)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {hasFlagFilters ? "No flags match your filters" : "No content flags found"}
                </p>
                {hasFlagFilters && (
                  <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Moderation Queue Tab */}
        <TabsContent value="queue" className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <Select value={queueFilter} onValueChange={(v) => setQueueFilter(v as QueueStatus | "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Showing {filteredQueue.length} of {queue?.length || 0} items
            </span>
          </div>

          {queueLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredQueue && filteredQueue.length > 0 ? (
            <div className="grid gap-4">
              {filteredQueue.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {contentTypeIcons[item.item_type] || contentTypeIcons.default}
                        </div>
                        <div>
                          <CardTitle className="text-lg capitalize">{item.item_type}</CardTitle>
                          <CardDescription>
                            Submitted {formatDate(item.created_at)}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={queueStatusConfig[item.status as QueueStatus]?.variant || "secondary"}>
                        {queueStatusConfig[item.status as QueueStatus]?.label || item.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {item.content && (
                        <div>
                          <span className="text-sm font-medium">Content:</span>
                          <pre className="text-sm text-muted-foreground bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                            {JSON.stringify(item.content, null, 2)}
                          </pre>
                        </div>
                      )}
                      {item.rejection_reason && (
                        <div>
                          <span className="text-sm font-medium text-destructive">Rejection Reason:</span>
                          <p className="text-sm text-muted-foreground">{item.rejection_reason}</p>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Item ID: {item.item_id}
                        {item.submitted_by && <span> • Submitted by: {item.submitted_by}</span>}
                      </div>
                    </div>

                    {item.status === "pending" && (
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedQueueItem(item.id);
                            setQueueAction("approved");
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedQueueItem(item.id);
                            setQueueAction("rejected");
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {item.reviewed_at && (
                      <div className="mt-4 text-xs text-muted-foreground">
                        Reviewed on {formatDate(item.reviewed_at)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {hasQueueFilters ? "No items match your filters" : "No items in moderation queue"}
                </p>
                {hasQueueFilters && (
                  <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Flag Action Dialog */}
      <AlertDialog open={!!selectedFlag && !!flagAction} onOpenChange={() => { setSelectedFlag(null); setFlagAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {flagAction === "reviewed" && "Mark as Reviewed"}
              {flagAction === "dismissed" && "Dismiss Flag"}
              {flagAction === "actioned" && "Take Action on Flag"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {flagAction === "reviewed" && "This will mark the flag as reviewed without taking action."}
              {flagAction === "dismissed" && "This will dismiss the flag as not requiring action."}
              {flagAction === "actioned" && "This will mark that action has been taken on this flagged content."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFlagAction}>
              {reviewFlagMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Queue Action Dialog */}
      <AlertDialog open={!!selectedQueueItem && !!queueAction} onOpenChange={() => { setSelectedQueueItem(null); setQueueAction(null); setRejectionReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {queueAction === "approved" ? "Approve Item" : "Reject Item"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {queueAction === "approved" 
                ? "This will approve the item and make it live."
                : "This will reject the item. Please provide a reason."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {queueAction === "rejected" && (
            <Textarea
              placeholder="Rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleQueueAction}
              className={queueAction === "rejected" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {reviewQueueMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {queueAction === "approved" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
