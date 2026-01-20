import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Plus,
  MapPin,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";

type OverrideStatus = "pending" | "approved" | "rejected";

const statusConfig: Record<OverrideStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Pending Review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const commonFields = [
  { value: "name", label: "Business Name" },
  { value: "address", label: "Address" },
  { value: "phone", label: "Phone Number" },
  { value: "website", label: "Website" },
  { value: "hours", label: "Business Hours" },
  { value: "category", label: "Category" },
  { value: "description", label: "Description" },
  { value: "price_level", label: "Price Level" },
  { value: "latitude", label: "Latitude" },
  { value: "longitude", label: "Longitude" },
];

export default function Overrides() {
  const [activeTab, setActiveTab] = useState<OverrideStatus | "all">("pending");
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approved" | "rejected" | null>(null);
  
  // Create override form state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOverride, setNewOverride] = useState({
    placeId: "",
    fieldName: "",
    overrideValue: "",
    overrideReason: "",
  });

  // Search/filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    placeId: "",
    fieldName: "",
    createdBy: "",
  });

  const { data: overrides, isLoading, refetch } = trpc.overrides.getAll.useQuery(
    activeTab === "all" ? undefined : { status: activeTab }
  );

  // Filter overrides client-side
  const filteredOverrides = useMemo(() => {
    if (!overrides) return [];
    return overrides.filter(override => {
      if (filters.placeId && !override.place_id?.toLowerCase().includes(filters.placeId.toLowerCase())) return false;
      if (filters.fieldName && override.field_name !== filters.fieldName) return false;
      if (filters.createdBy && !override.override_by?.toLowerCase().includes(filters.createdBy.toLowerCase())) return false;
      return true;
    });
  }, [overrides, filters]);

  const hasActiveFilters = Object.values(filters).some(v => v.length > 0);
  const activeFilterCount = Object.values(filters).filter(v => v.length > 0).length;

  const handleClearFilters = () => {
    setFilters({
      placeId: "",
      fieldName: "",
      createdBy: "",
    });
  };

  const createMutation = trpc.overrides.create.useMutation({
    onSuccess: () => {
      toast.success("Override created successfully");
      refetch();
      setCreateDialogOpen(false);
      setNewOverride({ placeId: "", fieldName: "", overrideValue: "", overrideReason: "" });
    },
    onError: (error) => {
      toast.error(`Failed to create override: ${error.message}`);
    },
  });

  const reviewMutation = trpc.overrides.review.useMutation({
    onSuccess: () => {
      toast.success(`Override ${actionType} successfully`);
      refetch();
      setSelectedOverride(null);
      setActionType(null);
    },
    onError: (error) => {
      toast.error(`Failed to review override: ${error.message}`);
    },
  });

  const handleCreateOverride = () => {
    if (!newOverride.placeId || !newOverride.fieldName || !newOverride.overrideValue) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate(newOverride);
  };

  const handleReviewAction = () => {
    if (!selectedOverride || !actionType) return;
    reviewMutation.mutate({ id: selectedOverride, status: actionType });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Place Overrides</h1>
          <p className="text-muted-foreground">
            Manually correct place data with approval workflow
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Override
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Place Override</DialogTitle>
              <DialogDescription>
                Override a specific field for a place. This will require approval before taking effect.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="placeId">Place ID *</Label>
                <Input
                  id="placeId"
                  placeholder="Enter place UUID"
                  value={newOverride.placeId}
                  onChange={(e) => setNewOverride({ ...newOverride, placeId: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fieldName">Field to Override *</Label>
                <Select
                  value={newOverride.fieldName}
                  onValueChange={(v) => setNewOverride({ ...newOverride, fieldName: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonFields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="overrideValue">New Value *</Label>
                <Textarea
                  id="overrideValue"
                  placeholder="Enter the corrected value"
                  value={newOverride.overrideValue}
                  onChange={(e) => setNewOverride({ ...newOverride, overrideValue: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="overrideReason">Reason for Override</Label>
                <Textarea
                  id="overrideReason"
                  placeholder="Explain why this override is needed"
                  value={newOverride.overrideReason}
                  onChange={(e) => setNewOverride({ ...newOverride, overrideReason: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOverride} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Override
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-2 text-muted-foreground">
                  <RotateCcw className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            <CollapsibleContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Place ID</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by place ID..."
                      value={filters.placeId}
                      onChange={(e) => setFilters({ ...filters, placeId: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Field Name</Label>
                  <Select value={filters.fieldName} onValueChange={(v) => setFilters({ ...filters, fieldName: v === "all" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All fields" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Fields</SelectItem>
                      {commonFields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Created By</Label>
                  <Input
                    placeholder="Search by user ID..."
                    value={filters.createdBy}
                    onChange={(e) => setFilters({ ...filters, createdBy: e.target.value })}
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
          {filters.placeId && (
            <Badge variant="secondary" className="gap-1">
              Place: {filters.placeId}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, placeId: "" })} />
            </Badge>
          )}
          {filters.fieldName && (
            <Badge variant="secondary" className="gap-1">
              Field: {commonFields.find(f => f.value === filters.fieldName)?.label || filters.fieldName}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, fieldName: "" })} />
            </Badge>
          )}
          {filters.createdBy && (
            <Badge variant="secondary" className="gap-1">
              By: {filters.createdBy}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, createdBy: "" })} />
            </Badge>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OverrideStatus | "all")}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOverrides && filteredOverrides.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredOverrides.length} of {overrides?.length || 0} overrides
              </p>
              <div className="grid gap-4">
                {filteredOverrides.map((override) => (
                  <Card key={override.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Edit3 className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {commonFields.find(f => f.value === override.field_name)?.label || override.field_name}
                            </CardTitle>
                            <CardDescription>
                              Created {formatDate(override.created_at)}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={statusConfig[override.status as OverrideStatus]?.variant || "secondary"}>
                          {override.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {override.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {override.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                          {statusConfig[override.status as OverrideStatus]?.label || override.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="text-xs text-muted-foreground">Place ID</span>
                            <p className="text-sm font-mono">{override.place_id}</p>
                          </div>
                        </div>

                        <div className="bg-muted p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground">New Value</span>
                          <p className="text-sm font-medium mt-1">{override.override_value}</p>
                        </div>

                        {override.override_reason && (
                          <div>
                            <span className="text-xs text-muted-foreground">Reason</span>
                            <p className="text-sm text-muted-foreground">{override.override_reason}</p>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Created by: {override.override_by}
                          {override.reviewed_by && (
                            <span> • Reviewed by: {override.reviewed_by}</span>
                          )}
                        </div>
                      </div>

                      {override.status === "pending" && (
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOverride(override.id);
                              setActionType("approved");
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedOverride(override.id);
                              setActionType("rejected");
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {override.reviewed_at && (
                        <div className="mt-4 text-xs text-muted-foreground">
                          Reviewed on {formatDate(override.reviewed_at)}
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
                <Edit3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? "No overrides match your filters" : "No overrides found"}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Override
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Action Dialog */}
      <AlertDialog open={!!selectedOverride && !!actionType} onOpenChange={() => { setSelectedOverride(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approved" ? "Approve Override" : "Reject Override"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approved"
                ? "This will approve the override and apply the change to the place data. This action will be logged."
                : "This will reject the override. The change will not be applied. This action will be logged."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReviewAction}
              className={actionType === "rejected" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {actionType === "approved" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
