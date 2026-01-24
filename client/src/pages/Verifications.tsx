import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Search,
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
  User,
  Building2,
  Calendar,
  ExternalLink
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://scasgwrikoqdwlwlwcff.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface VerificationRequest {
  id: string;
  user_id: string;
  is_licensed_verified: boolean;
  is_insured_verified: boolean;
  is_bonded_verified: boolean;
  is_tavvy_verified: boolean;
  license_document_url?: string;
  insurance_document_url?: string;
  bonding_document_url?: string;
  additional_documents?: string[];
  license_number?: string;
  license_state?: string;
  license_expiry?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  insurance_expiry?: string;
  business_name?: string;
  years_in_business?: number;
  service_area?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  verification_status: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
}

export default function Verifications() {
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVerification, setSelectedVerification] = useState<VerificationRequest | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  useEffect(() => {
    fetchVerifications();
  }, [statusFilter]);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("user_verifications")
        .select(`
          *,
          profiles:user_id (
            display_name,
            user_id
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("verification_status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Also fetch user emails from auth.users via profiles
      const enrichedData = data?.map((v: any) => ({
        ...v,
        user_name: v.profiles?.display_name || "Unknown User",
      })) || [];

      setVerifications(enrichedData);

      // Calculate stats
      const allData = await supabase
        .from("user_verifications")
        .select("verification_status");
      
      if (allData.data) {
        const pending = allData.data.filter(v => v.verification_status === "pending").length;
        const approved = allData.data.filter(v => v.verification_status === "approved").length;
        const rejected = allData.data.filter(v => v.verification_status === "rejected").length;
        setStats({
          pending,
          approved,
          rejected,
          total: allData.data.length,
        });
      }
    } catch (error) {
      console.error("Error fetching verifications:", error);
      toast({
        title: "Error",
        description: "Failed to load verification requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (verification: VerificationRequest, badges: {
    licensed: boolean;
    insured: boolean;
    bonded: boolean;
    tavvyVerified: boolean;
  }) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("user_verifications")
        .update({
          is_licensed_verified: badges.licensed,
          is_insured_verified: badges.insured,
          is_bonded_verified: badges.bonded,
          is_tavvy_verified: badges.tavvyVerified,
          verification_status: "approved",
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", verification.id);

      if (error) throw error;

      toast({
        title: "Verification Approved",
        description: "The user's badges have been verified successfully.",
      });

      setIsReviewDialogOpen(false);
      setSelectedVerification(null);
      setReviewNotes("");
      fetchVerifications();
    } catch (error) {
      console.error("Error approving verification:", error);
      toast({
        title: "Error",
        description: "Failed to approve verification",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (verification: VerificationRequest) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("user_verifications")
        .update({
          verification_status: "rejected",
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", verification.id);

      if (error) throw error;

      toast({
        title: "Verification Rejected",
        description: "The verification request has been rejected.",
      });

      setIsReviewDialogOpen(false);
      setSelectedVerification(null);
      setReviewNotes("");
      fetchVerifications();
    } catch (error) {
      console.error("Error rejecting verification:", error);
      toast({
        title: "Error",
        description: "Failed to reject verification",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestMoreInfo = async (verification: VerificationRequest) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("user_verifications")
        .update({
          verification_status: "needs_more_info",
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", verification.id);

      if (error) throw error;

      toast({
        title: "More Info Requested",
        description: "The user will be notified to provide additional documents.",
      });

      setIsReviewDialogOpen(false);
      setSelectedVerification(null);
      setReviewNotes("");
      fetchVerifications();
    } catch (error) {
      console.error("Error updating verification:", error);
      toast({
        title: "Error",
        description: "Failed to update verification",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case "needs_more_info":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30"><AlertCircle className="w-3 h-3 mr-1" /> Needs Info</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredVerifications = verifications.filter(v => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.user_name?.toLowerCase().includes(query) ||
      v.business_name?.toLowerCase().includes(query) ||
      v.license_number?.toLowerCase().includes(query)
    );
  });

  const openDocument = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-500" />
            Licenses & Verification
          </h1>
          <p className="text-white/60 mt-1">
            Review and approve business verification requests
          </p>
        </div>
        <Button onClick={fetchVerifications} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-500/80 text-sm">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-500/80 text-sm">Approved</p>
                <p className="text-3xl font-bold text-green-500">{stats.approved}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-500/80 text-sm">Rejected</p>
                <p className="text-3xl font-bold text-red-500">{stats.rejected}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-500/80 text-sm">Total Requests</p>
                <p className="text-3xl font-bold text-blue-500">{stats.total}</p>
              </div>
              <FileText className="h-10 w-10 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search by name, business, or license number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="needs_more_info">Needs Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Verifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Requests</CardTitle>
          <CardDescription>
            Review submitted documents and approve or reject verification requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-white/40" />
            </div>
          ) : filteredVerifications.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No verification requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVerifications.map((verification) => (
                  <TableRow key={verification.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-white/40" />
                        <span>{verification.user_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-white/40" />
                        <span>{verification.business_name || "Not provided"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {verification.license_document_url && (
                          <Badge variant="outline" className="text-xs">License</Badge>
                        )}
                        {verification.insurance_document_url && (
                          <Badge variant="outline" className="text-xs">Insurance</Badge>
                        )}
                        {verification.bonding_document_url && (
                          <Badge variant="outline" className="text-xs">Bonding</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(verification.verification_status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-white/60">
                        <Calendar className="h-4 w-4" />
                        {new Date(verification.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVerification(verification);
                          setReviewNotes(verification.review_notes || "");
                          setIsReviewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Review Verification Request
            </DialogTitle>
            <DialogDescription>
              Review the submitted documents and approve or reject the verification
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60">User</label>
                  <p className="font-medium">{selectedVerification.user_name}</p>
                </div>
                <div>
                  <label className="text-sm text-white/60">Business Name</label>
                  <p className="font-medium">{selectedVerification.business_name || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm text-white/60">Years in Business</label>
                  <p className="font-medium">{selectedVerification.years_in_business || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm text-white/60">Service Area</label>
                  <p className="font-medium">{selectedVerification.service_area || "Not provided"}</p>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Submitted Documents</h4>
                
                <div className="grid gap-3">
                  {/* License Document */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="font-medium">Business License</p>
                        {selectedVerification.license_number && (
                          <p className="text-sm text-white/60">
                            License #: {selectedVerification.license_number}
                            {selectedVerification.license_state && ` (${selectedVerification.license_state})`}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedVerification.license_document_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDocument(selectedVerification.license_document_url!)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-white/40">Not uploaded</Badge>
                    )}
                  </div>

                  {/* Insurance Document */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-green-400" />
                      <div>
                        <p className="font-medium">Insurance Certificate</p>
                        {selectedVerification.insurance_provider && (
                          <p className="text-sm text-white/60">
                            Provider: {selectedVerification.insurance_provider}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedVerification.insurance_document_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDocument(selectedVerification.insurance_document_url!)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-white/40">Not uploaded</Badge>
                    )}
                  </div>

                  {/* Bonding Document */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="font-medium">Bonding Certificate</p>
                      </div>
                    </div>
                    {selectedVerification.bonding_document_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDocument(selectedVerification.bonding_document_url!)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-white/40">Not uploaded</Badge>
                    )}
                  </div>

                  {/* Additional Documents */}
                  {selectedVerification.additional_documents && selectedVerification.additional_documents.length > 0 && (
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="font-medium mb-2">Additional Documents</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedVerification.additional_documents.map((url, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => openDocument(url)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Document {index + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Badge Verification Checkboxes */}
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Verify Badges</h4>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      id="verify-licensed"
                      defaultChecked={selectedVerification.is_licensed_verified}
                      className="w-5 h-5 rounded border-white/20"
                    />
                    <div>
                      <p className="font-medium">✅ Licensed</p>
                      <p className="text-sm text-white/60">Business license verified</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      id="verify-insured"
                      defaultChecked={selectedVerification.is_insured_verified}
                      className="w-5 h-5 rounded border-white/20"
                    />
                    <div>
                      <p className="font-medium">✅ Insured</p>
                      <p className="text-sm text-white/60">Insurance verified</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      id="verify-bonded"
                      defaultChecked={selectedVerification.is_bonded_verified}
                      className="w-5 h-5 rounded border-white/20"
                    />
                    <div>
                      <p className="font-medium">🛡️ Bonded</p>
                      <p className="text-sm text-white/60">Bonding verified</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      id="verify-tavvy"
                      defaultChecked={selectedVerification.is_tavvy_verified}
                      className="w-5 h-5 rounded border-white/20"
                    />
                    <div>
                      <p className="font-medium">🟢 Tavvy Verified</p>
                      <p className="text-sm text-white/60">Full Tavvy verification</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Review Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  placeholder="Add any notes about this verification..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleRequestMoreInfo(selectedVerification!)}
              disabled={isSubmitting}
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Request More Info
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReject(selectedVerification!)}
              disabled={isSubmitting}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                const licensed = (document.getElementById("verify-licensed") as HTMLInputElement)?.checked || false;
                const insured = (document.getElementById("verify-insured") as HTMLInputElement)?.checked || false;
                const bonded = (document.getElementById("verify-bonded") as HTMLInputElement)?.checked || false;
                const tavvyVerified = (document.getElementById("verify-tavvy") as HTMLInputElement)?.checked || false;
                handleApprove(selectedVerification!, { licensed, insured, bonded, tavvyVerified });
              }}
              disabled={isSubmitting}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
