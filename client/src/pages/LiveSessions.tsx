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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Radio,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  StopCircle,
  User,
} from "lucide-react";

export default function LiveSessions() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const PAGE_SIZE = 25;

  const { data: stats } = trpc.liveSessions.getStats.useQuery();
  const { data, isLoading, refetch } = trpc.liveSessions.getAll.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: sessionDetail } = trpc.liveSessions.getById.useQuery(
    { id: selectedSession! },
    { enabled: !!selectedSession }
  );

  const endMutation = trpc.liveSessions.end.useMutation({
    onSuccess: () => {
      toast.success("Session ended");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const sessions = data?.sessions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Sessions</h1>
        <p className="text-muted-foreground">Monitor active and past live sessions from mobile businesses</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">{stats.ended}</div>
              <p className="text-xs text-muted-foreground">Ended</p>
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Live Sessions ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No live sessions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Scheduled End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session: any) => (
                  <TableRow key={session.id} className="cursor-pointer" onClick={() => setSelectedSession(session.id)}>
                    <TableCell className="font-medium">{session.location_label || "Unknown Location"}</TableCell>
                    <TableCell className="text-sm">{session.session_address || "-"}</TableCell>
                    <TableCell className="text-sm">{formatDate(session.started_at)}</TableCell>
                    <TableCell className="text-sm">{formatDate(session.scheduled_end_at)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          session.status === "active" ? "bg-green-500/20 text-green-400" :
                          session.status === "ended" ? "bg-muted text-muted-foreground" :
                          "bg-red-500/20 text-red-400"
                        }
                      >
                        {session.status === "active" && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                        {session.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {session.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-400"
                          onClick={() => endMutation.mutate({ id: session.id })}
                          disabled={endMutation.isPending}
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                          End
                        </Button>
                      )}
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

      {/* Session Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>{sessionDetail?.location_label || ""}</DialogDescription>
          </DialogHeader>

          {sessionDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /> {sessionDetail.session_address || sessionDetail.location_label || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Coordinates</label>
                  <p className="text-sm">{sessionDetail.session_lat}, {sessionDetail.session_lng}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Started</label>
                  <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> {formatDate(sessionDetail.started_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Scheduled End</label>
                  <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> {formatDate(sessionDetail.scheduled_end_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Started By</label>
                  <p className="flex items-center gap-2 text-sm"><User className="h-4 w-4" /> {sessionDetail.started_by || "Unknown"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p><Badge>{sessionDetail.status}</Badge></p>
                </div>
              </div>

              {sessionDetail.today_note && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Today's Note</label>
                  <p className="text-sm mt-1">{sessionDetail.today_note}</p>
                </div>
              )}

              {sessionDetail.disabled_reason && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Disabled Reason</label>
                  <p className="text-sm text-red-400">{sessionDetail.disabled_reason}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Place ID: {sessionDetail.place_id || sessionDetail.tavvy_place_id || "None"} |
                Actual End: {formatDate(sessionDetail.actual_end_at)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
