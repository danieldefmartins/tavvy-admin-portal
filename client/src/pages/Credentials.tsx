import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  User,
  RefreshCw,
} from "lucide-react";

export default function Credentials() {
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);

  const { data: statsData } = trpc.badgeCredentials.getStats.useQuery();

  const { data, isLoading, refetch } = trpc.badgeCredentials.getAll.useQuery({
    status: tab,
    page,
    limit: 20,
  });

  const approveMutation = trpc.badgeCredentials.approve.useMutation({
    onSuccess: () => {
      toast.success("Badge approved — now visible on the public card");
      refetch();
    },
    onError: (err) => {
      toast.error(`Failed to approve: ${err.message}`);
    },
  });

  const rejectMutation = trpc.badgeCredentials.reject.useMutation({
    onSuccess: () => {
      toast.success("Badge rejected — badges have been turned off");
      refetch();
    },
    onError: (err) => {
      toast.error(`Failed to reject: ${err.message}`);
    },
  });

  const cards = data?.cards || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const getBadgeList = (card: any) => {
    const badges: string[] = [];
    if (card.show_licensed_badge) badges.push("Licensed");
    if (card.show_insured_badge) badges.push("Insured");
    if (card.show_bonded_badge) badges.push("Bonded");
    if (card.show_tavvy_verified_badge) badges.push("Tavvy Verified");
    return badges;
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 bg-yellow-500/10">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            Badge Credentials
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve professional badge requests from eCard users.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-yellow-500">{statsData.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-500">{statsData.approved}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-red-500">{statsData.rejected}</div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{statsData.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending {statsData?.pending ? `(${statsData.pending})` : ""}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : cards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {tab === "pending" ? "No pending badge reviews" : `No ${tab} badges`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card Owner</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Requested Badges</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card: any) => {
                    const badges = getBadgeList(card);
                    const isActioning = approveMutation.isPending || rejectMutation.isPending;
                    return (
                      <TableRow key={card.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              {card.profile_photo_url ? (
                                <AvatarImage src={card.profile_photo_url} />
                              ) : null}
                              <AvatarFallback>
                                <User className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">
                                {card.owner_name || card.full_name}
                              </div>
                              {card.owner_email && (
                                <div className="text-xs text-muted-foreground">
                                  {card.owner_email}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          /{card.slug}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {badges.map((b) => (
                              <Badge key={b} variant="secondary" className="text-xs">
                                {b}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {card.professional_category || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={card.badge_approval_status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(card.updated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {card.badge_approval_status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                                  onClick={() => approveMutation.mutate({ cardId: card.id })}
                                  disabled={isActioning}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs"
                                  onClick={() => rejectMutation.mutate({ cardId: card.id })}
                                  disabled={isActioning}
                                >
                                  <XCircle className="w-3 h-3 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            <a
                              href={`https://tavvy.com/${card.slug}?preview=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="ghost" className="h-7 text-xs">
                                <ExternalLink className="w-3 h-3 mr-1" /> View
                              </Button>
                            </a>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
