import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, Lightbulb, Loader2, PencilLine, X } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "Electronics", cars: "Cars", handbags_fashion: "Handbags & fashion",
  home_appliances: "Home & appliances", beauty: "Beauty & skincare", other: "Something else",
};
const FIELD_LABELS: Record<string, string> = {
  name: "Name", tavvy_category: "Category", phone: "Phone", website: "Website",
  street: "Street", city: "City", region: "State", postcode: "ZIP",
};

type Tab = "wishlist" | "edits";

/** Customer feedback: survey answers from the Tools screen and member-suggested edits to places. */
export default function Feedback() {
  const [tab, setTab] = useState<Tab>("wishlist");
  const [editStatus, setEditStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const { toast } = useToast();
  const wishlist = trpc.feedback.wishlist.useQuery({ limit: 300 }, { enabled: tab === "wishlist" });
  const edits = trpc.feedback.edits.useQuery({ status: editStatus }, { enabled: tab === "edits" });
  const review = trpc.feedback.reviewEdit.useMutation({
    onSuccess: (_r, vars) => { toast({ title: vars.decision === "approved" ? "Changes applied to the place" : "Suggestion rejected" }); edits.refetch(); },
    onError: (e) => toast({ title: "Could not review", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer feedback</h1>
          <p className="text-muted-foreground text-sm">What people want to review next, and the changes they suggest to existing places.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === "wishlist" ? "default" : "outline"} onClick={() => setTab("wishlist")}><Lightbulb className="h-4 w-4 mr-2" />Review wishlist</Button>
          <Button variant={tab === "edits" ? "default" : "outline"} onClick={() => setTab("edits")}><PencilLine className="h-4 w-4 mr-2" />Suggested edits</Button>
        </div>
      </div>

      {tab === "wishlist" && (
        <Card>
          <CardHeader>
            <CardTitle>“What places are you missing?”</CardTitle>
            <CardDescription>
              {wishlist.data ? `${wishlist.data.total} answers` : "Loading…"}
              {wishlist.data && Object.keys(wishlist.data.counts).length > 0 && (
                <span className="ml-3 inline-flex flex-wrap gap-2 align-middle">
                  {Object.entries(wishlist.data.counts).sort((a, b) => b[1] - a[1]).map(([key, n]) => (
                    <Badge key={key} variant="secondary">{CATEGORY_LABELS[key] ?? key}: {n}</Badge>
                  ))}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {wishlist.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Platform</TableHead><TableHead>Would review</TableHead><TableHead>Missing on Tavvy</TableHead><TableHead>Other</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(wishlist.data?.rows ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(row.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell><Badge variant="outline">{row.platform}</Badge></TableCell>
                      <TableCell className="space-x-1">{((row.product_categories as string[]) ?? []).map((c) => <Badge key={c} variant="secondary">{CATEGORY_LABELS[c] ?? c}</Badge>)}</TableCell>
                      <TableCell className="max-w-md whitespace-pre-wrap">{row.missing_places ?? ""}</TableCell>
                      <TableCell className="max-w-xs whitespace-pre-wrap">{row.other_text ?? ""}</TableCell>
                    </TableRow>
                  ))}
                  {wishlist.data && wishlist.data.rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No answers yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "edits" && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested edits to places</CardTitle>
            <CardDescription>Members propose corrections from the add-a-place flow. Approving applies the fields to the place.</CardDescription>
            <div className="flex gap-2 pt-2">
              {(["pending", "approved", "rejected", "all"] as const).map((s) => (
                <Button key={s} size="sm" variant={editStatus === s ? "default" : "outline"} onClick={() => setEditStatus(s)}>{s}</Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {edits.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Place</TableHead><TableHead>Proposed changes</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {(edits.data ?? []).map((row: any) => {
                    const place = row.places;
                    const changes = (row.suggested_changes ?? {}) as Record<string, string>;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(row.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <div className="font-medium">{place?.name ?? row.place_id}</div>
                          <div className="text-xs text-muted-foreground">{[place?.street, place?.city, place?.region].filter(Boolean).join(", ")}</div>
                        </TableCell>
                        <TableCell>
                          <ul className="text-sm space-y-1">
                            {Object.entries(changes).map(([key, value]) => (
                              <li key={key}><span className="text-muted-foreground">{FIELD_LABELS[key] ?? key}:</span> <span className="line-through opacity-60">{place?.[key] ?? "—"}</span> → <strong>{value}</strong></li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-pre-wrap">{row.reason ?? ""}{row.review_notes ? <div className="text-xs text-muted-foreground mt-1">{row.review_notes}</div> : null}</TableCell>
                        <TableCell><Badge variant={row.status === "pending" ? "outline" : row.status === "approved" ? "default" : "destructive"}>{row.status}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap space-x-2">
                          {row.status === "pending" && (
                            <>
                              <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: row.id, decision: "approved" })}><Check className="h-4 w-4 mr-1" />Approve</Button>
                              <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: row.id, decision: "rejected" })}><X className="h-4 w-4 mr-1" />Reject</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {edits.data && edits.data.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nothing here.</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
