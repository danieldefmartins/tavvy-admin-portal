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
import {
  Inbox,
  MapPin,
  Phone,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
  FileText,
  Handshake,
} from "lucide-react";

export default function Leads() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const PAGE_SIZE = 25;

  const { data: stats } = trpc.leads.getStats.useQuery();
  const { data, isLoading } = trpc.leads.getAll.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: requestDetail } = trpc.leads.getById.useQuery(
    { id: selectedRequest! },
    { enabled: !!selectedRequest }
  );

  const { data: bids } = trpc.leads.getBids.useQuery(
    { requestId: selectedRequest! },
    { enabled: !!selectedRequest }
  );

  const requests = data?.requests || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leads & Service Requests</h1>
        <p className="text-muted-foreground">Monitor project requests from consumers and bids from professionals</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{stats.openRequests}</div>
              <p className="text-xs text-muted-foreground">Open Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{stats.totalBids}</div>
              <p className="text-xs text-muted-foreground">Total Bids</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-500">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">Total Leads</p>
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
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Service Requests ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No service requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req: any) => (
                  <TableRow key={req.id} className="cursor-pointer" onClick={() => setSelectedRequest(req.id)}>
                    <TableCell className="font-medium">{req.customer_name || "Anonymous"}</TableCell>
                    <TableCell className="text-sm">
                      {req.city ? `${req.city}, ${req.state || ""}` : req.zip_code || "-"}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{req.description || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          req.status === "open" ? "bg-green-500/20 text-green-400" :
                          req.status === "matched" ? "bg-blue-500/20 text-blue-400" :
                          req.status === "completed" ? "bg-muted text-muted-foreground" :
                          "bg-red-500/20 text-red-400"
                        }
                      >
                        {req.status || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(req.created_at)}</TableCell>
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

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Request Details</DialogTitle>
            <DialogDescription>
              {requestDetail?.customer_name || "Anonymous"} - {requestDetail?.status || ""}
            </DialogDescription>
          </DialogHeader>

          {requestDetail && (
            <div className="space-y-4">
              {/* Customer Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Customer</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Name</label>
                    <p className="text-sm">{requestDetail.customer_name || "Anonymous"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Email</label>
                    <p className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3" /> {requestDetail.customer_email || "-"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Phone</label>
                    <p className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" /> {requestDetail.customer_phone || "-"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Location</label>
                    <p className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3" /> {requestDetail.city}, {requestDetail.state} {requestDetail.zip_code}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Request Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Request</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {requestDetail.description && (
                    <div>
                      <label className="text-xs text-muted-foreground">Description</label>
                      <p className="text-sm">{requestDetail.description}</p>
                    </div>
                  )}
                  {requestDetail.dynamic_answers && (
                    <div>
                      <label className="text-xs text-muted-foreground">Answers</label>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(requestDetail.dynamic_answers, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Privacy</label>
                      <p className="text-sm">{requestDetail.privacy_preference || "-"}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Anonymous</label>
                      <p className="text-sm">{requestDetail.is_anonymous_submission ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bids */}
              {bids && bids.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Handshake className="h-4 w-4" /> Bids ({bids.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {bids.map((bid: any) => (
                        <div key={bid.id} className="flex items-center justify-between border rounded p-3">
                          <div>
                            <p className="text-sm font-medium">Pro: {bid.pro_id}</p>
                            <p className="text-xs text-muted-foreground">{bid.message || "No message"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              ${bid.estimate_min} - ${bid.estimate_max}
                            </p>
                            <Badge variant="outline">{bid.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="text-xs text-muted-foreground">
                Created: {formatDate(requestDetail.created_at)} |
                User ID: {requestDetail.user_id} |
                Category ID: {requestDetail.category_id}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
