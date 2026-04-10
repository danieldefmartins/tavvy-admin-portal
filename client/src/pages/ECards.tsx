import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CreditCard,
  Search,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Phone,
  User,
  Building,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3,
} from "lucide-react";

export default function ECards() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const PAGE_SIZE = 25;

  const { data: stats } = trpc.digitalCards.getStats.useQuery();
  const { data, isLoading, refetch } = trpc.digitalCards.getAll.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: search || undefined,
  });

  const { data: cardDetail } = trpc.digitalCards.getById.useQuery(
    { id: selectedCard! },
    { enabled: !!selectedCard }
  );

  const { data: cardLinks } = trpc.digitalCards.getLinks.useQuery(
    { cardId: selectedCard! },
    { enabled: !!selectedCard }
  );

  const toggleActive = trpc.digitalCards.update.useMutation({
    onSuccess: () => {
      toast.success("Card updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.digitalCards.delete.useMutation({
    onSuccess: () => {
      toast.success("Card deleted");
      setDeleteId(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const cards = data?.cards || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">eCards / Digital Cards</h1>
        <p className="text-muted-foreground">Manage all digital business cards created by users and pros</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Cards</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{stats.published}</div>
              <p className="text-xs text-muted-foreground">Published</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalLinks}</div>
              <p className="text-xs text-muted-foreground">Total Links</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-500">{stats.endorsements}</div>
              <p className="text-xs text-muted-foreground">Endorsements</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, email, or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Digital Cards ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No digital cards found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card: any) => (
                  <TableRow key={card.id} className="cursor-pointer" onClick={() => setSelectedCard(card.id)}>
                    <TableCell className="font-medium">{card.full_name || "-"}</TableCell>
                    <TableCell>{card.company || "-"}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{card.slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{card.card_type || "standard"}</Badge>
                    </TableCell>
                    <TableCell>{card.view_count || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {card.is_active ? (
                          <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                        {card.is_published && (
                          <Badge className="bg-blue-500/20 text-blue-400">Published</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {card.created_at ? new Date(card.created_at).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            toggleActive.mutate({
                              id: card.id,
                              updates: { is_active: !card.is_active },
                            })
                          }
                          title={card.is_active ? "Deactivate" : "Activate"}
                        >
                          {card.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteId(card.id)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} ({total} total)
              </p>
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

      {/* Card Detail Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Card Details</DialogTitle>
            <DialogDescription>
              {cardDetail?.full_name} - {cardDetail?.company || "No company"}
            </DialogDescription>
          </DialogHeader>

          {cardDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="flex items-center gap-2"><User className="h-4 w-4" /> {cardDetail.full_name || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="flex items-center gap-2"><Building className="h-4 w-4" /> {cardDetail.company || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {cardDetail.email || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {cardDetail.phone || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Website</label>
                  <p className="flex items-center gap-2"><Globe className="h-4 w-4" /> {cardDetail.website || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Slug</label>
                  <p><code className="text-sm bg-muted px-2 py-1 rounded">{cardDetail.slug}</code></p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Card Type</label>
                  <p><Badge variant="outline">{cardDetail.card_type || "standard"}</Badge></p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Views / Taps</label>
                  <p className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {cardDetail.view_count || 0} views, {cardDetail.tap_count || 0} taps
                  </p>
                </div>
              </div>

              {cardDetail.title && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p>{cardDetail.title}</p>
                </div>
              )}

              {cardDetail.bio && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bio</label>
                  <p className="text-sm">{cardDetail.bio}</p>
                </div>
              )}

              {/* Badges */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Credential Badges</label>
                <div className="flex gap-2 mt-1">
                  {cardDetail.show_licensed_badge && <Badge>Licensed</Badge>}
                  {cardDetail.show_insured_badge && <Badge>Insured</Badge>}
                  {cardDetail.show_bonded_badge && <Badge>Bonded</Badge>}
                  {cardDetail.show_tavvy_verified_badge && <Badge className="bg-blue-500">Tavvy Verified</Badge>}
                  {cardDetail.badge_approval_status && (
                    <Badge variant="outline">Badge Status: {cardDetail.badge_approval_status}</Badge>
                  )}
                </div>
              </div>

              {/* Links */}
              {cardLinks && cardLinks.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Links ({cardLinks.length})</label>
                  <div className="mt-1 space-y-1">
                    {cardLinks.map((link: any) => (
                      <div key={link.id} className="flex items-center gap-2 text-sm">
                        <ExternalLink className="h-3 w-3" />
                        <span className="font-medium">{link.title || link.platform}</span>
                        <span className="text-muted-foreground truncate">{link.url || link.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Socials */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Social Media</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {cardDetail.social_instagram && <Badge variant="outline">IG: {cardDetail.social_instagram}</Badge>}
                  {cardDetail.social_facebook && <Badge variant="outline">FB: {cardDetail.social_facebook}</Badge>}
                  {cardDetail.social_linkedin && <Badge variant="outline">LI: {cardDetail.social_linkedin}</Badge>}
                  {cardDetail.social_twitter && <Badge variant="outline">X: {cardDetail.social_twitter}</Badge>}
                  {cardDetail.social_tiktok && <Badge variant="outline">TT: {cardDetail.social_tiktok}</Badge>}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Created: {new Date(cardDetail.created_at).toLocaleString()} |
                Updated: {cardDetail.updated_at ? new Date(cardDetail.updated_at).toLocaleString() : "Never"} |
                User ID: {cardDetail.user_id}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Digital Card</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this card and all associated links. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Card"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
