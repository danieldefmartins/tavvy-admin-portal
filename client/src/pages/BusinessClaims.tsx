import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Phone, 
  Mail, 
  MapPin,
  Loader2,
  AlertTriangle,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

type ClaimStatus = "pending" | "verified" | "rejected" | "expired";

const statusConfig: Record<ClaimStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  verified: { label: "Verified", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "outline", icon: <AlertTriangle className="h-3 w-3" /> },
};

export default function BusinessClaims() {
  const [activeTab, setActiveTab] = useState<ClaimStatus | "all">("pending");
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  
  // Search/filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    businessName: "",
    email: "",
    phone: "",
    userId: "",
    placeId: "",
  });

  const { data: claims, isLoading, refetch } = trpc.businessClaims.getAll.useQuery(
    activeTab === "all" ? undefined : { status: activeTab }
  );

  // Filter claims client-side
  const filteredClaims = useMemo(() => {
    if (!claims) return [];
    
    return claims.filter(claim => {
      if (filters.businessName && !claim.business_name?.toLowerCase().includes(filters.businessName.toLowerCase())) {
        return false;
      }
      if (filters.email && !claim.business_email?.toLowerCase().includes(filters.email.toLowerCase())) {
        return false;
      }
      if (filters.phone && !claim.business_phone?.includes(filters.phone)) {
        return false;
      }
      if (filters.userId && !claim.user_id?.toLowerCase().includes(filters.userId.toLowerCase())) {
        return false;
      }
      if (filters.placeId && !claim.place_id?.toLowerCase().includes(filters.placeId.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [claims, filters]);

  const hasActiveFilters = Object.values(filters).some(v => v.length > 0);
  const activeFilterCount = Object.values(filters).filter(v => v.length > 0).length;

  const handleClearFilters = () => {
    setFilters({
      businessName: "",
      email: "",
      phone: "",
      userId: "",
      placeId: "",
    });
  };

  const approveMutation = trpc.businessClaims.approve.useMutation({
    onSuccess: () => {
      toast.success("Business claim approved successfully");
      refetch();
      setSelectedClaim(null);
      setActionType(null);
    },
    onError: (error) => {
      toast.error(`Failed to approve claim: ${error.message}`);
    },
  });

  const rejectMutation = trpc.businessClaims.reject.useMutation({
    onSuccess: () => {
      toast.success("Business claim rejected");
      refetch();
      setSelectedClaim(null);
      setActionType(null);
    },
    onError: (error) => {
      toast.error(`Failed to reject claim: ${error.message}`);
    },
  });

  const handleAction = () => {
    if (!selectedClaim || !actionType) return;
    
    if (actionType === "approve") {
      approveMutation.mutate({ id: selectedClaim });
    } else {
      rejectMutation.mutate({ id: selectedClaim });
    }
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
        <h1 className="text-3xl font-bold tracking-tight">Business Claims</h1>
        <p className="text-muted-foreground">
          Review and manage business ownership claims
        </p>
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
                  {showFilters ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-2 text-muted-foreground">
                  <RotateCcw className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            <CollapsibleContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={filters.businessName}
                      onChange={(e) => setFilters({ ...filters, businessName: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email..."
                      value={filters.email}
                      onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by phone..."
                      value={filters.phone}
                      onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input
                    placeholder="Search by user ID..."
                    value={filters.userId}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Place ID</Label>
                  <Input
                    placeholder="Search by place ID..."
                    value={filters.placeId}
                    onChange={(e) => setFilters({ ...filters, placeId: e.target.value })}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.businessName && (
            <Badge variant="secondary" className="gap-1">
              Name: {filters.businessName}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, businessName: "" })} />
            </Badge>
          )}
          {filters.email && (
            <Badge variant="secondary" className="gap-1">
              Email: {filters.email}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, email: "" })} />
            </Badge>
          )}
          {filters.phone && (
            <Badge variant="secondary" className="gap-1">
              Phone: {filters.phone}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, phone: "" })} />
            </Badge>
          )}
          {filters.userId && (
            <Badge variant="secondary" className="gap-1">
              User: {filters.userId}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, userId: "" })} />
            </Badge>
          )}
          {filters.placeId && (
            <Badge variant="secondary" className="gap-1">
              Place: {filters.placeId}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, placeId: "" })} />
            </Badge>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ClaimStatus | "all")}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClaims && filteredClaims.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredClaims.length} of {claims?.length || 0} claims
              </p>
              <div className="grid gap-4">
                {filteredClaims.map((claim) => (
                  <Card key={claim.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{claim.business_name}</CardTitle>
                            <CardDescription>
                              Submitted {formatDate(claim.created_at)}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={statusConfig[claim.status as ClaimStatus]?.variant || "secondary"}>
                          {statusConfig[claim.status as ClaimStatus]?.icon}
                          <span className="ml-1">{statusConfig[claim.status as ClaimStatus]?.label || claim.status}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {claim.business_phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{claim.business_phone}</span>
                          </div>
                        )}
                        {claim.business_email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{claim.business_email}</span>
                          </div>
                        )}
                        {claim.business_address && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{claim.business_address}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>User ID: {claim.user_id}</span>
                        {claim.place_id && <span>• Place ID: {claim.place_id}</span>}
                        <span>• Verification attempts: {claim.verification_attempts}</span>
                      </div>

                      {claim.status === "pending" && (
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedClaim(claim.id);
                              setActionType("approve");
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedClaim(claim.id);
                              setActionType("reject");
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {claim.verified_at && (
                        <div className="mt-4 text-xs text-green-600">
                          Verified on {formatDate(claim.verified_at)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? "No claims match your filters" : "No business claims found"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!selectedClaim && !!actionType} onOpenChange={() => { setSelectedClaim(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "Approve Business Claim" : "Reject Business Claim"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approve"
                ? "This will verify the business claim and grant the user ownership privileges. This action will be logged."
                : "This will reject the business claim. The user will be notified. This action will be logged."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={actionType === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {approveMutation.isPending || rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {actionType === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
