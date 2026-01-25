import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
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
  Calendar,
  Eye,
  CheckCircle,
  Power,
  PowerOff,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  Home,
  Wrench,
  Clock,
  TrendingUp,
  Users,
  MessageSquare,
} from "lucide-react";

export default function Pros() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedProId, setSelectedProId] = useState<string | null>(null);
  const [showProDialog, setShowProDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterVerified, setFilterVerified] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const limit = 50;

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
  const { data: selectedPro, isLoading: proLoading } = trpc.pros.getById.useQuery(
    { id: selectedProId! },
    { enabled: !!selectedProId }
  );
  const { data: proReviews } = trpc.pros.getReviews.useQuery(
    { proId: selectedProId! },
    { enabled: !!selectedProId }
  );

  // Mutations
  const verifyMutation = trpc.pros.verify.useMutation({
    onSuccess: () => {
      toast.success("Pro verified successfully");
      refetchPros();
    },
    onError: (error) => toast.error(`Failed to verify: ${error.message}`),
  });

  const unverifyMutation = trpc.pros.unverify.useMutation({
    onSuccess: () => {
      toast.success("Pro verification removed");
      refetchPros();
    },
    onError: (error) => toast.error(`Failed to unverify: ${error.message}`),
  });

  const activateMutation = trpc.pros.activate.useMutation({
    onSuccess: () => {
      toast.success("Pro activated successfully");
      refetchPros();
    },
    onError: (error) => toast.error(`Failed to activate: ${error.message}`),
  });

  const deactivateMutation = trpc.pros.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Pro deactivated");
      refetchPros();
    },
    onError: (error) => toast.error(`Failed to deactivate: ${error.message}`),
  });

  const featureMutation = trpc.pros.feature.useMutation({
    onSuccess: () => {
      toast.success("Pro featured successfully");
      refetchPros();
    },
    onError: (error) => toast.error(`Failed to feature: ${error.message}`),
  });

  const unfeatureMutation = trpc.pros.unfeature.useMutation({
    onSuccess: () => {
      toast.success("Pro unfeatured");
      refetchPros();
    },
    onError: (error) => toast.error(`Failed to unfeature: ${error.message}`),
  });

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
    setShowProDialog(true);
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

  const pros = prosData?.providers || [];
  const totalPros = prosData?.total || 0;
  const totalPages = Math.ceil(totalPros / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pro Providers</h1>
          <p className="text-muted-foreground">
            Manage professional service providers, verification, and status
          </p>
        </div>
        <Button onClick={() => refetchPros()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pros</CardTitle>
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
      </div>

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

      {/* Pros Table */}
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
              <p>No pro providers found</p>
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
                  {pros.map((pro) => (
                    <TableRow key={pro.id}>
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
                      <TableCell className="text-right">
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
                            <DropdownMenuSeparator />
                            {pro.is_verified ? (
                              <DropdownMenuItem onClick={() => unverifyMutation.mutate({ id: pro.id })}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Remove Verification
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => verifyMutation.mutate({ id: pro.id })}>
                                <BadgeCheck className="h-4 w-4 mr-2" />
                                Verify Pro
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
                                Feature Pro
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

      {/* Pro Details Dialog */}
      <Dialog open={showProDialog} onOpenChange={setShowProDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pro Provider Details</DialogTitle>
            <DialogDescription>
              View and manage provider information
            </DialogDescription>
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
                      {selectedPro.business_name || `${selectedPro.first_name || ""} ${selectedPro.last_name || ""}`.trim()}
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
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedPro.email || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedPro.phone || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Website</Label>
                    <p className="font-medium">
                      {selectedPro.website ? (
                        <a href={selectedPro.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {selectedPro.website}
                        </a>
                      ) : "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="font-medium">
                      {[selectedPro.city, selectedPro.state, selectedPro.zip_code].filter(Boolean).join(", ") || "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Joined</Label>
                    <p className="font-medium">{formatDate(selectedPro.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Verified At</Label>
                    <p className="font-medium">{formatDate(selectedPro.verified_at)}</p>
                  </div>
                </div>

                {selectedPro.bio && (
                  <div>
                    <Label className="text-muted-foreground">Bio</Label>
                    <p className="mt-1">{selectedPro.bio}</p>
                  </div>
                )}

                {selectedPro.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{selectedPro.description}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="business" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Years in Business
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{selectedPro.years_in_business || selectedPro.years_experience || "N/A"}</p>
                    </CardContent>
                  </Card>

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

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Response Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {selectedPro.response_rate ? `${Number(selectedPro.response_rate).toFixed(0)}%` : "N/A"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Total Leads
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{selectedPro.total_leads || 0}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-500" />
                        Active Leads
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{selectedPro.active_leads || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">License Number</Label>
                    <p className="font-medium">{selectedPro.license_number || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Service Radius</Label>
                    <p className="font-medium">{selectedPro.service_radius ? `${selectedPro.service_radius} miles` : "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Licensed</Label>
                    <p className="font-medium">{selectedPro.is_licensed ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Insured</Label>
                    <p className="font-medium">{selectedPro.is_insured ? "Yes" : "No"}</p>
                  </div>
                </div>

                {selectedPro.specialties && selectedPro.specialties.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Specialties</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedPro.specialties.map((specialty, i) => (
                        <Badge key={i} variant="secondary">{specialty}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPro.service_areas && selectedPro.service_areas.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Service Areas</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedPro.service_areas.map((area, i) => (
                        <Badge key={i} variant="outline">{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Plan</Label>
                    <p className="font-medium capitalize">{selectedPro.subscription_plan || "None"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-medium capitalize">{selectedPro.subscription_status || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Started</Label>
                    <p className="font-medium">{formatDate(selectedPro.subscription_started_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Expires</Label>
                    <p className="font-medium">{formatDate(selectedPro.subscription_expires_at)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-4">
                {proReviews && proReviews.length > 0 ? (
                  <div className="space-y-4">
                    {proReviews.map((review) => (
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
                          {review.review_text && (
                            <p className="mt-2 text-sm">{review.review_text}</p>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
