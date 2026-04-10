import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Tag,
  DollarSign,
  ExternalLink,
} from "lucide-react";

export default function Events() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const PAGE_SIZE = 25;

  const { data: stats } = trpc.events.getStats.useQuery();
  const { data, isLoading, refetch } = trpc.events.getAll.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: eventDetail } = trpc.events.getById.useQuery(
    { id: selectedEvent! },
    { enabled: !!selectedEvent }
  );

  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Event updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Event deleted");
      setDeleteId(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const events = data?.events || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground">Manage events created by users and businesses</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{stats.published}</div>
              <p className="text-xs text-muted-foreground">Published</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-500">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Draft</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{stats.scheduled}</div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Events ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No events found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event: any) => (
                  <TableRow key={event.id} className="cursor-pointer" onClick={() => setSelectedEvent(event.id)}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>
                      {event.event_category && <Badge variant="outline">{event.event_category}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {event.city ? `${event.city}, ${event.region || ""}` : event.formatted_address || "-"}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(event.start_datetime)}</TableCell>
                    <TableCell>
                      {event.is_free ? (
                        <Badge className="bg-green-500/20 text-green-400">Free</Badge>
                      ) : event.price_min ? (
                        <span className="text-sm">${event.price_min}{event.price_max ? ` - $${event.price_max}` : ""}</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          event.status === "published" ? "bg-green-500/20 text-green-400" :
                          event.status === "draft" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        }
                      >
                        {event.status || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        {event.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: event.id, updates: { status: "published" } })}
                          >
                            Publish
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteId(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{eventDetail?.name || "Event Details"}</DialogTitle>
            <DialogDescription>{eventDetail?.event_category || ""}</DialogDescription>
          </DialogHeader>

          {eventDetail && (
            <div className="space-y-4">
              {eventDetail.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm mt-1">{eventDetail.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Start</label>
                  <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> {formatDate(eventDetail.start_datetime)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">End</label>
                  <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> {formatDate(eventDetail.end_datetime)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /> {eventDetail.formatted_address || `${eventDetail.city || ""}, ${eventDetail.region || ""}`}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Price</label>
                  <p className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4" />
                    {eventDetail.is_free ? "Free" : eventDetail.price_min ? `$${eventDetail.price_min} - $${eventDetail.price_max || eventDetail.price_min}` : "Not set"}
                  </p>
                </div>
              </div>

              {eventDetail.tags && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(eventDetail.tags) ? eventDetail.tags : []).map((tag: string, i: number) => (
                      <Badge key={i} variant="outline"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {eventDetail.ticket_url && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ticket URL</label>
                  <p className="flex items-center gap-2 text-sm text-blue-400">
                    <ExternalLink className="h-4 w-4" /> {eventDetail.ticket_url}
                  </p>
                </div>
              )}

              {eventDetail.organizer_name && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Organizer</label>
                  <p className="text-sm">{eventDetail.organizer_name} {eventDetail.organizer_contact ? `(${eventDetail.organizer_contact})` : ""}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Created: {formatDate(eventDetail.created_at)} |
                Created by: {eventDetail.created_by || "Unknown"} |
                Recurring: {eventDetail.is_recurring ? "Yes" : "No"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this event. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? "Deleting..." : "Delete Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
