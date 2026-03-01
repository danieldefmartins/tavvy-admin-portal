import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  Search,
  MoreVertical,
  BadgeCheck,
  XCircle,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Eye,
  Power,
  PowerOff,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Home,
  Wrench,
  Clock,
  Users,
  UserCheck,
  Save,
  Pencil,
  MessageSquare,
} from "lucide-react";

interface MatchRequest {
  id: string;
  user_id: string | null;
  looking_to: string | null;
  property_type: string | null;
  location: string | null;
  timeline: string | null;
  price_range: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  created_at: string;
  match_count?: number;
}

export default function Providers() {
  const { toast: toastHook } = useToast();
  const [activeTab, setActiveTab] = useState("providers");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedProId, setSelectedProId] = useState<string | null>(null);
  const [showProDialog, setShowProDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [filterType, setFilterType] = useState<string>("all");
  const [filterVerified, setFilterVerified] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const limit = 50;

  // Match Requests State
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([]);
  const [matchRequestsLoading, setMatchRequestsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MatchRequest | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [matchStats, setMatchStats] = useState({
    pendingRequests: 0,
    matchedRequests: 0,
  });

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.pros.getStats.useQuery();
  const { data: providerTypes } = trpc.pros.getProviderTypes.useQuery();
  const { data: prosData, isLoading: prosLoading, refetch: refetchPros } = trpc.pros.getAll.useQuery({
    limit,
    offset: page * limit,
    search: debouncedSearch || undefined,
    providerType: filterType !== "all" ? filterType : undefined,
    isVerified: filterVerified !== "all" ? filterVerified === "verified" : undefined,
    isActive: filterActive !== "all" ? filterActive === "active" : undefined,
  });
  const { data: selectedPro, isLoading: proLoading, refetch: refetchSelectedPro } = trpc.pros.getById.useQuery(
    { id: selectedProId! },
    { enabled: !!selectedProId }
  );
  const { data: proReviews } = trpc.pros.getReviews.useQuery(
    { proId: selectedProId! },
    { enabled: !!selectedProId }
  );

  // Mutations
  const updateMutation = trpc.pros.update.useMutation({
    onSuccess: () => {
      toast.success("Provider updated successfully");
      setIsEditing(false);
      refetchSelectedPro();
      refetchPros();
    },
    onError: (error) => toast.error(`Failed to update: ${error.message}`),
  });

  const verifyMutation = trpc.pros.verify.useMutation({
    onSuccess: () => {
      toast.success("Provider verified successfully");
      refetchPros();
      refetchSelectedPro();
    },
    onError: (error) => toast.error(`Failed to verify: ${error.message}`),
  });

  const unverifyMutation = trpc.pros.unverify.useMutation({
    onSuccess: () => {
      toast.success("Provider verification removed");
      refetchPros();
      refetchSelectedPro();
    },
    onError: (error) => toast.error(`Failed to unverify: ${error.message}`),
  });

  const activateMutation = trpc.pros.activate.useMutation({
    onSuccess: () => {
      toast.success("Provider activated successfully");
      refetchPros();
      refetchSelectedPro();
    },
    onError: (error) => toast.error(`Failed to activate: ${error.message}`),
  });

  const deactivateMutation = trpc.pros.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Provider deactivated");
      refetchPros();
      refetchSelectedPro();
    },
    onError: (error) => toast.error(`Failed to deactivate: ${error.message}`),
  });

  const featureMutation = trpc.pros.feature.useMutation({
    onSuccess: () => {
      toast.success("Provider featured successfully");
      refetchPros();
      refetchSelectedPro();
    },
    onError: (error) => toast.error(`Failed to feature: ${error.message}`),
  });

  const unfeatureMutation = trpc.pros.unfeature.useMutation({
    onSuccess: () => {
      toast.success("Provider unfeatured");
      refetchPros();
      refetchSelectedPro();
    },
    onError: (error) => toast.error(`Failed to unfeature: ${error.message}`),
  });

  // Fetch Match Requests
  const fetchMatchRequests = async () => {
    setMatchRequestsLoading(true);
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('realtor_match_requests')
        .select(`
          *,
          realtor_matches(count)
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      const requestsWithCounts = (requestsData || []).map(req => ({
        ...req,
        match_count: req.realtor_matches?.[0]?.count || 0
      }));
      setMatchRequests(requestsWithCounts);

      const pending = requestsWithCounts.filter(r => r.status === 'pending').length;
      const matched = requestsWithCounts.filter(r => r.status === 'matched').length;

      setMatchStats({
        pendingRequests: pending,
        matchedRequests: matched,
      });

    } catch (error: any) {
      console.error('Error fetching match requests:', error);
    } finally {
      setMatchRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchRequests();
  }, []);

  // When selectedPro loads, populate the edit form
  useEffect(() => {
    if (selectedPro) {
      setEditForm({
        business_name: selectedPro.business_name || "",
        first_name: selectedPro.first_name || "",
        last_name: selectedPro.last_name || "",
        email: selectedPro.email || "",
        phone: selectedPro.phone || "",
        website: selectedPro.website || "",
        whatsapp_number: selectedPro.whatsapp_number || "",
        description: selectedPro.description || "",
        short_description: selectedPro.short_description || "",
        bio: selectedPro.bio || "",
        address: selectedPro.address || "",
        city: selectedPro.city || "",
        state: selectedPro.state || "",
        zip_code: selectedPro.zip_code || "",
        provider_type: selectedPro.provider_type || "pro",
        trade_category: selectedPro.trade_category || "",
        license_number: selectedPro.license_number || "",
        service_radius: selectedPro.service_radius || 25,
        years_in_business: selectedPro.years_in_business || "",
        years_experience: selectedPro.years_experience || "",
        brokerage_name: selectedPro.brokerage_name || "",
        mls_id: selectedPro.mls_id || "",
      });
    }
  }, [selectedPro]);

  const handleSearch = () => {
    setDebouncedSearch(searchQuery);
    setPage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleViewPro = (proId: string) => {
    setSelectedProId(proId);
    setIsEditing(false);
    setShowProDialog(true);
  };

  const handleSaveEdits = () => {
    if (!selectedProId) return;
    // Only send changed fields
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(editForm)) {
      const original = (selectedPro as any)?.[key];
      const currentVal = value === "" ? null : value;
      const originalVal = original === undefined ? null : original;
      if (currentVal !== originalVal) {
        updates[key] = currentVal;
      }
    }
    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      setIsEditing(false);
      return;
    }
    updateMutation.mutate({ id: selectedProId, updates });
  };

  const handleRefresh = () => {
    refetchPros();
    fetchMatchRequests();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getProviderTypeIcon = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case "realtor":
        return <Home className="h-4 w-4" />;
      case "contractor":
        return <Wrench className="h-4 w-4" />;
      default:
        return <Briefcase className="h-4 w-4" />;
    }
  };

  const getProviderTypeColor = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case "realtor":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      case "contractor":
        return "bg-orange-500/10 text-orange-600 border-orange-500/30";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/30";
    }
  };

  const filteredRequests = matchRequests.filter(request => {
    const searchLower = searchQuery.toLowerCase();
    return (
      request.contact_name?.toLowerCase().includes(searchLower) ||
      request.contact_email?.toLowerCase().includes(searchLower) ||
      request.location?.toLowerCase().includes(searchLower)
    );
  });

  const pros = prosData?.providers || [];
  const totalPros = prosData?.total || 0;
  const totalPages = Math.ceil(totalPros / limit);

  // Helper renderers (not components — avoids remount on state change)
  const renderField = (label: string, field: string, type = "text", placeholder?: string) => (
    <div key={field}>
      <Label className="text-muted-foreground text-xs">{label}</Label>
      {isEditing ? (
        <Input
          type={type}
          value={editForm[field] || ""}
          onChange={(e) => setEditForm((f) => ({ ...f, [field]: type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value }))}
          placeholder={placeholder}
          className="mt-1"
        />
      ) : (
        <p className="font-medium text-sm mt-0.5">{(selectedPro as any)?.[field] || "Not set"}</p>
      )}
    </div>
  );

  const renderTextarea = (label: string, field: string, placeholder?: string) => (
    <div key={field}>
      <Label className="text-muted-foreground text-xs">{label}</Label>
      {isEditing ? (
        <Textarea
          value={editForm[field] || ""}
          onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
          placeholder={placeholder}
          className="mt-1"
          rows={3}
        />
      ) : (
        <p className="text-sm mt-0.5">{(selectedPro as any)?.[field] || "Not set"}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Providers</h1>
          <p className="text-muted-foreground">
            Manage professional service providers, verification, and match requests
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalPros?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <BadgeCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats?.verifiedPros?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Power className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{stats?.activePros?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{stats?.featuredPros?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realtors</CardTitle>
            <Home className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.realtors?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contractors</CardTitle>
            <Wrench className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.contractors?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {matchRequestsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{matchStats.pendingRequests}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {matchRequestsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-purple-600">{matchStats.matchedRequests}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="providers">
            <Briefcase className="mr-2 h-4 w-4" />
            All Providers ({totalPros})
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Users className="mr-2 h-4 w-4" />
            Match Requests ({matchRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, business, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {providerTypes?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterVerified} onValueChange={(v) => { setFilterVerified(v); setPage(0); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterActive} onValueChange={(v) => { setFilterActive(v); setPage(0); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch}>Search</Button>
              </div>
            </CardContent>
          </Card>

          {/* Providers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pro Providers</CardTitle>
              <CardDescription>
                {totalPros > 0 ? `Showing ${page * limit + 1}-${Math.min((page + 1) * limit, totalPros)} of ${totalPros} providers` : "No providers found"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prosLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : pros.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No providers found</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pros.map((pro: any) => (
                        <TableRow key={pro.id} className="cursor-pointer" onClick={() => handleViewPro(pro.id)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                {pro.logo_url || pro.profile_photo_url ? (
                                  <img
                                    src={pro.logo_url || pro.profile_photo_url || ""}
                                    alt=""
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {pro.business_name || `${pro.first_name || ""} ${pro.last_name || ""}`.trim() || "Unnamed"}
                                </p>
                                {pro.city && pro.state && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {pro.city}, {pro.state}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getProviderTypeColor(pro.provider_type)}>
                              {getProviderTypeIcon(pro.provider_type)}
                              <span className="ml-1 capitalize">{pro.provider_type || "Unknown"}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {pro.email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate max-w-[150px]">{pro.email}</span>
                                </div>
                              )}
                              {pro.phone && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <span>{pro.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {pro.average_rating ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-medium">{Number(pro.average_rating).toFixed(1)}</span>
                                <span className="text-muted-foreground text-sm">({pro.total_reviews || 0})</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No reviews</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {pro.is_verified && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                  <BadgeCheck className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                              {pro.is_active ? (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/30">
                                  Inactive
                                </Badge>
                              )}
                              {pro.is_featured && (
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatDate(pro.created_at)}</span>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewPro(pro.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { handleViewPro(pro.id); setTimeout(() => setIsEditing(true), 100); }}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Provider
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {pro.is_verified ? (
                                  <DropdownMenuItem onClick={() => unverifyMutation.mutate({ id: pro.id })}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Remove Verification
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => verifyMutation.mutate({ id: pro.id })}>
                                    <BadgeCheck className="h-4 w-4 mr-2" />
                                    Verify Provider
                                  </DropdownMenuItem>
                                )}
                                {pro.is_active ? (
                                  <DropdownMenuItem onClick={() => deactivateMutation.mutate({ id: pro.id })}>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => activateMutation.mutate({ id: pro.id })}>
                                    <Power className="h-4 w-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {pro.is_featured ? (
                                  <DropdownMenuItem onClick={() => unfeatureMutation.mutate({ id: pro.id })}>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Remove Featured
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => featureMutation.mutate({ id: pro.id })}>
                                    <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
                                    Feature Provider
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {page + 1} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(0, page - 1))}
                          disabled={page === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                          disabled={page >= totalPages - 1}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Match Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Realtor Match Requests</CardTitle>
              <CardDescription>
                Users looking for realtors to help with their property needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matchRequestsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No match requests found</p>
                  <p className="text-sm">Match requests will appear here when users submit them.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Looking For</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Matches</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.contact_name || 'Anonymous'}</p>
                            <p className="text-sm text-muted-foreground">{request.contact_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="capitalize">{request.looking_to || 'Not specified'}</p>
                            <p className="text-muted-foreground">{request.property_type}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {request.location || 'Not specified'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {request.timeline || 'Not specified'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === 'matched' ? 'default' :
                              request.status === 'pending' ? 'secondary' :
                              'outline'
                            }
                            className={
                              request.status === 'matched' ? 'bg-green-500' :
                              request.status === 'pending' ? 'bg-yellow-500' :
                              ''
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.match_count || 0} realtors
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(request.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRequestDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Provider Details / Edit Dialog */}
      <Dialog open={showProDialog} onOpenChange={(open) => { setShowProDialog(open); if (!open) setIsEditing(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {isEditing ? "Edit Provider" : "Provider Details"}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? "Update provider information and save changes" : "View and manage provider information"}
                </DialogDescription>
              </div>
              {selectedPro && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>

          {proLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : selectedPro ? (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                {/* Header with photo and badges */}
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {selectedPro.logo_url || selectedPro.profile_photo_url ? (
                      <img
                        src={selectedPro.logo_url || selectedPro.profile_photo_url || ""}
                        alt=""
                        className="h-20 w-20 object-cover"
                      />
                    ) : (
                      <Briefcase className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">
                      {selectedPro.business_name || `${selectedPro.first_name || ""} ${selectedPro.last_name || ""}`.trim() || "Unnamed"}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className={getProviderTypeColor(selectedPro.provider_type)}>
                        {getProviderTypeIcon(selectedPro.provider_type)}
                        <span className="ml-1 capitalize">{selectedPro.provider_type || "Unknown"}</span>
                      </Badge>
                      {selectedPro.is_verified && (
                        <Badge className="bg-green-500">
                          <BadgeCheck className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {selectedPro.is_featured && (
                        <Badge className="bg-yellow-500">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {selectedPro.is_active ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/30">Inactive</Badge>
                      )}
                    </div>
                    {/* Quick action buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedPro.is_verified ? (
                        <Button size="sm" variant="outline" onClick={() => unverifyMutation.mutate({ id: selectedPro.id })} disabled={unverifyMutation.isPending}>
                          <XCircle className="h-3 w-3 mr-1" /> Unverify
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-green-600" onClick={() => verifyMutation.mutate({ id: selectedPro.id })} disabled={verifyMutation.isPending}>
                          <BadgeCheck className="h-3 w-3 mr-1" /> Verify
                        </Button>
                      )}
                      {selectedPro.is_active ? (
                        <Button size="sm" variant="outline" onClick={() => deactivateMutation.mutate({ id: selectedPro.id })} disabled={deactivateMutation.isPending}>
                          <PowerOff className="h-3 w-3 mr-1" /> Deactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-blue-600" onClick={() => activateMutation.mutate({ id: selectedPro.id })} disabled={activateMutation.isPending}>
                          <Power className="h-3 w-3 mr-1" /> Activate
                        </Button>
                      )}
                      {selectedPro.is_featured ? (
                        <Button size="sm" variant="outline" onClick={() => unfeatureMutation.mutate({ id: selectedPro.id })} disabled={unfeatureMutation.isPending}>
                          <Sparkles className="h-3 w-3 mr-1" /> Unfeature
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-yellow-600" onClick={() => featureMutation.mutate({ id: selectedPro.id })} disabled={featureMutation.isPending}>
                          <Sparkles className="h-3 w-3 mr-1" /> Feature
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="grid grid-cols-2 gap-4">
                  {renderField("Business Name", "business_name", "text", "Business name")}
                  <div>
                    <Label className="text-muted-foreground text-xs">Provider Type</Label>
                    {isEditing ? (
                      <Select value={editForm.provider_type || "pro"} onValueChange={(v) => setEditForm((f) => ({ ...f, provider_type: v }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="realtor">Realtor</SelectItem>
                          <SelectItem value="on_the_go">On The Go</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium text-sm mt-0.5 capitalize">{selectedPro.provider_type || "Not set"}</p>
                    )}
                  </div>
                  {renderField("First Name", "first_name", "text", "First name")}
                  {renderField("Last Name", "last_name", "text", "Last name")}
                  {renderField("Email", "email", "text", "email@example.com")}
                  {renderField("Phone", "phone", "text", "+1 (555) 000-0000")}
                  {renderField("Website", "website", "text", "https://...")}
                  {renderField("WhatsApp", "whatsapp_number", "text", "+1...")}
                </div>

                {renderTextarea("Short Description", "short_description", "Brief tagline or summary...")}
                {renderTextarea("Description", "description", "Full business description...")}
                {renderTextarea("Bio", "bio", "Personal bio...")}

                <div className="grid grid-cols-2 gap-4">
                  {renderField("Address", "address", "text", "123 Main St")}
                  {renderField("City", "city", "text", "City")}
                  {renderField("State", "state", "text", "State")}
                  {renderField("ZIP Code", "zip_code", "text", "ZIP")}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Joined</Label>
                    <p className="font-medium text-sm mt-0.5">{formatDate(selectedPro.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Last Updated</Label>
                    <p className="font-medium text-sm mt-0.5">{formatDate(selectedPro.updated_at)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="business" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Average Rating
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {selectedPro.average_rating ? Number(selectedPro.average_rating).toFixed(1) : "N/A"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Total Reviews
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{selectedPro.total_reviews || selectedPro.review_count || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {renderField("Trade Category", "trade_category", "text", "e.g. Plumber, Electrician")}
                  {renderField("License Number", "license_number", "text", "License #")}
                  {renderField("Years in Business", "years_in_business", "number", "0")}
                  {renderField("Years Experience", "years_experience", "number", "0")}
                  {renderField("Service Radius (miles)", "service_radius", "number", "25")}
                  {renderField("Brokerage Name", "brokerage_name", "text", "Brokerage")}
                  {renderField("MLS ID", "mls_id", "text", "MLS ID")}
                  <div>
                    <Label className="text-muted-foreground text-xs">Licensed</Label>
                    <p className="font-medium text-sm mt-0.5">{selectedPro.is_licensed ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Insured</Label>
                    <p className="font-medium text-sm mt-0.5">{selectedPro.is_insured ? "Yes" : "No"}</p>
                  </div>
                </div>

                {selectedPro.specialties && (Array.isArray(selectedPro.specialties) ? selectedPro.specialties : []).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Specialties</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(Array.isArray(selectedPro.specialties) ? selectedPro.specialties : []).map((specialty: string, i: number) => (
                        <Badge key={i} variant="secondary">{specialty}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPro.service_areas && (Array.isArray(selectedPro.service_areas) ? selectedPro.service_areas : []).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Service Areas</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(Array.isArray(selectedPro.service_areas) ? selectedPro.service_areas : []).map((area: string, i: number) => (
                        <Badge key={i} variant="outline">{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Plan</Label>
                    <p className="font-medium capitalize">{selectedPro.subscription_plan || "None"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <p className="font-medium capitalize">{selectedPro.subscription_status || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Started</Label>
                    <p className="font-medium">{formatDate(selectedPro.subscription_started_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Expires</Label>
                    <p className="font-medium">{formatDate(selectedPro.subscription_expires_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Total Leads</Label>
                    <p className="font-medium">{selectedPro.total_leads || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Active Leads</Label>
                    <p className="font-medium">{selectedPro.active_leads || 0}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-4">
                {proReviews && proReviews.length > 0 ? (
                  <div className="space-y-4">
                    {proReviews.map((review: any) => (
                      <Card key={review.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.rating
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                          {review.title && (
                            <p className="mt-2 font-medium text-sm">{review.title}</p>
                          )}
                          {review.content && (
                            <p className="mt-1 text-sm text-muted-foreground">{review.content}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No reviews yet</p>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-muted-foreground">Provider not found</p>
          )}

          {/* Save / Cancel footer when editing */}
          {isEditing && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdits} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Match Request Details Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Match Request Details</DialogTitle>
            <DialogDescription>
              View match request information
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Contact Name</Label>
                  <p className="font-medium">{selectedRequest.contact_name || 'Anonymous'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedRequest.contact_email || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedRequest.contact_phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p className="font-medium">{selectedRequest.location || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Looking To</Label>
                  <p className="font-medium capitalize">{selectedRequest.looking_to || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Property Type</Label>
                  <p className="font-medium">{selectedRequest.property_type || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Timeline</Label>
                  <p className="font-medium">{selectedRequest.timeline || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Price Range</Label>
                  <p className="font-medium">{selectedRequest.price_range || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge
                    className={
                      selectedRequest.status === 'matched' ? 'bg-green-500' :
                      selectedRequest.status === 'pending' ? 'bg-yellow-500' :
                      ''
                    }
                  >
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Matched Realtors</Label>
                  <p className="font-medium">{selectedRequest.match_count || 0}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
