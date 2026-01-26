import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { 
  FileText,
  Trash2,
  Edit,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ContentDraft {
  id: string;
  user_id: string;
  status: string;
  current_step: number;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
  content_type: string | null;
  content_subtype: string | null;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft_location: { label: "Location", variant: "outline" },
  draft_type_selected: { label: "Type Selected", variant: "secondary" },
  draft_subtype_selected: { label: "Subtype Selected", variant: "secondary" },
  draft_details: { label: "Details", variant: "default" },
  draft_review: { label: "Ready for Review", variant: "default" },
  submitted: { label: "Submitted", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  business: "Business",
  event: "Event",
  rv_campground: "RV & Campground",
  quick_add: "Quick Add",
  universe: "Universe",
  city: "City",
};

export default function Drafts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch all drafts
  const { data, isLoading, refetch } = trpc.drafts.list.useQuery({
    limit: 100,
  });
  const drafts = data?.drafts || [];

  // Delete mutation
  const deleteMutation = trpc.drafts.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Draft deleted",
        description: "The draft has been permanently deleted.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete draft",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync({ id });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (draft: ContentDraft) => {
    // Navigate to edit page with draft data
    // For now, we'll navigate to CreatePlace with draft ID
    setLocation(`/create-place?draft=${draft.id}`);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_BADGES[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getContentTypeLabel = (type: string | null) => {
    if (!type) return "Not set";
    return CONTENT_TYPE_LABELS[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Drafts</h1>
          <p className="text-muted-foreground">
            Manage incomplete content submissions from users
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drafts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drafts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for Review</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drafts?.filter(d => d.status === 'draft_review').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drafts?.filter(d => !['draft_review', 'submitted', 'failed'].includes(d.status)).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drafts?.filter(d => d.status === 'failed').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drafts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Drafts</CardTitle>
          <CardDescription>
            View and manage content drafts from all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!drafts || drafts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No drafts found</h3>
              <p className="text-muted-foreground">
                Content drafts will appear here when users start adding places.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((draft) => (
                  <TableRow key={draft.id}>
                    <TableCell>{getStatusBadge(draft.status)}</TableCell>
                    <TableCell>{getContentTypeLabel(draft.content_type)}</TableCell>
                    <TableCell className="font-medium">
                      {draft.data?.name || <span className="text-muted-foreground">Unnamed</span>}
                    </TableCell>
                    <TableCell>
                      {draft.formatted_address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">{draft.formatted_address}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No location</span>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(draft.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(draft.updated_at), "MMM d, h:mm a")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(draft)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. The draft will be permanently deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(draft.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                {deletingId === draft.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Delete"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
