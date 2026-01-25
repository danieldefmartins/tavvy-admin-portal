import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { 
  Home, 
  Search, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Edit,
  Trash2,
  RefreshCw,
  Users,
  TrendingUp,
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  BadgeCheck,
  Clock,
  AlertCircle
} from "lucide-react";

interface Realtor {
  id: string;
  user_id: string;
  business_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
  is_verified: boolean;
  subscription_status: string | null;
  subscription_plan: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  total_leads: number | null;
  created_at: string;
  updated_at: string;
}

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

export default function Realtors() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("realtors");
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRealtor, setSelectedRealtor] = useState<Realtor | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MatchRequest | null>(null);
  const [showRealtorDialog, setShowRealtorDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalRealtors: 0,
    activeRealtors: 0,
    verifiedRealtors: 0,
    pendingRequests: 0,
    matchedRequests: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch realtors
      const { data: realtorsData, error: realtorsError } = await supabase
        .from('pro_providers')
        .select('*')
        .eq('provider_type', 'realtor')
        .order('created_at', { ascending: false });

      if (realtorsError) throw realtorsError;
      setRealtors(realtorsData || []);

      // Fetch match requests with match counts
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

      // Calculate stats
      const total = realtorsData?.length || 0;
      const active = realtorsData?.filter(r => r.is_active).length || 0;
      const verified = realtorsData?.filter(r => r.is_verified).length || 0;
      const pending = requestsWithCounts.filter(r => r.status === 'pending').length;
      const matched = requestsWithCounts.filter(r => r.status === 'matched').length;

      setStats({
        totalRealtors: total,
        activeRealtors: active,
        verifiedRealtors: verified,
        pendingRequests: pending,
        matchedRequests: matched,
      });

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRealtor = async (realtorId: string, verify: boolean) => {
    try {
      const { error } = await supabase
        .from('pro_providers')
        .update({ is_verified: verify, updated_at: new Date().toISOString() })
        .eq('id', realtorId);

      if (error) throw error;

      toast({
        title: verify ? "Realtor Verified" : "Verification Removed",
        description: verify 
          ? "The realtor has been verified successfully." 
          : "Verification has been removed from this realtor.",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (realtorId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('pro_providers')
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq('id', realtorId);

      if (error) throw error;

      toast({
        title: active ? "Realtor Activated" : "Realtor Deactivated",
        description: active 
          ? "The realtor is now visible to users." 
          : "The realtor has been hidden from users.",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredRealtors = realtors.filter(realtor => {
    const searchLower = searchQuery.toLowerCase();
    return (
      realtor.business_name?.toLowerCase().includes(searchLower) ||
      realtor.first_name?.toLowerCase().includes(searchLower) ||
      realtor.last_name?.toLowerCase().includes(searchLower) ||
      realtor.email?.toLowerCase().includes(searchLower) ||
      realtor.city?.toLowerCase().includes(searchLower)
    );
  });

  const filteredRequests = matchRequests.filter(request => {
    const searchLower = searchQuery.toLowerCase();
    return (
      request.contact_name?.toLowerCase().includes(searchLower) ||
      request.contact_email?.toLowerCase().includes(searchLower) ||
      request.location?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Realtors Management</h1>
          <p className="text-muted-foreground">Manage realtors and match requests</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realtors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalRealtors}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats.activeRealtors}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <BadgeCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{stats.verifiedRealtors}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-purple-600">{stats.matchedRequests}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="realtors">
              <Home className="mr-2 h-4 w-4" />
              Realtors ({realtors.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Users className="mr-2 h-4 w-4" />
              Match Requests ({matchRequests.length})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Realtors Tab */}
        <TabsContent value="realtors" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredRealtors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No realtors found</p>
                  <p className="text-sm">Realtors will appear here when they sign up.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Realtor</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRealtors.map((realtor) => (
                      <TableRow key={realtor.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {realtor.business_name || `${realtor.first_name} ${realtor.last_name}` || 'Unnamed'}
                            </p>
                            <p className="text-sm text-muted-foreground">{realtor.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {realtor.city}, {realtor.state}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={realtor.is_active ? "default" : "secondary"}>
                              {realtor.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {realtor.is_verified && (
                              <Badge className="bg-blue-500">
                                <BadgeCheck className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={realtor.subscription_status === 'active' ? "default" : "outline"}>
                            {realtor.subscription_plan || 'Free'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              {realtor.average_rating?.toFixed(1) || 'N/A'}
                            </div>
                            <div className="text-muted-foreground">
                              {realtor.total_leads || 0} leads
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(realtor.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedRealtor(realtor);
                                setShowRealtorDialog(true);
                              }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleVerifyRealtor(realtor.id, !realtor.is_verified)}>
                                <BadgeCheck className="mr-2 h-4 w-4" />
                                {realtor.is_verified ? 'Remove Verification' : 'Verify Realtor'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(realtor.id, !realtor.is_active)}>
                                {realtor.is_active ? (
                                  <>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Match Requests Tab */}
        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
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

      {/* Realtor Details Dialog */}
      <Dialog open={showRealtorDialog} onOpenChange={setShowRealtorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Realtor Details</DialogTitle>
            <DialogDescription>
              View and manage realtor information
            </DialogDescription>
          </DialogHeader>
          {selectedRealtor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {selectedRealtor.business_name || `${selectedRealtor.first_name} ${selectedRealtor.last_name}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedRealtor.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedRealtor.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedRealtor.city}, {selectedRealtor.state}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex gap-2">
                    <Badge variant={selectedRealtor.is_active ? "default" : "secondary"}>
                      {selectedRealtor.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {selectedRealtor.is_verified && (
                      <Badge className="bg-blue-500">Verified</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subscription</p>
                  <p className="font-medium">
                    {selectedRealtor.subscription_plan || 'Free'} ({selectedRealtor.subscription_status || 'inactive'})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{selectedRealtor.average_rating?.toFixed(1) || 'N/A'}</span>
                    <span className="text-muted-foreground">({selectedRealtor.total_reviews || 0} reviews)</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="font-medium">{selectedRealtor.total_leads || 0}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRealtorDialog(false)}>
              Close
            </Button>
          </DialogFooter>
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
                  <p className="text-sm text-muted-foreground">Contact Name</p>
                  <p className="font-medium">{selectedRequest.contact_name || 'Anonymous'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedRequest.contact_email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedRequest.contact_phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedRequest.location || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Looking To</p>
                  <p className="font-medium capitalize">{selectedRequest.looking_to || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Property Type</p>
                  <p className="font-medium">{selectedRequest.property_type || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timeline</p>
                  <p className="font-medium">{selectedRequest.timeline || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price Range</p>
                  <p className="font-medium">{selectedRequest.price_range || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
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
                  <p className="text-sm text-muted-foreground">Matched Realtors</p>
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
